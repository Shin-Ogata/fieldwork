'use strict';

const { relative } = require('path');

module.exports = setSourceMapRoot;

function setSourceMapRoot({ relativePath, sourceRoot } = {}) {
    const replacePath = src => relative(relativePath, src).replace(/\\/g, '/').replace(/^\w+:\/(?!\/)/, '$&/');
    return Object.freeze({
        name: 'sourcemap-root',
        generateBundle(outputOptions, bundle = {}) {
            for (const { map } of Object.values(bundle)) {
                if (!map) {
                    return;
                }
                if (relativePath && Array.isArray(map.sources)) {
                    map.sources = map.sources.map(replacePath);
                }
                if (sourceRoot) {
                    map.sourceRoot = sourceRoot;
                }
            }
        },
    });
}
