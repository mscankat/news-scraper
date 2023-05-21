const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function scrapeURL(url) {
  const res = await fetch(url);
  const text = await res.text();
  const { window } = new JSDOM(text);
  const main = window.document.getElementsByTagName("main")[0].children;
  let newsBody = [];
  for (const item of main) {
    if (item.children[0].tagName === "P" || item.children[0].tagName === "H1") {
      newsBody.push(item.children[0].innerHTML);
    }
    if (item.getElementsByTagName("img").length > 0) {
      newsBody.push(item.getElementsByTagName("img")[0].src);
    }
  }
  return newsBody;
}

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

// postData("http://localhost:3000/api/post", {
//   context: await scrapeURL("https://www.bbc.com/turkce/articles/cd1kgqydyp9o"),
// });

// async function sendData(url) {
//   const data = await scrapeURL(url);
//   await postData("http://localhost:3000/api/post", {
//     context: data,
//     date: 1,
//     link: "asd",
//     title: "asd",
//     image: "qwe",
//   });
// }

// sendData("https://www.bbc.co.uk/turkce/haberler-dunya-65274314");

module.exports = { scrapeURL, postData };
