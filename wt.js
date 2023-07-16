const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require("axios");
const fs = require("fs");
const https = require("https");
const moment = require("moment");
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
    const date = new moment(item.getElementsByTagName("pubDate")[0].innerHTML);
    console.log(date);
    const timeIntervalDays = moment.duration(moment().diff(date)).asDays();
    console.log(timeIntervalDays);
    if (!oldLinks.includes(link) && timeIntervalDays < 15) {
      newFeed.push(item);
      //   oldLinks.push(link);
    }
  }

  if (newFeed.length === 0) {
    console.log("nothing new (wt)");
  }

  console.log(newFeed);
}
webteknoFeed();

async function getLinksStartUp() {
  const responseT = await fetch(
    "https://khpycrjcxqx6xg4gpywmtzvr4a0uafez.lambda-url.eu-central-1.on.aws/api/getMany/tech/100/0"
  );

  const dataT = await responseT.json();
  const data = [...dataT];
  let linkList = [];
  for (item of data) {
    linkList.push(item.link);
  }
  return linkList;
}
