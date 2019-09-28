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
declare const _fetch: typeof fetch;
export { _Headers as Headers, _AbortController as AbortController, _URLSearchParams as URLSearchParams, _fetch as fetch, };
