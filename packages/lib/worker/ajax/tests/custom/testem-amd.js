/* eslint-disable camelcase */

const http       = require('http');
const { parse }  = require('querystring');
const { config } = require('@cdp/tasks');
const settings   = require('./testem.json');

const test_root = `${config.dir.temp}/testem`;

const require_paths = [];
for (const key of Object.keys(settings.require_config.paths)) {
    require_paths.push({ name: key, path: settings.require_config.paths[key] });
}

const port = 7358;
const _serverContext = [];

function starServer(context) {
    return new Promise((resolve) => {
        // start the server
        context.server = http.createServer(context.request).listen(context.port, (serverErr) => {
            resolve(serverErr);
        });
    });
}

function post(executor) {
    return Promise.resolve().then(executor);
}

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
    test_root,
    test_page: `${test_root}/testem.index.mustache`,
    require_paths,

    proxies: {
        '/api': {
            'target': `http://localhost:${port}`,
        }
    },

    before_tests: (config, data, callback) => {
        post(async () => {
            let error;
            for (const context of _serverContext) {
                error = await starServer(context);
            }
            callback(error);
        });
    },

    after_tests: (config, data, callback) => {
        for (const context of _serverContext) {
            context.server.close();
        }
        callback(null);
    },

    register_server: (portNo, request) => {
        _serverContext.push({ port: portNo, request });
    },
};

testem.register_server(port, (req, res) => {
    setTimeout(() => {
//      console.log(JSON.stringify(req.headers, null, 4));
//      console.log(JSON.stringify(req.trailers, null, 4));
//      console.log(req.url);
        const { headers } = req;
        if (headers['content-type'] && headers['content-type'].includes('application/json')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ API: 'JSON response' }));
        } else {
            let data = '';
            while (null !== (chunk = req.setEncoding('utf8').read())) {
                data += chunk;
            }
            const params = parse(data);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(JSON.stringify({ API: req.method, data: params }));
        }
    }, 200);
});

module.exports = Object.assign({}, testem, settings);
