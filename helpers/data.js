const puppeteer = require("puppeteer");
const parser = require("./parser");
const { isExpired, getParsedData, winningPayout } = require("./parser");
const {
  addPrediction,
  updateTotalAverage,
  getAllPredictions,
} = require("./query");
const { TotalAverages, Prediction, Scraping } = require("./average");

const scrapePage = async () => {
  const options = {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  const newScraping = new Scraping();

  await page.exposeFunction("_isExpired", isExpired);
  await page.exposeFunction("_winningPayout", winningPayout);
  await page.exposeFunction("_getParsedData", getParsedData);

  await page.goto("https://pancakeswap.finance/prediction");
  await page.waitForSelector(".swiper-slide-active", { timeout: 0 });

  setInterval(async function () {
    const data = await page.evaluate(async () => {
      const slides = await document.querySelectorAll(".swiper-slide");
      const parsed = await Promise.all(
        Array.from(slides).map(async (item) => {
          const [
            status,
            roundId,
            ,
            payoutUP,
            ,
            ,
            ,
            closePrice,
            diff,
            ,
            ,
            openPrice,
            ,
            ,
            poolValue,
            ,
            payoutDOWN,
          ] = item
            .querySelector("div > div > div > div > div > div > div > div")
            .innerText.replaceAll("\n", " ")
            .split(" ");

          const isExpired = await _isExpired(status);
          if (!isExpired) return {};

          const { parsedDiff, parsedPool, parsedUP, parsedDOWN } =
            await _getParsedData(diff, poolValue, payoutUP, payoutDOWN);
          const winningPayout = await _winningPayout(
            diff,
            parsedUP,
            parsedDOWN
          );

          return Promise.resolve({
            isExpired,
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
          });
        })
      );
      return parsed;
    });

    newScraping.setData(data);
    newScraping.update(savePrediction);
  }, 60 * 3000);
};

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
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function getPercentage(number, total) {
  return (number * 100) / total;
}

async function refreshAverages() {
  const predictions = await getAllPredictions();
  const data = getPredictionData(predictions);
  await updateTotalAverage(data);

  setInterval(async () => {
    const predictions = await getAllPredictions();
    const data = getPredictionData(predictions);
    await updateTotalAverage(data);
  }, 1000 * 60 * 15); // 15mn (was 1000 * 1000 * 15) before
}

function getAverages(entries) {
  return {
    avgPayout: formatAvg(entries.totalPayout / entries.nbEntries) | 0,
    avgDiff: formatAvg(entries.totalDiff / entries.nbEntries) | 0,
    avgPool: formatAvg(entries.totalPool / entries.nbEntries) | 0,
    avgRisky: formatAvg(entries.riskyTotalPayout / entries.riskyWins) | 0,
    avgSafe: formatAvg(entries.safeTotalPayout / entries.safeWins) | 0,
    safePercentWr:
      formatAvg(getPercentage(entries.safeWins, entries.nbEntries)) | 0,
    riskyPercentWr:
      formatAvg(getPercentage(entries.riskyWins, entries.nbEntries)) | 0,
    nbRoundDOWN: entries.nbRoundDOWN | 0,
    nbRoundUP: entries.nbRoundUP | 0,
    nbEntries: entries.nbEntries | 0,
  };
}

module.exports = {
  scrapePage,
  savePrediction,
  formatAvg,
  refreshAverages,
  getPercentage,
  getPredictionData,
  getAverages,
};
