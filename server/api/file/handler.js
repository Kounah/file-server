const path = require('path');
const Handler = require('../lib/handler');
const config = require('../../../config');
const core = require('./core');
const error = require('../lib/error');
const ini = require('ini');

module.exports.get = new Handler({
  enabled: config.api.file.handlers.get.enabled,
  method: 'GET',
  path: '/*',
}).register((req, res, next) => {
  let relp = path.relative('/', req.path);

  let result = core.load(relp);

  if(req.accepts('text/html')) {
    res.status(200).contentType('text/html');

    if(result.kind === 'file') {
      res.render('file.html', result);
    } else if(result.kind === 'directory') {
      res.render('directory.html', result);
    } else throw new Error('unknown kind for LoadResult: \'' + result.kind + '\'');
  } else if(req.accepts('application/json')) {
    res.status(200)
    .contentType('application/json')
    .json(result);
  } else {
    res.status(200)
    .contentType('text/plain')
    .send(ini.stringify(result));
  }
}, {
  amw: false
})