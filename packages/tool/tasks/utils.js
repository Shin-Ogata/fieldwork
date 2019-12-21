'use strict';

const misc = require('./lib/misc');
const {
    packageName: PACKAGE,
    domain: DOMAIN,
} = require('./config').build;

// post-replace に指定するテストモジュールのロケーションの解決
function resolveNodeTesteeValue() {
    const find = new RegExp(`require\\('${PACKAGE}'\\)`, 'gm');
    const replacement = `require('${PACKAGE.replace(`@${DOMAIN}`, '.')}')`;
    return { find, replacement };
}

module.exports = Object.assign({}, misc, {
    resolveNodeTesteeValue,
});
