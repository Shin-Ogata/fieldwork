'use strict';

const config      = require('../../../../config/bundle/rollup-core');
const bundle_dts  = require('../../../../config/bundle/dts-bundle');
const { replace } = require('@cdp/result/build.config');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    const TRIM_EXPORT  = 'declare abstract class Model';
    const EXPORT_ALIAS = 'export type ModelBase<T extends {} = {}, Event extends ModelEvent<T> = ModelEvent<T>> = Model<T, Event>;';

    code = code
        // rename `EventSourceBase` → `EventSource`
        .replace(/EventSourceBase/gm, 'EventSource')
        // rename `export declare abstract class Model<...> { ... }` → `declare abstract class Model<...> { ... } export type ModelBase ...`
        .replace(/(export declare abstract class Model)([^\n]+)([^\}]+)(\})/, `${TRIM_EXPORT}$2$3$4\n${EXPORT_ALIAS}`)
    ;

    return code;
}

module.exports = {
    default: config({
        external: {
            '@cdp/core-utils': 'CDP',
            '@cdp/events': 'CDP',
            '@cdp/observable': 'CDP',
            '@cdp/promise': 'CDP',
            '@cdp/result': 'CDP',
            '@cdp/data-sync': 'CDP',
        },
        replace,
    }),
    dts: bundle_dts({ postProcess: patch }),
};
