'use strict';

const { globalDeclaration } = require('@cdp/tasks/config').build;

// for global namespace object
const REPLACE_GLOBAL_DECLARATION_NAMESPACE_KEY   = `var ${globalDeclaration}`;
const REPLACE_GLOBAL_DECLARATION_NAMESPACE_VALUE = `globalThis.${globalDeclaration} = globalThis.${globalDeclaration} || {}`;

module.exports = {
    values: {
        [REPLACE_GLOBAL_DECLARATION_NAMESPACE_KEY]: REPLACE_GLOBAL_DECLARATION_NAMESPACE_VALUE,
    },
};
