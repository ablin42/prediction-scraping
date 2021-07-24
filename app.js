// @EXTERNALS
const express = require("express");
const mongoose = require("mongoose");
const expressSanitizer = require("express-sanitizer");
const sanitize = require("mongo-sanitize");
const path = require("path");
require("dotenv").config();
// @QUERIES
const { getPredictionByRange } = require("./queries/predictions");
const { getLastOracle } = require("./queries/oracle");
// @FUNCTIONS
const { scrapePage } = require("./functions/puppeteer");
const {
  getAverages,
  getPredictionData,
  refreshAverages,
  getEsperance,
} = require("./functions/data");
// @MODELS
const Average = require("./models/Average");
const Oracle = require("./models/Oracle");
// @MISC
const utils = require("./helpers/utils");
const { AVERAGE_ID } = require("./constants");

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

// * EXPRESS *
const app = express();

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);

// * BODY PARSER *
app.use(express.urlencoded({ extended: true, limit: 25000000 }));
app.use(
  express.json({
    limit: 25000000,
  })
);
// * BODY PARSER ERROR HANDLER *
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
    //req.flash("warning", err.message);
    return res.status(403).redirect(req.headers.referer);
  }
  return res.status(200).json({ error: true, message: err.message });
});

// * SANITIZE BODY AND QUERY PARAMS *
app.use((req, res, next) => {
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);

  next();
});

app.use(function (req, res, next) {
  // * ALLOWED ORIGINS *
  const allowedOrigins = [
    "https://pcsdata.herokuapp.com",
    "http://localhost:3000",
    "https://cucksistants.herokuapp.com",
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin))
    res.setHeader("Access-Control-Allow-Origin", origin);

  // * ALLOWED METHODS *
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // * ALLOWED HEADERS *
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.use(expressSanitizer());

// * API ROUTES *
const scrapeApi = require("./api/scrape");
app.use("/api/scrape", scrapeApi);

scrapePage();
// refreshAverages();
// * MAIN ROUTE *
app.get("/oracle", async (req, res) => {
  try {
    const lastOracle = await getLastOracle();
    const [err, roundOracle] = await utils.promise(
      Oracle.find({ roundId: lastOracle.roundId })
    );
    if (err)
      console.log("An error occured while fetching this round's oracle data");

    const obj = {
      lastOracle,
      roundOracle: roundOracle.sort((a, b) => (a.date > b.date && -1) || 1),
    };

    return res.status(200).render("oracle", obj);
  } catch (err) {
    console.log("HOME ROUTE ERROR:", err, req.headers, req.ipAddress);

    return res.status(200).send("bide");
  }
});

app.get("/", async (req, res) => {
  try {
    var [err, result] = await utils.promise(Average.findById(AVERAGE_ID));
    if (err) console.log("An error occured while fetching averages");

    const rangedEntries = await getPredictionByRange(2);
    const rangedData = getPredictionData(rangedEntries);
    const rangedAverages = getAverages(rangedData);
    const averages = getAverages(result);

    const obj = {
      averages,
      rangedAverages,
      overallSafeEsperance: getEsperance(
        averages.safePercentWr,
        averages.riskyPercentWr,
        averages.avgSafe,
        -1
      ),
      rangedSafeEsperance: getEsperance(
        rangedAverages.safePercentWr,
        rangedAverages.riskyPercentWr,
        rangedAverages.avgSafe,
        -1
      ),
      rangedRiskyEsperance: getEsperance(
        rangedAverages.riskyPercentWr,
        rangedAverages.safePercentWr,
        rangedAverages.avgRisky,
        -1
      ),
    };
    // console.log(
    //   getEsperance(
    //     rangedAverages.riskyPercentWr,
    //     rangedAverages.safePercentWr,
    //     rangedAverages.avgRisky,
    //     rangedAverages.avgSafe
    //   ),
    //   getEsperance(
    //     rangedAverages.safePercentWr,
    //     rangedAverages.riskyPercentWr,
    //     rangedAverages.avgSafe,
    //     rangedAverages.avgRisky
    //   ),
    //   rangedAverages
    // );

    return res.status(200).render("index", obj);
  } catch (err) {
    console.log("HOME ROUTE ERROR:", err, req.headers, req.ipAddress);

    return res.status(200).send("bide");
  }
});

let port = process.env.PORT;
app.listen(port, () => console.log(`Listening on port ${port}...`));
