// @MODELS
const Round = require("../models/Round");
// @MISC
const utils = require("../helpers/utils");

// * ADD A NEW ROUND, UPDATE HISTORY IF IT ALREADY EXIST *
async function addRound(
  roundId,
  payoutUP,
  closePrice,
  diff,
  openPrice,
  poolValue,
  payoutDOWN,
  history
) {
  const round = new Round({
    roundId,
    payoutUP,
    closePrice,
    diff,
    openPrice,
    poolValue,
    payoutDOWN,
    history,
  });
  const [err, saved] = await utils.promise(round.save());
  if (err) {
    console.log("ERROR SAVING ROUND, TRYING TO UPDATE HISTORY", err.message);
    [err, saved] = await utils.promise(
      Round.findOneAndUpdate({ roundId }, { $set: { history } })
    );
    if (err)
      console.log(`ERROR FINDING AND UPDATING ROUND [${roundId}]`, err.message);
    else console.log(saved.roundId, "(updated history)");
  } else console.log(saved.roundId);

  return saved;
}

// * GET A SINGLE ROUND *
async function getRound(roundId) {
  const [err, result] = await utils.promise(Round.findOne({ roundId }));
  if (err)
    console.log(
      `AN ERROR OCCURED FETCHING THE PREDICION [${roundId}]`,
      err.message
    );

  return result;
}

// * GET THE LAST ROUND SAVED *
async function getLastRound() {
  let [err, result] = await utils.promise(
    Round.find().sort({ _id: -1 }).limit(1)
  );
  if (err) console.log("AN ERROR OCCURED FETCHING LAST ROUND", err.message);
  return result[0];
}

// * GET ROUND BY ROUNDID *
async function getRound(roundId) {
  let [err, result] = await utils.promise(Round.findOne({ roundId }));
  if (err) console.log("AN ERROR OCCURED FETCHING LAST ROUND", err.message);
  return result;
}

module.exports = {
  addRound,
  getLastRound,
  getRound,
  getRound,
};
