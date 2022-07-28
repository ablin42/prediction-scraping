// @MODELS
const Average = require("../models/Average");
// @MISC
const utils = require("../helpers/utils");
const { AVERAGE_ID } = require("../constants");

// * INCREMENT TOTAL AVERAGE *
async function incrementTotalAverage({
  totalPayout,
  totalDiff,
  totalPool,
  totalSaved,
}) {
  const [err, averages] = await utils.promise(
    Average.findByIdAndUpdate(AVERAGE_ID, {
      $inc: {
        totalPayout: totalPayout,
        totalDiff: totalDiff,
        totalPool: totalPool,
        nbEntries: totalSaved,
      },
    })
  );
  if (err) console.log("AN ERROR OCCURED WHILE SAVING AVERAGES", err.message);
  return averages;
}

module.exports = {
  incrementTotalAverage,
};
