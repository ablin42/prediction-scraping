// @MODELS
const Oracle = require("../models/Oracle");
// @MISC
const utils = require("../helpers/utils");

// * GET LAST ORACLE *
async function getLastOracle() {
  let [err, result] = await utils.promise(
    Oracle.find().sort({ _id: -1 }).limit(1)
  );
  if (err) console.log("AN ERROR OCCURED FETCHING LAST ORACLE");
  return result[0];
}

async function getRoundOracle(roundId) {
  const [err, roundOracle] = await utils.promise(
    Oracle.find({ roundId: roundId })
  );
  if (err)
    console.log("An error occured while fetching this round's oracle data");

  return roundOracle;
}

// * GET ALL ORACLES SINCE X HOURS *
// ? @PARAM: hours => Number of hours
async function getOracleByLimit(limit) {
  const [err, result] = await utils.promise(
    Oracle.find().sort({ _id: -1 }).limit(limit)
  );
  // console.log(result[0], result[1], "!!!");
  if (err) console.log("Error fetching oracles between date range");
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
  if (err) console.log("Error fetching oracles between date range");
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
  if (err) console.log("ERROR SAVING ORACLE", err.message);

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
