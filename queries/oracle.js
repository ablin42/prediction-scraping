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

async function addOracle({
  roundId,
  oraclePrice,
  BNBPrice,
  BTCPrice,
  secondsSinceCandleOpen,
  timeLeft,
}) {
  const oracle = new Oracle({
    roundId,
    oraclePrice,
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
};
