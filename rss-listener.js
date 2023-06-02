const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require("axios");
const fs = require("fs");
const https = require("https");
//SCRAPES BBC NEWS FROM THEIR SITES
async function scrapeURL(url) {
  const res = await fetch(url);
  const text = await res.text();
  const { window } = new JSDOM(text);
  const main = window.document.getElementsByTagName("main")[0].children;
  let newsBody = [];
  // console.log(url);
  for (const item of main) {
    if (item.children.length !== 0) {
      if (
        item.children[0].tagName === "P" ||
        item.children[0].tagName === "H1"
      ) {
        newsBody.push(item.children[0].innerHTML);
      }
      if (item.getElementsByTagName("img").length > 0) {
        newsBody.push(item.getElementsByTagName("img")[0].src);
      }
    }
  }
  return newsBody;
}
async function scrapeURLWT(url) {
  const res = await fetch(url);
  const text = await res.text();
  const { window } = new JSDOM(text);
  let newsBody = [];
  newsBody.push(
    window.document.getElementsByClassName("content-body__description")[0]
      .innerHTML
  );
  const main = window.document.getElementsByClassName("content-body__detail")[0]
    .children;

  // console.log(url);
  for (const item of main) {
    if (item === main.item(0)) {
    } else if (
      item.className.includes("content-card") ||
      item.innerHTML.includes("Kaynaklar") ||
      item.className.includes("bottom-new-video")
    ) {
      return newsBody;
    } else if (item.getElementsByTagName("img").length > 0) {
      const src = item
        .getElementsByTagName("img")[0]
        .getAttribute("data-original");

      newsBody.push(validSrc(src, "https://www.webtekno.com"));
    } else {
      newsBody.push(item.outerHTML);
    }
  }
  return newsBody;
}

function validSrc(src, baseURL) {
  if (src.includes("http")) {
    return src;
  }
  return `${baseURL}${src}`;
}
//SCRAPES BLOOMBERG NEWS FROM THEIR SITES
async function scrapeURLBB(url) {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // (NOTE: this will disable client verification)
    cert: fs.readFileSync("./intermediate.pem"),
  });
  let body;
  await axios.get(url, { httpsAgent }).then((response) => {
    // console.log(response.data);
    body = response.data;
  });
  const window = new JSDOM(body);
  let newsBody = [];
  const figure = window.window.document
    .getElementsByClassName("box-row")[0]
    .getElementsByTagName("figure")[0];
  newsBody.push(figure.getElementsByTagName("img")[0].src);
  const article =
    window.window.document.getElementsByTagName("article")[0].children;
  for (const item of article) {
    if (item.children.length > 0) {
      item.getElementsByTagName("img").length > 0
        ? newsBody.push(item.getElementsByTagName("img")[0].outerHTML)
        : newsBody.push(item.children[0].outerHTML);
    } else {
      newsBody.push(item.outerHTML);
    }
  }

  return newsBody;
}
//POSTS DATA TO DB
async function postData(url = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "no-cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}
//RETURNS THE FIRST LINK
function validURL(inputArray) {
  for (entry of inputArray) {
    if (
      entry.includes("http") &&
      (entry.includes("jpg") || entry.includes("jpeg") || entry.includes("png"))
    ) {
      return entry;
    }
  }
}
//GETS EXISTING LINKS
async function getLinksStartUp() {
  const response = await fetch("http://3.73.132.230:3001/api/getAll");
  const data = await response.json();
  let linkList = [];
  for (item of data) {
    linkList.push(item.link);
  }
  return linkList;
}

// LISTENS RSS FEED
async function listener(feedURL) {
  let newFeed = [];
  const bbc = await bbcFeed();
  if (bbc.length > 0) {
    bbc.forEach((x) => {
      newFeed.push(x);
    });
  }
  const bloomberg = await bloombergFeed();
  if (bloomberg.length > 0) {
    bloomberg.forEach((x) => {
      newFeed.push(x);
    });
  }
  const webtekno = await webteknoFeed();
  if (webtekno.length > 0) {
    webtekno.forEach((x) => {
      newFeed.push(x);
    });
  }

  //MODIFY ITEMS FOR DB
  for (const item of newFeed) {
    // console.log(item.innerHTML);
    let news = {};
    // console.log(item);
    news.date = Date.parse(
      strip(item.getElementsByTagName("pubDate")[0].innerHTML)
    );
    news.link = strip(item.getElementsByTagName("guid")[0].innerHTML);
    news.title = item
      .getElementsByTagName("title")[0]
      .innerHTML.replace("<![CDATA[", "")
      .replace("]]>", "");
    if (item.getElementsByTagName("description").length > 0) {
      news.description = item
        .getElementsByTagName("description")[0]
        .innerHTML.replace("<![CDATA[", "")
        .replace("]]>", "");
    }
    if (news.link.includes("bloomberght")) {
      news.context = await scrapeURLBB(news.link);
      news.image = validURL(news.context);
      news.category = "finance";
    }
    if (news.link.includes("bbc")) {
      news.context = await scrapeURL(news.link);
      news.image = validURL(news.context);
      news.category = "breaking";
    }
    if (news.link.includes("webtekno")) {
      news.context = await scrapeURLWT(news.link);
      news.image = validURL(news.context);
      news.category = "tech";
    }

    console.log(news);

    await postData("http://3.73.132.230:3001/api/post", news);
  }

  setTimeout(listener, 300000, feedURL);
}

//STRIPS CDATA FROM STRINGS
function strip(string) {
  return string.replace("<![CDATA[", "").replace("]]>", "");
}

async function bbcFeed() {
  feedURL = "https://feeds.bbci.co.uk/turkce/rss.xml";
  const oldLinks = await getLinksStartUp();
  //fetch RSS feed
  let xmlBody;
  try {
    const response = await fetch(feedURL);
    xmlBody = await response.text();
  } catch {
    setTimeout(listener, 300000, feedURL);
  }

  const { window } = new JSDOM(xmlBody, {
    contentType: "text/xml",
  });

  //compare old feed with fetched one
  let newFeed = [];
  for (const item of window.document.getElementsByTagName("item")) {
    const link = item.getElementsByTagName("guid")[0].innerHTML;
    if (!oldLinks.includes(link)) {
      newFeed.push(item);
      //   oldLinks.push(link);
    }
  }

  if (newFeed.length === 0) {
    console.log("nothing new (bbc)");
  }
  return newFeed;
}

//RETURNS ITEM OF RSS FEED OF BLOOMBERGHT RSS
async function bloombergFeed() {
  const oldLinks = await getLinksStartUp();
  //fetch RSS feed

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    cert: fs.readFileSync("./intermediate.pem"),
  });
  let xmlBody;
  await axios
    .get("https://www.bloomberght.com/rss", { httpsAgent })
    .then((response) => {
      // console.log(response.data);
      xmlBody = response.data;
    });

  //create DOM
  const window = new JSDOM(xmlBody, {
    contentType: "text/xml",
  });

  //compare old feed with fetched one
  let newFeed = [];
  for (const item of window.window.document.getElementsByTagName("item")) {
    const link = strip(item.getElementsByTagName("guid")[0].innerHTML);
    if (!oldLinks.includes(link)) {
      newFeed.push(item);
    }
  }

  if (newFeed.length === 0) {
    console.log("nothing new (bbht)");
    return;
  }

  return newFeed;
}
async function webteknoFeed() {
  feedURL = "https://www.webtekno.com/rss/yazilim/en-yeniler.xml";
  const oldLinks = await getLinksStartUp();
  //fetch RSS feed
  let xmlBody;
  try {
    const response = await fetch(feedURL);
    xmlBody = await response.text();
  } catch {
    setTimeout(listener, 300000, feedURL);
  }

  const { window } = new JSDOM(xmlBody, {
    contentType: "text/xml",
  });

  //compare old feed with fetched one
  let newFeed = [];
  for (const item of window.document.getElementsByTagName("item")) {
    const link = item.getElementsByTagName("guid")[0].innerHTML;
    if (!oldLinks.includes(link)) {
      newFeed.push(item);
      //   oldLinks.push(link);
    }
  }

  if (newFeed.length === 0) {
    console.log("nothing new (bbc)");
  }

  return newFeed;
}
listener("https://feeds.bbci.co.uk/turkce/rss.xml");
