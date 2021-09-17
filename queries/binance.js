// @EXTERNALS
const axios = require("axios").default;
// @MISC
const { BINANCE_API } = require("../constants");

// * GET A COIN PRICE *
// ? @PARAM: ticker => A string referencing the coin pair
async function getTickerPrice(ticker) {
  try {
    const response = await axios.get(
      `${BINANCE_API}/ticker/price?symbol=${ticker}USDT`
    );
    if (response.status === 200) return parseFloat(response.data.price);
    return false;
  } catch (err) {
    console.log(`ERROR FETCHING ${ticker} PRICE`, err);
  }
}
/*
    * getTickerPrice response
    {"symbol":"BNBUSDT","price":"298.59000000"}
*/

// * GET A COIN'S LAST CANDLE *
// ? @PARAM: ticker => A string referencing the coin pair
async function getCandle(ticker) {
  try {
    const response = await axios.get(
      `${BINANCE_API}/klines?symbol=${ticker}USDT&interval=5m&limit=1`
    );
    if (response.status === 200) return response.data[0];
    return false;
  } catch (err) {
    console.log(`ERROR FETCHING ${ticker} CANDLE`, err);
  }
}

/*
    * getCandle response
    [
        [
            1499040000000,      // Open time
            "0.01634790",       // Open
            "0.80000000",       // High
            "0.01575800",       // Low
            "0.01577100",       // Close
            "148976.11427815",  // Volume
            1499644799999,      // Close time
            "2434.19055334",    // Quote asset volume
            308,                // Number of trades
            "1756.87402397",    // Taker buy base asset volume
            "28.46694368",      // Taker buy quote asset volume
            "17928899.62484339" // Ignore.
        ]
    ]
*/

// * FETCH A COIN'S ORDER BOOK *
async function getBNBOrders(limit) {
  try {
    const response = await axios.get(
      `${BINANCE_API}/depth?symbol=BNBUSDT&limit=${limit}`
    );
    if (response.status === 200) return response.data;
    return false;
  } catch (err) {
    console.log(`ERROR FETCHING ${ticker} PRICE`, err);
  }
}

module.exports = {
  getTickerPrice,
  getCandle,
  getBNBOrders,
};
