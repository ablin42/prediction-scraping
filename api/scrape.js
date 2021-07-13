// @EXTERNALS
const express = require("express");
const router = express.Router();
require("dotenv").config();
// @QUERIES
const { getPredictionByRange } = require("../queries/predictions");
const { getCandle } = require("../queries/binance");
const { periodToHours } = require("../functions/parser");
// @FUNCTIONS
const {
  getAverages,
  getPredictionData,
  getEsperance,
} = require("../functions/data");

router.get("/timing", async (req, res) => {
  try {
    const BNBCandle = await getCandle("BNB");
    const timestamp = +new Date();
    const secondsSinceCandleOpen = (timestamp - BNBCandle[0]) / 1000;

    const obj = { candleTiming: secondsSinceCandleOpen, BNBCandle };
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
