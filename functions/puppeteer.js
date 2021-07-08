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
const { isExpired, getParsedData, getObjectFromDOM } = require("./parser");
const { formatAvg } = require("./data");
// @CLASSES
const { Rounds } = require("../classes/rounds");

// * FUNCTION CALLED ONCE AT BOOT *
// * RUNS PUPPETEER, COLLECT & SAVE DATA *
const scrapePage = async () => {
  // * INITIALIZE PUPPETEER & ROUNDS CLASS *
  const options = {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  const newRounds = new Rounds();
  const INTERVAL = 1000 * 60 * 10;

  // * EXPOSE FUNCTIONS FOR PUPPETEER *
  // TODO try to reduce this to a minimum
  // * QUERIES *
  await page.exposeFunction("_savePrediction", savePrediction);
  await page.exposeFunction("_getPrediction", getPrediction);
  // * PARSER *
  await page.exposeFunction("_isExpired", isExpired);
  await page.exposeFunction("_getParsedData", getParsedData);
  await page.exposeFunction("_getObjectFromDOM", (document) =>
    getObjectFromDOM(document)
  );
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

    if (timestamp - lastPrediction.date > INTERVAL && status.isUp) {
      await setStatus(false);
      if (await mailer(process.env.EMAIL, "Market is [ DOWN ]", ""))
        console.log("An error occured while sending the mail");
    } else if (timestamp - lastPrediction.date < INTERVAL && !status.isUp) {
      await setStatus(true);
      if (await mailer(process.env.EMAIL, "Market is [ UP ]", ""))
        console.log("An error occured while sending the mail");
    }
  }, INTERVAL);

  // * WAIT FOR PANCAKESWAP ROUNDS TO BE LOADED INTO DOM *
  // * COLLECTS DATA EVERY 10 SECONDS *
  await page.waitForSelector(".swiper-slide-active", { timeout: 0 });
  setInterval(async function () {
    const BNBPrice = formatAvg(await getTickerPrice("BNB"));
    const BTCPrice = formatAvg(await getTickerPrice("BTC"));
    const BNBCandle = await getCandle("BNB");
    const timestamp = +new Date();
    const secondsSinceCandleOpen = (timestamp - BNBCandle[0]) / 1000;
    await page.evaluate(
      async (BNBPrice, BTCPrice, secondsSinceCandleOpen) => {
        // * Get Live Round Data *
        const LIVE_DOM = await _getObjectFromDOM(
          document
            .querySelector(".swiper-slide-active")
            .innerText.replaceAll("\n", " ")
            .split(" ")
        );
        // * Get Next Round Data *
        const NEXT_DOM = await _getObjectFromDOM(
          document
            .querySelector(".swiper-slide-next")
            .innerText.replaceAll("\n", " ")
            .split(" ")
        );
        // * Get Timer *
        const timeLeft = document.querySelector(
          "#root > div:nth-child(2) > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(1) > div > div > div:nth-child(1)  > div:nth-child(3) > div > div:nth-child(1)  > div > div:nth-child(1) > div:nth-child(1)"
        ).innerHTML;
        //? first nth-child(2) is 2 because of popup, else set to 1

        const NEXT = await getNext();
        const LIVE = await getLive();
        const HISTORY = await getHistory();

        // * Save LIVE round that just closed to DB *
        if (LIVE_DOM.roundId !== LIVE.roundId && LIVE?.roundId !== undefined) {
          // * Get Prev Round Data (= round that was monitored until now) *
          const PREV_DOM = await _getObjectFromDOM(
            document
              .querySelector(".swiper-slide-prev")
              .innerText.replaceAll("\n", " ")
              .split(" ")
          );

          const { parsedDiff, parsedPool, winningPayout } =
            await _getParsedData(
              PREV_DOM.diff,
              PREV_DOM.poolValue,
              PREV_DOM.payoutUP,
              PREV_DOM.payoutDOWN
            );

          _savePrediction({
            parsedDiff,
            parsedPool,
            winningPayout,
            roundId: PREV_DOM.roundId,
            payoutUP: PREV_DOM.payoutUP,
            closePrice: PREV_DOM.oraclePrice,
            diff: PREV_DOM.diff,
            openPrice: PREV_DOM.openPrice,
            poolValue: PREV_DOM.poolValue,
            payoutDOWN: PREV_DOM.payoutDOWN,
            history: HISTORY,
          });
        }

        // * Save Next Round data to Class*
        if (
          NEXT.roundId !== NEXT_DOM.roundId ||
          NEXT.poolValue !== NEXT_DOM.poolValue
        ) {
          const nextDatedEntries = {
            status: NEXT_DOM.status,
            timeLeft,
            secondsSinceCandleOpen,
            BNBPrice,
            BTCPrice,
            oraclePrice: LIVE_DOM.oraclePrice,
            payoutUP: NEXT_DOM.payoutUP,
            payoutDOWN: NEXT_DOM.payoutDOWN,
            poolValue: NEXT_DOM.poolValue,
          };
          setNext({
            status: NEXT_DOM.status,
            roundId: NEXT_DOM.roundId,
            poolValue: NEXT_DOM.poolValue,
            timeLeft,
          });
          setNextDatedEntries(nextDatedEntries);
        }

        // * Save Live Round Data To Class *
        if (
          LIVE.liveOraclePrice !== LIVE_DOM.oraclePrice &&
          LIVE_DOM.roundId !== NEXT_DOM.roundId
        ) {
          const liveDatedEntries = {
            status: LIVE_DOM.status,
            timeLeft,
            secondsSinceCandleOpen,
            BNBPrice,
            BTCPrice,
            oraclePrice: LIVE_DOM.oraclePrice,
            diff: LIVE_DOM.diff,
            payoutUP: LIVE_DOM.payoutUP,
            payoutDOWN: LIVE_DOM.payoutDOWN,
            poolValue: LIVE_DOM.poolValue,
          };
          setLive({
            status: LIVE_DOM.status,
            roundId: LIVE_DOM.roundId,
            oraclePrice: LIVE_DOM.oraclePrice,
            openPrice: LIVE_DOM.openPrice,
            timeLeft,
          });
          setLiveDatedEntries(liveDatedEntries);
        }

        // * Get All Expired Rounds and Save them *
        const slides = document.querySelectorAll(".swiper-slide");
        for (item of Array.from(slides)) {
          // * Get Expired Round Data *
          const EXP_DOM = await _getObjectFromDOM(
            item
              .querySelector("div > div > div > div > div > div > div > div")
              .innerText.replaceAll("\n", " ")
              .split(" ")
          );

          const isExpired = await _isExpired(EXP_DOM.status);
          if (
            !isExpired ||
            EXP_DOM.payoutUP === "0x" ||
            EXP_DOM.payoutDOWN === "0x"
          )
            continue;

          const existingRound = await _getPrediction(EXP_DOM.roundId);
          if (existingRound) continue;

          const { parsedDiff, parsedPool, winningPayout } =
            await _getParsedData(
              EXP_DOM.diff,
              EXP_DOM.poolValue,
              EXP_DOM.payoutUP,
              EXP_DOM.payoutDOWN
            );

          const data = {
            parsedDiff,
            parsedPool,
            winningPayout,
            roundId: EXP_DOM.roundId,
            payoutUP: EXP_DOM.payoutUP,
            closePrice: EXP_DOM.oraclePrice,
            diff: EXP_DOM.diff,
            openPrice: EXP_DOM.openPrice,
            poolValue: EXP_DOM.poolValue,
            payoutDOWN: EXP_DOM.payoutDOWN,
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
