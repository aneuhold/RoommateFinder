var express = require("express");
const fs = require("fs").promises;
const path = require("path");
const questionsPath = path.join(__dirname, "../questions.json");

const adminAccounts = {
  test: "test",
  instructor: "pass",
  "Dr.M": "pass",
  anton: "pass",
  student: "somePassword"
};

/**
 * Uses a database and returns the router for the /admin path for the website.
 *
 * @param {MongoClient} db The database to be passed to be used in the router
 * @returns {Router} The router for the /admin path
 */
let adminRouterFactory = db => {
  let router = express.Router();
  let answersCollection = db.collection("answers");

  // Requests to main /admin page
  router.all("/", function(req, res, next) {
    if (req.method !== "GET") {
      next({
        message: "Method not allowed for the admin page. Please use GET",
        status: 405,
        errorRenderPage: "admin"
      });
      return;
    }
    if (!req.session.isLoggedInAsAdmin) {
      res.redirect("/admin/login");
      return;
    }

    (async () => {
      let questionsData = await fs.readFile(questionsPath, "utf-8");
      let questions = JSON.parse(questionsData);
      res.render("admin", {
        questions: questions,
        username: req.session.adminUsername
      });
    })().catch(err => {
      err.errorRenderPage = "admin";
      next(err);
    });
  });

  // Requests to the /admin/edit page
  router.all("/edit", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "POST") {
      next({
        message:
          "Method not allowed for the admin/edit page. " +
          "Please use GET or POST",
        status: 405,
        errorRenderPage: "admin"
      });
      return;
    }
    if (!req.session.isLoggedInAsAdmin) {
      next({
        message: "Edit only accessible by logged-in administrators",
        status: 401,
        errorRenderPage: "admin"
      });
      return;
    }
    if (!req.query.id) {
      next({
        message:
          "The edit page is only usable with an id specified in the query.",
        status: 400,
        errorRenderPage: "admin"
      });
      return;
    }

    (async () => {
      const questionsData = await fs.readFile(questionsPath, "utf-8");
      let questions = JSON.parse(questionsData);

      // Check if the ID matches a question
      const questionIndex = questions.findIndex(
        question => question.id === req.query.id
      );
      if (questionIndex === -1) {
        next({
          message: `Question ID of ${req.query.id} not found.`,
          status: 400,
          errorRenderPage: "admin"
        });
        return;
      }

      // Check if they are trying to update the question text
      if (req.body.updateQuestionText && req.body.questionText) {
        questions[questionIndex].question = req.body.questionText;

        await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2));
        res.render("success", {
          message: "Successfully changed the question text!",
          linkRoute: "/admin/edit?id=" + req.query.id,
          linkText: "Go back to question editor"
        });
        return;

        // If they are trying to add an answer
      } else if (req.body.addAnswer) {
        questions[questionIndex].possibleAnswers.push("");
        await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2));

        // If they are trying to update or delete an answer
      } else if (req.query.answerIndex) {
        let answerIndex = Number.parseInt(req.query.answerIndex);

        // If they are editing the answer
        if (req.body.editText && req.body.answerText) {
          questions[questionIndex].possibleAnswers[answerIndex] =
            req.body.answerText;
          await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2));
          res.render("success", {
            message: "Successfully changed answer text!",
            linkRoute: "/admin/edit?id=" + req.query.id,
            linkText: "Go back to question editor"
          });
          return;

          // If they are deleting the answer
        } else if (req.body.delete) {
          if (questions[questionIndex].possibleAnswers.length === 1) {
            res.render("success", {
              message:
                "Cannot delete answer because there is only 1 answer left",
              linkRoute: "/admin/edit?id=" + req.query.id,
              linkText: "Go back to question editor"
            });
            return;
          } else {
            questions[questionIndex].possibleAnswers.splice(answerIndex, 1);
            await fs.writeFile(
              questionsPath,
              JSON.stringify(questions, null, 2)
            );
            res.render("success", {
              message: "Successfully deleted answer!",
              linkRoute: "/admin/edit?id=" + req.query.id,
              linkText: "Go back to question editor"
            });
            return;
          }
        }
      }

      // Render the page with the question
      res.render("admin_edit", {
        question: questions[questionIndex],
        username: req.session.adminUsername
      });
    })().catch(err => {
      err.errorRenderPage = "admin";
      next(err);
    });
  });

  // Requests to the /admin/delete page
  router.all("/delete", (req, res, next) => {
    if (!req.session.isLoggedInAsAdmin) {
      next({
        message: "Delete pages only accessible by logged-in administrators",
        status: 401,
        errorRenderPage: "admin"
      });
      return;
    }
    if (!req.query.id) {
      next({
        message:
          "The delete page is only usable with an id specified in the query.",
        status: 400,
        errorRenderPage: "admin"
      });
      return;
    }

    (async () => {
      const questionsData = await fs.readFile(questionsPath, "utf-8");
      let questions = JSON.parse(questionsData);

      // Check if the ID matches a question
      const questionIndex = questions.findIndex(
        question => question.id === req.query.id
      );
      if (questionIndex === -1) {
        next({
          message: `Question ID of ${req.query.id} not found.`,
          status: 400,
          errorRenderPage: "admin"
        });
        return;
      } else {
        questions.splice(questionIndex, 1);

        // Delete the question and delete any answers associated with the question
        await Promise.all([
          fs.writeFile(questionsPath, JSON.stringify(questions)),
          answersCollection.deleteMany({ questionID: req.query.id })
        ]);

        res.render("success", {
          message: `Successfully deleted question with id ${req.query.id}!`,
          linkRoute: "/admin/edit",
          linkText: "Go back to question editor"
        });
        return;
      }
    })().catch(err => {
      err.errorRenderPage = "admin";
      next(err);
    });
  });

  // Requests to the /admin/add page
  router.all("/add", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "POST") {
      next({
        message:
          "Method not allowed for the admin/edit page. " +
          "Please use GET or POST",
        status: 405,
        errorRenderPage: "admin"
      });
      return;
    }
    if (!req.session.isLoggedInAsAdmin) {
      next({
        message: "Add page only accessible by logged-in administrators",
        status: 401,
        errorRenderPage: "admin"
      });
      return;
    }

    if (req.method === "GET") {
      res.render("admin_add", {
        username: req.session.adminUsername
      });
      return;
    } else if (!req.body.questionText) {
      next({
        message: "Submission requires text for the new question",
        status: 400,
        errorRenderPage: "admin"
      });
      return;
    }

    (async () => {
      const questionsData = await fs.readFile(questionsPath, "utf-8");
      let questions = JSON.parse(questionsData);
      let newID =
        new Date().getTime().toString() +
        Math.random()
          .toString(36)
          .substr(2, 6);

      questions.push({
        id: newID,
        question: req.body.questionText,
        possibleAnswers: [""]
      });
      await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2));
      res.redirect("/admin/edit?id=" + newID);
    })().catch(err => {
      err.errorRenderPage = "admin";
      next(err);
    });
  });

  // Requests to /admin/login page
  router.get("/login", (req, res, next) => {
    if (req.session.isLoggedInAsAdmin) {
      res.redirect("/admin");
    } else {
      res.render("admin_login");
    }
  });
  router.post("/login", (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      next({
        message: "Username or password not sent in request. Please try again.",
        status: 400,
        errorRenderPage: "admin"
      });
      return;
    }
    if (!adminAccounts[req.body.username]) {
      next({
        message: "Admin username does not exist. Please try again.",
        status: 401,
        errorRenderPage: "admin"
      });
      return;
    } else if (adminAccounts[req.body.username] !== req.body.password) {
      next({
        message: "Incorrect password. Please try again.",
        status: 401,
        errorRenderPage: "admin"
      });
      return;
    }
    req.session.isLoggedInAsAdmin = true;
    req.session.adminUsername = req.body.username;
    res.redirect("/admin");
  });
  router.all("/login", (req, res, next) => {
    next({
      message:
        "Method not allowed for admin login page. Please use GET or POST",
      status: 405,
      errorRenderPage: "admin"
    });
    return;
  });

  router.all("/logout", (req, res, next) => {
    if (req.method !== "GET") {
      next({
        message: "Method not allowed for the admin logout page. Please use GET",
        status: 405,
        errorRenderPage: "admin"
      });
      return;
    }
    if (!req.session.isLoggedInAsAdmin) {
      res.redirect("/admin/login");
    } else {
      delete req.session.isLoggedInAsAdmin;
      delete req.session.username;
      res.render("success", {
        message: "Successfully logged out!",
        linkRoute: "/",
        linkText: "Go back to home page"
      });
    }
  });

  return router;
};

module.exports = adminRouterFactory;
