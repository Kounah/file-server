const express = require('express');
const error = require('./error');
const amw = require('./amw');
const emw = require('./emw');

/**
 * 
 * @typedef {(req: express.Request, res: express.Response, next: {() => void}) => void} MiddlewareFunction
 */
class Handler {
  /**
   * @typedef {object} HandlerConstructorParams
   * @prop {string} method
   * @prop {string} path
   * @prop {boolean} enabled
   * @param {HandlerConstructorParams} params 
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new TypeError('\'params\' is null or not an object');
    
    /**@type {Method} */
    this._method = params.method;
    /**@type {string} */
    this._path = params.path;
    /**@type {boolean} */
    this._enabled = params.enabled;
    /**@type {Array.<MiddlewareFunction>} */
    this._mwstack = [];

    // function binding
    this.method = this.method.bind(this);
    this.path = this.path.bind(this);
    this.enabled = this.enabled.bind(this);
    this.register = this.register.bind(this);
    this.args = this.args.bind(this);
    this.applyRoute = this.applyRoute.bind(this);
    this.apply = this.apply.bind(this);

    // setup enabled route
    let t = this;
    this.register(((req, res, next) => {
      if(!t._enabled) {
        throw new error.model.DisabledByConfigError({
          method: t._method,
          path: t._path
        });
      } else next();
    }), {
      unshift: true
    });
  }

  /**
   * set or get the method
   * @param {string} val 
   */
  method(val) {
    if(typeof val === 'undefined')
      return this._method;

    if(typeof val !== 'string')
      throw new TypeError('\'val\' is not a string');

    this._method = val;
    return this;
  }

  /**
   * set or get the method
   * @param {string} val 
   */
  path(val) {
    if(typeof val === 'undefined')
      return this._path;
    
    if(typeof val !== 'string')
      throw new TypeError('\'val\' is not a string');

    this._path = val;
    return this;
  }

  enabled(val) {
    if(typeof val === 'undefined')
      return this._path;

    if(typeof val !== 'boolean')
      throw new TypeError('\'val\' is not a boolean');
    
    this._enabled = val;
    return this;
  }

  /**
   * register a middleware function
   * @typedef {Object} RegisterOptions
   * @prop {boolean} amw use amw?
   * @prop {boolean} unshift use unshift instead of push?
   * @param {MiddlewareFunction} fn 
   * @param {RegisterOptions} options 
   */
  register(fn, options) {
    if(typeof fn !== 'function')
      throw new TypeError('\'fn\' is not a function');

    if(typeof options === 'object' && options !== null) {
      if(options.amw) {
        fn = amw(fn);
      }

      if(options.unshift) {
        this._mwstack.unshift(fn);
        return this;
      }
    } else {
      fn = emw(fn);
    }

    this._mwstack.push(fn);
    return this;
  }

  /**
   * returns the args used for setting express routes
   */
  args() {
    return [this._path, ...this._mwstack];
  }

  /**
   * 
   * @param {express.Router} router 
   */
  applyRoute(router) {
    if(typeof router !== 'object' || router === null || !router instanceof express.Router)
      throw new TypeError('\'router\' is null or not a Router');

    let route = router.route(this._path);
    let fn = route[String(this._method).toLowerCase()];

    if(typeof fn !== 'function')
      throw new Error('invalid method: \'' + this._method + '\'');

    fn(...this._mwstack);
    return this;
  }

  /**
   * applies the handler to an application
   * @param {express.Application} app 
   */
  apply(app) {
    let m = String(this._method).toLowerCase();
    /**@type {Function} */
    let fn = app[m];
    
    if(typeof fn !== 'function')
      throw new Error('invalid method: \'' + this._method + '\'');
    

    fn.call(app, ...this.args());
    return this;
  }
}

module.exports = Handler;