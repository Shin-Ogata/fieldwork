'use strict';

const { resolve, dirname } = require('node:path');
const { writeFileSync, mkdirSync } = require('node:fs');
const { dir } = require('@cdp/tasks/config');
const baseOpts = require('./typedoc.js');

// project の tsconfig include を調整し, temp/typedoc 以下に一時的に配置
const tsconfig = require(resolve('tsconfig.json'));

tsconfig.extends = `../../${tsconfig.extends}`;
tsconfig.include = [`../../${dir.dist}/*.d.ts`];

const tmpPath = resolve(dir.temp, 'typedoc/tsconfig.json');
mkdirSync(dirname(tmpPath), { recursive: true });
writeFileSync(tmpPath, JSON.stringify(tsconfig));

module.exports = Object.assign(baseOpts, {
    tsconfig: tmpPath,
});
