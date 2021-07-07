// @EXTERNALS
const puppeteer = require("puppeteer");
// @QUERIES
const {
  getPrediction,
  getLastPrediction,
  addPrediction,
} = require("../queries/predictions");
const { incrementTotalAverage } = require("../queries/averages");
const { getTickerPrice, getCandle } = require("../queries/binance");
const { setStatus, getStatus } = require("../queries/status");
// @FUNCTIONS
const mailer = require("./contact");
const { isExpired, getParsedData, getWinningPayout } = require("./parser");
const { formatAvg } = require("./data");
// @CLASSES
const { Rounds } = require("../classes/rounds");

// * FUNCTION CALLED ONCE AT BOOT *
// * RUNS PUPPETEER, COLLECT & SAVE DATA *
const scrapePage = async () => {
  // * INITIALIZE PUPPETEER & ROUNDS CLASS *
  const options = {
    // headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  const newRounds = new Rounds();

  // * EXPOSE FUNCTIONS FOR PUPPETEER *
  //   await page.exposeFunction("_Rounds", Rounds);
  // TODO try to reduce this to a minimum
  // * QUERIES *
  await page.exposeFunction("_savePrediction", savePrediction);
  await page.exposeFunction("_getPrediction", getPrediction);

  // * PARSER *
  await page.exposeFunction("_isExpired", isExpired);
  await page.exposeFunction("_winningPayout", getWinningPayout);
  await page.exposeFunction("_getParsedData", getParsedData);

  // * ROUNDS CLASS METHODS *
  await page.exposeFunction("setNext", (next) => newRounds.setNext(next));
  await page.exposeFunction("getNext", () => newRounds.getNext());
  await page.exposeFunction("setNextDatedEntries", (entry) =>
    newRounds.setNextDatedEntries(entry)
  );
  await page.exposeFunction("setLive", (live) => newRounds.setLive(live));
  await page.exposeFunction("getLive", () => newRounds.getLive());
  await page.exposeFunction("getHistory", () => newRounds.getLiveHistory());
  await page.exposeFunction("setLiveDatedEntries", (entry) =>
    newRounds.setLiveDatedEntries(entry)
  );

  await page.goto("https://pancakeswap.finance/prediction");

  // * MONITOR LAST ROUND ADDED TO DETECT IF PANCAKESWAP BETS SERVICES ARE DOWN *
  setInterval(async function () {
    const status = await getStatus();
    const lastPrediction = await getLastPrediction();
    const timestamp = +new Date();

    if (timestamp - lastPrediction.date > 10 * 60 * 1000 && status.isUp) {
      await setStatus(false);
      if (await mailer(process.env.EMAIL, "Market is [ DOWN ]", ""))
        console.log("An error occured while sending the mail");
    } else if (
      timestamp - lastPrediction.date < 10 * 60 * 1000 &&
      !status.isUp
    ) {
      await setStatus(true);
      if (await mailer(process.env.EMAIL, "Market is [ UP ]", ""))
        console.log("An error occured while sending the mail");
    }
  }, 1000 * 60 * 10);

  // * WAIT FOR PANCAKESWAP ROUNDS TO BE LOADED INTO DOM *
  // * COLLECTS DATA EVERY 10 SECONDS *
  await page.waitForSelector(".swiper-slide-active", { timeout: 0 });
  setInterval(async function () {
    const BNBPrice = formatAvg(await getTickerPrice("BNB"));
    const BTCPrice = formatAvg(await getTickerPrice("BTC"));
    const BNBCandle = await getCandle("BNB");
    const timestamp = +new Date();
    const secondsSinceCandleOpen = (timestamp - BNBCandle[0]) / 1000;
    const data = await page.evaluate(
      async (BNBPrice, BTCPrice, secondsSinceCandleOpen) => {
        // * Get Live Round Data *
        const [
          liveStatus,
          liveRoundId,
          ,
          livePayoutUP,
          ,
          ,
          ,
          liveOraclePrice,
          liveDiff,
          ,
          ,
          liveOpenPrice,
          ,
          ,
          livePoolValue,
          ,
          livePayoutDOWN,
        ] = document
          .querySelector(".swiper-slide-active")
          .innerText.replaceAll("\n", " ")
          .split(" ");

        // * Get Next Round Data *
        const [
          status,
          roundId,
          ,
          payoutUP,
          ,
          ,
          ,
          poolValue,
          ,
          ,
          ,
          ,
          payoutDOWN,
        ] = document
          .querySelector(".swiper-slide-next")
          .innerText.replaceAll("\n", " ")
          .split(" ");

        // * Get Timer *
        const timeLeft = document.querySelector(
          "#root > div:nth-child(2) > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(1) > div > div > div:nth-child(1)  > div:nth-child(3) > div > div:nth-child(1)  > div > div:nth-child(1) > div:nth-child(1)"
        ).innerHTML;
        //? first nth-child(2) is 2 because of popup, else set to 1

        const currentlyMonitored = await getNext();
        const currentlyLive = await getLive();
        const history = await getHistory();

        // * Goes here only if the live round that was being monitored closes *
        if (
          liveRoundId !== currentlyLive.roundId &&
          currentlyLive?.roundId !== undefined
        ) {
          // * Get Prev Round Data (= round that was monitored until now) *
          const [
            prevStatus,
            prevRoundId,
            ,
            prevPayoutUP,
            ,
            ,
            ,
            prevClosePrice,
            prevDiff,
            ,
            ,
            prevOpenPrice,
            ,
            ,
            prevPoolValue,
            ,
            prevPayoutDOWN,
          ] = document
            .querySelector(".swiper-slide-prev")
            .innerText.replaceAll("\n", " ")
            .split(" ");

          const { parsedDiff, parsedPool, parsedUP, parsedDOWN } =
            await _getParsedData(
              prevDiff,
              prevPoolValue,
              prevPayoutUP,
              prevPayoutDOWN
            );
          const winningPayout = await _winningPayout(
            prevDiff,
            parsedUP,
            parsedDOWN
          );

          _savePrediction({
            parsedDiff,
            parsedPool,
            winningPayout,
            roundId: prevRoundId,
            payoutUP: prevPayoutUP,
            closePrice: prevClosePrice,
            diff: prevDiff,
            openPrice: prevOpenPrice,
            poolValue: prevPoolValue,
            payoutDOWN: prevPayoutDOWN,
            history: history,
          });
        }

        // * Save Next Round data *
        if (
          currentlyMonitored.roundId !== roundId ||
          currentlyMonitored.poolValue !== poolValue
        ) {
          const nextDatedEntries = {
            status,
            timeLeft,
            secondsSinceCandleOpen,
            BNBPrice,
            BTCPrice,
            oraclePrice: liveOraclePrice,
            payoutUP,
            payoutDOWN,
            poolValue,
          };
          setNext({ status, roundId, poolValue, timeLeft });
          setNextDatedEntries(nextDatedEntries);
        }

        // * Save Live Round Data *
        if (
          currentlyLive.liveOraclePrice !== liveOraclePrice &&
          liveRoundId !== currentlyMonitored.roundId
          // && currentlyLive.roundId !== undefined//
        ) {
          const liveDatedEntries = {
            status: liveStatus,
            timeLeft,
            secondsSinceCandleOpen,
            BNBPrice,
            BTCPrice,
            oraclePrice: liveOraclePrice,
            diff: liveDiff,
            payoutUP: livePayoutUP,
            payoutDOWN: livePayoutDOWN,
            poolValue: livePoolValue,
          };
          setLive({
            status: liveStatus,
            roundId: liveRoundId,
            oraclePrice: liveOraclePrice,
            openPrice: liveOpenPrice,
            timeLeft,
          });
          setLiveDatedEntries(liveDatedEntries);
        }

        //!
        const slides = document.querySelectorAll(".swiper-slide");
        for (item of Array.from(slides)) {
          const [
            _status,
            _roundId,
            ,
            _payoutUP,
            ,
            ,
            ,
            _closePrice,
            _diff,
            ,
            ,
            _openPrice,
            ,
            ,
            _poolValue,
            ,
            _payoutDOWN,
          ] = item
            .querySelector("div > div > div > div > div > div > div > div")
            .innerText.replaceAll("\n", " ")
            .split(" ");

          const isExpired = await _isExpired(_status);
          if (!isExpired || _payoutUP === "0x" || _payoutDOWN === "0x")
            continue;

          const existingRound = await _getPrediction(_roundId);
          if (existingRound) continue;

          const { parsedDiff, parsedPool, parsedUP, parsedDOWN } =
            await _getParsedData(_diff, _poolValue, _payoutUP, _payoutDOWN);
          const winningPayout = await _winningPayout(
            _diff,
            parsedUP,
            parsedDOWN
          );

          const data = {
            parsedDiff,
            parsedPool,
            winningPayout,
            roundId: _roundId,
            payoutUP: _payoutUP,
            closePrice: _closePrice,
            diff: _diff,
            openPrice: _openPrice,
            poolValue: _poolValue,
            payoutDOWN: _payoutDOWN,
            history: [],
          };

          _savePrediction(data);
        }
      },
      BNBPrice,
      BTCPrice,
      secondsSinceCandleOpen
    );
  }, 10000);
};

// * ADD A ROUND TO DATABASE & INCREMENT AVERAGES WITH ITS VALUES *
async function savePrediction(entry) {
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

  const addedPrediction = await addPrediction(
    roundId,
    payoutUP,
    closePrice,
    diff,
    openPrice,
    poolValue,
    payoutDOWN,
    history
  );

  if (addedPrediction)
    averages = await incrementTotalAverage({
      totalPayout: winningPayout,
      totalDiff: parsedDiff,
      totalPool: parsedPool,
      totalSaved: 1,
    });
}

module.exports = {
  scrapePage,
  savePrediction,
};
