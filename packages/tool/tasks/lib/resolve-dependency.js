'use strict';

const path = require('path');
const glob = require('glob');
const colors = require('../colors');
const { toPOSIX } = require('./misc');

function searchLocations(layers, root) {
    layers = layers || [''];
    const results = [];
    for (const layer of layers) {
        const cwd = toPOSIX(path.join(root, 'packages', layer));
        results.push(...glob.sync(`${cwd}/**/package.json`, {
            cwd,
            nodir: true,
            ignore: [
                '**/node_modules/**/package.json',
            ],
        }));
    }
    return results;
}

function createPackages(locations, cwd, dev) {
    const root = path.join(cwd, 'packages');

    const setDepends = (depends, prop) => {
        if (!prop) {
            return;
        }
        for (const module of Object.keys(prop)) {
            depends.add(module);
        }
    };

    const packages = [];
    const map = new Map();

    for (const loc of locations) {
        const location = path.normalize(loc);
        const pkg = require(location);
        const depends = new Set();
        setDepends(depends, pkg.dependencies);
        dev && setDepends(depends, pkg.devDependencies);
        const info = {
            name: pkg.name,
            depends,
            path: location,
            layer: path.relative(root, location).split(path.sep)[0],
        };
        map.set(pkg.name, info);
        packages.push(info);
    }

    for (const pkg of packages) {
        const depends = new Set();
        for (const name of pkg.depends) {
            const info = map.get(name);
            if (info) {
                depends.add(info);
            }
        }
        pkg.depends = depends;
    }

    return packages;
}

function calcDepth(packages) {
    for (const pkg of packages) {
        const baseName = pkg.name;
        const depends = [...pkg.depends];
        const depth = depends.slice();
        for (let module = depends.shift(); module; module = depends.shift()) {
            if (module.name === baseName) {
                throw new Error(`detect circular dependency. [module: ${baseName}]`);
            }
            depends.push(...module.depends);
            depth.push(...module.depends);
        }
        pkg.depth = depth.length;
    }
}

function resolve(options) {
    const { layer, dryRun, dev, silent, cwd } = options || {};
    const locations = searchLocations(layer, cwd);
    const packages = createPackages(locations, cwd, dev);

    calcDepth(packages);
    packages.sort((lhs, rhs) => (lhs.depth < rhs.depth) ? -1 : 1);

    // checker
    if (dryRun) {
        for (const pkg of packages) {
            if (!silent) {
                console.log(`path: ${pkg.path}`);
                console.log(`layer: ${pkg.layer}`);
            }
            const names = [...pkg.depends].map(m => m.name);
            console.log(`  ${pkg.name}`);
            console.log(colors.gray(`    depth: ${pkg.depth}`));
            console.log(colors.gray(`    depends: ${JSON.stringify(names)}`));
        }
        console.log(`  Listed ${colors.yellow(`${packages.length}`)} packages`);
    }

    return packages;
}

module.exports = resolve;
