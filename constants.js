const BINANCE_API = "https://api.binance.com/api/v3";
const AVERAGE_ID = "60d3836b82b6dfd7f7b04c53"; // ! needs to be spoofed or find a more secure approach

const RANGE_OPTIONS = {
  "1H": 1,
  "2H": 2,
  "3H": 3,
  "4H": 4,
  "8H": 8,
  "12H": 12,
  "1D": 24,
  "3D": 72,
  "1W": 168,
  "1M": 720,
  "3M": 2160,
  "6M": 4320,
};

module.exports = { RANGE_OPTIONS, BINANCE_API, AVERAGE_ID };
