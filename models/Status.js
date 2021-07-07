// @EXTERNALS
const mongoose = require("mongoose");

const StatusSchema = new mongoose.Schema(
  {
    isUp: { type: Boolean, required: true },
    date: { type: String, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("status", StatusSchema);
