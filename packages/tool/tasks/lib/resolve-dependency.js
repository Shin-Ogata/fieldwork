'use strict';

const path = require('path');
const { promisify } = require('util');
const glob = promisify(require('glob'));
const { toPOSIX } = require('./misc');

async function searchLocations(layers) {
    layers = layers || [''];
    const results = [];
    for (const layer of layers) {
        const cwd = toPOSIX(path.join(process.cwd(), 'packages', layer));
        results.push(...(await glob(`${cwd}/**/package.json`, {
            cwd,
            nodir: true,
            ignore: [
                '**/node_modules/**/package.json',
            ],
        })));
    }
    return results;
}

function createPackages(locations) {
    const root = path.join(process.cwd(), 'packages');

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
        setDepends(depends, pkg.devDependencies);
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

async function resolve(options) {
    options = options || {};
    const locations = await searchLocations(options.layer);
    const packages = createPackages(locations);

    calcDepth(packages);
/*
    // checker
    for (const pkg of packages) {
        console.log(`path: ${pkg.path}`);
        console.log(`layer: ${pkg.layer}`);
        const names = [...pkg.depends].map(m => m.name);
        console.log(`  package: ${pkg.name}, depends: ${JSON.stringify(names)}`);
        console.log(`  depth: ${pkg.depth}`);
    }
*/
    return packages
        .sort((lhs, rhs) => (lhs.depth < rhs.depth) ? -1 : 1)
        .map(p => path.dirname(p.path));
}

module.exports = resolve;
