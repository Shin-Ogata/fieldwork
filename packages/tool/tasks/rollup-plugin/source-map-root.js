'use strict';

const { relative } = require('path');

function refrect(opts, content, map) {
    const { VERSION } = require('rollup');
    const semver      = require('semver');

    const { sourcemap } = opts;
    if (!sourcemap || semver.lt(VERSION, '3.0.0')) {
        // noop
        return;
    }

    if ('inline' === sourcemap) {
        const { appendInlineSourceMap } = require('../lib/source-map-utils');
        content.code = appendInlineSourceMap(content.code, map);
    } else {
        content.source = JSON.stringify(map);
    }
}

function setSourceMapRoot({ relativePath, sourceRoot } = {}) {
    const [domain] = sourceRoot ? sourceRoot.split(':') : [''];
    const regexNS = new RegExp(`^([\\s\\S]+)(/@${domain}/)([\\s\\S]+)$`);
    const replacePath = src => relative(relativePath, src)
        .replace(/\\/g, '/')
        .replace(/^\w+:\/(?!\/)/, '$&/')
        .replace(regexNS, '$3')
        .replace(/^\.\.\/node_modules\//, '')
    ;
    return Object.freeze({
        name: 'source-map-root',
        generateBundle(outputOptions, bundle) {
            for (const content of Object.values(bundle)) {
                const { map: srcmap, source } = content;
                const map = srcmap || JSON.parse(source);
                if (!map) {
                    continue;
                }
                if (relativePath && Array.isArray(map.sources)) {
                    // `sourcemapPathTransform` option available
                    map.sources = map.sources.map(replacePath);
                }
                if (sourceRoot) {
                    map.sourceRoot = sourceRoot;
                }
                refrect(outputOptions, content, map);
            }
        },
    });
}

module.exports = setSourceMapRoot;
