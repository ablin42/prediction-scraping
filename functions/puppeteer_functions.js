// @QUERIES
const { getRound, getLastRound, addRound } = require("../queries/rounds");
const { incrementTotalAverage } = require("../queries/averages");
const { addOracle, getLastOracle } = require("../queries/oracle");
const { getTickerPrice, getCandle } = require("../queries/binance");
// @FUNCTIONS
const mailer = require("./contact");
const { isExpired, getWinningPayout } = require("./parser");
const { formatAvg } = require("./data");

// * SAVE EXPIRED ROUND THAT WE MOST LIKELY DIDNT MONITOR (due to our app being offline) *
async function saveExpiredRounds(DOM) {
  const isRoundExpired = isExpired(DOM.status);
  if (!isRoundExpired || DOM.payoutUP === "0" || DOM.payoutDOWN === "0") return;

  const existingRound = await getRound(DOM.roundId);
  if (existingRound) return;

  const data = {
    // winningPayout,
    roundId: DOM.roundId,
    payoutUP: DOM.payoutUP,
    closePrice: DOM.oraclePrice,
    diff: DOM.diff,
    openPrice: DOM.openPrice,
    poolValue: DOM.poolValue,
    payoutDOWN: DOM.payoutDOWN,
    history: [],
  };
  console.log("save expired rounds");
  await saveRound(data);
}

// * FORMAT DATA FROM DOM & INFOS TO RETURN TWO OBJECTS *
// * HEAD IS FOR THE GENERAL INFO, DATEDENTRY IS FOR HISTORY *
async function formatForClass(DOM, infos) {
  const { timeLeft, secondsSinceCandleOpen, BNBPrice, BTCPrice, oraclePrice } =
    infos;
  const price = DOM.oraclePrice ? DOM.oraclePrice : oraclePrice;

  let datedEntry = {
    status: DOM.status,
    timeLeft,
    secondsSinceCandleOpen,
    BNBPrice,
    BTCPrice,
    oraclePrice: price,
    payoutUP: DOM.payoutUP,
    payoutDOWN: DOM.payoutDOWN,
    poolValue: DOM.poolValue,
  };
  if (DOM.diff) datedEntry.diff = DOM.diff;

  const head = {
    status: DOM.status,
    roundId: DOM.roundId,
    poolValue: DOM.poolValue,
    oraclePrice: price,
    timeLeft,
  };

  return { datedEntry, head };
}

// * SAVE ROUND DATA TO DATABASE *
async function saveRoundLive(DOM, HISTORY) {
  // const { parsedDiff, parsedPool, winningPayout } = getParsedData(
  //   DOM.diff,
  //   DOM.poolValue,
  //   DOM.payoutUP,
  //   DOM.payoutDOWN
  // );

  await saveRound({
    //winningPayout: getWinningPayout(DOM.diff, DOM.payoutUP, DOM.payoutDOWN),
    roundId: DOM.roundId,
    payoutUP: DOM.payoutUP,
    closePrice: DOM.oraclePrice,
    diff: DOM.diff,
    openPrice: DOM.openPrice,
    poolValue: DOM.poolValue,
    payoutDOWN: DOM.payoutDOWN,
    history: HISTORY,
  });
}

// * SAVE ORACLE DATA TO DATABASE *
async function saveOracle(DOM, infos) {
  const { BNBPrice, BTCPrice, timeLeft, secondsSinceCandleOpen } = infos;
  const lastOracle = await getLastOracle();
  const timestamp = +new Date();
  const secondsSinceLastOracleAdded = (timestamp - +lastOracle.date) / 1000;

  if (secondsSinceLastOracleAdded > 22)
    addOracle({
      roundId: DOM.roundId,
      oraclePrice: DOM.oraclePrice,
      openPrice: DOM.openPrice,
      BNBPrice,
      BTCPrice,
      secondsSinceCandleOpen,
      timeLeft,
    });
}

// * RETURNS PARAMETERS THAT WE PASS TO PUPPETEER INSTANCE *
async function getEvaluateParams() {
  const BNBPrice = formatAvg(await getTickerPrice("BNB"));
  const BTCPrice = formatAvg(await getTickerPrice("BTC"));
  const BNBCandle = await getCandle("BNB");
  const timestamp = +new Date();
  const secondsSinceCandleOpen = (timestamp - BNBCandle[0]) / 1000;

  return { BNBPrice, BTCPrice, secondsSinceCandleOpen };
}

// * ADD A ROUND TO DATABASE & INCREMENT AVERAGES WITH ITS VALUES *
async function saveRound(entry) {
  const {
    roundId,
    payoutUP,
    closePrice,
    diff,
    openPrice,
    poolValue,
    payoutDOWN,
    history,
  } = entry;
  const winningPayout = getWinningPayout(diff, payoutUP, payoutDOWN);

  const addedRound = await addRound(
    roundId,
    payoutUP,
    closePrice,
    diff,
    openPrice,
    poolValue,
    payoutDOWN,
    history
  );

  if (addedRound)
    averages = await incrementTotalAverage({
      totalPayout: winningPayout,
      totalDiff: diff,
      totalPool: poolValue,
      totalSaved: 1,
    });
}

module.exports = {
  getEvaluateParams,
  saveOracle,
  saveRoundLive,
  formatForClass,
  saveExpiredRounds,
  saveRound,
};
