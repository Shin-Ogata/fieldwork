/* eslint-disable camelcase */

const path       = require('node:path');
const fs         = require('node:fs');
const http       = require('node:http');
const { config } = require('@cdp/tasks');
const settings   = require('./testem.json');

let port = 7358;

const starServer = (context) => {
    return new Promise((resolve) => {
        const { request, port } = context;
        // start the server
        context.server = http.createServer(request).listen(port, (serverErr) => {
            resolve(serverErr);
        });
    });
};

const post = (executor) => {
    return Promise.resolve().then(executor);
};

const testem = {
    framework: 'jasmine2',
    launch_in_dev: ['chrome'],
    launch_in_ci: ['chrome'],
    browser_args: {
        chrome: {
            dev: [
                '--auto-open-devtools-for-tabs'
            ],
            ci: [
                /*
                 * options:
                 * https://developer.chrome.com/docs/chromium/headless?hl=ja
                 */
                // Chrome 129.0.6668.71 でウィンドウが出現中
                // https://issues.chromium.org/issues/367764867
                //
                // 将来削除される可能性があるため非推奨
                // '--headless=old',
                //
                // selenium の回避法
                // https://github.com/SeleniumHQ/selenium/issues/14514#issuecomment-2363690036
                '--window-position=-2400,-2400',
                //
                '--headless',
                '--remote-debugging-port=9222',
                '--disable-gpu'
            ],
        },
    },
    test_page: `${config.dir.temp}/testem/testem.index.mustache${settings.query_string}`,
    require_config: JSON.stringify(settings.requirejs_config),

// server settings

    contexts: [],

    proxies: {},

    before_tests(config, data, callback) {
        post(async () => {
            let error;
            for (const context of testem.contexts) {
                error = await starServer(context);
            }
            callback(error);
        });
    },

    after_tests(config, data, callback) {
        for (const context of testem.contexts) {
            context.server.close();
        }
        callback(null);
    },

    free_port() {
        return port++;
    },

    register_server(port, request) {
        testem.contexts.push({ port, request });
    },
};

const loadPlugins = () => {
    const plugins = [];
    const dir = path.resolve(__dirname, 'plugins');
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(file => /^plugin-/.test(file));
        for (const f of files) {
            const p = require(path.resolve(dir, f));
            plugins.push(p);
        }
    }
    return plugins;
};

for (const plugin of loadPlugins()) {
    const port = testem.free_port();
    const { proxies, request } = plugin(port);
    Object.assign(testem.proxies, proxies);
    testem.register_server(port, request);
}

module.exports = Object.assign({}, testem, settings);
