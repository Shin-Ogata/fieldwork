import { safe } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においてもオブジェクト等の存在を保証する
 */

/** @internal */ export const navigator        = safe(globalThis.navigator);
/** @internal */ export const screen           = safe(globalThis.screen);
/** @internal */ export const devicePixelRatio = safe(globalThis.devicePixelRatio);
