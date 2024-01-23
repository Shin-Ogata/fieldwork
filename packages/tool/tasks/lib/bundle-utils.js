'use strict';

const { readFile, writeFile } = require('node:fs/promises');
const { resolve, basename } = require('node:path');
const banner = require('../banner');
const { pkg } = require('../config');

function dropAlias(code, values) {
    values = Array.isArray(values) ? values : [values];
    const drop = (text, val) => {
        const reg1 = new RegExp(`\\s*${val}\\$\\d as ${val}(,)`, 'g');
        const reg2 = new RegExp(`${val}\\$\\d`, 'g');
        return text.replace(reg1, '').replace(reg2, val);
    };
    for (const value of values) {
        code = drop(code, value);
    }
    return code;
}

async function readCode(src) {
    const code = (await readFile(src)).toString();
    // trim banner
    return code.replace(/\/\*![\s\S]*?\*\/\n/, '');
}

async function makeResultCodeDefs(out, defs, globalConst, options) {
    const moduleName = basename(out, '.d.ts');
    let code = '';

    const modules = [];
    for (const def of defs) {
        const { name, path } = def;
        modules.push(name);
        code += await readCode(resolve(path));
    }

    { // banner
        const seps = '\n *     - ';
        let description = `Common result code definitions.`;
        if (modules.length) {
            description += `\n *   - includes:${seps}${modules.join(seps)}`;
        }
        code = banner(Object.assign({
            name: `${pkg.name}/${moduleName}`,
            description,
        }, options)) + code;
    }

    await writeFile(resolve(out), code);

    // re-export global constant
    const globalConstant = globalConst ? await readCode(resolve(globalConst)) : '';
    // 先頭の import から 最初の export
    return {
        imports: `import './${moduleName}';`,
        exports: globalConstant.match(/^import[\s\S]+export {[\s\S]+};/)?.[0],
    };
}

/**
 * global namespace を共有するための, コードパッチ用オプションを生成
 */
function makeSharedNamespaceReplacer(namespace = 'CDP_DECLARE', options) {
    const replaces = [
        [`var ${namespace};`, `globalThis.${namespace} = globalThis.${namespace} || {};`],
        [`(${namespace})`, '()'],
        [`(${namespace} || (${namespace} = {}))`, '()'],
    ];

    const values = {};
    for (const r of replaces) {
        values[r[0]] = r[1];
    }

    return Object.assign({
        preventAssignment: true,
        delimiters: ['', ''],
        values,
    }, options);
}

/**
 * クライアントで namespace.enum 拡張を行うための, コードパッチ用オプションを生成
 */
function makeEnumReplacer(namespace = 'CDP_DECLARE', enumurate = 'RESULT_CODE', options) {
    const replaces = [
        [`var ${namespace};\n`, ''],
        [`(${namespace})`, '()'],
        [`(${namespace} || (${namespace} = {}))`, '()'],
        [`let ${enumurate};`, `let ${enumurate} = ${namespace}.${enumurate};`],
        [`(${enumurate})`, '()'],
        [`(${enumurate} = ${namespace}.${enumurate} || (${namespace}.${enumurate} = {}))`, '()'],
    ];

    const values = {};
    for (const r of replaces) {
        values[r[0]] = r[1];
    }

    return Object.assign({
        preventAssignment: true,
        delimiters: ['', ''],
        values,
    }, options);
}

module.exports = {
    dropAlias,
    readCode,
    makeResultCodeDefs,
    makeSharedNamespaceReplacer,
    makeEnumReplacer,
};
