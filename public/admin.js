define('admin/plugins/sso-miniprogram', ['settings'], function(Settings) {
    'use strict';
    /* globals $, app, socket, require */

    var ACP = {};

    ACP.init = function() {
        Settings.load('sso-miniprogram', $('.sso-miniprogram-settings'));

        $('#save').on('click', function() {
            Settings.save('sso-miniprogram', $('.sso-miniprogram-settings'), function() {
                app.alert({
                    type: 'success',
                    alert_id: 'sso-miniprogram-saved',
                    title: 'Settings Saved',
                    message: 'Please reload your NodeBB to apply these settings',
                    clickfn: function() {
                        socket.emit('admin.reload');
                    }
                });
            });
        });
    };

    return ACP;
});
