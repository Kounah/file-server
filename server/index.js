const express = require('express');
const config = require('../config');
const api = require('./api');

let app;

async function setup() {
  app = express();

  app.use((req, res, next) => {
    try {
      next();
    } catch(err) {
      next(err);
    }
  });

  api.setup(app);

  app.use(api.lib.error.handler);
}

async function start() {

}

async function stop() {

}