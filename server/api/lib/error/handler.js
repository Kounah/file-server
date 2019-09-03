const express = require('express');
const model = require('./model');
const ini = require('ini');

/**
 * express error handler
 * @param {*} err 
 * @param {express.Request} req 
 * @param {express.Response} res 
 */
function handler(err, req, res) {
  let obj = {};

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

  if(typeof obj === 'object' && obj !== null) {
    res.set('error-type', obj.prototype.constructor.name);

    if(obj instanceof model.ApiError) {
      res.status(obj.status.code);
      if(req.accepts('application/json')) {
        res.contentType('application/json')
        res.json(obj.toObject());
      } else if(req.accepts('text/html')) {
        res.contentType('text/html');
        res.render('error.html', obj.toObject());
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