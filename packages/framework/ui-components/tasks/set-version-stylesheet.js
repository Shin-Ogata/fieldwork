'use strict';

const { resolve } = require('node:path');
const {
    readFile,
    writeFile,
} = require('node:fs/promises');
const colors = require('@cdp/tasks/colors');
const { version } = require(resolve('package.json'));

const SCSS_DIR = resolve('src/scss');

const targets = {
    'cdp-components.scss': `
/*!
 * cdp-components [VERSION]
 *   ui-componets collection
 */
`,
};

async function main() {
    try {
        for (const key of Object.keys(targets)) {
            const file = resolve(SCSS_DIR, key);
            const src = (await readFile(file, 'utf8')).toString();
            const banner = targets[key].trim();
            const updated = src.replace(/\/\*![\s\S]*?\*\//, banner.replace('[VERSION]', version));
            await writeFile(file, updated, 'utf8');
        }
    } catch (e) {
        console.error(colors.red(`${e}`));
    }
}

main();
