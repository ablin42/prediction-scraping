// @EXTERNALS
const puppeteer = require("puppeteer");
// @FUNCTIONS
const { getObjectFromDOM, getNextFromDom } = require("./parser");
const {
  getEvaluateParams,
  saveOracle,
  saveRoundLive,
  formatForClass,
  saveExpiredRounds,
  checkStatus,
} = require("./puppeteer_functions");
// @CLASSES
const { Rounds } = require("../classes/rounds");

// * FUNCTION CALLED ONCE AT BOOT *
// * RUNS PUPPETEER, COLLECT & SAVE DATA *
const scrapePage = async () => {
  // * INITIALIZE PUPPETEER & ROUNDS CLASS *
  const options = {
    // headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  const newRounds = new Rounds();
  const INTERVAL = 1000 * 60 * 10;
  let STATUS = "UP";

  // * EXPOSE FUNCTIONS FOR PUPPETEER *
  // * PARSER *
  await page.exposeFunction("_getObjectFromDOM", (document) =>
    getObjectFromDOM(document)
  );
  await page.exposeFunction("_getNextFromDom", (document) =>
    getNextFromDom(document)
  );
  // * FUNCTIONS *
  await page.exposeFunction("_saveExpiredRounds", (DOM) =>
    saveExpiredRounds(DOM)
  );
  await page.exposeFunction("_formatForClass", (DOM, infos) =>
    formatForClass(DOM, infos)
  );
  await page.exposeFunction("_saveRoundLive", (DOM, HISTORY) =>
    saveRoundLive(DOM, HISTORY)
  );
  await page.exposeFunction("_saveOracle", (DOM, infos) =>
    saveOracle(DOM, infos)
  );
  // * ROUNDS CLASS METHODS *
  await page.exposeFunction("_openRound", () => newRounds.openRound());
  await page.exposeFunction("setNext", (next) => newRounds.setNext(next));
  await page.exposeFunction("getNext", () => newRounds.getNext());
  await page.exposeFunction("setNextDatedEntries", (entry) =>
    newRounds.setNextDatedEntries(entry)
  );
  await page.exposeFunction("setLive", (live) => newRounds.setLive(live));
  await page.exposeFunction("getLive", () => newRounds.getLive());
  await page.exposeFunction("getHistory", () => newRounds.getLiveHistory());
  await page.exposeFunction("setLiveDatedEntries", (entry) =>
    newRounds.setLiveDatedEntries(entry)
  );

  // await page.exposeFunction("screenshot", async (obj) => {
  //   await page.screenshot(obj);
  // });
  await page.goto("https://pancakeswap.finance/prediction");

  // * MONITOR LAST ROUND ADDED TO DETECT IF PANCAKESWAP BETS SERVICES ARE DOWN *
  setInterval(async function () {
    STATUS = checkStatus();
  }, INTERVAL);

  // * WAIT FOR PANCAKESWAP ROUNDS TO BE LOADED INTO DOM *
  // * COLLECTS DATA EVERY 10 SECONDS *
  setInterval(async function () {
    //await page.waitForSelector(".swiper-slide-active", { timeout: 0 });
    await page.reload({ timeout: 1000 * 60 * 60 * 1 });
    await page.waitForSelector(".swiper-slide-active", { timeout: 0 });
  }, 1000 * 60 * 60 * 1);

  setInterval(async function () {
    // if (STATUS === "DOWN") return;
    const { BNBPrice, BTCPrice, secondsSinceCandleOpen } =
      await getEvaluateParams();

    await page.evaluate(
      async (BNBPrice, BTCPrice, secondsSinceCandleOpen) => {
        const MARKET_PAUSED = document.querySelector(
          "#root > div:nth-child(2) > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(1) > div > div > div > div:nth-child(2) > div > h2"
        );
        if (!!MARKET_PAUSED && MARKET_PAUSED.innerText === "Markets Paused")
          return;
        // * Get Timer *
        const timeLeft = document.querySelector(
          "#root > div:nth-child(2) > div > div:nth-child(2) > div > div > div:nth-child(1) > div:nth-child(1) > div > div > div:nth-child(1)  > div:nth-child(3) > div > div:nth-child(1)  > div > div:nth-child(1) > div:nth-child(1)"
        ).innerHTML;

        const oraclePrice = parseFloat(
          document
            .querySelector(
              "#root > div:nth-child(2) > div > div:nth-child(2) > div > div > div:nth-child(1)  > div:nth-child(1)  > div > div > div:nth-child(1)  > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(2) "
            )
            .innerHTML.substr(1)
        );

        // * Get Live Round Data *
        let LIVE_DOM = await _getObjectFromDOM(
          document
            .querySelector(".swiper-slide-active")
            .innerText.replaceAll("\n", " ")
            .split(" ")
        );
        if (LIVE_DOM.status !== "Calculating") {
          LIVE_DOM.oraclePrice = oraclePrice;

          // * Get Next Round Data *
          const NEXT_DOM = await _getNextFromDom(
            document
              .querySelector(".swiper-slide-next")
              .innerText.replaceAll("\n", " ")
              .split(" ")
          );

          const NEXT = await getNext();
          const LIVE = await getLive();
          // * Add oracle entry if oracle price changed *
          if (
            LIVE.oraclePrice !== oraclePrice &&
            oraclePrice !== undefined &&
            oraclePrice !== 0 &&
            !Number.isNaN(oraclePrice) &&
            timeLeft !== "Closing"
          )
            await _saveOracle(LIVE_DOM, {
              BNBPrice,
              BTCPrice,
              timeLeft,
              secondsSinceCandleOpen,
            });

          // * Save LIVE round that just closed to DATABASE *
          if (
            LIVE_DOM.roundId !== LIVE.roundId &&
            LIVE?.roundId !== undefined
          ) {
            // * Get Prev Round Data (= round that was monitored until now) *
            const PREV_DOM = await _getObjectFromDOM(
              document
                .querySelector(".swiper-slide-prev")
                .innerText.replaceAll("\n", " ")
                .split(" ")
            );
            const HISTORY = await getHistory();
            // await screenshot({
            //   path: `./screenshots/${PREV_DOM.roundId}.png`,
            // });
            await _saveRoundLive(PREV_DOM, HISTORY);
          }

          // * Save Next Round data to Class*
          if (
            NEXT.roundId !== NEXT_DOM.roundId ||
            NEXT.poolValue !== NEXT_DOM.poolValue
          ) {
            if (NEXT.roundId !== NEXT_DOM.roundId) await _openRound();

            const { datedEntry, head } = await _formatForClass(NEXT_DOM, {
              timeLeft,
              secondsSinceCandleOpen,
              BNBPrice,
              BTCPrice,
              oraclePrice,
            });

            setNext(head);
            setNextDatedEntries(datedEntry);
          }

          // * Save Live Round Data To Class *
          if (
            LIVE.oraclePrice !== oraclePrice ||
            LIVE_DOM.roundId !== NEXT_DOM.roundId
          ) {
            const { datedEntry, head } = await _formatForClass(LIVE_DOM, {
              timeLeft,
              secondsSinceCandleOpen,
              BNBPrice,
              BTCPrice,
            });

            setLive(head);
            if (LIVE.oraclePrice !== oraclePrice)
              setLiveDatedEntries(datedEntry);
          }

          // * Get All Rounds *
          const slides = document.querySelectorAll(".swiper-slide");
          for (item of Array.from(slides)) {
            const EXP_DOM = await _getObjectFromDOM(
              item
                .querySelector("div > div > div > div > div > div > div > div")
                .innerText.replaceAll("\n", " ")
                .split(" ")
            );
            // * Save all expired rounds not already in DB *
            await _saveExpiredRounds(EXP_DOM);
          }
        }
      },
      BNBPrice,
      BTCPrice,
      secondsSinceCandleOpen
    );
  }, 10000);
};

module.exports = {
  scrapePage,
};
