/* eslint-disable camelcase */

const path       = require('node:path');
const fs         = require('node:fs');
const http       = require('node:http');
const express    = require('express');
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
                '--headless',
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

    middleware: [
        (app) => {
            const serverRoot = path.resolve(process.cwd(), config.dir.temp);
            const serverStatic = express.static(serverRoot, { dotfiles: 'allow', fallthrough: false });
            const replyAsStatic = (req, res, next) => {
                serverStatic(req, res, (err) => {
                    // .temp 配下の未存在ファイルは Testem 本体へ委譲せず 404 を返す
                    if (err && (404 === err.status || 'ENOENT' === err.code)) {
                        res.status(404).send('Not Found');
                        return;
                    }
                    next(err);
                });
            };

            const safeServerStatic = (req, res, next) => {
                // テンプレート系は Testem 本体に委譲する
                if (/\.mustache(?:$|\?)/.test(req.path)) {
                    next();
                    return;
                }

                // iframe の DOMContentLoaded 監視登録競合を避けるため HTML 返却を少し遅延
                if (/\.html(?:$|\?)/.test(req.path)) {
                    res.setHeader('Cache-Control', 'no-store');
                    setTimeout(() => {
                        replyAsStatic(req, res, next);
                    }, 20);
                    return;
                }

                replyAsStatic(req, res, next);
            };

            // .mustache は Testem 側で render させる
            app.use(`/:id/${config.dir.temp}`, safeServerStatic);
            app.use(`/${config.dir.temp}`, safeServerStatic);
        },
    ],
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
