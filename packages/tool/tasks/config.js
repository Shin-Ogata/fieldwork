'use strict';

const path = require('path');
const { merge: _merge } = require('./lib/misc');

function query(cwd = process.cwd()) {
    const pkg = require(path.join(cwd, 'package.json'));

    // defaults
    const config = {
        pkg,
        dir: {
            src: 'src',
            dist: 'dist',
            built: 'built',
            doc: 'docs',
            report: 'reports',
            coverage: 'coverage',
            api: 'typedoc',
            metrics: 'metrics',
            task: 'tasks',
            test: 'tests',
            unit: 'unit',
            dev: 'dev',
            type: 'types',
            temp: '.temp',
            external: 'external',
            script: 'ts',
            stylesheet: 'scss',
            template: 'tpl',
            packages: 'packages',
        },
        build: {
            base: 'index',
            global: 'CDP',
            domain: 'cdp',
            get packageName() { return config.pkg.name; },
            get outName() {
                const [prefix, suffix] = config.pkg.name.split('/');
                return suffix || prefix;
            },
            get dist() { return config.dir.dist; },
            get built() { return config.dir.built; },
            get src() { return querySrcRoot(); },
            get type() { return config.dir.type; },
            get test() { return config.dir.test; },
            get unit() { return config.dir.unit; },
            get dev() { return config.dir.dev; },
            get script() { return config.dir.script; },
            get temp() { return config.dir.temp; },
            relativePath: (srcRootDir) => {
                srcRootDir = srcRootDir || querySrcRoot();
                return path.relative(config.dir.dist, srcRootDir);
            },
        },
        metrics: {
            title: null,
            get out() {
                const { doc, report, metrics } = config.dir;
                return `${doc}/${report}/${metrics}`;
            },
            // overridable
            ignore: [
                '*/**/index.js',
                '**/tests/**',
                '**/*.min.js',
            ],
        },
    };

    // helpers
    function querySrcRoot() {
        try {
            const { rootDir } = require(path.resolve(cwd, 'tsconfig.json')).compilerOptions;
            if (rootDir) {
                return rootDir;
            }
        } catch (e) {
            // noop
        }
        return config.dir.src;
    }

    // override properties
    function override(dst, src, ...props) {
        let dstProp = dst, srcProp = src;
        for (const p of props) {
            dstProp = dstProp[p];
            srcProp = srcProp[p];
            if (null == srcProp) {
                return;
            }
        }
        dstProp = srcProp;
    }

    // custom
    function apply() {
        const merge = (src) => {
            if (null != src) {
                _merge(config, src);
                override(config, src, 'metrics', 'ignore');
            }
        };

        try {
            merge(pkg['cdp-config']);
            merge(require(path.join(cwd, 'project.config')));
        } catch (e) {
            // no reaction
        }
    }

    apply();

    return config;
}

module.exports = {
    ...query(),     // project configuration (default)
    query,          // query configuration
};
