// @MISC
const { RANGE_OPTIONS } = require("../constants");

// * PARSES DIFF *
const _diff = function (value) {
  return parseFloat(value.substr(1).replace(",", "."));
};

// * PARSES POOL *
const _pool = function (value) {
  return parseFloat(value.replace(",", "."));
};

// * PARSES PAYOUT *
const _payout = function (value) {
  return parseFloat(value.slice(0, -1).replace(",", "."));
};

// * RETURNS AN OBJECT WITH PARSED DATA *
const getParsedData = function (diff, pool, payoutUP, payoutDOWN) {
  const pDiff = _diff(diff);
  const pUP = _payout(payoutUP);
  const pDOWN = _payout(payoutDOWN);
  return {
    parsedDiff: pDiff,
    parsedPool: _pool(pool),
    parsedUP: pUP,
    parsedDOWN: pDOWN,
    winningPayout: getWinningPayout(pDiff, pUP, pDOWN),
  };
};

// * RETURNS WHICH PAYOUT WON THE ROUND *
const getWinningPayout = function (diff, payoutUP, payoutDOWN) {
  return diff > 0 ? payoutUP : payoutDOWN;
};

// * CHECKS ROUND STATUS *
const isExpired = function (status) {
  return status === "Expired";
};

// * CONVERTS STRING PERIOD INTO HOURS *
const periodToHours = function (period) {
  const periodKey = Object.keys(RANGE_OPTIONS).filter((key) => {
    return key === period;
  });
  if (periodKey.length <= 0) return 2;

  return RANGE_OPTIONS[periodKey[0]];
};

// * RETURNS AN OBJECT WITH NEEDED DATA *
const getObjectFromDOM = async (DOM) => {
  const [
    status,
    roundId,
    ,
    payoutUP,
    ,
    ,
    ,
    oraclePrice,
    diff,
    ,
    ,
    openPrice,
    ,
    ,
    poolValue,
    ,
    payoutDOWN,
  ] = DOM;

  return {
    status,
    roundId,
    payoutUP,
    oraclePrice,
    diff,
    openPrice,
    poolValue,
    payoutDOWN,
  };
};

module.exports = {
  _diff,
  _pool,
  _payout,
  getWinningPayout,
  isExpired,
  getParsedData,
  periodToHours,
  getObjectFromDOM,
};
