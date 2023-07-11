/*!
 * @cdp/lib-worker 0.9.17
 *   worker library collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/lib-core')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/lib-core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, libCore) { 'use strict';

    /*!
     * @cdp/binary 0.9.17
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
     * @cdp/ajax 0.9.17
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
        // X-Requested-With
        if ('cors' !== mode && !headers.get('X-Requested-With')) {
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
            throw libCore.makeResult(libCore.RESULT_CODE.ERROR_AJAX_RESPONSE, response.statusText, response);
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
        return dataType ?? 'json';
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
            throw libCore.makeResult(libCore.RESULT_CODE.ERROR_AJAX_RESPONSE, xhr.statusText, xhr);
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
     * @cdp/inline-worker 0.9.17
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLXdvcmtlci5qcyIsInNvdXJjZXMiOlsiYmluYXJ5L3Nzci50cyIsImJpbmFyeS9iYXNlNjQudHMiLCJiaW5hcnkvYmxvYi1yZWFkZXIudHMiLCJiaW5hcnkvY29udmVydGVyLnRzIiwiYmluYXJ5L2Jsb2ItdXJsLnRzIiwiYWpheC9yZXN1bHQtY29kZS1kZWZzLnRzIiwiYWpheC9zc3IudHMiLCJhamF4L3BhcmFtcy50cyIsImFqYXgvc3RyZWFtLnRzIiwiYWpheC9zZXR0aW5ncy50cyIsImFqYXgvY29yZS50cyIsImFqYXgvcmVxdWVzdC50cyIsImlubGluZS13b3JrZXIvaW5pbmUtd29ya2VyLnRzIiwiaW5saW5lLXdvcmtlci90aHJlYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGJ0b2EgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuYnRvYSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBhdG9iICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmF0b2IpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgQmxvYiAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5CbG9iKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEZpbGVSZWFkZXIgPSBzYWZlKGdsb2JhbFRoaXMuRmlsZVJlYWRlcik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBVUkwgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLlVSTCk7XG4iLCJpbXBvcnQgeyBhdG9iLCBidG9hIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBgYmFzZTY0YCB1dGlsaXR5IGZvciBpbmRlcGVuZGVudCBjaGFyYWN0b3IgY29kZS5cbiAqIEBqYSDmloflrZfjgrPjg7zjg4njgavkvp3lrZjjgZfjgarjgYQgYGJhc2U2NGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCYXNlNjQge1xuICAgIC8qKlxuICAgICAqIEBlbiBFbmNvZGUgYSBiYXNlLTY0IGVuY29kZWQgc3RyaW5nIGZyb20gYSBiaW5hcnkgc3RyaW5nLlxuICAgICAqIEBqYSDmloflrZfliJfjgpIgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZW5jb2RlKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHNyYykpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjb2RlcyBhIHN0cmluZyBvZiBkYXRhIHdoaWNoIGhhcyBiZWVuIGVuY29kZWQgdXNpbmcgYmFzZS02NCBlbmNvZGluZy5cbiAgICAgKiBAamEgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODieOBleOCjOOBn+ODh+ODvOOCv+OBruaWh+Wtl+WIl+OCkuODh+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZGVjb2RlKGVuY29kZWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGF0b2IoZW5jb2RlZCkpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVbmtub3duRnVuY3Rpb24sIHZlcmlmeSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDYW5jZWxUb2tlbiwgQ2FuY2VsYWJsZSB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBGaWxlUmVhZGVyIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRmlsZVJlYWRlckFyZ3NNYXAge1xuICAgIHJlYWRBc0FycmF5QnVmZmVyOiBbQmxvYl07XG4gICAgcmVhZEFzRGF0YVVSTDogW0Jsb2JdO1xuICAgIHJlYWRBc1RleHQ6IFtCbG9iLCBzdHJpbmcgfCB1bmRlZmluZWRdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRmlsZVJlYWRlclJlc3VsdE1hcCB7XG4gICAgcmVhZEFzQXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyO1xuICAgIHJlYWRBc0RhdGFVUkw6IHN0cmluZztcbiAgICByZWFkQXNUZXh0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGVuIGBCbG9iYCByZWFkIG9wdGlvbnNcbiAqIEBqYSBgQmxvYmAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQmxvYlJlYWRPcHRpb25zIGV4dGVuZHMgQ2FuY2VsYWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb2dyZXNzIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBqYSDpgLLmjZfjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9ncmVzc1xuICAgICAqICAtIGBlbmAgd29ya2VyIHByb2dyZXNzIGV2ZW50XG4gICAgICogIC0gYGphYCB3b3JrZXIg6YCy5o2X44Kk44OZ44Oz44OIXG4gICAgICovXG4gICAgb25wcm9ncmVzcz86IChwcm9ncmVzczogUHJvZ3Jlc3NFdmVudCkgPT4gdW5rbm93bjtcbn1cblxuLyoqIEBpbnRlcm5hbCBleGVjdXRlIHJlYWQgYmxvYiAqL1xuZnVuY3Rpb24gZXhlYzxUIGV4dGVuZHMga2V5b2YgRmlsZVJlYWRlclJlc3VsdE1hcD4oXG4gICAgbWV0aG9kTmFtZTogVCxcbiAgICBhcmdzOiBGaWxlUmVhZGVyQXJnc01hcFtUXSxcbiAgICBvcHRpb25zOiBCbG9iUmVhZE9wdGlvbnMsXG4pOiBQcm9taXNlPEZpbGVSZWFkZXJSZXN1bHRNYXBbVF0+IHtcbiAgICB0eXBlIFRSZXN1bHQgPSBGaWxlUmVhZGVyUmVzdWx0TWFwW1RdO1xuICAgIGNvbnN0IHsgY2FuY2VsOiB0b2tlbiwgb25wcm9ncmVzcyB9ID0gb3B0aW9ucztcbiAgICB0b2tlbiAmJiB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdG9rZW4pO1xuICAgIG9ucHJvZ3Jlc3MgJiYgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBvbnByb2dyZXNzKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8VFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0b2tlbj8ucmVnaXN0ZXIoKCkgPT4ge1xuICAgICAgICAgICAgcmVhZGVyLmFib3J0KCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZWFkZXIub25hYm9ydCA9IHJlYWRlci5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbnByb2dyZXNzID0gb25wcm9ncmVzcyE7XG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQgYXMgVFJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSAoKSA9PiB7XG4gICAgICAgICAgICBzdWJzY3JpcHRpb24gJiYgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH07XG4gICAgICAgIChyZWFkZXJbbWV0aG9kTmFtZV0gYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmdzKTtcbiAgICB9LCB0b2tlbik7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgYEFycmF5QnVmZmVyYCByZXN1bHQgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0FycmF5QnVmZmVyKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0FycmF5QnVmZmVyJywgW2Jsb2JdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGF0YS1VUkwgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgokgYGRhdGEtdXJsIOaWh+Wtl+WIl+OCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0RhdGFVUkwoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0RhdGFVUkwnLCBbYmxvYl0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnQgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgonjg4bjgq3jgrnjg4jmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBlbmNvZGluZ1xuICogIC0gYGVuYCBlbmNvZGluZyBzdHJpbmcgdG8gdXNlIGZvciB0aGUgcmV0dXJuZWQgZGF0YS4gZGVmYXVsdDogYHV0Zi04YFxuICogIC0gYGphYCDjgqjjg7PjgrPjg7zjg4fjgqPjg7PjgrDjgpLmjIflrprjgZnjgovmloflrZfliJcg5pei5a6aOiBgdXRmLThgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzVGV4dChibG9iOiBCbG9iLCBlbmNvZGluZz86IHN0cmluZyB8IG51bGwsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNUZXh0JywgW2Jsb2IsIGVuY29kaW5nID8/IHVuZGVmaW5lZF0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBUeXBlcyxcbiAgICBUeXBlVG9LZXksXG4gICAgdG9UeXBlZERhdGEsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICByZXN0b3JlTnVsbGlzaCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgQmFzZTY0IH0gZnJvbSAnLi9iYXNlNjQnO1xuaW1wb3J0IHtcbiAgICBCbG9iUmVhZE9wdGlvbnMsXG4gICAgcmVhZEFzQXJyYXlCdWZmZXIsXG4gICAgcmVhZEFzRGF0YVVSTCxcbiAgICByZWFkQXNUZXh0LFxufSBmcm9tICcuL2Jsb2ItcmVhZGVyJztcbmltcG9ydCB7IEJsb2IgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gTWltZVR5cGUge1xuICAgIEJJTkFSWSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nLFxuICAgIFRFWFQgPSAndGV4dC9wbGFpbicsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGRhdGEtVVJMIOWxnuaApyAqL1xuaW50ZXJmYWNlIERhdGFVUkxDb250ZXh0IHtcbiAgICBtaW1lVHlwZTogc3RyaW5nO1xuICAgIGJhc2U2NDogYm9vbGVhbjtcbiAgICBkYXRhOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBkYXRhIFVSSSDlvaLlvI/jga7mraPopo/ooajnj75cbiAqIOWPguiAgzogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9kYXRhX1VSSXNcbiAqL1xuZnVuY3Rpb24gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMOiBzdHJpbmcpOiBEYXRhVVJMQ29udGV4dCB7XG4gICAgY29uc3QgY29udGV4dCA9IHsgYmFzZTY0OiBmYWxzZSB9IGFzIERhdGFVUkxDb250ZXh0O1xuXG4gICAgLyoqXG4gICAgICogW21hdGNoXSAxOiBtaW1lLXR5cGVcbiAgICAgKiAgICAgICAgIDI6IFwiO2Jhc2U2NFwiIOOCkuWQq+OCgOOCquODl+OCt+ODp+ODs1xuICAgICAqICAgICAgICAgMzogZGF0YSDmnKzkvZNcbiAgICAgKi9cbiAgICBjb25zdCByZXN1bHQgPSAvXmRhdGE6KC4rP1xcLy4rPyk/KDsuKz8pPywoLiopJC8uZXhlYyhkYXRhVVJMKTtcbiAgICBpZiAobnVsbCA9PSByZXN1bHQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGRhdGEtVVJMOiAke2RhdGFVUkx9YCk7XG4gICAgfVxuXG4gICAgY29udGV4dC5taW1lVHlwZSA9IHJlc3VsdFsxXTtcbiAgICBjb250ZXh0LmJhc2U2NCA9IC87YmFzZTY0Ly50ZXN0KHJlc3VsdFsyXSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1pbmNsdWRlc1xuICAgIGNvbnRleHQuZGF0YSA9IHJlc3VsdFszXTtcblxuICAgIHJldHVybiBjb250ZXh0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGJpbmFyeVN0cmluZ1RvQmluYXJ5KGJ5dGVzOiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICBjb25zdCBhcnJheSA9IGJ5dGVzLnNwbGl0KCcnKS5tYXAoYyA9PiBjLmNoYXJDb2RlQXQoMCkpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShhcnJheSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyICovXG5mdW5jdGlvbiBiaW5hcnlUb0JpbmFyeVN0cmluZyhiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwoYmluYXJ5LCAoaTogbnVtYmVyKSA9PiBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpKS5qb2luKCcnKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgdG8gYmluYXJ5LXN0cmluZy4gKG5vdCBodW1hbiByZWFkYWJsZSBzdHJpbmcpXG4gKiBAamEg44OQ44Kk44OK44Oq5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQmluYXJ5U3RyaW5nKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudCh0ZXh0KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIGZyb20gYmluYXJ5LXN0cmluZy5cbiAqIEBqYSDjg5DjgqTjg4rjg6rmloflrZfliJfjgYvjgonlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnl0ZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21CaW5hcnlTdHJpbmcoYnl0ZXM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYnl0ZXMpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBiaW5hcnkgdG8gaGV4LXN0cmluZy5cbiAqIEBqYSDjg5DjgqTjg4rjg6rjgpIgSEVYIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBoZXhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21IZXhTdHJpbmcoaGV4OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICBjb25zdCB4ID0gaGV4Lm1hdGNoKC8uezEsMn0vZyk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG51bGwgIT0geCA/IHgubWFwKGJ5dGUgPT4gcGFyc2VJbnQoYnl0ZSwgMTYpKSA6IFtdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgZnJvbSBoZXgtc3RyaW5nLlxuICogQGphIEhFWCDmloflrZfliJfjgYvjgonjg5DjgqTjg4rjg6rjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0hleFN0cmluZyhiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnkucmVkdWNlKChzdHIsIGJ5dGUpID0+IHN0ciArIGJ5dGUudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkucGFkU3RhcnQoMiwgJzAnKSwgJycpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9CdWZmZXIoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgICByZXR1cm4gcmVhZEFzQXJyYXlCdWZmZXIoYmxvYiwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGBVaW50OEFycmF5YCDjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJsb2JUb0JpbmFyeShibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGF3YWl0IHJlYWRBc0FycmF5QnVmZmVyKGJsb2IsIG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9EYXRhVVJMKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiByZWFkQXNEYXRhVVJMKGJsb2IsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJ44OG44Kt44K544OI44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9UZXh0KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMgJiB7IGVuY29kaW5nPzogc3RyaW5nIHwgbnVsbDsgfSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgPz8ge307XG4gICAgY29uc3QgeyBlbmNvZGluZyB9ID0gb3B0cztcbiAgICByZXR1cm4gcmVhZEFzVGV4dChibG9iLCBlbmNvZGluZywgb3B0cyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBibG9iVG9CYXNlNjQoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHF1ZXJ5RGF0YVVSTENvbnRleHQoYXdhaXQgcmVhZEFzRGF0YVVSTChibG9iLCBvcHRpb25zKSkuZGF0YTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBgQmxvYmAuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CbG9iKGJ1ZmZlcjogQXJyYXlCdWZmZXIsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW2J1ZmZlcl0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBgVWludDhBcnJheWAuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CaW5hcnkoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9EYXRhVVJMKGJ1ZmZlcjogQXJyYXlCdWZmZXIsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb0RhdGFVUkwobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSwgbWltZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0Jhc2U2NChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9CYXNlNjQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCieODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9UZXh0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb1RleHQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBgQmxvYmAuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CbG9iKGJpbmFyeTogVWludDhBcnJheSwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbYmluYXJ5XSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CdWZmZXIoYmluYXJ5OiBVaW50OEFycmF5KTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiBiaW5hcnkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0RhdGFVUkwoYmluYXJ5OiBVaW50OEFycmF5LCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmluYXJ5VG9CYXNlNjQoYmluYXJ5KX1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQmFzZTY0KGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUoYmluYXJ5VG9UZXh0KGJpbmFyeSkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIOODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvVGV4dChiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBmcm9tQmluYXJ5U3RyaW5nKGJpbmFyeVRvQmluYXJ5U3RyaW5nKGJpbmFyeSkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0Jsb2IoYmFzZTY0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gYmluYXJ5VG9CbG9iKGJhc2U2NFRvQmluYXJ5KGJhc2U2NCksIG1pbWVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQnVmZmVyKGJhc2U2NDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiBiYXNlNjRUb0JpbmFyeShiYXNlNjQpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0JpbmFyeShiYXNlNjQ6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiaW5hcnlTdHJpbmdUb0JpbmFyeSh0b0JpbmFyeVN0cmluZyhCYXNlNjQuZGVjb2RlKGJhc2U2NCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvRGF0YVVSTChiYXNlNjQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2Jhc2U2NH1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgIEJhc2U2NCDmloflrZfliJfjgYvjgokg44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9UZXh0KGJhc2U2NDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmRlY29kZShiYXNlNjQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmxvYih0ZXh0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5URVhUKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFt0ZXh0XSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CdWZmZXIodGV4dDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiB0ZXh0VG9CaW5hcnkodGV4dCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CaW5hcnkodGV4dDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJpbmFyeVN0cmluZ1RvQmluYXJ5KHRvQmluYXJ5U3RyaW5nKHRleHQpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9EYXRhVVJMKHRleHQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLlRFWFQpOiBzdHJpbmcge1xuICAgIGNvbnN0IGJhc2U2NCA9IHRleHRUb0Jhc2U2NCh0ZXh0KTtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CYXNlNjQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmVuY29kZSh0ZXh0KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmxvYihkYXRhVVJMOiBzdHJpbmcpOiBCbG9iIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMKTtcbiAgICBpZiAoY29udGV4dC5iYXNlNjQpIHtcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQmxvYihjb250ZXh0LmRhdGEsIGNvbnRleHQubWltZVR5cGUgfHwgTWltZVR5cGUuQklOQVJZKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGV4dFRvQmxvYihkZWNvZGVVUklDb21wb25lbnQoY29udGV4dC5kYXRhKSwgY29udGV4dC5taW1lVHlwZSB8fCBNaW1lVHlwZS5URVhUKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CdWZmZXIoZGF0YVVSTDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiBkYXRhVVJMVG9CaW5hcnkoZGF0YVVSTCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0JpbmFyeShkYXRhVVJMOiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmFzZTY0VG9CaW5hcnkoZGF0YVVSTFRvQmFzZTY0KGRhdGFVUkwpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJ44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9UZXh0KGRhdGFVUkw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5kZWNvZGUoZGF0YVVSTFRvQmFzZTY0KGRhdGFVUkwpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmFzZTY0KGRhdGFVUkw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgY29udGV4dCA9IHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTCk7XG4gICAgaWYgKGNvbnRleHQuYmFzZTY0KSB7XG4gICAgICAgIHJldHVybiBjb250ZXh0LmRhdGE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUoZGVjb2RlVVJJQ29tcG9uZW50KGNvbnRleHQuZGF0YSkpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFNlcmlhbGl6YWJsZSBkYXRhIHR5cGUgbGlzdC5cbiAqIEBqYSDjgrfjg6rjgqLjg6njgqTjgrrlj6/og73jgarjg4fjg7zjgr/lnovkuIDopqdcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXJpYWxpemFibGUge1xuICAgIHN0cmluZzogc3RyaW5nO1xuICAgIG51bWJlcjogbnVtYmVyO1xuICAgIGJvb2xlYW46IGJvb2xlYW47XG4gICAgb2JqZWN0OiBvYmplY3Q7XG4gICAgYnVmZmVyOiBBcnJheUJ1ZmZlcjtcbiAgICBiaW5hcnk6IFVpbnQ4QXJyYXk7XG4gICAgYmxvYjogQmxvYjtcbn1cblxuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlRGF0YVR5cGVzID0gVHlwZXM8U2VyaWFsaXphYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUlucHV0RGF0YVR5cGVzID0gU2VyaWFsaXphYmxlRGF0YVR5cGVzIHwgbnVsbCB8IHVuZGVmaW5lZDtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUtleXMgPSBLZXlzPFNlcmlhbGl6YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVDYXN0YWJsZSA9IE9taXQ8U2VyaWFsaXphYmxlLCAnYnVmZmVyJyB8ICdiaW5hcnknIHwgJ2Jsb2InPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXMgPSBUeXBlczxTZXJpYWxpemFibGVDYXN0YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVSZXR1cm5UeXBlPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzPiA9IFR5cGVUb0tleTxTZXJpYWxpemFibGVDYXN0YWJsZSwgVD4gZXh0ZW5kcyBuZXZlciA/IG5ldmVyIDogVCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXphYmxlIG9wdGlvbnMgaW50ZXJmYWNlLlxuICogQGphIOODh+OCt+ODquOCouODqeOCpOOCuuOBq+S9v+eUqOOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIERlc2VyaWFsaXplT3B0aW9uczxUIGV4dGVuZHMgU2VyaWFsaXphYmxlID0gU2VyaWFsaXphYmxlLCBLIGV4dGVuZHMgS2V5czxUPiA9IEtleXM8VD4+IGV4dGVuZHMgQ2FuY2VsYWJsZSB7XG4gICAgLyoqIHtAbGluayBTZXJpYWxpemFibGVLZXlzfSAqL1xuICAgIGRhdGFUeXBlPzogSztcbn1cblxuLyoqXG4gKiBAZW4gU2VyaWFsaXplIGRhdGEuXG4gKiBAamEg44OH44O844K/44K344Oq44Ki44Op44Kk44K6XG4gKlxuICogQHBhcmFtIGRhdGEgaW5wdXRcbiAqIEBwYXJhbSBvcHRpb25zIGJsb2IgY29udmVydCBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUlucHV0RGF0YVR5cGVzPihkYXRhOiBULCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCB7IGNhbmNlbCB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgIGlmIChudWxsID09IGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gYnVmZmVyVG9EYXRhVVJMKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIGJpbmFyeVRvRGF0YVVSTChkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgIHJldHVybiBibG9iVG9EYXRhVVJMKGRhdGEsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKGRhdGEpITtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXplIGRhdGEuXG4gKiBAamEg44OH44O844K/44Gu5b6p5YWDXG4gKlxuICogQHBhcmFtIHZhbHVlIGlucHV0IHN0cmluZyBvciB1bmRlZmluZWQuXG4gKiBAcGFyYW0gb3B0aW9ucyBkZXNlcmlhbGl6ZSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcyA9IFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXM+KFxuICAgIHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBEZXNlcmlhbGl6ZU9wdGlvbnM8U2VyaWFsaXphYmxlLCBuZXZlcj5cbik6IFByb21pc2U8U2VyaWFsaXphYmxlUmV0dXJuVHlwZTxUPj47XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXplIGRhdGEuXG4gKiBAamEg44OH44O844K/44Gu5b6p5YWDXG4gKlxuICogQHBhcmFtIHZhbHVlIGlucHV0IHN0cmluZyBvciB1bmRlZmluZWQuXG4gKiBAcGFyYW0gb3B0aW9ucyBkZXNlcmlhbGl6ZSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlS2V5cz4odmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9uczogRGVzZXJpYWxpemVPcHRpb25zPFNlcmlhbGl6YWJsZSwgVD4pOiBQcm9taXNlPFNlcmlhbGl6YWJsZVtUXSB8IG51bGwgfCB1bmRlZmluZWQ+O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVzZXJpYWxpemUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IERlc2VyaWFsaXplT3B0aW9ucyk6IFByb21pc2U8U2VyaWFsaXphYmxlRGF0YVR5cGVzIHwgbnVsbCB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHsgZGF0YVR5cGUsIGNhbmNlbCB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICBhd2FpdCBjYyhjYW5jZWwpO1xuXG4gICAgY29uc3QgZGF0YSA9IHJlc3RvcmVOdWxsaXNoKHRvVHlwZWREYXRhKHZhbHVlKSk7XG4gICAgc3dpdGNoIChkYXRhVHlwZSkge1xuICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgcmV0dXJuIGZyb21UeXBlZERhdGEoZGF0YSk7XG4gICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICByZXR1cm4gTnVtYmVyKGRhdGEpO1xuICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgIHJldHVybiBCb29sZWFuKGRhdGEpO1xuICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdChkYXRhKTtcbiAgICAgICAgY2FzZSAnYnVmZmVyJzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CdWZmZXIoZnJvbVR5cGVkRGF0YShkYXRhKSEpO1xuICAgICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGFVUkxUb0JpbmFyeShmcm9tVHlwZWREYXRhKGRhdGEpISk7XG4gICAgICAgIGNhc2UgJ2Jsb2InOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGFVUkxUb0Jsb2IoZnJvbVR5cGVkRGF0YShkYXRhKSEpO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVVJMIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IF9ibG9iTWFwID0gbmV3IFdlYWtNYXA8QmxvYiwgc3RyaW5nPigpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfdXJsU2V0ICA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4vKipcbiAqIEBlbiBgQmxvYiBVUkxgIHV0aWxpdHkgZm9yIGF1dG9tYXRpYyBtZW1vcnkgbWFuZWdlbWVudC5cbiAqIEBqYSDjg6Hjg6Ljg6roh6rli5XnrqHnkIbjgpLooYzjgYYgYEJsb2IgVVJMYCDjg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAqL1xuZXhwb3J0IGNsYXNzIEJsb2JVUkwge1xuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlcy5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44Gu5qeL56+JXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGUoLi4uYmxvYnM6IEJsb2JbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGIgb2YgYmxvYnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gX2Jsb2JNYXAuZ2V0KGIpO1xuICAgICAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGIpO1xuICAgICAgICAgICAgX2Jsb2JNYXAuc2V0KGIsIHVybCk7XG4gICAgICAgICAgICBfdXJsU2V0LmFkZCh1cmwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGFsbCBgQmxvYiBVUkxgIGNhY2hlLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga4gYEJsb2IgVVJMYCDjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4RcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNsZWFyKCk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiBfdXJsU2V0KSB7XG4gICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgIH1cbiAgICAgICAgX3VybFNldC5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjga7lj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGdldChibG9iOiBCbG9iKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgY2FjaGUgPSBfYmxvYk1hcC5nZXQoYmxvYik7XG4gICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhY2hlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgIF9ibG9iTWFwLnNldChibG9iLCB1cmwpO1xuICAgICAgICBfdXJsU2V0LmFkZCh1cmwpO1xuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBgQmxvYiBVUkxgIGlzIGF2YWlsYWJsZSBmcm9tIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjgYzmnInlirnljJbliKTlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGhhcyhibG9iOiBCbG9iKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBfYmxvYk1hcC5oYXMoYmxvYik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldm9rZSBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjgpLnhKHlirnljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHJldm9rZSguLi5ibG9iczogQmxvYltdKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgYiBvZiBibG9icykge1xuICAgICAgICAgICAgY29uc3QgdXJsID0gX2Jsb2JNYXAuZ2V0KGIpO1xuICAgICAgICAgICAgaWYgKHVybCkge1xuICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgICAgICAgICBfYmxvYk1hcC5kZWxldGUoYik7XG4gICAgICAgICAgICAgICAgX3VybFNldC5kZWxldGUodXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgQUpBWCA9IENEUF9LTk9XTl9NT0RVTEUuQUpBWCAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBBSkFYX0RFQ0xBUkUgICAgICAgID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9BSkFYX1JFU1BPTlNFID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDEsICduZXR3b3JrIGVycm9yLicpLFxuICAgICAgICBFUlJPUl9BSkFYX1RJTUVPVVQgID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuQUpBWCArIDIsICdyZXF1ZXN0IHRpbWVvdXQuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEZvcm1EYXRhICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5Gb3JtRGF0YSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBIZWFkZXJzICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuSGVhZGVycyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBBYm9ydENvbnRyb2xsZXIgPSBzYWZlKGdsb2JhbFRoaXMuQWJvcnRDb250cm9sbGVyKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTFNlYXJjaFBhcmFtcyA9IHNhZmUoZ2xvYmFsVGhpcy5VUkxTZWFyY2hQYXJhbXMpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgWE1MSHR0cFJlcXVlc3QgID0gc2FmZShnbG9iYWxUaGlzLlhNTEh0dHBSZXF1ZXN0KTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGZldGNoICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5mZXRjaCk7XG4iLCJpbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNOdW1lcmljLFxuICAgIGFzc2lnblZhbHVlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgVVJMU2VhcmNoUGFyYW1zIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBzdHJpbmcgdmFsdWUgKi9cbmNvbnN0IGVuc3VyZVBhcmFtVmFsdWUgPSAocHJvcDogdW5rbm93bik6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBpc0Z1bmN0aW9uKHByb3ApID8gcHJvcCgpIDogcHJvcDtcbiAgICByZXR1cm4gdW5kZWZpbmVkICE9PSB2YWx1ZSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFBsYWluT2JqZWN0YCB0byBxdWVyeSBzdHJpbmdzLlxuICogQGphIGBQbGFpbk9iamVjdGAg44KS44Kv44Ko44Oq44K544OI44Oq44Oz44Kw44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCB0b1F1ZXJ5U3RyaW5ncyA9IChkYXRhOiBQbGFpbk9iamVjdCk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgcGFyYW1zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZW5zdXJlUGFyYW1WYWx1ZShkYXRhW2tleV0pO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHBhcmFtcy5wdXNoKGAke2VuY29kZVVSSUNvbXBvbmVudChrZXkpfT0ke2VuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSl9YCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcy5qb2luKCcmJyk7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gQWpheCBwYXJhbWV0ZXJzIG9iamVjdC5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkiBBamF4IOODkeODqeODoeODvOOCv+OCquODluOCuOOCp+OCr+ODiOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgdG9BamF4UGFyYW1zID0gKGRhdGE6IFBsYWluT2JqZWN0KTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9PiB7XG4gICAgY29uc3QgcGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBlbnN1cmVQYXJhbVZhbHVlKGRhdGFba2V5XSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgYXNzaWduVmFsdWUocGFyYW1zLCBrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBVUkwgcGFyYW1ldGVycyB0byBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSBVUkwg44OR44Op44Oh44O844K/44KSIHByaW1pdGl2ZSDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IGNvbnZlcnRVcmxQYXJhbVR5cGUgPSAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsID0+IHtcbiAgICBpZiAoaXNOdW1lcmljKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gTnVtYmVyKHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICgnbnVsbCcgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQGVuIFBhcnNlIHVybCBxdWVyeSBHRVQgcGFyYW1ldGVycy5cbiAqIEBqYSBVUkzjgq/jgqjjg6rjga5HRVTjg5Hjg6njg6Hjg7zjgr/jgpLop6PmnpBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHVybCA9ICcvcGFnZS8/aWQ9NSZmb289YmFyJmJvb2w9dHJ1ZSc7XG4gKiBjb25zdCBxdWVyeSA9IHBhcnNlVXJsUXVlcnkodXJsKTtcbiAqIC8vIHsgaWQ6IDUsIGZvbzogJ2JhcicsIGJvb2w6IHRydWUgfVxuICogYGBgXG4gKlxuICogQHJldHVybnMgeyBrZXk6IHZhbHVlIH0gb2JqZWN0LlxuICovXG5leHBvcnQgY29uc3QgcGFyc2VVcmxRdWVyeSA9IDxUID0gUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+Pih1cmw6IHN0cmluZyk6IFQgPT4ge1xuICAgIGNvbnN0IHF1ZXJ5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXModXJsLmluY2x1ZGVzKCc/JykgPyB1cmwuc3BsaXQoJz8nKVsxXSA6IHVybCk7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgcGFyYW1zKSB7XG4gICAgICAgIHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChrZXkpXSA9IGNvbnZlcnRVcmxQYXJhbVR5cGUodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gcXVlcnkgYXMgVDtcbn07XG4iLCJpbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBBY2Nlc3NpYmxlLFxuICAgIEtleXMsXG4gICAgaXNGdW5jdGlvbixcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmliYWJsZSwgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgdHlwZSB7IEFqYXhEYXRhU3RyZWFtRXZlbnQsIEFqYXhEYXRhU3RyZWFtIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBQcm94eUhhbmRsZXIgaGVscGVyICovXG5jb25zdCBfZXhlY0dldERlZmF1bHQgPSAodGFyZ2V0OiBhbnksIHByb3A6IHN0cmluZyB8IHN5bWJvbCk6IGFueSA9PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGlmIChwcm9wIGluIHRhcmdldCkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbih0YXJnZXRbcHJvcF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdLmJpbmQodGFyZ2V0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcF07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc3Vic2NyaWJhYmxlTWV0aG9kczogS2V5czxTdWJzY3JpYmFibGU+W10gPSBbXG4gICAgJ2hhc0xpc3RlbmVyJyxcbiAgICAnY2hhbm5lbHMnLFxuICAgICdvbicsXG4gICAgJ29mZicsXG4gICAgJ29uY2UnLFxuXTtcblxuZXhwb3J0IGNvbnN0IHRvQWpheERhdGFTdHJlYW0gPSAoc2VlZDogQmxvYiB8IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCBsZW5ndGg/OiBudW1iZXIpOiBBamF4RGF0YVN0cmVhbSA9PiB7XG4gICAgbGV0IGxvYWRlZCA9IDA7XG4gICAgY29uc3QgW3N0cmVhbSwgdG90YWxdID0gKCgpID0+IHtcbiAgICAgICAgaWYgKHNlZWQgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQuc3RyZWFtKCksIHNlZWQuc2l6ZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQsIGxlbmd0aCAhPSBudWxsID8gTWF0aC50cnVuYyhsZW5ndGgpIDogTmFOXTtcbiAgICAgICAgfVxuICAgIH0pKCk7XG5cbiAgICBjb25zdCBfZXZlbnRTb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2U8QWpheERhdGFTdHJlYW1FdmVudD4oKSBhcyBBY2Nlc3NpYmxlPEV2ZW50U291cmNlPEFqYXhEYXRhU3RyZWFtRXZlbnQ+LCBVbmtub3duRnVuY3Rpb24+O1xuXG4gICAgY29uc3QgX3Byb3h5UmVhZGVySGFuZGxlcjogUHJveHlIYW5kbGVyPFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxVaW50OEFycmF5Pj4gPSB7XG4gICAgICAgIGdldDogKHRhcmdldDogUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICgncmVhZCcgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gdGFyZ2V0LnJlYWQoKTtcbiAgICAgICAgICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWU6IGNodW5rIH0gPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICBjaHVuayAmJiAobG9hZGVkICs9IGNodW5rLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIF9ldmVudFNvdXJjZS50cmlnZ2VyKCdwcm9ncmVzcycsIE9iamVjdC5mcmVlemUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcHV0YWJsZTogIU51bWJlci5pc05hTih0b3RhbCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2FkZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaHVuayxcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgpID0+IHByb21pc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBfZXhlY0dldERlZmF1bHQodGFyZ2V0LCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBQcm94eShzdHJlYW0sIHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiwgcHJvcDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAoJ2dldFJlYWRlcicgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gbmV3IFByb3h5KHRhcmdldC5nZXRSZWFkZXIoKSwgX3Byb3h5UmVhZGVySGFuZGxlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCdsZW5ndGgnID09PSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfc3Vic2NyaWJhYmxlTWV0aG9kcy5pbmNsdWRlcyhwcm9wIGFzIEtleXM8U3Vic2NyaWJhYmxlPikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gX2V2ZW50U291cmNlW3Byb3BdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX2V4ZWNHZXREZWZhdWx0KHRhcmdldCwgcHJvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSkgYXMgQWpheERhdGFTdHJlYW07XG59O1xuIiwiaW1wb3J0IHsgaXNOdW1iZXIgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsICovIGxldCBfdGltZW91dDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgZ2V0IHRpbWVvdXQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF90aW1lb3V0O1xuICAgIH0sXG4gICAgc2V0IHRpbWVvdXQodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgICAgICBfdGltZW91dCA9IChpc051bWJlcih2YWx1ZSkgJiYgMCA8PSB2YWx1ZSkgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICB9LFxufTtcbiIsImltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgQmFzZTY0IH0gZnJvbSAnQGNkcC9iaW5hcnknO1xuaW1wb3J0IHtcbiAgICBBamF4RGF0YVR5cGVzLFxuICAgIEFqYXhPcHRpb25zLFxuICAgIEFqYXhSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIEZvcm1EYXRhLFxuICAgIEhlYWRlcnMsXG4gICAgQWJvcnRDb250cm9sbGVyLFxuICAgIFVSTFNlYXJjaFBhcmFtcyxcbiAgICBmZXRjaCxcbn0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgdG9RdWVyeVN0cmluZ3MsIHRvQWpheFBhcmFtcyB9IGZyb20gJy4vcGFyYW1zJztcbmltcG9ydCB7IHRvQWpheERhdGFTdHJlYW0gfSBmcm9tICcuL3N0cmVhbSc7XG5pbXBvcnQgeyBzZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBBamF4SGVhZGVyT3B0aW9ucyA9IFBpY2s8QWpheE9wdGlvbnM8QWpheERhdGFUeXBlcz4sICdoZWFkZXJzJyB8ICdtZXRob2QnIHwgJ2NvbnRlbnRUeXBlJyB8ICdkYXRhVHlwZScgfCAnbW9kZScgfCAnYm9keScgfCAndXNlcm5hbWUnIHwgJ3Bhc3N3b3JkJz47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9hY2NlcHRIZWFkZXJNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgdGV4dDogJ3RleHQvcGxhaW4sIHRleHQvaHRtbCwgYXBwbGljYXRpb24veG1sOyBxPTAuOCwgdGV4dC94bWw7IHE9MC44LCAqLyo7IHE9MC4wMScsXG4gICAganNvbjogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdCwgKi8qOyBxPTAuMDEnLFxufTtcblxuLyoqXG4gKiBAZW4gU2V0dXAgYGhlYWRlcnNgIGZyb20gb3B0aW9ucyBwYXJhbWV0ZXIuXG4gKiBAamEg44Kq44OX44K344On44Oz44GL44KJIGBoZWFkZXJzYCDjgpLoqK3lrppcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSGVhZGVycyhvcHRpb25zOiBBamF4SGVhZGVyT3B0aW9ucyk6IEhlYWRlcnMge1xuICAgIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpO1xuICAgIGNvbnN0IHsgbWV0aG9kLCBjb250ZW50VHlwZSwgZGF0YVR5cGUsIG1vZGUsIGJvZHksIHVzZXJuYW1lLCBwYXNzd29yZCB9ID0gb3B0aW9ucztcblxuICAgIC8vIENvbnRlbnQtVHlwZVxuICAgIGlmICgnUE9TVCcgPT09IG1ldGhvZCB8fCAnUFVUJyA9PT0gbWV0aG9kIHx8ICdQQVRDSCcgPT09IG1ldGhvZCkge1xuICAgICAgICAvKlxuICAgICAgICAgKiBmZXRjaCgpIOOBruWgtOWQiCwgRm9ybURhdGEg44KS6Ieq5YuV6Kej6YeI44GZ44KL44Gf44KBLCDmjIflrprjgYzjgYLjgovloLTlkIjjga/liYrpmaRcbiAgICAgICAgICogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzUxOTI4NDEvZmV0Y2gtcG9zdC13aXRoLW11bHRpcGFydC1mb3JtLWRhdGFcbiAgICAgICAgICogaHR0cHM6Ly9tdWZmaW5tYW4uaW8vdXBsb2FkaW5nLWZpbGVzLXVzaW5nLWZldGNoLW11bHRpcGFydC1mb3JtLWRhdGEvXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpICYmIGJvZHkgaW5zdGFuY2VvZiBGb3JtRGF0YSkge1xuICAgICAgICAgICAgaGVhZGVycy5kZWxldGUoJ0NvbnRlbnQtVHlwZScpO1xuICAgICAgICB9IGVsc2UgaWYgKCFoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykpIHtcbiAgICAgICAgICAgIGlmIChudWxsID09IGNvbnRlbnRUeXBlICYmICdqc29uJyA9PT0gZGF0YVR5cGUhKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bGwgIT0gY29udGVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLnNldCgnQ29udGVudC1UeXBlJywgY29udGVudFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWNjZXB0XG4gICAgaWYgKCFoZWFkZXJzLmdldCgnQWNjZXB0JykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ0FjY2VwdCcsIF9hY2NlcHRIZWFkZXJNYXBbZGF0YVR5cGUhXSB8fCAnKi8qJyk7XG4gICAgfVxuXG4gICAgLy8gWC1SZXF1ZXN0ZWQtV2l0aFxuICAgIGlmICgnY29ycycgIT09IG1vZGUgJiYgIWhlYWRlcnMuZ2V0KCdYLVJlcXVlc3RlZC1XaXRoJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ1gtUmVxdWVzdGVkLVdpdGgnLCAnWE1MSHR0cFJlcXVlc3QnKTtcbiAgICB9XG5cbiAgICAvLyBCYXNpYyBBdXRob3JpemF0aW9uXG4gICAgaWYgKG51bGwgIT0gdXNlcm5hbWUgJiYgIWhlYWRlcnMuZ2V0KCdBdXRob3JpemF0aW9uJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmFzaWMgJHtCYXNlNjQuZW5jb2RlKGAke3VzZXJuYW1lfToke3Bhc3N3b3JkID8/ICcnfWApfWApO1xuICAgIH1cblxuICAgIHJldHVybiBoZWFkZXJzO1xufVxuXG4vKipcbiAqIEBlbiBQZXJmb3JtIGFuIGFzeW5jaHJvbm91cyBIVFRQIChBamF4KSByZXF1ZXN0LlxuICogQGphIEhUVFAgKEFqYXgp44Oq44Kv44Ko44K544OI44Gu6YCB5L+hXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgQWpheCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFqYXg8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAncmVzcG9uc2UnPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhPcHRpb25zPFQ+KTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IGNvbnRyb2xsZXIuYWJvcnQoKTtcblxuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdyZXNwb25zZScsXG4gICAgICAgIHRpbWVvdXQ6IHNldHRpbmdzLnRpbWVvdXQsXG4gICAgfSwgb3B0aW9ucywge1xuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLCAvLyBmb3JjZSBvdmVycmlkZVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIHRpbWVvdXQgfSA9IG9wdHM7XG5cbiAgICAvLyBjYW5jZWxsYXRpb25cbiAgICBpZiAob3JpZ2luYWxUb2tlbikge1xuICAgICAgICBpZiAob3JpZ2luYWxUb2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgICAgICB9XG4gICAgICAgIG9yaWdpbmFsVG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuISk7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gc291cmNlO1xuICAgIHRva2VuLnJlZ2lzdGVyKGFib3J0KTtcblxuICAgIC8vIHRpbWVvdXRcbiAgICBpZiAodGltZW91dCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHNvdXJjZS5jYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1RJTUVPVVQsICdyZXF1ZXN0IHRpbWVvdXQnKSksIHRpbWVvdXQpO1xuICAgIH1cblxuICAgIC8vIG5vcm1hbGl6ZVxuICAgIG9wdHMubWV0aG9kID0gb3B0cy5tZXRob2QudG9VcHBlckNhc2UoKTtcblxuICAgIC8vIGhlYWRlclxuICAgIG9wdHMuaGVhZGVycyA9IHNldHVwSGVhZGVycyhvcHRzKTtcblxuICAgIC8vIHBhcnNlIHBhcmFtXG4gICAgY29uc3QgeyBtZXRob2QsIGRhdGEsIGRhdGFUeXBlIH0gPSBvcHRzO1xuICAgIGlmIChudWxsICE9IGRhdGEpIHtcbiAgICAgICAgaWYgKCgnR0VUJyA9PT0gbWV0aG9kIHx8ICdIRUFEJyA9PT0gbWV0aG9kKSAmJiAhdXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICAgICAgfSBlbHNlIGlmIChudWxsID09IG9wdHMuYm9keSkge1xuICAgICAgICAgICAgb3B0cy5ib2R5ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh0b0FqYXhQYXJhbXMoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGZldGNoKHVybCwgb3B0cyksIHRva2VuKTtcbiAgICBpZiAoJ3Jlc3BvbnNlJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIEFqYXhSZXN1bHQ8VD47XG4gICAgfSBlbHNlIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFLCByZXNwb25zZS5zdGF0dXNUZXh0LCByZXNwb25zZSk7XG4gICAgfSBlbHNlIGlmICgnc3RyZWFtJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRvQWpheERhdGFTdHJlYW0oXG4gICAgICAgICAgICByZXNwb25zZS5ib2R5ISxcbiAgICAgICAgICAgIE51bWJlcihyZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC1sZW5ndGgnKSksXG4gICAgICAgICkgYXMgQWpheFJlc3VsdDxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVubmVjZXNzYXJ5LXR5cGUtYXNzZXJ0aW9uXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzcG9uc2VbZGF0YVR5cGUgYXMgRXhjbHVkZTxBamF4RGF0YVR5cGVzLCAncmVzcG9uc2UnIHwgJ3N0cmVhbSc+XSgpLCB0b2tlbik7XG4gICAgfVxufVxuXG5hamF4LnNldHRpbmdzID0gc2V0dGluZ3M7XG5cbmV4cG9ydCB7IGFqYXggfTtcbiIsImltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHtcbiAgICBBamF4RGF0YVR5cGVzLFxuICAgIEFqYXhPcHRpb25zLFxuICAgIEFqYXhSZXF1ZXN0T3B0aW9ucyxcbiAgICBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgYWpheCwgc2V0dXBIZWFkZXJzIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7IHRvUXVlcnlTdHJpbmdzIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgWE1MSHR0cFJlcXVlc3QgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlPzogQWpheERhdGFUeXBlcyk6IEFqYXhEYXRhVHlwZXMge1xuICAgIHJldHVybiBkYXRhVHlwZSA/PyAnanNvbic7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844GL44KJ6L+U44GV44KM44KL5pyf5b6F44GZ44KL44OH44O844K/44Gu5Z6L44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YT86IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdHRVQnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufVxuXG4vKipcbiAqIEBlbiBgR0VUYCB0ZXh0IHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44OG44Kt44K544OI44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J3RleHQnPj4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICd0ZXh0Jywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIGBHRVRgIEpTT04gcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCBKU09OIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgZnVuY3Rpb24ganNvbjxUIGV4dGVuZHMgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgcmV0dXJuIGdldDxUPih1cmwsIHVuZGVmaW5lZCwgKCdqc29uJyBhcyBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicpLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gYEdFVGAgQmxvYiByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIEJsb2Ig44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iKHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J2Jsb2InPj4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICdibG9iJywgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIGBQT1NUYCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBQT1NUYCDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3Q8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGE6IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdQT1NUJywgZGF0YSwgZGF0YVR5cGU6IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKSB9IGFzIEFqYXhPcHRpb25zPFQ+KTtcbn1cblxuLyoqXG4gKiBAZW4gU3luY2hyb25vdXMgYEdFVGAgcmVxdWVzdCBmb3IgcmVzb3VyY2UgYWNjZXNzLiA8YnI+XG4gKiAgICAgTWFueSBicm93c2VycyBoYXZlIGRlcHJlY2F0ZWQgc3luY2hyb25vdXMgWEhSIHN1cHBvcnQgb24gdGhlIG1haW4gdGhyZWFkIGVudGlyZWx5LlxuICogQGphIOODquOCveODvOOCueWPluW+l+OBruOBn+OCgeOBriDlkIzmnJ8gYEdFVGAg44Oq44Kv44Ko44K544OILiA8YnI+XG4gKiAgICAg5aSa44GP44Gu44OW44Op44Km44K244Gn44Gv44Oh44Kk44Oz44K544Os44OD44OJ44Gr44GK44GR44KL5ZCM5pyf55qE44GqIFhIUiDjga7lr77lv5zjgpLlhajpnaLnmoTjgavpnZ7mjqjlpajjgajjgZfjgabjgYTjgovjga7jgafnqY3mpbXkvb/nlKjjga/pgb/jgZHjgovjgZPjgaguXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb3VyY2U8VCBleHRlbmRzICd0ZXh0JyB8ICdqc29uJyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nID8gVCA6ICdqc29uJyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4pOiBBamF4UmVzdWx0PFQ+IHtcbiAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChudWxsICE9IGRhdGEgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICB9XG5cbiAgICAvLyBzeW5jaHJvbm91c1xuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcblxuICAgIGNvbnN0IHR5cGUgPSBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSk7XG4gICAgY29uc3QgaGVhZGVycyA9IHNldHVwSGVhZGVycyh7IG1ldGhvZDogJ0dFVCcsIGRhdGFUeXBlOiB0eXBlIH0pO1xuICAgIGhlYWRlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHhoci5zZW5kKG51bGwpO1xuICAgIGlmICghKDIwMCA8PSB4aHIuc3RhdHVzICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgeGhyLnN0YXR1c1RleHQsIHhocik7XG4gICAgfVxuXG4gICAgcmV0dXJuICdqc29uJyA9PT0gdHlwZSA/IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKSA6IHhoci5yZXNwb25zZTtcbn1cbiIsImltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBjbGFzc05hbWUsXG4gICAgc2FmZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqXG4gKiBAZW4ge0BsaW5rIElubGluZVdvcmtlcn0gc291cmNlIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgSW5saW5lV29ya2VyfSDjgavmjIflrprlj6/og73jgarjgr3jg7zjgrnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgSW5saWVuV29ya2VyU291cmNlID0gKChzZWxmOiBXb3JrZXIpID0+IHVua25vd24pIHwgc3RyaW5nO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IFVSTCAgICA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBXb3JrZXIgPSBzYWZlKGdsb2JhbFRoaXMuV29ya2VyKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgQmxvYiAgID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYzogSW5saWVuV29ya2VyU291cmNlKTogc3RyaW5nIHtcbiAgICBpZiAoIShpc0Z1bmN0aW9uKHNyYykgfHwgaXNTdHJpbmcoc3JjKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoc3JjKX0gaXMgbm90IGEgZnVuY3Rpb24gb3Igc3RyaW5nLmApO1xuICAgIH1cbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbaXNGdW5jdGlvbihzcmMpID8gYCgke3NyYy50b1N0cmluZygpfSkoc2VsZik7YCA6IHNyY10sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnIH0pKTtcbn1cblxuLyoqXG4gKiBAZW4gU3BlY2lmaWVkIGBXb3JrZXJgIGNsYXNzIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBhIHNjcmlwdCBmaWxlLlxuICogQGphIOOCueOCr+ODquODl+ODiOODleOCoeOCpOODq+OCkuW/heimgeOBqOOBl+OBquOBhCBgV29ya2VyYCDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIElubGluZVdvcmtlciBleHRlbmRzIFdvcmtlciB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX2NvbnRleHQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjXG4gICAgICogIC0gYGVuYCBzb3VyY2UgZnVuY3Rpb24gb3Igc2NyaXB0IGJvZHkuXG4gICAgICogIC0gYGphYCDlrp/ooYzplqLmlbDjgb7jgZ/jga/jgrnjgq/jg6rjg5fjg4jlrp/kvZNcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgd29ya2VyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBXb3JrZXIg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBJbmxpZW5Xb3JrZXJTb3VyY2UsIG9wdGlvbnM/OiBXb3JrZXJPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYyk7XG4gICAgICAgIHN1cGVyKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogV29ya2VyXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIEJMT0IgcmVsZWFzZS4gV2hlbiBjYWxsaW5nIGBjbG9zZSAoKWAgaW4gdGhlIFdvcmtlciwgY2FsbCB0aGlzIG1ldGhvZCBhcyB3ZWxsLlxuICAgICAqIEBqYSBCTE9CIOino+aUvueUqC4gV29ya2VyIOWGheOBpyBgY2xvc2UoKWAg44KS5ZG844G25aC05ZCILCDmnKzjg6Hjgr3jg4Pjg4njgoLjgrPjg7zjg6vjgZnjgovjgZPjgaguXG4gICAgICovXG4gICAgdGVybWluYXRlKCk6IHZvaWQge1xuICAgICAgICBzdXBlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLl9jb250ZXh0KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgQ2FuY2VsYWJsZSwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgSW5saW5lV29ya2VyIH0gZnJvbSAnLi9pbmluZS13b3JrZXInO1xuXG4vKipcbiAqIEBlbiBUaHJlYWQgb3B0aW9uc1xuICogQGVuIOOCueODrOODg+ODieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRocmVhZE9wdGlvbnM8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4gZXh0ZW5kcyBDYW5jZWxhYmxlLCBXb3JrZXJPcHRpb25zIHtcbiAgICBhcmdzPzogUGFyYW1ldGVyczxUPjtcbn1cblxuLyoqXG4gKiBAZW4gRW5zdXJlIGV4ZWN1dGlvbiBpbiB3b3JrZXIgdGhyZWFkLlxuICogQGphIOODr+ODvOOCq+ODvOOCueODrOODg+ODieWGheOBp+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgZXhlYyA9IChhcmcxOiBudW1iZXIsIGFyZzI6IHN0cmluZykgPT4ge1xuICogICAgLy8gdGhpcyBzY29wZSBpcyB3b3JrZXIgc2NvcGUuIHlvdSBjYW5ub3QgdXNlIGNsb3N1cmUgYWNjZXNzLlxuICogICAgY29uc3QgcGFyYW0gPSB7Li4ufTtcbiAqICAgIGNvbnN0IG1ldGhvZCA9IChwKSA9PiB7Li4ufTtcbiAqICAgIC8vIHlvdSBjYW4gYWNjZXNzIGFyZ3VtZW50cyBmcm9tIG9wdGlvbnMuXG4gKiAgICBjb25zb2xlLmxvZyhhcmcxKTsgLy8gJzEnXG4gKiAgICBjb25zb2xlLmxvZyhhcmcyKTsgLy8gJ3Rlc3QnXG4gKiAgICA6XG4gKiAgICByZXR1cm4gbWV0aG9kKHBhcmFtKTtcbiAqIH07XG4gKlxuICogY29uc3QgYXJnMSA9IDE7XG4gKiBjb25zdCBhcmcyID0gJ3Rlc3QnO1xuICogY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhyZWFkKGV4ZWMsIHsgYXJnczogW2FyZzEsIGFyZzJdIH0pO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIGltcGxlbWVudCBhcyBmdW5jdGlvbiBzY29wZS5cbiAqICAtIGBqYWAg6Zai5pWw44K544Kz44O844OX44Go44GX44Gm5a6f6KOFXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB0aHJlYWQgb3B0aW9uc1xuICogIC0gYGphYCDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRocmVhZDxULCBVPihleGVjdXRvcjogKC4uLmFyZ3M6IFVbXSkgPT4gVCB8IFByb21pc2U8VD4sIG9wdGlvbnM/OiBUaHJlYWRPcHRpb25zPHR5cGVvZiBleGVjdXRvcj4pOiBQcm9taXNlPFQ+IHtcbiAgICBjb25zdCB7IGNhbmNlbDogb3JpZ2luYWxUb2tlbiwgYXJncyB9ID0gT2JqZWN0LmFzc2lnbih7IGFyZ3M6IFtdIH0sIG9wdGlvbnMpO1xuXG4gICAgLy8gYWxyZWFkeSBjYW5jZWxcbiAgICBpZiAob3JpZ2luYWxUb2tlbj8ucmVxdWVzdGVkKSB7XG4gICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgIH1cblxuICAgIGNvbnN0IGV4ZWMgPSBgKHNlbGYgPT4ge1xuICAgICAgICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBhc3luYyAoeyBkYXRhIH0pID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgKCR7ZXhlY3V0b3IudG9TdHJpbmcoKX0pKC4uLmRhdGEpO1xuICAgICAgICAgICAgICAgIHNlbGYucG9zdE1lc3NhZ2UocmVzdWx0KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlOyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSkoc2VsZik7YDtcblxuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBJbmxpbmVXb3JrZXIoZXhlYywgb3B0aW9ucyk7XG5cbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICBvcmlnaW5hbFRva2VuPy5yZWdpc3RlcihhYm9ydCk7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKG9yaWdpbmFsVG9rZW4hKTtcblxuICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHdvcmtlci5vbmVycm9yID0gZXYgPT4ge1xuICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHJlamVjdChldik7XG4gICAgICAgICAgICB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgICAgIH07XG4gICAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBldiA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKGV2LmRhdGEpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgIH0sIHRva2VuKTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZShhcmdzKTtcblxuICAgIHJldHVybiBwcm9taXNlIGFzIFByb21pc2U8VD47XG59XG4iXSwibmFtZXMiOlsic2FmZSIsIkJsb2IiLCJVUkwiLCJ2ZXJpZnkiLCJDYW5jZWxUb2tlbiIsImNjIiwiZnJvbVR5cGVkRGF0YSIsInJlc3RvcmVOdWxsaXNoIiwidG9UeXBlZERhdGEiLCJpc0Z1bmN0aW9uIiwiYXNzaWduVmFsdWUiLCJpc051bWVyaWMiLCJFdmVudFNvdXJjZSIsImlzTnVtYmVyIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwiaXNTdHJpbmciLCJjbGFzc05hbWUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBRUEsaUJBQXdCLE1BQU0sSUFBSSxHQUFTQSxZQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pFLGlCQUF3QixNQUFNLElBQUksR0FBU0EsWUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqRSxpQkFBd0IsTUFBTUMsTUFBSSxHQUFTRCxZQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pFLGlCQUF3QixNQUFNLFVBQVUsR0FBR0EsWUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN2RSxpQkFBd0IsTUFBTUUsS0FBRyxHQUFVRixZQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBOztJQ0ovRDs7O0lBR0c7SUFDVSxNQUFBLE1BQU0sQ0FBQTtJQUNmOzs7SUFHRztRQUNJLE9BQU8sTUFBTSxDQUFDLEdBQVcsRUFBQTtZQUM1QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xELEtBQUE7SUFFRDs7O0lBR0c7UUFDSSxPQUFPLE1BQU0sQ0FBQyxPQUFlLEVBQUE7WUFDaEMsT0FBTyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRCxLQUFBO0lBQ0osQ0FBQTs7SUNZRDtJQUNBLFNBQVMsSUFBSSxDQUNULFVBQWEsRUFDYixJQUEwQixFQUMxQixPQUF3QixFQUFBO1FBR3hCLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUM5QyxLQUFLLElBQUlHLGNBQU0sQ0FBQyxZQUFZLEVBQUVDLG1CQUFXLEVBQUUsS0FBSyxD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