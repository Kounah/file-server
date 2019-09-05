const path = require('path');
const Handler = require('../lib/handler');
const config = require('../../../config');
const core = require('./core');
const error = require('../lib/error');
const ini = require('ini');
const Accept = require('../lib/accept')

module.exports.get = new Handler({
  enabled: config.api.file.handlers.get.enabled,
  method: 'GET',
  path: /^((?!(\/\.))\/[\w\.%]*)*$/gm,
}).register((req, res, next) => {
  let relp = path.relative('/', decodeURIComponent(req.path));

  let result = core.load(relp, {
    recursive: true,
    recursionDepth: 1
  });

  new Accept({
    raw: req.headers['accept']
  }).register('image/*', (req, res, next) => {

    res
    .status(200)
    .type(path.parse(result.path).ext)
    .sendfile(result.path);

  }).register('text/html', (req, res, next) => {

    res
    .status(200)
    .type('html');

    if(result.kind === 'file') {
      res.render('file.html', {file: result});
    } else if(result.kind === 'directory') {
      res.render('directory.html', {dir: result});
    } else throw new Error('unknown kind for LoadResult: \'' + result.kind + '\'');

  }).register('application/json', (req, res, next) => {

    res.status(200)
    .type('json')
    .json(result);

  }).execute(req, res, next);
}, {
  amw: false
});