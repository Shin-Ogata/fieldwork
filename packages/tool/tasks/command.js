'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');

// https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
function exec(command, args, options) {
    if (!(Array.isArray(args))) {
        if (args) {
            args = args.trim().split(' ');
        } else {
            args = [];
        }
    }

    const exe = path.extname(command) || options?.exe;

    // default call as "shell" (for 2024 security release)
    // https://nodejs.org/en/blog/vulnerability/april-2024-security-releases-2
    const { trimArgs, shell } = Object.assign({ trimArgs: true, shell: !exe }, options);

    // trim quotation
    // https://stackoverflow.com/questions/48014957/quotes-in-node-js-spawn-arguments
    if (trimArgs && !shell) {
        args = args.map((arg) => {
            return arg
                .replace(/^'+|'+$/g, '')
                .replace(/^"+|"+$/g, '');
        });
    }

    return new Promise((resolve, reject) => {
        const opt = Object.assign({}, {
            shell,
            stdio: 'inherit',
            stdout: (data) => { /* noop */ },
            stderr: (data) => { /* noop */ },
        }, options);

        const resolveCmd = (exe || process.platform !== 'win32') ? command : `${command}.cmd`;

        const child = spawn(resolveCmd, args, opt)
            .on('error', (msg) => {
                reject(msg);
            })
            .on('close', (code) => {
                if (0 !== code) {
                    reject(`error occered. code: ${code}`);
                } else {
                    resolve(code);
                }
            });

        if ('pipe' === opt.stdio) {
            child.stdout.on('data', (data) => {
                opt.stdout(data.toString());
            });
            child.stderr.on('data', (data) => {
                opt.stderr(data.toString());
            });
        }
    });
}

module.exports = exec;
