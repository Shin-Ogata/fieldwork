'use strict';

const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { test, doc, api } = require('@cdp/tasks/config').dir;
const { dependencies, name } = require(resolve('package.json'));

const exclude = [
    '**/node_modules/@types/{node,cordova}/**', // environment
    '**/node_modules/{electron,typescript}/**', // environment
    '**/node_modules/**/node_modules/**',       // 間接依存
    `**/${test}/**`,
];

const pkgs = [name, ...Object.keys(dependencies || {})].reduce((map, pkgName) => {
    const [name1, name2] = pkgName.split('/');
    map[name1] || (map[name1] = []);
    name2 && map[name1].push(name2);
    return map;
}, {});

const scopes = Object.keys(pkgs);
exclude.push(`**/node_modules/!(${scopes.sort().join('|')})/**`);
for (const scope of scopes) {
    const names = pkgs[scope];
    names.length > 0 && exclude.push(`**/node_modules/${scope}/!(${names.sort().join('|')})/**`);
}
// console.log(exclude);

module.exports = {
    cleanOutputDir: false,
//  entryPointStrategy: 'resolve',
    exclude,
    excludeExternals: true,
    excludePrivate: true,
    hideGenerator: true,
//  logger: 'none',
    logLevel: 'Error',
    name,
    out: resolve(`${doc}/${api}`),
    readme: existsSync(resolve('README.md')) ? 'README.md' : 'none',
};
