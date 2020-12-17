var request = require("request");

function query(q) {
  return new Promise((resolve) => {
    var request = require("request");

    var options = {
      uri: "https://rudixlab.herokuapp.com/db/",
      method: "POST",
      json: q,
    };

    request(options, function (error, response, body) {
      resolve(body); // Print the shortened url.
    });
  });
}

module.exports = { query };
