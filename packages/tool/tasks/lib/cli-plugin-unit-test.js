/* eslint-disable
    @stylistic:js/indent,
 */
'use strict';

const { resolve } = require('node:path');
const {
    cpSync,
    rmSync,
    readdirSync,
} = require('node:fs');
const colors    = require('../colors');
const command   = require('../command');
const setup     = require('./setup-test-runner');
const remap     = require('./remap-coverage');
const { dist, temp, doc, report, coverage } = require('../config').dir;

const COMMAND = 'unit-test';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} [mode]`)
        .alias('ut')
        .description('run unit test')
        .option('-c, --config <path>',  'specified config file')
        .option('-O, --origin <dir>',   'specified instrument origin directory (for remap check)')
        .option('-R, --runner <path>',  'custom launcher script directory')
        .option('-r, --res <path>',     'resource directory')
        .option('-i, --info <any>',     'user definition option')
        .action((mode, options) => {
            const { config, origin, runner, res, info } = options;
            if ((!mode || 'ci' === mode) && !config) {
                console.log(colors.red.underline('for running unit-test, config-file is required.'));
                console.log('\nExamples:');
                console.log(`  $ cdp-task unit-test ${mode || ''}`, colors.cyan('--config=./test.config.js'));
                process.exit(0);
            }

            cmd.action = COMMAND;
            const { cwd, silent } = commander.opts();
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                mode: mode || '',
                config,
                origin,
                runner,
                res,
                info,
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task unit-test --config=<config>    launch unit-test runner (config-file is required)
  $ cdp-task unit-test ci --config=<config> run unit-test with continuous integration mode (config-file is required)
  $ cdp-task unit-test instrument           generate instrumented code by package configration
  $ cdp-task unit-test report               report coverage result by running unit-test
  $ cdp-task unit-test <npm-run-script>     run unit-test and coverage with nyc command
  $ cdp-task unit-test remap -O <temp>      check remap result
`
            );
        });

    return '  $ cdp-task unit-test [mode] [option]       unit-test operations';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
        target: null,
        mode: 'report',
        config: null,
        origin: null,
    };
}

function cleanCoverageDirectory(all, options) {
    const { cwd } = options;
    const coverageRoot = `./${doc}/${report}/${coverage}`;

    if (all) {
        rmSync(resolve(cwd, coverageRoot), { force: true, recursive: true });
    } else {
        readdirSync(resolve(cwd, coverageRoot))
            .forEach((file) => {
                if ('coverage.json' !== file) {
                    rmSync(resolve(cwd, coverageRoot, file), { force: true, recursive: true });
                }
            });
    }
}

function instrument() {
    // nyc 15.x 以降 [.cjs, .mjs, .ts, .tsx, .jsx] も default に含まれるため, `.js` のみを対象にする
    const extension = '--extension=.js';
    return command('nyc', `instrument ./${dist} ./${temp} --source-map=false ${extension}`);
}

function testem(ciMode) {
    if (ciMode) {
        return command('testem', `ci -f ${temp}/testem/testem-ci.js`);
    } else {
        return command('testem', `-f ${temp}/testem/testem-amd.js`);
    }
}

function nycHook(mode) {
    const script = mode.replace('run:', '');
    // eslint-disable-next-line @stylistic:js/max-len
    return command('nyc', `--source-map=false -s --report-dir=${doc}/${report}/${coverage} --temp-dir=${doc}/${report}/${coverage} -n=${temp}/** -x=${temp}/*-spec.js npm run ${script}`);
}

function resolveCoverageFile(options) {
    const { cwd } = options;
    const coverageRoot = `./${doc}/${report}/${coverage}`;
    const coveragePath = resolve(cwd, coverageRoot, 'coverage.json');

    // parse process info
    const procInfo = require(resolve(cwd, coverageRoot, 'processinfo/index.json'));
    for (const key of Object.keys(procInfo.processes)) {
        if (null != procInfo.processes[key].parent) {
            const src = resolve(cwd, coverageRoot, `${key}.json`);
            cpSync(src, coveragePath, { force: true, recursive: true });
            break;
        }
    }

    cleanCoverageDirectory(false, options);
}

function result() {
    // eslint-disable-next-line @stylistic:js/max-len
    return command('nyc', `report --reporter=lcov --reporter=html --reporter=text --report-dir=${doc}/${report}/${coverage} --temp-dir=${doc}/${report}/${coverage} --exclude-node-modules=false`);
}

async function exec(options) {
    options = options || defaultOptions();
    switch (options.mode) {
        case '':    // default
            setup(options);
            await testem(false);
            break;
        case 'ci':
            cleanCoverageDirectory(true, options);
            setup(options);
            await instrument();
            await testem(true);
            await remap(options);
            await result();
            break;
        case 'instrument':
            await instrument();
            break;
        case 'remap': // for check
            await remap(options);
            break;
        case 'report':
            cleanCoverageDirectory(false, options);
            await result();
            break;
        default:
            cleanCoverageDirectory(true, options);
            await nycHook(options.mode);
            resolveCoverageFile(options);
            await remap(Object.assign({}, options, { origin: temp }));
            await result();
            break;
    }
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
