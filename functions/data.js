// @QUERIES
const { getAllPredictions } = require("../queries/predictions");
const { updateTotalAverage } = require("../queries/averages");
// @FUNCTIONS
const { getParsedData } = require("./parser");
// @CLASSES
const { TotalAverages } = require("../classes/average");

// * Compute averages and risk data *
// ? @PARAM: entries => An array containing rounds
function getPredictionData(entries) {
  if (entries.length <= 0) return null;

  const averages = new TotalAverages();
  entries.forEach((entry) => {
    const { parsedDiff, parsedPool, parsedUP, parsedDOWN, winningPayout } =
      getParsedData(
        entry.diff,
        entry.poolValue,
        entry.payoutUP,
        entry.payoutDOWN
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

// * REFRESH AVERAGES BY COMPUTING EVERY ROUND, EVER *
async function refreshAverages() {
  const predictions = await getAllPredictions();
  const data = getPredictionData(predictions);
  await updateTotalAverage(data);

  setInterval(async () => {
    const predictions = await getAllPredictions();
    const data = getPredictionData(predictions);
    await updateTotalAverage(data);
  }, 1000 * 60 * 15); // ? 15 minutes
}

// * RETURNS FORMATTED AVERAGES *
// ? @PARAM: entries => An array containing rounds
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
  formatAvg,
  refreshAverages,
  getPercentage,
  getPredictionData,
  getAverages,
  getEsperance,
};
