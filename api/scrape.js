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
} = require("../queries/oracle");
const { getCandle } = require("../queries/binance");
const { periodToHours } = require("../functions/parser");
// @FUNCTIONS
const {
  getAverages,
  getPredictionData,
  getEsperance,
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
      diffList.filter((item) => item > 20).reduce((a, b) => a + b) /
      diffList.length;

    const obj = {
      diffList: diffList.filter((item) => item > 20),
      average: Math.round(average * 100) / 100,
    };
    return res.status(200).json(obj);
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

router.get("/timing", async (req, res) => {
  try {
    const BNBCandle = await getCandle("BNB");
    // const timestamp = +new Date();
    // const secondsSinceCandleOpen = (timestamp - BNBCandle[0]) / 1000;
    const oracle = await getLastOracle();

    // const secondsSinceOraclePriceChange = (timestamp - oracle.date) / 1000;
    // const oracles = await getAllOracle();
    // const diffList = [];
    // for (let i = 0; i < oracles.length - 1; i++) {
    //   const diff = oracles[i + 1].date - oracles[i].date;
    //   diffList.push(parseInt((diff / 1000).toFixed(0)));
    // }
    // const average =
    //   diffList.filter((item) => item > 20).reduce((a, b) => a + b) /
    //   diffList.length;

    const obj = {
      candleTiming: BNBCandle[0],
      // BNBCandle,
      oracle,
      // secondsSinceOraclePriceChange,
      // averageOracleRefresh: Math.round(average * 100) / 100,
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
    const entries = await getPredictionByRange(periodInhours);
    const data = getPredictionData(entries);
    const averages = getAverages(data);
    const safeEsperance = getEsperance(
      averages.safePercentWr,
      averages.riskyPercentWr,
      averages.avgSafe,
      -1
    );

    const obj = { ...averages, safeEsperance, entries };
    return res.status(200).json(obj);
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN ROUNDS FROM X HOURS AGO *
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
