'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');

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
            const escapeArg = (arg) => {
                if (isWin) {
                    return `"${arg.replace(/"/g, '""')}"`;
                } else {
                    return `'${arg.replace(/'/g, `'\\''`)}'`;
                }
            };

            const safeArgs = args.map(escapeArg).join(' ');
            const fullCommand = `${resolveCmd} ${safeArgs}`;
            return { actualCmd: fullCommand, actualArgs: [] };
        } else {
            return { actualCmd: resolveCmd, actualArgs: args };
        }
    })();

    return new Promise((resolve, reject) => {
        const opt = Object.assign({}, {
            shell,
            stdio: 'inherit',
            stdout: () => {},
            stderr: () => {},
        }, options);

        const child = spawn(actualCmd, actualArgs, opt)
            .on('error', (err) => {
                reject(err);
            })
            .on('close', (code) => {
                if (0 !== code) {
                    reject(new Error(`error occered. code: ${code}`));
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
