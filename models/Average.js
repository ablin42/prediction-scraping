const mongoose = require("mongoose");

const AverageSchema = new mongoose.Schema(
  {
    avgPayout: {
      type: Number,
      required: true,
    },
    avgDiff: {
      type: Number,
      required: true,
    },
    avgPool: {
      type: Number,
      required: true,
    },
    nbEntries: {
      type: Number,
      required: true,
    },
    date: { type: String, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("average", AverageSchema);
