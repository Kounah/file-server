const fs = require('fs-extra');
const path = require('path');
const config = require('../../../config');
const error = require('../lib/error');

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
    this.stats = params.stats || fs.statSync(params.path);
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
  }
}

class DirectoryLoadResult extends LoadResult {
  /**
   * @typedef {object} DirectoryLoadResultParams
   * @prop {string} path
   * @prop {boolean} recursive
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
    if(params.recursive) {
       this.children = fs.readdirSync(params.path)
      .map(name => generateResult(path.join(params.path, name), {
        recursive: params.recursive
      }));
    }
  }
}

/**
 * generates result, directories are loaded recursively
 * @typedef {object} GenerateResultOptions
 * @prop {boolean} recursive
 * @param {string} p 
 * @param {GenerateResultOptions} options
 */
function generateResult(p, options) {
  if(!fs.existsSync(p))
    throw new error.model.NotFoundError({
      resource: {
        name: pathseg,
        description: 'a file or directory requested for the file server functionality'
      }
    });

  let stats = fs.statSync(p);
  
  if(stats.isDirectory()) {
    return new DirectoryLoadResult({
      path: p,
      recursive: typeof options === 'object' && options !== null
        ? options.recursive
        : false
    })
  } else if(stats.isFile()) {
    return new FileLoadResult({
      path: p
    })
  }
}

/**
 * @typedef {object} LoadOptions
 * @prop {boolean} recursive
 * @param {string} pathseg
 * @param {LoadOptions} options
 * @returns {LoadResult}
 */
function load(pathseg, options) {
  let p = path.join(config.api.file.core.root, pathseg);

  if(typeof options === 'object' && options !== null) {
    return generateResult(p, {
      recursive: options.recursive
    })
  } else return generateResult(p);  
}

module.exports.load = load;