'use strict';

const { resolve, relative } = require('path');
const fs     = require('fs-extra');
const del    = require('del');
const colors = require('../colors');
const {
    dist,
    built,
    doc,
    report,
    coverage,
    metrics,
    api,
    type,
    temp,
} = require('../config').dir;
const { cleanEmptyDir } = require('./misc');

const COMMAND = 'clean';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND}`)
        .description('clean directory')
        .option('-C, --cache',      'for preset cache dirctory')
        .option('-W, --temp',       'for temp dirctory')
        .option('-b, --built',      'for built dirctory')
        .option('-d, --doc',        'for generated doc dirctory')
        .option('-D, --dist',       'for dist dirctory')
        .option('-T, --type',       'for type dirctory')
        .action((options) => {
            cmd.action = COMMAND;
            const { cwd, silent, target, all } = commander.opts();
            const { cache, temp, built, doc, report, dist, type } = options;
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                target: target && target.split(','),
                all,
                temp: temp || cache,
                built: built || cache,
                doc,
                report,
                dist,
                type,
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task clean                          for cache directory (default)
  $ cdp-task clean --built --type           for built and type
  $ cdp-task clean --target=<path>          for specified target path
  $ cdp-task clean --all                    for all generated files and directories
`
            );
        });

    return '  $ cdp-task clean [option]                  clean projet directory';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
        target: null,
        all: false,
        temp: true,
        built: true,
        doc: false,
        dist: false,
        type: false,
    };
}

async function exec(options) {
    options = options || defaultOptions();
    const { cwd, silent } = options;

    const rootName = (() => {
        let name = cwd;
        try {
            name = require(resolve(cwd, 'package.json')).name;
        } catch (e) {
            // noop
        }
        return name;
    })();

    const info = (path) => {
        if (!silent) {
            const target = relative(cwd, path);
            console.log(colors.gray(`  ${target}`));
        }
    };

    if (!silent) {
        console.log(colors.cyan(`clean: ${rootName}`));
    }

    if (options.all || options.temp) {
        const tempDir = resolve(cwd, temp);
        fs.removeSync(tempDir);
        info(tempDir);
    }
    if (options.all || options.built) {
        const builtDir = resolve(cwd, built);
        fs.removeSync(builtDir);
        info(builtDir);
    }
    if (options.all || options.doc) {
        const docDir = resolve(cwd, doc);
        const docApiDir = resolve(docDir, api);
        fs.removeSync(docApiDir);
        info(docApiDir);
        const reportDir = resolve(docDir, report);
        const reportCoverageDir = resolve(reportDir, coverage);
        fs.removeSync(reportCoverageDir);
        info(reportCoverageDir);
        const reportMetricsDir = resolve(reportDir, metrics);
        fs.removeSync(reportMetricsDir);
        info(reportMetricsDir);
        cleanEmptyDir(docDir);
    }
    if (options.all || options.dist) {
        const distDir = resolve(cwd, dist);
        del.sync(['**/*'], { cwd: distDir });
        info(distDir);
        cleanEmptyDir(distDir);
    }
    if (options.all || options.type) {
        const typeDir = resolve(cwd, type);
        del.sync(['**/*.d.ts', '!**/_*.d.ts'], { cwd: typeDir });
        info(typeDir);
        cleanEmptyDir(typeDir);
    }
    if (options.target) {
        const targets = Array.isArray(options.target) ? options.target : [options.target];
        const deleted = del.sync(targets);
        for (const d of deleted) {
            info(d);
        }
    }
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
