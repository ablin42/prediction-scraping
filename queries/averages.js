// @MODELS
const Average = require("../models/Average");
// @MISC
const utils = require("../helpers/utils");
const { AVERAGE_ID } = require("../constants");

async function incrementTotalAverage({
  totalPayout,
  totalDiff,
  totalPool,
  totalSaved,
}) {
  const [errUpdate, averages] = await utils.promise(
    Average.findByIdAndUpdate(AVERAGE_ID, {
      $inc: {
        totalPayout: totalPayout,
        totalDiff: totalDiff,
        totalPool: totalPool,
        nbEntries: totalSaved,
      },
    })
  );
  if (errUpdate) console.log("AN ERROR OCCURED WHILE SAVING AVERAGES");
  return averages;
}

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
  const [errUpdate, averages] = await utils.promise(
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
  if (errUpdate)
    console.log("AN ERROR OCCURED WHILE SAVING AVERAGES", errUpdate);
  return averages;
}

module.exports = {
  incrementTotalAverage,
  updateTotalAverage,
};
