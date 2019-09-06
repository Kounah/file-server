const express = require('express');
const config = require('../config');
const api = require('./api');
const os = require('os');
// eslint-disable-next-line no-unused-vars
const http = require('http');
const nunjucks = require('./nunjucks');

/**@type {express.Application} */
let app = null;

function setup() {
  app = express();

  app.use((req, res, next) => {
    try {
      next();
    } catch(err) {
      next(err);
    }
  });

  nunjucks.setup(app);
  api.setup(app);
  app.use(api.lib.error.handler);

  return app;
}
module.exports.setup = setup;

/**@type {Array.<http.Server>} */
let servers = [];
async function start() {
  servers = Array.from(
    new Set(
      (await Promise.all(
        Object.entries(os.networkInterfaces())
          .map(e => Promise.all(
            e[1]
              .filter(iface => iface.family !== 'IPv6')
              .map(iface => new Promise(async resolve => {
                // console.log('trying to listen on ' + iface.address + ':' + config.server.port);
                let s = app.listen(config.server.port, iface.address, (...args) => {
                  console.log('started listening on ' + iface.address + ':' + config.server.port, ...args);
                  resolve(s);
                });
              }))
          ))
      )).reduce((p, c) => p.concat(c), [])
    )
  );

  return servers;
}
module.exports.start = start;

async function stop() {
  servers.forEach(server => {
    let addr = server.address();
    let name = addr.address + ':' + addr.port;

    server.close((err) => {
      if(err) {
        console.log('an error occured while closing the server listening on ' + name);
        return;
      }

      console.log('closed server listening on' + name);
    });
  });
}
module.exports.stop = stop;