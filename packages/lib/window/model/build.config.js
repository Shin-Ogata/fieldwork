'use strict';

const config      = require('../../../../config/bundle/rollup-core');
const bundle_dts  = require('../../../../config/bundle/dts-bundle');
const { replace } = require('@cdp/result/build.config');

function patch(index, code) {
    if (0 !== index) {
        return code;
    }

    const EXPORT_ALIAS = 'export type ModelBase<T extends object = object, Event extends ModelEvent<T> = ModelEvent<T>> = Model<T, Event>;';

    code = code
        // rename `declare abstract class Model<...> { ... }` → `declare abstract class Model<...> { ... } export type ModelBase ...`
        .replace(/(declare abstract class Model)([^\n]+)([^\}]+)(\})/, `$1$2$3$4\n${EXPORT_ALIAS}`)
        // rename `EventSourceBase` → `EventSource`
        .replace(/EventSourceBase/gm, 'EventSource')
    ;

    return code;
}

module.exports = {
    __esModule: true,
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
