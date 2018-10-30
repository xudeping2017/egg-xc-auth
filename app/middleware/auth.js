'use strict';

module.exports = (options, app) => {
  return async function auth(ctx, next) {
    const { request } = ctx;
    const path = request.path;
    if (options.authWhiteList.includes(path)) {
      return await next();
    }

    function validate(info, body) {
      try {
        if (body) {
          ctx.validate(info, body);
        } else {
          ctx.validate(info);
        }
      } catch (err) {
        throw new app.validateError(undefined, err.errors);
      }
    }
    const obj = {};
    Object.assign(obj, request.query, request.body);
    try {
      validate({
        appKey: { type: 'string' },
        accessToken: { type: 'string' },
        sign: { type: 'string' },
        time: { type: 'string' },
      }, obj);
    } catch (err) {
      throw err;
    }
    if (Date.now() - parseInt(obj.time) > 1000 * (options.time)) {
      throw (new app.oAuthError(ctx.__('oAuthErrorTime')));
    }
    const redis = app.redis;
    const conn = redis.getConnInstance('auth');
    const result = await redis.exists(conn, `${obj.appKey}_${obj.accessToken}`);
    redis.doRelease(conn);
    if (!result) {
      throw (new app.oAuthError(ctx.__('oAuthErrorToken')));
    }
    const clientSign = obj.sign;
    const serverSign = sign(obj);
    if (clientSign !== serverSign) {
      throw (new app.oAuthError(ctx.__('oAuthErrorSign'), {
        clientSign,
        serverSign,
      }));
    }
    await next();
  };

};

function sign(obj) {
  delete obj.requestId;
  delete obj.sign;
  const keys = Object.keys(obj).sort();
  let pinStr = '';
  for (const key of keys) {
    pinStr += (typeof obj[key] === 'object' ? JSON.stringify(obj[key]) : obj[key]);
  }
  pinStr += obj.appSecret;
  const signStr = require('crypto').createHash('SHA256').update(pinStr)
    .digest('HEX')
    .toUpperCase();
  return signStr;
}
