const _diff = function (value) {
  return parseFloat(value.substr(1).replace(",", "."));
};

const _pool = function (value) {
  return parseFloat(value.replace(",", "."));
};

const _payout = function (value) {
  return parseFloat(value.slice(0, -1).replace(",", "."));
};

const getParsedData = function (diff, pool, payoutUP, payoutDOWN) {
  return {
    parsedDiff: _diff(diff),
    parsedPool: _pool(pool),
    parsedUP: _payout(payoutUP),
    parsedDOWN: _payout(payoutDOWN),
  };
};

const winningPayout = function (diff, payoutUP, payoutDOWN) {
  return diff > 0 ? payoutUP : payoutDOWN;
};

const isExpired = function (status) {
  return status === "Expired";
};

module.exports = {
  _diff,
  _pool,
  _payout,
  winningPayout,
  isExpired,
  getParsedData,
};
