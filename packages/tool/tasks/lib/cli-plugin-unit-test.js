'use strict';

const chalk     = require('chalk');
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
        .option('-c, --config <path>', 'specified config file')
        .option('-R, --runner <path>', 'custom launcher script directory')
        .option('-r, --res <path>',    'resource directory')
        .action((mode, options) => {
            const { config, runner, res } = options;
            if ((!mode || 'ci' === mode) && !config) {
                console.log(chalk.red.underline('for running unit-test, config-file is required.'));
                console.log('\nExamples:');
                console.log(`  $ cdp-task unit-test ${mode || ''}`, chalk.cyan('--config=./test.config.js'));
                process.exit(0);
            }

            cmd.action = COMMAND;
            const { cwd, silent } = commander;
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                mode,
                config,
                runner,
                res,
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
`
            );
        });

    return '  $ cdp-task unit-test [mode] [option]  unit-test operations';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
        target: null,
        mode: 'report',
        config: null,
    };
}

function test(ciMode) {
    if (ciMode) {
        return command('testem', `ci -f ${temp}/testem/testem-ci.js`);
    } else {
        return command('testem', `-f ${temp}/testem/testem-amd.js`);
    }
}

function instrument() {
    return command('nyc', `instrument ./${dist} ./${temp} --source-map=false`);
}

function result() {
    // nyc 14.x は 拡張子指定が必須
    const extension = '--extension=ts';
    // eslint-disable-next-line max-len
    return command('nyc', `report ${extension} --reporter=lcov --reporter=html --reporter=text --report-dir=${doc}/${report}/${coverage} --temp-directory=${doc}/${report}/${coverage}`);
}

async function exec(options) {
    options = options || defaultOptions();
    switch (options.mode) {
        case 'ci':
            setup(options);
            await instrument();
            await test(true);
            remap(options);
            await result();
            break;
        case 'instrument':
            await instrument();
            break;
        case 'report':
            await result();
            break;
        default:
            setup(options);
            await test(false);
            break;
    }
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
