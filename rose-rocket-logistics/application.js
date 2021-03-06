const fs = require("fs");
const path = require("path");

const express = require("express");
const bodyparser = require("body-parser");
const pino = require('express-pino-logger')();

const helmet = require("helmet");
const cors = require("cors");

const app = express();

const db = require("./db");

const drivers = require("./routes/drivers");
const orders = require("./routes/orders");

function read(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(
      file,
      {
        encoding: "utf-8"
      },
      (error, data) => {
        if (error) return reject(error);
        resolve(data);
      }
    );
  });
}

module.exports = function application(
  ENV
) {
  app.use(cors());
  app.use(helmet());
  app.use(bodyparser.urlencoded({extended: false}));
  app.use(bodyparser.json());
  app.use(pino);

  app.use("/api", drivers(db));
  app.use("/api", orders(db));

  Promise.all([
    read(path.resolve(__dirname, `db/schema/create.sql`)),
    read(path.resolve(__dirname, `db/seeds/seeds.sql`)),
  ])
    .then(([create, seed]) => {
      app.get("/api/debug/reset", (request, response) => {
        db.query(create)
          .then(() => db.query(seed))
          .then(() => {
            console.log("Database Reset");
            response.status(200).send("Database Reset");
          });
      });
    })
    .catch(error => {
      console.log(`Error setting up reset route: ${error}`);
    });

  app.close = function() {
    return db.end();
  };

  return app;
};