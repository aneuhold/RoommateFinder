var express = require("express");
let router = express.Router();

router.all("/", function(req, res, next) {
  if (req.method !== "GET") {
    next({
      message:
        "Method not allowed for rendering preference page. " +
        "Please use GET.",
      status: 405
    });
    return;
  }

  /* This will be undefined if there wasn't a previousPreference, which is ok
   * because it is handled in the pug file */
  let previousPreference = req.session.renderingPreference;

  res.render("renderingPreference", {
    previousPreference: previousPreference
  });
});

module.exports = router;
