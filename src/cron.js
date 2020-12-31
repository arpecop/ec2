const { query } = require("./helpers/db");
const fs = require("fs");
var cron = require("node-cron");
async function cronx() {
  const posts = await query({
    collection: "crunch",
    limit: 50,
    descending: false,
    fields: ["title", "image", "vreme"],
  });

  return new Promise((resolve, reject) => {
    var result = posts.Items.reduce((resultArray, item, index) => {
      const chunkIndex = Math.floor(index / 20);
      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = []; // start a new chunk
      }
      resultArray[chunkIndex].push(item);
      return resultArray;
    }, []);

    fs.writeFile(
      "/tmp/items.json",
      JSON.stringify({ part1: result[0], part2: result[1], part3: result[2] }),
      function () {
        resolve();
      }
    );
  });
}

cron.schedule("* * * * *", async () => {
  await cronx();
});
