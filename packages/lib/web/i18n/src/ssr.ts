import { safe } from '@cdp/core-utils';

/** @internal */ const _navigator = safe(globalThis.navigator);

/** @internal */
export {
    _navigator as navigator,
};
