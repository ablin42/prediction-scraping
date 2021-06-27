const express = require("express");
const router = express.Router();
require("dotenv").config();

const utils = require("../helpers/utils");
const Prediction = require("../models/Prediction");

router.get("/", async (req, res) => {
  try {
    return res.status(200).json("OK");
  } catch (err) {
    console.log("ERROR:", err, req.headers, req.ipAddress);
    return res.status(200).json({ error: true, message: err.message });
  }
});

module.exports = router;
