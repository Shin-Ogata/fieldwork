'use strict';

const path = require('path');
const { spawn } = require('child_process');

// https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
function exec(command, args, options) {
    if (!(Array.isArray(args))) {
        if (args) {
            args = args.trim().split(' ');
        } else {
            args = [];
        }
    }

    const { shell, trimArgs } = Object.assign({ trimArgs: true }, options);

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
            stdio: 'inherit',
            stdout: (data) => { /* noop */ },
            stderr: (data) => { /* noop */ },
        }, options);

        const exe = path.extname(command) || opt.exe;
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
