var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mongodb = require("mongodb");
const mongoClient = new mongodb.MongoClient("mongodb://localhost:27017", {
  useUnifiedTopology: true
});
const session = require("express-session");

const indexRouterFactory = require("./routes/index");
const questionRouterFactory = require("./routes/question");
const resultsRouterFactory = require("./routes/results");
const renderingPreferenceRouter = require("./routes/renderingPreference");
const adminRouterFactory = require("./routes/admin");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30000
    }
  })
);

// setup the connection to the db, then setup routing
mongoClient
  .connect()
  .then(client => {
    console.log("The database connection has been established.");
    let db = client.db("roommateFinder");

    // turn off caching
    app.use((req, res, next) => {
      res.setHeader("Cache-Control", "no-store");
      next();
    });

    // setup routing
    let indexRouter = indexRouterFactory(db);
    app.use("/", indexRouter);
    let questionsRouter = questionRouterFactory(db);
    app.use("/questions", questionsRouter);
    let resultsRouter = resultsRouterFactory(db);
    app.use("/results", resultsRouter);
    app.use("/renderingPreference", renderingPreferenceRouter);
    let adminRouter = adminRouterFactory(db);
    app.use("/admin", adminRouter);

    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
      next(createError(404));
    });

    // error handler
    app.use(function(err, req, res, next) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get("env") === "development" ? err : {};

      // render the error page
      res.status(err.status || 500);
      if (err.errorRenderPage === "admin") {
        res.render("admin_error");
      } else {
        res.render("error");
      }
    });
  })
  .catch(err => {
    console.error("Database error: " + err);
    return;
  });

module.exports = app;
