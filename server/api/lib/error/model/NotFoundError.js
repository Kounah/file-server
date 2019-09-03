const ApiError = require('./ApiError');

class NotFoundError extends ApiError {
  /**
   * @typedef {object} Resource
   * @prop {string} name
   * @prop {string} description
   * @typedef {object} NotFoundErrorParams
   * @prop {Resource} resource
   * @prop {Error} inner
   * @param {NotFoundErrorParams} params
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new TypeError('\'params\' is null or not an object');

    super({
      message: `the requested resource ${params.resource.name} could not be found.`,
      status: {
        code: 404,
        message: 'requested resource not found'
      },
      inner: params.inner
    });

    /**@type {Resource} */
    this.resource = params.resource; 
  }
}

module.exports = NotFoundError;