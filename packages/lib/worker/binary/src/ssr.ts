import { safe } from '@cdp/core-utils';

const _btoa = safe(globalThis.btoa);
const _atob = safe(globalThis.atob);
const _Blob = safe(globalThis.Blob);
const _FileReader = safe(globalThis.FileReader);
const _URL = safe(globalThis.URL);

export {
    _btoa as btoa,
    _atob as atob,
    _Blob as Blob,
    _FileReader as FileReader,
    _URL as URL,
};
