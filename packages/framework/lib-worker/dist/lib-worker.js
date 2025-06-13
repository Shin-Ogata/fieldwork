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
    /** @internal */ const TextEncoder = libCore.safe(globalThis.TextEncoder);

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
            const utf8Bytes = new TextEncoder().encode(src);
            const binaryString = Array.from(utf8Bytes)
                .map(byte => String.fromCharCode(byte))
                .join('');
            return btoa(binaryString);
        }
        /**
         * @en Decodes a string of data which has been encoded using base-64 encoding.
         * @ja base64 形式でエンコードされたデータの文字列をデコード
         */
        static decode(encoded) {
            const binaryString = atob(encoded);
            const utf8Bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
            return new TextDecoder().decode(utf8Bytes);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLXdvcmtlci5qcyIsInNvdXJjZXMiOlsiYmluYXJ5L3Nzci50cyIsImJpbmFyeS9iYXNlNjQudHMiLCJiaW5hcnkvYmxvYi1yZWFkZXIudHMiLCJiaW5hcnkvY29udmVydGVyLnRzIiwiYmluYXJ5L2Jsb2ItdXJsLnRzIiwiYWpheC9yZXN1bHQtY29kZS1kZWZzLnRzIiwiYWpheC9zc3IudHMiLCJhamF4L3BhcmFtcy50cyIsImFqYXgvc3RyZWFtLnRzIiwiYWpheC9zZXR0aW5ncy50cyIsImFqYXgvY29yZS50cyIsImFqYXgvcmVxdWVzdC50cyIsImlubGluZS13b3JrZXIvaW5pbmUtd29ya2VyLnRzIiwiaW5saW5lLXdvcmtlci90aHJlYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGJ0b2EgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmJ0b2EpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgYXRvYiAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuYXRvYik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBCbG9iICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5CbG9iKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEZpbGVSZWFkZXIgID0gc2FmZShnbG9iYWxUaGlzLkZpbGVSZWFkZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgVVJMICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFRleHRFbmNvZGVyID0gc2FmZShnbG9iYWxUaGlzLlRleHRFbmNvZGVyKTtcbiIsImltcG9ydCB7XG4gICAgVGV4dEVuY29kZXIsXG4gICAgYXRvYixcbiAgICBidG9hLFxufSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIGBiYXNlNjRgIHV0aWxpdHkgZm9yIGluZGVwZW5kZW50IGNoYXJhY3RvciBjb2RlLlxuICogQGphIOaWh+Wtl+OCs+ODvOODieOBq+S+neWtmOOBl+OBquOBhCBgYmFzZTY0YCDjg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2U2NCB7XG4gICAgLyoqXG4gICAgICogQGVuIEVuY29kZSBhIGJhc2UtNjQgZW5jb2RlZCBzdHJpbmcgZnJvbSBhIGJpbmFyeSBzdHJpbmcuXG4gICAgICogQGphIOaWh+Wtl+WIl+OCkiBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB1dGY4Qnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoc3JjKTtcbiAgICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gQXJyYXkuZnJvbSh1dGY4Qnl0ZXMpXG4gICAgICAgICAgICAubWFwKGJ5dGUgPT4gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlKSlcbiAgICAgICAgICAgIC5qb2luKCcnKTtcbiAgICAgICAgcmV0dXJuIGJ0b2EoYmluYXJ5U3RyaW5nKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjb2RlcyBhIHN0cmluZyBvZiBkYXRhIHdoaWNoIGhhcyBiZWVuIGVuY29kZWQgdXNpbmcgYmFzZS02NCBlbmNvZGluZy5cbiAgICAgKiBAamEgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODieOBleOCjOOBn+ODh+ODvOOCv+OBruaWh+Wtl+WIl+OCkuODh+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZGVjb2RlKGVuY29kZWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGJpbmFyeVN0cmluZyA9IGF0b2IoZW5jb2RlZCk7XG4gICAgICAgIGNvbnN0IHV0ZjhCeXRlcyA9IFVpbnQ4QXJyYXkuZnJvbShiaW5hcnlTdHJpbmcsIGNoYXIgPT4gY2hhci5jaGFyQ29kZUF0KDApKTtcbiAgICAgICAgcmV0dXJuIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZSh1dGY4Qnl0ZXMpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHR5cGUgVW5rbm93bkZ1bmN0aW9uLCB2ZXJpZnkgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBDYW5jZWxhYmxlLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBGaWxlUmVhZGVyIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRmlsZVJlYWRlckFyZ3NNYXAge1xuICAgIHJlYWRBc0FycmF5QnVmZmVyOiBbQmxvYl07XG4gICAgcmVhZEFzRGF0YVVSTDogW0Jsb2JdO1xuICAgIHJlYWRBc1RleHQ6IFtCbG9iLCBzdHJpbmcgfCB1bmRlZmluZWRdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRmlsZVJlYWRlclJlc3VsdE1hcCB7XG4gICAgcmVhZEFzQXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyO1xuICAgIHJlYWRBc0RhdGFVUkw6IHN0cmluZztcbiAgICByZWFkQXNUZXh0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGVuIGBCbG9iYCByZWFkIG9wdGlvbnNcbiAqIEBqYSBgQmxvYmAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQmxvYlJlYWRPcHRpb25zIGV4dGVuZHMgQ2FuY2VsYWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb2dyZXNzIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBqYSDpgLLmjZfjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9ncmVzc1xuICAgICAqICAtIGBlbmAgd29ya2VyIHByb2dyZXNzIGV2ZW50XG4gICAgICogIC0gYGphYCB3b3JrZXIg6YCy5o2X44Kk44OZ44Oz44OIXG4gICAgICovXG4gICAgb25wcm9ncmVzcz86IChwcm9ncmVzczogUHJvZ3Jlc3NFdmVudCkgPT4gdW5rbm93bjtcbn1cblxuLyoqIEBpbnRlcm5hbCBleGVjdXRlIHJlYWQgYmxvYiAqL1xuZnVuY3Rpb24gZXhlYzxUIGV4dGVuZHMga2V5b2YgRmlsZVJlYWRlclJlc3VsdE1hcD4oXG4gICAgbWV0aG9kTmFtZTogVCxcbiAgICBhcmdzOiBGaWxlUmVhZGVyQXJnc01hcFtUXSxcbiAgICBvcHRpb25zOiBCbG9iUmVhZE9wdGlvbnMsXG4pOiBQcm9taXNlPEZpbGVSZWFkZXJSZXN1bHRNYXBbVF0+IHtcbiAgICB0eXBlIFRSZXN1bHQgPSBGaWxlUmVhZGVyUmVzdWx0TWFwW1RdO1xuICAgIGNvbnN0IHsgY2FuY2VsOiB0b2tlbiwgb25wcm9ncmVzcyB9ID0gb3B0aW9ucztcbiAgICB0b2tlbiAmJiB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdG9rZW4pO1xuICAgIG9ucHJvZ3Jlc3MgJiYgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBvbnByb2dyZXNzKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8VFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0b2tlbj8ucmVnaXN0ZXIoKCkgPT4ge1xuICAgICAgICAgICAgcmVhZGVyLmFib3J0KCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZWFkZXIub25hYm9ydCA9IHJlYWRlci5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbnByb2dyZXNzID0gb25wcm9ncmVzcyE7XG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQgYXMgVFJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSAoKSA9PiB7XG4gICAgICAgICAgICBzdWJzY3JpcHRpb24gJiYgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH07XG4gICAgICAgIChyZWFkZXJbbWV0aG9kTmFtZV0gYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmdzKTtcbiAgICB9LCB0b2tlbik7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgYEFycmF5QnVmZmVyYCByZXN1bHQgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0FycmF5QnVmZmVyKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0FycmF5QnVmZmVyJywgW2Jsb2JdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGF0YS1VUkwgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgokgYGRhdGEtdXJsIOaWh+Wtl+WIl+OCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0RhdGFVUkwoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0RhdGFVUkwnLCBbYmxvYl0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnQgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgonjg4bjgq3jgrnjg4jmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBlbmNvZGluZ1xuICogIC0gYGVuYCBlbmNvZGluZyBzdHJpbmcgdG8gdXNlIGZvciB0aGUgcmV0dXJuZWQgZGF0YS4gZGVmYXVsdDogYHV0Zi04YFxuICogIC0gYGphYCDjgqjjg7PjgrPjg7zjg4fjgqPjg7PjgrDjgpLmjIflrprjgZnjgovmloflrZfliJcg5pei5a6aOiBgdXRmLThgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzVGV4dChibG9iOiBCbG9iLCBlbmNvZGluZz86IHN0cmluZyB8IG51bGwsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNUZXh0JywgW2Jsb2IsIGVuY29kaW5nID8/IHVuZGVmaW5lZF0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBLZXlzLFxuICAgIHR5cGUgVHlwZXMsXG4gICAgdHlwZSBUeXBlVG9LZXksXG4gICAgdG9UeXBlZERhdGEsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICByZXN0b3JlTnVsbGlzaCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICcuL2Jhc2U2NCc7XG5pbXBvcnQge1xuICAgIHR5cGUgQmxvYlJlYWRPcHRpb25zLFxuICAgIHJlYWRBc0FycmF5QnVmZmVyLFxuICAgIHJlYWRBc0RhdGFVUkwsXG4gICAgcmVhZEFzVGV4dCxcbn0gZnJvbSAnLi9ibG9iLXJlYWRlcic7XG5pbXBvcnQgeyBCbG9iIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIE1pbWVUeXBlIHtcbiAgICBCSU5BUlkgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJyxcbiAgICBURVhUID0gJ3RleHQvcGxhaW4nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBkYXRhLVVSTCDlsZ7mgKcgKi9cbmludGVyZmFjZSBEYXRhVVJMQ29udGV4dCB7XG4gICAgbWltZVR5cGU6IHN0cmluZztcbiAgICBiYXNlNjQ6IGJvb2xlYW47XG4gICAgZGF0YTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogZGF0YSBVUkkg5b2i5byP44Gu5q2j6KaP6KGo54++XG4gKiDlj4LogIM6IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvZGF0YV9VUklzXG4gKi9cbmZ1bmN0aW9uIHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTDogc3RyaW5nKTogRGF0YVVSTENvbnRleHQge1xuICAgIGNvbnN0IGNvbnRleHQgPSB7IGJhc2U2NDogZmFsc2UgfSBhcyBEYXRhVVJMQ29udGV4dDtcblxuICAgIC8qKlxuICAgICAqIFttYXRjaF0gMTogbWltZS10eXBlXG4gICAgICogICAgICAgICAyOiBcIjtiYXNlNjRcIiDjgpLlkKvjgoDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiAgICAgICAgIDM6IGRhdGEg5pys5L2TXG4gICAgICovXG4gICAgY29uc3QgcmVzdWx0ID0gL15kYXRhOiguKz9cXC8uKz8pPyg7Lis/KT8sKC4qKSQvLmV4ZWMoZGF0YVVSTCk7XG4gICAgaWYgKG51bGwgPT0gcmVzdWx0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBkYXRhLVVSTDogJHtkYXRhVVJMfWApO1xuICAgIH1cblxuICAgIGNvbnRleHQubWltZVR5cGUgPSByZXN1bHRbMV07XG4gICAgY29udGV4dC5iYXNlNjQgPSAvO2Jhc2U2NC8udGVzdChyZXN1bHRbMl0pOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItaW5jbHVkZXNcbiAgICBjb250ZXh0LmRhdGEgPSByZXN1bHRbM107XG5cbiAgICByZXR1cm4gY29udGV4dDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyICovXG5mdW5jdGlvbiBiaW5hcnlTdHJpbmdUb0JpbmFyeShieXRlczogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgY29uc3QgYXJyYXkgPSBieXRlcy5zcGxpdCgnJykubWFwKGMgPT4gYy5jaGFyQ29kZUF0KDApKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciAqL1xuZnVuY3Rpb24gYmluYXJ5VG9CaW5hcnlTdHJpbmcoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKGJpbmFyeSwgKGk6IG51bWJlcikgPT4gU3RyaW5nLmZyb21DaGFyQ29kZShpKSkuam9pbignJyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIHRvIGJpbmFyeS1zdHJpbmcuIChub3QgaHVtYW4gcmVhZGFibGUgc3RyaW5nKVxuICogQGphIOODkOOCpOODiuODquaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0JpbmFyeVN0cmluZyh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQodGV4dCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyBmcm9tIGJpbmFyeS1zdHJpbmcuXG4gKiBAamEg44OQ44Kk44OK44Oq5paH5a2X5YiX44GL44KJ5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ5dGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tQmluYXJ5U3RyaW5nKGJ5dGVzOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGJ5dGVzKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYmluYXJ5IHRvIGhleC1zdHJpbmcuXG4gKiBAamEg44OQ44Kk44OK44Oq44KSIEhFWCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gaGV4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tSGV4U3RyaW5nKGhleDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgY29uc3QgeCA9IGhleC5tYXRjaCgvLnsxLDJ9L2cpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShudWxsICE9IHggPyB4Lm1hcChieXRlID0+IHBhcnNlSW50KGJ5dGUsIDE2KSkgOiBbXSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIGZyb20gaGV4LXN0cmluZy5cbiAqIEBqYSBIRVgg5paH5a2X5YiX44GL44KJ44OQ44Kk44OK44Oq44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9IZXhTdHJpbmcoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5LnJlZHVjZSgoc3RyLCBieXRlKSA9PiBzdHIgKyBieXRlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpLnBhZFN0YXJ0KDIsICcwJyksICcnKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvQnVmZmVyKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgcmV0dXJuIHJlYWRBc0FycmF5QnVmZmVyKGJsb2IsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBgVWludDhBcnJheWAuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBgVWludDhBcnJheWAg44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBibG9iVG9CaW5hcnkoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShhd2FpdCByZWFkQXNBcnJheUJ1ZmZlcihibG9iLCBvcHRpb25zKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvRGF0YVVSTChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gcmVhZEFzRGF0YVVSTChibG9iLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCieODhuOCreOCueODiOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvVGV4dChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zICYgeyBlbmNvZGluZz86IHN0cmluZyB8IG51bGw7IH0pOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zID8/IHt9O1xuICAgIGNvbnN0IHsgZW5jb2RpbmcgfSA9IG9wdHM7XG4gICAgcmV0dXJuIHJlYWRBc1RleHQoYmxvYiwgZW5jb2RpbmcsIG9wdHMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYmxvYlRvQmFzZTY0KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBxdWVyeURhdGFVUkxDb250ZXh0KGF3YWl0IHJlYWRBc0RhdGFVUkwoYmxvYiwgb3B0aW9ucykpLmRhdGE7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gYEJsb2JgLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmxvYihidWZmZXI6IEFycmF5QnVmZmVyLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFtidWZmZXJdLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmluYXJ5KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvRGF0YVVSTChidWZmZXI6IEFycmF5QnVmZmVyLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9EYXRhVVJMKG5ldyBVaW50OEFycmF5KGJ1ZmZlciksIG1pbWVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CYXNlNjQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvQmFzZTY0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgonjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvVGV4dChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9UZXh0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gYEJsb2JgLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQmxvYihiaW5hcnk6IFVpbnQ4QXJyYXksIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW2JpbmFyeV0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQnVmZmVyKGJpbmFyeTogVWludDhBcnJheSk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gYmluYXJ5LmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9EYXRhVVJMKGJpbmFyeTogVWludDhBcnJheSwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2JpbmFyeVRvQmFzZTY0KGJpbmFyeSl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0Jhc2U2NChiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKGJpbmFyeVRvVGV4dChiaW5hcnkpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSDjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb1RleHQoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gZnJvbUJpbmFyeVN0cmluZyhiaW5hcnlUb0JpbmFyeVN0cmluZyhiaW5hcnkpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CbG9iKGJhc2U2NDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIGJpbmFyeVRvQmxvYihiYXNlNjRUb0JpbmFyeShiYXNlNjQpLCBtaW1lVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0J1ZmZlcihiYXNlNjQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gYmFzZTY0VG9CaW5hcnkoYmFzZTY0KS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CaW5hcnkoYmFzZTY0OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmluYXJ5U3RyaW5nVG9CaW5hcnkodG9CaW5hcnlTdHJpbmcoQmFzZTY0LmRlY29kZShiYXNlNjQpKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0RhdGFVUkwoYmFzZTY0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiYXNlNjR9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIHRleHQgc3RyaW5nLlxuICogQGphICBCYXNlNjQg5paH5a2X5YiX44GL44KJIOODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvVGV4dChiYXNlNjQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5kZWNvZGUoYmFzZTY0KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0Jsb2IodGV4dDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuVEVYVCk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbdGV4dF0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQnVmZmVyKHRleHQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gdGV4dFRvQmluYXJ5KHRleHQpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmluYXJ5KHRleHQ6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiaW5hcnlTdHJpbmdUb0JpbmFyeSh0b0JpbmFyeVN0cmluZyh0ZXh0KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvRGF0YVVSTCh0ZXh0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5URVhUKTogc3RyaW5nIHtcbiAgICBjb25zdCBiYXNlNjQgPSB0ZXh0VG9CYXNlNjQodGV4dCk7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2Jhc2U2NH1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmFzZTY0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUodGV4dCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0Jsb2IoZGF0YVVSTDogc3RyaW5nKTogQmxvYiB7XG4gICAgY29uc3QgY29udGV4dCA9IHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTCk7XG4gICAgaWYgKGNvbnRleHQuYmFzZTY0KSB7XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0Jsb2IoY29udGV4dC5kYXRhLCBjb250ZXh0Lm1pbWVUeXBlIHx8IE1pbWVUeXBlLkJJTkFSWSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRleHRUb0Jsb2IoZGVjb2RlVVJJQ29tcG9uZW50KGNvbnRleHQuZGF0YSksIGNvbnRleHQubWltZVR5cGUgfHwgTWltZVR5cGUuVEVYVCk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQnVmZmVyKGRhdGFVUkw6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gZGF0YVVSTFRvQmluYXJ5KGRhdGFVUkwpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CaW5hcnkoZGF0YVVSTDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJhc2U2NFRvQmluYXJ5KGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCieODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvVGV4dChkYXRhVVJMOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNvbnRleHQgPSBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkwpO1xuICAgIGlmIChjb250ZXh0LmJhc2U2NCkge1xuICAgICAgICByZXR1cm4gY29udGV4dC5kYXRhO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKGRlY29kZVVSSUNvbXBvbmVudChjb250ZXh0LmRhdGEpKTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBTZXJpYWxpemFibGUgZGF0YSB0eXBlIGxpc3QuXG4gKiBAamEg44K344Oq44Ki44Op44Kk44K65Y+v6IO944Gq44OH44O844K/5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VyaWFsaXphYmxlIHtcbiAgICBzdHJpbmc6IHN0cmluZztcbiAgICBudW1iZXI6IG51bWJlcjtcbiAgICBib29sZWFuOiBib29sZWFuO1xuICAgIG9iamVjdDogb2JqZWN0O1xuICAgIGJ1ZmZlcjogQXJyYXlCdWZmZXI7XG4gICAgYmluYXJ5OiBVaW50OEFycmF5O1xuICAgIGJsb2I6IEJsb2I7XG59XG5cbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZURhdGFUeXBlcyA9IFR5cGVzPFNlcmlhbGl6YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVJbnB1dERhdGFUeXBlcyA9IFNlcmlhbGl6YWJsZURhdGFUeXBlcyB8IG51bGwgfCB1bmRlZmluZWQ7XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVLZXlzID0gS2V5czxTZXJpYWxpemFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlQ2FzdGFibGUgPSBPbWl0PFNlcmlhbGl6YWJsZSwgJ2J1ZmZlcicgfCAnYmluYXJ5JyB8ICdibG9iJz47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzID0gVHlwZXM8U2VyaWFsaXphYmxlQ2FzdGFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlUmV0dXJuVHlwZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcz4gPSBUeXBlVG9LZXk8U2VyaWFsaXphYmxlQ2FzdGFibGUsIFQ+IGV4dGVuZHMgbmV2ZXIgPyBuZXZlciA6IFQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6YWJsZSBvcHRpb25zIGludGVyZmFjZS5cbiAqIEBqYSDjg4fjgrfjg6rjgqLjg6njgqTjgrrjgavkvb/nlKjjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZXNlcmlhbGl6ZU9wdGlvbnM8VCBleHRlbmRzIFNlcmlhbGl6YWJsZSA9IFNlcmlhbGl6YWJsZSwgSyBleHRlbmRzIEtleXM8VD4gPSBLZXlzPFQ+PiBleHRlbmRzIENhbmNlbGFibGUge1xuICAgIC8qKiB7QGxpbmsgU2VyaWFsaXphYmxlS2V5c30gKi9cbiAgICBkYXRhVHlwZT86IEs7XG59XG5cbi8qKlxuICogQGVuIFNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OCt+ODquOCouODqeOCpOOCulxuICpcbiAqIEBwYXJhbSBkYXRhIGlucHV0XG4gKiBAcGFyYW0gb3B0aW9ucyBibG9iIGNvbnZlcnQgb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVJbnB1dERhdGFUeXBlcz4oZGF0YTogVCwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgYXdhaXQgY2MoY2FuY2VsKTtcbiAgICBpZiAobnVsbCA9PSBkYXRhKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlclRvRGF0YVVSTChkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBVaW50OEFycmF5KSB7XG4gICAgICAgIHJldHVybiBiaW5hcnlUb0RhdGFVUkwoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICByZXR1cm4gYmxvYlRvRGF0YVVSTChkYXRhLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YShkYXRhKSE7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OBruW+qeWFg1xuICpcbiAqIEBwYXJhbSB2YWx1ZSBpbnB1dCBzdHJpbmcgb3IgdW5kZWZpbmVkLlxuICogQHBhcmFtIG9wdGlvbnMgZGVzZXJpYWxpemUgb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXMgPSBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzPihcbiAgICB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zPzogRGVzZXJpYWxpemVPcHRpb25zPFNlcmlhbGl6YWJsZSwgbmV2ZXI+XG4pOiBQcm9taXNlPFNlcmlhbGl6YWJsZVJldHVyblR5cGU8VD4+O1xuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OBruW+qeWFg1xuICpcbiAqIEBwYXJhbSB2YWx1ZSBpbnB1dCBzdHJpbmcgb3IgdW5kZWZpbmVkLlxuICogQHBhcmFtIG9wdGlvbnMgZGVzZXJpYWxpemUgb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUtleXM+KHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM6IERlc2VyaWFsaXplT3B0aW9uczxTZXJpYWxpemFibGUsIFQ+KTogUHJvbWlzZTxTZXJpYWxpemFibGVbVF0gfCBudWxsIHwgdW5kZWZpbmVkPjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlc2VyaWFsaXplKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBEZXNlcmlhbGl6ZU9wdGlvbnMpOiBQcm9taXNlPFNlcmlhbGl6YWJsZURhdGFUeXBlcyB8IG51bGwgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCB7IGRhdGFUeXBlLCBjYW5jZWwgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgYXdhaXQgY2MoY2FuY2VsKTtcblxuICAgIGNvbnN0IGRhdGEgPSByZXN0b3JlTnVsbGlzaCh0b1R5cGVkRGF0YSh2YWx1ZSkpO1xuICAgIHN3aXRjaCAoZGF0YVR5cGUpIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKGRhdGEpO1xuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgcmV0dXJuIE51bWJlcihkYXRhKTtcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICByZXR1cm4gQm9vbGVhbihkYXRhKTtcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2J1ZmZlcic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQnVmZmVyKGZyb21UeXBlZERhdGEoZGF0YSkhKTtcbiAgICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CaW5hcnkoZnJvbVR5cGVkRGF0YShkYXRhKSEpO1xuICAgICAgICBjYXNlICdibG9iJzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CbG9iKGZyb21UeXBlZERhdGEoZGF0YSkhKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFVSTCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYmxvYk1hcCA9IG5ldyBXZWFrTWFwPEJsb2IsIHN0cmluZz4oKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3VybFNldCAgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuLyoqXG4gKiBAZW4gYEJsb2IgVVJMYCB1dGlsaXR5IGZvciBhdXRvbWF0aWMgbWVtb3J5IG1hbmVnZW1lbnQuXG4gKiBAamEg44Oh44Oi44Oq6Ieq5YuV566h55CG44KS6KGM44GGIGBCbG9iIFVSTGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCbG9iVVJMIHtcbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZXMuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBruani+eviVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlKC4uLmJsb2JzOiBCbG9iW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIGJsb2JzKSB7XG4gICAgICAgICAgICBjb25zdCBjYWNoZSA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChiKTtcbiAgICAgICAgICAgIF9ibG9iTWFwLnNldChiLCB1cmwpO1xuICAgICAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYEJsb2IgVVJMYCBjYWNoZS5cbiAgICAgKiBAamEg44GZ44G544Gm44GuIGBCbG9iIFVSTGAg44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhcigpOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgX3VybFNldCkge1xuICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIF91cmxTZXQuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44Gu5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZXQoYmxvYjogQmxvYik6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gX2Jsb2JNYXAuZ2V0KGJsb2IpO1xuICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICBfYmxvYk1hcC5zZXQoYmxvYiwgdXJsKTtcbiAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYEJsb2IgVVJMYCBpcyBhdmFpbGFibGUgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44GM5pyJ5Yq55YyW5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBoYXMoYmxvYjogQmxvYik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gX2Jsb2JNYXAuaGFzKGJsb2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXZva2UgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlcy5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44KS54Sh5Yq55YyWXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyByZXZva2UoLi4uYmxvYnM6IEJsb2JbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGIgb2YgYmxvYnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgX2Jsb2JNYXAuZGVsZXRlKGIpO1xuICAgICAgICAgICAgICAgIF91cmxTZXQuZGVsZXRlKHVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIEFKQVggPSBDRFBfS05PV05fTU9EVUxFLkFKQVggKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgQUpBWF9ERUNMQVJFICAgICAgICA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfQUpBWF9SRVNQT05TRSA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFKQVggKyAxLCAnbmV0d29yayBlcnJvci4nKSxcbiAgICAgICAgRVJST1JfQUpBWF9USU1FT1VUICA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLkFKQVggKyAyLCAncmVxdWVzdCB0aW1lb3V0LicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBGb3JtRGF0YSAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuRm9ybURhdGEpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgSGVhZGVycyAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkhlYWRlcnMpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgQWJvcnRDb250cm9sbGVyID0gc2FmZShnbG9iYWxUaGlzLkFib3J0Q29udHJvbGxlcik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBVUkxTZWFyY2hQYXJhbXMgPSBzYWZlKGdsb2JhbFRoaXMuVVJMU2VhcmNoUGFyYW1zKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFhNTEh0dHBSZXF1ZXN0ICA9IHNhZmUoZ2xvYmFsVGhpcy5YTUxIdHRwUmVxdWVzdCk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBmZXRjaCAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuZmV0Y2gpO1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFBsYWluT2JqZWN0LFxuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNOdW1lcmljLFxuICAgIGFzc2lnblZhbHVlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgVVJMU2VhcmNoUGFyYW1zIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIGVuc3VyZSBzdHJpbmcgdmFsdWUgKi9cbmNvbnN0IGVuc3VyZVBhcmFtVmFsdWUgPSAocHJvcDogdW5rbm93bik6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBpc0Z1bmN0aW9uKHByb3ApID8gcHJvcCgpIDogcHJvcDtcbiAgICByZXR1cm4gdW5kZWZpbmVkICE9PSB2YWx1ZSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFBsYWluT2JqZWN0YCB0byBxdWVyeSBzdHJpbmdzLlxuICogQGphIGBQbGFpbk9iamVjdGAg44KS44Kv44Ko44Oq44K544OI44Oq44Oz44Kw44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCB0b1F1ZXJ5U3RyaW5ncyA9IChkYXRhOiBQbGFpbk9iamVjdCk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgcGFyYW1zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZW5zdXJlUGFyYW1WYWx1ZShkYXRhW2tleV0pO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHBhcmFtcy5wdXNoKGAke2VuY29kZVVSSUNvbXBvbmVudChrZXkpfT0ke2VuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSl9YCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcy5qb2luKCcmJyk7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gQWpheCBwYXJhbWV0ZXJzIG9iamVjdC5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkiBBamF4IOODkeODqeODoeODvOOCv+OCquODluOCuOOCp+OCr+ODiOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgdG9BamF4UGFyYW1zID0gKGRhdGE6IFBsYWluT2JqZWN0KTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9PiB7XG4gICAgY29uc3QgcGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBlbnN1cmVQYXJhbVZhbHVlKGRhdGFba2V5XSk7XG4gICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgYXNzaWduVmFsdWUocGFyYW1zLCBrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBVUkwgcGFyYW1ldGVycyB0byBwcmltaXRpdmUgdHlwZS5cbiAqIEBqYSBVUkwg44OR44Op44Oh44O844K/44KSIHByaW1pdGl2ZSDjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IGNvbnZlcnRVcmxQYXJhbVR5cGUgPSAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsID0+IHtcbiAgICBpZiAoaXNOdW1lcmljKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gTnVtYmVyKHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKCd0cnVlJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgnZmFsc2UnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICgnbnVsbCcgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQGVuIFBhcnNlIHVybCBxdWVyeSBHRVQgcGFyYW1ldGVycy5cbiAqIEBqYSBVUkzjgq/jgqjjg6rjga5HRVTjg5Hjg6njg6Hjg7zjgr/jgpLop6PmnpBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IHVybCA9ICcvcGFnZS8/aWQ9NSZmb289YmFyJmJvb2w9dHJ1ZSc7XG4gKiBjb25zdCBxdWVyeSA9IHBhcnNlVXJsUXVlcnkodXJsKTtcbiAqIC8vIHsgaWQ6IDUsIGZvbzogJ2JhcicsIGJvb2w6IHRydWUgfVxuICogYGBgXG4gKlxuICogQHJldHVybnMgeyBrZXk6IHZhbHVlIH0gb2JqZWN0LlxuICovXG5leHBvcnQgY29uc3QgcGFyc2VVcmxRdWVyeSA9IDxUID0gUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGw+Pih1cmw6IHN0cmluZyk6IFQgPT4ge1xuICAgIGNvbnN0IHF1ZXJ5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXModXJsLmluY2x1ZGVzKCc/JykgPyB1cmwuc3BsaXQoJz8nKVsxXSA6IHVybCk7XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgcGFyYW1zKSB7XG4gICAgICAgIHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChrZXkpXSA9IGNvbnZlcnRVcmxQYXJhbVR5cGUodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gcXVlcnkgYXMgVDtcbn07XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIHR5cGUgQWNjZXNzaWJsZSxcbiAgICB0eXBlIEtleXMsXG4gICAgaXNGdW5jdGlvbixcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHR5cGUgU3Vic2NyaWJhYmxlLCBFdmVudFNvdXJjZSB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB0eXBlIHsgQWpheERhdGFTdHJlYW1FdmVudCwgQWpheERhdGFTdHJlYW0gfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogQGludGVybmFsIFByb3h5SGFuZGxlciBoZWxwZXIgKi9cbmNvbnN0IF9leGVjR2V0RGVmYXVsdCA9ICh0YXJnZXQ6IGFueSwgcHJvcDogc3RyaW5nIHwgc3ltYm9sKTogYW55ID0+IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgaWYgKHByb3AgaW4gdGFyZ2V0KSB7XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKHRhcmdldFtwcm9wXSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcF0uYmluZCh0YXJnZXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wXTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9zdWJzY3JpYmFibGVNZXRob2RzOiBLZXlzPFN1YnNjcmliYWJsZT5bXSA9IFtcbiAgICAnaGFzTGlzdGVuZXInLFxuICAgICdjaGFubmVscycsXG4gICAgJ29uJyxcbiAgICAnb2ZmJyxcbiAgICAnb25jZScsXG5dO1xuXG5leHBvcnQgY29uc3QgdG9BamF4RGF0YVN0cmVhbSA9IChzZWVkOiBCbG9iIHwgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4sIGxlbmd0aD86IG51bWJlcik6IEFqYXhEYXRhU3RyZWFtID0+IHtcbiAgICBsZXQgbG9hZGVkID0gMDtcbiAgICBjb25zdCBbc3RyZWFtLCB0b3RhbF0gPSAoKCkgPT4ge1xuICAgICAgICBpZiAoc2VlZCBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgICAgICAgIHJldHVybiBbc2VlZC5zdHJlYW0oKSwgc2VlZC5zaXplXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbc2VlZCwgbGVuZ3RoICE9IG51bGwgPyBNYXRoLnRydW5jKGxlbmd0aCkgOiBOYU5dO1xuICAgICAgICB9XG4gICAgfSkoKTtcblxuICAgIGNvbnN0IF9ldmVudFNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZTxBamF4RGF0YVN0cmVhbUV2ZW50PigpIGFzIEFjY2Vzc2libGU8RXZlbnRTb3VyY2U8QWpheERhdGFTdHJlYW1FdmVudD4sIFVua25vd25GdW5jdGlvbj47XG5cbiAgICBjb25zdCBfcHJveHlSZWFkZXJIYW5kbGVyOiBQcm94eUhhbmRsZXI8UmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+PiA9IHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXI8VWludDhBcnJheT4sIHByb3A6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKCdyZWFkJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSB0YXJnZXQucmVhZCgpO1xuICAgICAgICAgICAgICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBkb25lLCB2YWx1ZTogY2h1bmsgfSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICAgICAgICAgIGNodW5rICYmIChsb2FkZWQgKz0gY2h1bmsubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgX2V2ZW50U291cmNlLnRyaWdnZXIoJ3Byb2dyZXNzJywgT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wdXRhYmxlOiAhTnVtYmVyLmlzTmFOKHRvdGFsKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNodW5rLFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gcHJvbWlzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9leGVjR2V0RGVmYXVsdCh0YXJnZXQsIHByb3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH07XG5cbiAgICByZXR1cm4gbmV3IFByb3h5KHN0cmVhbSwge1xuICAgICAgICBnZXQ6ICh0YXJnZXQ6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICgnZ2V0UmVhZGVyJyA9PT0gcHJvcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoKSA9PiBuZXcgUHJveHkodGFyZ2V0LmdldFJlYWRlcigpLCBfcHJveHlSZWFkZXJIYW5kbGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJ2xlbmd0aCcgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF9zdWJzY3JpYmFibGVNZXRob2RzLmluY2x1ZGVzKHByb3AgYXMgS2V5czxTdWJzY3JpYmFibGU+KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoLi4uYXJnczogdW5rbm93bltdKSA9PiBfZXZlbnRTb3VyY2VbcHJvcF0oLi4uYXJncyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBfZXhlY0dldERlZmF1bHQodGFyZ2V0LCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9KSBhcyBBamF4RGF0YVN0cmVhbTtcbn07XG4iLCJpbXBvcnQgeyBpc051bWJlciB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF90aW1lb3V0OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbmV4cG9ydCBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICBnZXQgdGltZW91dCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX3RpbWVvdXQ7XG4gICAgfSxcbiAgICBzZXQgdGltZW91dCh2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIF90aW1lb3V0ID0gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xuICAgIH0sXG59O1xuIiwiaW1wb3J0IHsgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgUkVTVUxUX0NPREUsIG1ha2VSZXN1bHQgfSBmcm9tICdAY2RwL3Jlc3VsdCc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICdAY2RwL2JpbmFyeSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgQWpheERhdGFUeXBlcyxcbiAgICBBamF4T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBGb3JtRGF0YSxcbiAgICBIZWFkZXJzLFxuICAgIEFib3J0Q29udHJvbGxlcixcbiAgICBVUkxTZWFyY2hQYXJhbXMsXG4gICAgZmV0Y2gsXG59IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IHRvUXVlcnlTdHJpbmdzLCB0b0FqYXhQYXJhbXMgfSBmcm9tICcuL3BhcmFtcyc7XG5pbXBvcnQgeyB0b0FqYXhEYXRhU3RyZWFtIH0gZnJvbSAnLi9zdHJlYW0nO1xuaW1wb3J0IHsgc2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgQWpheEhlYWRlck9wdGlvbnMgPSBQaWNrPEFqYXhPcHRpb25zPEFqYXhEYXRhVHlwZXM+LCAnaGVhZGVycycgfCAnbWV0aG9kJyB8ICdjb250ZW50VHlwZScgfCAnZGF0YVR5cGUnIHwgJ21vZGUnIHwgJ2JvZHknIHwgJ3VzZXJuYW1lJyB8ICdwYXNzd29yZCc+O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfYWNjZXB0SGVhZGVyTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgIHRleHQ6ICd0ZXh0L3BsYWluLCB0ZXh0L2h0bWwsIGFwcGxpY2F0aW9uL3htbDsgcT0wLjgsIHRleHQveG1sOyBxPTAuOCwgKi8qOyBxPTAuMDEnLFxuICAgIGpzb246ICdhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L2phdmFzY3JpcHQsICovKjsgcT0wLjAxJyxcbn07XG5cbi8qKlxuICogQGVuIFNldHVwIGBoZWFkZXJzYCBmcm9tIG9wdGlvbnMgcGFyYW1ldGVyLlxuICogQGphIOOCquODl+OCt+ODp+ODs+OBi+OCiSBgaGVhZGVyc2Ag44KS6Kit5a6aXG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEhlYWRlcnMob3B0aW9uczogQWpheEhlYWRlck9wdGlvbnMpOiBIZWFkZXJzIHtcbiAgICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKTtcbiAgICBjb25zdCB7IG1ldGhvZCwgY29udGVudFR5cGUsIGRhdGFUeXBlLCBtb2RlLCBib2R5LCB1c2VybmFtZSwgcGFzc3dvcmQgfSA9IG9wdGlvbnM7XG5cbiAgICAvLyBDb250ZW50LVR5cGVcbiAgICBpZiAoJ1BPU1QnID09PSBtZXRob2QgfHwgJ1BVVCcgPT09IG1ldGhvZCB8fCAnUEFUQ0gnID09PSBtZXRob2QpIHtcbiAgICAgICAgLypcbiAgICAgICAgICogZmV0Y2goKSDjga7loLTlkIgsIEZvcm1EYXRhIOOCkuiHquWLleino+mHiOOBmeOCi+OBn+OCgSwg5oyH5a6a44GM44GC44KL5aC05ZCI44Gv5YmK6ZmkXG4gICAgICAgICAqIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM1MTkyODQxL2ZldGNoLXBvc3Qtd2l0aC1tdWx0aXBhcnQtZm9ybS1kYXRhXG4gICAgICAgICAqIGh0dHBzOi8vbXVmZmlubWFuLmlvL3VwbG9hZGluZy1maWxlcy11c2luZy1mZXRjaC1tdWx0aXBhcnQtZm9ybS1kYXRhL1xuICAgICAgICAgKi9cbiAgICAgICAgaWYgKGhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSAmJiBib2R5IGluc3RhbmNlb2YgRm9ybURhdGEpIHtcbiAgICAgICAgICAgIGhlYWRlcnMuZGVsZXRlKCdDb250ZW50LVR5cGUnKTtcbiAgICAgICAgfSBlbHNlIGlmICghaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpKSB7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSBjb250ZW50VHlwZSAmJiAnanNvbicgPT09IGRhdGFUeXBlISkge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChudWxsICE9IGNvbnRlbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycy5zZXQoJ0NvbnRlbnQtVHlwZScsIGNvbnRlbnRUeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFjY2VwdFxuICAgIGlmICghaGVhZGVycy5nZXQoJ0FjY2VwdCcpKSB7XG4gICAgICAgIGhlYWRlcnMuc2V0KCdBY2NlcHQnLCBfYWNjZXB0SGVhZGVyTWFwW2RhdGFUeXBlIV0gfHwgJyovKicpO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogWC1SZXF1ZXN0ZWQtV2l0aFxuICAgICAqIOmdnuaomea6luODmOODg+ODgOODvOOBp+OBguOCi+OBn+OCgSwg5pei5a6a44Gn44GvIGNvcnMg44GuIHByZWZsaWdodCByZXNwb25zZSDjgafoqLHlj6/jgZXjgozjgarjgYRcbiAgICAgKiDjgb7jgZ8gbW9kZSDjga7ml6LlrprlgKTjga8gY29ycyDjgafjgYLjgovjgZ/jgoEsIOacieWKueOBq+OBmeOCi+OBq+OBryBtb2RlIOOBruaYjuekuueahOaMh+WumuOBjOW/heimgeOBqOOBquOCi1xuICAgICAqL1xuICAgIGlmIChtb2RlICYmICdjb3JzJyAhPT0gbW9kZSAmJiAhaGVhZGVycy5nZXQoJ1gtUmVxdWVzdGVkLVdpdGgnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnWC1SZXF1ZXN0ZWQtV2l0aCcsICdYTUxIdHRwUmVxdWVzdCcpO1xuICAgIH1cblxuICAgIC8vIEJhc2ljIEF1dGhvcml6YXRpb25cbiAgICBpZiAobnVsbCAhPSB1c2VybmFtZSAmJiAhaGVhZGVycy5nZXQoJ0F1dGhvcml6YXRpb24nKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQXV0aG9yaXphdGlvbicsIGBCYXNpYyAke0Jhc2U2NC5lbmNvZGUoYCR7dXNlcm5hbWV9OiR7cGFzc3dvcmQgPz8gJyd9YCl9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhlYWRlcnM7XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm0gYW4gYXN5bmNocm9ub3VzIEhUVFAgKEFqYXgpIHJlcXVlc3QuXG4gKiBAamEgSFRUUCAoQWpheCnjg6rjgq/jgqjjgrnjg4jjga7pgIHkv6FcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBBamF4IHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuYXN5bmMgZnVuY3Rpb24gYWpheDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdyZXNwb25zZSc+KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheE9wdGlvbnM8VD4pOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IGFib3J0ID0gKCk6IHZvaWQgPT4gY29udHJvbGxlci5hYm9ydCgpO1xuXG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ3Jlc3BvbnNlJyxcbiAgICAgICAgdGltZW91dDogc2V0dGluZ3MudGltZW91dCxcbiAgICB9LCBvcHRpb25zLCB7XG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsIC8vIGZvcmNlIG92ZXJyaWRlXG4gICAgfSk7XG5cbiAgICBjb25zdCB7IGNhbmNlbDogb3JpZ2luYWxUb2tlbiwgdGltZW91dCB9ID0gb3B0cztcblxuICAgIC8vIGNhbmNlbGxhdGlvblxuICAgIGlmIChvcmlnaW5hbFRva2VuKSB7XG4gICAgICAgIGlmIChvcmlnaW5hbFRva2VuLnJlcXVlc3RlZCkge1xuICAgICAgICAgICAgdGhyb3cgb3JpZ2luYWxUb2tlbi5yZWFzb247XG4gICAgICAgIH1cbiAgICAgICAgb3JpZ2luYWxUb2tlbi5yZWdpc3RlcihhYm9ydCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlID0gQ2FuY2VsVG9rZW4uc291cmNlKG9yaWdpbmFsVG9rZW4hKTtcbiAgICBjb25zdCB7IHRva2VuIH0gPSBzb3VyY2U7XG4gICAgdG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuXG4gICAgLy8gdGltZW91dFxuICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gc291cmNlLmNhbmNlbChtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfVElNRU9VVCwgJ3JlcXVlc3QgdGltZW91dCcpKSwgdGltZW91dCk7XG4gICAgfVxuXG4gICAgLy8gbm9ybWFsaXplXG4gICAgb3B0cy5tZXRob2QgPSBvcHRzLm1ldGhvZC50b1VwcGVyQ2FzZSgpO1xuXG4gICAgLy8gaGVhZGVyXG4gICAgb3B0cy5oZWFkZXJzID0gc2V0dXBIZWFkZXJzKG9wdHMpO1xuXG4gICAgLy8gcGFyc2UgcGFyYW1cbiAgICBjb25zdCB7IG1ldGhvZCwgZGF0YSwgZGF0YVR5cGUgfSA9IG9wdHM7XG4gICAgaWYgKG51bGwgIT0gZGF0YSkge1xuICAgICAgICBpZiAoKCdHRVQnID09PSBtZXRob2QgfHwgJ0hFQUQnID09PSBtZXRob2QpICYmICF1cmwuaW5jbHVkZXMoJz8nKSkge1xuICAgICAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhkYXRhKX1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0cy5ib2R5ID8/PSBuZXcgVVJMU2VhcmNoUGFyYW1zKHRvQWpheFBhcmFtcyhkYXRhKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBleGVjdXRlXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUoZmV0Y2godXJsLCBvcHRzKSwgdG9rZW4pO1xuICAgIGlmICgncmVzcG9uc2UnID09PSBkYXRhVHlwZSkge1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UgYXMgQWpheFJlc3VsdDxUPjtcbiAgICB9IGVsc2UgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICB0aHJvdyBtYWtlUmVzdWx0KFJFU1VMVF9DT0RFLkVSUk9SX0FKQVhfUkVTUE9OU0UsIHJlc3BvbnNlLnN0YXR1c1RleHQsIHJlc3BvbnNlKTtcbiAgICB9IGVsc2UgaWYgKCdzdHJlYW0nID09PSBkYXRhVHlwZSkge1xuICAgICAgICByZXR1cm4gdG9BamF4RGF0YVN0cmVhbShcbiAgICAgICAgICAgIHJlc3BvbnNlLmJvZHkhLFxuICAgICAgICAgICAgTnVtYmVyKHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LWxlbmd0aCcpKSxcbiAgICAgICAgKSBhcyBBamF4UmVzdWx0PFQ+O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3BvbnNlW2RhdGFUeXBlIGFzIEV4Y2x1ZGU8QWpheERhdGFUeXBlcywgJ3Jlc3BvbnNlJyB8ICdzdHJlYW0nPl0oKSwgdG9rZW4pO1xuICAgIH1cbn1cblxuYWpheC5zZXR0aW5ncyA9IHNldHRpbmdzO1xuXG5leHBvcnQgeyBhamF4IH07XG4iLCJpbXBvcnQgdHlwZSB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHR5cGUge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlcXVlc3RPcHRpb25zLFxuICAgIEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zLFxuICAgIEFqYXhSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBhamF4LCBzZXR1cEhlYWRlcnMgfSBmcm9tICcuL2NvcmUnO1xuaW1wb3J0IHsgdG9RdWVyeVN0cmluZ3MgfSBmcm9tICcuL3BhcmFtcyc7XG5pbXBvcnQgeyBYTUxIdHRwUmVxdWVzdCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW5zdXJlRGF0YVR5cGUgPSAoZGF0YVR5cGU/OiBBamF4RGF0YVR5cGVzKTogQWpheERhdGFUeXBlcyA9PiB7XG4gICAgcmV0dXJuIGRhdGFUeXBlID8/ICdqc29uJztcbn07XG5cbi8qKlxuICogQGVuIGBHRVRgIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844GL44KJ6L+U44GV44KM44KL5pyf5b6F44GZ44KL44OH44O844K/44Gu5Z6L44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuY29uc3QgZ2V0ID0gPFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzIHwgb2JqZWN0ID0gJ2pzb24nPihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicsXG4gICAgb3B0aW9ucz86IEFqYXhSZXF1ZXN0T3B0aW9uc1xuKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiA9PiB7XG4gICAgcmV0dXJuIGFqYXgodXJsLCB7IC4uLm9wdGlvbnMsIG1ldGhvZDogJ0dFVCcsIGRhdGEsIGRhdGFUeXBlOiBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSkgfSBhcyBBamF4T3B0aW9uczxUPik7XG59O1xuXG4vKipcbiAqIEBlbiBgR0VUYCB0ZXh0IHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAg44OG44Kt44K544OI44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmNvbnN0IHRleHQgPSAodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyk6IFByb21pc2U8QWpheFJlc3VsdDwndGV4dCc+PiA9PiB7XG4gICAgcmV0dXJuIGdldCh1cmwsIHVuZGVmaW5lZCwgJ3RleHQnLCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQGVuIGBHRVRgIEpTT04gcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCBKU09OIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5jb25zdCBqc29uID0gPFQgZXh0ZW5kcyAnanNvbicgfCBvYmplY3QgPSAnanNvbic+KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+ID0+IHtcbiAgICByZXR1cm4gZ2V0PFQ+KHVybCwgdW5kZWZpbmVkLCAoJ2pzb24nIGFzIFQgZXh0ZW5kcyBBamF4RGF0YVR5cGVzID8gVCA6ICdqc29uJyksIG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBAZW4gYEdFVGAgQmxvYiByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIEJsb2Ig44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmNvbnN0IGJsb2IgPSAodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyk6IFByb21pc2U8QWpheFJlc3VsdDwnYmxvYic+PiA9PiB7XG4gICAgcmV0dXJuIGdldCh1cmwsIHVuZGVmaW5lZCwgJ2Jsb2InLCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQGVuIGBQT1NUYCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBQT1NUYCDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuY29uc3QgcG9zdCA9IDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YTogUGxhaW5PYmplY3QsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicsXG4gICAgb3B0aW9ucz86IEFqYXhSZXF1ZXN0T3B0aW9uc1xuKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiA9PiB7XG4gICAgcmV0dXJuIGFqYXgodXJsLCB7IC4uLm9wdGlvbnMsIG1ldGhvZDogJ1BPU1QnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufTtcblxuLyoqXG4gKiBAZW4gU3luY2hyb25vdXMgYEdFVGAgcmVxdWVzdCBmb3IgcmVzb3VyY2UgYWNjZXNzLiA8YnI+XG4gKiAgICAgTWFueSBicm93c2VycyBoYXZlIGRlcHJlY2F0ZWQgc3luY2hyb25vdXMgWEhSIHN1cHBvcnQgb24gdGhlIG1haW4gdGhyZWFkIGVudGlyZWx5LlxuICogQGphIOODquOCveODvOOCueWPluW+l+OBruOBn+OCgeOBriDlkIzmnJ8gYEdFVGAg44Oq44Kv44Ko44K544OILiA8YnI+XG4gKiAgICAg5aSa44GP44Gu44OW44Op44Km44K244Gn44Gv44Oh44Kk44Oz44K544Os44OD44OJ44Gr44GK44GR44KL5ZCM5pyf55qE44GqIFhIUiDjga7lr77lv5zjgpLlhajpnaLnmoTjgavpnZ7mjqjlpajjgajjgZfjgabjgYTjgovjga7jgafnqY3mpbXkvb/nlKjjga/pgb/jgZHjgovjgZPjgaguXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFUeXBlXG4gKiAgLSBgZW5gIFRoZSB0eXBlIG9mIGRhdGEgdGhhdCB5b3UncmUgZXhwZWN0aW5nIGJhY2sgZnJvbSB0aGUgc2VydmVyLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gZGF0YVxuICogIC0gYGVuYCBEYXRhIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAg44K144O844OQ44O844Gr6YCB5L+h44GV44KM44KL44OH44O844K/LlxuICovXG5jb25zdCByZXNvdXJjZSA9IDxUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPihcbiAgICB1cmw6IHN0cmluZyxcbiAgICBkYXRhVHlwZT86IFQgZXh0ZW5kcyAndGV4dCcgfCAnanNvbicgPyBUIDogJ2pzb24nLFxuICAgIGRhdGE/OiBQbGFpbk9iamVjdCxcbik6IEFqYXhSZXN1bHQ8VD4gPT4ge1xuICAgIGNvbnN0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgaWYgKG51bGwgIT0gZGF0YSAmJiAhdXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgdXJsICs9IGA/JHt0b1F1ZXJ5U3RyaW5ncyhkYXRhKX1gO1xuICAgIH1cblxuICAgIC8vIHN5bmNocm9ub3VzXG4gICAgeGhyLm9wZW4oJ0dFVCcsIHVybCwgZmFsc2UpO1xuXG4gICAgY29uc3QgdHlwZSA9IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKTtcbiAgICBjb25zdCBoZWFkZXJzID0gc2V0dXBIZWFkZXJzKHsgbWV0aG9kOiAnR0VUJywgZGF0YVR5cGU6IHR5cGUgfSk7XG4gICAgaGVhZGVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgeGhyLnNlbmQobnVsbCk7XG4gICAgaWYgKCEoMjAwIDw9IHhoci5zdGF0dXMgJiYgeGhyLnN0YXR1cyA8IDMwMCkpIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFLCB4aHIuc3RhdHVzVGV4dCwgeGhyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJ2pzb24nID09PSB0eXBlID8gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2UpIDogeGhyLnJlc3BvbnNlO1xufTtcblxuZXhwb3J0IGNvbnN0IHJlcXVlc3QgPSB7XG4gICAgZ2V0LFxuICAgIHRleHQsXG4gICAganNvbixcbiAgICBibG9iLFxuICAgIHBvc3QsXG4gICAgcmVzb3VyY2UsXG59O1xuIiwiaW1wb3J0IHtcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzU3RyaW5nLFxuICAgIGNsYXNzTmFtZSxcbiAgICBzYWZlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKipcbiAqIEBlbiB7QGxpbmsgSW5saW5lV29ya2VyfSBzb3VyY2UgdHlwZSBkZWZpbml0aW9uLlxuICogQGphIHtAbGluayBJbmxpbmVXb3JrZXJ9IOOBq+aMh+WumuWPr+iDveOBquOCveODvOOCueWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBJbmxpZW5Xb3JrZXJTb3VyY2UgPSAoKHNlbGY6IFdvcmtlcikgPT4gdW5rbm93bikgfCBzdHJpbmc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgVVJMICAgID0gc2FmZShnbG9iYWxUaGlzLlVSTCk7XG4vKiogQGludGVybmFsICovIGNvbnN0IFdvcmtlciA9IHNhZmUoZ2xvYmFsVGhpcy5Xb3JrZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBCbG9iICAgPSBzYWZlKGdsb2JhbFRoaXMuQmxvYik7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGNyZWF0ZVdvcmtlckNvbnRleHQoc3JjOiBJbmxpZW5Xb3JrZXJTb3VyY2UpOiBzdHJpbmcge1xuICAgIGlmICghKGlzRnVuY3Rpb24oc3JjKSB8fCBpc1N0cmluZyhzcmMpKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGAke2NsYXNzTmFtZShzcmMpfSBpcyBub3QgYSBmdW5jdGlvbiBvciBzdHJpbmcuYCk7XG4gICAgfVxuICAgIHJldHVybiBVUkwuY3JlYXRlT2JqZWN0VVJMKG5ldyBCbG9iKFtpc0Z1bmN0aW9uKHNyYykgPyBgKCR7c3JjLnRvU3RyaW5nKCl9KShzZWxmKTtgIDogc3JjXSwgeyB0eXBlOiAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcgfSkpO1xufVxuXG4vKipcbiAqIEBlbiBTcGVjaWZpZWQgYFdvcmtlcmAgY2xhc3Mgd2hpY2ggZG9lc24ndCByZXF1aXJlIGEgc2NyaXB0IGZpbGUuXG4gKiBAamEg44K544Kv44Oq44OX44OI44OV44Kh44Kk44Or44KS5b+F6KaB44Go44GX44Gq44GEIGBXb3JrZXJgIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgSW5saW5lV29ya2VyIGV4dGVuZHMgV29ya2VyIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfY29udGV4dDogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzcmNcbiAgICAgKiAgLSBgZW5gIHNvdXJjZSBmdW5jdGlvbiBvciBzY3JpcHQgYm9keS5cbiAgICAgKiAgLSBgamFgIOWun+ihjOmWouaVsOOBvuOBn+OBr+OCueOCr+ODquODl+ODiOWun+S9k1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB3b3JrZXIgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFdvcmtlciDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzcmM6IElubGllbldvcmtlclNvdXJjZSwgb3B0aW9ucz86IFdvcmtlck9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGNyZWF0ZVdvcmtlckNvbnRleHQoc3JjKTtcbiAgICAgICAgc3VwZXIoY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOiBXb3JrZXJcblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3IgQkxPQiByZWxlYXNlLiBXaGVuIGNhbGxpbmcgYGNsb3NlICgpYCBpbiB0aGUgV29ya2VyLCBjYWxsIHRoaXMgbWV0aG9kIGFzIHdlbGwuXG4gICAgICogQGphIEJMT0Ig6Kej5pS+55SoLiBXb3JrZXIg5YaF44GnIGBjbG9zZSgpYCDjgpLlkbzjgbbloLTlkIgsIOacrOODoeOCveODg+ODieOCguOCs+ODvOODq+OBmeOCi+OBk+OBqC5cbiAgICAgKi9cbiAgICB0ZXJtaW5hdGUoKTogdm9pZCB7XG4gICAgICAgIHN1cGVyLnRlcm1pbmF0ZSgpO1xuICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bkZ1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHR5cGUgQ2FuY2VsYWJsZSwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgSW5saW5lV29ya2VyIH0gZnJvbSAnLi9pbmluZS13b3JrZXInO1xuXG4vKipcbiAqIEBlbiBUaHJlYWQgb3B0aW9uc1xuICogQGVuIOOCueODrOODg+ODieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRocmVhZE9wdGlvbnM8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4gZXh0ZW5kcyBDYW5jZWxhYmxlLCBXb3JrZXJPcHRpb25zIHtcbiAgICBhcmdzPzogUGFyYW1ldGVyczxUPjtcbn1cblxuLyoqXG4gKiBAZW4gRW5zdXJlIGV4ZWN1dGlvbiBpbiB3b3JrZXIgdGhyZWFkLlxuICogQGphIOODr+ODvOOCq+ODvOOCueODrOODg+ODieWGheOBp+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgZXhlYyA9IChhcmcxOiBudW1iZXIsIGFyZzI6IHN0cmluZykgPT4ge1xuICogICAgLy8gdGhpcyBzY29wZSBpcyB3b3JrZXIgc2NvcGUuIHlvdSBjYW5ub3QgdXNlIGNsb3N1cmUgYWNjZXNzLlxuICogICAgY29uc3QgcGFyYW0gPSB7Li4ufTtcbiAqICAgIGNvbnN0IG1ldGhvZCA9IChwKSA9PiB7Li4ufTtcbiAqICAgIC8vIHlvdSBjYW4gYWNjZXNzIGFyZ3VtZW50cyBmcm9tIG9wdGlvbnMuXG4gKiAgICBjb25zb2xlLmxvZyhhcmcxKTsgLy8gJzEnXG4gKiAgICBjb25zb2xlLmxvZyhhcmcyKTsgLy8gJ3Rlc3QnXG4gKiAgICA6XG4gKiAgICByZXR1cm4gbWV0aG9kKHBhcmFtKTtcbiAqIH07XG4gKlxuICogY29uc3QgYXJnMSA9IDE7XG4gKiBjb25zdCBhcmcyID0gJ3Rlc3QnO1xuICogY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhyZWFkKGV4ZWMsIHsgYXJnczogW2FyZzEsIGFyZzJdIH0pO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIGltcGxlbWVudCBhcyBmdW5jdGlvbiBzY29wZS5cbiAqICAtIGBqYWAg6Zai5pWw44K544Kz44O844OX44Go44GX44Gm5a6f6KOFXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB0aHJlYWQgb3B0aW9uc1xuICogIC0gYGphYCDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRocmVhZDxULCBVPihleGVjdXRvcjogKC4uLmFyZ3M6IFVbXSkgPT4gVCB8IFByb21pc2U8VD4sIG9wdGlvbnM/OiBUaHJlYWRPcHRpb25zPHR5cGVvZiBleGVjdXRvcj4pOiBQcm9taXNlPFQ+IHtcbiAgICBjb25zdCB7IGNhbmNlbDogb3JpZ2luYWxUb2tlbiwgYXJncyB9ID0gT2JqZWN0LmFzc2lnbih7IGFyZ3M6IFtdIH0sIG9wdGlvbnMpO1xuXG4gICAgLy8gYWxyZWFkeSBjYW5jZWxcbiAgICBpZiAob3JpZ2luYWxUb2tlbj8ucmVxdWVzdGVkKSB7XG4gICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgIH1cblxuICAgIGNvbnN0IGV4ZWMgPSBgKHNlbGYgPT4ge1xuICAgICAgICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBhc3luYyAoeyBkYXRhIH0pID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgKCR7ZXhlY3V0b3IudG9TdHJpbmcoKX0pKC4uLmRhdGEpO1xuICAgICAgICAgICAgICAgIHNlbGYucG9zdE1lc3NhZ2UocmVzdWx0KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlOyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSkoc2VsZik7YDtcblxuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBJbmxpbmVXb3JrZXIoZXhlYywgb3B0aW9ucyk7XG5cbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICBvcmlnaW5hbFRva2VuPy5yZWdpc3RlcihhYm9ydCk7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKG9yaWdpbmFsVG9rZW4hKTtcblxuICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHdvcmtlci5vbmVycm9yID0gZXYgPT4ge1xuICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHJlamVjdChldik7XG4gICAgICAgICAgICB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgICAgIH07XG4gICAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBldiA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKGV2LmRhdGEpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgIH0sIHRva2VuKTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZShhcmdzKTtcblxuICAgIHJldHVybiBwcm9taXNlIGFzIFByb21pc2U8VD47XG59XG4iXSwibmFtZXMiOlsic2FmZSIsIkJsb2IiLCJVUkwiLCJ2ZXJpZnkiLCJDYW5jZWxUb2tlbiIsImNjIiwiZnJvbVR5cGVkRGF0YSIsInJlc3RvcmVOdWxsaXNoIiwidG9UeXBlZERhdGEiLCJpc0Z1bmN0aW9uIiwiYXNzaWduVmFsdWUiLCJpc051bWVyaWMiLCJFdmVudFNvdXJjZSIsImlzTnVtYmVyIiwibWFrZVJlc3VsdCIsIlJFU1VMVF9DT0RFIiwiaXNTdHJpbmciLCJjbGFzc05hbWUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBRUEsaUJBQXdCLE1BQU0sSUFBSSxH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Tzs7OztJQU0zQjs7O0lBR0c7SUFDSCxJQUFBLFNBQVMsR0FBQTtZQUNMLEtBQUssQ0FBQyxTQUFTLEVBQUU7SUFDakIsUUFBQSxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7O0lBRXpDOztJQ2hERDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUE2Qkc7SUFDYSxTQUFBLE1BQU0sQ0FBTyxRQUEwQyxFQUFFLE9BQXdDLEVBQUE7SUFDN0csSUFBQSxNQUFNLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQzs7SUFHNUUsSUFBQSxJQUFJLGFBQWEsRUFBRSxTQUFTLEVBQUU7WUFDMUIsTUFBTSxhQUFhLENBQUMsTUFBTTs7SUFHOUIsSUFBQSxNQUFNLElBQUksR0FBRyxDQUFBOzs7d0NBR3VCLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTs7Ozs7O0FBTTdDLGFBQUEsQ0FBQTtRQUVWLE1BQU0sTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUM7SUFFOUMsSUFBQSxNQUFNLEtBQUssR0FBRyxNQUFZLE1BQU0sQ0FBQyxTQUFTLEVBQUU7SUFDNUMsSUFBQSxhQUFhLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQztRQUM5QixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUdMLG1CQUFXLENBQUMsTUFBTSxDQUFDLGFBQWMsQ0FBQztRQUVwRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUk7SUFDNUMsUUFBQSxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsSUFBRztnQkFDbEIsRUFBRSxDQUFDLGNBQWMsRUFBRTtnQkFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDVixNQUFNLENBQUMsU0FBUyxFQUFFO0lBQ3RCLFNBQUM7SUFDRCxRQUFBLE1BQU0sQ0FBQyxTQUFTLEdBQUcsRUFBRSxJQUFHO0lBQ3BCLFlBQUEsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxTQUFTLEVBQUU7SUFDdEIsU0FBQztJQUNKLEtBQUEsRUFBRSxLQUFLLENBQUM7SUFFVCxJQUFBLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO0lBRXhCLElBQUEsT0FBTyxPQUFxQjtJQUNoQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9saWItd29ya2VyLyJ9