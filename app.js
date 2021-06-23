const express = require("express");
const mongoose = require("mongoose");
//const cors = require("cors");
//const helmet = require("helmet");
const session = require("express-session");
const flash = require("express-flash");
//const MongoStore = require("connect-mongo")(session);
//const csrf = require("csurf");
const expressSanitizer = require("express-sanitizer");
const sanitize = require("mongo-sanitize");
const path = require("path");
require("dotenv").config();

const puppeteer = require("puppeteer");
const utils = require("./api/helpers/utils");
const Prediction = require("./models/Prediction");
const Average = require("./models/Average");

mongoose.connect(
  process.env.DB_CONNECTION,
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) throw err;
    console.log("Connected to database");
  }
);

// Express
const app = express();

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);

// Body-Parser
app.use(express.urlencoded({ extended: true, limit: 25000000 }));
app.use(
  express.json({
    limit: 25000000,
  })
);
// BP Error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
    //req.flash("warning", err.message);
    return res.status(403).redirect(req.headers.referer);
  }
  return res.status(200).json({ error: true, message: err.message });
});

/* Keep session
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});
*/

// Sanitize body and query params
app.use((req, res, next) => {
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);

  next();
});

app.use(expressSanitizer());
//app.use(flash());

const scrapePage = async () => {
  const loggedEntries = [];
  let lastLength = 0;
  const options = {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.goto("https://pancakeswap.finance/prediction");
  await page.waitForSelector(".swiper-slide-active", { timeout: 0 });
  page.waitForTimeout(1000);

  const timerId = setInterval(async function () {
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
        const isExpired = status === "Expired" ? true : false;
        if (!isExpired) return {};

        const parsedDiff = parseFloat(diff.substr(1).replace(",", "."));
        const parsedPool = parseFloat(poolValue.replace(",", "."));
        const winningPayout =
          parsedDiff > 0
            ? parseFloat(payoutUP.slice(0, -1).replace(",", "."))
            : parseFloat(payoutDOWN.slice(0, -1).replace(",", "."));

        return {
          isExpired,
          parsedDiff,
          parsedPool,
          winningPayout,
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
  }, 60 * 3000);
};

async function savePrediction(loggedEntries, result) {
  let totalPayout = 0;
  let totalDiff = 0;
  let totalPool = 0;
  let totalSaved = 0;

  for (const predictionItem of result) {
    const {
      isExpired,
      parsedDiff,
      parsedPool,
      winningPayout,
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
      if (saved) {
        console.log(saved);
        totalPayout += winningPayout;
        totalDiff += parsedDiff;
        totalPool += parsedPool;
        totalSaved++;
      } else console.log("SAVE ERROR:", err.message);
    }
  }

  if (totalSaved > 0) {
    const [errUpdate, averages] = await utils.promise(
      Average.findByIdAndUpdate("60d3706f5df5b953ed053cb3", {
        $inc: {
          totalPayout: totalPayout,
          totalDiff: totalDiff,
          totalPool: totalPool,
          nbEntries: totalSaved,
        },
      })
    );
    if (errUpdate) console.log("AN ERROR OCCURED WHILE SAVING AVERAGES");
  }
}

scrapePage();
const scrapeApi = require("./api/scrape");
app.use("/api/scrape", scrapeApi);

function formatAvg(number) {
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

async function iterateEntries() {
  const [err, result] = await utils.promise(Prediction.find());
  if (!err) {
    let totalPayout = 0;
    let totalDiff = 0;
    let totalPool = 0;
    let totalPayoutUP = 0;
    let nbRoundUP = 0;
    let totalPayoutDOWN = 0;
    let nbRoundDOWN = 0;
    let riskyWins = 0;
    let riskyTotalPayout = 0;
    let safeWins = 0;
    let safeTotalPayout = 0;

    result.forEach((entry) => {
      const parsedDiff = parseFloat(entry.diff.substr(1).replace(",", "."));
      const parsedPool = parseFloat(entry.poolValue.replace(",", "."));
      const payoutUP = parseFloat(
        entry.payoutUP.slice(0, -1).replace(",", ".")
      );
      const payoutDOWN = parseFloat(
        entry.payoutDOWN.slice(0, -1).replace(",", ".")
      );
      const winningPayout = parsedDiff > 0 ? payoutUP : payoutDOWN;

      totalPayout += winningPayout;
      totalPool += parsedPool;
      totalDiff += parsedDiff;

      if (parsedDiff > 0) {
        totalPayoutUP += winningPayout;
        nbRoundUP++;
        if (payoutUP > payoutDOWN) {
          riskyWins++;
          riskyTotalPayout += winningPayout;
        } else {
          safeWins++;
          safeTotalPayout += winningPayout;
        }
      } else {
        totalPayoutDOWN += winningPayout;
        nbRoundDOWN++;
        if (payoutUP < payoutDOWN) {
          riskyWins++;
          riskyTotalPayout += winningPayout;
        } else {
          safeWins++;
          safeTotalPayout += winningPayout;
        }
      }
    });

    const [errUpdate, averages] = await utils.promise(
      Average.findByIdAndUpdate("60d3836b82b6dfd7f7b04c53", {
        $inc: {
          totalPayoutUP,
          nbRoundUP,
          totalPayoutDOWN,
          nbRoundDOWN,
          riskyTotalPayout,
          riskyWins,
          safeWins,
          safeTotalPayout,
        },
      })
    );
    if (errUpdate) console.log("AN ERROR OCCURED WHILE SAVING AVERAGES");
  }
}

/* MAIN ROUTE */
app.get("/", async (req, res) => {
  try {
    var [err, result] = await utils.promise(
      Average.findById("60d3836b82b6dfd7f7b04c53")
    );
    //await iterateEntries();

    const averages = {
      avgPayout: formatAvg(result.totalPayout / result.nbEntries),
      avgDiff: formatAvg(result.totalDiff / result.nbEntries),
      avgPool: formatAvg(result.totalPool / result.nbEntries),
      avgRisky: formatAvg(result.riskyTotalPayout / result.riskyWins),
      avgSafe: formatAvg(result.safeTotalPayout / result.safeWins),
      nbRoundDOWN: result.nbRoundDOWN,
      nbRoundUP: result.nbRoundUP,
      nbEntries: result.nbEntries,
    };

    if (err) console.log("An error occured while fetching averages");
    let obj = { averages };

    return res.status(200).render("index", obj);
  } catch (err) {
    console.log("HOME ROUTE ERROR:", err, req.headers, req.ipAddress);

    return res.status(200).send("bide");
  }
});

let port = process.env.PORT;
//if (process.env.ENVIRONMENT === "prod") port = "/tmp/nginx.socket";
app.listen(port, () => console.log(`Listening on port ${port}...`));
