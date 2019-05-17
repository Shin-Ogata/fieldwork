'use strict';

const path = require('path');
const { spawn } = require('child_process');

function exec(command, args, options) {
    if (!(Array.isArray(args))) {
        if (args) {
            args = args.trim().split(' ');
        } else {
            args = [];
        }
    }

    // trim quotation
    args = args.map((arg) => {
        return arg
            .replace(/^'+|'+$/g, '')
            .replace(/^"+|"+$/g, '');
    });

    return new Promise((resolve, reject) => {
        const opt = Object.assign({}, {
            stdio: 'inherit',
            stdout: (data) => { /* noop */ },
            stderr: (data) => { /* noop */ },
        }, options);

        const ext = path.extname(command);
        const resolveCmd = (ext || process.platform !== 'win32') ? command : `${command}.cmd`;

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
