/*!
 * @cdp/lib-worker 0.9.15
 *   worker library collection
 */

import { safe, checkCanceled, fromTypedData, restoreNil, toTypedData, verify, CancelToken, assignValue, isNumeric, EventSource, makeResult, RESULT_CODE, isFunction, isNumber, isString, className } from '@cdp/lib-core';

/*!
 * @cdp/binary 0.9.15
 *   binary utility module
 */

/** @internal */ const btoa = safe(globalThis.btoa);
/** @internal */ const atob = safe(globalThis.atob);
/** @internal */ const Blob$2 = safe(globalThis.Blob);
/** @internal */ const FileReader = safe(globalThis.FileReader);
/** @internal */ const URL$1 = safe(globalThis.URL);

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
function bufferToBlob(buffer, mimeType = "application/octet-stream" /* MimeType.BINARY */) {
    return new Blob$2([buffer], { type: mimeType });
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
function bufferToDataURL(buffer, mimeType = "application/octet-stream" /* MimeType.BINARY */) {
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
function binaryToBlob(binary, mimeType = "application/octet-stream" /* MimeType.BINARY */) {
    return new Blob$2([binary], { type: mimeType });
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
function binaryToDataURL(binary, mimeType = "application/octet-stream" /* MimeType.BINARY */) {
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
function base64ToBlob(base64, mimeType = "application/octet-stream" /* MimeType.BINARY */) {
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
function base64ToDataURL(base64, mimeType = "application/octet-stream" /* MimeType.BINARY */) {
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
function textToBlob(text, mimeType = "text/plain" /* MimeType.TEXT */) {
    return new Blob$2([text], { type: mimeType });
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
function textToDataURL(text, mimeType = "text/plain" /* MimeType.TEXT */) {
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
        return base64ToBlob(context.data, context.mimeType || "application/octet-stream" /* MimeType.BINARY */);
    }
    else {
        return textToBlob(decodeURIComponent(context.data), context.mimeType || "text/plain" /* MimeType.TEXT */);
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
    else if (data instanceof Blob$2) {
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
            const url = URL$1.createObjectURL(b);
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
            URL$1.revokeObjectURL(url);
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
        const url = URL$1.createObjectURL(blob);
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
                URL$1.revokeObjectURL(url);
                _blobMap.delete(b);
                _urlSet.delete(url);
            }
        }
    }
}

/*!
 * @cdp/ajax 0.9.15
 *   ajax utility module
 */

/* eslint-disable
    @typescript-eslint/no-namespace,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/restrict-plus-operands,
 */
(function () {
    /**
     * @en Extends error code definitions.
     * @ja 拡張エラーコード定義
     */
    let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
    (function () {
        RESULT_CODE[RESULT_CODE["AJAX_DECLARE"] = 9007199254740991] = "AJAX_DECLARE";
        RESULT_CODE[RESULT_CODE["ERROR_AJAX_RESPONSE"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 20 /* LOCAL_CODE_BASE.AJAX */ + 1, 'network error.')] = "ERROR_AJAX_RESPONSE";
        RESULT_CODE[RESULT_CODE["ERROR_AJAX_TIMEOUT"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 20 /* LOCAL_CODE_BASE.AJAX */ + 2, 'request timeout.')] = "ERROR_AJAX_TIMEOUT";
    })();
})();

/** @internal */ const FormData = safe(globalThis.FormData);
/** @internal */ const Headers = safe(globalThis.Headers);
/** @internal */ const AbortController = safe(globalThis.AbortController);
/** @internal */ const URLSearchParams = safe(globalThis.URLSearchParams);
/** @internal */ const XMLHttpRequest = safe(globalThis.XMLHttpRequest);
/** @internal */ const fetch = safe(globalThis.fetch);

/** @internal ensure string value */
const ensureParamValue = (prop) => {
    const value = isFunction(prop) ? prop() : prop;
    return undefined !== value ? String(value) : '';
};
/**
 * @en Convert `PlainObject` to query strings.
 * @ja `PlainObject` をクエリストリングに変換
 */
const toQueryStrings = (data) => {
    const params = [];
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    return params.join('&');
};
/**
 * @en Convert `PlainObject` to Ajax parameters object.
 * @ja `PlainObject` を Ajax パラメータオブジェクトに変換
 */
const toAjaxParams = (data) => {
    const params = {};
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            assignValue(params, key, value);
        }
    }
    return params;
};
/**
 * @en Convert URL parameters to primitive type.
 * @ja URL パラメータを primitive に変換
 */
const convertUrlParamType = (value) => {
    if (isNumeric(value)) {
        return Number(value);
    }
    else if ('true' === value) {
        return true;
    }
    else if ('false' === value) {
        return false;
    }
    else if ('null' === value) {
        return null;
    }
    else {
        return decodeURIComponent(value);
    }
};
/**
 * @en Parse url query GET parameters.
 * @ja URLクエリのGETパラメータを解析
 *
 * @example <br>
 *
 * ```ts
 * const url = '/page/?id=5&foo=bar&bool=true';
 * const query = parseUrl();
 * // { id: 5, foo: 'bar', bool: true }
 * ```
 *
 * @returns { key: value } object.
 */
const parseUrlQuery = (url) => {
    const query = {};
    const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : url);
    for (const [key, value] of params) {
        query[decodeURIComponent(key)] = convertUrlParamType(value);
    }
    return query;
};

/** @internal ProxyHandler helper */
const _execGetDefault = (target, prop) => {
    if (prop in target) {
        if (isFunction(target[prop])) {
            return target[prop].bind(target);
        }
        else {
            return target[prop];
        }
    }
};
/** @internal */
const _subscribableMethods = [
    'hasListener',
    'channels',
    'on',
    'off',
    'once',
];
const toAjaxDataStream = (seed, length) => {
    let loaded = 0;
    const [stream, total] = (() => {
        if (seed instanceof Blob) {
            return [seed.stream(), seed.size];
        }
        else {
            return [seed, length != null ? Math.trunc(length) : NaN];
        }
    })();
    const _eventSource = new EventSource();
    const _proxyReaderHandler = {
        get: (target, prop) => {
            if ('read' === prop) {
                const promise = target.read();
                void (async () => {
                    const { done, value: chunk } = await promise;
                    chunk && (loaded += chunk.length);
                    _eventSource.trigger('progress', Object.freeze({
                        computable: !Number.isNaN(total),
                        loaded,
                        total,
                        done,
                        chunk,
                    }));
                })();
                return () => promise;
            }
            else {
                return _execGetDefault(target, prop);
            }
        },
    };
    return new Proxy(stream, {
        get: (target, prop) => {
            if ('getReader' === prop) {
                return () => new Proxy(target.getReader(), _proxyReaderHandler);
            }
            else if ('length' === prop) {
                return total;
            }
            else if (_subscribableMethods.includes(prop)) {
                return (...args) => _eventSource[prop](...args);
            }
            else {
                return _execGetDefault(target, prop);
            }
        },
    });
};

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
    const headers = new Headers(options.headers);
    const { method, contentType, dataType, mode, body, username, password } = options;
    // Content-Type
    if ('POST' === method || 'PUT' === method || 'PATCH' === method) {
        /*
         * fetch() の場合, FormData を自動解釈するため, 指定がある場合は削除
         * https://stackoverflow.com/questions/35192841/fetch-post-with-multipart-form-data
         * https://muffinman.io/uploading-files-using-fetch-multipart-form-data/
         */
        if (headers.get('Content-Type') && body instanceof FormData) {
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
    const controller = new AbortController();
    const abort = () => controller.abort();
    const opts = Object.assign({
        method: 'GET',
        dataType: 'response',
        timeout: settings.timeout,
    }, options, {
        signal: controller.signal, // force override
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
            opts.body = new URLSearchParams(toAjaxParams(data));
        }
    }
    // execute
    const response = await Promise.resolve(fetch(url, opts), token);
    if ('response' === dataType) {
        return response;
    }
    else if (!response.ok) {
        throw makeResult(RESULT_CODE.ERROR_AJAX_RESPONSE, response.statusText, response);
    }
    else if ('stream' === dataType) {
        return toAjaxDataStream(response.body, Number(response.headers.get('content-length')));
    }
    else {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
function text(url, options) {
    return get(url, undefined, 'text', options);
}
/**
 * @en `GET` JSON request shortcut.
 * @ja `GET` JSON リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
function json(url, options) {
    return get(url, undefined, 'json', options);
}
/**
 * @en `GET` Blob request shortcut.
 * @ja `GET` Blob リクエストショートカット
 *
 * @param url
 *  - `en` A string containing the URL to which the request is sent.
 *  - `ja` Ajaxリクエストを送信するURLを指定
 * @param options
 *  - `en` request settings.
 *  - `ja` リクエスト設定
 */
function blob(url, options) {
    return get(url, undefined, 'blob', options);
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
    const xhr = new XMLHttpRequest();
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

const request = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    blob,
    get,
    json,
    post,
    resource,
    text
}, Symbol.toStringTag, { value: 'Module' }));

/*!
 * @cdp/inline-worker 0.9.15
 *   inline web worker utility module
 */

/** @internal */ const URL = safe(globalThis.URL);
/** @internal */ const Worker = safe(globalThis.Worker);
/** @internal */ const Blob$1 = safe(globalThis.Blob);
/** @internal */
function createWorkerContext(src) {
    if (!(isFunction(src) || isString(src))) {
        throw new TypeError(`${className(src)} is not a function or string.`);
    }
    return URL.createObjectURL(new Blob$1([isFunction(src) ? `(${src.toString()})(self);` : src], { type: 'application/javascript' }));
}
/**
 * @en Specified `Worker` class which doesn't require a script file.
 * @ja スクリプトファイルを必要としない `Worker` クラス
 */
class InlineWorker extends Worker {
    /** @internal */
    _context;
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
    /**
     * @en For BLOB release. When calling `close ()` in the Worker, call this method as well.
     * @ja BLOB 解放用. Worker 内で `close()` を呼ぶ場合, 本メソッドもコールすること.
     */
    terminate() {
        super.terminate();
        URL.revokeObjectURL(this._context);
    }
}

/**
 * @en Ensure execution in worker thread.
 * @ja ワーカースレッド内で実行を保証
 *
 * @example <br>
 *
 * ```ts
 * const exec = (arg1: number, arg2: string) => {
 *    // this scope is worker scope. you cannot use closure access.
 *    const param = {...};
 *    const method = (p) => {...};
 *    // you can access arguments from options.
 *    console.log(arg1); // '1'
 *    console.log(arg2); // 'test'
 *    :
 *    return method(param);
 * };
 *
 * const arg1 = 1;
 * const arg2 = 'test';
 * const result = await thread(exec, { args: [arg1, arg2] });
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
    const { cancel: originalToken, args } = Object.assign({ args: [] }, options);
    // already cancel
    if (originalToken?.requested) {
        throw originalToken.reason;
    }
    const exec = `(self => {
        self.addEventListener('message', async ({ data }) => {
            try {
                const result = await (${executor.toString()})(...data);
                self.postMessage(result);
            } catch (e) {
                setTimeout(function() { throw e; });
            }
        });
    })(self);`;
    const worker = new InlineWorker(exec, options);
    const abort = () => worker.terminate();
    originalToken?.register(abort);
    const { token } = CancelToken.source(originalToken);
    const promise = new Promise((resolve, reject) => {
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
    worker.postMessage(args);
    return promise;
}

export { Base64, BlobURL, InlineWorker, ajax, base64ToBinary, base64ToBlob, base64ToBuffer, base64ToDataURL, base64ToText, binaryToBase64, binaryToBlob, binaryToBuffer, binaryToDataURL, binaryToText, blobToBase64, blobToBinary, blobToBuffer, blobToDataURL, blobToText, bufferToBase64, bufferToBinary, bufferToBlob, bufferToDataURL, bufferToText, convertUrlParamType, dataURLToBase64, dataURLToBinary, dataURLToBlob, dataURLToBuffer, dataURLToText, deserialize, fromBinaryString, fromHexString, parseUrlQuery, readAsArrayBuffer, readAsDataURL, readAsText, request, serialize, setupHeaders, textToBase64, textToBinary, textToBlob, textToBuffer, textToDataURL, thread, toAjaxDataStream, toAjaxParams, toBinaryString, toHexString, toQueryStrings };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLXdvcmtlci5tanMiLCJzb3VyY2VzIjpbImJpbmFyeS9zc3IudHMiLCJiaW5hcnkvYmFzZTY0LnRzIiwiYmluYXJ5L2Jsb2ItcmVhZGVyLnRzIiwiYmluYXJ5L2NvbnZlcnRlci50cyIsImJpbmFyeS9ibG9iLXVybC50cyIsImFqYXgvcmVzdWx0LWNvZGUtZGVmcy50cyIsImFqYXgvc3NyLnRzIiwiYWpheC9wYXJhbXMudHMiLCJhamF4L3N0cmVhbS50cyIsImFqYXgvc2V0dGluZ3MudHMiLCJhamF4L2NvcmUudHMiLCJhamF4L3JlcXVlc3QudHMiLCJpbmxpbmUtd29ya2VyL2luaW5lLXdvcmtlci50cyIsImlubGluZS13b3JrZXIvdGhyZWFkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBidG9hICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmJ0b2EpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgYXRvYiAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5hdG9iKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEJsb2IgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuQmxvYik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBGaWxlUmVhZGVyID0gc2FmZShnbG9iYWxUaGlzLkZpbGVSZWFkZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgVVJMICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuIiwiaW1wb3J0IHsgYXRvYiwgYnRvYSB9IGZyb20gJy4vc3NyJztcblxuLyoqXG4gKiBAZW4gYGJhc2U2NGAgdXRpbGl0eSBmb3IgaW5kZXBlbmRlbnQgY2hhcmFjdG9yIGNvZGUuXG4gKiBAamEg5paH5a2X44Kz44O844OJ44Gr5L6d5a2Y44GX44Gq44GEIGBiYXNlNjRgIOODpuODvOODhuOCo+ODquODhuOCo1xuICovXG5leHBvcnQgY2xhc3MgQmFzZTY0IHtcbiAgICAvKipcbiAgICAgKiBAZW4gRW5jb2RlIGEgYmFzZS02NCBlbmNvZGVkIHN0cmluZyBmcm9tIGEgYmluYXJ5IHN0cmluZy5cbiAgICAgKiBAamEg5paH5a2X5YiX44KSIGJhc2U2NCDlvaLlvI/jgafjgqjjg7PjgrPjg7zjg4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGVuY29kZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzcmMpKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlY29kZXMgYSBzdHJpbmcgb2YgZGF0YSB3aGljaCBoYXMgYmVlbiBlbmNvZGVkIHVzaW5nIGJhc2UtNjQgZW5jb2RpbmcuXG4gICAgICogQGphIGJhc2U2NCDlvaLlvI/jgafjgqjjg7PjgrPjg7zjg4njgZXjgozjgZ/jg4fjg7zjgr/jga7mloflrZfliJfjgpLjg4fjgrPjg7zjg4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGRlY29kZShlbmNvZGVkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShhdG9iKGVuY29kZWQpKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVW5rbm93bkZ1bmN0aW9uLCB2ZXJpZnkgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgQ2FuY2VsVG9rZW4sIENhbmNlbGFibGUgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgRmlsZVJlYWRlciB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEZpbGVSZWFkZXJBcmdzTWFwIHtcbiAgICByZWFkQXNBcnJheUJ1ZmZlcjogW0Jsb2JdO1xuICAgIHJlYWRBc0RhdGFVUkw6IFtCbG9iXTtcbiAgICByZWFkQXNUZXh0OiBbQmxvYiwgc3RyaW5nIHwgdW5kZWZpbmVkXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEZpbGVSZWFkZXJSZXN1bHRNYXAge1xuICAgIHJlYWRBc0FycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcjtcbiAgICByZWFkQXNEYXRhVVJMOiBzdHJpbmc7XG4gICAgcmVhZEFzVGV4dDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBgQmxvYmAgcmVhZCBvcHRpb25zXG4gKiBAamEgYEJsb2JgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEJsb2JSZWFkT3B0aW9ucyBleHRlbmRzIENhbmNlbGFibGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBQcm9ncmVzcyBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAamEg6YCy5o2X44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvZ3Jlc3NcbiAgICAgKiAgLSBgZW5gIHdvcmtlciBwcm9ncmVzcyBldmVudFxuICAgICAqICAtIGBqYWAgd29ya2VyIOmAsuaNl+OCpOODmeODs+ODiFxuICAgICAqL1xuICAgIG9ucHJvZ3Jlc3M/OiAocHJvZ3Jlc3M6IFByb2dyZXNzRXZlbnQpID0+IHVua25vd247XG59XG5cbi8qKiBAaW50ZXJuYWwgZXhlY3V0ZSByZWFkIGJsb2IgKi9cbmZ1bmN0aW9uIGV4ZWM8VCBleHRlbmRzIGtleW9mIEZpbGVSZWFkZXJSZXN1bHRNYXA+KFxuICAgIG1ldGhvZE5hbWU6IFQsXG4gICAgYXJnczogRmlsZVJlYWRlckFyZ3NNYXBbVF0sXG4gICAgb3B0aW9uczogQmxvYlJlYWRPcHRpb25zLFxuKTogUHJvbWlzZTxGaWxlUmVhZGVyUmVzdWx0TWFwW1RdPiB7XG4gICAgdHlwZSBUUmVzdWx0ID0gRmlsZVJlYWRlclJlc3VsdE1hcFtUXTtcbiAgICBjb25zdCB7IGNhbmNlbDogdG9rZW4sIG9ucHJvZ3Jlc3MgfSA9IG9wdGlvbnM7XG4gICAgdG9rZW4gJiYgdmVyaWZ5KCdpbnN0YW5jZU9mJywgQ2FuY2VsVG9rZW4sIHRva2VuKTtcbiAgICBvbnByb2dyZXNzICYmIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgb25wcm9ncmVzcyk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFRSZXN1bHQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdG9rZW4gJiYgdG9rZW4ucmVnaXN0ZXIoKCkgPT4ge1xuICAgICAgICAgICAgcmVhZGVyLmFib3J0KCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZWFkZXIub25hYm9ydCA9IHJlYWRlci5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbnByb2dyZXNzID0gb25wcm9ncmVzcyE7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICByZWFkZXIub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0IGFzIFRSZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25sb2FkZW5kID0gKCkgPT4ge1xuICAgICAgICAgICAgc3Vic2NyaXB0aW9uICYmIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICB9O1xuICAgICAgICAocmVhZGVyW21ldGhvZE5hbWVdIGFzIFVua25vd25GdW5jdGlvbikoLi4uYXJncyk7XG4gICAgfSwgdG9rZW4pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGBBcnJheUJ1ZmZlcmAgcmVzdWx0IGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNBcnJheUJ1ZmZlcihibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNBcnJheUJ1ZmZlcicsIFtibG9iXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGRhdGEtVVJMIHN0cmluZyBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJIGBkYXRhLXVybCDmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNEYXRhVVJMKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNEYXRhVVJMJywgW2Jsb2JdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdGV4dCBjb250ZW50IHN0cmluZyBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJ44OG44Kt44K544OI5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gZW5jb2RpbmdcbiAqICAtIGBlbmAgZW5jb2Rpbmcgc3RyaW5nIHRvIHVzZSBmb3IgdGhlIHJldHVybmVkIGRhdGEuIGRlZmF1bHQ6IGB1dGYtOGBcbiAqICAtIGBqYWAg44Ko44Oz44Kz44O844OH44Kj44Oz44Kw44KS5oyH5a6a44GZ44KL5paH5a2X5YiXIOaXouWumjogYHV0Zi04YFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc1RleHQoYmxvYjogQmxvYiwgZW5jb2Rpbmc/OiBzdHJpbmcgfCBudWxsLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzVGV4dCcsIFtibG9iLCBlbmNvZGluZyB8fCB1bmRlZmluZWRdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG4iLCJpbXBvcnQge1xuICAgIEtleXMsXG4gICAgVHlwZXMsXG4gICAgVHlwZVRvS2V5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgcmVzdG9yZU5pbCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgQmFzZTY0IH0gZnJvbSAnLi9iYXNlNjQnO1xuaW1wb3J0IHtcbiAgICBCbG9iUmVhZE9wdGlvbnMsXG4gICAgcmVhZEFzQXJyYXlCdWZmZXIsXG4gICAgcmVhZEFzRGF0YVVSTCxcbiAgICByZWFkQXNUZXh0LFxufSBmcm9tICcuL2Jsb2ItcmVhZGVyJztcbmltcG9ydCB7IEJsb2IgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gTWltZVR5cGUge1xuICAgIEJJTkFSWSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nLFxuICAgIFRFWFQgPSAndGV4dC9wbGFpbicsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGRhdGEtVVJMIOWxnuaApyAqL1xuaW50ZXJmYWNlIERhdGFVUkxDb250ZXh0IHtcbiAgICBtaW1lVHlwZTogc3RyaW5nO1xuICAgIGJhc2U2NDogYm9vbGVhbjtcbiAgICBkYXRhOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBkYXRhIFVSSSDlvaLlvI/jga7mraPopo/ooajnj75cbiAqIOWPguiAgzogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9kYXRhX1VSSXNcbiAqL1xuZnVuY3Rpb24gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMOiBzdHJpbmcpOiBEYXRhVVJMQ29udGV4dCB7XG4gICAgY29uc3QgY29udGV4dCA9IHsgYmFzZTY0OiBmYWxzZSB9IGFzIERhdGFVUkxDb250ZXh0O1xuXG4gICAgLyoqXG4gICAgICogW21hdGNoXSAxOiBtaW1lLXR5cGVcbiAgICAgKiAgICAgICAgIDI6IFwiO2Jhc2U2NFwiIOOCkuWQq+OCgOOCquODl+OCt+ODp+ODs1xuICAgICAqICAgICAgICAgMzogZGF0YSDmnKzkvZNcbiAgICAgKi9cbiAgICBjb25zdCByZXN1bHQgPSAvXmRhdGE6KC4rP1xcLy4rPyk/KDsuKz8pPywoLiopJC8uZXhlYyhkYXRhVVJMKTtcbiAgICBpZiAobnVsbCA9PSByZXN1bHQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGRhdGEtVVJMOiAke2RhdGFVUkx9YCk7XG4gICAgfVxuXG4gICAgY29udGV4dC5taW1lVHlwZSA9IHJlc3VsdFsxXTtcbiAgICBjb250ZXh0LmJhc2U2NCA9IC87YmFzZTY0Ly50ZXN0KHJlc3VsdFsyXSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1pbmNsdWRlc1xuICAgIGNvbnRleHQuZGF0YSA9IHJlc3VsdFszXTtcblxuICAgIHJldHVybiBjb250ZXh0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGJpbmFyeVN0cmluZ1RvQmluYXJ5KGJ5dGVzOiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICBjb25zdCBhcnJheSA9IGJ5dGVzLnNwbGl0KCcnKS5tYXAoYyA9PiBjLmNoYXJDb2RlQXQoMCkpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShhcnJheSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyICovXG5mdW5jdGlvbiBiaW5hcnlUb0JpbmFyeVN0cmluZyhiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwoYmluYXJ5LCAoaTogbnVtYmVyKSA9PiBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpKS5qb2luKCcnKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgdG8gYmluYXJ5LXN0cmluZy4gKG5vdCBodW1hbiByZWFkYWJsZSBzdHJpbmcpXG4gKiBAamEg44OQ44Kk44OK44Oq5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQmluYXJ5U3RyaW5nKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudCh0ZXh0KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIGZyb20gYmluYXJ5LXN0cmluZy5cbiAqIEBqYSDjg5DjgqTjg4rjg6rmloflrZfliJfjgYvjgonlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnl0ZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21CaW5hcnlTdHJpbmcoYnl0ZXM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYnl0ZXMpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBiaW5hcnkgdG8gaGV4LXN0cmluZy5cbiAqIEBqYSDjg5DjgqTjg4rjg6rjgpIgSEVYIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBoZXhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21IZXhTdHJpbmcoaGV4OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICBjb25zdCB4ID0gaGV4Lm1hdGNoKC8uezEsMn0vZyk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG51bGwgIT0geCA/IHgubWFwKGJ5dGUgPT4gcGFyc2VJbnQoYnl0ZSwgMTYpKSA6IFtdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgZnJvbSBoZXgtc3RyaW5nLlxuICogQGphIEhFWCDmloflrZfliJfjgYvjgonjg5DjgqTjg4rjg6rjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0hleFN0cmluZyhiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnkucmVkdWNlKChzdHIsIGJ5dGUpID0+IHN0ciArIGJ5dGUudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkucGFkU3RhcnQoMiwgJzAnKSwgJycpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9CdWZmZXIoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgICByZXR1cm4gcmVhZEFzQXJyYXlCdWZmZXIoYmxvYiwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGBVaW50OEFycmF5YCDjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJsb2JUb0JpbmFyeShibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGF3YWl0IHJlYWRBc0FycmF5QnVmZmVyKGJsb2IsIG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9EYXRhVVJMKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiByZWFkQXNEYXRhVVJMKGJsb2IsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJ44OG44Kt44K544OI44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9UZXh0KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMgJiB7IGVuY29kaW5nPzogc3RyaW5nIHwgbnVsbDsgfSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgfHwge307XG4gICAgY29uc3QgeyBlbmNvZGluZyB9ID0gb3B0cztcbiAgICByZXR1cm4gcmVhZEFzVGV4dChibG9iLCBlbmNvZGluZywgb3B0cyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBibG9iVG9CYXNlNjQoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHF1ZXJ5RGF0YVVSTENvbnRleHQoYXdhaXQgcmVhZEFzRGF0YVVSTChibG9iLCBvcHRpb25zKSkuZGF0YTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBgQmxvYmAuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CbG9iKGJ1ZmZlcjogQXJyYXlCdWZmZXIsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW2J1ZmZlcl0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBgVWludDhBcnJheWAuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CaW5hcnkoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9EYXRhVVJMKGJ1ZmZlcjogQXJyYXlCdWZmZXIsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb0RhdGFVUkwobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSwgbWltZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0Jhc2U2NChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9CYXNlNjQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCieODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9UZXh0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb1RleHQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBgQmxvYmAuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CbG9iKGJpbmFyeTogVWludDhBcnJheSwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbYmluYXJ5XSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CdWZmZXIoYmluYXJ5OiBVaW50OEFycmF5KTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiBiaW5hcnkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0RhdGFVUkwoYmluYXJ5OiBVaW50OEFycmF5LCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmluYXJ5VG9CYXNlNjQoYmluYXJ5KX1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQmFzZTY0KGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUoYmluYXJ5VG9UZXh0KGJpbmFyeSkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIOODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvVGV4dChiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBmcm9tQmluYXJ5U3RyaW5nKGJpbmFyeVRvQmluYXJ5U3RyaW5nKGJpbmFyeSkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0Jsb2IoYmFzZTY0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gYmluYXJ5VG9CbG9iKGJhc2U2NFRvQmluYXJ5KGJhc2U2NCksIG1pbWVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQnVmZmVyKGJhc2U2NDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiBiYXNlNjRUb0JpbmFyeShiYXNlNjQpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0JpbmFyeShiYXNlNjQ6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiaW5hcnlTdHJpbmdUb0JpbmFyeSh0b0JpbmFyeVN0cmluZyhCYXNlNjQuZGVjb2RlKGJhc2U2NCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvRGF0YVVSTChiYXNlNjQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2Jhc2U2NH1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgIEJhc2U2NCDmloflrZfliJfjgYvjgokg44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9UZXh0KGJhc2U2NDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmRlY29kZShiYXNlNjQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmxvYih0ZXh0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5URVhUKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFt0ZXh0XSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CdWZmZXIodGV4dDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiB0ZXh0VG9CaW5hcnkodGV4dCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CaW5hcnkodGV4dDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJpbmFyeVN0cmluZ1RvQmluYXJ5KHRvQmluYXJ5U3RyaW5nKHRleHQpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9EYXRhVVJMKHRleHQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLlRFWFQpOiBzdHJpbmcge1xuICAgIGNvbnN0IGJhc2U2NCA9IHRleHRUb0Jhc2U2NCh0ZXh0KTtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CYXNlNjQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmVuY29kZSh0ZXh0KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmxvYihkYXRhVVJMOiBzdHJpbmcpOiBCbG9iIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMKTtcbiAgICBpZiAoY29udGV4dC5iYXNlNjQpIHtcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQmxvYihjb250ZXh0LmRhdGEsIGNvbnRleHQubWltZVR5cGUgfHwgTWltZVR5cGUuQklOQVJZKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGV4dFRvQmxvYihkZWNvZGVVUklDb21wb25lbnQoY29udGV4dC5kYXRhKSwgY29udGV4dC5taW1lVHlwZSB8fCBNaW1lVHlwZS5URVhUKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CdWZmZXIoZGF0YVVSTDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiBkYXRhVVJMVG9CaW5hcnkoZGF0YVVSTCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0JpbmFyeShkYXRhVVJMOiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmFzZTY0VG9CaW5hcnkoZGF0YVVSTFRvQmFzZTY0KGRhdGFVUkwpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJ44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9UZXh0KGRhdGFVUkw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5kZWNvZGUoZGF0YVVSTFRvQmFzZTY0KGRhdGFVUkwpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmFzZTY0KGRhdGFVUkw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgY29udGV4dCA9IHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTCk7XG4gICAgaWYgKGNvbnRleHQuYmFzZTY0KSB7XG4gICAgICAgIHJldHVybiBjb250ZXh0LmRhdGE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUoZGVjb2RlVVJJQ29tcG9uZW50KGNvbnRleHQuZGF0YSkpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFNlcmlhbGl6YWJsZSBkYXRhIHR5cGUgbGlzdC5cbiAqIEBqYSDjgrfjg6rjgqLjg6njgqTjgrrlj6/og73jgarjg4fjg7zjgr/lnovkuIDopqdcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXJpYWxpemFibGUge1xuICAgIHN0cmluZzogc3RyaW5nO1xuICAgIG51bWJlcjogbnVtYmVyO1xuICAgIGJvb2xlYW46IGJvb2xlYW47XG4gICAgb2JqZWN0OiBvYmplY3Q7XG4gICAgYnVmZmVyOiBBcnJheUJ1ZmZlcjtcbiAgICBiaW5hcnk6IFVpbnQ4QXJyYXk7XG4gICAgYmxvYjogQmxvYjtcbn1cblxuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlRGF0YVR5cGVzID0gVHlwZXM8U2VyaWFsaXphYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUlucHV0RGF0YVR5cGVzID0gU2VyaWFsaXphYmxlRGF0YVR5cGVzIHwgbnVsbCB8IHVuZGVmaW5lZDtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUtleXMgPSBLZXlzPFNlcmlhbGl6YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVDYXN0YWJsZSA9IE9taXQ8U2VyaWFsaXphYmxlLCAnYnVmZmVyJyB8ICdiaW5hcnknIHwgJ2Jsb2InPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXMgPSBUeXBlczxTZXJpYWxpemFibGVDYXN0YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVSZXR1cm5UeXBlPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzPiA9IFR5cGVUb0tleTxTZXJpYWxpemFibGVDYXN0YWJsZSwgVD4gZXh0ZW5kcyBuZXZlciA/IG5ldmVyIDogVCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXphYmxlIG9wdGlvbnMgaW50ZXJmYWNlLlxuICogQGphIOODh+OCt+ODquOCouODqeOCpOOCuuOBq+S9v+eUqOOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIERlc2VyaWFsaXplT3B0aW9uczxUIGV4dGVuZHMgU2VyaWFsaXphYmxlID0gU2VyaWFsaXphYmxlLCBLIGV4dGVuZHMgS2V5czxUPiA9IEtleXM8VD4+IGV4dGVuZHMgQ2FuY2VsYWJsZSB7XG4gICAgLyoqIFtbU2VyaWFsaXphYmxlS2V5c11dICovXG4gICAgZGF0YVR5cGU/OiBLO1xufVxuXG4vKipcbiAqIEBlbiBTZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jgrfjg6rjgqLjg6njgqTjgrpcbiAqXG4gKiBAcGFyYW0gZGF0YSBpbnB1dFxuICogQHBhcmFtIG9wdGlvbnMgYmxvYiBjb252ZXJ0IG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXM+KGRhdGE6IFQsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgaWYgKG51bGwgPT0gZGF0YSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBidWZmZXJUb0RhdGFVUkwoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICByZXR1cm4gYmluYXJ5VG9EYXRhVVJMKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgICAgcmV0dXJuIGJsb2JUb0RhdGFVUkwoZGF0YSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzID0gU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcz4oXG4gICAgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IERlc2VyaWFsaXplT3B0aW9uczxTZXJpYWxpemFibGUsIG5ldmVyPlxuKTogUHJvbWlzZTxTZXJpYWxpemFibGVSZXR1cm5UeXBlPFQ+PjtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVLZXlzPih2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBEZXNlcmlhbGl6ZU9wdGlvbnM8U2VyaWFsaXphYmxlLCBUPik6IFByb21pc2U8U2VyaWFsaXphYmxlW1RdIHwgbnVsbCB8IHVuZGVmaW5lZD47XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZXNlcmlhbGl6ZSh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zPzogRGVzZXJpYWxpemVPcHRpb25zKTogUHJvbWlzZTxTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgeyBkYXRhVHlwZSwgY2FuY2VsIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG5cbiAgICBjb25zdCBkYXRhID0gcmVzdG9yZU5pbCh0b1R5cGVkRGF0YSh2YWx1ZSkpO1xuICAgIHN3aXRjaCAoZGF0YVR5cGUpIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKGRhdGEpO1xuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgcmV0dXJuIE51bWJlcihkYXRhKTtcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICByZXR1cm4gQm9vbGVhbihkYXRhKTtcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2J1ZmZlcic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQnVmZmVyKGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nKTtcbiAgICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CaW5hcnkoZnJvbVR5cGVkRGF0YShkYXRhKSBhcyBzdHJpbmcpO1xuICAgICAgICBjYXNlICdibG9iJzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CbG9iKGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFVSTCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYmxvYk1hcCA9IG5ldyBXZWFrTWFwPEJsb2IsIHN0cmluZz4oKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3VybFNldCAgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuLyoqXG4gKiBAZW4gYEJsb2IgVVJMYCB1dGlsaXR5IGZvciBhdXRvbWF0aWMgbWVtb3J5IG1hbmVnZW1lbnQuXG4gKiBAamEg44Oh44Oi44Oq6Ieq5YuV566h55CG44KS6KGM44GGIGBCbG9iIFVSTGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCbG9iVVJMIHtcbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZXMuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBruani+eviVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlKC4uLmJsb2JzOiBCbG9iW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIGJsb2JzKSB7XG4gICAgICAgICAgICBjb25zdCBjYWNoZSA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChiKTtcbiAgICAgICAgICAgIF9ibG9iTWFwLnNldChiLCB1cmwpO1xuICAgICAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYEJsb2IgVVJMYCBjYWNoZS5cbiAgICAgKiBAamEg44GZ44G544Gm44GuIGBCbG9iIFVSTGAg44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhcigpOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgX3VybFNldCkge1xuICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIF91cmxTZXQuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44Gu5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZXQoYmxvYjogQmxvYik6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gX2Jsb2JNYXAuZ2V0KGJsb2IpO1xuICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICBfYmxvYk1hcC5zZXQoYmxvYiwgdXJsKTtcbiAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYEJsb2IgVVJMYCBpcyBhdmFpbGFibGUgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44GM5pyJ5Yq55YyW5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBoYXMoYmxvYjogQmxvYik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gX2Jsb2JNYXAuaGFzKGJsb2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXZva2UgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlcy5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44KS54Sh5Yq55YyWXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyByZXZva2UoLi4uYmxvYnM6IEJsb2JbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGIgb2YgYmxvYnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgX2Jsb2JNYXAuZGVsZXRlKGIpO1xuICAgICAgICAgICAgICAgIF91cmxTZXQuZGVsZXRlKHVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9yZXN0cmljdC1wbHVzLW9wZXJhbmRzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIEFKQVggPSBDRFBfS05PV05fTU9EVUxFLkFKQVggKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgQUpBWF9ERUNMQVJFICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfQUpBWF9SRVNQT05TRSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFKQVggKyAxLCAnbmV0d29yayBlcnJvci4nKSxcbiAgICAgICAgRVJST1JfQUpBWF9USU1FT1VUICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFKQVggKyAyLCAncmVxdWVzdCB0aW1lb3V0LicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBGb3JtRGF0YSAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuRm9ybURhdGEpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgSGVhZGVycyAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkhlYWRlcnMpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgQWJvcnRDb250cm9sbGVyID0gc2FmZShnbG9iYWxUaGlzLkFib3J0Q29udHJvbGxlcik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBVUkxTZWFyY2hQYXJhbXMgPSBzYWZlKGdsb2JhbFRoaXMuVVJMU2VhcmNoUGFyYW1zKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFhNTEh0dHBSZXF1ZXN0ICA9IHNhZmUoZ2xvYmFsVGhpcy5YTUxIdHRwUmVxdWVzdCk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBmZXRjaCAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuZmV0Y2gpO1xuIiwiaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzTnVtZXJpYyxcbiAgICBhc3NpZ25WYWx1ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFVSTFNlYXJjaFBhcmFtcyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgc3RyaW5nIHZhbHVlICovXG5jb25zdCBlbnN1cmVQYXJhbVZhbHVlID0gKHByb3A6IHVua25vd24pOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHZhbHVlID0gaXNGdW5jdGlvbihwcm9wKSA/IHByb3AoKSA6IHByb3A7XG4gICAgcmV0dXJuIHVuZGVmaW5lZCAhPT0gdmFsdWUgPyBTdHJpbmcodmFsdWUpIDogJyc7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gcXVlcnkgc3RyaW5ncy5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkuOCr+OCqOODquOCueODiOODquODs+OCsOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgdG9RdWVyeVN0cmluZ3MgPSAoZGF0YTogUGxhaW5PYmplY3QpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHBhcmFtczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGVuc3VyZVBhcmFtVmFsdWUoZGF0YVtrZXldKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBwYXJhbXMucHVzaChgJHtlbmNvZGVVUklDb21wb25lbnQoa2V5KX09JHtlbmNvZGVVUklDb21wb25lbnQodmFsdWUpfWApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXMuam9pbignJicpO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBgUGxhaW5PYmplY3RgIHRvIEFqYXggcGFyYW1ldGVycyBvYmplY3QuXG4gKiBAamEgYFBsYWluT2JqZWN0YCDjgpIgQWpheCDjg5Hjg6njg6Hjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IHRvQWpheFBhcmFtcyA9IChkYXRhOiBQbGFpbk9iamVjdCk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPT4ge1xuICAgIGNvbnN0IHBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZW5zdXJlUGFyYW1WYWx1ZShkYXRhW2tleV0pO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGFzc2lnblZhbHVlKHBhcmFtcywga2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgVVJMIHBhcmFtZXRlcnMgdG8gcHJpbWl0aXZlIHR5cGUuXG4gKiBAamEgVVJMIOODkeODqeODoeODvOOCv+OCkiBwcmltaXRpdmUg44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCBjb252ZXJ0VXJsUGFyYW1UeXBlID0gKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCA9PiB7XG4gICAgaWYgKGlzTnVtZXJpYyh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIE51bWJlcih2YWx1ZSk7XG4gICAgfSBlbHNlIGlmICgndHJ1ZScgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoJ251bGwnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBQYXJzZSB1cmwgcXVlcnkgR0VUIHBhcmFtZXRlcnMuXG4gKiBAamEgVVJM44Kv44Ko44Oq44GuR0VU44OR44Op44Oh44O844K/44KS6Kej5p6QXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB1cmwgPSAnL3BhZ2UvP2lkPTUmZm9vPWJhciZib29sPXRydWUnO1xuICogY29uc3QgcXVlcnkgPSBwYXJzZVVybCgpO1xuICogLy8geyBpZDogNSwgZm9vOiAnYmFyJywgYm9vbDogdHJ1ZSB9XG4gKiBgYGBcbiAqXG4gKiBAcmV0dXJucyB7IGtleTogdmFsdWUgfSBvYmplY3QuXG4gKi9cbmV4cG9ydCBjb25zdCBwYXJzZVVybFF1ZXJ5ID0gPFQgPSBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbD4+KHVybDogc3RyaW5nKTogVCA9PiB7XG4gICAgY29uc3QgcXVlcnkgPSB7fTtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHVybC5pbmNsdWRlcygnPycpID8gdXJsLnNwbGl0KCc/JylbMV0gOiB1cmwpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHBhcmFtcykge1xuICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoa2V5KV0gPSBjb252ZXJ0VXJsUGFyYW1UeXBlKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHF1ZXJ5IGFzIFQ7XG59O1xuIiwiaW1wb3J0IHsgS2V5cywgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpYmFibGUsIEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHR5cGUgeyBBamF4RGF0YVN0cmVhbUV2ZW50LCBBamF4RGF0YVN0cmVhbSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgUHJveHlIYW5kbGVyIGhlbHBlciAqL1xuY29uc3QgX2V4ZWNHZXREZWZhdWx0ID0gKHRhcmdldDogYW55LCBwcm9wOiBzdHJpbmcgfCBzeW1ib2wpOiBhbnkgPT4geyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24odGFyZ2V0W3Byb3BdKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wXS5iaW5kKHRhcmdldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3N1YnNjcmliYWJsZU1ldGhvZHM6IEtleXM8U3Vic2NyaWJhYmxlPltdID0gW1xuICAgICdoYXNMaXN0ZW5lcicsXG4gICAgJ2NoYW5uZWxzJyxcbiAgICAnb24nLFxuICAgICdvZmYnLFxuICAgICdvbmNlJyxcbl07XG5cbmV4cG9ydCBjb25zdCB0b0FqYXhEYXRhU3RyZWFtID0gKHNlZWQ6IEJsb2IgfCBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiwgbGVuZ3RoPzogbnVtYmVyKTogQWpheERhdGFTdHJlYW0gPT4ge1xuICAgIGxldCBsb2FkZWQgPSAwO1xuICAgIGNvbnN0IFtzdHJlYW0sIHRvdGFsXSA9ICgoKSA9PiB7XG4gICAgICAgIGlmIChzZWVkIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICAgICAgcmV0dXJuIFtzZWVkLnN0cmVhbSgpLCBzZWVkLnNpemVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtzZWVkLCBsZW5ndGggIT0gbnVsbCA/IE1hdGgudHJ1bmMobGVuZ3RoKSA6IE5hTl07XG4gICAgICAgIH1cbiAgICB9KSgpO1xuXG4gICAgY29uc3QgX2V2ZW50U291cmNlID0gbmV3IEV2ZW50U291cmNlPEFqYXhEYXRhU3RyZWFtRXZlbnQ+KCk7XG5cbiAgICBjb25zdCBfcHJveHlSZWFkZXJIYW5kbGVyOiBQcm94eUhhbmRsZXI8UmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+PiA9IHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VWludDhBcnJheT4sIHByb3A6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKCdyZWFkJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB0YXJnZXQucmVhZCgpO1xuICAgICAgICAgICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBkb25lLCB2YWx1ZTogY2h1bmsgfSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIGNodW5rICYmIChsb2FkZWQgKz0gY2h1bmsubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgX2V2ZW50U291cmNlLnRyaWdnZXIoJ3Byb2dyZXNzJywgT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wdXRhYmxlOiAhTnVtYmVyLmlzTmFOKHRvdGFsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNodW5rLFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gcHJvbWlzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9leGVjR2V0RGVmYXVsdCh0YXJnZXQsIHByb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG5cbiAgICByZXR1cm4gbmV3IFByb3h5KHN0cmVhbSwge1xuICAgICAgICBnZXQ6ICh0YXJnZXQ6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICgnZ2V0UmVhZGVyJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiBuZXcgUHJveHkodGFyZ2V0LmdldFJlYWRlcigpLCBfcHJveHlSZWFkZXJIYW5kbGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ2xlbmd0aCcgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF9zdWJzY3JpYmFibGVNZXRob2RzLmluY2x1ZGVzKHByb3AgYXMgS2V5czxTdWJzY3JpYmFibGU+KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoLi4uYXJnczogdW5rbm93bltdKSA9PiBfZXZlbnRTb3VyY2VbcHJvcF0oLi4uYXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBfZXhlY0dldERlZmF1bHQodGFyZ2V0LCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KSBhcyBBamF4RGF0YVN0cmVhbTtcbn07XG4iLCJpbXBvcnQgeyBpc051bWJlciB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF90aW1lb3V0OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbmV4cG9ydCBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICBnZXQgdGltZW91dCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX3RpbWVvdXQ7XG4gICAgfSxcbiAgICBzZXQgdGltZW91dCh2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIF90aW1lb3V0ID0gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xuICAgIH0sXG59O1xuIiwiaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICdAY2RwL2JpbmFyeSc7XG5pbXBvcnQge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgRm9ybURhdGEsXG4gICAgSGVhZGVycyxcbiAgICBBYm9ydENvbnRyb2xsZXIsXG4gICAgVVJMU2VhcmNoUGFyYW1zLFxuICAgIGZldGNoLFxufSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyB0b1F1ZXJ5U3RyaW5ncywgdG9BamF4UGFyYW1zIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgdG9BamF4RGF0YVN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IHNldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIEFqYXhIZWFkZXJPcHRpb25zID0gUGljazxBamF4T3B0aW9uczxBamF4RGF0YVR5cGVzPiwgJ2hlYWRlcnMnIHwgJ21ldGhvZCcgfCAnY29udGVudFR5cGUnIHwgJ2RhdGFUeXBlJyB8ICdtb2RlJyB8ICdib2R5JyB8ICd1c2VybmFtZScgfCAncGFzc3dvcmQnPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2FjY2VwdEhlYWRlck1hcCA9IHtcbiAgICB0ZXh0OiAndGV4dC9wbGFpbiwgdGV4dC9odG1sLCBhcHBsaWNhdGlvbi94bWw7IHE9MC44LCB0ZXh0L3htbDsgcT0wLjgsICovKjsgcT0wLjAxJyxcbiAgICBqc29uOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9qYXZhc2NyaXB0LCAqLyo7IHE9MC4wMScsXG59O1xuXG4vKipcbiAqIEBlbiBTZXR1cCBgaGVhZGVyc2AgZnJvbSBvcHRpb25zIHBhcmFtZXRlci5cbiAqIEBqYSDjgqrjg5fjgrfjg6fjg7PjgYvjgokgYGhlYWRlcnNgIOOCkuioreWumlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIZWFkZXJzKG9wdGlvbnM6IEFqYXhIZWFkZXJPcHRpb25zKTogSGVhZGVycyB7XG4gICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycyk7XG4gICAgY29uc3QgeyBtZXRob2QsIGNvbnRlbnRUeXBlLCBkYXRhVHlwZSwgbW9kZSwgYm9keSwgdXNlcm5hbWUsIHBhc3N3b3JkIH0gPSBvcHRpb25zO1xuXG4gICAgLy8gQ29udGVudC1UeXBlXG4gICAgaWYgKCdQT1NUJyA9PT0gbWV0aG9kIHx8ICdQVVQnID09PSBtZXRob2QgfHwgJ1BBVENIJyA9PT0gbWV0aG9kKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIGZldGNoKCkg44Gu5aC05ZCILCBGb3JtRGF0YSDjgpLoh6rli5Xop6Pph4jjgZnjgovjgZ/jgoEsIOaMh+WumuOBjOOBguOCi+WgtOWQiOOBr+WJiumZpFxuICAgICAgICAgKiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNTE5Mjg0MS9mZXRjaC1wb3N0LXdpdGgtbXVsdGlwYXJ0LWZvcm0tZGF0YVxuICAgICAgICAgKiBodHRwczovL211ZmZpbm1hbi5pby91cGxvYWRpbmctZmlsZXMtdXNpbmctZmV0Y2gtbXVsdGlwYXJ0LWZvcm0tZGF0YS9cbiAgICAgICAgICovXG4gICAgICAgIGlmIChoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgJiYgYm9keSBpbnN0YW5jZW9mIEZvcm1EYXRhKSB7XG4gICAgICAgICAgICBoZWFkZXJzLmRlbGV0ZSgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSkge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gY29udGVudFR5cGUgJiYgJ2pzb24nID09PSBkYXRhVHlwZSBhcyBBamF4RGF0YVR5cGVzKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gY29udGVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLnNldCgnQ29udGVudC1UeXBlJywgY29udGVudFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWNjZXB0XG4gICAgaWYgKCFoZWFkZXJzLmdldCgnQWNjZXB0JykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ0FjY2VwdCcsIF9hY2NlcHRIZWFkZXJNYXBbZGF0YVR5cGUgYXMgQWpheERhdGFUeXBlc10gfHwgJyovKicpO1xuICAgIH1cblxuICAgIC8vIFgtUmVxdWVzdGVkLVdpdGhcbiAgICBpZiAoJ2NvcnMnICE9PSBtb2RlICYmICFoZWFkZXJzLmdldCgnWC1SZXF1ZXN0ZWQtV2l0aCcpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdYLVJlcXVlc3RlZC1XaXRoJywgJ1hNTEh0dHBSZXF1ZXN0Jyk7XG4gICAgfVxuXG4gICAgLy8gQmFzaWMgQXV0aG9yaXphdGlvblxuICAgIGlmIChudWxsICE9IHVzZXJuYW1lICYmICFoZWFkZXJzLmdldCgnQXV0aG9yaXphdGlvbicpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdBdXRob3JpemF0aW9uJywgYEJhc2ljICR7QmFzZTY0LmVuY29kZShgJHt1c2VybmFtZX06JHtwYXNzd29yZCB8fCAnJ31gKX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGVhZGVycztcbn1cblxuLyoqXG4gKiBAZW4gUGVyZm9ybSBhbiBhc3luY2hyb25vdXMgSFRUUCAoQWpheCkgcmVxdWVzdC5cbiAqIEBqYSBIVFRQIChBamF4KeODquOCr+OCqOOCueODiOOBrumAgeS/oVxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIEFqYXggcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOioreWumlxuICovXG5hc3luYyBmdW5jdGlvbiBhamF4PFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzIHwgb2JqZWN0ID0gJ3Jlc3BvbnNlJz4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4T3B0aW9uczxUPik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgYWJvcnQgPSAoKTogdm9pZCA9PiBjb250cm9sbGVyLmFib3J0KCk7XG5cbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAncmVzcG9uc2UnLFxuICAgICAgICB0aW1lb3V0OiBzZXR0aW5ncy50aW1lb3V0LFxuICAgIH0sIG9wdGlvbnMsIHtcbiAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCwgLy8gZm9yY2Ugb3ZlcnJpZGVcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgY2FuY2VsOiBvcmlnaW5hbFRva2VuLCB0aW1lb3V0IH0gPSBvcHRzO1xuXG4gICAgLy8gY2FuY2VsbGF0aW9uXG4gICAgaWYgKG9yaWdpbmFsVG9rZW4pIHtcbiAgICAgICAgaWYgKG9yaWdpbmFsVG9rZW4ucmVxdWVzdGVkKSB7XG4gICAgICAgICAgICB0aHJvdyBvcmlnaW5hbFRva2VuLnJlYXNvbjtcbiAgICAgICAgfVxuICAgICAgICBvcmlnaW5hbFRva2VuLnJlZ2lzdGVyKGFib3J0KTtcbiAgICB9XG5cbiAgICBjb25zdCBzb3VyY2UgPSBDYW5jZWxUb2tlbi5zb3VyY2Uob3JpZ2luYWxUb2tlbiBhcyBDYW5jZWxUb2tlbik7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gc291cmNlO1xuICAgIHRva2VuLnJlZ2lzdGVyKGFib3J0KTtcblxuICAgIC8vIHRpbWVvdXRcbiAgICBpZiAodGltZW91dCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHNvdXJjZS5jYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1RJTUVPVVQsICdyZXF1ZXN0IHRpbWVvdXQnKSksIHRpbWVvdXQpO1xuICAgIH1cblxuICAgIC8vIG5vcm1hbGl6ZVxuICAgIG9wdHMubWV0aG9kID0gb3B0cy5tZXRob2QudG9VcHBlckNhc2UoKTtcblxuICAgIC8vIGhlYWRlclxuICAgIG9wdHMuaGVhZGVycyA9IHNldHVwSGVhZGVycyhvcHRzKTtcblxuICAgIC8vIHBhcnNlIHBhcmFtXG4gICAgY29uc3QgeyBtZXRob2QsIGRhdGEsIGRhdGFUeXBlIH0gPSBvcHRzO1xuICAgIGlmIChudWxsICE9IGRhdGEpIHtcbiAgICAgICAgaWYgKCgnR0VUJyA9PT0gbWV0aG9kIHx8ICdIRUFEJyA9PT0gbWV0aG9kKSAmJiAhdXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IG9wdHMuYm9keSkge1xuICAgICAgICAgICAgb3B0cy5ib2R5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh0b0FqYXhQYXJhbXMoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGZldGNoKHVybCwgb3B0cyksIHRva2VuKTtcbiAgICBpZiAoJ3Jlc3BvbnNlJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIEFqYXhSZXN1bHQ8VD47XG4gICAgfSBlbHNlIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFLCByZXNwb25zZS5zdGF0dXNUZXh0LCByZXNwb25zZSk7XG4gICAgfSBlbHNlIGlmICgnc3RyZWFtJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRvQWpheERhdGFTdHJlYW0oXG4gICAgICAgICAgICByZXNwb25zZS5ib2R5IGFzIFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LFxuICAgICAgICAgICAgTnVtYmVyKHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LWxlbmd0aCcpKSxcbiAgICAgICAgKSBhcyBBamF4UmVzdWx0PFQ+O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktdHlwZS1hc3NlcnRpb25cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXNwb25zZVtkYXRhVHlwZSBhcyBFeGNsdWRlPEFqYXhEYXRhVHlwZXMsICdyZXNwb25zZScgfCAnc3RyZWFtJz5dKCksIHRva2VuKTtcbiAgICB9XG59XG5cbmFqYXguc2V0dGluZ3MgPSBzZXR0aW5ncztcblxuZXhwb3J0IHsgYWpheCB9O1xuIiwiaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlcXVlc3RPcHRpb25zLFxuICAgIEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zLFxuICAgIEFqYXhSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBhamF4LCBzZXR1cEhlYWRlcnMgfSBmcm9tICcuL2NvcmUnO1xuaW1wb3J0IHsgdG9RdWVyeVN0cmluZ3MgfSBmcm9tICcuL3BhcmFtcyc7XG5pbXBvcnQgeyBYTUxIdHRwUmVxdWVzdCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGU/OiBBamF4RGF0YVR5cGVzKTogQWpheERhdGFUeXBlcyB7XG4gICAgcmV0dXJuIGRhdGFUeXBlIHx8ICdqc29uJztcbn1cblxuLyoqXG4gKiBAZW4gYEdFVGAgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgYvjgonov5TjgZXjgozjgovmnJ/lvoXjgZnjgovjg4fjg7zjgr/jga7lnovjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0PFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzIHwgb2JqZWN0ID0gJ2pzb24nPihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicsXG4gICAgb3B0aW9ucz86IEFqYXhSZXF1ZXN0T3B0aW9uc1xuKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgcmV0dXJuIGFqYXgodXJsLCB7IC4uLm9wdGlvbnMsIG1ldGhvZDogJ0dFVCcsIGRhdGEsIGRhdGFUeXBlOiBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSkgfSBhcyBBamF4T3B0aW9uczxUPik7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIHRleHQgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCDjg4bjgq3jgrnjg4jjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHQodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyk6IFByb21pc2U8QWpheFJlc3VsdDwndGV4dCc+PiB7XG4gICAgcmV0dXJuIGdldCh1cmwsIHVuZGVmaW5lZCwgJ3RleHQnLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gYEdFVGAgSlNPTiByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIEpTT04g44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqc29uPFQgZXh0ZW5kcyAnanNvbicgfCBvYmplY3QgPSAnanNvbic+KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+IHtcbiAgICByZXR1cm4gZ2V0PFQ+KHVybCwgdW5kZWZpbmVkLCAoJ2pzb24nIGFzIFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzID8gVCA6ICdqc29uJyksIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBgR0VUYCBCbG9iIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAgQmxvYiDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2IodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyk6IFByb21pc2U8QWpheFJlc3VsdDwnYmxvYic+PiB7XG4gICAgcmV0dXJuIGdldCh1cmwsIHVuZGVmaW5lZCwgJ2Jsb2InLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gYFBPU1RgIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYFBPU1RgIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgVGhlIHR5cGUgb2YgZGF0YSB0aGF0IHlvdSdyZSBleHBlY3RpbmcgYmFjayBmcm9tIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YTogUGxhaW5PYmplY3QsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicsXG4gICAgb3B0aW9ucz86IEFqYXhSZXF1ZXN0T3B0aW9uc1xuKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgcmV0dXJuIGFqYXgodXJsLCB7IC4uLm9wdGlvbnMsIG1ldGhvZDogJ1BPU1QnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufVxuXG4vKipcbiAqIEBlbiBTeW5jaHJvbm91cyBgR0VUYCByZXF1ZXN0IGZvciByZXNvdXJjZSBhY2Nlc3MuIDxicj5cbiAqICAgICBNYW55IGJyb3dzZXJzIGhhdmUgZGVwcmVjYXRlZCBzeW5jaHJvbm91cyBYSFIgc3VwcG9ydCBvbiB0aGUgbWFpbiB0aHJlYWQgZW50aXJlbHkuXG4gKiBAamEg44Oq44K944O844K55Y+W5b6X44Gu44Gf44KB44GuIOWQjOacnyBgR0VUYCDjg6rjgq/jgqjjgrnjg4guIDxicj5cbiAqICAgICDlpJrjgY/jga7jg5bjg6njgqbjgrbjgafjga/jg6HjgqTjg7Pjgrnjg6zjg4Pjg4njgavjgYrjgZHjgovlkIzmnJ/nmoTjgaogWEhSIOOBruWvvuW/nOOCkuWFqOmdoueahOOBq+mdnuaOqOWlqOOBqOOBl+OBpuOBhOOCi+OBruOBp+epjealteS9v+eUqOOBr+mBv+OBkeOCi+OBk+OBqC5cbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgVGhlIHR5cGUgb2YgZGF0YSB0aGF0IHlvdSdyZSBleHBlY3RpbmcgYmFjayBmcm9tIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvdXJjZTxUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBkYXRhVHlwZT86IFQgZXh0ZW5kcyAndGV4dCcgfCAnanNvbicgPyBUIDogJ2pzb24nLFxuICAgIGRhdGE/OiBQbGFpbk9iamVjdCxcbik6IEFqYXhSZXN1bHQ8VD4ge1xuICAgIGNvbnN0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgaWYgKG51bGwgIT0gZGF0YSAmJiAhdXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhkYXRhKX1gO1xuICAgIH1cblxuICAgIC8vIHN5bmNocm9ub3VzXG4gICAgeGhyLm9wZW4oJ0dFVCcsIHVybCwgZmFsc2UpO1xuXG4gICAgY29uc3QgdHlwZSA9IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKTtcbiAgICBjb25zdCBoZWFkZXJzID0gc2V0dXBIZWFkZXJzKHsgbWV0aG9kOiAnR0VUJywgZGF0YVR5cGU6IHR5cGUgfSk7XG4gICAgaGVhZGVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgeGhyLnNlbmQobnVsbCk7XG4gICAgaWYgKCEoMjAwIDw9IHhoci5zdGF0dXMgJiYgeGhyLnN0YXR1cyA8IDMwMCkpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFLCB4aHIuc3RhdHVzVGV4dCwgeGhyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJ2pzb24nID09PSB0eXBlID8gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2UpIDogeGhyLnJlc3BvbnNlO1xufVxuIiwiaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGNsYXNzTmFtZSxcbiAgICBzYWZlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKipcbiAqIEBlbiBbW0lubGluZVdvcmtlcl1dIHNvdXJjZSB0eXBlIGRlZmluaXRpb24uXG4gKiBAamEgW1tJbmxpbmVXb3JrZXJdXSDjgavmjIflrprlj6/og73jgarjgr3jg7zjgrnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgSW5saWVuV29ya2VyU291cmNlID0gKChzZWxmOiBXb3JrZXIpID0+IHVua25vd24pIHwgc3RyaW5nO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IFVSTCAgICA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBXb3JrZXIgPSBzYWZlKGdsb2JhbFRoaXMuV29ya2VyKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgQmxvYiAgID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYzogSW5saWVuV29ya2VyU291cmNlKTogc3RyaW5nIHtcbiAgICBpZiAoIShpc0Z1bmN0aW9uKHNyYykgfHwgaXNTdHJpbmcoc3JjKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoc3JjKX0gaXMgbm90IGEgZnVuY3Rpb24gb3Igc3RyaW5nLmApO1xuICAgIH1cbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbaXNGdW5jdGlvbihzcmMpID8gYCgke3NyYy50b1N0cmluZygpfSkoc2VsZik7YCA6IHNyY10sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnIH0pKTtcbn1cblxuLyoqXG4gKiBAZW4gU3BlY2lmaWVkIGBXb3JrZXJgIGNsYXNzIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBhIHNjcmlwdCBmaWxlLlxuICogQGphIOOCueOCr+ODquODl+ODiOODleOCoeOCpOODq+OCkuW/heimgeOBqOOBl+OBquOBhCBgV29ya2VyYCDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIElubGluZVdvcmtlciBleHRlbmRzIFdvcmtlciB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX2NvbnRleHQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjXG4gICAgICogIC0gYGVuYCBzb3VyY2UgZnVuY3Rpb24gb3Igc2NyaXB0IGJvZHkuXG4gICAgICogIC0gYGphYCDlrp/ooYzplqLmlbDjgb7jgZ/jga/jgrnjgq/jg6rjg5fjg4jlrp/kvZNcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgd29ya2VyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBXb3JrZXIg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBJbmxpZW5Xb3JrZXJTb3VyY2UsIG9wdGlvbnM/OiBXb3JrZXJPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYyk7XG4gICAgICAgIHN1cGVyKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogV29ya2VyXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIEJMT0IgcmVsZWFzZS4gV2hlbiBjYWxsaW5nIGBjbG9zZSAoKWAgaW4gdGhlIFdvcmtlciwgY2FsbCB0aGlzIG1ldGhvZCBhcyB3ZWxsLlxuICAgICAqIEBqYSBCTE9CIOino+aUvueUqC4gV29ya2VyIOWGheOBpyBgY2xvc2UoKWAg44KS5ZG844G25aC05ZCILCDmnKzjg6Hjgr3jg4Pjg4njgoLjgrPjg7zjg6vjgZnjgovjgZPjgaguXG4gICAgICovXG4gICAgdGVybWluYXRlKCk6IHZvaWQge1xuICAgICAgICBzdXBlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLl9jb250ZXh0KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgQ2FuY2VsYWJsZSwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgSW5saW5lV29ya2VyIH0gZnJvbSAnLi9pbmluZS13b3JrZXInO1xuXG4vKipcbiAqIEBlbiBUaHJlYWQgb3B0aW9uc1xuICogQGVuIOOCueODrOODg+ODieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRocmVhZE9wdGlvbnM8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4gZXh0ZW5kcyBDYW5jZWxhYmxlLCBXb3JrZXJPcHRpb25zIHtcbiAgICBhcmdzPzogUGFyYW1ldGVyczxUPjtcbn1cblxuLyoqXG4gKiBAZW4gRW5zdXJlIGV4ZWN1dGlvbiBpbiB3b3JrZXIgdGhyZWFkLlxuICogQGphIOODr+ODvOOCq+ODvOOCueODrOODg+ODieWGheOBp+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgZXhlYyA9IChhcmcxOiBudW1iZXIsIGFyZzI6IHN0cmluZykgPT4ge1xuICogICAgLy8gdGhpcyBzY29wZSBpcyB3b3JrZXIgc2NvcGUuIHlvdSBjYW5ub3QgdXNlIGNsb3N1cmUgYWNjZXNzLlxuICogICAgY29uc3QgcGFyYW0gPSB7Li4ufTtcbiAqICAgIGNvbnN0IG1ldGhvZCA9IChwKSA9PiB7Li4ufTtcbiAqICAgIC8vIHlvdSBjYW4gYWNjZXNzIGFyZ3VtZW50cyBmcm9tIG9wdGlvbnMuXG4gKiAgICBjb25zb2xlLmxvZyhhcmcxKTsgLy8gJzEnXG4gKiAgICBjb25zb2xlLmxvZyhhcmcyKTsgLy8gJ3Rlc3QnXG4gKiAgICA6XG4gKiAgICByZXR1cm4gbWV0aG9kKHBhcmFtKTtcbiAqIH07XG4gKlxuICogY29uc3QgYXJnMSA9IDE7XG4gKiBjb25zdCBhcmcyID0gJ3Rlc3QnO1xuICogY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhyZWFkKGV4ZWMsIHsgYXJnczogW2FyZzEsIGFyZzJdIH0pO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIGltcGxlbWVudCBhcyBmdW5jdGlvbiBzY29wZS5cbiAqICAtIGBqYWAg6Zai5pWw44K544Kz44O844OX44Go44GX44Gm5a6f6KOFXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB0aHJlYWQgb3B0aW9uc1xuICogIC0gYGphYCDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRocmVhZDxULCBVPihleGVjdXRvcjogKC4uLmFyZ3M6IFVbXSkgPT4gVCB8IFByb21pc2U8VD4sIG9wdGlvbnM/OiBUaHJlYWRPcHRpb25zPHR5cGVvZiBleGVjdXRvcj4pOiBQcm9taXNlPFQ+IHtcbiAgICBjb25zdCB7IGNhbmNlbDogb3JpZ2luYWxUb2tlbiwgYXJncyB9ID0gT2JqZWN0LmFzc2lnbih7IGFyZ3M6IFtdIH0sIG9wdGlvbnMpO1xuXG4gICAgLy8gYWxyZWFkeSBjYW5jZWxcbiAgICBpZiAob3JpZ2luYWxUb2tlbj8ucmVxdWVzdGVkKSB7XG4gICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgIH1cblxuICAgIGNvbnN0IGV4ZWMgPSBgKHNlbGYgPT4ge1xuICAgICAgICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBhc3luYyAoeyBkYXRhIH0pID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgKCR7ZXhlY3V0b3IudG9TdHJpbmcoKX0pKC4uLmRhdGEpO1xuICAgICAgICAgICAgICAgIHNlbGYucG9zdE1lc3NhZ2UocmVzdWx0KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlOyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSkoc2VsZik7YDtcblxuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBJbmxpbmVXb3JrZXIoZXhlYywgb3B0aW9ucyk7XG5cbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICBvcmlnaW5hbFRva2VuPy5yZWdpc3RlcihhYm9ydCk7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKG9yaWdpbmFsVG9rZW4gYXMgQ2FuY2VsVG9rZW4pO1xuXG4gICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgd29ya2VyLm9uZXJyb3IgPSBldiA9PiB7XG4gICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmVqZWN0KGV2KTtcbiAgICAgICAgICAgIHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgd29ya2VyLm9ubWVzc2FnZSA9IGV2ID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoZXYuZGF0YSk7XG4gICAgICAgICAgICB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgICAgIH07XG4gICAgfSwgdG9rZW4pO1xuXG4gICAgd29ya2VyLnBvc3RNZXNzYWdlKGFyZ3MpO1xuXG4gICAgcmV0dXJuIHByb21pc2UgYXMgUHJvbWlzZTxUPjtcbn1cbiJdLCJuYW1lcyI6WyJCbG9iIiwiVVJMIiwiY2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUVBLGlCQUF3QixNQUFNLElBQUksR0FB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