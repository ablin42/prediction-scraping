const express = require("express");
const router = express.Router();
const puppeteer = require("puppeteer");

require("dotenv").config();

const utils = require("./helpers/utils");
const Prediction = require("../models/Prediction");

const scrapePage = async () => {
  const loggedEntries = [];
  let lastLength = 0;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto("https://pancakeswap.finance/prediction");
  await page.waitForSelector(".swiper-slide-active");
  page.waitForTimeout(1000);

  while (true) {
    const data = await page.evaluate(() => {
      const slides = document.querySelectorAll(".swiper-slide");
      const parsed = Array.from(slides).map((item) => {
        const array = item
          .querySelector("div > div > div > div > div > div > div > div")
          .innerText.replaceAll("\n", " ")
          .split(" ");
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
        ] = array;

        console.log(array);
        return {
          isExpired: status === "Expired" ? true : false,
          roundId,
          payoutUP,
          closePrice,
          diff,
          openPrice,
          poolValue,
          payoutDOWN,
        };
      });
      return parsed;
    });

    currentLength = data.length;
    if (
      data.filter((item) => item.isExpired).length > lastLength ||
      lastLength === 0
    ) {
      await savePrediction(loggedEntries, data);
      data.forEach((item) => {
        if (loggedEntries.indexOf(item.roundId) < 0 && item.isExpired)
          loggedEntries.push(item.roundId);
      });

      lastLength = loggedEntries.length;
    }
  }
  //await browser.close();
};

async function savePrediction(loggedEntries, result) {
  for (const predictionItem of result) {
    const {
      isExpired,
      roundId,
      payoutUP,
      closePrice,
      diff,
      openPrice,
      poolValue,
      payoutDOWN,
    } = predictionItem;

    if (isExpired && loggedEntries.indexOf(roundId) < 0) {
      const prediction = new Prediction({
        roundId,
        payoutUP,
        closePrice,
        diff,
        openPrice,
        poolValue,
        payoutDOWN,
      });
      const [err, saved] = await utils.promise(prediction.save());
      if (saved) console.log("saved!", saved);
      else console.log("SAVE ERROR:", err.message);
    }
  }
}

router.get("/", async (req, res) => {
  try {
    const result = await scrapePage();

    return res.status(200).json("OK");
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

module.exports = router;
