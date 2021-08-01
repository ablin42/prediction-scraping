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

// * FILL AVERAGE ENTRY WITH NEW VALUES *
// ! This WILL override all the data, be careful
async function updateTotalAverage({
  totalPayout,
  totalDiff,
  totalPool,
  nbEntries,
  totalPayoutUP,
  nbRoundUP,
  totalPayoutDOWN,
  nbRoundDOWN,
  riskyTotalPayout,
  riskyWins,
  safeWins,
  safeTotalPayout,
}) {
  const [err, averages] = await utils.promise(
    Average.findByIdAndUpdate(AVERAGE_ID, {
      totalPayout,
      totalDiff,
      totalPool,
      nbEntries,
      totalPayoutUP,
      nbRoundUP,
      totalPayoutDOWN,
      nbRoundDOWN,
      riskyTotalPayout,
      riskyWins,
      safeWins,
      safeTotalPayout,
    })
  );
  if (err)
    console.log("AN ERROR OCCURED WHILE SAVING ALL AVERAGES", err.message);
  return averages;
}

module.exports = {
  incrementTotalAverage,
  updateTotalAverage,
};
