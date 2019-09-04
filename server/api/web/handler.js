const path = require('path');
const fs = require('fs-extra');
const core = require('./core');
const Handler = require('../lib/handler');
const error = require('../lib/error');
const config = require('../../../config');

module.exports.getAsset = new Handler({
  enabled: config.api.web.handlers.getAsset.enabled,
  method: 'GET',
  path: '/.assets/*'
}).register(async (req, res, next) => {
  let p = path.join(config.api.web.core.assetsPath, path.relative('/.assets/', req.path));

  if(!fs.existsSync(p) && fs.statSync(p).isFile())
    throw new error.model.NotFoundError({
      resource: {
        name: p,
        description: 'an asset (images, fonts, css  and so on)'
      }
    })
  
  let result = await core.load(p, {
    noCache: typeof req.query === 'object' && req.query !== null
      ? req.query.nocache
      : undefined
  });

  res.status(200)
  .type(result.type)
  .send(result.data);

  res.end();
}, {
  amw: true
});