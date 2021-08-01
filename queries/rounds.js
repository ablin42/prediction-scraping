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
  console.log(
    roundId,
    payoutUP,
    closePrice,
    diff,
    openPrice,
    poolValue,
    payoutDOWN
  );
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
  var [err, saved] = await utils.promise(round.save());
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

// * GET ALL ROUNDS *
async function getAllRounds() {
  let [err, result] = await utils.promise(Round.find());
  if (err) console.log("AN ERROR OCCURED FETCHING ALL DATA", err.message);
  return result;
}

// * GET A SINGLE ROUND *
async function getRound(roundId) {
  let [err, result] = await utils.promise(Round.findOne({ roundId }));
  if (err)
    console.log(
      `AN ERROR OCCURED FETCHING THE PREDICION [${roundId}]`,
      err.message
    );

  return result;
}

// * GET ALL ROUNDS SINCE X HOURS *
// ? @PARAM: hours => Number of hours
async function getRoundByTimestamp(startTimestamp, endTimestamp) {
  const [err, result] = await utils.promise(
    Round.find(
      {
        createdAt: {
          $gte: new Date(+startTimestamp),
          $lt: new Date(+endTimestamp),
        },
      },
      {
        history: 0,
      }
    )
  );
  if (err)
    console.log(
      `ERROR FETCHING ROUNDS BETWEEN [${startTimestamp}] AND [${endTimestamp}]`,
      err.message
    );
  return result;
}

// * GET ALL ROUNDS SINCE X HOURS *
// ? @PARAM: hours => Number of hours
async function getRoundsLastHours(hours) {
  const [err, result] = await utils.promise(
    Round.find(
      {
        createdAt: {
          $lt: new Date(),
          $gte: new Date(new Date().getTime() - hours * 60 * 60 * 1000),
        },
      },
      {
        history: 0,
      }
    )
  );
  if (err)
    console.log(
      `ERROR FETCHING ROUNDS SINCE LAST [${hours}] HOURS`,
      err.message
    );
  return result;
}

// * GET ALL ROUNDS SINCE X HOURS WITH HISTORY *
// ? @PARAM: hours => Number of hours
async function getRoundsLastHoursWithHistory(hours) {
  const [err, result] = await utils.promise(
    Round.find({
      createdAt: {
        $lt: new Date(),
        $gte: new Date(new Date().getTime() - hours * 60 * 60 * 1000),
      },
    })
  );
  if (err)
    console.log(
      `ERROR FETCHING ROUNDS SINCE LAST [${hours}] HOURS WITH HISTORY`,
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
  getRoundsLastHours,
  getRound,
  getAllRounds,
  getRoundsLastHoursWithHistory,
  getRoundByTimestamp,
  getRound,
};
