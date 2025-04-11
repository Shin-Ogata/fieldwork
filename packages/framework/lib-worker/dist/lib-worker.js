/*!
 * @cdp/lib-worker 0.9.19
 *   worker library collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/lib-core')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/lib-core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, libCore) { 'use strict';

    /*!
     * @cdp/binary 0.9.19
     *   binary utility module
     */


    /** @internal */ const btoa = libCore.safe(globalThis.btoa);
    /** @internal */ const atob = libCore.safe(globalThis.atob);
    /** @internal */ const Blob$2 = libCore.safe(globalThis.Blob);
    /** @internal */ const FileReader = libCore.safe(globalThis.FileReader);
    /** @internal */ const URL$1 = libCore.safe(globalThis.URL);

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
        token && libCore.verify('instanceOf', libCore.CancelToken, token);
        onprogress && libCore.verify('typeOf', 'function', onprogress);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const subscription = token?.register(() => {
                reader.abort();
            });
            reader.onabort = reader.onerror = () => {
                reject(reader.error);
            };
            reader.onprogress = onprogress;
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
        return exec('readAsText', [blob, encoding ?? undefined], { ...options });
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
        const opts = options ?? {};
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
        const { cancel } = options ?? {};
        await libCore.checkCanceled(cancel);
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
            return libCore.fromTypedData(data);
        }
    }
    async function deserialize(value, options) {
        const { dataType, cancel } = options ?? {};
        await libCore.checkCanceled(cancel);
        const data = libCore.restoreNullish(libCore.toTypedData(value));
        switch (dataType) {
            case 'string':
                return libCore.fromTypedData(data);
            case 'number':
                return Number(data);
            case 'boolean':
                return Boolean(data);
            case 'object':
                return Object(data);
            case 'buffer':
                return dataURLToBuffer(libCore.fromTypedData(data));
            case 'binary':
                return dataURLToBinary(libCore.fromTypedData(data));
            case 'blob':
                return dataURLToBlob(libCore.fromTypedData(data));
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
     * @cdp/ajax 0.9.19
     *   ajax utility module
     */


    /* eslint-disable
        @typescript-eslint/no-namespace,
        @typescript-eslint/no-unused-vars,
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

    /** @internal */ const FormData = libCore.safe(globalThis.FormData);
    /** @internal */ const Headers = libCore.safe(globalThis.Headers);
    /** @internal */ const AbortController = libCore.safe(globalThis.AbortController);
    /** @internal */ const URLSearchParams = libCore.safe(globalThis.URLSearchParams);
    /** @internal */ const XMLHttpRequest = libCore.safe(globalThis.XMLHttpRequest);
    /** @internal */ const fetch = libCore.safe(globalThis.fetch);

    /** @internal ensure string value */
    const ensureParamValue = (prop) => {
        const value = libCore.isFunction(prop) ? prop() : prop;
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
                libCore.assignValue(params, key, value);
            }
        }
        return params;
    };
    /**
     * @en Convert URL parameters to primitive type.
     * @ja URL パラメータを primitive に変換
     */
    const convertUrlParamType = (value) => {
        if (libCore.isNumeric(value)) {
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
     * const query = parseUrlQuery(url);
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
            if (libCore.isFunction(target[prop])) {
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
        const _eventSource = new libCore.EventSource();
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
            _timeout = (libCore.isNumber(value) && 0 <= value) ? value : undefined;
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
        /*
         * X-Requested-With
         * 非標準ヘッダーであるため, 既定では cors の preflight response で許可されない
         * また mode の既定値は cors であるため, 有効にするには mode の明示的指定が必要となる
         */
        if (mode && 'cors' !== mode && !headers.get('X-Requested-With')) {
            headers.set('X-Requested-With', 'XMLHttpRequest');
        }
        // Basic Authorization
        if (null != username && !headers.get('Authorization')) {
            headers.set('Authorization', `Basic ${Base64.encode(`${username}:${password ?? ''}`)}`);
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
        const source = libCore.CancelToken.source(originalToken);
        const { token } = source;
        token.register(abort);
        // timeout
        if (timeout) {
            setTimeout(() => source.cancel(libCore.makeResult(libCore.RESULT_CODE.ERROR_AJAX_TIMEOUT, 'request timeout')), timeout);
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
            else {
                opts.body ??= new URLSearchParams(toAjaxParams(data));
            }
        }
        // execute
        const response = await Promise.resolve(fetch(url, opts), token);
        if ('response' === dataType) {
            return response;
        }
        else if (!response.ok) {
            throw libCore.makeResult(libCore.RESULT_CODE.ERROR_AJAX_RESPONSE, response.statusText, response);
        }
        else if ('stream' === dataType) {
            return toAjaxDataStream(response.body, Number(response.headers.get('content-length')));
        }
        else {
            // eslint-disable-next-line
            return Promise.resolve(response[dataType](), token);
        }
    }
    ajax.settings = settings;

    /** @internal */
    const ensureDataType = (dataType) => {
        return dataType ?? 'json';
    };
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
    const get = (url, data, dataType, options) => {
        return ajax(url, { ...options, method: 'GET', data, dataType: ensureDataType(dataType) });
    };
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
    const text = (url, options) => {
        return get(url, undefined, 'text', options);
    };
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
    const json = (url, options) => {
        return get(url, undefined, 'json', options);
    };
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
    const blob = (url, options) => {
        return get(url, undefined, 'blob', options);
    };
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
    const post = (url, data, dataType, options) => {
        return ajax(url, { ...options, method: 'POST', data, dataType: ensureDataType(dataType) });
    };
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
    const resource = (url, dataType, data) => {
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
            throw libCore.makeResult(libCore.RESULT_CODE.ERROR_AJAX_RESPONSE, xhr.statusText, xhr);
        }
        return 'json' === type ? JSON.parse(xhr.response) : xhr.response;
    };
    const request = {
        get,
        text,
        json,
        blob,
        post,
        resource,
    };

    /*!
     * @cdp/inline-worker 0.9.19
     *   inline web worker utility module
     */


    /** @internal */ const URL = libCore.safe(globalThis.URL);
    /** @internal */ const Worker = libCore.safe(globalThis.Worker);
    /** @internal */ const Blob$1 = libCore.safe(globalThis.Blob);
    /** @internal */
    function createWorkerContext(src) {
        if (!(libCore.isFunction(src) || libCore.isString(src))) {
            throw new TypeError(`${libCore.className(src)} is not a function or string.`);
        }
        return URL.createObjectURL(new Blob$1([libCore.isFunction(src) ? `(${src.toString()})(self);` : src], { type: 'application/javascript' }));
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
        const { token } = libCore.CancelToken.source(originalToken);
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

    exports.Base64 = Base64;
    exports.BlobURL = BlobURL;
    exports.InlineWorker = InlineWorker;
    exports.ajax = ajax;
    exports.base64ToBinary = base64ToBinary;
    exports.base64ToBlob = base64ToBlob;
    exports.base64ToBuffer = base64ToBuffer;
    exports.base64ToDataURL = base64ToDataURL;
    exports.base64ToText = base64ToText;
    exports.binaryToBase64 = binaryToBase64;
    exports.binaryToBlob = binaryToBlob;
    exports.binaryToBuffer = binaryToBuffer;
    exports.binaryToDataURL = binaryToDataURL;
    exports.binaryToText = binaryToText;
    exports.blobToBase64 = blobToBase64;
    exports.blobToBinary = blobToBinary;
    exports.blobToBuffer = blobToBuffer;
    exports.blobToDataURL = blobToDataURL;
    exports.blobToText = blobToText;
    exports.bufferToBase64 = bufferToBase64;
    exports.bufferToBinary = bufferToBinary;
    exports.bufferToBlob = bufferToBlob;
    exports.bufferToDataURL = bufferToDataURL;
    exports.bufferToText = bufferToText;
    exports.convertUrlParamType = convertUrlParamType;
    exports.dataURLToBase64 = dataURLToBase64;
    exports.dataURLToBinary = dataURLToBinary;
    exports.dataURLToBlob = dataURLToBlob;
    exports.dataURLToBuffer = dataURLToBuffer;
    exports.dataURLToText = dataURLToText;
    exports.deserialize = deserialize;
    exports.fromBinaryString = fromBinaryString;
    exports.fromHexString = fromHexString;
    exports.parseUrlQuery = parseUrlQuery;
    exports.readAsArrayBuffer = readAsArrayBuffer;
    exports.readAsDataURL = readAsDataURL;
    exports.readAsText = readAsText;
    exports.request = request;
    exports.serialize = serialize;
    exports.setupHeaders = setupHeaders;
    exports.textToBase64 = textToBase64;
    exports.textToBinary = textToBinary;
    exports.textToBlob = textToBlob;
    exports.textToBuffer = textToBuffer;
    exports.textToDataURL = textToDataURL;
    exports.thread = thread;
    exports.toAjaxDataStream = toAjaxDataStream;
    exports.toAjaxParams = toAjaxParams;
    exports.toBinaryString = toBinaryString;
    exports.toHexString = toHexString;
    exports.toQueryStrings = toQueryStrings;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLXdvcmtlci5qcyIsInNvdXJjZXMiOlsiYmluYXJ5L3Nzci50cyIsImJpbmFyeS9iYXNlNjQudHMiLCJiaW5hcnkvYmxvYi1yZWFkZXIudHMiLCJiaW5hcnkvY29udmVydGVyLnRzIiwiYmluYXJ5L2Jsb2ItdXJsLnRzIiwiYWpheC9yZXN1bHQtY29kZS1kZWZzLnRzIiwiYWpheC9zc3IudHMiLCJhamF4L3BhcmFtcy50cyIsImFqYXgvc3RyZWFtLnRzIiwiYWpheC9zZXR0aW5ncy50cyIsImFqYXgvY29yZS50cyIsImFqYXgvcmVxdWVzdC50cyIsImlubGluZS13b3JrZXIvaW5pbmUtd29ya2VyLnRzIiwiaW5saW5lLXdvcmtlci90aHJlYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGJ0b2EgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuYnRvYSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBhdG9iICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmF0b2IpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgQmxvYiAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5CbG9iKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEZpbGVSZWFkZXIgPSBzYWZlKGdsb2JhbFRoaXMuRmlsZVJlYWRlcik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBVUkwgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLlVSTCk7XG4iLCJpbXBvcnQgeyBhdG9iLCBidG9hIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBgYmFzZTY0YCB1dGlsaXR5IGZvciBpbmRlcGVuZGVudCBjaGFyYWN0b3IgY29kZS5cbiAqIEBqYSDmloflrZfjgrPjg7zjg4njgavkvp3lrZjjgZfjgarjgYQgYGJhc2U2NGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCYXNlNjQge1xuICAgIC8qKlxuICAgICAqIEBlbiBFbmNvZGUgYSBiYXNlLTY0IGVuY29kZWQgc3RyaW5nIGZyb20gYSBiaW5hcnkgc3RyaW5nLlxuICAgICAqIEBqYSDmloflrZfliJfjgpIgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZW5jb2RlKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHNyYykpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjb2RlcyBhIHN0cmluZyBvZiBkYXRhIHdoaWNoIGhhcyBiZWVuIGVuY29kZWQgdXNpbmcgYmFzZS02NCBlbmNvZGluZy5cbiAgICAgKiBAamEgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODieOBleOCjOOBn+ODh+ODvOOCv+OBruaWh+Wtl+WIl+OCkuODh+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZGVjb2RlKGVuY29kZWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGF0b2IoZW5jb2RlZCkpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB0eXBlIFVua25vd25GdW5jdGlvbiwgdmVyaWZ5IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHR5cGUgQ2FuY2VsYWJsZSwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgRmlsZVJlYWRlciB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEZpbGVSZWFkZXJBcmdzTWFwIHtcbiAgICByZWFkQXNBcnJheUJ1ZmZlcjogW0Jsb2JdO1xuICAgIHJlYWRBc0RhdGFVUkw6IFtCbG9iXTtcbiAgICByZWFkQXNUZXh0OiBbQmxvYiwgc3RyaW5nIHwgdW5kZWZpbmVkXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEZpbGVSZWFkZXJSZXN1bHRNYXAge1xuICAgIHJlYWRBc0FycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcjtcbiAgICByZWFkQXNEYXRhVVJMOiBzdHJpbmc7XG4gICAgcmVhZEFzVGV4dDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBgQmxvYmAgcmVhZCBvcHRpb25zXG4gKiBAamEgYEJsb2JgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEJsb2JSZWFkT3B0aW9ucyBleHRlbmRzIENhbmNlbGFibGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBQcm9ncmVzcyBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAamEg6YCy5o2X44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvZ3Jlc3NcbiAgICAgKiAgLSBgZW5gIHdvcmtlciBwcm9ncmVzcyBldmVudFxuICAgICAqICAtIGBqYWAgd29ya2VyIOmAsuaNl+OCpOODmeODs+ODiFxuICAgICAqL1xuICAgIG9ucHJvZ3Jlc3M/OiAocHJvZ3Jlc3M6IFByb2dyZXNzRXZlbnQpID0+IHVua25vd247XG59XG5cbi8qKiBAaW50ZXJuYWwgZXhlY3V0ZSByZWFkIGJsb2IgKi9cbmZ1bmN0aW9uIGV4ZWM8VCBleHRlbmRzIGtleW9mIEZpbGVSZWFkZXJSZXN1bHRNYXA+KFxuICAgIG1ldGhvZE5hbWU6IFQsXG4gICAgYXJnczogRmlsZVJlYWRlckFyZ3NNYXBbVF0sXG4gICAgb3B0aW9uczogQmxvYlJlYWRPcHRpb25zLFxuKTogUHJvbWlzZTxGaWxlUmVhZGVyUmVzdWx0TWFwW1RdPiB7XG4gICAgdHlwZSBUUmVzdWx0ID0gRmlsZVJlYWRlclJlc3VsdE1hcFtUXTtcbiAgICBjb25zdCB7IGNhbmNlbDogdG9rZW4sIG9ucHJvZ3Jlc3MgfSA9IG9wdGlvbnM7XG4gICAgdG9rZW4gJiYgdmVyaWZ5KCdpbnN0YW5jZU9mJywgQ2FuY2VsVG9rZW4sIHRva2VuKTtcbiAgICBvbnByb2dyZXNzICYmIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgb25wcm9ncmVzcyk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFRSZXN1bHQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdG9rZW4/LnJlZ2lzdGVyKCgpID0+IHtcbiAgICAgICAgICAgIHJlYWRlci5hYm9ydCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVhZGVyLm9uYWJvcnQgPSByZWFkZXIub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25wcm9ncmVzcyA9IG9ucHJvZ3Jlc3MhO1xuICAgICAgICByZWFkZXIub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0IGFzIFRSZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25sb2FkZW5kID0gKCkgPT4ge1xuICAgICAgICAgICAgc3Vic2NyaXB0aW9uICYmIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICB9O1xuICAgICAgICAocmVhZGVyW21ldGhvZE5hbWVdIGFzIFVua25vd25GdW5jdGlvbikoLi4uYXJncyk7XG4gICAgfSwgdG9rZW4pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGBBcnJheUJ1ZmZlcmAgcmVzdWx0IGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNBcnJheUJ1ZmZlcihibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNBcnJheUJ1ZmZlcicsIFtibG9iXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGRhdGEtVVJMIHN0cmluZyBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJIGBkYXRhLXVybCDmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNEYXRhVVJMKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNEYXRhVVJMJywgW2Jsb2JdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdGV4dCBjb250ZW50IHN0cmluZyBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJ44OG44Kt44K544OI5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gZW5jb2RpbmdcbiAqICAtIGBlbmAgZW5jb2Rpbmcgc3RyaW5nIHRvIHVzZSBmb3IgdGhlIHJldHVybmVkIGRhdGEuIGRlZmF1bHQ6IGB1dGYtOGBcbiAqICAtIGBqYWAg44Ko44Oz44Kz44O844OH44Kj44Oz44Kw44KS5oyH5a6a44GZ44KL5paH5a2X5YiXIOaXouWumjogYHV0Zi04YFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc1RleHQoYmxvYjogQmxvYiwgZW5jb2Rpbmc/OiBzdHJpbmcgfCBudWxsLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzVGV4dCcsIFtibG9iLCBlbmNvZGluZyA/PyB1bmRlZmluZWRdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgS2V5cyxcbiAgICB0eXBlIFR5cGVzLFxuICAgIHR5cGUgVHlwZVRvS2V5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgcmVzdG9yZU51bGxpc2gsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgQmFzZTY0IH0gZnJvbSAnLi9iYXNlNjQnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEJsb2JSZWFkT3B0aW9ucyxcbiAgICByZWFkQXNBcnJheUJ1ZmZlcixcbiAgICByZWFkQXNEYXRhVVJMLFxuICAgIHJlYWRBc1RleHQsXG59IGZyb20gJy4vYmxvYi1yZWFkZXInO1xuaW1wb3J0IHsgQmxvYiB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBNaW1lVHlwZSB7XG4gICAgQklOQVJZID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScsXG4gICAgVEVYVCA9ICd0ZXh0L3BsYWluJyxcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZGF0YS1VUkwg5bGe5oCnICovXG5pbnRlcmZhY2UgRGF0YVVSTENvbnRleHQge1xuICAgIG1pbWVUeXBlOiBzdHJpbmc7XG4gICAgYmFzZTY0OiBib29sZWFuO1xuICAgIGRhdGE6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIGRhdGEgVVJJIOW9ouW8j+OBruato+imj+ihqOePvlxuICog5Y+C6ICDOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL2RhdGFfVVJJc1xuICovXG5mdW5jdGlvbiBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkw6IHN0cmluZyk6IERhdGFVUkxDb250ZXh0IHtcbiAgICBjb25zdCBjb250ZXh0ID0geyBiYXNlNjQ6IGZhbHNlIH0gYXMgRGF0YVVSTENvbnRleHQ7XG5cbiAgICAvKipcbiAgICAgKiBbbWF0Y2hdIDE6IG1pbWUtdHlwZVxuICAgICAqICAgICAgICAgMjogXCI7YmFzZTY0XCIg44KS5ZCr44KA44Kq44OX44K344On44OzXG4gICAgICogICAgICAgICAzOiBkYXRhIOacrOS9k1xuICAgICAqL1xuICAgIGNvbnN0IHJlc3VsdCA9IC9eZGF0YTooLis/XFwvLis/KT8oOy4rPyk/LCguKikkLy5leGVjKGRhdGFVUkwpO1xuICAgIGlmIChudWxsID09IHJlc3VsdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGF0YS1VUkw6ICR7ZGF0YVVSTH1gKTtcbiAgICB9XG5cbiAgICBjb250ZXh0Lm1pbWVUeXBlID0gcmVzdWx0WzFdO1xuICAgIGNvbnRleHQuYmFzZTY0ID0gLztiYXNlNjQvLnRlc3QocmVzdWx0WzJdKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWluY2x1ZGVzXG4gICAgY29udGV4dC5kYXRhID0gcmVzdWx0WzNdO1xuXG4gICAgcmV0dXJuIGNvbnRleHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGhlbHBlciAqL1xuZnVuY3Rpb24gYmluYXJ5U3RyaW5nVG9CaW5hcnkoYnl0ZXM6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IGFycmF5ID0gYnl0ZXMuc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKSk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGFycmF5KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGJpbmFyeVRvQmluYXJ5U3RyaW5nKGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5tYXAuY2FsbChiaW5hcnksIChpOiBudW1iZXIpID0+IFN0cmluZy5mcm9tQ2hhckNvZGUoaSkpLmpvaW4oJycpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyB0byBiaW5hcnktc3RyaW5nLiAobm90IGh1bWFuIHJlYWRhYmxlIHN0cmluZylcbiAqIEBqYSDjg5DjgqTjg4rjg6rmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9CaW5hcnlTdHJpbmcodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHRleHQpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgZnJvbSBiaW5hcnktc3RyaW5nLlxuICogQGphIOODkOOCpOODiuODquaWh+Wtl+WIl+OBi+OCieWkieaPm1xuICpcbiAqIEBwYXJhbSBieXRlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUJpbmFyeVN0cmluZyhieXRlczogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShieXRlcykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGJpbmFyeSB0byBoZXgtc3RyaW5nLlxuICogQGphIOODkOOCpOODiuODquOCkiBIRVgg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGhleFxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUhleFN0cmluZyhoZXg6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IHggPSBoZXgubWF0Y2goLy57MSwyfS9nKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobnVsbCAhPSB4ID8geC5tYXAoYnl0ZSA9PiBwYXJzZUludChieXRlLCAxNikpIDogW10pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyBmcm9tIGhleC1zdHJpbmcuXG4gKiBAamEgSEVYIOaWh+Wtl+WIl+OBi+OCieODkOOCpOODiuODquOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvSGV4U3RyaW5nKGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeS5yZWR1Y2UoKHN0ciwgYnl0ZSkgPT4gc3RyICsgYnl0ZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKS5wYWRTdGFydCgyLCAnMCcpLCAnJyk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGBCbG9iYCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb0J1ZmZlcihibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIHJldHVybiByZWFkQXNBcnJheUJ1ZmZlcihibG9iLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGBCbG9iYCDjgYvjgokgYFVpbnQ4QXJyYXlgIOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYmxvYlRvQmluYXJ5KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXdhaXQgcmVhZEFzQXJyYXlCdWZmZXIoYmxvYiwgb3B0aW9ucykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb0RhdGFVUkwoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHJlYWRBc0RhdGFVUkwoYmxvYiwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgonjg4bjgq3jgrnjg4jjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb1RleHQoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyAmIHsgZW5jb2Rpbmc/OiBzdHJpbmcgfCBudWxsOyB9KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBvcHRzID0gb3B0aW9ucyA/PyB7fTtcbiAgICBjb25zdCB7IGVuY29kaW5nIH0gPSBvcHRzO1xuICAgIHJldHVybiByZWFkQXNUZXh0KGJsb2IsIGVuY29kaW5nLCBvcHRzKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJsb2JUb0Jhc2U2NChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gcXVlcnlEYXRhVVJMQ29udGV4dChhd2FpdCByZWFkQXNEYXRhVVJMKGJsb2IsIG9wdGlvbnMpKS5kYXRhO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGBCbG9iYC5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0Jsb2IoYnVmZmVyOiBBcnJheUJ1ZmZlciwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbYnVmZmVyXSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0JpbmFyeShidWZmZXI6IEFycmF5QnVmZmVyKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0RhdGFVUkwoYnVmZmVyOiBBcnJheUJ1ZmZlciwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvRGF0YVVSTChuZXcgVWludDhBcnJheShidWZmZXIpLCBtaW1lVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb0Jhc2U2NChuZXcgVWludDhBcnJheShidWZmZXIpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJ44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb1RleHQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvVGV4dChuZXcgVWludDhBcnJheShidWZmZXIpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGBCbG9iYC5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0Jsb2IoYmluYXJ5OiBVaW50OEFycmF5LCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFtiaW5hcnldLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0J1ZmZlcihiaW5hcnk6IFVpbnQ4QXJyYXkpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGJpbmFyeS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvRGF0YVVSTChiaW5hcnk6IFVpbnQ4QXJyYXksIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiaW5hcnlUb0Jhc2U2NChiaW5hcnkpfWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CYXNlNjQoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmVuY29kZShiaW5hcnlUb1RleHQoYmluYXJ5KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokg44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9UZXh0KGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGZyb21CaW5hcnlTdHJpbmcoYmluYXJ5VG9CaW5hcnlTdHJpbmcoYmluYXJ5KSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmxvYihiYXNlNjQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBiaW5hcnlUb0Jsb2IoYmFzZTY0VG9CaW5hcnkoYmFzZTY0KSwgbWltZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CdWZmZXIoYmFzZTY0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGJhc2U2NFRvQmluYXJ5KGJhc2U2NCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmluYXJ5KGJhc2U2NDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJpbmFyeVN0cmluZ1RvQmluYXJ5KHRvQmluYXJ5U3RyaW5nKEJhc2U2NC5kZWNvZGUoYmFzZTY0KSkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9EYXRhVVJMKGJhc2U2NDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSAgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSDjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb1RleHQoYmFzZTY0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKGJhc2U2NCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CbG9iKHRleHQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLlRFWFQpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW3RleHRdLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0J1ZmZlcih0ZXh0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRleHRUb0JpbmFyeSh0ZXh0KS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0JpbmFyeSh0ZXh0OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmluYXJ5U3RyaW5nVG9CaW5hcnkodG9CaW5hcnlTdHJpbmcodGV4dCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0RhdGFVUkwodGV4dDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuVEVYVCk6IHN0cmluZyB7XG4gICAgY29uc3QgYmFzZTY0ID0gdGV4dFRvQmFzZTY0KHRleHQpO1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiYXNlNjR9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0Jhc2U2NCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKHRleHQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CbG9iKGRhdGFVUkw6IHN0cmluZyk6IEJsb2Ige1xuICAgIGNvbnN0IGNvbnRleHQgPSBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkwpO1xuICAgIGlmIChjb250ZXh0LmJhc2U2NCkge1xuICAgICAgICByZXR1cm4gYmFzZTY0VG9CbG9iKGNvbnRleHQuZGF0YSwgY29udGV4dC5taW1lVHlwZSB8fCBNaW1lVHlwZS5CSU5BUlkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0ZXh0VG9CbG9iKGRlY29kZVVSSUNvbXBvbmVudChjb250ZXh0LmRhdGEpLCBjb250ZXh0Lm1pbWVUeXBlIHx8IE1pbWVUeXBlLlRFWFQpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0J1ZmZlcihkYXRhVVJMOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGRhdGFVUkxUb0JpbmFyeShkYXRhVVJMKS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmluYXJ5KGRhdGFVUkw6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiYXNlNjRUb0JpbmFyeShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgonjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb1RleHQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmRlY29kZShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMKTtcbiAgICBpZiAoY29udGV4dC5iYXNlNjQpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQuZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gQmFzZTY0LmVuY29kZShkZWNvZGVVUklDb21wb25lbnQoY29udGV4dC5kYXRhKSk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gU2VyaWFsaXphYmxlIGRhdGEgdHlwZSBsaXN0LlxuICogQGphIOOCt+ODquOCouODqeOCpOOCuuWPr+iDveOBquODh+ODvOOCv+Wei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlcmlhbGl6YWJsZSB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBvYmplY3Q6IG9iamVjdDtcbiAgICBidWZmZXI6IEFycmF5QnVmZmVyO1xuICAgIGJpbmFyeTogVWludDhBcnJheTtcbiAgICBibG9iOiBCbG9iO1xufVxuXG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVEYXRhVHlwZXMgPSBUeXBlczxTZXJpYWxpemFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXMgPSBTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkO1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlS2V5cyA9IEtleXM8U2VyaWFsaXphYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUNhc3RhYmxlID0gT21pdDxTZXJpYWxpemFibGUsICdidWZmZXInIHwgJ2JpbmFyeScgfCAnYmxvYic+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcyA9IFR5cGVzPFNlcmlhbGl6YWJsZUNhc3RhYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZVJldHVyblR5cGU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXM+ID0gVHlwZVRvS2V5PFNlcmlhbGl6YWJsZUNhc3RhYmxlLCBUPiBleHRlbmRzIG5ldmVyID8gbmV2ZXIgOiBUIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemFibGUgb3B0aW9ucyBpbnRlcmZhY2UuXG4gKiBAamEg44OH44K344Oq44Ki44Op44Kk44K644Gr5L2/55So44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVzZXJpYWxpemVPcHRpb25zPFQgZXh0ZW5kcyBTZXJpYWxpemFibGUgPSBTZXJpYWxpemFibGUsIEsgZXh0ZW5kcyBLZXlzPFQ+ID0gS2V5czxUPj4gZXh0ZW5kcyBDYW5jZWxhYmxlIHtcbiAgICAvKioge0BsaW5rIFNlcmlhbGl6YWJsZUtleXN9ICovXG4gICAgZGF0YVR5cGU/OiBLO1xufVxuXG4vKipcbiAqIEBlbiBTZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jgrfjg6rjgqLjg6njgqTjgrpcbiAqXG4gKiBAcGFyYW0gZGF0YSBpbnB1dFxuICogQHBhcmFtIG9wdGlvbnMgYmxvYiBjb252ZXJ0IG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXM+KGRhdGE6IFQsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgaWYgKG51bGwgPT0gZGF0YSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBidWZmZXJUb0RhdGFVUkwoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICByZXR1cm4gYmluYXJ5VG9EYXRhVVJMKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgICAgcmV0dXJuIGJsb2JUb0RhdGFVUkwoZGF0YSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZyb21UeXBlZERhdGEoZGF0YSkhO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzID0gU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcz4oXG4gICAgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IERlc2VyaWFsaXplT3B0aW9uczxTZXJpYWxpemFibGUsIG5ldmVyPlxuKTogUHJvbWlzZTxTZXJpYWxpemFibGVSZXR1cm5UeXBlPFQ+PjtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVLZXlzPih2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBEZXNlcmlhbGl6ZU9wdGlvbnM8U2VyaWFsaXphYmxlLCBUPik6IFByb21pc2U8U2VyaWFsaXphYmxlW1RdIHwgbnVsbCB8IHVuZGVmaW5lZD47XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZXNlcmlhbGl6ZSh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zPzogRGVzZXJpYWxpemVPcHRpb25zKTogUHJvbWlzZTxTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgeyBkYXRhVHlwZSwgY2FuY2VsIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG5cbiAgICBjb25zdCBkYXRhID0gcmVzdG9yZU51bGxpc2godG9UeXBlZERhdGEodmFsdWUpKTtcbiAgICBzd2l0Y2ggKGRhdGFUeXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YShkYXRhKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIEJvb2xlYW4oZGF0YSk7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0KGRhdGEpO1xuICAgICAgICBjYXNlICdidWZmZXInOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGFVUkxUb0J1ZmZlcihmcm9tVHlwZWREYXRhKGRhdGEpISk7XG4gICAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmluYXJ5KGZyb21UeXBlZERhdGEoZGF0YSkhKTtcbiAgICAgICAgY2FzZSAnYmxvYic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmxvYihmcm9tVHlwZWREYXRhKGRhdGEpISk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVUkwgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2Jsb2JNYXAgPSBuZXcgV2Vha01hcDxCbG9iLCBzdHJpbmc+KCk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF91cmxTZXQgID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbi8qKlxuICogQGVuIGBCbG9iIFVSTGAgdXRpbGl0eSBmb3IgYXV0b21hdGljIG1lbW9yeSBtYW5lZ2VtZW50LlxuICogQGphIOODoeODouODquiHquWLleeuoeeQhuOCkuihjOOBhiBgQmxvYiBVUkxgIOODpuODvOODhuOCo+ODquODhuOCo1xuICovXG5leHBvcnQgY2xhc3MgQmxvYlVSTCB7XG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjga7mp4vnr4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZSguLi5ibG9iczogQmxvYltdKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgYiBvZiBibG9icykge1xuICAgICAgICAgICAgY29uc3QgY2FjaGUgPSBfYmxvYk1hcC5nZXQoYik7XG4gICAgICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYik7XG4gICAgICAgICAgICBfYmxvYk1hcC5zZXQoYiwgdXJsKTtcbiAgICAgICAgICAgIF91cmxTZXQuYWRkKHVybCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIGBCbG9iIFVSTGAgY2FjaGUuXG4gICAgICogQGphIOOBmeOBueOBpuOBriBgQmxvYiBVUkxgIOOCreODo+ODg+OCt+ODpeOCkuegtOajhFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY2xlYXIoKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgdXJsIG9mIF91cmxTZXQpIHtcbiAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgfVxuICAgICAgICBfdXJsU2V0LmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBruWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0KGJsb2I6IEJsb2IpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBjYWNoZSA9IF9ibG9iTWFwLmdldChibG9iKTtcbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgX2Jsb2JNYXAuc2V0KGJsb2IsIHVybCk7XG4gICAgICAgIF91cmxTZXQuYWRkKHVybCk7XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGBCbG9iIFVSTGAgaXMgYXZhaWxhYmxlIGZyb20gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBjOacieWKueWMluWIpOWumlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgaGFzKGJsb2I6IEJsb2IpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIF9ibG9iTWFwLmhhcyhibG9iKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV2b2tlIGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZXMuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOCkueEoeWKueWMllxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgcmV2b2tlKC4uLmJsb2JzOiBCbG9iW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIGJsb2JzKSB7XG4gICAgICAgICAgICBjb25zdCB1cmwgPSBfYmxvYk1hcC5nZXQoYik7XG4gICAgICAgICAgICBpZiAodXJsKSB7XG4gICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICAgICAgICAgIF9ibG9iTWFwLmRlbGV0ZShiKTtcbiAgICAgICAgICAgICAgICBfdXJsU2V0LmRlbGV0ZSh1cmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBBSkFYID0gQ0RQX0tOT1dOX01PRFVMRS5BSkFYICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEFKQVhfREVDTEFSRSAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX0FKQVhfUkVTUE9OU0UgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMSwgJ25ldHdvcmsgZXJyb3IuJyksXG4gICAgICAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgRm9ybURhdGEgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkZvcm1EYXRhKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEhlYWRlcnMgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5IZWFkZXJzKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEFib3J0Q29udHJvbGxlciA9IHNhZmUoZ2xvYmFsVGhpcy5BYm9ydENvbnRyb2xsZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgVVJMU2VhcmNoUGFyYW1zID0gc2FmZShnbG9iYWxUaGlzLlVSTFNlYXJjaFBhcmFtcyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBYTUxIdHRwUmVxdWVzdCAgPSBzYWZlKGdsb2JhbFRoaXMuWE1MSHR0cFJlcXVlc3QpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZmV0Y2ggICAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmZldGNoKTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBQbGFpbk9iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzTnVtZXJpYyxcbiAgICBhc3NpZ25WYWx1ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFVSTFNlYXJjaFBhcmFtcyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgc3RyaW5nIHZhbHVlICovXG5jb25zdCBlbnN1cmVQYXJhbVZhbHVlID0gKHByb3A6IHVua25vd24pOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHZhbHVlID0gaXNGdW5jdGlvbihwcm9wKSA/IHByb3AoKSA6IHByb3A7XG4gICAgcmV0dXJuIHVuZGVmaW5lZCAhPT0gdmFsdWUgPyBTdHJpbmcodmFsdWUpIDogJyc7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gcXVlcnkgc3RyaW5ncy5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkuOCr+OCqOODquOCueODiOODquODs+OCsOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgdG9RdWVyeVN0cmluZ3MgPSAoZGF0YTogUGxhaW5PYmplY3QpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHBhcmFtczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGVuc3VyZVBhcmFtVmFsdWUoZGF0YVtrZXldKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBwYXJhbXMucHVzaChgJHtlbmNvZGVVUklDb21wb25lbnQoa2V5KX09JHtlbmNvZGVVUklDb21wb25lbnQodmFsdWUpfWApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXMuam9pbignJicpO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBgUGxhaW5PYmplY3RgIHRvIEFqYXggcGFyYW1ldGVycyBvYmplY3QuXG4gKiBAamEgYFBsYWluT2JqZWN0YCDjgpIgQWpheCDjg5Hjg6njg6Hjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IHRvQWpheFBhcmFtcyA9IChkYXRhOiBQbGFpbk9iamVjdCk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPT4ge1xuICAgIGNvbnN0IHBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZW5zdXJlUGFyYW1WYWx1ZShkYXRhW2tleV0pO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGFzc2lnblZhbHVlKHBhcmFtcywga2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgVVJMIHBhcmFtZXRlcnMgdG8gcHJpbWl0aXZlIHR5cGUuXG4gKiBAamEgVVJMIOODkeODqeODoeODvOOCv+OCkiBwcmltaXRpdmUg44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCBjb252ZXJ0VXJsUGFyYW1UeXBlID0gKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCA9PiB7XG4gICAgaWYgKGlzTnVtZXJpYyh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIE51bWJlcih2YWx1ZSk7XG4gICAgfSBlbHNlIGlmICgndHJ1ZScgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoJ251bGwnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBQYXJzZSB1cmwgcXVlcnkgR0VUIHBhcmFtZXRlcnMuXG4gKiBAamEgVVJM44Kv44Ko44Oq44GuR0VU44OR44Op44Oh44O844K/44KS6Kej5p6QXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB1cmwgPSAnL3BhZ2UvP2lkPTUmZm9vPWJhciZib29sPXRydWUnO1xuICogY29uc3QgcXVlcnkgPSBwYXJzZVVybFF1ZXJ5KHVybCk7XG4gKiAvLyB7IGlkOiA1LCBmb286ICdiYXInLCBib29sOiB0cnVlIH1cbiAqIGBgYFxuICpcbiAqIEByZXR1cm5zIHsga2V5OiB2YWx1ZSB9IG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IHBhcnNlVXJsUXVlcnkgPSA8VCA9IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPj4odXJsOiBzdHJpbmcpOiBUID0+IHtcbiAgICBjb25zdCBxdWVyeTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHVybC5pbmNsdWRlcygnPycpID8gdXJsLnNwbGl0KCc/JylbMV0gOiB1cmwpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHBhcmFtcykge1xuICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoa2V5KV0gPSBjb252ZXJ0VXJsUGFyYW1UeXBlKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHF1ZXJ5IGFzIFQ7XG59O1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgdHlwZSBLZXlzLFxuICAgIGlzRnVuY3Rpb24sXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIFN1YnNjcmliYWJsZSwgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgdHlwZSB7IEFqYXhEYXRhU3RyZWFtRXZlbnQsIEFqYXhEYXRhU3RyZWFtIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBQcm94eUhhbmRsZXIgaGVscGVyICovXG5jb25zdCBfZXhlY0dldERlZmF1bHQgPSAodGFyZ2V0OiBhbnksIHByb3A6IHN0cmluZyB8IHN5bWJvbCk6IGFueSA9PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGlmIChwcm9wIGluIHRhcmdldCkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbih0YXJnZXRbcHJvcF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdLmJpbmQodGFyZ2V0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcF07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc3Vic2NyaWJhYmxlTWV0aG9kczogS2V5czxTdWJzY3JpYmFibGU+W10gPSBbXG4gICAgJ2hhc0xpc3RlbmVyJyxcbiAgICAnY2hhbm5lbHMnLFxuICAgICdvbicsXG4gICAgJ29mZicsXG4gICAgJ29uY2UnLFxuXTtcblxuZXhwb3J0IGNvbnN0IHRvQWpheERhdGFTdHJlYW0gPSAoc2VlZDogQmxvYiB8IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCBsZW5ndGg/OiBudW1iZXIpOiBBamF4RGF0YVN0cmVhbSA9PiB7XG4gICAgbGV0IGxvYWRlZCA9IDA7XG4gICAgY29uc3QgW3N0cmVhbSwgdG90YWxdID0gKCgpID0+IHtcbiAgICAgICAgaWYgKHNlZWQgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQuc3RyZWFtKCksIHNlZWQuc2l6ZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQsIGxlbmd0aCAhPSBudWxsID8gTWF0aC50cnVuYyhsZW5ndGgpIDogTmFOXTtcbiAgICAgICAgfVxuICAgIH0pKCk7XG5cbiAgICBjb25zdCBfZXZlbnRTb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2U8QWpheERhdGFTdHJlYW1FdmVudD4oKSBhcyBBY2Nlc3NpYmxlPEV2ZW50U291cmNlPEFqYXhEYXRhU3RyZWFtRXZlbnQ+LCBVbmtub3duRnVuY3Rpb24+O1xuXG4gICAgY29uc3QgX3Byb3h5UmVhZGVySGFuZGxlcjogUHJveHlIYW5kbGVyPFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxVaW50OEFycmF5Pj4gPSB7XG4gICAgICAgIGdldDogKHRhcmdldDogUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICgncmVhZCcgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gdGFyZ2V0LnJlYWQoKTtcbiAgICAgICAgICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWU6IGNodW5rIH0gPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICBjaHVuayAmJiAobG9hZGVkICs9IGNodW5rLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIF9ldmVudFNvdXJjZS50cmlnZ2VyKCdwcm9ncmVzcycsIE9iamVjdC5mcmVlemUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcHV0YWJsZTogIU51bWJlci5pc05hTih0b3RhbCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2FkZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaHVuayxcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgpID0+IHByb21pc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBfZXhlY0dldERlZmF1bHQodGFyZ2V0LCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBQcm94eShzdHJlYW0sIHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiwgcHJvcDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAoJ2dldFJlYWRlcicgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gbmV3IFByb3h5KHRhcmdldC5nZXRSZWFkZXIoKSwgX3Byb3h5UmVhZGVySGFuZGxlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCdsZW5ndGgnID09PSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfc3Vic2NyaWJhYmxlTWV0aG9kcy5pbmNsdWRlcyhwcm9wIGFzIEtleXM8U3Vic2NyaWJhYmxlPikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gX2V2ZW50U291cmNlW3Byb3BdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX2V4ZWNHZXREZWZhdWx0KHRhcmdldCwgcHJvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSkgYXMgQWpheERhdGFTdHJlYW07XG59O1xuIiwiaW1wb3J0IHsgaXNOdW1iZXIgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsICovIGxldCBfdGltZW91dDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgZ2V0IHRpbWVvdXQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF90aW1lb3V0O1xuICAgIH0sXG4gICAgc2V0IHRpbWVvdXQodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgICAgICBfdGltZW91dCA9IChpc051bWJlcih2YWx1ZSkgJiYgMCA8PSB2YWx1ZSkgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICB9LFxufTtcbiIsImltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgQmFzZTY0IH0gZnJvbSAnQGNkcC9iaW5hcnknO1xuaW1wb3J0IHR5cGUge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgRm9ybURhdGEsXG4gICAgSGVhZGVycyxcbiAgICBBYm9ydENvbnRyb2xsZXIsXG4gICAgVVJMU2VhcmNoUGFyYW1zLFxuICAgIGZldGNoLFxufSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyB0b1F1ZXJ5U3RyaW5ncywgdG9BamF4UGFyYW1zIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgdG9BamF4RGF0YVN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IHNldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIEFqYXhIZWFkZXJPcHRpb25zID0gUGljazxBamF4T3B0aW9uczxBamF4RGF0YVR5cGVzPiwgJ2hlYWRlcnMnIHwgJ21ldGhvZCcgfCAnY29udGVudFR5cGUnIHwgJ2RhdGFUeXBlJyB8ICdtb2RlJyB8ICdib2R5JyB8ICd1c2VybmFtZScgfCAncGFzc3dvcmQnPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2FjY2VwdEhlYWRlck1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICB0ZXh0OiAndGV4dC9wbGFpbiwgdGV4dC9odG1sLCBhcHBsaWNhdGlvbi94bWw7IHE9MC44LCB0ZXh0L3htbDsgcT0wLjgsICovKjsgcT0wLjAxJyxcbiAgICBqc29uOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9qYXZhc2NyaXB0LCAqLyo7IHE9MC4wMScsXG59O1xuXG4vKipcbiAqIEBlbiBTZXR1cCBgaGVhZGVyc2AgZnJvbSBvcHRpb25zIHBhcmFtZXRlci5cbiAqIEBqYSDjgqrjg5fjgrfjg6fjg7PjgYvjgokgYGhlYWRlcnNgIOOCkuioreWumlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIZWFkZXJzKG9wdGlvbnM6IEFqYXhIZWFkZXJPcHRpb25zKTogSGVhZGVycyB7XG4gICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycyk7XG4gICAgY29uc3QgeyBtZXRob2QsIGNvbnRlbnRUeXBlLCBkYXRhVHlwZSwgbW9kZSwgYm9keSwgdXNlcm5hbWUsIHBhc3N3b3JkIH0gPSBvcHRpb25zO1xuXG4gICAgLy8gQ29udGVudC1UeXBlXG4gICAgaWYgKCdQT1NUJyA9PT0gbWV0aG9kIHx8ICdQVVQnID09PSBtZXRob2QgfHwgJ1BBVENIJyA9PT0gbWV0aG9kKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIGZldGNoKCkg44Gu5aC05ZCILCBGb3JtRGF0YSDjgpLoh6rli5Xop6Pph4jjgZnjgovjgZ/jgoEsIOaMh+WumuOBjOOBguOCi+WgtOWQiOOBr+WJiumZpFxuICAgICAgICAgKiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNTE5Mjg0MS9mZXRjaC1wb3N0LXdpdGgtbXVsdGlwYXJ0LWZvcm0tZGF0YVxuICAgICAgICAgKiBodHRwczovL211ZmZpbm1hbi5pby91cGxvYWRpbmctZmlsZXMtdXNpbmctZmV0Y2gtbXVsdGlwYXJ0LWZvcm0tZGF0YS9cbiAgICAgICAgICovXG4gICAgICAgIGlmIChoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgJiYgYm9keSBpbnN0YW5jZW9mIEZvcm1EYXRhKSB7XG4gICAgICAgICAgICBoZWFkZXJzLmRlbGV0ZSgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSkge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gY29udGVudFR5cGUgJiYgJ2pzb24nID09PSBkYXRhVHlwZSEpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLnNldCgnQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBjb250ZW50VHlwZSkge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDb250ZW50LVR5cGUnLCBjb250ZW50VHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBY2NlcHRcbiAgICBpZiAoIWhlYWRlcnMuZ2V0KCdBY2NlcHQnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQWNjZXB0JywgX2FjY2VwdEhlYWRlck1hcFtkYXRhVHlwZSFdIHx8ICcqLyonKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIFgtUmVxdWVzdGVkLVdpdGhcbiAgICAgKiDpnZ7mqJnmupbjg5jjg4Pjg4Djg7zjgafjgYLjgovjgZ/jgoEsIOaXouWumuOBp+OBryBjb3JzIOOBriBwcmVmbGlnaHQgcmVzcG9uc2Ug44Gn6Kix5Y+v44GV44KM44Gq44GEXG4gICAgICog44G+44GfIG1vZGUg44Gu5pei5a6a5YCk44GvIGNvcnMg44Gn44GC44KL44Gf44KBLCDmnInlirnjgavjgZnjgovjgavjga8gbW9kZSDjga7mmI7npLrnmoTmjIflrprjgYzlv4XopoHjgajjgarjgotcbiAgICAgKi9cbiAgICBpZiAobW9kZSAmJiAnY29ycycgIT09IG1vZGUgJiYgIWhlYWRlcnMuZ2V0KCdYLVJlcXVlc3RlZC1XaXRoJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ1gtUmVxdWVzdGVkLVdpdGgnLCAnWE1MSHR0cFJlcXVlc3QnKTtcbiAgICB9XG5cbiAgICAvLyBCYXNpYyBBdXRob3JpemF0aW9uXG4gICAgaWYgKG51bGwgIT0gdXNlcm5hbWUgJiYgIWhlYWRlcnMuZ2V0KCdBdXRob3JpemF0aW9uJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmFzaWMgJHtCYXNlNjQuZW5jb2RlKGAke3VzZXJuYW1lfToke3Bhc3N3b3JkID8/ICcnfWApfWApO1xuICAgIH1cblxuICAgIHJldHVybiBoZWFkZXJzO1xufVxuXG4vKipcbiAqIEBlbiBQZXJmb3JtIGFuIGFzeW5jaHJvbm91cyBIVFRQIChBamF4KSByZXF1ZXN0LlxuICogQGphIEhUVFAgKEFqYXgp44Oq44Kv44Ko44K544OI44Gu6YCB5L+hXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgQWpheCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFqYXg8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAncmVzcG9uc2UnPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhPcHRpb25zPFQ+KTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IGNvbnRyb2xsZXIuYWJvcnQoKTtcblxuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdyZXNwb25zZScsXG4gICAgICAgIHRpbWVvdXQ6IHNldHRpbmdzLnRpbWVvdXQsXG4gICAgfSwgb3B0aW9ucywge1xuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLCAvLyBmb3JjZSBvdmVycmlkZVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIHRpbWVvdXQgfSA9IG9wdHM7XG5cbiAgICAvLyBjYW5jZWxsYXRpb25cbiAgICBpZiAob3JpZ2luYWxUb2tlbikge1xuICAgICAgICBpZiAob3JpZ2luYWxUb2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgICAgICB9XG4gICAgICAgIG9yaWdpbmFsVG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuISk7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gc291cmNlO1xuICAgIHRva2VuLnJlZ2lzdGVyKGFib3J0KTtcblxuICAgIC8vIHRpbWVvdXRcbiAgICBpZiAodGltZW91dCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHNvdXJjZS5jYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1RJTUVPVVQsICdyZXF1ZXN0IHRpbWVvdXQnKSksIHRpbWVvdXQpO1xuICAgIH1cblxuICAgIC8vIG5vcm1hbGl6ZVxuICAgIG9wdHMubWV0aG9kID0gb3B0cy5tZXRob2QudG9VcHBlckNhc2UoKTtcblxuICAgIC8vIGhlYWRlclxuICAgIG9wdHMuaGVhZGVycyA9IHNldHVwSGVhZGVycyhvcHRzKTtcblxuICAgIC8vIHBhcnNlIHBhcmFtXG4gICAgY29uc3QgeyBtZXRob2QsIGRhdGEsIGRhdGFUeXBlIH0gPSBvcHRzO1xuICAgIGlmIChudWxsICE9IGRhdGEpIHtcbiAgICAgICAgaWYgKCgnR0VUJyA9PT0gbWV0aG9kIHx8ICdIRUFEJyA9PT0gbWV0aG9kKSAmJiAhdXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdHMuYm9keSA/Pz0gbmV3IFVSTFNlYXJjaFBhcmFtcyh0b0FqYXhQYXJhbXMoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGZldGNoKHVybCwgb3B0cyksIHRva2VuKTtcbiAgICBpZiAoJ3Jlc3BvbnNlJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIEFqYXhSZXN1bHQ8VD47XG4gICAgfSBlbHNlIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFLCByZXNwb25zZS5zdGF0dXNUZXh0LCByZXNwb25zZSk7XG4gICAgfSBlbHNlIGlmICgnc3RyZWFtJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRvQWpheERhdGFTdHJlYW0oXG4gICAgICAgICAgICByZXNwb25zZS5ib2R5ISxcbiAgICAgICAgICAgIE51bWJlcihyZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC1sZW5ndGgnKSksXG4gICAgICAgICkgYXMgQWpheFJlc3VsdDxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXNwb25zZVtkYXRhVHlwZSBhcyBFeGNsdWRlPEFqYXhEYXRhVHlwZXMsICdyZXNwb25zZScgfCAnc3RyZWFtJz5dKCksIHRva2VuKTtcbiAgICB9XG59XG5cbmFqYXguc2V0dGluZ3MgPSBzZXR0aW5ncztcblxuZXhwb3J0IHsgYWpheCB9O1xuIiwiaW1wb3J0IHR5cGUgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB0eXBlIHtcbiAgICBBamF4RGF0YVR5cGVzLFxuICAgIEFqYXhPcHRpb25zLFxuICAgIEFqYXhSZXF1ZXN0T3B0aW9ucyxcbiAgICBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgYWpheCwgc2V0dXBIZWFkZXJzIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7IHRvUXVlcnlTdHJpbmdzIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgWE1MSHR0cFJlcXVlc3QgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVuc3VyZURhdGFUeXBlID0gKGRhdGFUeXBlPzogQWpheERhdGFUeXBlcyk6IEFqYXhEYXRhVHlwZXMgPT4ge1xuICAgIHJldHVybiBkYXRhVHlwZSA/PyAnanNvbic7XG59O1xuXG4vKipcbiAqIEBlbiBgR0VUYCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBi+OCiei/lOOBleOCjOOCi+acn+W+heOBmeOCi+ODh+ODvOOCv+OBruWei+OCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmNvbnN0IGdldCA9IDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YT86IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4gPT4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdHRVQnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufTtcblxuLyoqXG4gKiBAZW4gYEdFVGAgdGV4dCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIOODhuOCreOCueODiOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5jb25zdCB0ZXh0ID0gKHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J3RleHQnPj4gPT4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICd0ZXh0Jywgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEBlbiBgR0VUYCBKU09OIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAgSlNPTiDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuY29uc3QganNvbiA9IDxUIGV4dGVuZHMgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiA9PiB7XG4gICAgcmV0dXJuIGdldDxUPih1cmwsIHVuZGVmaW5lZCwgKCdqc29uJyBhcyBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicpLCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQGVuIGBHRVRgIEJsb2IgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCBCbG9iIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5jb25zdCBibG9iID0gKHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J2Jsb2InPj4gPT4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICdibG9iJywgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEBlbiBgUE9TVGAgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgUE9TVGAg44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBUaGUgdHlwZSBvZiBkYXRhIHRoYXQgeW91J3JlIGV4cGVjdGluZyBiYWNrIGZyb20gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmNvbnN0IHBvc3QgPSA8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGE6IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4gPT4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdQT1NUJywgZGF0YSwgZGF0YVR5cGU6IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKSB9IGFzIEFqYXhPcHRpb25zPFQ+KTtcbn07XG5cbi8qKlxuICogQGVuIFN5bmNocm9ub3VzIGBHRVRgIHJlcXVlc3QgZm9yIHJlc291cmNlIGFjY2Vzcy4gPGJyPlxuICogICAgIE1hbnkgYnJvd3NlcnMgaGF2ZSBkZXByZWNhdGVkIHN5bmNocm9ub3VzIFhIUiBzdXBwb3J0IG9uIHRoZSBtYWluIHRocmVhZCBlbnRpcmVseS5cbiAqIEBqYSDjg6rjgr3jg7zjgrnlj5blvpfjga7jgZ/jgoHjga4g5ZCM5pyfIGBHRVRgIOODquOCr+OCqOOCueODiC4gPGJyPlxuICogICAgIOWkmuOBj+OBruODluODqeOCpuOCtuOBp+OBr+ODoeOCpOODs+OCueODrOODg+ODieOBq+OBiuOBkeOCi+WQjOacn+eahOOBqiBYSFIg44Gu5a++5b+c44KS5YWo6Z2i55qE44Gr6Z2e5o6o5aWo44Go44GX44Gm44GE44KL44Gu44Gn56mN5qW15L2/55So44Gv6YG/44GR44KL44GT44GoLlxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBUaGUgdHlwZSBvZiBkYXRhIHRoYXQgeW91J3JlIGV4cGVjdGluZyBiYWNrIGZyb20gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqL1xuY29uc3QgcmVzb3VyY2UgPSA8VCBleHRlbmRzICd0ZXh0JyB8ICdqc29uJyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nID8gVCA6ICdqc29uJyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4pOiBBamF4UmVzdWx0PFQ+ID0+IHtcbiAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChudWxsICE9IGRhdGEgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICB9XG5cbiAgICAvLyBzeW5jaHJvbm91c1xuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcblxuICAgIGNvbnN0IHR5cGUgPSBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSk7XG4gICAgY29uc3QgaGVhZGVycyA9IHNldHVwSGVhZGVycyh7IG1ldGhvZDogJ0dFVCcsIGRhdGFUeXBlOiB0eXBlIH0pO1xuICAgIGhlYWRlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHhoci5zZW5kKG51bGwpO1xuICAgIGlmICghKDIwMCA8PSB4aHIuc3RhdHVzICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgeGhyLnN0YXR1c1RleHQsIHhocik7XG4gICAgfVxuXG4gICAgcmV0dXJuICdqc29uJyA9PT0gdHlwZSA/IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKSA6IHhoci5yZXNwb25zZTtcbn07XG5cbmV4cG9ydCBjb25zdCByZXF1ZXN0ID0ge1xuICAgIGdldCxcbiAgICB0ZXh0LFxuICAgIGpzb24sXG4gICAgYmxvYixcbiAgICBwb3N0LFxuICAgIHJlc291cmNlLFxufTtcbiIsImltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBjbGFzc05hbWUsXG4gICAgc2FmZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqXG4gKiBAZW4ge0BsaW5rIElubGluZVdvcmtlcn0gc291cmNlIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgSW5saW5lV29ya2VyfSDjgavmjIflrprlj6/og73jgarjgr3jg7zjgrnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgSW5saWVuV29ya2VyU291cmNlID0gKChzZWxmOiBXb3JrZXIpID0+IHVua25vd24pIHwgc3RyaW5nO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IFVSTCAgICA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBXb3JrZXIgPSBzYWZlKGdsb2JhbFRoaXMuV29ya2VyKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgQmxvYiAgID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYzogSW5saWVuV29ya2VyU291cmNlKTogc3RyaW5nIHtcbiAgICBpZiAoIShpc0Z1bmN0aW9uKHNyYykgfHwgaXNTdHJpbmcoc3JjKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoc3JjKX0gaXMgbm90IGEgZnVuY3Rpb24gb3Igc3RyaW5nLmApO1xuICAgIH1cbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbaXNGdW5jdGlvbihzcmMpID8gYCgke3NyYy50b1N0cmluZygpfSkoc2VsZik7YCA6IHNyY10sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnIH0pKTtcbn1cblxuLyoqXG4gKiBAZW4gU3BlY2lmaWVkIGBXb3JrZXJgIGNsYXNzIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBhIHNjcmlwdCBmaWxlLlxuICogQGphIOOCueOCr+ODquODl+ODiOODleOCoeOCpOODq+OCkuW/heimgeOBqOOBl+OBquOBhCBgV29ya2VyYCDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIElubGluZVdvcmtlciBleHRlbmRzIFdvcmtlciB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX2NvbnRleHQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjXG4gICAgICogIC0gYGVuYCBzb3VyY2UgZnVuY3Rpb24gb3Igc2NyaXB0IGJvZHkuXG4gICAgICogIC0gYGphYCDlrp/ooYzplqLmlbDjgb7jgZ/jga/jgrnjgq/jg6rjg5fjg4jlrp/kvZNcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgd29ya2VyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBXb3JrZXIg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBJbmxpZW5Xb3JrZXJTb3VyY2UsIG9wdGlvbnM/OiBXb3JrZXJPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYyk7XG4gICAgICAgIHN1cGVyKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogV29ya2VyXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIEJMT0IgcmVsZWFzZS4gV2hlbiBjYWxsaW5nIGBjbG9zZSAoKWAgaW4gdGhlIFdvcmtlciwgY2FsbCB0aGlzIG1ldGhvZCBhcyB3ZWxsLlxuICAgICAqIEBqYSBCTE9CIOino+aUvueUqC4gV29ya2VyIOWGheOBpyBgY2xvc2UoKWAg44KS5ZG844G25aC05ZCILCDmnKzjg6Hjgr3jg4Pjg4njgoLjgrPjg7zjg6vjgZnjgovjgZPjgaguXG4gICAgICovXG4gICAgdGVybWluYXRlKCk6IHZvaWQge1xuICAgICAgICBzdXBlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLl9jb250ZXh0KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIENhbmNlbGFibGUsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IElubGluZVdvcmtlciB9IGZyb20gJy4vaW5pbmUtd29ya2VyJztcblxuLyoqXG4gKiBAZW4gVGhyZWFkIG9wdGlvbnNcbiAqIEBlbiDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUaHJlYWRPcHRpb25zPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+IGV4dGVuZHMgQ2FuY2VsYWJsZSwgV29ya2VyT3B0aW9ucyB7XG4gICAgYXJncz86IFBhcmFtZXRlcnM8VD47XG59XG5cbi8qKlxuICogQGVuIEVuc3VyZSBleGVjdXRpb24gaW4gd29ya2VyIHRocmVhZC5cbiAqIEBqYSDjg6/jg7zjgqvjg7zjgrnjg6zjg4Pjg4nlhoXjgaflrp/ooYzjgpLkv53oqLxcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGV4ZWMgPSAoYXJnMTogbnVtYmVyLCBhcmcyOiBzdHJpbmcpID0+IHtcbiAqICAgIC8vIHRoaXMgc2NvcGUgaXMgd29ya2VyIHNjb3BlLiB5b3UgY2Fubm90IHVzZSBjbG9zdXJlIGFjY2Vzcy5cbiAqICAgIGNvbnN0IHBhcmFtID0gey4uLn07XG4gKiAgICBjb25zdCBtZXRob2QgPSAocCkgPT4gey4uLn07XG4gKiAgICAvLyB5b3UgY2FuIGFjY2VzcyBhcmd1bWVudHMgZnJvbSBvcHRpb25zLlxuICogICAgY29uc29sZS5sb2coYXJnMSk7IC8vICcxJ1xuICogICAgY29uc29sZS5sb2coYXJnMik7IC8vICd0ZXN0J1xuICogICAgOlxuICogICAgcmV0dXJuIG1ldGhvZChwYXJhbSk7XG4gKiB9O1xuICpcbiAqIGNvbnN0IGFyZzEgPSAxO1xuICogY29uc3QgYXJnMiA9ICd0ZXN0JztcbiAqIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRocmVhZChleGVjLCB7IGFyZ3M6IFthcmcxLCBhcmcyXSB9KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBpbXBsZW1lbnQgYXMgZnVuY3Rpb24gc2NvcGUuXG4gKiAgLSBgamFgIOmWouaVsOOCueOCs+ODvOODl+OBqOOBl+OBpuWun+ijhVxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdGhyZWFkIG9wdGlvbnNcbiAqICAtIGBqYWAg44K544Os44OD44OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aHJlYWQ8VCwgVT4oZXhlY3V0b3I6ICguLi5hcmdzOiBVW10pID0+IFQgfCBQcm9taXNlPFQ+LCBvcHRpb25zPzogVGhyZWFkT3B0aW9uczx0eXBlb2YgZXhlY3V0b3I+KTogUHJvbWlzZTxUPiB7XG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIGFyZ3MgfSA9IE9iamVjdC5hc3NpZ24oeyBhcmdzOiBbXSB9LCBvcHRpb25zKTtcblxuICAgIC8vIGFscmVhZHkgY2FuY2VsXG4gICAgaWYgKG9yaWdpbmFsVG9rZW4/LnJlcXVlc3RlZCkge1xuICAgICAgICB0aHJvdyBvcmlnaW5hbFRva2VuLnJlYXNvbjtcbiAgICB9XG5cbiAgICBjb25zdCBleGVjID0gYChzZWxmID0+IHtcbiAgICAgICAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgYXN5bmMgKHsgZGF0YSB9KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICgke2V4ZWN1dG9yLnRvU3RyaW5nKCl9KSguLi5kYXRhKTtcbiAgICAgICAgICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKHJlc3VsdCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZTsgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pKHNlbGYpO2A7XG5cbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgSW5saW5lV29ya2VyKGV4ZWMsIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgYWJvcnQgPSAoKTogdm9pZCA9PiB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgb3JpZ2luYWxUb2tlbj8ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIGNvbnN0IHsgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuISk7XG5cbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB3b3JrZXIub25lcnJvciA9IGV2ID0+IHtcbiAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZWplY3QoZXYpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgICAgICB3b3JrZXIub25tZXNzYWdlID0gZXYgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShldi5kYXRhKTtcbiAgICAgICAgICAgIHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgfTtcbiAgICB9LCB0b2tlbik7XG5cbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoYXJncyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZSBhcyBQcm9taXNlPFQ+O1xufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJCbG9iIiwiVVJMIiwidmVyaWZ5IiwiQ2FuY2VsVG9rZW4iLCJjYyIsImZyb21UeXBlZERhdGEiLCJyZXN0b3JlTnVsbGlzaCIsInRvVHlwZWREYXRhIiwiaXNGdW5jdGlvbiIsImFzc2lnblZhbHVlIiwiaXNOdW1lcmljIiwiRXZlbnRTb3VyY2UiLCJpc051bWJlciIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsImlzU3RyaW5nIiwiY2xhc3NOYW1lIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztJQUVBLGlCQUF3QixNQUFNLElBQUksR0FBU0EsWUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFDaEUsaUJBQXdCLE1BQU0sSUFBSSxHQUFTQSxZQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztJQUNoRSxpQkFBd0IsTUFBTUMsTUFBSSxHQUFTRCxZQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztJQUNoRSxpQkFBd0IsTUFBTSxVQUFVLEdBQUdBLFlBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO0lBQ3RFLGlCQUF3QixNQUFNRSxLQUFHLEdBQVVGLFlBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDOztJQ0ovRDs7O0lBR0c7SUFDVSxNQUFBLE1BQU0sQ0FBQTtJQUNmOzs7SUFHRztRQUNJLE9BQU8sTUFBTSxDQUFDLEdBQVcsRUFBQTtZQUM1QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFD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QXVCLEVBQUE7SUFDeEQsUUFBQSxNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUM7SUFDeEMsUUFBQSxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztJQUN2QixRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTzs7OztJQU0zQjs7O0lBR0c7SUFDSCxJQUFBLFNBQVMsR0FBQTtZQUNMLEtBQUssQ0FBQyxTQUFTLEVBQUU7SUFDakIsUUFBQSxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7O0lBRXpDOztJQ2hERDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUE2Qkc7SUFDYSxTQUFBLE1BQU0sQ0FBTyxRQUEwQyxFQUFFLE9BQXdDLEVBQUE7SUFDN0csSUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQzs7SUFHNUUsSUFBQSxJQUFJLGFBQWEsRUFBRSxTQUFTLEVBQUU7WUFDMUIsTUFBTSxhQUFhLENBQUMsTUFBTTs7SUFHOUIsSUFBQSxNQUFNLElBQUksR0FBRyxDQUFBOzs7d0NBR3VCLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTs7Ozs7O0FBTTdDLGFBQUEsQ0FBQTtRQUVWLE1BQU0sTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUM7SUFFOUMsSUFBQSxNQUFNLEtBQUssR0FBRyxNQUFZLE1BQU0sQ0FBQyxTQUFTLEVBQUU7SUFDNUMsSUFBQSxhQUFhLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQztRQUM5QixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUdMLG1CQUFXLENBQUMsTUFBTSxDQUFDLGFBQWMsQ0FBQztRQUVwRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUk7SUFDNUMsUUFBQSxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsSUFBRztnQkFDbEIsRUFBRSxDQUFDLGNBQWMsRUFBRTtnQkFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDVixNQUFNLENBQUMsU0FBUyxFQUFFO0lBQ3RCLFNBQUM7SUFDRCxRQUFBLE1BQU0sQ0FBQyxTQUFTLEdBQUcsRUFBRSxJQUFHO0lBQ3BCLFlBQUEsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxTQUFTLEVBQUU7SUFDdEIsU0FBQztJQUNKLEtBQUEsRUFBRSxLQUFLLENBQUM7SUFFVCxJQUFBLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO0lBRXhCLElBQUEsT0FBTyxPQUFxQjtJQUNoQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9saWItd29ya2VyLyJ9