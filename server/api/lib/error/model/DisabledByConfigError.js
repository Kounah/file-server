const ApiError = require('./ApiError');

class DisabledByConfigError extends ApiError {
  /**
   * @typedef {object} DisabledByConfigErrorParams
   * @prop {string} method
   * @prop {string} path
   * @param {DisabledByConfigErrorParams} params 
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new TypeError('\'params\' is null or not an object');

    super({
      message: `the api-call ${params.method} '${params.path}' has been disabled by config`,
      status: {
        code: 405,
        message: `method ${params.method} disabled by config`
      }
    });

    /**@type {string} */
    this.method = params.method;
    /**@type {string} */
    this.path = params.path;
  }
}

module.exports = DisabledByConfigError;