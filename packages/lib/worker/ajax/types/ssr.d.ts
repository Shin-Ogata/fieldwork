declare const _FormData: {
    new (): FormData;
    prototype: FormData;
};
declare const _Headers: {
    new (init?: Record<string, string> | Headers | string[][] | undefined): Headers;
    prototype: Headers;
};
declare const _AbortController: {
    new (): AbortController;
    prototype: AbortController;
};
declare const _URLSearchParams: {
    new (init?: string | Record<string, string> | URLSearchParams | string[][] | undefined): URLSearchParams;
    prototype: URLSearchParams;
};
declare const _XMLHttpRequest: {
    new (): XMLHttpRequest;
    prototype: XMLHttpRequest;
    readonly DONE: number;
    readonly HEADERS_RECEIVED: number;
    readonly LOADING: number;
    readonly OPENED: number;
    readonly UNSENT: number;
};
declare const _fetch: typeof fetch;
export { _FormData as FormData, _Headers as Headers, _AbortController as AbortController, _URLSearchParams as URLSearchParams, _XMLHttpRequest as XMLHttpRequest, _fetch as fetch, };
