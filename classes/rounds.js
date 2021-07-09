// * HOLDS LIVE & NEXT ROUND DATA *
class Rounds {
  constructor() {
    this.next = {};
    this.nextDatedEntries = [];
    this.live = {};
    this.liveDatedEntries = [];
  }

  openRound() {
    this.liveDatedEntries = this.nextDatedEntries;
    this.live = this.next;
    this.nextDatedEntries = [];
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
