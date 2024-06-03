'use strict';

const { resolve } = require('node:path');
const colors = require('../colors');
const { link } = require('./misc');

const COMMAND = 'link';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <source> <dest>`)
        .description('symbolic link source to destination')
        .action((source, dest, options) => {
            cmd.action = COMMAND;
            const { cwd, silent } = commander.opts();
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                source,
                dest,
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task link "src/res" dst  link source file or directory to destination
`
            );
        });

    return '  $ cdp-task link <source> <dest>            link source to destination';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
        source: null,
        dest: null,
    };
}

async function exec(options) {
    options = options || defaultOptions();

    const { cwd, silent, source, dest } = options;
    !silent && console.log('linked:');
    link(source, dest, { cwd });
    !silent && console.log(colors.gray(`  ${resolve(cwd, dest)}`));
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
