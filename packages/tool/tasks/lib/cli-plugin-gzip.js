'use strict';

const { basename, dirname } = require('path');
const { ensureDirSync }     = require('fs-extra');
const colors                = require('../colors');
const { gzip }              = require('./misc');

const COMMAND = 'gzip';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <file> <directory>`)
        .description('create tar-gz file')
        .action((file, directory, options) => {
            cmd.action = COMMAND;
            const { cwd, silent } = commander.opts();
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                file,
                directory,
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task gzip file.tgz ./package        create tar-gz from directory
`
            );
        });

    return '  $ cdp-task gzip <file> <directory>         create tar-gz from directory';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
        file: null,
        directory: null,
    };
}

async function exec(options) {
    options = options || defaultOptions();

    const { cwd, silent, file, directory } = options;

    const dstDir = dirname(file);
    if (dstDir) {
        ensureDirSync(dstDir);
    }

    await gzip(file, directory, cwd);

    if (!silent) {
        console.log(colors.gray('created:'));
        console.log(colors.green(`  ${basename(file)}`));
    }
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
