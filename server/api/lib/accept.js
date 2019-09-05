// eslint-disable-next-line no-unused-vars
const express = require('express');
const amw = require('./amw');

/**
 * inserts multiple middlewares in an existing middleware utilizing
 * the next function
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {() => void} next
 * @param {ExpressMiddleware} fn
 * @param {...ExpressMiddleware} fns
 * @returns {() => void}
 */
function getNextExecutor(req, res, next, fn, ...fns) {
  if(typeof fn === 'function') {
    return function(err) {
      if(err) {
        next(err);
        return;
      }

      amw(fn)(req, res, getNextExecutor(req, res, next, ...fns));
    };
  } else return next;
}

/**
 * @typedef {(req: express.Request, res: express.Response, next: {() => void}) => void} ExpressMiddleware
 */

/**
 * @typedef {object} AcceptHandler
 * @prop {string} name
 * @prop {Array.<ExpressMiddleware>} fns
 */

class Accept {
  /**
   * creates a new instance
   * @typedef {object} AcceptParams
   * @prop {string} raw the 'accepts'-header
   * @param {AcceptParams} params
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new TypeError('\'params\' is null or not an objcect');

    this.raw = params.raw;
    this.priorities = this.raw.split(';').shift().split(',');

    /**
     * @type {Array.<AcceptHandler>}
     */
    this.handlers = [];

    this.register = this.register.bind(this);
    this.execute = this.execute.bind(this);
  }

  /**
   * registers a handler
   * @param {string} name
   * @param  {...ExpressMiddleware} fns
   */
  register(name, ...fns) {
    let matching = this.handlers.filter(handler => handler.name === name);

    if(matching.length > 0) {
      matching.forEach(handler => {
        handler.fns.push(...fns);
      });
    } else {
      this.handlers.push({
        name: name,
        fns
      });
    }

    return this;
  }

  /**
   * executes the accepts handler
   * @param {express.Request} req
   * @param {express.Response} res
   * @param {() => void} next
   */
  execute(req, res, next) {
    let pri = this.priorities;
    for(let cur = pri.shift(); typeof cur !== 'undefined'; cur = pri.shift()) {
      let matching = this.handlers.filter(handler => handler.name === cur);

      if(matching.length > 0) {
        if(req.accepts(matching.name)) {
          for(let m = matching.shift(); typeof m !== 'undefined'; m = matching.shift()) {
            getNextExecutor(req, res, next, ...m.fns)();
          }

          return;
        }
      }
    }
  }
}

module.exports = Accept;