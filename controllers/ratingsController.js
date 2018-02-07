'use strict';

const config = require('../config.js');
const monk = require('monk');
const db = monk(process.env.MONGOLAB_URI);
const Raven = require('raven');

Raven.config(process.env.SENTRY_DSN).install();
m;

const Ratings = db.get('ratings');
const Users = db.get('users');

// TODO check if IDs are object or plain id numbers
module.exports.rating = async (ctx, next) => {
  if ('PUT' != ctx.method) return await next();
  try {
    const user = await Users.findOne({ _id: monk.id(ctx.params.id) });
    if (!user) {
      ctx.status = 404;
      ctx.body = 'User not found';
    }
    const rating = await Ratings.findOne({
      user_id: ctx.params.id,
      author: ctx.user._id.$oid
    });
    if (!rating) {
      await Ratings.insert({
        user_id: ctx.params.id,
        author: ctx.request.body.author,
        rating: ctx.request.body.rating
      });
    } else {
      await Ratings.updateOne(
        {
          user_id: ctx.params.id,
          author: ctx.user._id.$id
        },
        {
          $set: {
            rating: ctx.request.body.rating
          }
        }
      );
    }
    user.ratings_average =
      (user.ratings_average * user.ratings_number + ctx.request.body.rating) /
      (user.ratings_number + 1);
    user.ratings_number++;
    await Users.update(
      { _id: monk.id(ctx.params.id) },
      {
        $set: {
          ratings_number: user.ratings_number,
          ratings_average: user.ratings_average
        }
      }
    );
    ctx.status = 200;
    ctx.body = {
      ratings_average: user.ratings_average,
      ratings_number: user.ratings_number
    };
  } catch (e) {
    Raven.captureException(e);
  }
};
