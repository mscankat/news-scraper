const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { scrapeURL, postData } = require("./scrape");

function validURL(inputArray) {
  for (entry of inputArray) {
    if (entry.includes("http")) {
      return entry;
    }
  }
}

async function getLinksStartUp() {
  const response = await fetch("http://3.73.132.230:3001/api/getAll");
  const data = await response.json();
  let linkList = [];
  for (item of data) {
    linkList.push(item.link);
  }
  return linkList;
}

async function listener(feedURL) {
  const oldLinks = await getLinksStartUp();
  //fetch RSS feed
  const response = await fetch(feedURL);
  const xmlBody = await response.text();
  //   console.log(xmlBody);
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
    console.log("nothing new");
  }

  //process items for DB
  for (const item of newFeed) {
    let news = {};
    news.date = Date.parse(item.getElementsByTagName("pubDate")[0].innerHTML);
    news.link = item.getElementsByTagName("guid")[0].innerHTML;
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
    news.context = await scrapeURL(news.link);
    news.image = validURL(news.context);

    await postData("http://3.73.132.230:3001/api/post", news);
  }

  setTimeout(listener, 300000, feedURL);
}

listener("https://feeds.bbci.co.uk/turkce/rss.xml");
