// @EXTERNALS
const express = require("express");
const fs = require("fs");
const router = express.Router();
require("dotenv").config();
// @QUERIES
const {
  getRoundsLastHours,
  getRoundsLastHoursWithHistory,
  getRoundByTimestamp,
  getRound,
  getLastRound,
  getAllRounds,
} = require("../queries/rounds");
const { getBNBOrders, getTickerPrice } = require("../queries/binance");
const { getRoundOracle } = require("../queries/oracle");
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

// * RETURN ESPERANCE FROM ROUNDS BETWEEN TIMESTAMPS *
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
      console.log(
        "ERROR FETCHING PERIOD (esperance):",
        err,
        req.headers,
        req.ipAddress
      );
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

    const obj = {
      ...averages,
      safeEsperance,
      riskyEsperance,
      entries,
      median,
      riskyPercentWr: averages.riskyPercentWr,
      safePercentWr: averages.safePercentWr,
    };
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

function getAmounts(round) {
  const filtered = round.history.filter((item) => {
    const [minutes, seconds] = item.timeLeft.split(":").map((item) => +item);
    const secondsLeft = parseInt((minutes * 60 + seconds).toFixed(0));
    return secondsLeft <= 35 && secondsLeft > 20 && item.status === "Next"; //!
  });
  const closingHistory = filtered[filtered.length - 1];
  const payoutUP = parseFloat(closingHistory.payoutUP); //.slice(0, -1)
  const payoutDOWN = parseFloat(closingHistory.payoutDOWN); //.slice(0, -1)
  const poolValue = parseFloat(closingHistory.poolValue);
  // console.log(round.roundId, closingHistory, payoutUP, payoutDOWN);

  return {
    bullAmount: poolValue / payoutUP,
    bearAmount: poolValue / payoutDOWN,
    oracle: closingHistory,
  };
}

// function getAmounts(round) {
//   const filtered = round.history.filter(
//     (item) => item.timeLeft === "Closing" && item.status === "Next"
//   );
//   console.log(filtered);
//   const closingHistory = filtered[filtered.length - 1];
//   const payoutUP = parseFloat(closingHistory.payoutUP.slice(0, -1));
//   const payoutDOWN = parseFloat(closingHistory.payoutDOWN.slice(0, -1));
//   const poolValue = parseFloat(closingHistory.poolValue);

//   return {
//     bullAmount: poolValue / payoutUP,
//     bearAmount: poolValue / payoutDOWN,
//   };
// }

// * RETURN SIMULATION DATA OF A ROUND FOR BESTBETSBOT *
// ? @PARAM: "roundId" => Round ID
router.get("/simulate/:roundId", async (req, res) => {
  try {
    const roundId = "#" + req.params.roundId;
    const round = await getRound(roundId);
    const resultRound = await getRound(`#${+req.params.roundId + 1}`);
    const endTimestamp = +round.date;
    const startTimestamp = new Date(endTimestamp) - 1000 * 60 * 60;
    const entries = await getRoundByTimestamp(startTimestamp, endTimestamp);
    const data = getRoundData(entries);
    const averages = getAverages(data);
    const { bullAmount, bearAmount, oracle } = getAmounts(resultRound);
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

    return res.status(200).json({
      bullAmount,
      bearAmount,
      resultRound,
      averages,
      oracle,
      safeEsperance,
      riskyEsperance,
      safePercentWr: averages.safePercentWr,
      riskyPercentWr: averages.riskyPercentWr,
    });
  } catch (err) {
    console.log(
      `ERROR FETCHING SIMULATION DATA FOR ROUND [#${req.params.roundId}]`,
      err.message
    );
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * GET LAST WINSTREAK *
// ? @PARAM: "roundId" => Round ID
router.get("/winstreak", async (req, res) => {
  try {
    const lastRound = await getLastRound();
    const lastRoundId = parseInt(lastRound.roundId.substr(1));
    const direction = lastRound.diff > 0 ? "UP" : "DOWN";
    let previousDirection = direction;
    let winstreak = 1;

    for (let i = 1; i < lastRoundId; i++) {
      let previousRound = await getRound("#" + (lastRoundId - i));
      previousDirection = previousRound.diff > 0 ? "UP" : "DOWN";
      if (previousDirection !== direction) break;
      winstreak++;
    }

    return res.status(200).json({ winstreak });
  } catch (err) {
    console.log(`ERROR FETCHING WINSTREAK DATA`, err.message);
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * GET AVERAGE WINSTREAK *
// ? @PARAM: "roundId" => Round ID
router.get("/winstreak/average", async (req, res) => {
  try {
    const lastRound = await getLastRound();
    const lastRoundId = parseInt(lastRound.roundId.substr(1));
    let direction = lastRound.diff > 0 ? "UP" : "DOWN";
    let previousDirection = direction;
    let winstreak = 1;
    const winstreakUP = [];
    const winstreakDOWN = [];

    for (let i = 1; i < lastRoundId; i++) {
      let previousRound = await getRound("#" + (lastRoundId - i));
      if (previousRound === null) break;
      previousDirection = previousRound.diff > 0 ? "UP" : "DOWN";
      if (previousDirection !== direction) {
        if (direction === "UP") winstreakUP.push(winstreak);
        else winstreakDOWN.push(winstreak);
        direction = previousDirection;
        winstreak = 0;
      }
      winstreak++;
    }

    const avgWinstreakUP = parseFloat(
      (
        winstreakUP.reduce((acc, val) => acc + val) / winstreakUP.length
      ).toFixed(2)
    );
    const avgWinstreakDOWN = parseFloat(
      (
        winstreakDOWN.reduce((acc, val) => acc + val) / winstreakDOWN.length
      ).toFixed(2)
    );
    const medUP = winstreakUP.sort((a, b) => (a > b ? 1 : -1))[
      Math.round(winstreakUP.length / 2)
    ];
    const medDOWN = winstreakDOWN.sort((a, b) => (a > b ? 1 : -1))[
      Math.round(winstreakDOWN.length / 2)
    ];

    return res.status(200).json({
      avgWinstreakUP,
      avgWinstreakDOWN,
      medUP,
      medDOWN,
      winstreakUP,
      winstreakDOWN,
    });
  } catch (err) {
    console.log(`ERROR FETCHING WINSTREAK DATA`, err.message);
    return res.status(200).json({ error: true, message: err.message });
  }
});

async function getAvgOrders(limit) {
  const { bids, asks } = await getBNBOrders(limit);
  const bidMap = bids.map((bid) => {
    return { price: bid[0], quantity: bid[1] };
  });
  const askMap = asks.map((ask) => {
    return { price: ask[0], quantity: ask[1] };
  });

  let bidPriceSum = (bidQtySum = askPriceSum = askQtySum = 0);
  for (let i = 0; i < bidMap.length; i++) {
    bidPriceSum += +bidMap[i].price * +bidMap[i].quantity;
    bidQtySum += +bidMap[i].quantity;
    askPriceSum += +askMap[i].price * +askMap[i].quantity;
    askQtySum += +askMap[i].quantity;
  }
  const avgBid = +(bidPriceSum / bidQtySum).toFixed(2);
  const avgAsk = +(askPriceSum / askQtySum).toFixed(2);

  return {
    avgBid,
    avgAsk,
    bidPriceSum: +bidPriceSum.toFixed(0),
    askPriceSum: +askPriceSum.toFixed(0),
    bidQtySum,
    askQtySum,
  };
}

async function cycleBook(depth) {
  let lastPrice = await getTickerPrice("BNB");
  let currentPrice = 0;
  let EQ = 0;
  setInterval(async () => {
    console.log(lastPrice, currentPrice, EQ);
    const correct =
      (EQ > 0 && lastPrice < currentPrice) ||
      (EQ < 0 && lastPrice > currentPrice);
    const obj = { lastPrice, currentPrice, EQ, correct };
    await fs.appendFile(
      `./ORDER_BOOK_60S.txt`,
      JSON.stringify(obj) + "\n",
      (err) => {
        if (err) console.log(err);
      }
    );
    lastPrice = currentPrice;
    const { avgBid, avgAsk, bidPriceSum, askPriceSum, bidQtySum, askQtySum } =
      await getAvgOrders(depth);
    EQ = (bidQtySum - askQtySum) / (bidQtySum + askQtySum);
    currentPrice = await getTickerPrice("BNB");
  }, 1000 * 60);
}

// * ORDER BOOK SHENANIGANS *
// ? @PARAM: "roundId" => Round ID
router.get("/orderbook/:depth", async (req, res) => {
  try {
    const depth = req.params.depth;
    const { avgBid, avgAsk, bidPriceSum, askPriceSum, bidQtySum, askQtySum } =
      await getAvgOrders(depth);

    const diff = +(avgAsk - avgBid).toFixed(2);
    const summDiff = +(askPriceSum - bidPriceSum).toFixed(2);
    const avgPrice = +((avgAsk + avgBid) / 2).toFixed(2);
    const EQ = (bidQtySum - askQtySum) / (bidQtySum + askQtySum);

    // cycleBook(depth);
    // return res.status(200).send("ok");
    return res.status(200).json({
      avgBid,
      avgAsk,
      bidQtySum,
      askQtySum,
      diff,
      summDiff,
      avgPrice,
      EQ,
    });
  } catch (err) {
    console.log(`ERROR FETCHING ORDER BOOK DATA`, err.message);
    return res.status(200).json({ error: true, message: err.message });
  }
});

// * ORDER BOOK SHENANIGANS *
// ? @PARAM: "roundId" => Round ID
router.get("/esperance", async (req, res) => {
  try {
    // const rounds = await getRound("#555");

    // console.log(rounds);
    let dataset = [];
    for (i = 1800; i <= 4835; i++) {
      const round = await getRound("#" + i);
      if (round) {
        console.log(round.roundId);
        const start = parseInt(round.date) - 60 * 60 * 1000;
        const end = parseInt(round.date);
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
          id: round.roundId,
          safeEsperance,
          riskyEsperance,
        });
      }
    }
    return res.status(200).json(dataset);
  } catch (err) {
    console.log(`ERROR FETCHING ESPERANCE DATA PER ROUND`, err.message);
    return res.status(200).json({ error: true, message: err.message });
  }
});

module.exports = router;
