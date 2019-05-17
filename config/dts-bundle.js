'use strict';

const { resolve } = require('path');
const { config, banner } = require('@cdp/tasks');
const {
    packageName: PACKAGE,
    outName: OUTNAME,
    base: BASE,
    dist: DIST,
    type: TYPE,
} = config.build;
const CWD = process.cwd();

module.exports = {
    name: `${PACKAGE}`,
    main: resolve(CWD, `${TYPE}/${BASE}.d.ts`),
    out: resolve(`${DIST}/${OUTNAME}.d.ts`),
    headerText: banner().replace('/*', '').replace('*/\n', ''),
    newline: '\n',
};
