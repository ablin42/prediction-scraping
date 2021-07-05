const Prediction = require("../models/Prediction");
const utils = require("./utils");

class Scraping {
  constructor() {
    this.lastLength = 0;
    this.loggedEntries = [];
    this.data = undefined;
    this.next = {};
    this.live = {};
    this.liveDatedEntries = [];
    this.datedEntries = [];
  }

  async update(fn) {
    const filtered = this.data.filter((item) => item.isExpired);

    if (filtered.length > this.lastLength || this.lastLength === 0) {
      await fn(this.loggedEntries, filtered);

      this.data.forEach((item) => {
        if (this.loggedEntries.indexOf(item.roundId) < 0 && item.isExpired)
          this.loggedEntries.push(item.roundId);
      });

      this.lastLength = this.loggedEntries.length;
    }
  }

  async save(fn) {
    console.log("issou !!!");
    await fn(data);
    // const prediction = new Prediction({
    //   roundId: data.roundId,
    //   payoutUP: data.payoutUP,
    //   closePrice: data.oraclePrice,
    //   diff: data.diff,
    //   openPrice: data.openPrice,
    //   poolValue: data.poolValue,
    //   payoutDOWN: data.payoutDOWN,
    //   history: this.liveDatedEntries,
    // });

    // const [err, saved] = await utils.promise(prediction.save());
    // if (err) console.log("ERROR SAVING PREDICTION", err.message);
    // else console.log(saved.roundId);

    // return saved;
  }

  setLive(live) {
    this.live = live;
  }

  getLive() {
    return this.live;
  }

  getLiveHistory() {
    return this.liveDatedEntries;
  }

  setLiveDatedEntries(entry) {
    this.liveDatedEntries.push(entry);
  }

  setNext(next) {
    if (this.next.roundId !== next.roundId && this.next.roundId !== undefined) {
      this.liveDatedEntries = this.datedEntries;
      this.live = this.next;

      this.datedEntries = [];
    }
    this.next = next;
  }

  getNext() {
    return this.next;
  }

  setDatedEntries(entry) {
    this.datedEntries.push(entry);
  }

  setData(data) {
    this.data = data;
  }
}

module.exports = { Scraping };
