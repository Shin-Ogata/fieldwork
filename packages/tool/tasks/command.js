'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');

function shellQuote(arg) {
    if ('win32' === process.platform) {
        if (!arg) {
            return '""';
        }
        // エスケープ対象の特殊文字
        const metaChars = /(["^&|<>()!])/g;
        const escaped = arg
            .replace(/"/g, '""')        // ダブルクォート内の " をエスケープ
            .replace(metaChars, '^$1')  // 特殊文字を ^ でエスケープ
            .replace(/%/g, '%%');       // 環境変数展開を防ぐために % を二重にする
        ;
        return `"${escaped}"`;
    } else {
        // Unix 系
        // https://github.com/ljharb/shell-quote/blob/main/quote.js
        if ('' === arg) {
            return '\'\'';
        }
        if (arg && 'object' === typeof arg) {
            return arg.op.replace(/(.)/g, '\\$1');
        }
        if ((/["\s\\]/).test(arg) && !(/'/).test(arg)) {
            return `'${arg.replace(/(['])/g, '\\$1')}'`;
        }
        if ((/["'\s]/).test(arg)) {
            return `"${arg.replace(/(["\\$`!])/g, '\\$1')}"`;
        }
        return String(arg).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}])/g, '$1\\$2');
    }
}

// https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
function exec(command, args, options) {
    if (!Array.isArray(args)) {
        args = args ? args.trim().split(' ') : [];
    }

    const isWin = 'win32' === process.platform;
    const hasExt = !!path.extname(command);
    const exe = hasExt ? command : options?.exe;

    // default call as "shell" (for 2024 security release)
    // https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2
    const { trimArgs = true, shell = !exe } = options || {};

    // trim quotation
    // https://stackoverflow.com/questions/48014957/quotes-in-node-js-spawn-arguments
    if (trimArgs && !shell) {
        args = args.map((arg) => {
            return arg
                .replace(/^'+|'+$/g, '')
                .replace(/^"+|"+$/g, '');
        });
    }

    // Windows で拡張子がない場合は .cmd を補完
    const resolveCmd = (exe || !isWin) ? command : `${command}.cmd`;

    // shell モードの場合はコマンドと引数を連結
    const { actualCmd, actualArgs } = (() => {
        if (shell) {
            const safeArgs = args.map(shellQuote).join(' ');
            const fullCommand = args.length > 0 ? `${resolveCmd} ${safeArgs}` : resolveCmd;
            return { actualCmd: fullCommand, actualArgs: [] };
        } else {
            return { actualCmd: resolveCmd, actualArgs: args };
        }
    })();

    return new Promise((resolve, reject) => {
        const opt = Object.assign({}, {
            shell,
            stdio: 'inherit',
            stdout: () => { },
            stderr: () => { },
        }, options);

        const child = spawn(actualCmd, actualArgs, opt)
            .on('error', (err) => {
                reject(err);
            })
            .on('close', (code) => {
                if (0 !== code) {
                    reject(new Error(`error occurred. code: ${code}`));
                } else {
                    resolve(code);
                }
            });

        if ('pipe' === opt.stdio) {
            child.stdout.on('data', (data) => {
                opt.stdout?.(data.toString());
            });
            child.stderr.on('data', (data) => {
                opt.stderr?.(data.toString());
            });
        }
    });
}

module.exports = exec;
