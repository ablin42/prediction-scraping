// @EXTERNALS
const puppeteer = require("puppeteer");
const { ethers } = require("ethers");
// @FUNCTIONS
const mailer = require("./contact");
const { getObjectFromDOM, getNextFromDom } = require("./parser");
const {
  getEvaluateParams,
  saveOracle,
  saveRoundLive,
  formatForClass,
  saveExpiredRounds,
} = require("./puppeteer_functions");
const { getLastOracle } = require("../queries/oracle");

// @CLASSES
const { Rounds } = require("../classes/rounds");
// @MISC
const { BNBPP_ABI } = require("../helpers/bnbpp-abi.js");
const BNBPP_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";
const provider = new ethers.providers.JsonRpcProvider(
  "https://bsc-dataseed.binance.org/"
);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const bnbppContract = new ethers.Contract(BNBPP_ADDRESS, BNBPP_ABI, signer);

bnbppContract.on("Unpause", async () => {
  if (await mailer(process.env.EMAIL, "Market is [ UP ]", ""))
    console.log("An error occured while sending the mail");
});

bnbppContract.on("Pause", async () => {
  if (await mailer(process.env.EMAIL, "Market is [ DOWN ]", ""))
    console.log("An error occured while sending the mail");
});

async function handleState(EMITTER) {
  const PAUSED = await bnbppContract.paused();
  if (PAUSED) return;

  const oracle = await getLastOracle();
  const timeElapsed = (new Date() - +oracle.date) / 60 / 60;

  if (timeElapsed > 300) {
    EMITTER.emit("kill");
    scrapePage(EMITTER);
  }
}

// * RUNS PUPPETEER, COLLECT & SAVE DATA *
const scrapePage = async (EMITTER) => {
  try {
    let running = true;
    const newRounds = new Rounds();

    // * INITIALIZE PUPPETEER & ROUNDS CLASS *
    const options = {
      // headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };

    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();

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

    await page.goto("https://pancakeswap.finance/prediction");
    await page.waitForSelector(".swiper-slide-active", { timeout: 0 });

    // * WAIT FOR PANCAKESWAP ROUNDS TO BE LOADED INTO DOM *
    // * COLLECTS DATA EVERY 10 SECONDS *
    const reloadLoop = setInterval(async function () {
      await page.reload({ timeout: 1000 * 60 * 60 * 1 });
      await page.waitForSelector(".swiper-slide-active", { timeout: 0 });
    }, 1000 * 60 * 60 * 1);

    const loop = setInterval(async function () {
      const PAUSED = await bnbppContract.paused();
      if (PAUSED) return;
      const { BNBPrice, BTCPrice, secondsSinceCandleOpen } =
        await getEvaluateParams();

      await page.evaluate(
        async (BNBPrice, BTCPrice, secondsSinceCandleOpen) => {
          // * Get Timer *
          const timeLeft = document.querySelector(
            "#__next > div:nth-child(3) > div > div > div > div > div > div > div > div > div > div:nth-child(3) > div > div > div > div > div"
          )?.innerHTML;
          // * Get Oracle Price *
          const oraclePrice = parseFloat(
            document
              .querySelector(
                "#__next > div:nth-child(3) > div > div > div > div > div > div > div > div > div > div:nth-child(1) > div > div > div:nth-child(2)"
              )
              ?.innerHTML.substring(1)
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
                  .querySelector(
                    "div > div > div > div > div > div > div > div"
                  )
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
    }, 5000);

    EMITTER.on("kill", () => {
      if (!running) return;
      browser.close();
      clearInterval(loop);
      clearInterval(reloadLoop);
      running = false;
      console.log("Killed browser");
    });
  } catch (err) {
    console.log("ERROR:", err.message);
    return;
  }
};

module.exports = {
  scrapePage,
  handleState,
};
