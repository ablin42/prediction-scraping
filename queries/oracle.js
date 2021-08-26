// @MODELS
const Oracle = require("../models/Oracle");
// @MISC
const utils = require("../helpers/utils");

// * GET LAST ORACLE *
async function getLastOracle() {
  let [err, result] = await utils.promise(
    Oracle.find().sort({ _id: -1 }).limit(1)
  );
  if (err) console.log("AN ERROR OCCURED FETCHING LAST ORACLE", err.message);
  return result[0];
}

async function getRoundOracle(roundId) {
  const [err, roundOracle] = await utils.promise(
    Oracle.find({ roundId: roundId })
  );
  if (err)
    console.log(
      `AN ERROR OCCURED FETCHING THIS ROUND'S [${roundId}] ORACLE DATA`,
      err.message
    );
  return roundOracle;
}

// * GET ALL ORACLES SINCE X HOURS *
// ? @PARAM: hours => Number of hours
async function getOracleByLimit(limit) {
  const [err, result] = await utils.promise(
    Oracle.find().sort({ _id: -1 }).limit(limit)
  );
  if (err) console.log(`ERROR FETCHING LAST [${limit}] ORACLES`, err.message);
  return result;
}

// * GET ALL ORACLES SINCE X HOURS *
// ? @PARAM: hours => Number of hours
async function getOracleByRange(hours) {
  const [err, result] = await utils.promise(
    Oracle.find({
      createdAt: {
        $lt: new Date(),
        $gte: new Date(new Date().getTime() - hours * 60 * 60 * 1000),
      },
    })
  );
  if (err)
    console.log(`ERROR FETCHING ORACLE FOR LAST [${hours}] HOURS`, err.message);
  return result;
}

async function addOracle({
  roundId,
  oraclePrice,
  openPrice,
  BNBPrice,
  BTCPrice,
  secondsSinceCandleOpen,
  timeLeft,
}) {
  const oracle = new Oracle({
    roundId,
    oraclePrice,
    openPrice,
    BNBPrice,
    BTCPrice,
    secondsSinceCandleOpen,
    timeLeft,
  });
  var [err, saved] = await utils.promise(oracle.save());
  if (err) console.log("ERROR SAVING ORACLE", err.message);
  return saved;
}

async function getAllOracle() {
  var [err, saved] = await utils.promise(Oracle.find());
  if (err) console.log("ERROR FETCHING ALL ORACLE", err.message);
  return saved;
}

module.exports = {
  getLastOracle,
  getRoundOracle,
  addOracle,
  getAllOracle,
  getOracleByRange,
  getOracleByLimit,
};
