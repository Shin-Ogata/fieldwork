const { mkdirSync, createWriteStream } = require('node:fs');
const { resolve } = require('node:path');
const { merge }   = require('@cdp/tasks');
const { dir }     = require('@cdp/tasks').config;
const settings    = require('./testem-amd');

const DOC_DIR      = resolve(__dirname, '../../', dir.doc);
const REPORTS_DIR  = resolve(DOC_DIR, dir.report);
const COVERAGE_DIR = resolve(REPORTS_DIR, dir.coverage);

// ensure coverage dir
mkdirSync(REPORTS_DIR, { recursive: true });
mkdirSync(COVERAGE_DIR, { recursive: true });

const port = settings.free_port();

const config = {
    proxies: {
        '/coverage': {
            'target': `http://localhost:${port}`,
        }
    },
};

settings.register_server(port, (req, res) => {
    console.log(`... Received coverage of ${req.headers['content-length']} length`);
    req.pipe(createWriteStream(resolve(COVERAGE_DIR, 'coverage.json')));
    req.on('end', res.end.bind(res));
});

module.exports = merge({}, config, settings);
