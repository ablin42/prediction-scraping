// @QUERIES
const { getRound, getLastRound, addRound } = require("../queries/rounds");
const { incrementTotalAverage } = require("../queries/averages");
const { addOracle, getLastOracle } = require("../queries/oracle");
const { getTickerPrice, getCandle } = require("../queries/binance");
const { setStatus, getStatus } = require("../queries/status");
// @FUNCTIONS
const mailer = require("./contact");
const { isExpired, getParsedData } = require("./parser");
const { formatAvg } = require("./data");

// * CHECK THE PREDICTION GAME STATUS (UP/DOWN) *
async function checkStatus() {
  const status = await getStatus();
  const lastRound = await getLastRound();
  const timestamp = +new Date();
  const INTERVAL = 1000 * 60 * 10;

  if (timestamp - lastRound.date > INTERVAL && status.isUp) {
    await setStatus(false);
    if (await mailer(process.env.EMAIL, "Market is [ DOWN ]", ""))
      console.log("An error occured while sending the mail");
    return (STATUS = "DOWN");
  } else if (timestamp - lastRound.date < INTERVAL && !status.isUp) {
    await setStatus(true);
    if (await mailer(process.env.EMAIL, "Market is [ UP ]", ""))
      console.log("An error occured while sending the mail");
    return (STATUS = "UP");
  }
}

// * SAVE EXPIRED ROUND THAT WE MOST LIKELY DIDNT MONITOR (due to our app being offline) *
async function saveExpiredRounds(DOM) {
  const isRoundExpired = isExpired(DOM.status);
  if (!isRoundExpired || DOM.payoutUP === "0x" || DOM.payoutDOWN === "0x")
    return;

  const existingRound = await getRound(DOM.roundId);
  if (existingRound) return;

  const { parsedDiff, parsedPool, winningPayout } = getParsedData(
    DOM.diff,
    DOM.poolValue,
    DOM.payoutUP,
    DOM.payoutDOWN
  );

  const data = {
    parsedDiff,
    parsedPool,
    winningPayout,
    roundId: DOM.roundId,
    payoutUP: DOM.payoutUP,
    closePrice: DOM.oraclePrice,
    diff: DOM.diff,
    openPrice: DOM.openPrice,
    poolValue: DOM.poolValue,
    payoutDOWN: DOM.payoutDOWN,
    history: [],
  };
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
async function saveRound(DOM, HISTORY) {
  const { parsedDiff, parsedPool, winningPayout } = getParsedData(
    DOM.diff,
    DOM.poolValue,
    DOM.payoutUP,
    DOM.payoutDOWN
  );

  await saveRound({
    parsedDiff,
    parsedPool,
    winningPayout,
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
      oraclePrice: DOM.oraclePrice.substr(1),
      openPrice: DOM.openPrice.substr(1),
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
    parsedDiff,
    parsedPool,
    winningPayout,
    roundId,
    payoutUP,
    closePrice,
    diff,
    openPrice,
    poolValue,
    payoutDOWN,
    history,
  } = entry;

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
      totalDiff: parsedDiff,
      totalPool: parsedPool,
      totalSaved: 1,
    });
}

module.exports = {
  getEvaluateParams,
  saveOracle,
  saveRound,
  formatForClass,
  saveExpiredRounds,
  checkStatus,
  saveRound,
};
