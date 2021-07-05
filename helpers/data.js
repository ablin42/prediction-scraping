const puppeteer = require("puppeteer");
const parser = require("./parser");
const { isExpired, getParsedData, winningPayout } = require("./parser");
const {
  addPrediction,
  updateTotalAverage,
  incrementTotalAverage,
  getPrediction,
  getLastPrediction,
  getAllPredictions,
  getTickerPrice,
  getCandle,
  setStatus,
  getStatus,
} = require("./query");
const { TotalAverages, Prediction } = require("./average");
const { Scraping } = require("./round");
const mailer = require("./contact");

async function newSavePrediction(entry) {
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

const scrapePage = async () => {
  const options = {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  const newScraping = new Scraping();

  await page.exposeFunction("_savePrediction", newSavePrediction);

  await page.exposeFunction("_isExpired", isExpired);
  await page.exposeFunction("_winningPayout", winningPayout);
  await page.exposeFunction("_getParsedData", getParsedData);

  await page.exposeFunction("_getPrediction", getPrediction);

  await page.exposeFunction("_Scraping", Scraping);

  await page.exposeFunction("_setData", (data) => newScraping.setData(data));
  await page.exposeFunction("_update", (fn) => newScraping.update(fn));
  await page.exposeFunction("_save", (fn) => newScraping.save(fn));
  await page.exposeFunction("setNext", (next) => newScraping.setNext(next));
  await page.exposeFunction("getNext", () => newScraping.getNext());
  await page.exposeFunction("setDatedEntries", (entry) =>
    newScraping.setDatedEntries(entry)
  );

  await page.exposeFunction("setLive", (live) => newScraping.setLive(live));
  await page.exposeFunction("getLive", () => newScraping.getLive());
  await page.exposeFunction("getHistory", () => newScraping.getLiveHistory());
  await page.exposeFunction("setLiveDatedEntries", (entry) =>
    newScraping.setLiveDatedEntries(entry)
  );

  await page.goto("https://pancakeswap.finance/prediction");

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

          console.log("saveLive", currentlyLive, history);
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
          const datedEntries = {
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
          setDatedEntries(datedEntries);
        }

        // * Save Live Round Data *
        if (
          currentlyLive.liveOraclePrice !== liveOraclePrice &&
          liveRoundId !== currentlyMonitored.roundId
          // && currentlyLive.roundId !== undefined//
        ) {
          const datedEntries = {
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
          setLiveDatedEntries(datedEntries);
        }

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

//   setInterval(async function () {
//     const data = await page.evaluate(async () => {
//       const slides = document.querySelectorAll(".swiper-slide");
//       const parsed = await Promise.all(
//         Array.from(slides).map(async (item) => {
//           const [
//             status,
//             roundId,
//             ,
//             payoutUP,
//             ,
//             ,
//             ,
//             closePrice,
//             diff,
//             ,
//             ,
//             openPrice,
//             ,
//             ,
//             poolValue,
//             ,
//             payoutDOWN,
//           ] = item
//             .querySelector("div > div > div > div > div > div > div > div")
//             .innerText.replaceAll("\n", " ")
//             .split(" ");

//           const isExpired = await _isExpired(status);
//           if (!isExpired || payoutUP === "0x" || payoutDOWN === "0x") return {};

//           const { parsedDiff, parsedPool, parsedUP, parsedDOWN } =
//             await _getParsedData(diff, poolValue, payoutUP, payoutDOWN);
//           const winningPayout = await _winningPayout(
//             diff,
//             parsedUP,
//             parsedDOWN
//           );

//           return Promise.resolve({
//             isExpired,
//             parsedDiff,
//             parsedPool,
//             winningPayout,
//             roundId,
//             payoutUP,
//             closePrice,
//             diff,
//             openPrice,
//             poolValue,
//             payoutDOWN,
//           });
//         })
//       );
//       return parsed;
//     });

//     newScraping.setData(data);
//     newScraping.update(savePrediction);
//   }, 60 * 1000 * 3);
// };

async function savePrediction(loggedEntries, result) {
  const prediction = new Prediction();
  for (const predictionItem of result) {
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
    } = predictionItem;

    if (loggedEntries.indexOf(roundId) < 0) {
      const addedPrediction = await addPrediction(
        roundId,
        payoutUP,
        closePrice,
        diff,
        openPrice,
        poolValue,
        payoutDOWN
      );

      if (addedPrediction)
        prediction.added(winningPayout, parsedPool, parsedDiff);
    }
  }

  if (prediction.getNbSaved() > 0)
    averages = await incrementTotalAverage(prediction.getData());
}

function getPredictionData(entries) {
  if (entries.length <= 0) return null;

  const averages = new TotalAverages();
  entries.forEach((entry) => {
    const { parsedDiff, parsedPool, parsedUP, parsedDOWN } =
      parser.getParsedData(
        entry.diff,
        entry.poolValue,
        entry.payoutUP,
        entry.payoutDOWN
      );
    const winningPayout = parser.winningPayout(
      parsedDiff,
      parsedUP,
      parsedDOWN
    );

    averages.addPayout(winningPayout);
    averages.addPool(parsedPool);
    averages.addDiff(parsedDiff);
    averages.addRiskData(parsedDiff, winningPayout, parsedUP, parsedDOWN);
  });

  return averages.getData();
}

function formatAvg(number) {
  if (!number) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function getPercentage(number, total) {
  return (number * 100) / total;
}

async function refreshAverages() {
  const predictions = await getAllPredictions();
  const data = getPredictionData(predictions);
  await updateTotalAverage(data);
  // ? problem must come from here,

  setInterval(async () => {
    const predictions = await getAllPredictions();
    const data = getPredictionData(predictions);
    await updateTotalAverage(data);
  }, 1000 * 60 * 15); // ? 15 minutes
}

function getAverages(entries) {
  if (!entries) {
    return {
      avgPayout: "N/A",
      avgDiff: "N/A",
      avgPool: "N/A",
      avgRisky: "N/A",
      avgSafe: "N/A",
      safePercentWr: "N/A",
      riskyPercentWr: "N/A",
      nbRoundDOWN: "N/A",
      nbRoundUP: "N/A",
      nbEntries: "N/A",
    };
  }
  return {
    avgPayout: formatAvg(entries.totalPayout / entries.nbEntries),
    avgDiff: formatAvg(entries.totalDiff / entries.nbEntries),
    avgPool: formatAvg(entries.totalPool / entries.nbEntries),
    avgRisky: formatAvg(entries.riskyTotalPayout / entries.riskyWins),
    avgSafe: formatAvg(entries.safeTotalPayout / entries.safeWins),
    safePercentWr: formatAvg(
      getPercentage(entries.safeWins, entries.nbEntries)
    ),
    riskyPercentWr: formatAvg(
      getPercentage(entries.riskyWins, entries.nbEntries)
    ),
    nbRoundDOWN: entries.nbRoundDOWN,
    nbRoundUP: entries.nbRoundUP,
    nbEntries: entries.nbEntries,
  };
}

function getEsperance(pWin, pLose, win, lose) {
  return formatAvg(
    (pWin / 100) * (win * 10) - (pLose / 100) * (lose * 10) - 10
  );
}

module.exports = {
  scrapePage,
  savePrediction,
  formatAvg,
  refreshAverages,
  getPercentage,
  getPredictionData,
  getAverages,
  getEsperance,
};
