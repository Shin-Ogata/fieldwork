'use strict';

const chalk    = require('chalk');
const { copy } = require('./misc');

const COMMAND = 'copy';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <source> <dest>`)
        .description('copy source to destination')
        .action((source, dest, options) => {
            cmd.action = COMMAND;
            const { cwd, silent } = commander.opts();
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                globs: source.split(';'),
                dest,
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task copy "src/**/*.{png,jpg}" dst  copy source to destination
`
            );
        });

    return '  $ cdp-task copy <source> <dest>            copy source to destination';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
        globs: [],
        dest: null,
    };
}

async function exec(options) {
    options = options || defaultOptions();

    const { cwd, silent, globs, dest } = options;
    console.log(`globs: ${JSON.stringify(globs)}`);
    const callback = silent ? null : (dst) => { console.log(chalk.gray(`  ${dst}`)); };
    !silent && console.log('copied:');
    copy(globs, dest, { cwd, callback });
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
