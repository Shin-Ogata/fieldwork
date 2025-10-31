'use strict';

const {
    statSync,
    readdirSync,
    rmSync,
    rmdirSync,
    mkdirSync,
    copyFileSync,
    existsSync,
    symlinkSync,
    unlinkSync,
} = require('node:fs');
const { resolve, dirname } = require('node:path');
const { globSync } = require('glob');

function merge(obj, ...sources) {
    const isPrimitive = (x) => {
        return !x || ('function' !== typeof x) && ('object' !== typeof x);
    };

    const extend = (target, source) => {
        for (const prop in source) {
            if ('__proto__' !== prop && 'constructor' !== prop) {
                if (prop in target) {
                    if (isPrimitive(target[prop]) || isPrimitive(source[prop])) {
                        target[prop] = source[prop];
                    } else {
                        extend(target[prop], source[prop]);
                    }
                } else {
                    target[prop] = source[prop];
                }
            }
        }
        return target;
    };

    let dst = obj;
    for (const src of sources) {
        dst = extend(dst, src);
    }
    return dst;
}

function toPOSIX(path) {
    return path.replace(/\\/g, '/');
}

function cleanEmptyDir(target) {
    const list = globSync('**', {
        cwd: toPOSIX(target),
        nodir: false,
    });
    for (let i = list.length - 1; i >= 0; i--) {
        const filePath = resolve(target, list[i]);
        if (statSync(filePath).isDirectory()) {
            if (0 === readdirSync(filePath).length) {
                rmdirSync(filePath);
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

    const retval = [];
    for (const s of source) {
        const files = globSync(s, {
            cwd,
            nodir: true,
            ignore,
        });
        for (const f of files) {
            const src = resolve(cwd, f);
            const dst = resolve(dstRoot, f);
            mkdirSync(dirname(dst), { recursive: true });
            copyFileSync(src, dst);
            retval.push(dst);
            if ('function' === typeof opts.callback) {
                opts.callback(dst);
            }
        }
    }
    return retval;
}

function link(src, dst, options) {
    const opts = options || {};
    const cwd  = toPOSIX(opts.cwd || process.cwd());

    const srcPath = resolve(cwd, src);
    const dstPath = resolve(cwd, dst);
    mkdirSync(dirname(dstPath), { recursive: true });

    if (existsSync(dstPath)) {
        unlinkSync(dstPath);
    }

    const type = statSync(srcPath).isFile() ? 'file' : ('win32' === process.platform) ? 'junction' : 'dir';
    symlinkSync(srcPath, dstPath, type);
}

function del(globs, options) {
    const opts = options || {};
    const cwd  = toPOSIX(opts.cwd || process.cwd());

    const { source, ignore } = parseGlobs(globs);

    const retval = [];
    for (const s of source) {
        const files = globSync(s, {
            cwd,
            ignore,
        });
        for (const f of files) {
            const src = resolve(cwd, f);
            rmSync(src, { force: true, recursive: true });
            retval.push(src);
            if ('function' === typeof opts.callback) {
                opts.callback(src);
            }
        }
    }
    return retval;
}

function gzip(file, dir, cwd) {
    const tar = require('tar');
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
        .replace(/^\ufeff/gm, '')   // remove BOM
        .replace(/\r\n/gm, '\n')    // normalize EOL
        .replace(/\r/gm, '\n')
    ;

    if (bom) {
        text = `\ufeff${text}`;
    }
    if (eol !== '\n') {
        text = text.replace(/\n/gm, eol);
    }
    if (tab) {
        const spaces = ' '.repeat(tab);
        text = text.replace(/\t/gm, spaces);
    }

    return `${text}${eol}`;
}

function formatXML(src, options) {
    const opts = Object.assign({
        eol: '\n',
        bom: true,
        step: 2,
    }, options);

    let xml = '';
    let pad = 0;

    const lines = normalizeText(src, { eol: '\n' })
        .replace(/(>)(<(?!!\/))/g, '$1\n$2') // insert LF between adjacent tags
        .split('\n');

    const spaces = (len) => ' '.repeat(len * opts.step);

    for (const line of lines) {
        const node = line.trim();

        const isSelfClosing = /^<[^>]+\/>$/.test(node);
        const isCompleteTag = /^<[^>]+>.*<\/[^>]+>$/.test(node);
        const isClosingTag = /^<\/[^>]+>$/.test(node);
        const isOpeningTag = /^<[^/!][^>]*>$/.test(node);

        if (isClosingTag) {
            pad = Math.max(pad - 1, 0);
        }

        xml += `${spaces(pad)}${node}\n`;

        if (isOpeningTag && !isSelfClosing && !isCompleteTag) {
            pad += 1;
        }
    }

    xml = xml
        .replace(/\n\n/gm, '\n')
        .replace(/^ +\n/gm, '')
        .trim()
    ;

    return normalizeText(xml, opts);
}

module.exports = {
    toPOSIX,
    cleanEmptyDir,
    merge,
    includes,
    copy,
    link,
    del,
    gzip,
    normalizeText,
    formatXML,
};
