import { safe } from '@cdp/core-utils';

/** @internal */ export const FormData        = safe(globalThis.FormData);
/** @internal */ export const Headers         = safe(globalThis.Headers);
/** @internal */ export const AbortController = safe(globalThis.AbortController);
/** @internal */ export const URLSearchParams = safe(globalThis.URLSearchParams);
/** @internal */ export const XMLHttpRequest  = safe(globalThis.XMLHttpRequest);
/** @internal */ export const fetch           = safe(globalThis.fetch);
