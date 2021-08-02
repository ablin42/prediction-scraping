// @EXTERNALS
const mongoose = require("mongoose");

const RoundSchema = new mongoose.Schema(
  {
    roundId: {
      type: String,
      required: true,
      unique: true,
    },
    poolValue: {
      type: Number,
      required: true,
    },
    openPrice: {
      type: Number,
      required: true,
    },
    closePrice: {
      type: Number,
      required: true,
    },
    diff: {
      type: Number,
      required: true,
    },
    payoutUP: {
      type: Number,
      required: true,
    },
    payoutDOWN: {
      type: Number,
      required: true,
    },
    history: {
      type: Array,
      required: false,
    },
    date: { type: String, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("round", RoundSchema);
