const { resolve } = require('path');
const { readFileSync } = require('fs-extra');

function patch(index, code) {
    if (0 !== index) {
        return;
    }

    // global namespace: `@cdp/result result-code-defs.d.ts`
    code += readFileSync(resolve(__dirname, 'node_modules/@cdp/result/types/result-code-defs.d.ts')).toString();

    // re-export global constant
    const globalConstant = readFileSync(resolve(__dirname, 'node_modules/@cdp/result/types/result-code.d.ts')).toString();
    // 先頭の import から 最初の export
    code += globalConstant.match(/^import[\s\S]+export {[\s\S]+};/)[0];

    // 整形
    return code.replace(/^export {};/m, '').replace(/[\n\s]*$/, '') + '\n';
}

const bundleInfo = {
    // dts-bundle-generator スキーマ
    // https://github.com/timocov/dts-bundle-generator/blob/master/src/config-file/README.md
//  bundle: {},

    // 処理前に呼ばれる関数: () => Promise<void>
    preProcess: undefined,

    // 各 d.ts に対して呼ばれる後処理関数: (index: number, code: string) => string
    postProcess: patch,

    // カスタム入力: `.d.ts`
    src: undefined,

    // カスタム出力: `.d.ts`
    out: undefined,

    // entries.noCheck true or `npm run bundle:dts -- --validate`
    validate: false,

    // tab indent default: '    ' (4)
//  indent: '    '

    // devDependencies 内の含めないライブラリ
    excludeLibraries: [],

    // other `banner` options
};

module.exports = bundleInfo;
