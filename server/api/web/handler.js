const path = require('path');
const fs = require('fs-extra');

const core = require('./core');

const Handler = require('../lib/handler');
const error = require('../lib/error');

const config = require('../../../config');

module.exports.get = new Handler({
  enabled: config.api.web.handlers.getAsset.enabled,
  method: 'GET',
  path: '/assets/*'
}).register((req, res, next) => {
  let p = path.join(__dirname, '../../../assets/', path.relative('/assets/', req.path));

  core.load()

  if(!fs.existsSync(p) && fs.statSync(p).isFile())
    throw new error.model.NotFoundError({
      resource: {
        name: p,
        description: 'an asset (images, fonts, css  and so on)'
      }
    })

  res.status(200)
  .type(path.parse(p).ext)
  .sendFile(p);
});