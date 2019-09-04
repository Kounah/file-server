const express = require('express');

/**
 * @param {(req: express.Request, res: express.Response, next: {() => void})} fn
 */
function emw(fn) {
  return function(req, res, next) {
    try {
      fn(req, res, next);
    } catch(err) {
      next(err);
    }
  }
}

module.exports = emw;