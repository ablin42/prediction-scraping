// @EXTERNALS
const express = require("express");
const router = express.Router();
require("dotenv").config();
// @QUERIES
const {
  getPredictionByRange,
  getPredictionByRangeWithHistory,
} = require("../queries/predictions");
const {
  getLastOracle,
  getAllOracle,
  getRoundOracle,
  getOracleByRange,
  getOracleByLimit,
} = require("../queries/oracle");
const { getCandle } = require("../queries/binance");
const { periodToHours } = require("../functions/parser");
// @FUNCTIONS
const {
  getMedian,
  getAverages,
  getPredictionData,
  getEsperance,
  getOracleData,
  formatAvg,
} = require("../functions/data");
// @MODELS
const Prediction = require("../models/Prediction");
const utils = require("../helpers/utils");

router.get("/current-oracle", async (req, res) => {
  try {
    const lastOracle = await getLastOracle();
    const roundOracle = await getRoundOracle(lastOracle.roundId);
    const sorted = roundOracle.sort((a, b) => (a.date > b.date && -1) || 1);

    return res.status(200).json(sorted);
  } catch (err) {
    console.log("CURRENT ORACLE API ERROR:", err, req.headers, req.ipAddress);

    return res.status(200).send("bide");
  }
});

router.get("/mediane", async (req, res) => {
  try {
    const payouts = [];
    const pools = [];
    const rounds = await getPredictionByRange(24);
    rounds.forEach((round) => {
      const parsedDiff = parseFloat(round.diff.substr(1));
      parsedDiff > 0
        ? payouts.push(parseFloat(round.payoutUP.slice(0, -1)))
        : payouts.push(parseFloat(round.payoutDOWN.slice(0, -1)));
      pools.push(parseFloat(round.poolValue));
    });

    const sorted = payouts.sort((a, b) => (a > b ? 1 : -1));
    const sortedPools = pools.sort((a, b) => (a > b ? 1 : -1));
    const mediane = sorted[(sorted.length / 2).toFixed(0)];
    const poolMediane = sortedPools[(sortedPools.length / 2).toFixed(0)];

    return res.status(200).json({ sorted, mediane, poolMediane });
  } catch (err) {
    console.log("HOME ROUTE ERROR:", err, req.headers, req.ipAddress);

    return res.status(200).send("bide");
  }
});

router.get("/oracle", async (req, res) => {
  try {
    const oracles = await getAllOracle();
    const diffList = [];
    for (let i = 0; i < oracles.length - 1; i++) {
      const diff = oracles[i + 1].date - oracles[i].date;
      diffList.push(parseInt((diff / 1000).toFixed(0)));
    }

    const average =
      diffList
        .filter((item) => item > 20 && item < 300)
        .reduce((a, b) => a + b) / diffList.length;

    const sorted = diffList
      .filter((item) => item > 20 && item < 300)
      .sort((a, b) => (a > b ? 1 : -1));

    const mediane = sorted[(sorted.length / 2).toFixed(0)];

    const arr = [];
    const odds = [];
    sorted.forEach((item) => {
      if (!arr.includes(item)) {
        arr.push(item);

        const nb = sorted.filter((value) => value === item).length;
        const percentage = ((nb / sorted.length) * 100).toFixed(3);
        odds.push({
          value: item,
          nb: nb,
          percentage: parseFloat(percentage),
        });
      }
    });

    const sortedOdds = odds.sort((a, b) =>
      a.percentage < b.percentage ? 1 : -1
    );

    const obj = {
      average: Math.round(average * 100) / 100,
      mediane,
      odds,
      sortedOdds,
      sorted,
    };
    return res.status(200).json(obj);
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN ROUNDS FROM X HOURS AGO *
// ? @PARAM: "period" => A string identifying a key-value pair
router.get("/oracle/:limit", async (req, res) => {
  try {
    const limit = parseInt(req.params.limit);
    const oracles = await getOracleByLimit(limit);
    const oraclesData = getOracleData(oracles);

    const obj = { oraclesData };
    return res.status(200).json(obj);
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

router.get("/timing", async (req, res) => {
  try {
    const BNBCandle = await getCandle("BNB");
    const oracle = await getLastOracle();

    const obj = {
      candleTiming: BNBCandle[0],
      oracle,
    };
    return res.status(200).json(obj);
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN ROUNDS FROM X HOURS AGO *
// ? @PARAM: "period" => A string identifying a key-value pair
router.get("/:period", async (req, res) => {
  try {
    const periodInhours = periodToHours(req.params.period);
    // const oracles = await getOracleByRange(periodInhours);
    // const oraclesData = getOracleData(
    //   oracles.sort((a, b) => (a.date < b.date ? -1 : -1))
    // );
    const entries = await getPredictionByRange(periodInhours);
    const median = getMedian(entries);
    const data = getPredictionData(entries);
    const averages = getAverages(data);
    const safeEsperance = getEsperance(
      averages.safePercentWr,
      averages.riskyPercentWr,
      averages.avgSafe,
      -1
    );

    const obj = { ...averages, safeEsperance, entries, median };
    return res.status(200).json(obj);
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN ROUNDS FROM X HOURS AGO WITH HISTORY *
// ? @PARAM: "period" => A string identifying a key-value pair
router.get("/:period/history", async (req, res) => {
  try {
    const periodInhours = periodToHours(req.params.period);
    const entries = await getPredictionByRangeWithHistory(periodInhours);

    const obj = { entries };
    return res.status(200).json(obj);
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    return res
      .status(200)
      .json({ error: true, message: "Please specify a range (ex: 1D)" });
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

module.exports = router;
