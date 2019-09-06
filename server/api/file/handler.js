const path = require('path');
const fs = require('fs-extra');
const Handler = require('../lib/handler');
const config = require('../../../config');
const core = require('./core');
// eslint-disable-next-line no-unused-vars
const error = require('../lib/error');
// eslint-disable-next-line no-unused-vars
const ini = require('ini');
const Accept = require('../lib/accept');
const mime = require('mime');
const preview = require('./preview');

module.exports.get = new Handler({
  enabled: config.api.file.handlers.get.enabled,
  method: 'GET',
  path: /^((?!(\/\.))\/[0-9|\w-+.$#~|%]*)*$/i,
}).register(async (req, res, next) => {
  let relp = path.relative('/', decodeURIComponent(req.path));

  let result = core.load(relp, {
    recursive: true,
    recursionDepth: 1
  });

  if(result.kind === 'file') {

    if(typeof req.query === 'object' && req.query !== null
    && typeof req.query.view === 'string') {
      res
        .status(200)
        .render('file.html', {file: result});

      return;
    }

    let t = mime.getType(result.name);

    if(typeof req.query === 'object' && req.query !== null
    && typeof req.query.preview !== 'undefined') {
      let pre = await preview({
        file: result.path
      }, {
        widht: Number(req.query.widht || req.query.w) || -1,
        height: Number(req.query.height || req.query.h) || -1,
        frame: Number(req.query.frame || req.query.f) || 0
      });

      res
        .status(200)
        .type(pre.type)
        .send(pre.buf);

      res.end();

      return;
    }

    if(t.startsWith('image/')) {
      res
        .status(200)
        .type(path.parse(result.path).ext);

      if(typeof req.query === 'object' && req.query !== null) {
        let width, height;

        if(typeof req.query.size === 'string') {
          width = Number(req.query.size);
          height = Number(req.query.size);
        }

        if(typeof req.query.width === 'string') {
          if(req.query.width === 'auto') {
            width = -1;
          } else width = Number(req.query.width);
        }

        if(typeof req.query.height === 'string') {
          if(req.query.height === 'auto') {
            height = -1;
          } else height = Number(req.query.height);
        }

        if(width || height) {

          // redirect to unresized gif to spare the cache
          res.send(await core.resize({
            file: result.path,
            width,
            height
          }));
          res.end();
          return;
        }
      }

      res.send(fs.readFileSync(result.path));
      res.end();
    } else {
      res
        .status(200)
        .type(result.path)
        .send(fs.readFileSync(result.path));
    }
    return;
  }

  if(result.kind === 'directory') {
    new Accept({
      raw: req.headers['accept']
    }).register('text/html', (req, res) => {

      res
        .status(200)
        .type('html');

      if(result.kind === 'file') {
        res.render('file.html', {file: result});
      } else if(result.kind === 'directory') {
        res.render('directory.html', {dir: result});
      } else throw new Error('unknown kind for LoadResult: \'' + result.kind + '\'');

    }).register('application/json', (req, res) => {

      res.status(200)
        .type('json')
        .json(result);

    }).execute(req, res, next);
    return;
  }
}, {
  amw: true
});