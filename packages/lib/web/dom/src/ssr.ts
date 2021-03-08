import { safe } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においても
 * `window` オブジェクトと `document` オブジェクト等の存在を保証する
 */

/** @internal */ const win = safe(globalThis.window);
/** @internal */ const doc = safe(globalThis.document);
/** @internal */ const evt = safe(globalThis.CustomEvent);
/** @internal */ const requestAnimationFrame = win.requestAnimationFrame;

/** @internal */
export {
    win as window,
    doc as document,
    evt as CustomEvent,
    requestAnimationFrame,
};
