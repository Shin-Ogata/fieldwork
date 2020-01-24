'use strict';

const { relative } = require('path');

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
        generateBundle(outputOptions, bundle = {}) {
            for (const { map } of Object.values(bundle)) {
                if (!map) {
                    continue;
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

module.exports = setSourceMapRoot;
