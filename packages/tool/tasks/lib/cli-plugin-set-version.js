'use strict';

const { resolve, basename } = require('node:path');
const { existsSync, writeFileSync } = require('node:fs');
const { valid, lte } = require('semver');
const colors = require('../colors');

const COMMAND = 'set-version';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <version>`)
        .alias('sv')
        .description('set version to the package.json')
        .option('-f, --force', 'for force update (permit decriment)')
        .action((version, options) => {
            cmd.action = COMMAND;
            const { cwd, silent, target } = commander.opts();
            const { force } = options;
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                target: target && target.split(','),
                version,
                force,
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task set-version 1.0.1              set version to the package.json
`
            );
        });

    return '  $ cdp-task set-version <version>           set version to the package.json';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
        target: null,
        version: null,
        force: false,
    };
}

async function exec(options) {
    options = options || defaultOptions();

    const { cwd, silent, target, version, force } = options;

    if (!valid(version)) {
        throw new RangeError(`invalid version: ${version}`);
    }

    const targets = (() => {
        if (target) {
            return Array.isArray(target) ? target : [target];
        } else {
            return [
                resolve(cwd, 'package.json'),
                resolve(cwd, 'package-lock.json'),
            ];
        }
    })();

    for (const t of targets) {
        if (existsSync(t)) {
            const pkg = require(t);
            if (typeof pkg !== 'object') {
                console.log(colors.red(`error:   ${t} is not package.json.`));
                continue;
            }

            if (pkg.version === version) {
                console.log(colors.gray(`skipped: ${pkg.name}`));
                console.log(colors.gray(`  ${pkg.version} (no update)`));
                continue;
            }

            if (!force && !lte(pkg.version, version)) {
                console.log(colors.yellow(`skipped: ${pkg.name}`));
                console.log(colors.yellow(`  invalid version setup. [from: ${pkg.version}, to: ${version}]`));
                continue;
            }

            const from = pkg.version;
            pkg.version = version;
            writeFileSync(t, JSON.stringify(pkg, null, 2).replace(/[\n\s]*$/, '\n')/* final line feed */);
            if (!silent) {
                console.log(colors.gray(`info: ${pkg.name}`));
                console.log(colors.gray(`  ${from} → ${version}`));
            }
        } else if ('package-lock.json' !== basename(t)) {
            console.log(colors.yellow(`warn:    ${t} not found.`));
        }
    }
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
