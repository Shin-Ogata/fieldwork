'use strict';

function postproc(options = {}) {
    const { replaces } = options;
    const replacers = [];
    if (Array.isArray(replaces)) {
        replacers.push(...replaces);
    } else if ('object' === typeof replaces) {
        for (const key of replaces) {
            replacers.push({
                find: key,
                replacement: replaces[key],
            });
        }
    }

    return Object.freeze({
        name: 'post-process',
        generateBundle(outputOptions, bundle) {
            for (const content of Object.values(bundle)) {
                for (const replacer of replacers) {
                    const code = content.code.replace(replacer.find, replacer.replacement);
                    content.code = code;
                }
            }
        },
    });
}

module.exports = postproc;
