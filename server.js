const cluster = require("cluster");

const port = process.env.PORT || 80;
if (cluster.isMaster) {
  cluster.fork();
  cluster.on("exit", (worker) => {
    console.log("Worker %d died :(", worker.id);
    cluster.fork();
  });
} else {
  const CognitoExpress = require("cognito-express");
  const compression = require("compression");
  const cors = require("cors");
  const express = require("express");
  const app = express();
  const { exec } = require("child_process");
  const PouchDB = require("pouchdb");
  const bodyParser = require("body-parser");
  const fs = require("fs");
  const http = require("http");
  const https = require("https");
  const TempPouchDB = PouchDB.defaults({ prefix: "/db/db/" });
  app.use(compression());
  app.use(bodyParser.json());
  app.use(cors());

  const privateKey = fs.readFileSync(
    "/etc/letsencrypt/live/db.rudixlab.com/privkey.pem",
    "utf8"
  );
  const certificate = fs.readFileSync(
    "/etc/letsencrypt/live/db.rudixlab.com/cert.pem",
    "utf8"
  );
  const ca = fs.readFileSync(
    "/etc/letsencrypt/live/db.rudixlab.com/chain.pem",
    "utf8"
  );
  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };

  const cognitoExpress = new CognitoExpress({
    region: "eu-west-1",
    cognitoUserPoolId: "eu-west-1_T6v05tjzh",
    tokenUse: "access", // Possible Values: access | id
    tokenExpiration: 3600000, // Up to default expiration of 1 hour (3600000 ms)
  });
  const authenticatedRoute = express.Router();
  authenticatedRoute.use((req, res, next) => {
    const accessTokenFromClient = req.headers.accesstoken;
    if (!accessTokenFromClient) {
      return res.status(200).json({ name: "TokenMissing" });
    }
    cognitoExpress.validate(accessTokenFromClient, (err, response) => {
      if (err)
        return res
          .status(200)
          .json(
            err === "Not a valid JWT token" ? { name: "NotValidToken" } : err
          );
      res.locals.user = response;
      next();
    });
  });
  app.get("/hook", function (req, res) {
    console.log("hooked1");
    exec(
      "git pull && sudo pkill -9 node && sudo forever start server.js",
      (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        res.json({ x: 1 });
      }
    );
  });
  app.get("/.well-known/:id/:subid", function (req, res) {
    res.end(
      "Z1FHdH0XVuQss_JE93-pyhchxLaHDGzxNTqkoPjs6p8.HrmlHST7Hc30mMFrTLTp7JM1Abc_07gR559E7ynEWG4"
    );
  });
  app.get("/heartbeat", authenticatedRoute, function (req, res) {
    res.json({});
  });
  app.get("/del/:db/:id", authenticatedRoute, function (req, res) {
    const dbc = require("nano")(
      "http://arpecop:maximus@localhost/" + req.params.db
    );
    dbc.get(req.params.id, (err, doc) => {
      if (!err && doc.username === res.locals.user.username) {
        dbc.insert({ _id: req.params.id, _rev: doc._rev }, (e, docMod) => {
          res.json(docMod);
        });
      }
    });
  });
  app.post("/db/:id", authenticatedRoute, function (req, res) {
    const dbc = require("nano")(
      "http://arpecop:maximus@localhost/" + req.params.id
    );
    dbc.insert({ username: res.locals.user.username, ...req.body }, function (
      err,
      body
    ) {
      res.json(err || body);
    });
  });
  app.use("/", require("express-pouchdb")(TempPouchDB));
  const httpServer = http.createServer(app);
  const httpsServer = https.createServer(credentials, app);

  httpServer.listen(80, () => {
    console.log("HTTP Server running on port 80");
  });

  httpsServer.listen(443, () => {
    console.log("HTTPS Server running on port 443");
  });
}
