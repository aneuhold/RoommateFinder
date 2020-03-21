var express = require("express");

/**
 * Uses a database and returns the router for the index path for the website.
 *
 * @param {MongoClient} db The database to be passed to be used in the router
 * @returns {Router} The router for the index page
 */
let indexRouterFactory = db => {
  let router = express.Router();

  router.all("/", function(req, res, next) {
    if (req.method !== "GET") {
      next({
        message: "Method not allowed for home page. Please use GET",
        status: 405
      });
      return;
    }

    res.render("index", { title: "Roommate Finder" });
  });

  return router;
};

module.exports = indexRouterFactory;
