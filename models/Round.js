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
      type: mongoose.Schema.Types.Mixed,
      required: true,
      content: mongoose.Schema.Types.Mixed,
    },
    openPrice: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      content: mongoose.Schema.Types.Mixed,
    },
    closePrice: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      content: mongoose.Schema.Types.Mixed,
    },
    diff: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      content: mongoose.Schema.Types.Mixed,
    },
    payoutUP: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      content: mongoose.Schema.Types.Mixed,
    },
    payoutDOWN: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      content: mongoose.Schema.Types.Mixed,
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
