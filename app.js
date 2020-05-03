'use strict';
require('dotenv').config();
const koa = require('koa');
const helmet = require('koa-helmet');
const logger = require('koa-logger');
const cors = require('kcors');
const bodyParser = require('koa-bodyparser');
const compress = require('koa-compress');
const monk = require('monk');
const app = (module.exports = new koa());
const routes = require('./router.js');
const db = monk(process.env.MONGOLAB_URI);
const User = db.get('users');
const Raven = require('raven');

Raven.config(process.env.SENTRY_DSN).install();

// Logger
app
  .use(logger())
  .use(helmet())
  .use(cors())
  .use(bodyParser())
  .use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      ctx.body = undefined;
      switch (ctx.status) {
      case 401:
        ctx.app.emit('error', err, this);
        break;
      case 400:
        ctx.app.emit('Resource error', err, this);
        break;
      case 404:
        ctx.app.emit('Resource not found', err, this);
        break;
      default:
        if (err.message) {
          ctx.body = { errors: [err.message] };
        }
        ctx.app.emit('error', err, this);
      }
    }
  })
  .use(async (ctx, next) => {
    let authorization = ctx.headers.authorization;
    if (!authorization || authorization.split(' ')[0] != 'Bearer')
      return await next();
    ctx.token = authorization.split(' ')[1];
    // console.log('authorization accessToken', ctx.token);
    ctx.user = await User.findOne({ accessToken: ctx.token });
    return await next();
  });

routes(app);

// Compress
app.use(compress());

// Raven
app.on('error', async err => {
  await Raven.captureException(err, (err, eventId) => {
    //eslint-disable-next-line no-console
    console.log(`Reported error ${eventId}`);
  });
});

module.exports = app;
