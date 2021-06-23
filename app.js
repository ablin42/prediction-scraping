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

/*
if (process.env.ENVIRONMENT === "prod")
  app.use(function (req, res, next) {
    console.log(req.headers.host);
    if (req.protocol == "http")
      return res.redirect("https://www." + req.headers.host + req.url);
    else return next();
  });

if (process.env.ENVIRONMENT === "prod")
  app.use(function (req, res, next) {
    console.log(req.headers.host);
    if (
      req.headers.host === "ablin42.herokuapp.com" ||
      req.headers.host === "ablin.dev"
    )
      return res
        .status(301)
        .redirect("https://www." + process.env.HOST + req.url);
    else return next();
  });*/

//-- Express Session --//
/*
app.use(
  session({
    /* store: new MongoStore({
      mongooseConnection: mongoose.connection,
      ttl: 365 * 24 * 60 * 60,
    }),
    name: "prediction",
    secret: process.env.SESSION_SECRET,
    resave: true,
    //proxy: true,
    saveUninitialized: false,
    cookie: {
      path: "/",
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      secure: false,
    }, //secure = true (or auto) requires https else it wont work
    //sameSite: "Lax",
  })
);*/

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
    req.flash("warning", err.message);
    return res.status(403).redirect(req.headers.referer);
  }
  return res.status(200).json({ error: true, message: err.message });
});

//Helmet;
/*
app.use(helmet());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy({ policy: "same-origin" }));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      reportUri: "/report-violation",
      defaultSrc: ["'self'", "ka-f.fontawesome.com"],
      styleSrc: [
        "'self'",
        "stackpath.bootstrapcdn.com",
        "kit-free.fontawesome.com",
        "fonts.googleapis.com",
        "'sha256-AQe0kMnttwVvXWV4LutnFsTIDltiV/z7MUyXkuK3q8s='",
        "'sha256-z/+epQIZWnuW/jjeypGIpZt1je7sws1OeK6n2RHmOMY='",
      ],
      fontSrc: [
        "'self'",
        "fonts.googleapis.com",
        "kit-free.fontawesome.com",
        "fonts.gstatic.com",
        "ka-f.fontawesome.com",
      ],
      scriptSrc: [
        "'self'",
        "kit.fontawesome.com",
        "stackpath.bootstrapcdn.com",
        "www.gstatic.com",
        "cdn.jsdelivr.net",
        "cdnjs.cloudflare.com",
        "stackpath.bootstrapcdn.com",
        "kit.fontawesome.com",
      ],
      frameSrc: [],
      imgSrc: ["'self'"],
    },
    reportOnly: false,
  })
);

app.use(csrf({ cookie: false }));*/

// Keep session
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Sanitize body and query params
app.use((req, res, next) => {
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);

  next();
});

app.use(expressSanitizer());

//app.use(cors());
app.use(flash());
/*
app.post("/report-violation", (req, res) => {
  if (req.body) console.log("CSP Violation: ", req.ip, req.body);
  else console.log("CSP Violation: No data received!", req.ip);

  res.status(204).end();
});*/

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
  }, 60 * 5000);

  //while (true) {}
  //await browser.close();
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
  ///////////////////
  if (totalSaved > 0) {
    const avgPayout = totalPayout / totalSaved;
    const avgDiff = totalDiff / totalSaved;
    const avgPool = totalPool / totalSaved;
    const [errUpdate, averages] = await utils.promise(
      Average.findByIdAndUpdate("60d3706f5df5b953ed053cb3", {
        $inc: {
          avgPayout: avgPayout,
          avgDiff: avgDiff,
          avgPool: avgPool,
          nbEntries: totalSaved,
        },
      })
    );
    if (errUpdate) console.log("AN ERROR OCCURED WHILE SAVING AVERAGES");
    else console.log(averages);
  }
}

scrapePage();
const scrapeApi = require("./api/scrape");
app.use("/api/scrape", scrapeApi);

/* MAIN ROUTE */
app.get("/", (req, res) => {
  try {
    let obj = {};

    return res.status(200).send("OK");
  } catch (err) {
    console.log("HOME ROUTE ERROR:", err, req.headers, req.ipAddress);

    return res.status(200).send("bide");
  }
});

let port = process.env.PORT;
//if (process.env.ENVIRONMENT === "prod") port = "/tmp/nginx.socket";
app.listen(port, () => console.log(`Listening on port ${port}...`));
