'use strict';

const { existsSync, ensureDirSync } = require('fs-extra');
const { resolve } = require('path');
const chalk       = require('chalk');
const download    = require('@cdp/tasks/downloader');
const libVersion  = require('./query-version');

async function main() {
    try {
        const directory = resolve(__dirname, '../node_modules');
        const tarball   = resolve(directory, 'i18next.tar.gz');
        if (existsSync(tarball)) {
            return;
        }

        console.log(chalk.cyan('preparing i18next tarball...'));
        ensureDirSync(directory);
        const url = `https://github.com/i18next/i18next/archive/v${libVersion}.tar.gz`;
        await download(url, tarball);
        console.log(chalk.green('done.'));
    } catch (e) {
        console.error(chalk.red(`${e}`));
    }
}

main();
