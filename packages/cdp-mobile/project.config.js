﻿'use strict';

const path  = require('path');
const pkg   = require('./package.json');

const target = {
    type: 'cdp-module',
    es: 'es5',
    module: 'none',
    env: 'web',
};

const dir = {
    src: 'src',
    pkg: 'dist',
    built: 'built',
    doc: 'docs',
    task: 'tasks',
    test: 'tests',
    types: '@types',
    temp: '.temp',
    exports: 'exports',
    external: 'external',
    script: 'scripts',
    stylesheet: 'stylesheets',
};

const external_rearrange = {
    root: `${dir.external}`,
    ignore_modules: [
        '^@types',
    ],
    module_adjuster: {
    },
};

const include_modules = [
    'cdp-core',
    'cdp-promise',
    'cdp-nativebridge',
    'cdp-i18n',
    'cdp-framework-jqm',
    'cdp-tools',
    'cdp-ui-listview',
    'cdp-ui-jqm',
];

const main = {
    basename: 'cdp',
    bundle_d_ts: 'cdp.d.ts',
    namespace: 'cdp',
};

const built_cleanee = {
    ts: ['**/*.js', '**/*.d.ts', '!**/@types/**/*.d.ts', '**/*.map'],
    roots: [
        `${dir.built}`,
        `${dir.src}/${dir.script}`,
    ],
};

const banner = {
    fileName: 'BANNER',
    d_ts_desc: '\n * This file is generated by the CDP package build process.',
};

const required_tasks = [
    'banner.js',
    'bundle.js',
    'clean.js',
    'command.js',
    'exports-setup.js',
    'external-rearrange.js',
    'internal-rearrange.js',
    'remap-coverage.js',
    'srcmap.js',
];

// project configuration
module.exports = {
    target: target,
    pkg: pkg,
    dir: dir,
    external_rearrange: external_rearrange,
    internal_rearrange: include_modules,
    include_modules: include_modules,
    main: main,
    built_cleanee: built_cleanee,
    banner: banner,
    required_tasks: required_tasks,
};
