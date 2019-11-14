'use strict';

const path      = require('path');
const fs        = require('fs-extra');
const chalk     = require('chalk');
const nyc       = ((ctor) => new ctor())(require('nyc'));
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
        console.log(chalk.yellow(`    SKIPPED: cannot remap for ${path.basename(src)}.`));
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

function remapCoverage(cov, options) {
    const { silent } = options;

    const rebuild = {};
    for (const file of Object.keys(cov)) {
        if (!silent) {
            console.log(chalk.gray(`  source-map detecting... : ${path.basename(file)}`));
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
    return deepCopy(nyc.sourceMaps.remapCoverage(rebuild));
}

function resolveSourcePath(cov, options) {
    const { cwd, silent } = options;
    const { domain, src } = config.build;
    const root = path.resolve(options.cwd, dist);

    const rebuild = {};
    for (const file of Object.keys(cov)) {
        const name = path.relative(root, file).replace(/\\/g, '/').replace(`${domain}:/`, '');
        const absPath = path.resolve(cwd, name.replace(config.pkg.name, src));
        if (!silent) {
            console.log(chalk.gray(`  source : ${name}`));
            console.log(chalk.gray(`  ... resolved : ${absPath}`));
        }
        rebuild[name] = cov[file];
        rebuild[name].path = absPath;
    }

    return rebuild;
}

function remap(options) {
    const coveragePath = `./${doc}/${report}/${coverage}/coverage.json`;
    const cov = require(path.resolve(options.cwd, coveragePath));
    const rebuild = resolveSourcePath(remapCoverage(cov, options), options);
    fs.writeFileSync(coveragePath, JSON.stringify(rebuild, null, 4));
}

module.exports = remap;
