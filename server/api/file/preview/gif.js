const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const crypto = require('crypto');
const im = require('imagemagick');
const resize = require('../resize');
const error = require('../../lib/error');
const config = require('../../../../config');
const instance = require('../../../../lib/instance');

/**
 * @typedef {object} Frame
 * @prop {string} name
 * @prop {string} hash sha256
 */

/**
 * @typedef {object} Gif
 * @prop {string} file
 * @prop {string} hash sha256
 * @prop {Array.<Frame>} frames
 */

/**
 * @typedef {object} Cache
 * @prop {Array.<Gif>} gifs
 */

/**@type {Cache}*/
let gifCache;

if(instance.exists(config.api.file.preview.gif.index))
  gifCache = instance.loadJSON(config.api.file.preview.gif.index);

/**
 * generates or loads a preview image for the gif
 * @typedef {object} GifPreviewParams
 * @prop {string} file
 * @typedef {object} GifPreviewOptions
 * @prop {number} width
 * @prop {number} height
 * @prop {number} frame
 * @param {GifPreviewParams} params
 * @param {GifPreviewOptions} options
 */
async function preview(params, options) {
  if(typeof params !== 'object' || params === null)
    throw new TypeError('\'params\' is null or not an object');

  if(typeof params.file !== 'string')
    throw new TypeError('\'params.file\' is not a string');

  if(!(fs.existsSync(params.file) && fs.statSync(params.file).isFile()))
    throw new error.model.NotFoundError({
      resource: {
        name: params.file,
        description: 'a gif file to generate a preview for'
      }
    });

  let frame = 0;
  if(typeof options === 'object' && options !== null) {
    if(typeof options.frame === 'number' && options.frame >= 0) {
      frame = options.frame;
    }
  }

  if(config.api.file.preview.gif.noCache) {
    // cache disabled by config

    let gif = await _split_gif(params.file, os.tmpdir(), 'file-server', 'preview', 'gif');
    return await _resize_optional({
      file: _get_frame_path(gif, frame)
    }, options);

  } else if(typeof gifCache !== 'undefined'
  && typeof gifCache.gifs === 'object'
  && gifCache.gifs !== null
  && Array.isArray(gifCache.gifs)) {
    // gif cache is defined
    // search for gif

    let mgif = gifCache.gifs
      .filter(gif => gif.file === params.file).shift();

    if(typeof mgif !== 'undefined') {
      // gif exists in cache

      if(typeof mgif.frames[frame] !== 'undefined') {
        return await _resize_optional({
          file: _get_frame_path(mgif, frame)
        }, options);
      } else throw new TypeError('\'mgif.frames[' + frame + ']\' is not defined');
    } else {
      // gif does not exist in cache

      let gif = await _split_gif(params.file, instance.dir, config.api.file.preview.gif.storage);
      gifCache.gifs.push(gif);
      return await _resize_optional({
        file: _get_frame_path(gif, frame)
      }, options);
    }
  } else {
    // gif cache is not defined
    // generate

    /**@type {Cache} */
    gifCache = { gifs: [] };
    let f = function() { instance.saveJSON(gifCache, config.api.file.preview.gif.index); };
    setInterval(f, 5000);

    let gif = await _split_gif(params.file, instance.dir, config.api.file.preview.gif.storage);
    gifCache.gifs.push(gif);
    f();
    return await _resize_optional({
      file: _get_frame_path(gif, frame)
    }, options);
  }
}

module.exports = preview;

/**
 * gets the frame name
 * @param {Gif} gif
 * @param {number} frame
 * @returns {string}
 */
function _get_frame_path(gif, frame) {
  return path.join(instance.dir, config.api.file.preview.gif.storage, gif.hash, gif.frames[frame].name);
}

/**
 * splits a gif into its frames
 * @param {string} file
 * @param {...string} storage
 * @returns {Gif}
 */
async function _split_gif(file, ...storage) {

  let gifhash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex');

  let store = path.join(...storage, gifhash);
  let target = path.join(store, 'frame.jpg');
  fs.mkdirpSync(store);

  /**@type {Array.<Frame>} */
  let frames;

  try {
    console.log(`[preview/gif][convert: '${file}' to '${target}'] started`);
    await new Promise((resolve, reject) => {
      im.convert([
        file,
        target
      ], (err) => {
        if(err) {
          reject(err);
          return;
        }

        console.log(`[preview/gif][convert: '${file}' to '${target}'] done`);
        resolve();
      });
    });
  } catch(err) {
    console.error(`[preview/gif][convert: '${file}' to '${target}'] failed`, err);
    throw err;
  }

  frames = fs.readdirSync(store).map(name => {
  /**@type {Frame} */
    let frame = {
      name,
      hash: crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(store, name)))
        .digest('hex')
    };

    return frame;
  });

  /**@type {Gif} */
  let gif = {
    file,
    hash: gifhash,
    frames
  };

  return gif;
}

/**
 * resizes the preview image if needed
 * @typedef {object} ResizeOptionalParams
 * @prop {string} file
 * @typedef {object} ResizeOptionalOptions
 * @prop {number} width
 * @prop {number} height
 * @param {ResizeOptionalParams} params
 * @param {ResizeOptionalOptions} options
 * @returns {Buffer}
 */
async function _resize_optional(params, options) {
  if(typeof params !== 'object' || params === null)
    throw new TypeError('\'params\' is null or not an object');

  if(typeof params.file !== 'string')
    throw new TypeError('\'params.file\' is null or not an object');

  if(!(fs.existsSync(params.file) && fs.statSync(params.file).isFile()))
    throw new error.model.NotFoundError({
      resource: {
        name: params.file,
        description: 'preview image to resize optional'
      }
    });

  let width = -1;
  let height = -1;

  if(typeof options === 'object' && options !== null) {
    if(typeof options.width === 'number')
      width = options.width;

    if(typeof options.height === 'number')
      height = options.height;
  }

  return await resize({
    file: params.file,
    width,
    height
  });
}