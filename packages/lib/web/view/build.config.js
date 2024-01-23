'use strict';

const { dropAlias } = require('@cdp/tasks/lib/bundle-utils');

const config = require('../../../../config/bundle/rollup-core');
const bundle_dts = require('../../../../config/bundle/dts-bundle');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    code = code
        // replace `EventSource as EventSource$1` → `EventSource`
        .replace('EventSource as EventSource$1', 'EventSource')
        // rename `_View` → `View`
        .replace(/_View/gm, 'View')
        // 'declare type View' → 'export declare type View'
        .replace(/^declare type View/gm, 'export declare type View')
        // 'declare const View' → 'export declare const View'
        .replace(/^declare const View/gm, 'export declare const View')
    ;

    // View$1 → View
    code = dropAlias(code, 'View');
    // EventSource$1 → EventSource
    code = dropAlias(code, 'EventSource');

    return code;
}

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/events': 'CDP',
            '@cdp/dom': 'CDP',
        },
    }),
    dts: bundle_dts({ postProcess: patch }),
};
