const utils = require("./utils");
const Prediction = require("../models/Prediction");
const Average = require("../models/Average");

const addPrediction = async function (
  roundId,
  payoutUP,
  closePrice,
  diff,
  openPrice,
  poolValue,
  payoutDOWN
) {
  const prediction = new Prediction({
    roundId,
    payoutUP,
    closePrice,
    diff,
    openPrice,
    poolValue,
    payoutDOWN,
  });
  console.log(roundId);
  const [err, saved] = await utils.promise(prediction.save());
  if (err) console.log("ERROR SAVING PREDICTION", err.message);
  else console.log(saved);

  return saved;
};

const incrementTotalAverage = async function ({
  totalPayout,
  totalDiff,
  totalPool,
  totalSaved,
}) {
  const [errUpdate, averages] = await utils.promise(
    Average.findByIdAndUpdate("60d3706f5df5b953ed053cb3", {
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
};

const updateTotalAverage = async function ({
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
    Average.findByIdAndUpdate("60d3836b82b6dfd7f7b04c53", {
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
};

async function getPredictionByRange() {
  const [err, result] = await utils.promise(
    Prediction.find({
      createdAt: {
        $lt: new Date(),
        $gte: new Date(new Date().getTime() - 2 * 60 * 60 * 1000), // hours minutes second miliseconds
      },
    })
  );
  if (err) console.log("Error fetching between date range");
  return result;
}

async function getAllPredictions() {
  let [err, result] = await utils.promise(Prediction.find());
  if (err) console.log("AN ERROR OCCURED FETCHING ALL DATA");
  return result;
}

module.exports = {
  addPrediction,
  incrementTotalAverage,
  updateTotalAverage,
  getPredictionByRange,
  getAllPredictions,
};
