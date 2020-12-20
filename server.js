const cluster = require("cluster");
const cron = require("./src/cron");
const port = process.env.PORT || 80;

if (cluster.isMaster) {
  cluster.fork();
  cluster.fork();
  cluster.on("exit", (worker) => {
    console.log("Worker %d died :(", worker.id);
    cluster.fork();
  });
} else {
  const compression = require("compression");
  const cors = require("cors");
  const express = require("express");
  const async = require("async");
  const app = express();
  const bodyParser = require("body-parser");
  const fs = require("fs");
  const ejs = require("ejs");

  const { query } = require("./src/helpers/db");
  app.use(compression());
  app.use(bodyParser.json());
  app.use(cors());
  app.use(express.static("views"));
  function readFile(path) {
    return new Promise((resolve) => {
      fs.readFile(path, "utf8", (err, data) => {
        if (err) {
          resolve(null);
        }
        resolve(data);
      });
    });
  }

  app.get("/", async function (req, res) {
    const json = await readFile("/tmp/items.json");
    const index = await readFile("./views/index1.html");
    res.end(ejs.render(index, JSON.parse(json)));
  });
  app.get("/sitemap", async function (req, res) {
    res.set("Content-Type", "text/plain");
    const json1 = await readFile("/tmp/items.json");
    const json = JSON.parse(json1);

    [...json.part1, ...json.part2, ...json.part3].map((item) => {
      res.write("https://noticiasti.xyz/" + item.vreme + "\n");
    });
    res.end("");
  });
  app.get("/routes.js", async function (req, res) {
    res.set("Content-Type", "application/javascript");
    const json = await readFile("/tmp/items.json");
    const xjson = JSON.parse(json);
    const arr = [];
    res.write("var routes = [");
    async.each(
      [...xjson.part1, ...xjson.part2, ...xjson.part3],
      function (file, callback) {
        arr.push(
          '{ path: "/' +
            file.vreme +
            '/",url: "/' +
            file.vreme +
            '",name: "' +
            file.vreme +
            '"}'
        );
        callback();
      },
      function (err) {
        res.end(arr.join(",") + "];");
      }
    );
  });
  app.get("/porn", function (req, res) {
    res.end("ok");
  });
  app.get("/:id", async function (req, res) {
    const post = await query({
      collection: "crunch",
      id: Math.round(req.params.id),
      descending: true,
      limit: 1,
    });

    const index = await readFile("./views/single.html");
    res.end(ejs.render(index, post));
  });
  app.listen(3000, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}
