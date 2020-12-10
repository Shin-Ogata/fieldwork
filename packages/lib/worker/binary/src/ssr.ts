import { safe } from '@cdp/core-utils';

/** @internal */ export const btoa       = safe(globalThis.btoa);
/** @internal */ export const atob       = safe(globalThis.atob);
/** @internal */ export const Blob       = safe(globalThis.Blob);
/** @internal */ export const FileReader = safe(globalThis.FileReader);
/** @internal */ export const URL        = safe(globalThis.URL);
