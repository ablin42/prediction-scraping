// @EXTERNALS
const express = require("express");
const router = express.Router();
require("dotenv").config();
// @QUERIES
const {
  getLastOracle,
  getAllOracle,
  getRoundOracle,
  getOracleByLimit,
} = require("../queries/oracle");
const { getCandle } = require("../queries/binance");
// @FUNCTIONS
const { getOracleData } = require("../functions/data");

// * RETURN ALL ORACLE DATA *
router.get("/all", async (req, res) => {
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
    console.log(
      "ERROR FETCHING ALL ORACLE DATA:",
      err,
      req.headers,
      req.ipAddress
    );
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN CURRENT ROUND ORACLE DATA *
router.get("/current", async (req, res) => {
  try {
    const lastOracle = await getLastOracle();
    const roundOracle = await getRoundOracle(lastOracle.roundId);
    const sorted = roundOracle.sort((a, b) => (a.date > b.date && -1) || 1);

    return res.status(200).json(sorted);
  } catch (err) {
    console.log(
      "ERROR FETCHING CURRENT ORACLE DATA:",
      err,
      req.headers,
      req.ipAddress
    );
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN LAST ${limit} ORACLE DATA *
// ? @PARAM: "limit" => A string determining the amount of oracle entries to be fetched
router.get("/limit/:limit", async (req, res) => {
  try {
    const limit = parseInt(req.params.limit);
    const oracles = await getOracleByLimit(limit);
    const oraclesData = getOracleData(oracles);

    const obj = { oraclesData };
    return res.status(200).json(obj);
  } catch (err) {
    console.log(
      "ERROR FETCHING ORACLE WITH LIMIT:",
      err,
      req.headers,
      req.ipAddress
    );
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN LAST ORACLE DATA & CURRENT BNB CANDLE TIMING *
// ? @PARAM: "period" => A string identifying a key-value pair
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
    console.log("ERROR FETCHING TIMING DATA:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

router.get("/one/:roundId", async (req, res) => {
  try {
    const roundId = "#" + parseInt(req.params.roundId);
    const oracles = await getRoundOracle(roundId);

    return res.status(200).json(oracles);
  } catch (err) {
    console.log("ERROR FETCHING TIMING DATA:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

router.get("/avg", async (req, res) => {
  try {
    const arr = [];
    for (let i = 185; i < 279; i++) {
      const roundId = "#" + i;
      const oracles = await getRoundOracle(roundId);
      arr.push(oracles.length);
    }
    const avg = arr.reduce((acc, val) => acc + val) / arr.length;

    return res.status(200).json({ avg, arr });
  } catch (err) {
    console.log("ERROR FETCHING TIMING DATA:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

module.exports = router;
