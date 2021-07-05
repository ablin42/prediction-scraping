const axios = require("axios").default;

const utils = require("./utils");
const Prediction = require("../models/Prediction");
const Average = require("../models/Average");
const Status = require("../models/Status");

async function setStatus(status) {
  const newStatus = new Status({
    isUp: status,
  });
  const [err, saved] = await utils.promise(newStatus.save());
  if (err) console.log("AN ERROR OCCURED UPDATING STATUS");
  return saved;
}

async function getStatus() {
  let [err, result] = await utils.promise(
    Status.find().sort({ _id: -1 }).limit(1)
  );
  if (err) console.log("AN ERROR OCCURED FETCHING LAST STATUS");
  return result[0];
}

async function getLastPrediction() {
  let [err, result] = await utils.promise(
    Prediction.find().sort({ _id: -1 }).limit(1)
  );
  if (err) console.log("AN ERROR OCCURED FETCHING LAST PREDICTION");
  return result[0];
}

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
  const [err, saved] = await utils.promise(prediction.save());
  if (err) console.log("ERROR SAVING PREDICTION", err.message);
  else console.log(saved.roundId);

  return saved;
}

async function incrementTotalAverage({
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

async function getPrediction(roundId) {
  let [err, result] = await utils.promise(Prediction.findOne({ roundId }));
  if (err) console.log("AN ERROR OCCURED FETCHING THE PREDICION", roundId);

  return result;
}

async function getAllPredictions() {
  let [err, result] = await utils.promise(Prediction.find());
  if (err) console.log("AN ERROR OCCURED FETCHING ALL DATA");
  return result;
}

async function getTickerPrice(ticker) {
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbol=${ticker}USDT`
    );
    if (response.status === 200) return parseFloat(response.data.price);
    return false;
  } catch (err) {
    console.log(`ERROR FETCHING ${ticker} PRICE`, err);
  }
}
/*
    * getTickerPrice response
    {"symbol":"BNBUSDT","price":"298.59000000"}
*/

async function getCandle(ticker) {
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=${ticker}USDT&interval=5m&limit=1`
    );
    if (response.status === 200) return response.data[0];
    return false;
  } catch (err) {
    console.log(`ERROR FETCHING ${ticker} PRICE`, err);
  }
}
/*
    * getCandle response
    [
        [
            1499040000000,      // Open time
            "0.01634790",       // Open
            "0.80000000",       // High
            "0.01575800",       // Low
            "0.01577100",       // Close
            "148976.11427815",  // Volume
            1499644799999,      // Close time
            "2434.19055334",    // Quote asset volume
            308,                // Number of trades
            "1756.87402397",    // Taker buy base asset volume
            "28.46694368",      // Taker buy quote asset volume
            "17928899.62484339" // Ignore.
        ]
    ]
*/

module.exports = {
  setStatus,
  getStatus,
  addPrediction,
  getLastPrediction,
  incrementTotalAverage,
  updateTotalAverage,
  getPredictionByRange,
  getPrediction,
  getAllPredictions,
  getTickerPrice,
  getCandle,
};
