'use strict';

const { resolve, dirname }            = require('path');
const { ensureDirSync, copyFileSync } = require('fs-extra');
const glob                            = require('glob');
const chalk                           = require('chalk');

const COMMAND = 'copy';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <source> <dest>`)
        .description('copy source to destination')
        .action((source, dest, options) => {
            cmd.action = COMMAND;
            const { cwd, silent } = commander;
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                globs: source.split(','),
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

function parseGlobs(globs) {
    const source = [];
    const ignore = [];

    for (const g of globs) {
        if ('!' === g[0]) {
            ignore.push(g.substring(1));
        } else {
            source.push(g);
        }
    }

    return { source, ignore };
}

async function exec(options) {
    options = options || defaultOptions();

    const { cwd, silent, globs, dest } = options;
    const { source, ignore } = parseGlobs(globs);
    const dstRoot = resolve(cwd, dest);

    for (const s of source) {
        const files = glob.sync(s, {
            cwd,
            nodir: true,
            ignore,
        });
        for (const f of files) {
            const src = resolve(cwd, f);
            const dst = resolve(dstRoot, f);
            ensureDirSync(dirname(dst));
            copyFileSync(src, dst);
            if (!silent) {
                console.log(chalk.gray(`copied: ${dst}`));
            }
        }
    }
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
