import { safe } from '@cdp/core-utils';

/** @internal */ export const webContext = safe(globalThis.window);
