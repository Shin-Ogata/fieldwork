'use strict';

const { resolve } = require('path');
const { readdirSync } = require('fs-extra');
const commander = require('commander');
const chalk = require('chalk');

function loadPlugins() {
    const plugins = {};
    const files = readdirSync(__dirname).filter(file => /^cli-plugin/.test(file));
    for (const f of files) {
        const p = require(resolve(__dirname, f));
        plugins[p.command] = p;
    }
    return plugins;
}

function parseCommand() {
    const argv = process.argv;
    const pkg = require('../package.json');

    const cmd = {};
    const isDefault = (3 === argv.length);

    commander
        .name('cdp-task')
        .option('-w, --cwd <path>',         'set working directory, default: process.cwd()')
        .option('-s, --silent',             'no output console')
        .option('-t, --target <path(s)>',   'specify target path')
        .option('-a, --all',                'preset target all')
        .option('-@, --debug',              'dump input command')
        .version(pkg.version);

    // setup subtask options
    const examples = [];
    const plugins = loadPlugins();
    for (const key of Object.keys(plugins)) {
        examples.push(plugins[key].defineCommands(commander, cmd, isDefault));
    }

    commander
        .command('*', { noHelp: true })
        .action((c) => {
            console.log(chalk.red.underline(`  unsupported command: "${c}"`));
            commander.help();
        });

    commander.on('--help', () => {
        console.log('\nExamples:');
        for (const ex of examples) {
            console.log(chalk.gray(ex));
        }
    });

    commander.parse(argv);

    if (argv.length <= 2) {
        commander.help();
    }

    if (commander.debug) {
        console.log(`debug command:\n${JSON.stringify(cmd, null, 4)}`);
        process.exit(0);
    }

    return cmd;
}

module.exports = {
    loadPlugins,
    parseCommand,
};
