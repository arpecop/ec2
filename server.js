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
  const app = express();
  const bodyParser = require("body-parser");
  const fs = require("fs");
  const ejs = require("ejs");
  const http = require("http");
  const https = require("https");
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
  const privateKey = fs.readFileSync(
    "/etc/letsencrypt/live/db.rudixlab.com-0001/privkey.pem",
    "utf8"
  );
  const certificate = fs.readFileSync(
    "/etc/letsencrypt/live/db.rudixlab.com-0001/cert.pem",
    "utf8"
  );
  const ca = fs.readFileSync(
    "/etc/letsencrypt/live/db.rudixlab.com-0001/chain.pem",
    "utf8"
  );
  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };

  app.get("/", async function (req, res) {
    const json = await readFile("/tmp/items.json");
    const index = await readFile("./views/index1.html");
    res.end(ejs.render(index, JSON.parse(json)));
  });

  app.get("/:id", async function (req, res) {
    const json = await readFile("/tmp/items.json");
    const index = await readFile("./views/pages/single.html");
    res.end(ejs.render(index, JSON.parse(json)));
  });

  const httpServer = http.createServer(app);
  const httpsServer = https.createServer(credentials, app);

  httpServer.listen(80, () => {
    console.log("HTTP Server running on port 80");
  });

  httpsServer.listen(443, () => {
    console.log("HTTPS Server running on port 443");
  });
}
