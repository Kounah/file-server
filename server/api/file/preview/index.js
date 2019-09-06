const fs = require('fs-extra');
const mime = require('mime');
const error = require('../../lib/error');

const gif = require('./gif');
const video = require('./video');

/**
 * @typedef {object} PreviewParams
 * @prop {string} file
 * @typedef {object} PreviewOptions
 * @prop {number} widht
 * @prop {number} height
 * @prop {number} frame
 * @typedef {object} Preview
 * @prop {Buffer} buf
 * @prop {string} type
 * @param {PreviewParams} params
 * @param {PreviewOptions} options
 * @returns {Promise<Preview>}
 */
async function preview(params, options) {
  if(typeof params !== 'object' || params === null)
    throw new TypeError('\'params\' is null or not an object');

  if(typeof params.file !== 'string')
    throw new TypeError('\'params.file\' is not a string');

  let type = mime.getType(params.file);

  if(!(fs.existsSync(params.file) && fs.statSync(params.file).isFile()))
    throw new error.model.NotFoundError({
      resource: {
        name: params.file,
        description: 'a file to generate a preview for'
      }
    });

  if(type === 'image/gif') {
    return {
      buf: await gif(params, options),
      type: 'image/jpg'
    };
  }

  if(type.startsWith('video/')) {
    return {
      buf: await video(params, options),
      type: 'image/jpg'
    };
  }
}

module.exports = preview;