import { safe } from '@cdp/runtime';

/** @internal */ export const getComputedStyle = safe(globalThis.getComputedStyle);
