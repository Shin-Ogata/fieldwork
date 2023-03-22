'use strict';

const { resolve } = require('node:path');
const { readdirSync } = require('node:fs');
const colors = require('../colors');

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
    const { program } = require('commander');

    const argv = process.argv;
    const pkg = require('../package.json');

    const cmd = {};
    const isDefault = (3 === argv.length);

    program
        .name('cdp-task')
        .option('-w, --cwd <path>',         'set working directory, default: process.cwd()')
        .option('-s, --silent',             'no output console')
        .option('-t, --target <path(s)>',   'specify target path')
        .option('-a, --all',                'preset target all')
        .option('-@, --debug',              'dump input command. (dry run)')
        .version(pkg.version);

    // setup subtask options
    const examples = [];
    const plugins = loadPlugins();
    for (const key of Object.keys(plugins)) {
        examples.push(plugins[key].defineCommands(program, cmd, isDefault));
    }

    program
        .command('*', { noHelp: true })
        .action((c) => {
            console.log(colors.red.underline(`  unsupported command: "${c}"`));
            program.help();
        });

    program.on('--help', () => {
        console.log('\nExamples:');
        for (const ex of examples) {
            console.log(colors.gray(ex));
        }
    });

    program.parse(argv);

    if (argv.length <= 2) {
        program.help();
    }

    if (program.opts().debug) {
        console.log(`debug command:\n${JSON.stringify(cmd, null, 4)}`);
        process.exit(0);
    }

    return cmd;
}

module.exports = {
    loadPlugins,
    parseCommand,
};
