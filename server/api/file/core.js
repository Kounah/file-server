const fs = require('fs-extra');
const path = require('path');
const config = require('../../../config');
const error = require('../lib/error');
const mime = require('mime');
const instance = require('../../../lib/instance');
const jimp = require('jimp');
const crypto = require('crypto');

class LoadResult {
  /**
   * @typedef {object} LoadResultParams
   * @prop {string} kind
   * @prop {string} path
   * @prop {fs.Stats} stats
   * @param {LoadResultParams} params
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new TypeError('\'params\' is null or not an object');

    this.kind = params.kind;
    this.path = params.path;
    this.relp = path.relative(config.api.file.core.root, this.path);
    this.name = path.parse(this.path).base;

    /**@type {fs.Stats} */
    this.stats = params.stats || fs.statSync(params.path);

    this.stats = Object.entries(this.stats)
      .filter(e => {
        return (
          typeof e[1] !== 'function'
        );
      })
      .reduce((p, c) => {
        p[c[0]] = c[1];
        return p;
      }, {});
  }
}

class FileLoadResult extends LoadResult {
  /**
   * @typedef {object} FileLoadResultParams
   * @prop {string} path
   * @param {FileLoadResultParams} params
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new TypeError('\'params\' is null or not an object');

    super({
      kind: 'file',
      path: params.path
    });

    this.type = mime.getType(this.path);
  }
}

class DirectoryLoadResult extends LoadResult {
  /**
   * @typedef {object} DirectoryLoadResultParams
   * @prop {string} path
   * @prop {boolean} recursive
   * @prop {number} recursionDepth
   * @param {DirectoryLoadResultParams} params
   */
  constructor(params) {
    if(typeof params !== 'object' || params === null)
      throw new TypeError('\'params\' is null or not an object');

    super({
      kind: 'directory',
      path: params.path
    });

    this.recursive = params.recursive;

    /**@type {Array.<LoadResult>} */
    this.children = [];
    if(params.recursive && params.recursionDepth > 0) {
      this.children = fs.readdirSync(params.path)
        .map(name => generateResult(path.join(params.path, name), {
          recursive: params.recursive,
          recursionDepth: params.recursionDepth - 1
        }));
    }

    this.children = this.children.sort((a, b) => {
      if(a.kind === 'file' && b.kind === 'file') {
        return b.stats.mtimeMs - a.stats.mtimeMs;
      }

      if(a.kind === 'file' && b.kind === 'directory') return 1;
      if(a.kind === 'directory' && b.kind === 'file') return -1;

      return a.name > b.name ? 1 : -1;
    });
  }
}

/**
 * generates result, directories are loaded recursively
 * @typedef {object} GenerateResultOptions
 * @prop {boolean} recursive
 * @prop {number} recursionDepth
 * @param {string} p
 * @param {GenerateResultOptions} options
 */
function generateResult(p, options) {
  if(!fs.existsSync(p))
    throw new error.model.NotFoundError({
      resource: {
        name: p,
        description: 'a file or directory requested for the file server functionality'
      }
    });

  let stats = fs.statSync(p);

  if(stats.isDirectory()) {
    if(typeof options === 'object' && options !== null)
      return new DirectoryLoadResult({
        path: p,
        recursive: options.recursive,
        recursionDepth: typeof options.recursionDepth === 'number'
          ? options.recursionDepth
          : Infinity
      });
    else return new DirectoryLoadResult({
      path: p,
      recursive: false,
      recursionDepth: 0
    });

  } else if(stats.isFile()) {
    return new FileLoadResult({
      path: p
    });
  }
}

/**
 * @typedef {object} LoadOptions
 * @prop {boolean} recursive
 * @prop {number} recursionDepth
 * @param {string} pathseg
 * @param {LoadOptions} options
 * @returns {LoadResult}
 */
function load(pathseg, options) {
  let p = path.join(config.api.file.core.root, pathseg);

  if(typeof options === 'object' && options !== null) {
    return generateResult(p, {
      recursive: options.recursive,
      recursionDepth: typeof options.recursionDepth === 'number'
        ? options.recursionDepth
        : Infinity
    });
  } else return generateResult(p);
}

module.exports.load = load;

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
  if(config.api.file.core.resize.except.includes(mt))
    return fs.readFileSync(params.file);

  if(config.api.file.core.resize.noCache) {
    return await _resize(fs.readFileSync(params.file), params.width, params.height, mime.getType(params.file));
  } else if(instance.exists(config.api.file.core.resize.index)) {
    if(typeof resizeCache === 'undefined') {
      resizeCache = instance.loadJSON(config.api.file.core.resize.index);
      setInterval(() => {
        instance.saveJSON(resizeCache, config.api.file.core.resize.index);
      }, 5000);
    }

    let match = resizeCache.filter(file => file.path === params.file).shift();

    if(typeof match === 'undefined') {
      // file has not been cached before
      // create cache entry for the file

      let e = await _resizeCache(params);

      instance.save(e.buf, config.api.file.core.resize.storage,
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

        instance.save(e.buf, config.api.file.core.resize.storage,
          e.cache.hash, e.resized.name);
        resizeCache.push(e.cache);
      } else {
        return instance.load(config.api.file.core.resize.storage,
          match.hash,
          sizeMatch.name);
      }
    }
  } else {
    // file has not been cached before
    // create cache entry for the file

    let e = await _resizeCache(params);

    instance.save(e.buf, config.api.file.core.resize.storage,
      e.cache.hash, e.resized.name);
    resizeCache = [e.cache];
    instance.saveJSON(resizeCache, config.api.file.core.resize.index);
    setInterval(() => {
      instance.saveJSON(resizeCache, config.api.file.core.resize.index);
    }, 5000);

    return e.buf;
  }
}

module.exports.resize = resize;

/**
 *
 * @param {Buffer} buf
 * @param {number} width
 * @param {number} height
 * @param {string} type mime type
 * @returns {Buffer}
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

  let fileBuf = fs.readFileSync(params.file);
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