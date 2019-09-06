const ApiError = require('./ApiError');

class ValueThrownError extends ApiError {
  /**
   * @typedef {object} ValueThrownErrorParams
   * @prop {*} data
   * @param {ValueThrownErrorParams} params
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new TypeError('\'params\' is null or not an object');

    super({
      message: 'a non error-type value has been thrown as error',
      status: {
        code: 500,
        message: 'non error-type value has been thrown as error'
      }
    });

    this.data = params.data;
    this.type = typeof params.data;
    this.instance = undefined;
    if(typeof params.data === 'object' && params.data !== null) {
      this.instance = Object.getPrototypeOf(params.data).constructor.name;
    }
  }
}

module.exports = ValueThrownError;