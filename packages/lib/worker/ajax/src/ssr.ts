import { safe } from '@cdp/core-utils';

const _FormData = safe(globalThis.FormData);
const _Headers = safe(globalThis.Headers);
const _AbortController = safe(globalThis.AbortController);
const _URLSearchParams = safe(globalThis.URLSearchParams);
const _fetch = safe(globalThis.fetch);

export {
    _FormData as FormData,
    _Headers as Headers,
    _AbortController as AbortController,
    _URLSearchParams as URLSearchParams,
    _fetch as fetch,
};
