'use strict';

var util = require('util');
var passport = require('passport-strategy');
var OAuth = require('../wechat-oauth');
var debug = require('debug')('passport-wechat');

function WechatStrategy(options, verify) {
  options = options || {};

  if (!verify) {
    throw new TypeError('WeChatStrategy required a verify callback');
  }

  if (typeof verify !== 'function') {
    throw new TypeError('_verify must be function');
  }

  if (!options.appID) {
    throw new TypeError('WechatStrategy requires a appID option');
  }

  if (!options.appSecret) {
    throw new TypeError('WechatStrategy requires a appSecret option');
  }

  passport.Strategy.call(this, options, verify);

  this.name = options.name || 'wechat';
  this._client = options.client || 'wechat';
  this._verify = verify;
  this._oauth = new OAuth(options.appID, options.appSecret, options.getToken, options.saveToken, true);
  this._callbackURL = options.callbackURL;
  this._lang = options.lang || 'en';
  this._state = options.state;
  this._scope = options.scope || 'snsapi_userinfo';
  this._passReqToCallback = options.passReqToCallback;
}

/**
 * Inherit from 'passort.Strategy'
 */
util.inherits(WechatStrategy, passport.Strategy);

WechatStrategy.prototype.authenticate = function (req, options) {

  if (!req._passport) {
    return this.error(new Error('passport.initialize() middleware not in use'));
  }

  var self = this;

  options = options || {};

  // 获取code,并校验相关参数的合法性
  // No code only state --> User has rejected send details. (Fail authentication request).
  if (req.query && req.query.state && (!req.query.code || !req.query.encryptedData || !req.query.iv)) {
    return self.fail(401);
  }

  // Documentation states that if user rejects userinfo only state will be sent without code
  // In reality code equals "authdeny". Handle this case like the case above. (Fail authentication request).
  if (req.query && req.query.code === 'authdeny') {
    return self.fail(401);
  }

  // 获取code授权成功
  if (req.query && req.query.code && req.query.encryptedData && req.query.iv) {

    var code = req.query.code;
    var encryptedData = req.query.encryptedData;
    var iv = req.query.iv;

    console.log(code, encryptedData, iv)

    self._oauth.getUserByCode({
      code,
      encryptedData,
      iv
    }, function (err, response) {
      // 校验完成信息
      function verified(err, user, info) {
        if (err) {
          return self.error(err);
        }
        if (!user) {
          return self.fail(info);
        }
        self.success(user, info);
      }

      if (err) {
        return self.error(err);
      }
      
      debug('fetch data -> \n %s', JSON.stringify(response, null, ' '));

      var params = response;
      
      var profile = {
        openid: params['openid'],
        unionid: params['unionid'],
        nickName: params['nickName'],
        avatarUrl: params['avatarUrl']
      };

      try {
        if (self._passReqToCallback) {
          self._verify(req, profile, verified);
        } else {
          self._verify(profile, verified);
        }
      } catch (ex) {
        return self.error(ex);
      }
    });
  } else {
    req = req.ctx ? req.ctx : req
    var defaultURL = req.protocol + '://' + req.get('Host') + req.originalUrl;
    var state = typeof options.state === 'function' ? options.state(req) : (options.state || self._state),
      callbackURL = options.callbackURL || self._callbackURL || defaultURL;

    var location = `${req.protocol}://${req.get('Host')}/login/miniprogram?redirect=${callbackURL}&state=${state}`

    debug('redirect -> \n%s', location);
    self.redirect(location, 302);
  }
};

module.exports = WechatStrategy;
