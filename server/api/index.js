// eslint-disable-next-line no-unused-vars
const express = require('express');
const lib = require('./lib');
const Handler = require('./lib/handler');
const fileApi = require('./file');
const webApi = require('./web');

module.exports.lib = lib;

/**
 * applies handlers in a handler module
 * @param {express.Application} app
 * @param {Array.<string>} modules
 */
function applyHandlers(app, ...modules) {
  modules.forEach(mod => {
    Object.entries(mod).map(e => {
      /**@type {Handler} */
      let r = e[1];
      return r;
    })
      .filter(h => h instanceof Handler)
      .forEach(h => {
        h.apply(app);
      });
  });
}

/**
 * sets up the api's express routes
 * @param {express.Application}
 */
function setup(app) {
  applyHandlers(app,
    webApi.handler,
    fileApi.handler
  );
}

module.exports.setup = setup;