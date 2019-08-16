'use strict';

const { global: GLOBAL } = require('@cdp/tasks/config').build;

// for global namespace object
const REPLACE_GLOBAL_NAMESPACE_KEY = `var ${GLOBAL}`;
const REPLACE_GLOBAL_NAMESPACE_VALUE = `globalThis.${GLOBAL} = globalThis.${GLOBAL} || {}`;

module.exports = {
    values: {
        [REPLACE_GLOBAL_NAMESPACE_KEY]: REPLACE_GLOBAL_NAMESPACE_VALUE,
    },
};
