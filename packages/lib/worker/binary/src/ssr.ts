import { safe } from '@cdp/core-utils';

/** @internal */ const _btoa       = safe(globalThis.btoa);
/** @internal */ const _atob       = safe(globalThis.atob);
/** @internal */ const _Blob       = safe(globalThis.Blob);
/** @internal */ const _FileReader = safe(globalThis.FileReader);
/** @internal */ const _URL        = safe(globalThis.URL);

/** @internal */
export {
    _btoa as btoa,
    _atob as atob,
    _Blob as Blob,
    _FileReader as FileReader,
    _URL as URL,
};
