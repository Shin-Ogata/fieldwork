import { safe } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においてもオブジェクト等の存在を保証する
 */

/** @internal */ export const window                = safe(globalThis.window);
/** @internal */ export const document              = safe(globalThis.document);
/** @internal */ export const CustomEvent           = safe(globalThis.CustomEvent);
/** @internal */ export const requestAnimationFrame = safe(globalThis.requestAnimationFrame);
