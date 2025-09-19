/* eslint-disable
    @stylistic/indent,
 */
'use strict';

const { existsSync, readFileSync } = require('node:fs');
const { resolve }                  = require('node:path');
const { pkg }                      = require('./config');

function buildDate() {
    return new Date().toISOString();
}

function defaultOptions() {
    return {
        name: pkg.name,
        description: pkg.description || '',
        date: buildDate(),
        version: pkg.version,
        resource: resolve(process.cwd(), 'BANNER'),
        ignoreResource: false,
    };
}

function banner(options) {
    const { name, description, date, version, resource, ignoreResource } = Object.assign({}, defaultOptions(), options);
    if (!ignoreResource && existsSync(resource)) {
        return readFileSync(resource).toString()
            .replace('@MODULE_NAME', name)
            .replace('@DESCRIPTION', description)
            .replace('@VERSION', version)
            .replace('@DATE', date)
            .replace(/ $/gm, '')
            .replace(/\r\n/gm, '\n')    // normalize line feed
        ;
    } else {
        const template =
`/*!
 * ${name} ${version}
 *   ${description}
 */
`;
        return template;
    }
}

module.exports = banner;
