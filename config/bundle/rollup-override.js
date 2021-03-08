'use strict';

const { merge } = require('@cdp/tasks');

function overrideConfig(config, options) {
    const { input, outputFile, sourcemapRoot, external: globals } = options || {};
    if (null != input) {
        config.input = input;
    }
    if (null != outputFile) {
        config.output[0].file = outputFile;
    }
    if (null != sourcemapRoot) {
        for (const [i, plugin] of config.plugins.entries()) {
            if (plugin && 'source-map-root' === plugin.name) {
                config.plugins[i] = sourcemapRoot;
            }
        }
    }
    if (null != globals) {
        const output = config.output[0];
        output.globals = output.globals || {};
        merge(output.globals, globals);
        merge(config.external, Object.keys(output.globals));
    }
}

module.exports = overrideConfig;
