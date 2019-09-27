declare const _btoa: typeof btoa;
declare const _atob: typeof atob;
declare const _Blob: {
    new (blobParts?: BlobPart[] | undefined, options?: BlobPropertyBag | undefined): Blob;
    prototype: Blob;
};
declare const _FileReader: {
    new (): FileReader;
    prototype: FileReader;
    readonly DONE: number;
    readonly EMPTY: number;
    readonly LOADING: number;
};
export { _btoa as btoa, _atob as atob, _Blob as Blob, _FileReader as FileReader, };
