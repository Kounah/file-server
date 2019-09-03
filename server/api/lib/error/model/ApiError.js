const path = require('path');

const pat_node_modules = new RegExp(`^.*?\\${path.sep}node_modules\\${path.sep}.*$`, 'gm');
const pat_app = new RegExp(`^.*?\\${path.sep}app\\${path.sep}.*$`, 'gm');

function samelen(nr, max) {
  return String(nr) + ' '.repeat(
    String(max).length -
    String(nr).length
  );
}

function toObject() {
  return Object.getOwnPropertyNames(this)
  .map(key => ({key, value: this[key]}))
  .reduce((p, c) => {
    if(c.key === 'stack') {
      let stack = String(c.value).split('\n');

      p['stack'] = stack;
      p['stack_local'] = stack
      .map((str, nr) => ({str, nr}))
      .filter(e => pat_app.test(e.str))
      .map((e, i, a) => `${samelen(e.nr, a.length)} ${e.str}`);

      p['string_modules'] = stack
      .map((str, nr) => ({str, nr}))
      .filter(e => pat_node_modules.test(e.str))
      .map((e, i, a) => `${samelen(e.nr, a.length)} ${e.str}`);
    } else if(typeof c.value === 'object' && c.value !== null && c.value instanceof Error) {
      p[c.key] = toObject.call(c.value);
    } else if(typeof c.value !== 'function') {
      p[c.key] = c.value;
    }

    return p;
  }, {});
}

class ApiError extends Error {
  /**
   * @typedef {Object} Status
   * @prop {number} code
   * @prop {string} message
   * @typedef {Object} ApiErrorParams
   * @prop {string} message
   * @prop {Status} status
   * @prop {Error|ApiError} inner
   * @param {ApiErrorParams} params 
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new Error('\'params\' is null or not an object');

    super('an API error occurred');

    /**@type {string} */
    this.message = params.message;
    /**@type {Status} */
    this.status = params.status;
    /**@type {Error|ApiError} */
    this.inner = params.inner;

    this.toObject = this.toObject.bind(this);
  }

  toObject() {
    toObject.call(this);
  }
}

module.exports = ApiError;