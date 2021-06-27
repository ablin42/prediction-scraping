const pe = require("parse-error");
const { RANGE_OPTIONS } = require("../constants");

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
  periodToHours: function (period) {
    const periodKey = Object.keys(RANGE_OPTIONS).filter((key) => {
      return key === period;
    });
    if (periodKey.length <= 0) return 2;

    return RANGE_OPTIONS[periodKey[0]];
  },
};
