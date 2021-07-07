// @EXTERNALS
const express = require("express");
const router = express.Router();
require("dotenv").config();
// @QUERIES
const { getPredictionByRange } = require("../queries/predictions");
const { periodToHours } = require("../functions/parser");
// @FUNCTIONS
const {
  getAverages,
  getPredictionData,
  getEsperance,
} = require("../functions/data");

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

    const obj = { ...averages, safeEsperance };
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
