'use strict';

const {
    resolve,
    relative,
    join,
    dirname,
    basename,
} = require('path');
const { promisify } = require('util');
const { readJSON, outputFile } = require('fs-extra');
const glob = promisify(require('glob'));
const chalk = require('chalk');

const MODULE_ROOT = resolve(__dirname, '..', 'node_modules/lit-html/development');
const SOURCE_ROOT = resolve(__dirname, '..', 'node_modules/lit-html/src');
const cwd = process.cwd();

async function makeMapFileList() {
    return (await glob(`${MODULE_ROOT}/**/*.js.map`, { nodir: true })).map(p => relative(MODULE_ROOT, p));
}

async function createSourceFiles(list) {
    for (const map of list) {
        const json = await readJSON(resolve(MODULE_ROOT, map));
        for (let i = 0, n = json.sources.length; i < n; i++) {
            const srcPath = join(SOURCE_ROOT, dirname(map), basename(json.sources[i]));
            await outputFile(srcPath, json.sourcesContent[i]);
            console.log(chalk.gray(`  created: ${relative(cwd, srcPath)}`));
        }
    }
}

async function main() {
    try {
        // skip setup from dependency
        if (cwd.includes('node_modules')) {
            return;
        }
        await createSourceFiles(await makeMapFileList());
    } catch (e) {
        console.error(chalk.red(`${e}`));
    }
}

main();