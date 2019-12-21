'use strict';

function postproc(options = {}) {
    const { replacees } = options;
    const replacers = [];
    if (Array.isArray(replacees)) {
        replacers.push(...replacees);
    } else if ('object' === typeof replacees) {
        for (const key of replacees) {
            replacers.push({
                find: key,
                replacement: replacees[key],
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
