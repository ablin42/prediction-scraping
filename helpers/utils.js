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
  checkValidationResult: async function (result) {
    let errors = [];
    if (!result.isEmpty()) {
      result.errors.forEach((element) => {
        errors.push(element);
      });
    }
    return errors;
  },
};
