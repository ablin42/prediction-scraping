// * HOLDS LIVE & NEXT ROUND DATA *
class Rounds {
  constructor() {
    this.next = {};
    this.nextDatedEntries = [];
    this.live = {};
    this.liveDatedEntries = [];
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
    // * IF NEXT ROUND WENT LIVE *
    // * CREATE A NEW NEXT ROUND AND SET LIVE ROUND WITH OLD NEXT VALUES *
    if (this.next.roundId !== next.roundId && this.next.roundId !== undefined) {
      this.liveDatedEntries = this.nextDatedEntries;
      this.live = this.next;

      this.nextDatedEntries = [];
    }
    this.next = next;
  }

  getNext() {
    return this.next;
  }

  setNextDatedEntries(entry) {
    this.nextDatedEntries.push(entry);
  }
}

module.exports = { Rounds };
