#!/usr/bin/env node
const simpleFileServer = require('../index');

simpleFileServer.server.setup();
(async () => {
  await simpleFileServer.server.start();
})().then(() => {
  console.log('server running');
}).catch(err => {
  console.error(err);
})