'use strict';

const {
    mkdirSync,
    existsSync,
    unlinkSync,
    symlinkSync,
    readFileSync,
    writeFileSync,
} = require('node:fs');
const {
    resolve,
    basename,
    dirname,
} = require('node:path');
const colors         = require('../colors');
const command        = require('../command');
const { pkg, dir }   = require('../config');
const banner         = require('../banner');
const { formatXML  } = require('./misc');

const COMMAND = 'bundle';
const TEMP_DTS_BUNDLE_CONFIG_PATH = 'dts-bundle/config.json';

function defineCommands(commander, cmd, isDefault) {
    commander
        .command(`${COMMAND} <mode>`)
        .alias('bd')
        .description('manage bundled dev-dependencis')
        .option('-c, --config <path>', 'specified config file')
        .option('-v, --validate',      'validate for bundle task')
        .option('-i, --input <path>',  'input file')
        .option('-o, --output <path>', 'output file')
        .action((mode, options) => {
            cmd.action = COMMAND;
            const { cwd, silent } = commander.opts();
            const { config, validate, input, output } = options;
            cmd[COMMAND] = isDefault ? defaultOptions() : {
                cwd: cwd || process.cwd(),
                silent,
                mode,
                config,
                validate,
                input,
                output,

            };
        })
        .on('--help', () => {
            console.log(
`
Examples:
  $ cdp-task bundle setup-ut                       for setup dev-dependencis unit test
  $ cdp-task bundle dts --config=<config>          for bundling d.ts by config-file
  $ cdp-task bundle html --config=<config>         for bundling html by config-file
`
            );
        });

    return '  $ cdp-task bundle <mode> [options] manage bundled dev-dependencis';
}

function defaultOptions() {
    return {
        cwd: process.cwd(),
        silent: false,
    };
}

//__________________________________________________________________________________________________//

function queryTargets(cwd) {
    const { devDependencies: depends } = pkg;
    const targets = [];
    for (const key of Object.keys(depends)) {
        if (/^file:/.test(depends[key])) {
            let [root, link] = key.split('/');
            if (!link) {
                link = root;
                root = undefined;
            }
            targets.push({
                module: key,
                location: resolve(cwd, depends[key].split(':')[1]),
                root,
                link,
            });
        }
    }

//  console.log(`targets:\n${JSON.stringify(targets, null, 4)}`);
    return targets;
}

function linkTestUnit(cwd, target) {
    const { location, root, link } = target;
    const { test, unit } = dir;

    let dstRoot = resolve(cwd, test, unit);
    if (root) {
        dstRoot = resolve(dstRoot, root);
        mkdirSync(dstRoot, { recursive: true });
    }

    const src = resolve(location, test, unit);
    const dst = resolve(dstRoot, link);
    if (existsSync(dst)) {
        unlinkSync(dst);
    }
    symlinkSync(src, dst, ('win32' === process.platform ? 'junction' : 'dir'));
}

function setupUnitTests(cwd, silent) {
    // skip setup from dependency
    if (cwd.includes('node_modules')) {
        return;
    }
    const targets = queryTargets(cwd);
    for (const target of targets) {
        linkTestUnit(cwd, target);
        if (!silent) {
            console.log(colors.gray(`  depends: ${target.module}`));
        }
    }
}

//__________________________________________________________________________________________________//

async function queryTSVersion() {
    return new Promise((resolve, reject) => {
        let version;
        command('tsc', '-v', {
            stdio: 'pipe',
            stdout: (data) => {
                version = data && data.trim().match(/^[A-Za-z ]+([\w.]+)/)[1];
            },
        })
            .then(() => {
                resolve(version);
            })
            .catch((reason) => {
                reject(reason);
            });
    });
}

function cleaningDTS(code, indent) {
    // eslint-disable-next-line
    return code
        .replace(/\t/gm, indent)        // tab to space
        .replace(/"/gm, `'`)            // no-use `"`
        .replace(/^export {};/m, '')    // trim 'export {};'
        .replace(/[\n\s]*$/, '')        // trim surplus line feed
        + '\n';                         // add final line feed
}

async function bundleDTS(cwd, silent, config, validate) {
    let settings = require(resolve(cwd, config));
    if (settings.dts) {
        settings = settings.dts;
    }
    let { bundle, indent } = settings;
    if (!bundle) {
        bundle = settings;
        indent = '    ';
    }
    if (validate) {
        for (const entry of bundle.entries) {
            entry.noCheck = false;
        }
    }

    // preProcess
    if ('function' === typeof settings.preProcess) {
        await settings.preProcess();
    }

    const tempConfigPath = resolve(cwd, dir.temp, TEMP_DTS_BUNDLE_CONFIG_PATH);
    mkdirSync(dirname(tempConfigPath), { recursive: true });
    writeFileSync(tempConfigPath, JSON.stringify(bundle, null, 4));

    const cmdOptions = `--config ${tempConfigPath}${settings.verbose ? ' --verbose' : ''}`;

    try {
        await command('dts-bundle-generator', cmdOptions);
    } catch (e) {
        console.log(colors.cyan.underline(`↑  "dts-bundle-generator" validate faild. You should fix it manually.`));
    }

    const tsVersion = await queryTSVersion();

    for (const [index, entry] of bundle.entries.entries()) {
        const includes = entry.libraries.inlinedLibraries;
        let code = cleaningDTS(readFileSync(entry.outFile).toString(), indent);
        // postProcess
        if ('function' === typeof settings.postProcess) {
            code = cleaningDTS(await settings.postProcess(index, code, includes), indent);
        }
        { // banner
            const seps = '\n *     - ';
            let description = `Generated by 'cdp-task bundle dts' task.\n *   - built with TypeScript ${tsVersion}`;
            if (includes.length) {
                description += `\n *   - includes:${seps}${includes.join(seps)}`;
            }
            code = banner(Object.assign({ description }, settings)) + code;
        }
        writeFileSync(entry.outFile, code);
        if (!silent) {
            console.log(colors.gray(`  generated: ${basename(entry.outFile)}`));
        }
    }
}

//__________________________________________________________________________________________________//

const regexImport = /<!--\s*@import\s+(.+?)\s*-->/g;

async function replaceAsync(str, search, replacer) {
    const replacers = [];
    str.replace(search, (match, ...args) => {
        replacers.push(replacer(match, ...args));
        return match;
    });
    if (0 === replacers.length) {
        return str;
    }
    const replacements = await Promise.all(replacers);
    return str.replace(search, () => replacements.shift());
}

async function importHTML(path) {
    const input = readFileSync(path, 'utf8').trim();
    if (!regexImport.test(input)) {
        return input;
    }
    const dir = dirname(path);
    return await replaceAsync(input, regexImport, async (match, p1) => {
        return await importHTML(resolve(dir, p1));
    });
}

function onImportedHTML(cwd, silent, options, text = '') {
    const { input, output, replaces, step } = Object.assign({ step: 4 }, options);
    // [ [search, replace],  [search, replace] ]
    if (Array.isArray(replaces)) {
        for (const args of replaces) {
            text = text.replace(...args);
        }
    }

    writeFileSync(resolve(cwd, output), formatXML(text, { bom: false, step }));

    if (!silent) {
        console.log(colors.gray(`  imported:  ${output} <- ${input}`));
    }
}

async function bundleHTML(cwd, silent, input, output, config) {
    const targets = [];
    if (('string' === typeof input) && ('string' === typeof output)) {
        targets.push({ input, output });
    } else {
        let settings = require(resolve(cwd, config));
        if (settings.html) {
            settings = settings.html;
        }
        const options = Array.isArray(settings) ? settings : [settings];
        targets.push(...options);
    }

    if (!targets.length) {
        throw new Error('"input" & "output" must be specified');
    }

    const promises = [];

    for (const options of targets) {
        const { input } = options;
        const path = resolve(cwd, input);
        promises.push(importHTML(path).then(onImportedHTML.bind(null, cwd, silent, options)));
    }

    return promises;
}

//__________________________________________________________________________________________________//

async function exec(options) {
    options = options || defaultOptions();
    const { cwd, silent, mode, config, validate, input, output } = options;

    switch (mode) {
        case 'setup-ut':
            setupUnitTests(cwd, silent);
            break;
        case 'dts':
            await bundleDTS(cwd, silent, config, validate);
            break;
        case 'html':
            await bundleHTML(cwd, silent, input, output, config);
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
