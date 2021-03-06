// eslint-disable-next-line no-unused-vars
const express = require('express');
const model = require('./model');
const ini = require('ini');

Error.stackTraceLimit = Infinity;

/**
 * express error handler
 * @param {*} err
 * @param {express.Request} req
 * @param {express.Response} res
 */
// eslint-disable-next-line no-unused-vars
function handler(err, req, res, next) {
  let obj = {};

  if(req.noErrorHandling) return;

  if(typeof err === 'object' && err !== null) {
    if(err instanceof model.ApiError) {
      obj = err;
    } else if(err instanceof Error) {
      obj = new model.UnknownError({
        inner: err
      });
    } else {
      obj = new model.ValueThrownError({
        data: err
      });
    }
  } else {
    obj = new model.ValueThrownError({
      data: err
    });
  }

  if(res.headersSent) {
    console.error(obj.toObject());
    return;
  }

  if(typeof obj === 'object' && obj !== null) {
    res.set('error-type', Object.getPrototypeOf(obj).constructor.name);

    if(obj instanceof model.ApiError) {
      res.status(obj.status.code);
      if(req.accepts('text/html')) {
        res.contentType('text/html');
        res.render('error.html', {error: obj.toObject()});
      } else if(req.accepts('application/json')) {
        res.contentType('application/json');
        res.json(obj.toObject());
      } else {
        res.contentType('text/plain');
        res.render(ini.stringify(obj.toObject(), {
          whitespace: true
        }));
      }
    }
  } else {
    res
      .status(500)
      .contentType('text/plain')
      .send('This should not be possible.');
  }
}

module.exports = handler;