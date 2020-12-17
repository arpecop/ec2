var request = require("request");

function query(q) {
  return new Promise((resolve) => {
    request(
      {
        uri: "https://rudixlab.herokuapp.com/db/",
        method: "POST",
        json: q,
      },
      function (error, response, body) {
        resolve(body); // Print the shortened url.
      }
    );
  });
}

module.exports = { query };
