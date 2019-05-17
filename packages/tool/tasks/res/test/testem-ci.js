/* eslint-disable camelcase */

const { resolve } = require('path');
const fs          = require('fs-extra');
const http        = require('http');
const { dir }     = require('@cdp/tasks').config;
const settings    = require('./testem-amd');

const DOC_DIR       = resolve(__dirname, '../../', dir.doc);
const REPORTS_DIR   = resolve(DOC_DIR, dir.report);
const COVERAGE_DIR = resolve(REPORTS_DIR, dir.coverage);

// ensure coverage dir
fs.ensureDirSync(REPORTS_DIR);
fs.ensureDirSync(COVERAGE_DIR);

let server;
const port = 7358;

const config = {
    proxies: {
        '/coverage': {
            'target': `http://localhost:${port}`,
        }
    },

    before_tests: (config, data, callback) => {
        // start the server
        server = http.createServer((req, res) => {
            console.log(`... Received coverage of ${req.headers['content-length']} length`);
            req.pipe(fs.createWriteStream(resolve(COVERAGE_DIR, 'coverage.json')));
            req.on('end', res.end.bind(res));
        }).listen(port, (serverErr) => {
            console.log(` Listening for coverage on ${port}`);
            callback(serverErr);
        });
    },

    after_tests: (config, data, callback) => {
        server.close();
        callback(null);
    },
};

module.exports = Object.assign({}, config, settings);
