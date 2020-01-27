import { safe } from '@cdp/core-utils';

/** @internal */
const _FormData = safe(globalThis.FormData);
/** @internal */
const _Headers = safe(globalThis.Headers);
/** @internal */
const _AbortController = safe(globalThis.AbortController);
/** @internal */
const _URLSearchParams = safe(globalThis.URLSearchParams);
/** @internal */
const _XMLHttpRequest = safe(globalThis.XMLHttpRequest);
/** @internal */
const _fetch = safe(globalThis.fetch);

/** @internal */
export {
    _FormData as FormData,
    _Headers as Headers,
    _AbortController as AbortController,
    _URLSearchParams as URLSearchParams,
    _XMLHttpRequest as XMLHttpRequest,
    _fetch as fetch,
};
