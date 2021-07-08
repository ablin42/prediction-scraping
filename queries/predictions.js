// @MODELS
const Prediction = require("../models/Prediction");
// @MISC
const utils = require("../helpers/utils");

async function addPrediction(
  roundId,
  payoutUP,
  closePrice,
  diff,
  openPrice,
  poolValue,
  payoutDOWN,
  history
) {
  const prediction = new Prediction({
    roundId,
    payoutUP,
    closePrice,
    diff,
    openPrice,
    poolValue,
    payoutDOWN,
    history,
  });
  var [err, saved] = await utils.promise(prediction.save());
  if (err) {
    console.log("ERROR SAVING PREDICTION", err.message);
    // * try to add only history if it fails *
    var [err, saved] = await utils.promise(
      Prediction.findOneAndUpdate({ roundId }, { $set: { history } })
    );
    if (err) console.log(`ERROR FINDING AND UPDATING ROUND [${roundId}]`, err);
    else console.log(saved.roundId, "(updated history)");
  } else console.log(saved.roundId);

  return saved;
}

async function getAllPredictions() {
  let [err, result] = await utils.promise(Prediction.find());
  if (err) console.log("AN ERROR OCCURED FETCHING ALL DATA");
  return result;
}

async function getPrediction(roundId) {
  let [err, result] = await utils.promise(Prediction.findOne({ roundId }));
  if (err) console.log("AN ERROR OCCURED FETCHING THE PREDICION", roundId);

  return result;
}

async function getPredictionByRange(hours) {
  const [err, result] = await utils.promise(
    Prediction.find({
      createdAt: {
        $lt: new Date(),
        $gte: new Date(new Date().getTime() - hours * 60 * 60 * 1000), // hours minutes second miliseconds
      },
    })
  );
  if (err) console.log("Error fetching between date range");
  return result;
}

async function getLastPrediction() {
  let [err, result] = await utils.promise(
    Prediction.find().sort({ _id: -1 }).limit(1)
  );
  if (err) console.log("AN ERROR OCCURED FETCHING LAST PREDICTION");
  return result[0];
}

module.exports = {
  addPrediction,
  getLastPrediction,
  getPredictionByRange,
  getPrediction,
  getAllPredictions,
};
