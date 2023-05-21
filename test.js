async function getLinksStartUp() {
  const response = await fetch("http://3.73.132.230:3001/api/getAll");
  const data = await response.json();
  let linkList = [];
  for (item of data) {
    linkList.push(item.link);
  }
  console.log(linkList);
}

getLinksStartUp();
