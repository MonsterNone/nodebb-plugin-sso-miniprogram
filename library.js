'use strict';

var user = require.main.require('./src/user'),
  meta = require.main.require('./src/meta'),
  db = require.main.require('./src/database'),
  passport = module.parent.require('passport'),
  passportMiniprogram = require('./passport-miniprogram').Strategy,
  nconf = module.parent.require('nconf'),
  async = module.parent.require('async');


//var constants = module.parent.require('../plugin_configs/sso_wechat_constants');
var constants = Object.freeze({
  'name': "小程序登录",
  'admin': {
    'icon': 'fa-weixin',
    'route': '/plugins/sso-miniprogram'
  }
});

var Wechat = {};

Wechat.getStrategy = function(strategies, callback) {
  meta.settings.get('sso-miniprogram', function(err, settings) {
    if (!err && settings.id && settings.secret) {
      passport.use(new passportMiniprogram({
        appID: settings.id,
        appSecret: settings.secret,
        callbackURL: nconf.get('url') + '/auth/miniprogram/callback'
      }, function(profile, done) {
				console.log("get wechat profile: ", profile);
        Wechat.login(profile.openid, profile.unionid, profile.nickName, profile.avatarUrl, function(err, user) {
          if (err) {
            return done(err);
          }
          done(null, user);
        });
      }));
      strategies.push({
        name: 'wechat',
        url: '/auth/miniprogram',
        callbackURL: '/auth/miniprogram/callback',
        icon: 'fa-weixin',
        scope: ''
      });
    }
    callback(null, strategies);
  });
};

Wechat.getAssociation = function(data, callback) {
  user.getUserField(data.uid, 'wxid', function(err, wxid) {
    if (err) {
      return callback(err, data);
    }

    if (wxid) {
      data.associations.push({
        associated: true,
        name: constants.name,
        icon: constants.admin.icon
      });
    } else {
      data.associations.push({
        associated: false,
        url: nconf.get('url') + '/auth/miniprogram',
        name: constants.name,
        icon: constants.admin.icon
      });
    }

    callback(null, data);
  })
};

Wechat.addMenuItem = function(custom_header, callback) {
  custom_header.authentication.push({
    "route": constants.admin.route,
    "icon": constants.admin.icon,
    "name": constants.name
  });

  callback(null, custom_header);
};

Wechat.login = function(wxid, uninoid, nickname, avatarurl, callback) {
  console.log(wxid, uninoid, nickname, avatarurl)
  Wechat.getUidByWechatId(wxid, function(err, uid) {
    if (err) {
      return callback(err);
    }

    if (uid !== null) {
      // Existing User
      callback(null, {
        uid: uid
      });
    } else {
			// New User
			var success = function(uid) {
				// Save google-specific information to the user
				user.setUserField(uid, 'wxid', wxid);
				db.setObjectField('wxid:uid', wxid, uid);

				async.waterfall([
					async.apply(user.getUserFields, uid, 'picture'),
					function(info, next) {
						if (!info.picture && avatarurl) {
							user.setUserField(uid, 'uploadedpicture', avatarurl);
							user.setUserField(uid, 'picture', avatarurl);
						}
						next();
					}
				], function (err) {
					callback(err, {
						uid: uid
					});
				});
			};

      user.create({
        username: nickname,
				registerFrom: 'miniprogram'
      }, function(err, uid) {
        if (err) {
          return callback(err);
        }
				success(uid);
      });
    }
  });
};

Wechat.getUidByWechatId = function(wxid, callback) {
  db.getObjectField('wxid:uid', wxid, function(err, uid) {
    if (err) {
      return callback(err);
    }
    callback(null, uid);
  });
};

Wechat.deleteUserData = function(uid, callback) {
  async.waterfall([
    async.apply(user.getUserField, uid, 'wxid'),
    function(oAuthIdToDelete, next) {
      db.deleteObjectField('wxid:uid', oAuthIdToDelete, next);
    }
  ], function(err) {
    if (err) {
      console.error('[sso-wechat] Could not remove OAuthId data for uid ' + uid + '. Error: ' + err);
      return callback(err);
    }
    callback(null, uid);
  });
};

Wechat.init = function(data, callback) {
  function renderAdmin(req, res) {
    res.render('admin/plugins/sso-miniprogram', {
      callbackURL: nconf.get('url') + '/auth/miniprogram/callback'
    });
  }

  function renderMpLoginPage(req, res) {
    res.render('login/miniprogram')
  }

  data.router.get('/admin/plugins/sso-miniprogram', data.middleware.admin.buildHeader, renderAdmin);
  data.router.get('/api/admin/plugins/sso-miniprogram', renderAdmin);
  data.router.get('/login/miniprogram', renderMpLoginPage);

  callback();
};

module.exports = Wechat;
