// eslint-disable-next-line no-unused-vars
const express = require('express');
const nunjucks = require('nunjucks');
const config = require('../../config');

const extensions = require('./extensions');
const filters = require('./filters');

const path = require('path');

/**
 * 
 * @param {express.Application} app 
 */
function setup(app) {
  let njs = nunjucks.configure(path.join(__dirname, '../../views'), {
    express: app,
    noCache: config.nunjucks.noCache,
    autoescape: config.nunjucks.autoescapep
  });

  extensions.setup(njs);
  filters.setup(njs);

  njs.addGlobal('__config', config);
  njs.addGlobal('__global', config.nunjucks.global);

  return njs;
}

module.exports.setup = setup;