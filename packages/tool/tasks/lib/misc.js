'use strict';

const { resolve, dirname } = require('path');
const fs                   = require('fs-extra');
const glob                 = require('glob');
const { merge }            = require('lodash');
const tar                  = require('tar');

function cleanEmptyDir(target) {
    const list = glob.sync('**', {
        cwd: target,
        nodir: false,
    });
    for (let i = list.length - 1; i >= 0; i--) {
        const filePath = resolve(target, list[i]);
        if (fs.statSync(filePath).isDirectory()) {
            if (0 === fs.readdirSync(filePath).length) {
                fs.removeSync(filePath);
            }
        }
    }
}

function includes(path, evaluations) {
    for (const target of evaluations) {
        if (path.includes(target)) {
            return true;
        }
    }
    return false;
}

function parseGlobs(globs) {
    const source = [];
    const ignore = [];

    for (const g of globs) {
        if ('!' === g[0]) {
            ignore.push(g.substring(1));
        } else {
            source.push(g);
        }
    }

    return { source, ignore };
}

function copy(globs, dest, options) {
    const opts = options || {};
    const cwd  = opts.cwd || process.cwd();

    const { source, ignore } = parseGlobs(globs);
    const dstRoot = resolve(cwd, dest);

    for (const s of source) {
        const files = glob.sync(s, {
            cwd,
            nodir: true,
            ignore,
        });
        for (const f of files) {
            const src = resolve(cwd, f);
            const dst = resolve(dstRoot, f);
            fs.ensureDirSync(dirname(dst));
            fs.copyFileSync(src, dst);
            if ('function' === typeof opts.callback) {
                opts.callback(dst);
            }
        }
    }
}

function gzip(file, dir, cwd) {
    return tar.c({
        gzip: true,
        cwd,
        file,
    }, [dir]);
}

module.exports = {
    cleanEmptyDir,
    merge,
    includes,
    copy,
    gzip,
};
