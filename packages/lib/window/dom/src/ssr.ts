import { safe } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においても
 * `window` オブジェクトと `document` オブジェクトの存在を保証する
 */
const win = safe(globalThis.window);
const doc = safe(globalThis.document);

export {
    win as window,
    doc as document,
};
