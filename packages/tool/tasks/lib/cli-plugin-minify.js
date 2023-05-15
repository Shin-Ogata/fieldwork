'use strict';

const {
    readFileSync,
    writeFileSync,
    mkdirSync,
} = require('node:fs');
const {
    resolve,
    dirname,
    basename,
} = require('node:path');
const colors = require('../colors');

const COMMAND = 'minify';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <type>`)
        .description('minify built target')
        .option('-c, --config <path>', 'specified config file')
        .option('-v, --verbose',       'print diagnostic messages')
        .action((type, options) => {
            cmd.action = COMMAND;
            const { cwd, silent } = commander.opts();
            const { config, verbose } = options;
            if (!config) {
                console.log(colors.red.underline('for running minify, config-file is required.'));
                console.log('\nExamples:');
                console.log(`  $ cdp-task minify ${type}`, colors.cyan('--config=./minify.config.js'));
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
    const result = await minify(readFileSync(src, 'utf8').toString(), terser);
    if (result.error) {
        console.log(colors.red.underline(`terser error: ${result.error}`));
        throw new Error(result.error);
    }

    // min.js
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, result.code);
    if (!silent) {
        console.log(colors.gray(`  input:      ${basename(src)}`));
        console.log(colors.gray(`  minified:   ${basename(out)}`));
    }

    // min.map
    if (result.map) {
        mkdirSync(dirname(map), { recursive: true });
        writeFileSync(map, result.map);
        if (!silent) {
            console.log(colors.gray(`  source-map: ${basename(map)}`));
        }
    }
}

async function minifyCSS(options) {
    const { minify } = require('csso');
    const { cwd, silent, config } = options;
    let settings = require(resolve(cwd, config));
    if (settings.minify) {
        settings = settings.minify.css;
    }

    const { targets, csso: { sourceMap } } = settings;
    for (const tgt of targets) {
        const css = readFileSync(tgt.src, 'utf8');
        const result = minify(css, { filename: tgt.mapFileName, sourceMap });

        writeFileSync(tgt.out, result.css);
        if (!silent) {
            console.log(colors.gray(`  input:      ${basename(tgt.src)}`));
            console.log(colors.gray(`  minified:   ${basename(tgt.out)}`));
        }
        if (sourceMap) {
            writeFileSync(tgt.map, result.map.toString());
            if (!silent) {
                console.log(colors.gray(`  source-map: ${basename(tgt.map)}`));
            }
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
            await minifyCSS(options);
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
