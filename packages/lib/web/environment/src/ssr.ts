import { safe } from '@cdp/core-utils';

/** @internal */ export const navigator        = safe(globalThis.navigator);
/** @internal */ export const screen           = safe(globalThis.screen);
/** @internal */ export const devicePixelRatio = safe(globalThis.devicePixelRatio);
