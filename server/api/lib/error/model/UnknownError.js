const ApiError = require('./ApiError');

class UnknownError extends ApiError {
  /**
   * @typedef {object} UnknownErrorParams
   * @prop {Error} inner
   * @param {UnknownErrorParams} params 
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new TypeError('\'params\' is null or not an object');

    super({
      message: 'an error of unknown type occured',
      status: {
        code: 500,
        message: 'internal/unknown error'
      },
      inner: params.inner
    });
  }
}

module.exports = UnknownError;