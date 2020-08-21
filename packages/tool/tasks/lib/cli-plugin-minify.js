'use strict';

const { readFileSync, outputFileSync } = require('fs-extra');
const { resolve, basename }            = require('path');
const chalk                            = require('chalk');

const COMMAND = 'minify';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <type>`)
        .description('minify built target')
        .option('-c, --config <path>', 'specified config file')
        .option('-v, --verbose',       'print diagnostic messages')
        .action((type, options) => {
            cmd.action = COMMAND;
            const { cwd, silent } = commander;
            const { config, verbose } = options;
            if (!config) {
                console.log(chalk.red.underline('for running minify, config-file is required.'));
                console.log('\nExamples:');
                console.log(`  $ cdp-task minify ${type}`, chalk.cyan('--config=./minify.config.js'));
                process.exit(0);
            }
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                type,
                config,
                verbose,
            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task minify <js|css|html> --config=<config>     for source "type" minify by config-file
`
            );
        });

    return '  $ cdp-task minify <js|css|html> [options]  minify source "type"';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
    };
}

async function minifyJavaScript(options) {
    const { minify } = require('terser');
    const { cwd, silent, config } = options;
    let settings = require(resolve(cwd, config));
    if (settings.minify) {
        settings = settings.minify.js;
    }

    const { src, out, map, terser } = settings;
    const result = await minify(readFileSync(src).toString(), terser);
    if (result.error) {
        console.log(chalk.red.underline(`terser error: ${result.error}`));
        throw new Error(result.error);
    }

    // min.js
    outputFileSync(out, result.code);
    if (!silent) {
        console.log(chalk.gray(`  input:      ${basename(src)}`));
        console.log(chalk.gray(`  minified:   ${basename(out)}`));
    }

    // min.map
    if (result.map) {
        outputFileSync(map, result.map);
        if (!silent) {
            console.log(chalk.gray(`  source-map: ${basename(map)}`));
        }
    }
}

async function exec(options) {
    options = options || defaultOptions();
    switch (options.type) {
        case 'js':
            await minifyJavaScript(options);
            break;
        case 'css':
            console.log('under construction');
            break;
        case 'html':
            console.log('under construction');
            break;
        default:
            break;
    }
}

module.exports = {
    exec,
    defineCommands,
    command: COMMAND,
};
