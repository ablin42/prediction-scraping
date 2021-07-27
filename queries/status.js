// @MODELS
const Status = require("../models/Status");
// @MISC
const utils = require("../helpers/utils");

// * SET STATUS *
async function setStatus(status) {
  const newStatus = new Status({
    isUp: status,
  });
  const [err, saved] = await utils.promise(newStatus.save());
  if (err) console.log(`AN ERROR OCCURED UPDATING STATUS (${status})`);
  return saved;
}

// * RETURNS STATUS *
async function getStatus() {
  let [err, result] = await utils.promise(
    Status.find().sort({ _id: -1 }).limit(1)
  );
  if (err) console.log("AN ERROR OCCURED FETCHING LAST STATUS");
  return result[0];
}

module.exports = {
  setStatus,
  getStatus,
};
