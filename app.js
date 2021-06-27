const express = require("express");
const mongoose = require("mongoose");
const expressSanitizer = require("express-sanitizer");
const sanitize = require("mongo-sanitize");
const path = require("path");
require("dotenv").config();

const utils = require("./helpers/utils");
const {
  scrapePage,
  getAverages,
  getPredictionData,
  refreshAverages,
  getEsperance,
} = require("./helpers/data");

const { getPredictionByRange } = require("./helpers/query");

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

// Sanitize body and query params
app.use((req, res, next) => {
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);

  next();
});

app.use(expressSanitizer());

scrapePage(); //

const scrapeApi = require("./api/scrape");
app.use("/api/scrape", scrapeApi);

refreshAverages(); //

/* MAIN ROUTE */
app.get("/", async (req, res) => {
  //clean that too
  try {
    var [err, result] = await utils.promise(
      Average.findById("60d3836b82b6dfd7f7b04c53")
    );
    if (err) console.log("An error occured while fetching averages");

    const rangedEntries = await getPredictionByRange();
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
    };

    return res.status(200).render("index", obj);
  } catch (err) {
    console.log("HOME ROUTE ERROR:", err, req.headers, req.ipAddress);

    return res.status(200).send("bide");
  }
});

let port = process.env.PORT;
app.listen(port, () => console.log(`Listening on port ${port}...`));
