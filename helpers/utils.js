// @EXTERNALS
const pe = require("parse-error");

module.exports = {
  promise: async function (promise) {
    return promise
      .then((data) => {
        return [null, data];
      })
      .catch((err) => [pe(err)]);
  },
};
