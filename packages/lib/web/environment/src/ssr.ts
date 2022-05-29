import { safe } from '@cdp/core-utils';

/* ts4.7 patch: non internal */
/** !internal */  const navigator        = safe(globalThis.navigator);
/** !internal */  const screen           = safe(globalThis.screen);
/** !internal */  const devicePixelRatio = safe(globalThis.devicePixelRatio);

/** @internal */ export const context = { navigator, screen, devicePixelRatio };
