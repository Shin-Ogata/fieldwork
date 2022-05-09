'use strict';

const {
    resolve,
    relative,
    dirname,
} = require('path');
const colors    = require('../colors');
const command   = require('../command');
const resolver  = require('./resolve-dependency');

const COMMAND = 'delegate';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <command>`)
        .description('delegate npm-script-command to sub packages')
        .option('-p, --preset',             'if preset command [eg: install, test] calling the options is required')
        .option('-l, --layer <package>',    'specified <mono-repo-root>/<packages>/<layer>')
        .option('-e, --exists',             `to avoid exiting with a non-zero exit code when the script is undefined. it's similar to pnpm's "--if-present" flag.`)
        .option('-d, --dry-run',            `dry run mode. you can check dependencies and command support status.`)
        .option('--no-dev',                 `exclude devDependencies.`)
        .action((command, options) => {
            cmd.action = COMMAND;
            const { cwd, silent, target } = commander.opts();
            const { preset, layer, exists, dryRun, dev } = options;
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                target: target && target.split(','),
                command: command + queryDelegateArgv(),
                preset,
                layer: layer && layer.split(','),
                exists,
                dryRun,
                dev,
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task delegate list -p -- --depth=1   delegate '$ npm list --depth=1'
  $ npm run set-version:to 0.9.0 -- -- -f    from mono-repo root
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
        exists: false,
        dryRun: false,
        dev: true,
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
        exists,
        dryRun,
        silent,
    } = options || defaultOptions();
    const { packages } = require('../config').dir;

    const root = resolve(cwdBackup, `${packages}`);
    const targets = (targetPackages && targetPackages.map(t => resolve(root, t))) || resolver(options).map(p => dirname(p.path));

    try {
        for (const target of targets) {
            // npm v7+: `--prefix` 指定では `npm install` 時に自身の link を張ってしまう. chdir 前提のため削除.
//          const prefix = preset ? `-C ${target} ` : 'run ';
            const prefix = preset ? `` : 'run ';
            process.chdir(target);

            if (!preset && exists) {
                const scripts = require(resolve(target, 'package.json')).scripts;
                if (null == scripts[delegateCommand]) {
                    continue;
                }
            }

            if (!silent) {
                const pkg = relative(root, target);
                console.log(colors.magenta('delegate:'));
                console.log(colors.magenta(`    target:  ${pkg}`));
                console.log(colors.magenta(`    command: ${delegateCommand}`));
            }

            if (!dryRun) {
                await command('npm', `${prefix}${delegateCommand}`);
            }
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
