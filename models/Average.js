// @EXTERNALS
const mongoose = require("mongoose");

const AverageSchema = new mongoose.Schema(
  {
    totalPayout: {
      type: Number,
      required: true,
    },
    totalPayoutDOWN: {
      type: Number,
      required: true,
    },
    totalPayoutUP: {
      type: Number,
      required: true,
    },
    nbRoundUP: {
      type: Number,
      required: true,
    },
    nbRoundDOWN: {
      type: Number,
      required: true,
    },
    totalDiff: {
      type: Number,
      required: true,
    },
    totalPool: {
      type: Number,
      required: true,
    },
    nbEntries: {
      type: Number,
      required: true,
    },
    riskyTotalPayout: {
      type: Number,
      required: true,
    },
    riskyWins: {
      type: Number,
      required: true,
    },
    safeWins: {
      type: Number,
      required: true,
    },
    safeTotalPayout: {
      type: Number,
      required: true,
    },
    date: { type: String, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("average", AverageSchema);
