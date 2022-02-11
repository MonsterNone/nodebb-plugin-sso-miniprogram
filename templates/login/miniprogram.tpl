<!DOCTYPE html>
<html lang="en">

<head>
    <title>小程序登录</title>
    <script type="text/javascript" src="https://res.wx.qq.com/open/js/jweixin-1.3.2.js"></script>
</head>

<body>
    <p id="noti"></p>
    <script>
        let noti_ele = document.getElementById('noti')
        let ua = navigator.userAgent.toLowerCase();
        if (ua.match(/MicroMessenger/i) == "micromessenger") {
            //ios的ua中无miniProgram，但都有MicroMessenger（表示是微信浏览器）
            wx.miniProgram.getEnv((res) => {
                if (res.miniprogram) {
                    noti_ele.innerHTML = '打开小程序页面...'
                    let params = (new URL(document.location)).searchParams;
                    let redirect = params.get('redirect')
                    let state = params.get('state')
                    wx.miniProgram.navigateTo({
                        url: '/pages/webview/login',
                        success: function (res) {
                            res.eventChannel.emit('options', {
                                redirect,
                                state
                            })
                        }
                    })
                } else {
                    noti_ele.innerHTML = '请在小程序内打开'
                }
            })
        } else {
            noti_ele.innerHTML = '请在微信小程序内打开'
        }
    </script>
</body>

</html>