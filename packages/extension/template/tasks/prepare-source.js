'use strict';

const {
    resolve,
    relative,
    join,
    dirname,
    basename,
} = require('node:path');
const {
    readFile,
    writeFile,
    mkdir,
} = require('node:fs/promises');
const { glob } = require('glob');
const { toPOSIX } = require('@cdp/tasks/utils');
const colors = require('@cdp/tasks/colors');

const MODULE_ROOT = resolve(__dirname, '..', 'node_modules/lit-html/development');
const SOURCE_ROOT = resolve(__dirname, '..', 'node_modules/lit-html/src');
const cwd = process.cwd();

async function makeMapFileList() {
    return (await glob(toPOSIX(`${MODULE_ROOT}/**/*.js.map`), { nodir: true })).map(p => relative(MODULE_ROOT, p));
}

async function createSourceFiles(list) {
    for (const map of list) {
        const json = JSON.parse((await readFile(resolve(MODULE_ROOT, map))).toString());
        for (let i = 0, n = json.sources.length; i < n; i++) {
            const srcPath = join(SOURCE_ROOT, dirname(map), basename(json.sources[i]));
            await mkdir(dirname(srcPath), { recursive: true });
            await writeFile(srcPath, json.sourcesContent[i]);
            console.log(colors.gray(`  created: ${relative(cwd, srcPath)}`));
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
        console.error(colors.red(`${e}`));
    }
}

main();
