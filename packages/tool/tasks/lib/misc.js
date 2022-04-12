'use strict';

const { resolve, dirname } = require('path');
const fs                   = require('fs-extra');
const glob                 = require('glob');
const { merge }            = require('lodash');
const tar                  = require('tar');

function toPOSIX(path) {
    return path.replace(/\\/g, '/');
}

function cleanEmptyDir(target) {
    const list = glob.sync('**', {
        cwd: toPOSIX(target),
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
            ignore.push(toPOSIX(g.substring(1)));
        } else {
            source.push(toPOSIX(g));
        }
    }

    return { source, ignore };
}

function copy(globs, dest, options) {
    const opts = options || {};
    const cwd  = toPOSIX(opts.cwd || process.cwd());

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

function normalizeText(text, options) {
    if (!text) {
        return text;
    }

    const { eol, bom, tab } = merge({ eol: '\n', bom: false }, options);

    text = text
        .trim()
        .replace(/^\ufeff/gm, '')   // remove bom
        .replace(/\r\n/gm, '\n')    // once '\n'
        .replace(/\r/gm, '\n')
    ;

    if (bom) {
        text = `\ufeff${text}`;
    }
    if ('\n' !== eol) {
        text = text.replace(/\n/gm, eol);
    }
    if (tab) {
        const spaces = (() => {
            let s = '';
            for (let i = 0; i < tab; i++) {
                s += ' ';
            }
            return s;
        })();
        text = text.replace(/\t/gm, spaces);
    }

    return `${text}${eol}`;
}

function formatXML(src, options) {
    const opts = merge({
        eol: '\n',
        bom: true,
        step: 2,
    }, options);
    let xml = '';
    let pad = 0;
    let indent;
    let node;

    const lines = normalizeText(src, { eol: '\n' })
        .replace(/(>)(<(?!\/))(\/*)/g, '$1\n$2$3') // insert LF to each node once.
        .split('\n')
    ;

    const spaces = (len) => {
        let s = '';
        const _indent = len * opts.step;
        for (let i = 0; i < _indent; i++) {
            s += ' ';
        }
        return s;
    };

    for (const line of lines) {
        indent = 0;
        node = line.trim();
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad > 0) {
                pad -= 1;
            }
        } else if (node.match(/^<\w[^>]*[^/]>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }
        xml += `${spaces(pad)}${node}\n`;
        pad += indent;
    }

    xml = xml
        .replace(/\n\n/gm, '\n')
        .replace(/^ +\n/gm, '')
    ;

    return normalizeText(xml, opts);
}

module.exports = {
    toPOSIX,
    cleanEmptyDir,
    merge,
    includes,
    copy,
    gzip,
    normalizeText,
    formatXML,
};
