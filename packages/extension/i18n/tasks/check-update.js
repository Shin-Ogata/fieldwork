'use strict';

const sember  = require('semver');
const command = require('@cdp/tasks/command');
const {
    underline: u,
    red,
    yellow,
    green: g,
    magenta: m,
} = require('@cdp/tasks/colors');
const current = require('./query-version');

function queryLatest() {
    return new Promise((resolve, reject) => {
        let latest;
        command('npm', 'info i18next version', {
            stdio: 'pipe',
            stdout: (data) => {
                latest = data && data.trim();
            },
        })
            .then(() => {
                resolve(latest);
            })
            .catch((reason) => {
                reject(reason);
            });
    });
}

function pad(len) {
    const size = (2 + 'Wanted'.length) - len;
    let ret = '';
    for (let i = 0; i < size; i++) {
        ret += ' ';
    }
    return ret;
}

function notify(wanted, latest) {
    const c = sember.major(wanted) !== sember.major(latest) ? red : yellow;
    const wpad = pad(wanted.length);
    const lpad = pad(latest.length);
    console.log(`${u('Package')}  ${u('Current')}  ${u('Wanted')}  ${u('Latest')}  ${u('Location')}`);
    console.log(`${c('i18next')} ${wpad}${wanted}${wpad}${g(wanted)}${lpad}${m(latest)}  ${'i18n'}`);
}

async function main() {
    try {
        const latest = await queryLatest();
        if (sember.lt(current, latest)) {
            notify(current, latest);
        }
    } catch (e) {
        console.error(red(`${e}`));
    }
}

main();
