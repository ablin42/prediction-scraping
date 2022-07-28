// @MODELS
const Oracle = require("../models/Oracle");
// @MISC
const utils = require("../helpers/utils");

// * GET LAST ORACLE *
async function getLastOracle() {
  const [err, result] = await utils.promise(
    Oracle.find().sort({ _id: -1 }).limit(1)
  );
  if (err) console.log("AN ERROR OCCURED FETCHING LAST ORACLE", err.message);
  return result[0];
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
  const [err, saved] = await utils.promise(oracle.save());
  if (err) console.log("ERROR SAVING ORACLE", err.message);
  return saved;
}

module.exports = {
  getLastOracle,
  addOracle,
};
