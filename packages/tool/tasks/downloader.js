'use strict';

const { createWriteStream } = require('fs');
const { parse: parseURL } = require('url');
const http   = require('http');
const https  = require('https');
const Agent  = require('https-proxy-agent');
const chalk  = require('chalk');
const comand = require('./command');

function queryProtocol(url, options) {
    let { protocol } = options;
    if (!protocol) {
        if (url.startsWith('https://')) {
            protocol = 'https';
        } else {
            protocol = 'http';
        }
    }
    return protocol;
}

function queryProxy(protocol, options) {
    const { proxy } = options;

    const parse = (src) => {
        if (src) {
            return { agent: new Agent(src) };
        }
    };

    if (proxy) {
        if ('off' === proxy) {
            return Promise.resolve({});
        } else {
            const param = parse(proxy);
            return param ? Promise.resolve(param) : Promise.resolve({});
        }
    }

    const configName = ('https' === protocol) ? 'https-proxy' : 'proxy';

    return new Promise((resolve, reject) => {
        let setting;
        comand('npm', `config get ${configName}`, {
            stdio: 'pipe',
            stdout: (data) => {
                setting = data && data.trim();
            },
        })
            .then(() => {
                const param = parse(setting || '');
                if (param) {
                    return resolve(param);
                }
                resolve({});
            })
            .catch((reason) => {
                reject(reason);
            });
    });
}

function request(stream, connection, options) {
    let redirect;
    return new Promise((resolve, reject) => {
        const handle = connection.get(options, (response) => {
            const { statusCode } = response;
            if (200 <= statusCode && statusCode < 300) {
                response.pipe(stream);
            } else if (300 <= statusCode && statusCode < 400) {
                redirect = response.headers.location;
                response.on('data', () => {
                    console.log(chalk.gray(`  detect redirect url: ${redirect}`));
                });
            }
            response.on('close', () => {
                resolve(redirect);
            });
        });

        handle.on('error', (e) => {
            reject(e);
        });

        handle.end();
    });
}

async function download(url, dst, protocol, proxy) {
    const connection = ('https' === protocol) ? https : http;
    const stream = createWriteStream(dst);

    do {
        url = await request(stream, connection, { ...parseURL(url), ...proxy });
    } while (url);

    stream.end();
}

async function exec(url, dst, options) {
    options = options || {};
    const protocol = queryProtocol(url, options);
    const proxy = await queryProxy(protocol, options);
    return download(url, dst, protocol, proxy);
}

module.exports = exec;
