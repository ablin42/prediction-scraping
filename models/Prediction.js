const mongoose = require("mongoose");

const PredictionSchema = new mongoose.Schema(
  {
    roundId: {
      type: String,
      required: true,
      unique: true,
    },
    poolValue: {
      type: String,
      required: true,
    },
    openPrice: {
      type: String,
      required: true,
    },
    closePrice: {
      type: String,
      required: true,
    },
    diff: {
      type: String,
      required: true,
    },
    payoutUP: {
      type: String,
      required: true,
    },
    payoutDOWN: {
      type: String,
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

module.exports = mongoose.model("prediction", PredictionSchema);
