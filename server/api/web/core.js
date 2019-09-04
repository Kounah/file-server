const fs = require('fs-extra');
const path = require('path');
const instance = require('../../../lib/instance');
const compiler = require('./compiler');
const config = require('../../../config');

/**
 * loads a file of a given path and compiles it if needed
 * @typedef {Object} LoadOptions
 * @prop {boolean} noCache
 * @typedef {Object} LoadResult
 * @prop {Buffer} data
 * @prop {string} type
 * @param {string} fname
 * @param {LoadOptions} options
 * @returns {Promise.<LoadResult>} 
 */
async function load(fname, options) {
  // get relative path
  let relp = path.relative(config.api.web.core.assetsPath, fname);

  if(compiler.needed(fname)) {
    let noCache = config.api.web.core.noCache;

    if(typeof options === 'object' && options !== null) {
      if(typeof options.noCache !== 'undefined')
        noCache = options.noCache
    }

    if(!noCache) {
      // using cache
      if(instance.exists(relp)) {
        // cache has this file

        // check age of file
        let age = new Date().getTime() - instance.stat(relp).mtime.getTime();
        if(age > config.api.web.core.cacheMaxAge) {
          // file in cache is too old, recompile
          let compiled = await compiler.compile(fname);
          instance.save(compiled.data, relp);
          return compiled;
        } else {
          // load file and
          return {
            data: instance.load(relp),
            type: compiler.getCompilerModule(fname).type
          }
        }
      } else {
        // cache does not have this file

        let compiled = await compiler.compile(fname);
        instance.save(compiled.data, relp);
        return compiled;
      }
    } else {
      // not using cache

      return await compiler.compile(fname);
    }
  }
}

module.exports.load = load;