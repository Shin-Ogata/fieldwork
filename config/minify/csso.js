'use strict';

const { resolve, basename } = require('node:path');
const { sync: globSync } = require('glob');
const {
    config,
    merge,
} = require('@cdp/tasks');
const { toPOSIX } = require('@cdp/tasks/utils');
const { dist: DIST, domain: DOMAIN } = config.build;

const csso = {
    sourceMap: true,
};

function getConfig(options) {
    const targets = globSync(toPOSIX(`${DIST}/**/*.css`), { nodir: true, ignore: ['**/*.min.css'] }).map(css => {
        return {
            src: resolve(css),
            out: resolve(`${css.replace(/.css$/, '.min.css')}`),
            map: resolve(`${css.replace(/.css$/, '.min.map')}`),
            mapFileName: `${DOMAIN}:///${basename(css)}`,
        };
    });

    return merge({
        targets,
        csso,
    }, options);
}

module.exports = getConfig;
