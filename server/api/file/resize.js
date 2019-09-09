const fs = require('fs');
const error = require('../lib/error');
const mime = require('mime');
const config = require('../../../config');
const instance = require('../../../lib/instance');
const instanceSync = require('../../../lib/instanceSync');
const jimp = require('jimp');
const crypto = require('crypto');

/**
 * @typedef {object} Resized
 * @prop {string} hash sha256 hash
 * @prop {string} name
 * @prop {number} height
 * @prop {number} width
 * @prop {string} type
 *
 * @typedef {object} ResizeCache
 * @prop {string} hash sha256 hash
 * @prop {string} path
 * @prop {Array.<Resized>} resized
 * @prop {string} type
 */


/**@type {Array.<ResizeCache>} */
let resizeCache;

/**
 * resizes an image (might use caching if enabled in config)
 * @typedef {object} ResizeParams
 * @prop {string} file
 * @prop {number} width
 * @prop {number} height
 * @param {ResizeParams} params
 * @returns {Promise.<Buffer>}
 */
async function resize(params) {
  if(typeof params !== 'object' || params === null)
    throw new TypeError('\'params\' is null or not an object');

  if(typeof params.file !== 'string')
    throw new TypeError('\'params.file\' is not a string');

  if(typeof params.height !== 'number' || params.height < -1)
    params.height = -1;

  if(typeof params.width !== 'number' || params.width < -1)
    params.width = -1;

  if(!fs.existsSync(params.file) || !fs.statSync(params.file).isFile())
    throw new error.model.NotFoundError({
      resource: {
        name: params.file,
        description: 'a file to be resized'
      }
    });

  let mt = mime.getType(params.file);
  if(config.api.file.resize.except.includes(mt))
    return await new Promise((resolve, reject) => {
      fs.readFile(params.file, (err, data) => {
        if(err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    });

  if(config.api.file.resize.noCache) {
    return await new Promise((resolve, reject) => {
      fs.readFile(params.file, (err, data) => {
        if(err) {
          reject(err);
          return;
        }

        _resize(data, params.width, params.height, mime.getType(params.file)).then(resolve).catch(reject);
      });
    });
  } else if(await instance.exists(config.api.file.resize.index)) {
    if(typeof resizeCache === 'undefined') {
      resizeCache = instanceSync.loadJSON(config.api.file.resize.index);
      setInterval(() => {
        instance.saveJSON(resizeCache, config.api.file.resize.index);
      }, 5000);
    }

    let match = resizeCache.filter(file => file.path === params.file).shift();

    if(typeof match === 'undefined') {
      // file has not been cached before
      // create cache entry for the file

      let e = await _resizeCache(params);

      instance.save(e.buf, config.api.file.resize.storage,
        e.cache.hash, e.resized.name);
      resizeCache.push(e.cache);

      return e.buf;
    } else {
      // file has been cached before
      // check if the requested size is cached

      let sizeMatch = match.resized.filter(cacheEntry =>
        cacheEntry.width === params.width
        && cacheEntry.height === params.height).shift();
      if(typeof sizeMatch === 'undefined') {
        // this size has not been cached before

        let e = await _resizeCache(params, {
          cacheEntry: match
        });

        await instance.save(e.buf, config.api.file.resize.storage,
          e.cache.hash, e.resized.name);
        resizeCache.push(e.cache);
      } else {
        return await instance.load(config.api.file.resize.storage,
          match.hash,
          sizeMatch.name);
      }
    }
  } else {
    // file has not been cached before
    // create cache entry for the file

    let e = await _resizeCache(params);

    await instance.save(e.buf, config.api.file.resize.storage,
      e.cache.hash, e.resized.name);
    resizeCache = [e.cache];
    await instance.saveJSON(resizeCache, config.api.file.resize.index);
    setInterval(() => {
      instance.saveJSON(resizeCache, config.api.file.resize.index).catch(err => {
        console.error(err);
      });
    }, 5000);

    return e.buf;
  }
}

module.exports = resize;

/**
 *
 * @param {Buffer} buf
 * @param {number} width
 * @param {number} height
 * @param {string} type mime type
 * @returns {Promise.<Buffer>}
 */
async function _resize(buf, width, height, type) {
  if(typeof buf !== 'object' || buf === null || !(buf instanceof Buffer))
    throw new TypeError('\'buf\' is null or not a Buffer');

  if(typeof width !== 'number')
    throw new TypeError('\'width\' is not a number');

  if(typeof height !== 'number')
    throw new TypeError('\'height\' is not a number');

  let img = await jimp.read(buf);

  // if(width > img.getWidth() || height > img.getHeight())
  //   throw new Error('refuse to upscale image');

  let aspect = img.getWidth() / img.getHeight();

  if(width > 0 && height > 0)
    img.cover(width, height);

  if(width > 0 && height <= 0)
    img.cover(width, width / aspect);

  if(width <= 0 && height > 0)
    img.cover(height * aspect, height);

  return await img.getBufferAsync(type);
}

/**
 * @typedef {object} ResizeCacheParams
 * @prop {string} file
 * @prop {number} width
 * @prop {number} height
 * @typedef {object} ResizeCacheOptions
 * @prop {ResizeCache} cacheEntry
 * @param {ResizeCacheParams} params
 * @param {ResizeCacheOptions} options
 * @returns {{buf: Buffer, cache: ResizeCache, resized: Resized}}
 */
async function _resizeCache(params, options) {
  if(typeof params !== 'object' || params === null)
    throw new TypeError('\'params\' is null or not an object');

  if(typeof params.file !== 'string')
    throw new TypeError('\'params.file\' is not a string');

  if(typeof params.height !== 'number' || params.height < -1)
    params.height = -1;

  if(typeof params.width !== 'number' || params.width < -1)
    params.width = -1;

  let fileBuf = await new Promise((resolve, reject) => {
    fs.readFile(params.file, (err, data) => {
      if(err) {
        reject(err);
        return;
      }

      resolve(data);
    });
  });
  let fileHash = crypto.createHash('sha256').update(fileBuf).digest('hex');

  let t = mime.getType(params.file);
  let buf = await _resize(fileBuf, params.width, params.height, t);

  /**@type {Resized} */
  let resized = {
    hash: crypto.createHash('sha256').update(buf.toString('utf8')).digest('hex'),
    height: params.height,
    width: params.width,
    type: t,
  };
  resized.name = resized.hash + '.' + mime.getExtension(resized.type);

  if(typeof options === 'object' && options !== null) {
    if(typeof options.cacheEntry === 'object' && options.cacheEntry !== null) {
      options.cacheEntry.resized.push(resized);
      return {
        buf,
        cache: options.cacheEntry,
        resized: resized
      };
    }
  }

  /**@type {ResizeCache} */
  let cacheEntry = {
    hash: fileHash,
    path: params.file,
    type: t,
    resized: [resized]
  };

  return {
    buf,
    cache: cacheEntry,
    resized
  };
}