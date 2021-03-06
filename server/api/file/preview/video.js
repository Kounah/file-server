const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const resize = require('../resize');
const error = require('../../lib/error');
const config = require('../../../../config');
const instance = require('../../../../lib/instance');
const instanceSync = require('../../../../lib/instanceSync');
const Promise = require('bluebird');

/**
 * @typedef {object} Thumb
 * @prop {string} name
 * @prop {string} hash sha256
 */

/**
 * @typedef {object} Video
 * @prop {string} file
 * @prop {string} hash sha256
 * @prop {Array.<Thumb>} thumbs
 */

/**
 * @typedef {object} Cache
 * @prop {Array.<Video>} videos
 */

/**@type {Cache} */
let videoCache;

if(instanceSync.exists(config.api.file.preview.video.index))
  videoCache = instanceSync.loadJSON(config.api.file.preview.video.index);

/**
 * generates or loads a preview image for the videos
 * @typedef {object} VideoPreviewParams
 * @prop {string} file
 * @typedef {object} VideoPreviewOptions
 * @prop {number} width
 * @prop {number} height
 * @prop {number} thumb
 * @param {VideoPreviewParams} params
 * @param {VideoPreviewOptions} options
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
        description: 'a video file to generate a preview for'
      }
    });

  let thumb = 0;
  if(typeof options === 'object' && options !== null) {
    if(typeof options.thumb === 'number' && options.thumb >= 0) {
      thumb = options.thumb;
    }
  }

  if(config.api.file.preview.gif.noCache) {
    // cache disabled by config

    let video = await _gen_thumbs(params.file, os.tmpdir(), 'file-server', 'preview', 'video');
    return await _resize_optional({
      file: _get_thumb_path(video, thumb)
    }, options);
  } else if(typeof videoCache !== 'undefined'
  && typeof videoCache.videos === 'object'
  && videoCache.videos !== null
  && Array.isArray(videoCache.videos)) {
    // video cache is defined
    // search for video

    let mvid = videoCache.videos
      .filter(vid => vid.file === params.file).shift();

    if(typeof mvid !== 'undefined') {
      // video exists in cache

      if(typeof mvid.thumbs[thumb] !== 'undefined') {
        return await _resize_optional({
          file: _get_thumb_path(mvid, thumb)
        }, options);
      } else throw new TypeError('\'mvid.thumbs[' + thumb + ']\' is not defined');
    } else {
      // video does not exist in cache

      let vid = await _gen_thumbs(params.file, instance.dir, config.api.file.preview.video.storage);
      videoCache.videos.push(vid);
      return await _resize_optional({
        file: _get_thumb_path(vid, thumb)
      }, options);
    }
  } else {
    // video cache is not defined
    // generate

    /**@type {Cache} */
    videoCache = { videos: [] };
    let f = function() { instance.saveJSON(videoCache, config.api.file.preview.video.index); };
    setInterval(f, 5000);

    let vid = await _gen_thumbs(params.file, instance.dir, config.api.file.preview.video.storage);
    videoCache.videos.push(vid);
    f();
    return await _resize_optional({
      file: _get_thumb_path(vid, thumb)
    }, options);
  }
}

module.exports = preview;

/**
 * gets the thumb name
 * @param {Video} video
 * @param {number} thumb
 * @returns {string}
 */
function _get_thumb_path(video, thumb) {
  return path.join(instance.dir, config.api.file.preview.video.storage,
    video.hash, video.thumbs[thumb].name);
}

/**
 * generates thumbnails
 * @param {string} file
 * @param {...string} storage
 * @returns {Video}
 */
async function _gen_thumbs(file, ...storage) {
  let videohash = await new Promise((resolve, reject) => {
    fs.readFile(file, (err, data) => {
      if(err) {
        reject(err);
        return;
      }

      resolve(crypto
        .createHash('sha256')
        .update(data)
        .digest('hex'));
    });    
  });

  let store = path.join(...storage, videohash);
  fs.mkdirpSync(store);

  let files = await new Promise((resolve, reject) => {
    promisifyCommand(ffmpeg()
      .input(file), 'screenshots')({
      count: config.api.file.preview.video.options.count,
      filename: 'thumb-%s.jpg',
      folder: store
    }).then(files => resolve(files)).catch(err => reject(err));

    setTimeout(function() {
      reject(new Error('thumbnail generation timed out'));
    }, 20000);

    let wait = setInterval(function() {
      let files = fs.readdirSync(store).map(f => path.join(store, f));
      if(files.length > 0) {
        clearInterval(wait);
        resolve(files);
      }
    }, 200);
  });

  /**@type {Array.<Thumb>} */
  let thumbs;
  if(typeof files === 'object' && files !== null && Array.isArray(files)) {
    thumbs = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      fs.readFile(file, (err, data) => {
        if(err) {
          reject(err);
          return;
        }

        let hash = crypto
          .createHash('sha256')
          .update(data)
          .digest('hex');

        /**@type {Thumb} */
        let t = {
          name: path.relative(store, file),
          hash
        };

        resolve(t);
      });
    })));
  }

  /**@type {Video} */
  let video = {
    file: file,
    hash: videohash,
    thumbs
  };

  return video;
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

function promisifyCommand (command, run='run') {
  return Promise.promisify( (...args) => {
    const cb = args.pop();
    command
      .on( 'end',   ()      => { cb(null);  } )
      .on( 'error', (error) => { cb(error); } )[run](...args);
  });
}