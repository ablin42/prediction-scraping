// const puppeteer = require("puppeteer");
// const parser = require("./parser");
// const { isExpired, getParsedData, winningPayout } = require("./parser");
// const {
//   addPrediction,
//   updateTotalAverage,
//   getAllPredictions,
//   getTickerPrice,
//   getCandle,
//   setStatus,
//   getStatus,
// } = require("./query");
// const { TotalAverages, Prediction, Scraping } = require("./average");
// const mailer = require("./contact");

// const scrapePage = async () => {
//   const options = {
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   };
//   const browser = await puppeteer.launch(options);
//   const page = await browser.newPage();
//   const newScraping = new Scraping();

//   await page.exposeFunction("_isExpired", isExpired);
//   await page.exposeFunction("_winningPayout", winningPayout);
//   await page.exposeFunction("_getParsedData", getParsedData);

//   await page.exposeFunction("_Scraping", Scraping);

//   await page.exposeFunction("setNext", (next) => newScraping.setNext(next));
//   await page.exposeFunction("getNext", () => newScraping.getNext());
//   await page.exposeFunction("setDatedEntries", (entry) =>
//     newScraping.setDatedEntries(entry)
//   );

//   await page.exposeFunction("setLive", (live) => newScraping.setLive(live));
//   await page.exposeFunction("getLive", () => newScraping.getLive());
//   await page.exposeFunction("setLiveDatedEntries", (entry) =>
//     newScraping.setLiveDatedEntries(entry)
//   );

//   await page.goto("https://pancakeswap.finance/prediction");

//   setInterval(async function () {
//     try {
//       await page.waitForSelector(".swiper-slide-next", {
//         timeout: 1000 * 60 * 3,
//       });

//       const status = await getStatus();
//       if (!status.isUp) {
//         await setStatus(true);
//         if (await mailer(process.env.EMAIL, "Market is [ UP ]", ""))
//           throw new Error("An error occured while sending the mail");
//       }
//     } catch (e) {
//       if (e instanceof puppeteer.errors.TimeoutError) {
//         const status = await getStatus();
//         if (status.isUp) {
//           await setStatus(false);
//           if (await mailer(process.env.EMAIL, "Market is [ DOWN ]", ""))
//             throw new Error("An error occured while sending the mail");
//         }
//       }
//     }
//   }, 1000 * 60 * 5);

//   await page.waitForSelector(".swiper-slide-active", { timeout: 0 });

//   setInterval(async function () {
//     const BNBPrice = formatAvg(await getTickerPrice("BNB"));
//     const BTCPrice = formatAvg(await getTickerPrice("BTC"));
//     const BNBCandle = await getCandle("BNB");
//     const timestamp = +new Date();
//     const secondsSinceCandleOpen = (timestamp - BNBCandle[0]) / 1000;
//     const data = await page.evaluate(
//       async (BNBPrice, BTCPrice, secondsSinceCandleOpen) => {
//         const [
//           status,
//           roundId,
//           ,
//           payoutUP,
//           ,
//           ,
//           ,
//           poolValue,
//           ,
//           ,
//           ,
//           ,
//           payoutDOWN,
//         ] = document
//           .querySelector(".swiper-slide-next")
//           .innerText.replaceAll("\n", " ")
//           .split(" ");

//         const timeLeft = document.querySelector(
//           "#root > div:nth-child(2) > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(1) > div > div > div:nth-child(1)  > div:nth-child(3) > div > div:nth-child(1)  > div > div:nth-child(1) > div:nth-child(1)"
//         ).innerHTML;
//         //? first nth-child(2) is 2 because of popup, else set to 1

//         const [
//           liveStatus,
//           liveRoundId,
//           ,
//           livePayoutUP,
//           ,
//           ,
//           ,
//           liveOraclePrice,
//           liveDiff,
//           ,
//           ,
//           liveOpenPrice,
//           ,
//           ,
//           livePoolValue,
//           ,
//           livePayoutDOWN,
//         ] = document
//           .querySelector(".swiper-slide-active")
//           .innerText.replaceAll("\n", " ")
//           .split(" ");

//         const currentlyMonitored = await getNext();
//         const currentlyLive = await getLive();

//         if (
//           currentlyMonitored.roundId !== roundId ||
//           currentlyMonitored.poolValue !== poolValue
//         ) {
//           const datedEntries = {
//             status,
//             timeLeft,
//             secondsSinceCandleOpen,
//             BNBPrice,
//             BTCPrice,
//             oraclePrice: liveOraclePrice,
//             payoutUP,
//             payoutDOWN,
//             poolValue,
//           };
//           setNext({ status, roundId, poolValue });
//           setDatedEntries(datedEntries);
//         }

//         if (
//           currentlyLive.liveOraclePrice !== liveOraclePrice &&
//           liveRoundId !== currentlyMonitored.roundId &&
//           currentlyLive.roundId !== undefined
//         ) {
//           const datedEntries = {
//             status: liveStatus,
//             timeLeft,
//             secondsSinceCandleOpen,
//             BNBPrice,
//             BTCPrice,
//             oraclePrice: liveOraclePrice,
//             diff: liveDiff,
//             payoutUP: livePayoutUP,
//             payoutDOWN: livePayoutDOWN,
//             poolValue: livePoolValue,
//           };
//           setLive({
//             status: liveStatus,
//             roundId: liveRoundId,
//             oraclePrice: liveOraclePrice,
//             openPrice: liveOpenPrice,
//           });
//           setLiveDatedEntries(datedEntries);
//         }
//         /*
//                 TODO return values
//                   return Promise.resolve({

//                   }); */
//       },
//       BNBPrice,
//       BTCPrice,
//       secondsSinceCandleOpen
//     );

//     // TODO insert returned value into db when live round is closing
//     const currentLive = newScraping.getLive();
//     if (currentLive)
//     // actually use data in class
//     // send in db once 'live' is closed ?
//     // ?  newScraping.setData(data);
//     // ?  newScraping.update(savePrediction);
//   }, 10000);

//   setInterval(async function () {
//     const data = await page.evaluate(async () => {
//       const slides = document.querySelectorAll(".swiper-slide");
//       const parsed = await Promise.all(
//         Array.from(slides).map(async (item) => {
//           const [
//             status,
//             roundId,
//             ,
//             payoutUP,
//             ,
//             ,
//             ,
//             closePrice,
//             diff,
//             ,
//             ,
//             openPrice,
//             ,
//             ,
//             poolValue,
//             ,
//             payoutDOWN,
//           ] = item
//             .querySelector("div > div > div > div > div > div > div > div")
//             .innerText.replaceAll("\n", " ")
//             .split(" ");

//           const isExpired = await _isExpired(status);
//           if (!isExpired || payoutUP === "0x" || payoutDOWN === "0x") return {};

//           const { parsedDiff, parsedPool, parsedUP, parsedDOWN } =
//             await _getParsedData(diff, poolValue, payoutUP, payoutDOWN);
//           const winningPayout = await _winningPayout(
//             diff,
//             parsedUP,
//             parsedDOWN
//           );

//           return Promise.resolve({
//             isExpired,
//             parsedDiff,
//             parsedPool,
//             winningPayout,
//             roundId,
//             payoutUP,
//             closePrice,
//             diff,
//             openPrice,
//             poolValue,
//             payoutDOWN,
//           });
//         })
//       );
//       return parsed;
//     });

//     newScraping.setData(data);
//     newScraping.update(savePrediction);
//   }, 60 * 1000 * 3);
// };

// async function savePrediction(loggedEntries, result) {
//   const prediction = new Prediction();
//   for (const predictionItem of result) {
//     const {
//       parsedDiff,
//       parsedPool,
//       winningPayout,
//       roundId,
//       payoutUP,
//       closePrice,
//       diff,
//       openPrice,
//       poolValue,
//       payoutDOWN,
//     } = predictionItem;

//     if (loggedEntries.indexOf(roundId) < 0) {
//       const addedPrediction = await addPrediction(
//         roundId,
//         payoutUP,
//         closePrice,
//         diff,
//         openPrice,
//         poolValue,
//         payoutDOWN
//       );

//       if (addedPrediction)
//         prediction.added(winningPayout, parsedPool, parsedDiff);
//     }
//   }

//   if (prediction.getNbSaved() > 0)
//     averages = await incrementTotalAverage(prediction.getData());
// }

// function getPredictionData(entries) {
//   if (entries.length <= 0) return null;

//   const averages = new TotalAverages();
//   entries.forEach((entry) => {
//     const { parsedDiff, parsedPool, parsedUP, parsedDOWN } =
//       parser.getParsedData(
//         entry.diff,
//         entry.poolValue,
//         entry.payoutUP,
//         entry.payoutDOWN
//       );
//     const winningPayout = parser.winningPayout(
//       parsedDiff,
//       parsedUP,
//       parsedDOWN
//     );

//     averages.addPayout(winningPayout);
//     averages.addPool(parsedPool);
//     averages.addDiff(parsedDiff);
//     averages.addRiskData(parsedDiff, winningPayout, parsedUP, parsedDOWN);
//   });

//   return averages.getData();
// }

// function formatAvg(number) {
//   if (!number) return 0;
//   return Math.round((number + Number.EPSILON) * 100) / 100;
// }

// function getPercentage(number, total) {
//   return (number * 100) / total;
// }

// async function refreshAverages() {
//   const predictions = await getAllPredictions();
//   const data = getPredictionData(predictions);
//   await updateTotalAverage(data);
//   // ? problem must come from here,

//   setInterval(async () => {
//     const predictions = await getAllPredictions();
//     const data = getPredictionData(predictions);
//     await updateTotalAverage(data);
//   }, 1000 * 60 * 15); // ? 15 minutes
// }
// /**
//  * @param  {} entries
//  */
// function getAverages(entries) {
//   if (!entries) {
//     return {
//       avgPayout: "N/A",
//       avgDiff: "N/A",
//       avgPool: "N/A",
//       avgRisky: "N/A",
//       avgSafe: "N/A",
//       safePercentWr: "N/A",
//       riskyPercentWr: "N/A",
//       nbRoundDOWN: "N/A",
//       nbRoundUP: "N/A",
//       nbEntries: "N/A",
//     };
//   }
//   return {
//     avgPayout: formatAvg(entries.totalPayout / entries.nbEntries),
//     avgDiff: formatAvg(entries.totalDiff / entries.nbEntries),
//     avgPool: formatAvg(entries.totalPool / entries.nbEntries),
//     avgRisky: formatAvg(entries.riskyTotalPayout / entries.riskyWins),
//     avgSafe: formatAvg(entries.safeTotalPayout / entries.safeWins),
//     safePercentWr: formatAvg(
//       getPercentage(entries.safeWins, entries.nbEntries)
//     ),
//     riskyPercentWr: formatAvg(
//       getPercentage(entries.riskyWins, entries.nbEntries)
//     ),
//     nbRoundDOWN: entries.nbRoundDOWN,
//     nbRoundUP: entries.nbRoundUP,
//     nbEntries: entries.nbEntries,
//   };
// }

// /**
//  * @param  {} pWin
//  * @param  {} pLose
//  * @param  {} win
//  * @param  {} lose
//  *
//  * {@link getAverages}
//  */
// function getEsperance(pWin, pLose, win, lose) {
//   return formatAvg(
//     (pWin / 100) * (win * 10) - (pLose / 100) * (lose * 10) - 10
//   );
// }

// module.exports = {
//   scrapePage,
//   savePrediction,
//   formatAvg,
//   refreshAverages,
//   getPercentage,
//   getPredictionData,
//   getAverages,
//   getEsperance,
// };
