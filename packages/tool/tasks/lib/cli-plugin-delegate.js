'use strict';

const { resolve, relative } = require('path');
const chalk     = require('chalk');
const command   = require('../command');
const resolver  = require('./resolve-dependency');

const COMMAND = 'delegate';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <command>`)
        .description('delegate npm-script-command to sub packages')
        .option('-p, --preset',             'if preset command [eg: install, test] calling the options is required')
        .option('-l, --layer <package>',    'specified <mono-repo-root>/<packages>/<layer>')
        .action((command, options) => {
            cmd.action = COMMAND;
            const { cwd, silent, target } = commander;
            const { preset, layer } = options;
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                target: target && target.split(','),
                command: command + queryDelegateArgv(),
                preset,
                layer: layer && layer.split(','),
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task delegate list -- --depth=1   delegate '$ npm list --depth=1'
  $ npm run set-version 0.9.0 -- -- -f    from mono-repo root
                                          scripts: {
                                            "set-version": "cdp-task delegate set-version --layer=framework -- "
                                          }
`
            );
        });

    return '  $ cdp-task delegate <cmd> -- [option]      delegate npm-script-command to sub packages';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
        target: null,
        command: 'list --depth=1',
        preset: false,
        layer: null,
    };
}

function queryDelegateArgv() {
    const argv = process.argv.slice(2);
    if (0 < argv.length) {
        let delegateArgv;
        for (const arg of argv) {
            if (!delegateArgv && '--' === arg) {
                delegateArgv = [];
            } else if (delegateArgv) {
                delegateArgv.push(arg);
            }
        }
        if (delegateArgv) {
            return ` ${delegateArgv.join(' ')}`;
        }
    }
    return '';
}

async function exec(options) {
    const {
        cwd: cwdBackup,
        target: targetPackages,
        command: delegateCommand,
        preset,
        silent,
    } = options || defaultOptions();
    const { packages } = require('../config').dir;

    const root = resolve(cwdBackup, `${packages}`);
    const targets = (targetPackages && targetPackages.map(t => resolve(root, t))) || await resolver(options);

    try {
        for (const target of targets) {
            const pkg = relative(root, target);

            if (!silent) {
                console.log(chalk.magenta('delegate:'));
                console.log(chalk.magenta(`    target:  ${pkg}`));
                console.log(chalk.magenta(`    command: ${delegateCommand}`));
            }

            const prefix = preset ? `-C ${target} ` : 'run ';
            process.chdir(target);
            await command('npm', `${prefix}${delegateCommand}`);
        }
    } finally {
        process.chdir(cwdBackup);
    }
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
