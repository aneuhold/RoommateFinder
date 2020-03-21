var express = require("express");
const fs = require("fs").promises;
const path = require("path");
const questionsPath = path.join(__dirname, "../questions.json");

/**
 * Uses a database and returns the router for the /questions path for the website.
 * The router will accept post requests to the base /questions url path and then
 * after recieving the request, forward the user to the appropriate
 * /question/number page.
 *
 * @param {MongoClient} db The database to be passed to be used in the router
 * @returns {Router} The router for the /questions path
 */
let questionsRouterFactory = db => {
  let router = express.Router();
  let answersCollection = db.collection("answers");

  router.all("/", function(req, res, next) {
    if (req.method !== "POST") {
      next({
        message: "Method not allowed for /question page. Please use POST",
        status: 405
      });
      return;
    }

    // Check if a username was submitted, which assumes that the session expired
    if (!req.body.username && !req.session.username) {
      next({
        message: "Session timeout! Please login again.",
        status: 408
      });
      return;
    } else if (req.body.username) {
      req.session.username = req.body.username;
    }

    // Check if a preference exists
    if (req.body.renderingPreference) {
      req.session.renderingPreference = req.body.renderingPreference;
    }

    (async () => {
      // Check if there is an answer to store
      if (req.body.questionAnswer && req.session.currentQuestionID) {
        // Setup the update operation
        const filter = {
          username: req.session.username,
          questionID: req.session.currentQuestionID
        };
        const update = {
          $set: {
            username: req.session.username,
            questionID: req.session.currentQuestionID,
            answer: req.body.questionAnswer
          }
        };
        const options = {
          upsert: true
        };

        // Store the answer
        await answersCollection.updateOne(filter, update, options);
      }
      // Send the user to the appropriate page
      if (req.body.next) {
        /* The /question/questionnumber page is responsible for checking if
         * the user should be sent to the results page instead because it
         * already needs to check the questions document */
        res.redirect("/questions/" + (req.session.currentQuestionNum + 1));
      } else if (req.body.prev && isOnFirstQuestion()) {
        res.redirect("/");
      } else if (req.body.prev) {
        res.redirect("/questions/" + (req.session.currentQuestionNum - 1));
      } else if (req.session.currentQuestionNum) {
        res.redirect("/questions/" + req.session.currentQuestionNum);
      } else {
        res.redirect("/questions/1");
      }
    })().catch(err => {
      next(err);
    });

    // Helper function
    function isOnFirstQuestion() {
      return req.session.currentQuestionNum === 1;
    }
  });

  router.all("/:questionNum", (req, res, next) => {
    if (req.method !== "GET") {
      next({
        message:
          "Method not allowed for /question/<questionNumber> page. " +
          "Please use GET",
        status: 405
      });
      return;
    }

    (async () => {
      // Retrieve questions from the questions file
      let data = await fs.readFile(questionsPath, "utf-8");
      let questions = JSON.parse(data);

      // Check if the question lines up with one in the questions array
      let questionArrNum = req.params.questionNum - 1;
      if (questionArrNum === questions.length) {
        delete req.session.currentQuestionNum;
        res.redirect("/results");
        return;
      } else if (questionArrNum < 0 || questionArrNum >= questions.length) {
        next({
          message: `Question number ${req.params.questionNum} doesn't exist`,
          status: 400
        });
        return;
      }

      // Store the question ID for matching to an answer later
      let questionID = questions[questionArrNum].id;
      req.session.currentQuestionID = questionID;

      // Store their current question number to determine routing later
      req.session.currentQuestionNum = Number.parseInt(req.params.questionNum);

      // Get their currently answered question from the database if it exists
      let previousAnswerDoc = await answersCollection.findOne({
        questionID: questionID,
        username: req.session.username
      });

      let previousAnswer;
      if (previousAnswerDoc == null) {
        previousAnswer = "";
      } else {
        previousAnswer = previousAnswerDoc.answer;
      }

      // Render the question page with the possible answers array
      res.render("surveyPage", {
        pageNum: req.params.questionNum,
        pageCount: questions.length,
        username: req.session.username,
        question: questions[questionArrNum].question,
        answers: questions[questionArrNum].possibleAnswers,
        previousAnswer: previousAnswer,
        renderingPreference: req.session.renderingPreference
      });
    })().catch(err => {
      next(err);
    });
  });

  return router;
};

module.exports = questionsRouterFactory;
