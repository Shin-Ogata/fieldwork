import { safe } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においてもオブジェクト等の存在を保証する
 */

/** @internal */ const _location         = safe(globalThis.location);
/** @internal */ const _navigator        = safe(globalThis.navigator);
/** @internal */ const _screen           = safe(globalThis.screen);
/** @internal */ const _devicePixelRatio = safe(globalThis.devicePixelRatio);

/** @internal */
export {
    _location as location,
    _navigator as navigator,
    _screen as screen,
    _devicePixelRatio as devicePixelRatio,
};
