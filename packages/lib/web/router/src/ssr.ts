import { safe } from '@cdp/core-utils';
/** @internal */ export const window = safe(globalThis.window);
/** @internal */ export const URL = safe(globalThis.URL);
