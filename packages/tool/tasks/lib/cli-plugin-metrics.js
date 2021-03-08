'use strict';

const { resolve }   = require('path');
const { promisify } = require('util');
const {
    existsSync,
    writeFileSync,
    moveSync,
} = require('fs-extra');
const glob  = promisify(require('glob'));
const chalk = require('chalk');
const plato = require('es6-plato');
const { dropSourceMap } = require('./source-map-utils');
const config = require('../config');

const COMMAND = 'metrics';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND}`)
        .description('run metrics analyzer')
        .option('-r, --resolution [mode]',  `set 'file' or 'module' default: file`, /^(file|module)$/i)
        .option('-l, --lint <path>',        'specified linter config file path (default: none)')
        .option('-e, --engine',             'specified analyzer engine (default: plato)')
        .option('-p, --packages <layer>',   'specified <mono-repo-root>/<packages>/<layer>, root only available')
        .action((options) => {
            cmd.action = COMMAND;
            const { cwd, silent, target } = commander.opts();
            const { resolution, lint, engine, packages } = options;
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                target: target && target.split(','),
                resolution: resolution || 'file',
                lint,
                engine: engine || 'plato',
                layer: packages && packages.split(','),
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task metrics                      run metrics analyzer
`
            );
        });

    return '  $ cdp-task metrics -r <file|module>        run metrics analyzer';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
        target: null,
        resolution: 'file',
        lint: null,
        layer: null,
        engine: 'plato',
    };
}

async function queryTargets(options) {
    const queryByPackage = async (pkgDir, resolution) => {
        const pkgConfig = config.query(pkgDir);

        const { dir, ignore } = (() => {
            switch (resolution) {
                case 'file':
                    return { dir: pkgConfig.dir.built, ignore: pkgConfig.metrics.ignore };
                case 'module':
                    return { dir: pkgConfig.dir.dist, ignore: pkgConfig.metrics.ignore };
                default:
                    throw `unknown resolution: ${resolution}`;
            }
        })();

        return (await glob(`${dir}/**/*.js`, {
            cwd: pkgDir,
            nodir: true,
            ignore,
        })).map(f => resolve(pkgDir, f));
    };

    const { cwd, target, resolution, layer } = options;

    const tgtPackages = await (async () => {
        if (target) {
            return Array.isArray(target) ? target : [target];
        } else if (layer) {
            return require('./resolve-dependency')(options);
        } else {
            return [cwd];
        }
    })();

    const targets = [];
    for (const t of tgtPackages) {
        targets.push(...(await queryByPackage(t, resolution)));
    }
    return targets;
}

function patch(src) {
    return dropSourceMap(src)
        // aboid `?.` [Optional Chaining]
        .replace(/\?\.\[/gm, '[')
        .replace(/\?\.\(/gm, '(')
        .replace(/\?\./gm, '.')
        // aboid `??` [Nullish Coalescing]
        .replace(/\?\?/gm, '||')
    ;
}

async function runPlato(options) {
    const targets = await queryTargets(options);

    const backup = targets.map((tgt) => {
        const bak = `${tgt}.bak`;
        const src = (() => {
            const mjs = tgt.replace(/.js$/, '.mjs');
            return existsSync(mjs) ? mjs : bak;
        })();
        moveSync(tgt, bak, { overwrite: true });
        writeFileSync(tgt, patch(src));
        return { org: tgt, bak };
    });
    const restore = () => {
        for (const bk of backup) {
            moveSync(bk.bak, bk.org, { overwrite: true });
        }
    };

    const { metrics } = config;
    const { cwd, resolution, lint } = options;

    const outDir = resolve(cwd, metrics.out, resolution);
    const eslint = lint && resolve(cwd, lint);
    const title = metrics.title || `Source Analysis ${config.pkg.name}:${resolution}`;

    return new Promise((resolve) => {
        plato.inspect(targets, outDir, { title, eslint: eslint || false }, () => {
            restore();
            resolve();
        });
    });
}

async function runCustom(options) {
    // eslint-disable-next-line no-useless-catch
    try {
        console.log(chalk.red(`custom engine: ${options.engine} is not available yet.`));
        process.exit(1);
    } catch (e) {
        throw e;
    }
}

async function exec(options) {
    options = options || defaultOptions();

    if ('plato' === options.engine) {
        await runPlato(options);
    } else {
        await runCustom(options);
    }
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
