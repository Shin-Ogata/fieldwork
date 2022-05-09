import { safe } from '@cdp/core-utils';

/** @internal */ export const location              = safe(globalThis.location);
/** @internal */ export const document              = safe(globalThis.document);
/** @internal */ export const requestAnimationFrame = safe(globalThis.requestAnimationFrame);
/** @internal */ export const requestIdleCallback   = safe(globalThis.requestIdleCallback);
