/* eslint-disable camelcase */

const { resolve } = require('path');
const fs          = require('fs-extra');
const { merge }   = require('lodash');
const { dir }     = require('@cdp/tasks').config;
const settings    = require('./testem-amd');

const DOC_DIR      = resolve(__dirname, '../../', dir.doc);
const REPORTS_DIR  = resolve(DOC_DIR, dir.report);
const COVERAGE_DIR = resolve(REPORTS_DIR, dir.coverage);

// ensure coverage dir
fs.ensureDirSync(REPORTS_DIR);
fs.ensureDirSync(COVERAGE_DIR);

const port = 7359;
const config = {
    proxies: {
        '/coverage': {
            'target': `http://localhost:${port}`,
        }
    },
};

settings.register_server(port, (req, res) => {
    console.log(`... Received coverage of ${req.headers['content-length']} length`);
    req.pipe(fs.createWriteStream(resolve(COVERAGE_DIR, 'coverage.json')));
    req.on('end', res.end.bind(res));
});

module.exports = merge({}, config, settings);
