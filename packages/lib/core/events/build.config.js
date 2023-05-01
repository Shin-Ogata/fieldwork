'use strict';

const config     = require('../../../../config/bundle/rollup-core');
const bundle_dts = require('../../../../config/bundle/dts-bundle');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    code = code
        // rename `_EventSource` → `EventSource`
        .replace(/_EventSource/gm, 'EventSource')
        // 'declare type EventSource' → 'export declare type EventSource'
        .replace(/^declare type EventSource/gm, 'export declare type EventSource')
        // 'declare const EventSource' → 'export declare const EventSource'
        .replace(/^declare const EventSource/gm, 'export declare const EventSource')
    ;

    return code;
}

module.exports = {
    __esModule: true,
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
        },
        // 内部シンボル $cdp.
        onwarn(warning, warn) {
            const { code, names } = warning;
            if ('UNUSED_EXTERNAL_IMPORT' === code && names.includes('$cdp')) {
                return;
            }
            warn(warning);
        }
    }),
    dts: bundle_dts({ postProcess: patch }),
};
