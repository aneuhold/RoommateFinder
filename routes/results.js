var express = require("express");

/**
 * Uses a database and returns the router for the /results path for the website.
 *
 * @param {MongoClient} db The database to be passed to be used in the router
 * @returns {Router} The router for the /results page
 */
let resultsRouterFactory = db => {
  let router = express.Router();
  let answersCollection = db.collection("answers");

  router.all("/", (req, res, next) => {
    if (req.method !== "GET") {
      next({
        message: "Method not allowed for /results page. Please use GET",
        status: 405
      });
      return;
    }
    if (!req.session.username) {
      next({
        message:
          "No username found with session. Please try again with a username.",
        status: 400
      });
      return;
    }

    (async () => {
      // Find the answers of users other than the current one
      let otherUserAnswersCursor = answersCollection.find({
        username: { $ne: req.session.username }
      });

      // Find the answers of the current user
      let currentUsersAnswersCursor = answersCollection.find({
        username: req.session.username
      });

      /* There is probably a better way to do this as a stream or maybe
       * by using mapReduce. But for the sake of time it is done in memory. */
      let combinedResults = await Promise.all([
        otherUserAnswersCursor.toArray(),
        currentUsersAnswersCursor.toArray()
      ]);
      let otherUserAnswers = combinedResults[0];
      let currentUsersAnswers = combinedResults[1];

      /* Create a list of users associated with their number of answers that
       * are the same as the current user. */
      let answerMatchCountByUser = otherUserAnswers.reduce(
        (acc, currentAnswerDoc) => {
          let currUserMatchedQuestionIndex = currentUsersAnswers.findIndex(
            userAnswerDoc => {
              return userAnswerDoc.questionID === currentAnswerDoc.questionID;
            }
          );

          // If the other user's username doesn't exist in the accumulator yet
          if (!acc.hasOwnProperty(currentAnswerDoc.username)) {
            acc[currentAnswerDoc.username] = 0;
          }

          // If the current user did answer the question and the answers were the same
          if (
            currUserMatchedQuestionIndex >= 0 &&
            currentUsersAnswers[currUserMatchedQuestionIndex].answer ===
              currentAnswerDoc.answer
          ) {
            acc[currentAnswerDoc.username] += 1;
          }
          return acc;
        },
        {}
      );
      sortedUserAnswerCountArray = Object.entries(answerMatchCountByUser).sort(
        (a, b) => b[1] - a[1]
      );
      res.render("result", { roommates: sortedUserAnswerCountArray });
    })().catch(err => {
      next(err);
    });
  });

  return router;
};

module.exports = resultsRouterFactory;
