// @EXTERNALS
const mongoose = require("mongoose");

const OracleSchema = new mongoose.Schema(
  {
    roundId: {
      type: String,
      required: true,
    },
    oraclePrice: {
      type: Number,
      required: true,
    },
    openPrice: {
      type: Number,
      required: true,
    },
    BNBPrice: {
      type: Number,
      required: true,
    },
    BTCPrice: {
      type: Number,
      required: true,
    },
    secondsSinceCandleOpen: {
      type: Number,
      required: true,
    },
    timeLeft: {
      type: String,
      required: true,
    },
    date: { type: String, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("oracle", OracleSchema);
