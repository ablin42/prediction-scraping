// * CLASS TO HANDLE AVERAGE CALCULATION *
class TotalAverages {
  constructor() {
    this.totalPayout = 0;
    this.totalDiffUP = 0;
    this.totalDiffDOWN = 0;
    this.totalDiff = 0;
    this.totalPool = 0;
    this.totalPayoutUP = 0;
    this.nbRoundUP = 0;
    this.totalPayoutDOWN = 0;
    this.nbRoundDOWN = 0;
    this.riskyWins = 0;
    this.riskyTotalPayout = 0;
    this.safeWins = 0;
    this.safeTotalPayout = 0;
  }

  getData() {
    return {
      nbEntries: this.nbRoundUP + this.nbRoundDOWN,
      totalPayout: this.totalPayout,
      totalDiff: this.totalDiff,
      totalDiffUP: this.totalDiffUP,
      totalDiffDOWN: this.totalDiffDOWN,
      totalPool: this.totalPool,
      totalPayoutUP: this.totalPayoutUP,
      nbRoundUP: this.nbRoundUP,
      totalPayoutDOWN: this.totalPayoutDOWN,
      nbRoundDOWN: this.nbRoundDOWN,
      riskyWins: this.riskyWins,
      riskyTotalPayout: this.riskyTotalPayout,
      safeWins: this.safeWins,
      safeTotalPayout: this.safeTotalPayout,
    };
  }

  addPayout(payout) {
    this.totalPayout += payout;
  }

  addPool(pool) {
    this.totalPool += pool;
  }

  addDiff(diff) {
    if (diff > 0) this.totalDiffUP += diff;
    else this.totalDiffDOWN += diff;
    this.totalDiff += diff;
  }

  // * GET RISK/SAFE WINS % AND AVG
  addRiskData(diff, payout, parsedUP, parsedDOWN) {
    if (diff > 0) {
      this.totalPayoutUP += payout;
      this.nbRoundUP++;
      if (parsedUP > parsedDOWN) {
        this.riskyWins++;
        this.riskyTotalPayout += payout;
      } else {
        this.safeWins++;
        this.safeTotalPayout += payout;
      }
    } else {
      this.totalPayoutDOWN += payout;
      this.nbRoundDOWN++;
      if (parsedUP < parsedDOWN) {
        this.riskyWins++;
        this.riskyTotalPayout += payout;
      } else {
        this.safeWins++;
        this.safeTotalPayout += payout;
      }
    }
  }
}

module.exports = { TotalAverages };
