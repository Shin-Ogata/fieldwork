'use strict';

const path      = require('node:path');
const fs        = require('fs-extra');
const nyc       = ((ctor) => new ctor({}))(require('nyc'));
const colors    = require('../colors');
const config    = require('../config');
const srcmap    = require('./source-map-utils');
const {
    dist,
    doc,
    report,
    coverage,
} = config.dir;

function detectMap(src) {
    const map = srcmap.detectSourceMap(src);
    if (!map) {
        console.log(colors.yellow(`    SKIPPED: cannot remap for ${path.basename(src)}.`));
    }
    return map;
}

function toAbosolute(file, options) {
    if (path.isAbsolute(file)) {
        return file;
    } else {
        return path.resolve(options.cwd, dist, file);
    }
}

function deepCopy(src) {
    const { stringify, parse } = JSON;
    return parse(stringify(src));
}

async function remapCoverage(cov, options) {
    const { silent } = options;

    const rebuild = {};
    for (const file of Object.keys(cov)) {
        if (!silent) {
            console.log(colors.gray(`  source-map detecting... : ${path.basename(file)}`));
        }
        const absPath = toAbosolute(file, options);
        rebuild[absPath] = cov[file];
        rebuild[absPath].path = absPath;
        rebuild[absPath].inputSourceMap = detectMap(absPath);
        if (null == rebuild[absPath].inputSourceMap) {
            delete rebuild[absPath];
        }
    }

    // path を再設定するため, getter 情報を落とす
    return deepCopy(await nyc.sourceMaps.remapCoverage(rebuild));
}

function resolveSourcePath(cov, options) {
    const { cwd, silent, config: configFile, origin, info } = options;
    const opts = configFile && Object.assign({ info }, require(path.resolve(cwd, configFile)).remap);
    const { src } = config.build;

    const resolvePath = (name) => {
        if (opts && 'function' === typeof opts.resolve) {
            const renamed = opts.resolve(name, opts);
            return renamed ? path.resolve(cwd, renamed) : renamed;
        } else {
            return path.resolve(cwd, name.replace(config.pkg.name, src));
        }
    };

    const root = path.resolve(cwd, origin || dist);

    const rebuild = {};
    for (const file of Object.keys(cov)) {
        const name = path.relative(root, file).replace(/\\/g, '/').replace(/^[\w-]+:\//, '');
        const absPath = resolvePath(name);
        if (!silent) {
            console.log(colors.gray(`  source : ${name}`));
            console.log(colors.gray(`  ... resolved : ${absPath}`));
        }
        if (null != absPath) {
            rebuild[name] = cov[file];
            rebuild[name].path = absPath;
        } else {
            delete rebuild[name];
        }
    }

    return rebuild;
}

async function remap(options) {
    const coveragePath = `./${doc}/${report}/${coverage}/coverage.json`;
    const cov = require(path.resolve(options.cwd, coveragePath));
    const rebuild = resolveSourcePath(await remapCoverage(cov, options), options);
    fs.writeFileSync(coveragePath, JSON.stringify(rebuild, null, 4));
}

module.exports = remap;
