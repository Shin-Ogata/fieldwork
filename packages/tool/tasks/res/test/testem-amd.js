/* eslint-disable camelcase */

const path       = require('path');
const fs         = require('fs');
const http       = require('http');
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
                '--headless',
                '--remote-debugging-port=9222',
                '--disable-gpu'
            ],
        },
    },
    test_page: `${config.dir.temp}/testem/testem.index.mustache`,
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
