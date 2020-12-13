/*!
 * @cdp/lib-worker 0.9.5
 *   worker library collection
 */

import { safe, checkCanceled, fromTypedData, restoreNil, toTypedData, verify, CancelToken, makeResult, RESULT_CODE, isNumber, isFunction, isString, className } from '@cdp/lib-core';

/*!
 * @cdp/binary 0.9.5
 *   binary utility module
 */

/** @internal */ const btoa = safe(globalThis.btoa);
/** @internal */ const atob = safe(globalThis.atob);
/** @internal */ const Blob = safe(globalThis.Blob);
/** @internal */ const FileReader = safe(globalThis.FileReader);
/** @internal */ const URL = safe(globalThis.URL);

/**
 * @en `base64` utility for independent charactor code.
 * @ja 文字コードに依存しない `base64` ユーティリティ
 */
class Base64 {
    /**
     * @en Encode a base-64 encoded string from a binary string.
     * @ja 文字列を base64 形式でエンコード
     */
    static encode(src) {
        return btoa(unescape(encodeURIComponent(src)));
    }
    /**
     * @en Decodes a string of data which has been encoded using base-64 encoding.
     * @ja base64 形式でエンコードされたデータの文字列をデコード
     */
    static decode(encoded) {
        return decodeURIComponent(escape(atob(encoded)));
    }
}

/** @internal execute read blob */
function exec(methodName, args, options) {
    const { cancel: token, onprogress } = options;
    token && verify('instanceOf', CancelToken, token);
    onprogress && verify('typeOf', 'function', onprogress);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const subscription = token && token.register(() => {
            reader.abort();
        });
        reader.onabort = reader.onerror = () => {
            reject(reader.error);
        };
        reader.onprogress = onprogress; // eslint-disable-line @typescript-eslint/no-non-null-assertion
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onloadend = () => {
            subscription && subscription.unsubscribe();
        };
        reader[methodName](...args);
    }, token);
}
/**
 * @en Get the `ArrayBuffer` result from `Blob` or `File`.
 * @ja `Blob` または `File` から `ArrayBuffer` を取得
 *
 * @param blob
 *  - `en` specified reading target object.
 *  - `ja` 読み取り対象のオブジェクトを指定
 * @param options
 *  - `en` reading options.
 *  - `ja` 読み取りオプションを指定
 */
function readAsArrayBuffer(blob, options) {
    return exec('readAsArrayBuffer', [blob], { ...options });
}
/**
 * @en Get the data-URL string from `Blob` or `File`.
 * @ja `Blob` または `File` から `data-url 文字列を取得
 *
 * @param blob
 *  - `en` specified reading target object.
 *  - `ja` 読み取り対象のオブジェクトを指定
 * @param options
 *  - `en` reading options.
 *  - `ja` 読み取りオプションを指定
 */
function readAsDataURL(blob, options) {
    return exec('readAsDataURL', [blob], { ...options });
}
/**
 * @en Get the text content string from `Blob` or `File`.
 * @ja `Blob` または `File` からテキスト文字列を取得
 *
 * @param blob
 *  - `en` specified reading target object.
 *  - `ja` 読み取り対象のオブジェクトを指定
 * @param encoding
 *  - `en` encoding string to use for the returned data. default: `utf-8`
 *  - `ja` エンコーディングを指定する文字列 既定: `utf-8`
 * @param options
 *  - `en` reading options.
 *  - `ja` 読み取りオプションを指定
 */
function readAsText(blob, encoding, options) {
    return exec('readAsText', [blob, encoding || undefined], { ...options });
}

/**
 * @internal
 * data URI 形式の正規表現
 * 参考: https://developer.mozilla.org/ja/docs/data_URIs
 */
function queryDataURLContext(dataURL) {
    const context = { base64: false };
    /**
     * [match] 1: mime-type
     *         2: ";base64" を含むオプション
     *         3: data 本体
     */
    const result = /^data:(.+?\/.+?)?(;.+?)?,(.*)$/.exec(dataURL);
    if (null == result) {
        throw new Error(`Invalid data-URL: ${dataURL}`);
    }
    context.mimeType = result[1];
    context.base64 = /;base64/.test(result[2]); // eslint-disable-line @typescript-eslint/prefer-includes
    context.data = result[3];
    return context;
}
//__________________________________________________________________________________________________//
/** @internal helper */
function binaryStringToBinary(bytes) {
    const array = bytes.split('').map(c => c.charCodeAt(0));
    return new Uint8Array(array);
}
/** @internal helper */
function binaryToBinaryString(binary) {
    return Array.prototype.map.call(binary, (i) => String.fromCharCode(i)).join('');
}
/**
 * @en Convert string to binary-string. (not human readable string)
 * @ja バイナリ文字列に変換
 *
 * @param text
 */
function toBinaryString(text) {
    return unescape(encodeURIComponent(text));
}
/**
 * @en Convert string from binary-string.
 * @ja バイナリ文字列から変換
 *
 * @param bytes
 */
function fromBinaryString(bytes) {
    return decodeURIComponent(escape(bytes));
}
/**
 * @en Convert binary to hex-string.
 * @ja バイナリを HEX 文字列に変換
 *
 * @param hex
 */
function fromHexString(hex) {
    const x = hex.match(/.{1,2}/g);
    return new Uint8Array(null != x ? x.map(byte => parseInt(byte, 16)) : []);
}
/**
 * @en Convert string from hex-string.
 * @ja HEX 文字列からバイナリに変換
 *
 * @param binary
 */
function toHexString(binary) {
    return binary.reduce((str, byte) => str + byte.toString(16).toUpperCase().padStart(2, '0'), '');
}
//__________________________________________________________________________________________________//
/**
 * @en Convert `Blob` to `ArrayBuffer`.
 * @ja `Blob` から `ArrayBuffer` へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
function blobToBuffer(blob, options) {
    return readAsArrayBuffer(blob, options);
}
/**
 * @en Convert `Blob` to `Uint8Array`.
 * @ja `Blob` から `Uint8Array` へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
async function blobToBinary(blob, options) {
    return new Uint8Array(await readAsArrayBuffer(blob, options));
}
/**
 * @en Convert `Blob` to data-URL string.
 * @ja `Blob` から data-URL 文字列へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
function blobToDataURL(blob, options) {
    return readAsDataURL(blob, options);
}
/**
 * @en Convert `Blob` to text string.
 * @ja `Blob` からテキストへ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
function blobToText(blob, options) {
    const opts = options || {};
    const { encoding } = opts;
    return readAsText(blob, encoding, opts);
}
/**
 * @en Convert `Blob` to Base64 string.
 * @ja `Blob` から Base64 文字列へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
async function blobToBase64(blob, options) {
    return queryDataURLContext(await readAsDataURL(blob, options)).data;
}
//__________________________________________________________________________________________________//
/**
 * @en Convert `ArrayBuffer` to `Blob`.
 * @ja `ArrayBuffer` から `Blob` に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
function bufferToBlob(buffer, mimeType = "application/octet-stream" /* BINARY */) {
    return new Blob([buffer], { type: mimeType });
}
/**
 * @en Convert `ArrayBuffer` to `Uint8Array`.
 * @ja `ArrayBuffer` から `Uint8Array` に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 */
function bufferToBinary(buffer) {
    return new Uint8Array(buffer);
}
/**
 * @en Convert `ArrayBuffer` to data-URL string.
 * @ja `ArrayBuffer` から data-URL 文字列に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
function bufferToDataURL(buffer, mimeType = "application/octet-stream" /* BINARY */) {
    return binaryToDataURL(new Uint8Array(buffer), mimeType);
}
/**
 * @en Convert `ArrayBuffer` to Base64 string.
 * @ja `ArrayBuffer` から Base64 文字列に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 */
function bufferToBase64(buffer) {
    return binaryToBase64(new Uint8Array(buffer));
}
/**
 * @en Convert `ArrayBuffer` to text string.
 * @ja `ArrayBuffer` からテキストに変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 */
function bufferToText(buffer) {
    return binaryToText(new Uint8Array(buffer));
}
//__________________________________________________________________________________________________//
/**
 * @en Convert `Uint8Array` to `Blob`.
 * @ja `Uint8Array` から `Blob` に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
function binaryToBlob(binary, mimeType = "application/octet-stream" /* BINARY */) {
    return new Blob([binary], { type: mimeType });
}
/**
 * @en Convert `Uint8Array` to `ArrayBuffer`.
 * @ja `Uint8Array` から `ArrayBuffer` に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 */
function binaryToBuffer(binary) {
    return binary.buffer;
}
/**
 * @en Convert `Uint8Array` to data-URL string.
 * @ja `Uint8Array` から data-URL 文字列に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
function binaryToDataURL(binary, mimeType = "application/octet-stream" /* BINARY */) {
    return `data:${mimeType};base64,${binaryToBase64(binary)}`;
}
/**
 * @en Convert `Uint8Array` to Base64 string.
 * @ja `Uint8Array` から Base64 文字列に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 */
function binaryToBase64(binary) {
    return Base64.encode(binaryToText(binary));
}
/**
 * @en Convert `Uint8Array` to text string.
 * @ja `Uint8Array` から テキストに変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 */
function binaryToText(binary) {
    return fromBinaryString(binaryToBinaryString(binary));
}
//__________________________________________________________________________________________________//
/**
 * @en Convert Base64 string to `Blob`.
 * @ja Base64 文字列から `Blob` に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
function base64ToBlob(base64, mimeType = "application/octet-stream" /* BINARY */) {
    return binaryToBlob(base64ToBinary(base64), mimeType);
}
/**
 * @en Convert Base64 string to `ArrayBuffer`.
 * @ja Base64 文字列から `ArrayBuffer` に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 */
function base64ToBuffer(base64) {
    return base64ToBinary(base64).buffer;
}
/**
 * @en Convert Base64 string to `Uint8Array`.
 * @ja Base64 文字列から `Uint8Array` に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 */
function base64ToBinary(base64) {
    return binaryStringToBinary(toBinaryString(Base64.decode(base64)));
}
/**
 * @en Convert Base64 string to data-URL string.
 * @ja Base64 文字列から data-URL 文字列に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
function base64ToDataURL(base64, mimeType = "application/octet-stream" /* BINARY */) {
    return `data:${mimeType};base64,${base64}`;
}
/**
 * @en Convert Base64 string to text string.
 * @ja  Base64 文字列から テキストに変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 */
function base64ToText(base64) {
    return Base64.decode(base64);
}
//__________________________________________________________________________________________________//
/**
 * @en Convert text string to `Blob`.
 * @ja テキストから `Blob` に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
function textToBlob(text, mimeType = "text/plain" /* TEXT */) {
    return new Blob([text], { type: mimeType });
}
/**
 * @en Convert text string to `ArrayBuffer`.
 * @ja テキストから `ArrayBuffer` に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 */
function textToBuffer(text) {
    return textToBinary(text).buffer;
}
/**
 * @en Convert text string to `Uint8Array`.
 * @ja テキストから `Uint8Array` に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 */
function textToBinary(text) {
    return binaryStringToBinary(toBinaryString(text));
}
/**
 * @en Convert text string to data-URL string.
 * @ja テキストから data-URL 文字列に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 * @param mimeType
 *  - `en` mime-type string
 *  - `ja` mime-type 文字列
 */
function textToDataURL(text, mimeType = "text/plain" /* TEXT */) {
    const base64 = textToBase64(text);
    return `data:${mimeType};base64,${base64}`;
}
/**
 * @en Convert text string to Base64 string.
 * @ja テキストから Base64 文字列に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 */
function textToBase64(text) {
    return Base64.encode(text);
}
//__________________________________________________________________________________________________//
/**
 * @en Convert data-URL string to `Blob`.
 * @ja data-URL 文字列から `Blob` に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
function dataURLToBlob(dataURL) {
    const context = queryDataURLContext(dataURL);
    if (context.base64) {
        return base64ToBlob(context.data, context.mimeType || "application/octet-stream" /* BINARY */);
    }
    else {
        return textToBlob(decodeURIComponent(context.data), context.mimeType || "text/plain" /* TEXT */);
    }
}
/**
 * @en Convert data-URL string to `ArrayBuffer`.
 * @ja data-URL 文字列から `ArrayBuffer` に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
function dataURLToBuffer(dataURL) {
    return dataURLToBinary(dataURL).buffer;
}
/**
 * @en Convert data-URL string to `Uint8Array`.
 * @ja data-URL 文字列から `Uint8Array` に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
function dataURLToBinary(dataURL) {
    return base64ToBinary(dataURLToBase64(dataURL));
}
/**
 * @en Convert data-URL string to text string.
 * @ja data-URL 文字列からテキストに変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
function dataURLToText(dataURL) {
    return Base64.decode(dataURLToBase64(dataURL));
}
/**
 * @en Convert data-URL string to Base64 string.
 * @ja data-URL 文字列から Base64 文字列に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
function dataURLToBase64(dataURL) {
    const context = queryDataURLContext(dataURL);
    if (context.base64) {
        return context.data;
    }
    else {
        return Base64.encode(decodeURIComponent(context.data));
    }
}
/**
 * @en Serialize data.
 * @ja データシリアライズ
 *
 * @param data input
 * @param options blob convert options
 */
async function serialize(data, options) {
    const { cancel } = options || {};
    await checkCanceled(cancel);
    if (null == data) {
        return String(data);
    }
    else if (data instanceof ArrayBuffer) {
        return bufferToDataURL(data);
    }
    else if (data instanceof Uint8Array) {
        return binaryToDataURL(data);
    }
    else if (data instanceof Blob) {
        return blobToDataURL(data, options);
    }
    else {
        return fromTypedData(data);
    }
}
async function deserialize(value, options) {
    const { dataType, cancel } = options || {};
    await checkCanceled(cancel);
    const data = restoreNil(toTypedData(value));
    switch (dataType) {
        case 'string':
            return fromTypedData(data);
        case 'number':
            return Number(data);
        case 'boolean':
            return Boolean(data);
        case 'object':
            return Object(data);
        case 'buffer':
            return dataURLToBuffer(fromTypedData(data));
        case 'binary':
            return dataURLToBinary(fromTypedData(data));
        case 'blob':
            return dataURLToBlob(fromTypedData(data));
        default:
            return data;
    }
}

/** @internal */ const _blobMap = new WeakMap();
/** @internal */ const _urlSet = new Set();
/**
 * @en `Blob URL` utility for automatic memory manegement.
 * @ja メモリ自動管理を行う `Blob URL` ユーティリティ
 */
class BlobURL {
    /**
     * @en Create `Blob URL` from instances.
     * @ja インスタンスを指定して `Blob URL` の構築
     */
    static create(...blobs) {
        for (const b of blobs) {
            const cache = _blobMap.get(b);
            if (cache) {
                continue;
            }
            const url = URL.createObjectURL(b);
            _blobMap.set(b, url);
            _urlSet.add(url);
        }
    }
    /**
     * @en Clear all `Blob URL` cache.
     * @ja すべての `Blob URL` キャッシュを破棄
     */
    static clear() {
        for (const url of _urlSet) {
            URL.revokeObjectURL(url);
        }
        _urlSet.clear();
    }
    /**
     * @en Get `Blob URL` from instance.
     * @ja インスタンスを指定して `Blob URL` の取得
     */
    static get(blob) {
        const cache = _blobMap.get(blob);
        if (cache) {
            return cache;
        }
        const url = URL.createObjectURL(blob);
        _blobMap.set(blob, url);
        _urlSet.add(url);
        return url;
    }
    /**
     * @en Check `Blob URL` is available from instance.
     * @ja インスタンスを指定して `Blob URL` が有効化判定
     */
    static has(blob) {
        return _blobMap.has(blob);
    }
    /**
     * @en Revoke `Blob URL` from instances.
     * @ja インスタンスを指定して `Blob URL` を無効化
     */
    static revoke(...blobs) {
        for (const b of blobs) {
            const url = _blobMap.get(b);
            if (url) {
                URL.revokeObjectURL(url);
                _blobMap.delete(b);
                _urlSet.delete(url);
            }
        }
    }
}

/*!
 * @cdp/ajax 0.9.5
 *   ajax utility module
 */

/* eslint-disable
    @typescript-eslint/no-namespace
 ,  @typescript-eslint/no-unused-vars
 ,  @typescript-eslint/restrict-plus-operands
 */
(function () {
    /**
     * @en Extends error code definitions.
     * @ja 拡張通エラーコード定義
     */
    let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    (function () {
        RESULT_CODE[RESULT_CODE["AJAX_DECLARE"] = 9007199254740991] = "AJAX_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_AJAX_RESPONSE"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 20 /* AJAX */ + 1, 'network error.')] = "ERROR_AJAX_RESPONSE";
        RESULT_CODE[RESULT_CODE["ERROR_AJAX_TIMEOUT"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* CDP */, 20 /* AJAX */ + 2, 'request timeout.')] = "ERROR_AJAX_TIMEOUT";
    })();
})();

/** @internal */ const _FormData = safe(globalThis.FormData);
/** @internal */ const _Headers = safe(globalThis.Headers);
/** @internal */ const _AbortController = safe(globalThis.AbortController);
/** @internal */ const _URLSearchParams = safe(globalThis.URLSearchParams);
/** @internal */ const _XMLHttpRequest = safe(globalThis.XMLHttpRequest);
/** @internal */ const _fetch = safe(globalThis.fetch);

/** @internal */ let _timeout;
const settings = {
    get timeout() {
        return _timeout;
    },
    set timeout(value) {
        _timeout = (isNumber(value) && 0 <= value) ? value : undefined;
    },
};

/** @internal */
const _acceptHeaderMap = {
    text: 'text/plain, text/html, application/xml; q=0.8, text/xml; q=0.8, */*; q=0.01',
    json: 'application/json, text/javascript, */*; q=0.01',
};
/**
 * @en Setup `headers` from options parameter.
 * @ja オプションから `headers` を設定
 *
 * @internal
 */
function setupHeaders(options) {
    const headers = new _Headers(options.headers);
    const { method, contentType, dataType, mode, body, username, password } = options;
    // Content-Type
    if ('POST' === method || 'PUT' === method || 'PATCH' === method) {
        /*
         * fetch() の場合, FormData を自動解釈するため, 指定がある場合は削除
         * https://stackoverflow.com/questions/35192841/fetch-post-with-multipart-form-data
         * https://muffinman.io/uploading-files-using-fetch-multipart-form-data/
         */
        if (headers.get('Content-Type') && body instanceof _FormData) {
            headers.delete('Content-Type');
        }
        else if (!headers.get('Content-Type')) {
            if (null == contentType && 'json' === dataType) {
                headers.set('Content-Type', 'application/json; charset=UTF-8');
            }
            else if (null != contentType) {
                headers.set('Content-Type', contentType);
            }
        }
    }
    // Accept
    if (!headers.get('Accept')) {
        headers.set('Accept', _acceptHeaderMap[dataType] || '*/*');
    }
    // X-Requested-With
    if ('cors' !== mode && !headers.get('X-Requested-With')) {
        headers.set('X-Requested-With', 'XMLHttpRequest');
    }
    // Basic Authorization
    if (null != username && !headers.get('Authorization')) {
        headers.set('Authorization', `Basic ${Base64.encode(`${username}:${password || ''}`)}`);
    }
    return headers;
}
/** @internal ensure string value */
function ensureParamValue(prop) {
    const value = isFunction(prop) ? prop() : prop;
    return undefined !== value ? String(value) : '';
}
/**
 * @en Convert `PlainObject` to query strings.
 * @ja `PlainObject` をクエリストリングに変換
 */
function toQueryStrings(data) {
    const params = [];
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    return params.join('&');
}
/**
 * @en Convert `PlainObject` to Ajax parameters object.
 * @ja `PlainObject` を Ajax パラメータオブジェクトに変換
 */
function toAjaxParams(data) {
    const params = {};
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            params[key] = value;
        }
    }
    return params;
}
/**
 * @en Perform an asynchronous HTTP (Ajax) request.
 * @ja HTTP (Ajax)リクエストの送信
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` Ajax request settings.
 *  - `ja` Ajaxリクエスト設定
 */
async function ajax(url, options) {
    const controller = new _AbortController();
    const abort = () => controller.abort();
    const opts = Object.assign({
        method: 'GET',
        dataType: 'response',
        timeout: settings.timeout,
    }, options, {
        signal: controller.signal,
    });
    const { cancel: originalToken, timeout } = opts;
    // cancellation
    if (originalToken) {
        if (originalToken.requested) {
            throw originalToken.reason;
        }
        originalToken.register(abort);
    }
    const source = CancelToken.source(originalToken);
    const { token } = source;
    token.register(abort);
    // timeout
    if (timeout) {
        setTimeout(() => source.cancel(makeResult(RESULT_CODE.ERROR_AJAX_TIMEOUT, 'request timeout')), timeout);
    }
    // normalize
    opts.method = opts.method.toUpperCase();
    // header
    opts.headers = setupHeaders(opts);
    // parse param
    const { method, data, dataType } = opts;
    if (null != data) {
        if (('GET' === method || 'HEAD' === method) && !url.includes('?')) {
            url += `?${toQueryStrings(data)}`;
        }
        else if (null == opts.body) {
            opts.body = new _URLSearchParams(toAjaxParams(data));
        }
    }
    // execute
    const response = await Promise.resolve(_fetch(url, opts), token);
    if ('response' === dataType) {
        return response;
    }
    else if (!response.ok) {
        throw makeResult(RESULT_CODE.ERROR_AJAX_RESPONSE, response.statusText, response);
    }
    else {
        return Promise.resolve(response[dataType](), token);
    }
}
ajax.settings = settings;

/** @internal */
function ensureDataType(dataType) {
    return dataType || 'json';
}
/**
 * @en `GET` request shortcut.
 * @ja `GET` リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param data
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーに送信されるデータ.
 * @param dataType
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーから返される期待するデータの型を指定
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
function get(url, data, dataType, options) {
    return ajax(url, { ...options, method: 'GET', data, dataType: ensureDataType(dataType) });
}
/**
 * @en `GET` text request shortcut.
 * @ja `GET` テキストリクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param data
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーに送信されるデータ.
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
function text(url, data, options) {
    return get(url, data, 'text', options);
}
/**
 * @en `GET` JSON request shortcut.
 * @ja `GET` JSON リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param data
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーに送信されるデータ.
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
function json(url, data, options) {
    return get(url, data, 'json', options);
}
/**
 * @en `GET` Blob request shortcut.
 * @ja `GET` Blob リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param data
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーに送信されるデータ.
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
function blob(url, data, options) {
    return get(url, data, 'blob', options);
}
/**
 * @en `POST` request shortcut.
 * @ja `POST` リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param data
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーに送信されるデータ.
 * @param dataType
 *  - `en` The type of data that you're expecting back from the server.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
function post(url, data, dataType, options) {
    return ajax(url, { ...options, method: 'POST', data, dataType: ensureDataType(dataType) });
}
/**
 * @en Synchronous `GET` request for resource access. <br>
 *     Many browsers have deprecated synchronous XHR support on the main thread entirely.
 * @ja リソース取得のための 同期 `GET` リクエスト. <br>
 *     多くのブラウザではメインスレッドにおける同期的な XHR の対応を全面的に非推奨としているので積極使用は避けること.
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param dataType
 *  - `en` The type of data that you're expecting back from the server.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param data
 *  - `en` Data to be sent to the server.
 *  - `ja` サーバーに送信されるデータ.
 */
function resource(url, dataType, data) {
    const xhr = new _XMLHttpRequest();
    if (null != data && !url.includes('?')) {
        url += `?${toQueryStrings(data)}`;
    }
    // synchronous
    xhr.open('GET', url, false);
    const type = ensureDataType(dataType);
    const headers = setupHeaders({ method: 'GET', dataType: type });
    headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
    });
    xhr.send(null);
    if (!(200 <= xhr.status && xhr.status < 300)) {
        throw makeResult(RESULT_CODE.ERROR_AJAX_RESPONSE, xhr.statusText, xhr);
    }
    return 'json' === type ? JSON.parse(xhr.response) : xhr.response;
}

const request = /*#__PURE__*/Object.freeze({
    __proto__: null,
    get: get,
    text: text,
    json: json,
    blob: blob,
    post: post,
    resource: resource
});

/*!
 * @cdp/inline-worker 0.9.5
 *   inline web worker utility module
 */

/** @internal */ const URL$1 = safe(globalThis.URL);
/** @internal */ const Worker = safe(globalThis.Worker);
/** @internal */ const Blob$1 = safe(globalThis.Blob);
/** @internal */
function createWorkerContext(src) {
    if (!(isFunction(src) || isString(src))) {
        throw new TypeError(`${className(src)} is not a function or string.`);
    }
    return URL$1.createObjectURL(new Blob$1([isFunction(src) ? `(${src.toString()})(self);` : src], { type: 'application/javascript' }));
}
/**
 * @en Specified `Worker` class which doesn't require a script file.
 * @ja スクリプトファイルを必要としない `Worker` クラス
 */
class InlineWorker extends Worker {
    /**
     * constructor
     *
     * @param src
     *  - `en` source function or script body.
     *  - `ja` 実行関数またはスクリプト実体
     * @param options
     *  - `en` worker options.
     *  - `ja` Worker オプション
     */
    constructor(src, options) {
        const context = createWorkerContext(src);
        super(context, options);
        this._context = context;
    }
    ///////////////////////////////////////////////////////////////////////
    // override: Worker
    terminate() {
        super.terminate();
        URL$1.revokeObjectURL(this._context);
    }
}

/**
 * @en Ensure execution in worker thread.
 * @ja ワーカースレッド内で実行を保証
 *
 * @example <br>
 *
 * ```ts
 * const exec = () => {
 *    // this scope is worker scope. you cannot use closure access.
 *    const param = {...};
 *    const method = (p) => {...};
 *    :
 *    return method(param);
 * };
 *
 * const result = await thread(exec);
 * ```
 *
 * @param executor
 *  - `en` implement as function scope.
 *  - `ja` 関数スコープとして実装
 * @param options
 *  - `en` thread options
 *  - `ja` スレッドオプション
 */
function thread(executor, options) {
    const { cancel: originalToken } = options || {};
    // already cancel
    if (originalToken?.requested) {
        throw originalToken.reason;
    }
    const exec = `(async (self) => {
        try {
            const result = await (${executor.toString()})();
            self.postMessage(result);
        } catch (e) {
            setTimeout(function() { throw e; });
        }
    })(self);`;
    const worker = new InlineWorker(exec, options);
    const abort = () => worker.terminate();
    originalToken?.register(abort);
    const { token } = CancelToken.source(originalToken);
    return new Promise((resolve, reject) => {
        worker.onerror = ev => {
            ev.preventDefault();
            reject(ev);
            worker.terminate();
        };
        worker.onmessage = ev => {
            resolve(ev.data);
            worker.terminate();
        };
    }, token);
}

export { Base64, BlobURL, InlineWorker, ajax, base64ToBinary, base64ToBlob, base64ToBuffer, base64ToDataURL, base64ToText, binaryToBase64, binaryToBlob, binaryToBuffer, binaryToDataURL, binaryToText, blobToBase64, blobToBinary, blobToBuffer, blobToDataURL, blobToText, bufferToBase64, bufferToBinary, bufferToBlob, bufferToDataURL, bufferToText, dataURLToBase64, dataURLToBinary, dataURLToBlob, dataURLToBuffer, dataURLToText, deserialize, fromBinaryString, fromHexString, readAsArrayBuffer, readAsDataURL, readAsText, request, serialize, setupHeaders, textToBase64, textToBinary, textToBlob, textToBuffer, textToDataURL, thread, toAjaxParams, toBinaryString, toHexString, toQueryStrings };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLXdvcmtlci5tanMiLCJzb3VyY2VzIjpbImJpbmFyeS9zc3IudHMiLCJiaW5hcnkvYmFzZTY0LnRzIiwiYmluYXJ5L2Jsb2ItcmVhZGVyLnRzIiwiYmluYXJ5L2NvbnZlcnRlci50cyIsImJpbmFyeS9ibG9iLXVybC50cyIsImFqYXgvcmVzdWx0LWNvZGUtZGVmcy50cyIsImFqYXgvc3NyLnRzIiwiYWpheC9zZXR0aW5ncy50cyIsImFqYXgvY29yZS50cyIsImFqYXgvcmVxdWVzdC50cyIsImlubGluZS13b3JrZXIvaW5pbmUtd29ya2VyLnRzIiwiaW5saW5lLXdvcmtlci90aHJlYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGJ0b2EgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuYnRvYSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBhdG9iICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmF0b2IpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgQmxvYiAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5CbG9iKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEZpbGVSZWFkZXIgPSBzYWZlKGdsb2JhbFRoaXMuRmlsZVJlYWRlcik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBVUkwgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLlVSTCk7XG4iLCJpbXBvcnQgeyBhdG9iLCBidG9hIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBgYmFzZTY0YCB1dGlsaXR5IGZvciBpbmRlcGVuZGVudCBjaGFyYWN0b3IgY29kZS5cbiAqIEBqYSDmloflrZfjgrPjg7zjg4njgavkvp3lrZjjgZfjgarjgYQgYGJhc2U2NGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCYXNlNjQge1xuICAgIC8qKlxuICAgICAqIEBlbiBFbmNvZGUgYSBiYXNlLTY0IGVuY29kZWQgc3RyaW5nIGZyb20gYSBiaW5hcnkgc3RyaW5nLlxuICAgICAqIEBqYSDmloflrZfliJfjgpIgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZW5jb2RlKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHNyYykpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjb2RlcyBhIHN0cmluZyBvZiBkYXRhIHdoaWNoIGhhcyBiZWVuIGVuY29kZWQgdXNpbmcgYmFzZS02NCBlbmNvZGluZy5cbiAgICAgKiBAamEgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODieOBleOCjOOBn+ODh+ODvOOCv+OBruaWh+Wtl+WIl+OCkuODh+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZGVjb2RlKGVuY29kZWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGF0b2IoZW5jb2RlZCkpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVbmtub3duRnVuY3Rpb24sIHZlcmlmeSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDYW5jZWxUb2tlbiwgQ2FuY2VsYWJsZSB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBGaWxlUmVhZGVyIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRmlsZVJlYWRlckFyZ3NNYXAge1xuICAgIHJlYWRBc0FycmF5QnVmZmVyOiBbQmxvYl07XG4gICAgcmVhZEFzRGF0YVVSTDogW0Jsb2JdO1xuICAgIHJlYWRBc1RleHQ6IFtCbG9iLCBzdHJpbmcgfCB1bmRlZmluZWRdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRmlsZVJlYWRlclJlc3VsdE1hcCB7XG4gICAgcmVhZEFzQXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyO1xuICAgIHJlYWRBc0RhdGFVUkw6IHN0cmluZztcbiAgICByZWFkQXNUZXh0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGVuIGBCbG9iYCByZWFkIG9wdGlvbnNcbiAqIEBqYSBgQmxvYmAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQmxvYlJlYWRPcHRpb25zIGV4dGVuZHMgQ2FuY2VsYWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb2dyZXNzIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBqYSDpgLLmjZfjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9ncmVzc1xuICAgICAqICAtIGBlbmAgd29ya2VyIHByb2dyZXNzIGV2ZW50XG4gICAgICogIC0gYGphYCB3b3JrZXIg6YCy5o2X44Kk44OZ44Oz44OIXG4gICAgICovXG4gICAgb25wcm9ncmVzcz86IChwcm9ncmVzczogUHJvZ3Jlc3NFdmVudCkgPT4gdW5rbm93bjtcbn1cblxuLyoqIEBpbnRlcm5hbCBleGVjdXRlIHJlYWQgYmxvYiAqL1xuZnVuY3Rpb24gZXhlYzxUIGV4dGVuZHMga2V5b2YgRmlsZVJlYWRlclJlc3VsdE1hcD4oXG4gICAgbWV0aG9kTmFtZTogVCxcbiAgICBhcmdzOiBGaWxlUmVhZGVyQXJnc01hcFtUXSxcbiAgICBvcHRpb25zOiBCbG9iUmVhZE9wdGlvbnMsXG4pOiBQcm9taXNlPEZpbGVSZWFkZXJSZXN1bHRNYXBbVF0+IHtcbiAgICB0eXBlIFRSZXN1bHQgPSBGaWxlUmVhZGVyUmVzdWx0TWFwW1RdO1xuICAgIGNvbnN0IHsgY2FuY2VsOiB0b2tlbiwgb25wcm9ncmVzcyB9ID0gb3B0aW9ucztcbiAgICB0b2tlbiAmJiB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdG9rZW4pO1xuICAgIG9ucHJvZ3Jlc3MgJiYgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBvbnByb2dyZXNzKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8VFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0b2tlbiAmJiB0b2tlbi5yZWdpc3RlcigoKSA9PiB7XG4gICAgICAgICAgICByZWFkZXIuYWJvcnQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlYWRlci5vbmFib3J0ID0gcmVhZGVyLm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVhZGVyLm9ucHJvZ3Jlc3MgPSBvbnByb2dyZXNzITsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQgYXMgVFJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSAoKSA9PiB7XG4gICAgICAgICAgICBzdWJzY3JpcHRpb24gJiYgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH07XG4gICAgICAgIChyZWFkZXJbbWV0aG9kTmFtZV0gYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmdzKTtcbiAgICB9LCB0b2tlbik7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgYEFycmF5QnVmZmVyYCByZXN1bHQgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0FycmF5QnVmZmVyKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0FycmF5QnVmZmVyJywgW2Jsb2JdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGF0YS1VUkwgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgokgYGRhdGEtdXJsIOaWh+Wtl+WIl+OCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0RhdGFVUkwoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0RhdGFVUkwnLCBbYmxvYl0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnQgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgonjg4bjgq3jgrnjg4jmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBlbmNvZGluZ1xuICogIC0gYGVuYCBlbmNvZGluZyBzdHJpbmcgdG8gdXNlIGZvciB0aGUgcmV0dXJuZWQgZGF0YS4gZGVmYXVsdDogYHV0Zi04YFxuICogIC0gYGphYCDjgqjjg7PjgrPjg7zjg4fjgqPjg7PjgrDjgpLmjIflrprjgZnjgovmloflrZfliJcg5pei5a6aOiBgdXRmLThgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzVGV4dChibG9iOiBCbG9iLCBlbmNvZGluZz86IHN0cmluZyB8IG51bGwsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNUZXh0JywgW2Jsb2IsIGVuY29kaW5nIHx8IHVuZGVmaW5lZF0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBUeXBlcyxcbiAgICBUeXBlVG9LZXksXG4gICAgdG9UeXBlZERhdGEsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICByZXN0b3JlTmlsLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICcuL2Jhc2U2NCc7XG5pbXBvcnQge1xuICAgIEJsb2JSZWFkT3B0aW9ucyxcbiAgICByZWFkQXNBcnJheUJ1ZmZlcixcbiAgICByZWFkQXNEYXRhVVJMLFxuICAgIHJlYWRBc1RleHQsXG59IGZyb20gJy4vYmxvYi1yZWFkZXInO1xuaW1wb3J0IHsgQmxvYiB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBNaW1lVHlwZSB7XG4gICAgQklOQVJZID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScsXG4gICAgVEVYVCA9ICd0ZXh0L3BsYWluJyxcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZGF0YS1VUkwg5bGe5oCnICovXG5pbnRlcmZhY2UgRGF0YVVSTENvbnRleHQge1xuICAgIG1pbWVUeXBlOiBzdHJpbmc7XG4gICAgYmFzZTY0OiBib29sZWFuO1xuICAgIGRhdGE6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIGRhdGEgVVJJIOW9ouW8j+OBruato+imj+ihqOePvlxuICog5Y+C6ICDOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL2RhdGFfVVJJc1xuICovXG5mdW5jdGlvbiBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkw6IHN0cmluZyk6IERhdGFVUkxDb250ZXh0IHtcbiAgICBjb25zdCBjb250ZXh0ID0geyBiYXNlNjQ6IGZhbHNlIH0gYXMgRGF0YVVSTENvbnRleHQ7XG5cbiAgICAvKipcbiAgICAgKiBbbWF0Y2hdIDE6IG1pbWUtdHlwZVxuICAgICAqICAgICAgICAgMjogXCI7YmFzZTY0XCIg44KS5ZCr44KA44Kq44OX44K344On44OzXG4gICAgICogICAgICAgICAzOiBkYXRhIOacrOS9k1xuICAgICAqL1xuICAgIGNvbnN0IHJlc3VsdCA9IC9eZGF0YTooLis/XFwvLis/KT8oOy4rPyk/LCguKikkLy5leGVjKGRhdGFVUkwpO1xuICAgIGlmIChudWxsID09IHJlc3VsdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGF0YS1VUkw6ICR7ZGF0YVVSTH1gKTtcbiAgICB9XG5cbiAgICBjb250ZXh0Lm1pbWVUeXBlID0gcmVzdWx0WzFdO1xuICAgIGNvbnRleHQuYmFzZTY0ID0gLztiYXNlNjQvLnRlc3QocmVzdWx0WzJdKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWluY2x1ZGVzXG4gICAgY29udGV4dC5kYXRhID0gcmVzdWx0WzNdO1xuXG4gICAgcmV0dXJuIGNvbnRleHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGhlbHBlciAqL1xuZnVuY3Rpb24gYmluYXJ5U3RyaW5nVG9CaW5hcnkoYnl0ZXM6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IGFycmF5ID0gYnl0ZXMuc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKSk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGFycmF5KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGJpbmFyeVRvQmluYXJ5U3RyaW5nKGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5tYXAuY2FsbChiaW5hcnksIChpOiBudW1iZXIpID0+IFN0cmluZy5mcm9tQ2hhckNvZGUoaSkpLmpvaW4oJycpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyB0byBiaW5hcnktc3RyaW5nLiAobm90IGh1bWFuIHJlYWRhYmxlIHN0cmluZylcbiAqIEBqYSDjg5DjgqTjg4rjg6rmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9CaW5hcnlTdHJpbmcodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHRleHQpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgZnJvbSBiaW5hcnktc3RyaW5nLlxuICogQGphIOODkOOCpOODiuODquaWh+Wtl+WIl+OBi+OCieWkieaPm1xuICpcbiAqIEBwYXJhbSBieXRlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUJpbmFyeVN0cmluZyhieXRlczogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShieXRlcykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGJpbmFyeSB0byBoZXgtc3RyaW5nLlxuICogQGphIOODkOOCpOODiuODquOCkiBIRVgg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGhleFxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUhleFN0cmluZyhoZXg6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IHggPSBoZXgubWF0Y2goLy57MSwyfS9nKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobnVsbCAhPSB4ID8geC5tYXAoYnl0ZSA9PiBwYXJzZUludChieXRlLCAxNikpIDogW10pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyBmcm9tIGhleC1zdHJpbmcuXG4gKiBAamEgSEVYIOaWh+Wtl+WIl+OBi+OCieODkOOCpOODiuODquOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvSGV4U3RyaW5nKGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeS5yZWR1Y2UoKHN0ciwgYnl0ZSkgPT4gc3RyICsgYnl0ZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKS5wYWRTdGFydCgyLCAnMCcpLCAnJyk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGBCbG9iYCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb0J1ZmZlcihibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIHJldHVybiByZWFkQXNBcnJheUJ1ZmZlcihibG9iLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGBCbG9iYCDjgYvjgokgYFVpbnQ4QXJyYXlgIOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYmxvYlRvQmluYXJ5KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXdhaXQgcmVhZEFzQXJyYXlCdWZmZXIoYmxvYiwgb3B0aW9ucykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb0RhdGFVUkwoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHJlYWRBc0RhdGFVUkwoYmxvYiwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgonjg4bjgq3jgrnjg4jjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb1RleHQoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyAmIHsgZW5jb2Rpbmc/OiBzdHJpbmcgfCBudWxsOyB9KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBvcHRzID0gb3B0aW9ucyB8fCB7fTtcbiAgICBjb25zdCB7IGVuY29kaW5nIH0gPSBvcHRzO1xuICAgIHJldHVybiByZWFkQXNUZXh0KGJsb2IsIGVuY29kaW5nLCBvcHRzKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJsb2JUb0Jhc2U2NChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gcXVlcnlEYXRhVVJMQ29udGV4dChhd2FpdCByZWFkQXNEYXRhVVJMKGJsb2IsIG9wdGlvbnMpKS5kYXRhO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGBCbG9iYC5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0Jsb2IoYnVmZmVyOiBBcnJheUJ1ZmZlciwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbYnVmZmVyXSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0JpbmFyeShidWZmZXI6IEFycmF5QnVmZmVyKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0RhdGFVUkwoYnVmZmVyOiBBcnJheUJ1ZmZlciwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvRGF0YVVSTChuZXcgVWludDhBcnJheShidWZmZXIpLCBtaW1lVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb0Jhc2U2NChuZXcgVWludDhBcnJheShidWZmZXIpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJ44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb1RleHQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvVGV4dChuZXcgVWludDhBcnJheShidWZmZXIpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGBCbG9iYC5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0Jsb2IoYmluYXJ5OiBVaW50OEFycmF5LCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFtiaW5hcnldLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0J1ZmZlcihiaW5hcnk6IFVpbnQ4QXJyYXkpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGJpbmFyeS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvRGF0YVVSTChiaW5hcnk6IFVpbnQ4QXJyYXksIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiaW5hcnlUb0Jhc2U2NChiaW5hcnkpfWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CYXNlNjQoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmVuY29kZShiaW5hcnlUb1RleHQoYmluYXJ5KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokg44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9UZXh0KGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGZyb21CaW5hcnlTdHJpbmcoYmluYXJ5VG9CaW5hcnlTdHJpbmcoYmluYXJ5KSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmxvYihiYXNlNjQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBiaW5hcnlUb0Jsb2IoYmFzZTY0VG9CaW5hcnkoYmFzZTY0KSwgbWltZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CdWZmZXIoYmFzZTY0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGJhc2U2NFRvQmluYXJ5KGJhc2U2NCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmluYXJ5KGJhc2U2NDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJpbmFyeVN0cmluZ1RvQmluYXJ5KHRvQmluYXJ5U3RyaW5nKEJhc2U2NC5kZWNvZGUoYmFzZTY0KSkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9EYXRhVVJMKGJhc2U2NDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSAgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSDjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb1RleHQoYmFzZTY0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKGJhc2U2NCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CbG9iKHRleHQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLlRFWFQpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW3RleHRdLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0J1ZmZlcih0ZXh0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRleHRUb0JpbmFyeSh0ZXh0KS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0JpbmFyeSh0ZXh0OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmluYXJ5U3RyaW5nVG9CaW5hcnkodG9CaW5hcnlTdHJpbmcodGV4dCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0RhdGFVUkwodGV4dDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuVEVYVCk6IHN0cmluZyB7XG4gICAgY29uc3QgYmFzZTY0ID0gdGV4dFRvQmFzZTY0KHRleHQpO1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiYXNlNjR9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0Jhc2U2NCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKHRleHQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CbG9iKGRhdGFVUkw6IHN0cmluZyk6IEJsb2Ige1xuICAgIGNvbnN0IGNvbnRleHQgPSBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkwpO1xuICAgIGlmIChjb250ZXh0LmJhc2U2NCkge1xuICAgICAgICByZXR1cm4gYmFzZTY0VG9CbG9iKGNvbnRleHQuZGF0YSwgY29udGV4dC5taW1lVHlwZSB8fCBNaW1lVHlwZS5CSU5BUlkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0ZXh0VG9CbG9iKGRlY29kZVVSSUNvbXBvbmVudChjb250ZXh0LmRhdGEpLCBjb250ZXh0Lm1pbWVUeXBlIHx8IE1pbWVUeXBlLlRFWFQpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0J1ZmZlcihkYXRhVVJMOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGRhdGFVUkxUb0JpbmFyeShkYXRhVVJMKS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmluYXJ5KGRhdGFVUkw6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiYXNlNjRUb0JpbmFyeShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgonjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb1RleHQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmRlY29kZShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMKTtcbiAgICBpZiAoY29udGV4dC5iYXNlNjQpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQuZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gQmFzZTY0LmVuY29kZShkZWNvZGVVUklDb21wb25lbnQoY29udGV4dC5kYXRhKSk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gU2VyaWFsaXphYmxlIGRhdGEgdHlwZSBsaXN0LlxuICogQGphIOOCt+ODquOCouODqeOCpOOCuuWPr+iDveOBquODh+ODvOOCv+Wei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlcmlhbGl6YWJsZSB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBvYmplY3Q6IG9iamVjdDtcbiAgICBidWZmZXI6IEFycmF5QnVmZmVyO1xuICAgIGJpbmFyeTogVWludDhBcnJheTtcbiAgICBibG9iOiBCbG9iO1xufVxuXG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVEYXRhVHlwZXMgPSBUeXBlczxTZXJpYWxpemFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXMgPSBTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkO1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlS2V5cyA9IEtleXM8U2VyaWFsaXphYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUNhc3RhYmxlID0gT21pdDxTZXJpYWxpemFibGUsICdidWZmZXInIHwgJ2JpbmFyeScgfCAnYmxvYic+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcyA9IFR5cGVzPFNlcmlhbGl6YWJsZUNhc3RhYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZVJldHVyblR5cGU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXM+ID0gVHlwZVRvS2V5PFNlcmlhbGl6YWJsZUNhc3RhYmxlLCBUPiBleHRlbmRzIG5ldmVyID8gbmV2ZXIgOiBUIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemFibGUgb3B0aW9ucyBpbnRlcmZhY2UuXG4gKiBAamEg44OH44K344Oq44Ki44Op44Kk44K644Gr5L2/55So44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVzZXJpYWxpemVPcHRpb25zPFQgZXh0ZW5kcyBTZXJpYWxpemFibGUgPSBTZXJpYWxpemFibGUsIEsgZXh0ZW5kcyBLZXlzPFQ+ID0gS2V5czxUPj4gZXh0ZW5kcyBDYW5jZWxhYmxlIHtcbiAgICAvKiogW1tTZXJpYWxpemFibGVLZXlzXV0gKi9cbiAgICBkYXRhVHlwZT86IEs7XG59XG5cbi8qKlxuICogQGVuIFNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OCt+ODquOCouODqeOCpOOCulxuICpcbiAqIEBwYXJhbSBkYXRhIGlucHV0XG4gKiBAcGFyYW0gb3B0aW9ucyBibG9iIGNvbnZlcnQgb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVJbnB1dERhdGFUeXBlcz4oZGF0YTogVCwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgfHwge307XG4gICAgYXdhaXQgY2MoY2FuY2VsKTtcbiAgICBpZiAobnVsbCA9PSBkYXRhKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlclRvRGF0YVVSTChkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBVaW50OEFycmF5KSB7XG4gICAgICAgIHJldHVybiBiaW5hcnlUb0RhdGFVUkwoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICByZXR1cm4gYmxvYlRvRGF0YVVSTChkYXRhLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YShkYXRhKSBhcyBzdHJpbmc7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OBruW+qeWFg1xuICpcbiAqIEBwYXJhbSB2YWx1ZSBpbnB1dCBzdHJpbmcgb3IgdW5kZWZpbmVkLlxuICogQHBhcmFtIG9wdGlvbnMgZGVzZXJpYWxpemUgb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXMgPSBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzPihcbiAgICB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zPzogRGVzZXJpYWxpemVPcHRpb25zPFNlcmlhbGl6YWJsZSwgbmV2ZXI+XG4pOiBQcm9taXNlPFNlcmlhbGl6YWJsZVJldHVyblR5cGU8VD4+O1xuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OBruW+qeWFg1xuICpcbiAqIEBwYXJhbSB2YWx1ZSBpbnB1dCBzdHJpbmcgb3IgdW5kZWZpbmVkLlxuICogQHBhcmFtIG9wdGlvbnMgZGVzZXJpYWxpemUgb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUtleXM+KHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM6IERlc2VyaWFsaXplT3B0aW9uczxTZXJpYWxpemFibGUsIFQ+KTogUHJvbWlzZTxTZXJpYWxpemFibGVbVF0gfCBudWxsIHwgdW5kZWZpbmVkPjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlc2VyaWFsaXplKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBEZXNlcmlhbGl6ZU9wdGlvbnMpOiBQcm9taXNlPFNlcmlhbGl6YWJsZURhdGFUeXBlcyB8IG51bGwgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCB7IGRhdGFUeXBlLCBjYW5jZWwgfSA9IG9wdGlvbnMgfHwge307XG4gICAgYXdhaXQgY2MoY2FuY2VsKTtcblxuICAgIGNvbnN0IGRhdGEgPSByZXN0b3JlTmlsKHRvVHlwZWREYXRhKHZhbHVlKSk7XG4gICAgc3dpdGNoIChkYXRhVHlwZSkge1xuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgcmV0dXJuIGZyb21UeXBlZERhdGEoZGF0YSk7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICByZXR1cm4gTnVtYmVyKGRhdGEpO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgIHJldHVybiBCb29sZWFuKGRhdGEpO1xuICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdChkYXRhKTtcbiAgICAgICAgY2FzZSAnYnVmZmVyJzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CdWZmZXIoZnJvbVR5cGVkRGF0YShkYXRhKSBhcyBzdHJpbmcpO1xuICAgICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGFVUkxUb0JpbmFyeShmcm9tVHlwZWREYXRhKGRhdGEpIGFzIHN0cmluZyk7XG4gICAgICAgIGNhc2UgJ2Jsb2InOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGFVUkxUb0Jsb2IoZnJvbVR5cGVkRGF0YShkYXRhKSBhcyBzdHJpbmcpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVVJMIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9ibG9iTWFwID0gbmV3IFdlYWtNYXA8QmxvYiwgc3RyaW5nPigpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfdXJsU2V0ICA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4vKipcbiAqIEBlbiBgQmxvYiBVUkxgIHV0aWxpdHkgZm9yIGF1dG9tYXRpYyBtZW1vcnkgbWFuZWdlbWVudC5cbiAqIEBqYSDjg6Hjg6Ljg6roh6rli5XnrqHnkIbjgpLooYzjgYYgYEJsb2IgVVJMYCDjg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAqL1xuZXhwb3J0IGNsYXNzIEJsb2JVUkwge1xuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlcy5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44Gu5qeL56+JXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGUoLi4uYmxvYnM6IEJsb2JbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGIgb2YgYmxvYnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gX2Jsb2JNYXAuZ2V0KGIpO1xuICAgICAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGIpO1xuICAgICAgICAgICAgX2Jsb2JNYXAuc2V0KGIsIHVybCk7XG4gICAgICAgICAgICBfdXJsU2V0LmFkZCh1cmwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGFsbCBgQmxvYiBVUkxgIGNhY2hlLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga4gYEJsb2IgVVJMYCDjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4RcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNsZWFyKCk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiBfdXJsU2V0KSB7XG4gICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgIH1cbiAgICAgICAgX3VybFNldC5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjga7lj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGdldChibG9iOiBCbG9iKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgY2FjaGUgPSBfYmxvYk1hcC5nZXQoYmxvYik7XG4gICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhY2hlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgIF9ibG9iTWFwLnNldChibG9iLCB1cmwpO1xuICAgICAgICBfdXJsU2V0LmFkZCh1cmwpO1xuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBgQmxvYiBVUkxgIGlzIGF2YWlsYWJsZSBmcm9tIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjgYzmnInlirnljJbliKTlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGhhcyhibG9iOiBCbG9iKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBfYmxvYk1hcC5oYXMoYmxvYik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldm9rZSBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjgpLnhKHlirnljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHJldm9rZSguLi5ibG9iczogQmxvYltdKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgYiBvZiBibG9icykge1xuICAgICAgICAgICAgY29uc3QgdXJsID0gX2Jsb2JNYXAuZ2V0KGIpO1xuICAgICAgICAgICAgaWYgKHVybCkge1xuICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgICAgICAgICBfYmxvYk1hcC5kZWxldGUoYik7XG4gICAgICAgICAgICAgICAgX3VybFNldC5kZWxldGUodXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICwgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICwgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQUpBWCA9IENEUF9LTk9XTl9NT0RVTEUuQUpBWCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by16YCa44Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBBSkFYX0RFQ0xBUkUgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9BSkFYX1JFU1BPTlNFID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDEsICduZXR3b3JrIGVycm9yLicpLFxuICAgICAgICBFUlJPUl9BSkFYX1RJTUVPVVQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDIsICdyZXF1ZXN0IHRpbWVvdXQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX0Zvcm1EYXRhICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5Gb3JtRGF0YSk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9IZWFkZXJzICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuSGVhZGVycyk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF9BYm9ydENvbnRyb2xsZXIgPSBzYWZlKGdsb2JhbFRoaXMuQWJvcnRDb250cm9sbGVyKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX1VSTFNlYXJjaFBhcmFtcyA9IHNhZmUoZ2xvYmFsVGhpcy5VUkxTZWFyY2hQYXJhbXMpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfWE1MSHR0cFJlcXVlc3QgID0gc2FmZShnbG9iYWxUaGlzLlhNTEh0dHBSZXF1ZXN0KTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2ZldGNoICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5mZXRjaCk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB7XG4gICAgX0Zvcm1EYXRhIGFzIEZvcm1EYXRhLFxuICAgIF9IZWFkZXJzIGFzIEhlYWRlcnMsXG4gICAgX0Fib3J0Q29udHJvbGxlciBhcyBBYm9ydENvbnRyb2xsZXIsXG4gICAgX1VSTFNlYXJjaFBhcmFtcyBhcyBVUkxTZWFyY2hQYXJhbXMsXG4gICAgX1hNTEh0dHBSZXF1ZXN0IGFzIFhNTEh0dHBSZXF1ZXN0LFxuICAgIF9mZXRjaCBhcyBmZXRjaCxcbn07XG4iLCJpbXBvcnQgeyBpc051bWJlciB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF90aW1lb3V0OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbmV4cG9ydCBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICBnZXQgdGltZW91dCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX3RpbWVvdXQ7XG4gICAgfSxcbiAgICBzZXQgdGltZW91dCh2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIF90aW1lb3V0ID0gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xuICAgIH0sXG59O1xuIiwiaW1wb3J0IHsgUGxhaW5PYmplY3QsIGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICdAY2RwL2JpbmFyeSc7XG5pbXBvcnQge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgRm9ybURhdGEsXG4gICAgSGVhZGVycyxcbiAgICBBYm9ydENvbnRyb2xsZXIsXG4gICAgVVJMU2VhcmNoUGFyYW1zLFxuICAgIGZldGNoLFxufSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBzZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBBamF4SGVhZGVyT3B0aW9ucyA9IFBpY2s8QWpheE9wdGlvbnM8QWpheERhdGFUeXBlcz4sICdoZWFkZXJzJyB8ICdtZXRob2QnIHwgJ2NvbnRlbnRUeXBlJyB8ICdkYXRhVHlwZScgfCAnbW9kZScgfCAnYm9keScgfCAndXNlcm5hbWUnIHwgJ3Bhc3N3b3JkJz47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9hY2NlcHRIZWFkZXJNYXAgPSB7XG4gICAgdGV4dDogJ3RleHQvcGxhaW4sIHRleHQvaHRtbCwgYXBwbGljYXRpb24veG1sOyBxPTAuOCwgdGV4dC94bWw7IHE9MC44LCAqLyo7IHE9MC4wMScsXG4gICAganNvbjogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdCwgKi8qOyBxPTAuMDEnLFxufTtcblxuLyoqXG4gKiBAZW4gU2V0dXAgYGhlYWRlcnNgIGZyb20gb3B0aW9ucyBwYXJhbWV0ZXIuXG4gKiBAamEg44Kq44OX44K344On44Oz44GL44KJIGBoZWFkZXJzYCDjgpLoqK3lrppcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSGVhZGVycyhvcHRpb25zOiBBamF4SGVhZGVyT3B0aW9ucyk6IEhlYWRlcnMge1xuICAgIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpO1xuICAgIGNvbnN0IHsgbWV0aG9kLCBjb250ZW50VHlwZSwgZGF0YVR5cGUsIG1vZGUsIGJvZHksIHVzZXJuYW1lLCBwYXNzd29yZCB9ID0gb3B0aW9ucztcblxuICAgIC8vIENvbnRlbnQtVHlwZVxuICAgIGlmICgnUE9TVCcgPT09IG1ldGhvZCB8fCAnUFVUJyA9PT0gbWV0aG9kIHx8ICdQQVRDSCcgPT09IG1ldGhvZCkge1xuICAgICAgICAvKlxuICAgICAgICAgKiBmZXRjaCgpIOOBruWgtOWQiCwgRm9ybURhdGEg44KS6Ieq5YuV6Kej6YeI44GZ44KL44Gf44KBLCDmjIflrprjgYzjgYLjgovloLTlkIjjga/liYrpmaRcbiAgICAgICAgICogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzUxOTI4NDEvZmV0Y2gtcG9zdC13aXRoLW11bHRpcGFydC1mb3JtLWRhdGFcbiAgICAgICAgICogaHR0cHM6Ly9tdWZmaW5tYW4uaW8vdXBsb2FkaW5nLWZpbGVzLXVzaW5nLWZldGNoLW11bHRpcGFydC1mb3JtLWRhdGEvXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpICYmIGJvZHkgaW5zdGFuY2VvZiBGb3JtRGF0YSkge1xuICAgICAgICAgICAgaGVhZGVycy5kZWxldGUoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICB9IGVsc2UgaWYgKCFoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNvbnRlbnRUeXBlICYmICdqc29uJyA9PT0gZGF0YVR5cGUgYXMgQWpheERhdGFUeXBlcykge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsIGNvbnRlbnRUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFjY2VwdFxuICAgIGlmICghaGVhZGVycy5nZXQoJ0FjY2VwdCcpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdBY2NlcHQnLCBfYWNjZXB0SGVhZGVyTWFwW2RhdGFUeXBlIGFzIEFqYXhEYXRhVHlwZXNdIHx8ICcqLyonKTtcbiAgICB9XG5cbiAgICAvLyBYLVJlcXVlc3RlZC1XaXRoXG4gICAgaWYgKCdjb3JzJyAhPT0gbW9kZSAmJiAhaGVhZGVycy5nZXQoJ1gtUmVxdWVzdGVkLVdpdGgnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnWC1SZXF1ZXN0ZWQtV2l0aCcsICdYTUxIdHRwUmVxdWVzdCcpO1xuICAgIH1cblxuICAgIC8vIEJhc2ljIEF1dGhvcml6YXRpb25cbiAgICBpZiAobnVsbCAhPSB1c2VybmFtZSAmJiAhaGVhZGVycy5nZXQoJ0F1dGhvcml6YXRpb24nKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQXV0aG9yaXphdGlvbicsIGBCYXNpYyAke0Jhc2U2NC5lbmNvZGUoYCR7dXNlcm5hbWV9OiR7cGFzc3dvcmQgfHwgJyd9YCl9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhlYWRlcnM7XG59XG5cbi8qKiBAaW50ZXJuYWwgZW5zdXJlIHN0cmluZyB2YWx1ZSAqL1xuZnVuY3Rpb24gZW5zdXJlUGFyYW1WYWx1ZShwcm9wOiB1bmtub3duKTogc3RyaW5nIHtcbiAgICBjb25zdCB2YWx1ZSA9IGlzRnVuY3Rpb24ocHJvcCkgPyBwcm9wKCkgOiBwcm9wO1xuICAgIHJldHVybiB1bmRlZmluZWQgIT09IHZhbHVlID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gcXVlcnkgc3RyaW5ncy5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkuOCr+OCqOODquOCueODiOODquODs+OCsOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9RdWVyeVN0cmluZ3MoZGF0YTogUGxhaW5PYmplY3QpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhcmFtczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGVuc3VyZVBhcmFtVmFsdWUoZGF0YVtrZXldKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBwYXJhbXMucHVzaChgJHtlbmNvZGVVUklDb21wb25lbnQoa2V5KX09JHtlbmNvZGVVUklDb21wb25lbnQodmFsdWUpfWApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXMuam9pbignJicpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gQWpheCBwYXJhbWV0ZXJzIG9iamVjdC5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkiBBamF4IOODkeODqeODoeODvOOCv+OCquODluOCuOOCp+OCr+ODiOOBq+WkieaPm1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9BamF4UGFyYW1zKGRhdGE6IFBsYWluT2JqZWN0KTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XG4gICAgY29uc3QgcGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBlbnN1cmVQYXJhbVZhbHVlKGRhdGFba2V5XSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgcGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xufVxuXG4vKipcbiAqIEBlbiBQZXJmb3JtIGFuIGFzeW5jaHJvbm91cyBIVFRQIChBamF4KSByZXF1ZXN0LlxuICogQGphIEhUVFAgKEFqYXgp44Oq44Kv44Ko44K544OI44Gu6YCB5L+hXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgQWpheCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFqYXg8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAncmVzcG9uc2UnPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhPcHRpb25zPFQ+KTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IGNvbnRyb2xsZXIuYWJvcnQoKTtcblxuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdyZXNwb25zZScsXG4gICAgICAgIHRpbWVvdXQ6IHNldHRpbmdzLnRpbWVvdXQsXG4gICAgfSwgb3B0aW9ucywge1xuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLCAvLyBmb3JjZSBvdmVycmlkZVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIHRpbWVvdXQgfSA9IG9wdHM7XG5cbiAgICAvLyBjYW5jZWxsYXRpb25cbiAgICBpZiAob3JpZ2luYWxUb2tlbikge1xuICAgICAgICBpZiAob3JpZ2luYWxUb2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgICAgICB9XG4gICAgICAgIG9yaWdpbmFsVG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuIGFzIENhbmNlbFRva2VuKTtcbiAgICBjb25zdCB7IHRva2VuIH0gPSBzb3VyY2U7XG4gICAgdG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuXG4gICAgLy8gdGltZW91dFxuICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc291cmNlLmNhbmNlbChtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfVElNRU9VVCwgJ3JlcXVlc3QgdGltZW91dCcpKSwgdGltZW91dCk7XG4gICAgfVxuXG4gICAgLy8gbm9ybWFsaXplXG4gICAgb3B0cy5tZXRob2QgPSBvcHRzLm1ldGhvZC50b1VwcGVyQ2FzZSgpO1xuXG4gICAgLy8gaGVhZGVyXG4gICAgb3B0cy5oZWFkZXJzID0gc2V0dXBIZWFkZXJzKG9wdHMpO1xuXG4gICAgLy8gcGFyc2UgcGFyYW1cbiAgICBjb25zdCB7IG1ldGhvZCwgZGF0YSwgZGF0YVR5cGUgfSA9IG9wdHM7XG4gICAgaWYgKG51bGwgIT0gZGF0YSkge1xuICAgICAgICBpZiAoKCdHRVQnID09PSBtZXRob2QgfHwgJ0hFQUQnID09PSBtZXRob2QpICYmICF1cmwuaW5jbHVkZXMoJz8nKSkge1xuICAgICAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhkYXRhKX1gO1xuICAgICAgICB9IGVsc2UgaWYgKG51bGwgPT0gb3B0cy5ib2R5KSB7XG4gICAgICAgICAgICBvcHRzLmJvZHkgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHRvQWpheFBhcmFtcyhkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBleGVjdXRlXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUoZmV0Y2godXJsLCBvcHRzKSwgdG9rZW4pO1xuICAgIGlmICgncmVzcG9uc2UnID09PSBkYXRhVHlwZSkge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgQWpheFJlc3VsdDxUPjtcbiAgICB9IGVsc2UgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UsIHJlc3BvbnNlLnN0YXR1c1RleHQsIHJlc3BvbnNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3BvbnNlW2RhdGFUeXBlIGFzIEV4Y2x1ZGU8QWpheERhdGFUeXBlcywgJ3Jlc3BvbnNlJz5dKCksIHRva2VuKTtcbiAgICB9XG59XG5cbmFqYXguc2V0dGluZ3MgPSBzZXR0aW5ncztcblxuZXhwb3J0IHsgYWpheCB9O1xuIiwiaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlcXVlc3RPcHRpb25zLFxuICAgIEFqYXhSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIGFqYXgsXG4gICAgdG9RdWVyeVN0cmluZ3MsXG4gICAgc2V0dXBIZWFkZXJzLFxufSBmcm9tICcuL2NvcmUnO1xuaW1wb3J0IHsgWE1MSHR0cFJlcXVlc3QgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlPzogQWpheERhdGFUeXBlcyk6IEFqYXhEYXRhVHlwZXMge1xuICAgIHJldHVybiBkYXRhVHlwZSB8fCAnanNvbic7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844GL44KJ6L+U44GV44KM44KL5pyf5b6F44GZ44KL44OH44O844K/44Gu5Z6L44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YT86IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdHRVQnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufVxuXG4vKipcbiAqIEBlbiBgR0VUYCB0ZXh0IHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44OG44Kt44K544OI44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dCh1cmw6IHN0cmluZywgZGF0YT86IFBsYWluT2JqZWN0LCBvcHRpb25zPzogQWpheFJlcXVlc3RPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PCd0ZXh0Jz4+IHtcbiAgICByZXR1cm4gZ2V0KHVybCwgZGF0YSwgJ3RleHQnLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gYEdFVGAgSlNPTiByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIEpTT04g44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24ganNvbjxUIGV4dGVuZHMgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPih1cmw6IHN0cmluZywgZGF0YT86IFBsYWluT2JqZWN0LCBvcHRpb25zPzogQWpheFJlcXVlc3RPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgcmV0dXJuIGdldDxUPih1cmwsIGRhdGEsICgnanNvbicgYXMgVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nKSwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIEJsb2IgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCBCbG9iIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2IodXJsOiBzdHJpbmcsIGRhdGE/OiBQbGFpbk9iamVjdCwgb3B0aW9ucz86IEFqYXhSZXF1ZXN0T3B0aW9ucyk6IFByb21pc2U8QWpheFJlc3VsdDwnYmxvYic+PiB7XG4gICAgcmV0dXJuIGdldCh1cmwsIGRhdGEsICdibG9iJywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIGBQT1NUYCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBQT1NUYCDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3Q8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGE6IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdQT1NUJywgZGF0YSwgZGF0YVR5cGU6IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKSB9IGFzIEFqYXhPcHRpb25zPFQ+KTtcbn1cblxuLyoqXG4gKiBAZW4gU3luY2hyb25vdXMgYEdFVGAgcmVxdWVzdCBmb3IgcmVzb3VyY2UgYWNjZXNzLiA8YnI+XG4gKiAgICAgTWFueSBicm93c2VycyBoYXZlIGRlcHJlY2F0ZWQgc3luY2hyb25vdXMgWEhSIHN1cHBvcnQgb24gdGhlIG1haW4gdGhyZWFkIGVudGlyZWx5LlxuICogQGphIOODquOCveODvOOCueWPluW+l+OBruOBn+OCgeOBriDlkIzmnJ8gYEdFVGAg44Oq44Kv44Ko44K544OILiA8YnI+XG4gKiAgICAg5aSa44GP44Gu44OW44Op44Km44K244Gn44Gv44Oh44Kk44Oz44K544Os44OD44OJ44Gr44GK44GR44KL5ZCM5pyf55qE44GqIFhIUiDjga7lr77lv5zjgpLlhajpnaLnmoTjgavpnZ7mjqjlpajjgajjgZfjgabjgYTjgovjga7jgafnqY3mpbXkvb/nlKjjga/pgb/jgZHjgovjgZPjgaguXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb3VyY2U8VCBleHRlbmRzICd0ZXh0JyB8ICdqc29uJyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nID8gVCA6ICdqc29uJyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4pOiBBamF4UmVzdWx0PFQ+IHtcbiAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChudWxsICE9IGRhdGEgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICB9XG5cbiAgICAvLyBzeW5jaHJvbm91c1xuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcblxuICAgIGNvbnN0IHR5cGUgPSBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSk7XG4gICAgY29uc3QgaGVhZGVycyA9IHNldHVwSGVhZGVycyh7IG1ldGhvZDogJ0dFVCcsIGRhdGFUeXBlOiB0eXBlIH0pO1xuICAgIGhlYWRlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHhoci5zZW5kKG51bGwpO1xuICAgIGlmICghKDIwMCA8PSB4aHIuc3RhdHVzICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgeGhyLnN0YXR1c1RleHQsIHhocik7XG4gICAgfVxuXG4gICAgcmV0dXJuICdqc29uJyA9PT0gdHlwZSA/IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKSA6IHhoci5yZXNwb25zZTtcbn1cbiIsImltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBjbGFzc05hbWUsXG4gICAgc2FmZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqXG4gKiBAZW4gW1tJbmxpbmVXb3JrZXJdXSBzb3VyY2UgdHlwZSBkZWZpbml0aW9uLlxuICogQGphIFtbSW5saW5lV29ya2VyXV0g44Gr5oyH5a6a5Y+v6IO944Gq44K944O844K55Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIElubGllbldvcmtlclNvdXJjZSA9ICgoc2VsZjogV29ya2VyKSA9PiB1bmtub3duKSB8IHN0cmluZztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBVUkwgICAgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgV29ya2VyID0gc2FmZShnbG9iYWxUaGlzLldvcmtlcik7XG4vKiogQGludGVybmFsICovIGNvbnN0IEJsb2IgICA9IHNhZmUoZ2xvYmFsVGhpcy5CbG9iKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gY3JlYXRlV29ya2VyQ29udGV4dChzcmM6IElubGllbldvcmtlclNvdXJjZSk6IHN0cmluZyB7XG4gICAgaWYgKCEoaXNGdW5jdGlvbihzcmMpIHx8IGlzU3RyaW5nKHNyYykpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYCR7Y2xhc3NOYW1lKHNyYyl9IGlzIG5vdCBhIGZ1bmN0aW9uIG9yIHN0cmluZy5gKTtcbiAgICB9XG4gICAgcmV0dXJuIFVSTC5jcmVhdGVPYmplY3RVUkwobmV3IEJsb2IoW2lzRnVuY3Rpb24oc3JjKSA/IGAoJHtzcmMudG9TdHJpbmcoKX0pKHNlbGYpO2AgOiBzcmNdLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JyB9KSk7XG59XG5cbi8qKlxuICogQGVuIFNwZWNpZmllZCBgV29ya2VyYCBjbGFzcyB3aGljaCBkb2Vzbid0IHJlcXVpcmUgYSBzY3JpcHQgZmlsZS5cbiAqIEBqYSDjgrnjgq/jg6rjg5fjg4jjg5XjgqHjgqTjg6vjgpLlv4XopoHjgajjgZfjgarjgYQgYFdvcmtlcmAg44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBJbmxpbmVXb3JrZXIgZXh0ZW5kcyBXb3JrZXIge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIF9jb250ZXh0OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNyY1xuICAgICAqICAtIGBlbmAgc291cmNlIGZ1bmN0aW9uIG9yIHNjcmlwdCBib2R5LlxuICAgICAqICAtIGBqYWAg5a6f6KGM6Zai5pWw44G+44Gf44Gv44K544Kv44Oq44OX44OI5a6f5L2TXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHdvcmtlciBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgV29ya2VyIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNyYzogSW5saWVuV29ya2VyU291cmNlLCBvcHRpb25zPzogV29ya2VyT3B0aW9ucykge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gY3JlYXRlV29ya2VyQ29udGV4dChzcmMpO1xuICAgICAgICBzdXBlcihjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IFdvcmtlclxuXG4gICAgdGVybWluYXRlKCk6IHZvaWQge1xuICAgICAgICBzdXBlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLl9jb250ZXh0KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBDYW5jZWxhYmxlLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBJbmxpbmVXb3JrZXIgfSBmcm9tICcuL2luaW5lLXdvcmtlcic7XG5cbi8qKlxuICogQGVuIFRocmVhZCBvcHRpb25zXG4gKiBAZW4g44K544Os44OD44OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCB0eXBlIFRocmVhZE9wdGlvbnMgPSBDYW5jZWxhYmxlICYgV29ya2VyT3B0aW9ucztcblxuLyoqXG4gKiBAZW4gRW5zdXJlIGV4ZWN1dGlvbiBpbiB3b3JrZXIgdGhyZWFkLlxuICogQGphIOODr+ODvOOCq+ODvOOCueODrOODg+ODieWGheOBp+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgZXhlYyA9ICgpID0+IHtcbiAqICAgIC8vIHRoaXMgc2NvcGUgaXMgd29ya2VyIHNjb3BlLiB5b3UgY2Fubm90IHVzZSBjbG9zdXJlIGFjY2Vzcy5cbiAqICAgIGNvbnN0IHBhcmFtID0gey4uLn07XG4gKiAgICBjb25zdCBtZXRob2QgPSAocCkgPT4gey4uLn07XG4gKiAgICA6XG4gKiAgICByZXR1cm4gbWV0aG9kKHBhcmFtKTtcbiAqIH07XG4gKlxuICogY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhyZWFkKGV4ZWMpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIGltcGxlbWVudCBhcyBmdW5jdGlvbiBzY29wZS5cbiAqICAtIGBqYWAg6Zai5pWw44K544Kz44O844OX44Go44GX44Gm5a6f6KOFXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB0aHJlYWQgb3B0aW9uc1xuICogIC0gYGphYCDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRocmVhZDxUPihleGVjdXRvcjogKCkgPT4gVCB8IFByb21pc2U8VD4sIG9wdGlvbnM/OiBUaHJlYWRPcHRpb25zKTogUHJvbWlzZTxUPiB7XG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4gfSA9IG9wdGlvbnMgfHwge307XG5cbiAgICAvLyBhbHJlYWR5IGNhbmNlbFxuICAgIGlmIChvcmlnaW5hbFRva2VuPy5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgdGhyb3cgb3JpZ2luYWxUb2tlbi5yZWFzb247XG4gICAgfVxuXG4gICAgY29uc3QgZXhlYyA9IGAoYXN5bmMgKHNlbGYpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICgke2V4ZWN1dG9yLnRvU3RyaW5nKCl9KSgpO1xuICAgICAgICAgICAgc2VsZi5wb3N0TWVzc2FnZShyZXN1bHQpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlOyB9KTtcbiAgICAgICAgfVxuICAgIH0pKHNlbGYpO2A7XG5cbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgSW5saW5lV29ya2VyKGV4ZWMsIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgYWJvcnQgPSAoKTogdm9pZCA9PiB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgb3JpZ2luYWxUb2tlbj8ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIGNvbnN0IHsgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuIGFzIENhbmNlbFRva2VuKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHdvcmtlci5vbmVycm9yID0gZXYgPT4ge1xuICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHJlamVjdChldik7XG4gICAgICAgICAgICB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgICAgIH07XG4gICAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBldiA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKGV2LmRhdGEpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgIH0sIHRva2VuKTtcbn1cbiJdLCJuYW1lcyI6WyJjYyIsIkhlYWRlcnMiLCJGb3JtRGF0YSIsIkFib3J0Q29udHJvbGxlciIsIlVSTFNlYXJjaFBhcmFtcyIsImZldGNoIiwiWE1MSHR0cFJlcXVlc3QiLCJVUkwiLCJCbG9iIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFFQSxpQkFBd0IsTUFBTSxJQUFJLEdBQVMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqRSxpQkFBd0IsTUFBTSxJQUFJLEdBQVMsSUFBSSxDQUFDLFVB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
