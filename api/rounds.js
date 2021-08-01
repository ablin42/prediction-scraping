// @EXTERNALS
const express = require("express");
const router = express.Router();
require("dotenv").config();
// @QUERIES
const {
  getRoundsLastHours,
  getRoundsLastHoursWithHistory,
  getRoundByTimestamp,
  getRound,
} = require("../queries/rounds");
const { periodToHours } = require("../functions/parser");
// @FUNCTIONS
const {
  getMedian,
  getAverages,
  getRoundData,
  getEsperance,
  groupByHour,
  groupEsperanceByHour,
} = require("../functions/data");

// * RETURN MEDIAN DATA FOR ROUNDS *
router.get("/mediane", async (req, res) => {
  try {
    const payouts = [];
    const pools = [];
    const rounds = await getRoundsLastHours(24);
    rounds.forEach((round) => {
      round.diff > 0
        ? payouts.push(round.payoutUP)
        : payouts.push(round.payoutDOWN);
      pools.push(round.poolValue);
    });

    const sorted = payouts.sort((a, b) => (a > b ? 1 : -1));
    const sortedPools = pools.sort((a, b) => (a > b ? 1 : -1));
    const mediane = sorted[(sorted.length / 2).toFixed(0)];
    const poolMediane = sortedPools[(sortedPools.length / 2).toFixed(0)];

    return res.status(200).json({ sorted, mediane, poolMediane });
  } catch (err) {
    console.log("ERROR FETCHING MEDIAN DATA:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN ROUNDS FROM X HOURS AGO *
// ? @PARAM: "period" => A string identifying a key-value pair
router.get(
  "/period/hourly/:startTimestamp/:endTimestamp/:grouped",
  async (req, res) => {
    try {
      const startTimestamp = parseInt(req.params.startTimestamp);
      const endTimestamp = parseInt(req.params.endTimestamp);
      const grouped = req.params.grouped;
      const nbHours = Math.round(
        (endTimestamp - startTimestamp) / 1000 / 60 / 60
      );
      let dataset = [];
      for (let i = 0; i <= nbHours; i++) {
        const start = startTimestamp + i * 60 * 60 * 1000;
        const end = startTimestamp + (i + 1) * 60 * 60 * 1000;
        const entries = await getRoundByTimestamp(start, end);
        const data = getRoundData(entries);
        const averages = getAverages(data);

        dataset.push({
          hour: new Date(start).getHours(), //getUTCHours
          avgSafe: averages.avgSafe,
          avgRisky: averages.avgRisky,
          safePercentWr: averages.safePercentWr,
          riskyPercentWr: averages.riskyPercentWr,
        });
      }
      if (grouped === "true") dataset = groupByHour(dataset);

      return res.status(200).json(dataset);
    } catch (err) {
      console.log("ERROR FETCHING PERIOD:", err, req.headers, req.ipAddress);
      return res.status(200).json({ error: true, message: err.message });
    }
  }
);

// * RETURN ROUNDS FROM X HOURS AGO *
// ? @PARAM: "period" => A string identifying a key-value pair
router.get(
  "/esperance/hourly/:startTimestamp/:endTimestamp/:grouped",
  async (req, res) => {
    try {
      const startTimestamp = parseInt(req.params.startTimestamp);
      const endTimestamp = parseInt(req.params.endTimestamp);
      const grouped = req.params.grouped;
      const nbHours = Math.round(
        (endTimestamp - startTimestamp) / 1000 / 60 / 60
      );
      let dataset = [];
      for (let i = 0; i <= nbHours; i++) {
        const start = startTimestamp + i * 60 * 60 * 1000;
        const end = startTimestamp + (i + 1) * 60 * 60 * 1000;
        const entries = await getRoundByTimestamp(start, end);
        const data = getRoundData(entries);
        const averages = getAverages(data);
        const safeEsperance = getEsperance(
          averages.safePercentWr,
          averages.riskyPercentWr,
          averages.avgSafe,
          10
        );
        const riskyEsperance = getEsperance(
          averages.riskyPercentWr,
          averages.safePercentWr,
          averages.avgRisky,
          10
        );

        dataset.push({
          hour: new Date(start).getHours(), //getUTCHours
          safeEsperance,
          riskyEsperance,
        });
      }
      if (grouped === "true") dataset = groupEsperanceByHour(dataset);

      return res.status(200).json(dataset);
    } catch (err) {
      console.log("ERROR FETCHING PERIOD:", err, req.headers, req.ipAddress);
      return res.status(200).json({ error: true, message: err.message });
    }
  }
);

// * RETURN ROUNDS FROM X HOURS AGO *
// ? @PARAM: "period" => A string identifying a key-value pair
router.get("/period/:period", async (req, res) => {
  try {
    const periodInhours = periodToHours(req.params.period);
    const entries = await getRoundsLastHours(periodInhours);
    const median = getMedian(entries);
    const data = getRoundData(entries);
    const averages = getAverages(data);
    const safeEsperance = getEsperance(
      averages.safePercentWr,
      averages.riskyPercentWr,
      averages.avgSafe,
      10
    );
    const riskyEsperance = getEsperance(
      averages.riskyPercentWr,
      averages.safePercentWr,
      averages.avgRisky,
      10
    );

    const obj = { ...averages, safeEsperance, riskyEsperance, entries, median };
    return res.status(200).json(obj);
  } catch (err) {
    console.log("ERROR FETCHING PERIOD:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN ROUNDS FROM X HOURS AGO WITH HISTORY *
// ? @PARAM: "period" => A string identifying a key-value pair
router.get("/period/:period/history", async (req, res) => {
  try {
    const periodInhours = periodToHours(req.params.period);
    const entries = await getRoundsLastHoursWithHistory(periodInhours);

    const obj = { entries };
    return res.status(200).json(obj);
  } catch (err) {
    console.log(
      "ERROR FETCHING PERIOD WITH HISTORY:",
      err,
      req.headers,
      req.ipAddress
    );
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN ROUNDS BETWEEN ${startTimestamp} && ${endTimestamp} *
// ? @PARAM: "startTimestamp" => Start timestamp
// ? @PARAM: "endTimestamp" => End timestamp
router.get("/timestamp/:startTimestamp/:endTimestamp", async (req, res) => {
  try {
    const startTimestamp = req.params.startTimestamp;
    const endTimestamp = req.params.endTimestamp;
    const entries = await getRoundByTimestamp(startTimestamp, endTimestamp);

    return res.status(200).json(entries);
  } catch (err) {
    console.log(
      "ERROR FETCHING ROUNDS BETWEEN TIMESTAMPS:",
      err,
      req.headers,
      req.ipAddress
    );
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * RETURN A SINGLE ROUND *
// ? @PARAM: "roundId" => Round ID
router.get("/one/:roundId", async (req, res) => {
  try {
    const roundId = "#" + req.params.roundId;
    const round = await getRound(roundId);

    return res.status(200).json(round);
  } catch (err) {
    console.log(
      "ERROR FETCHING ROUNDS BETWEEN TIMESTAMPS:",
      err,
      req.headers,
      req.ipAddress
    );
    return res.status(200).json({ error: true, message: err.message });
  }
});

module.exports = router;
