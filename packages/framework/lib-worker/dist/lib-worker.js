/*!
 * @cdp/lib-worker 0.9.20
 *   worker library collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/lib-core')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/lib-core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, libCore) { 'use strict';

    /*!
     * @cdp/binary 0.9.20
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
     * @cdp/ajax 0.9.20
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
     * @cdp/inline-worker 0.9.20
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLXdvcmtlci5qcyIsInNvdXJjZXMiOlsiYmluYXJ5L3Nzci50cyIsImJpbmFyeS9iYXNlNjQudHMiLCJiaW5hcnkvYmxvYi1yZWFkZXIudHMiLCJiaW5hcnkvY29udmVydGVyLnRzIiwiYmluYXJ5L2Jsb2ItdXJsLnRzIiwiYWpheC9yZXN1bHQtY29kZS1kZWZzLnRzIiwiYWpheC9zc3IudHMiLCJhamF4L3BhcmFtcy50cyIsImFqYXgvc3RyZWFtLnRzIiwiYWpheC9zZXR0aW5ncy50cyIsImFqYXgvY29yZS50cyIsImFqYXgvcmVxdWVzdC50cyIsImlubGluZS13b3JrZXIvaW5pbmUtd29ya2VyLnRzIiwiaW5saW5lLXdvcmtlci90aHJlYWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGJ0b2EgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmJ0b2EpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgYXRvYiAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuYXRvYik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBCbG9iICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5CbG9iKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEZpbGVSZWFkZXIgID0gc2FmZShnbG9iYWxUaGlzLkZpbGVSZWFkZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgVVJMICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFRleHRFbmNvZGVyID0gc2FmZShnbG9iYWxUaGlzLlRleHRFbmNvZGVyKTtcbiIsImltcG9ydCB7XG4gICAgVGV4dEVuY29kZXIsXG4gICAgYXRvYixcbiAgICBidG9hLFxufSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIGBiYXNlNjRgIHV0aWxpdHkgZm9yIGluZGVwZW5kZW50IGNoYXJhY3RvciBjb2RlLlxuICogQGphIOaWh+Wtl+OCs+ODvOODieOBq+S+neWtmOOBl+OBquOBhCBgYmFzZTY0YCDjg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2U2NCB7XG4gICAgLyoqXG4gICAgICogQGVuIEVuY29kZSBhIGJhc2UtNjQgZW5jb2RlZCBzdHJpbmcgZnJvbSBhIGJpbmFyeSBzdHJpbmcuXG4gICAgICogQGphIOaWh+Wtl+WIl+OCkiBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB1dGY4Qnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoc3JjKTtcbiAgICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gQXJyYXkuZnJvbSh1dGY4Qnl0ZXMpXG4gICAgICAgICAgICAubWFwKGJ5dGUgPT4gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlKSlcbiAgICAgICAgICAgIC5qb2luKCcnKTtcbiAgICAgICAgcmV0dXJuIGJ0b2EoYmluYXJ5U3RyaW5nKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjb2RlcyBhIHN0cmluZyBvZiBkYXRhIHdoaWNoIGhhcyBiZWVuIGVuY29kZWQgdXNpbmcgYmFzZS02NCBlbmNvZGluZy5cbiAgICAgKiBAamEgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODieOBleOCjOOBn+ODh+ODvOOCv+OBruaWh+Wtl+WIl+OCkuODh+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZGVjb2RlKGVuY29kZWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGJpbmFyeVN0cmluZyA9IGF0b2IoZW5jb2RlZCk7XG4gICAgICAgIGNvbnN0IHV0ZjhCeXRlcyA9IFVpbnQ4QXJyYXkuZnJvbShiaW5hcnlTdHJpbmcsIGNoYXIgPT4gY2hhci5jaGFyQ29kZUF0KDApKTtcbiAgICAgICAgcmV0dXJuIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZSh1dGY4Qnl0ZXMpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHR5cGUgVW5rbm93bkZ1bmN0aW9uLCB2ZXJpZnkgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBDYW5jZWxhYmxlLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBGaWxlUmVhZGVyIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRmlsZVJlYWRlckFyZ3NNYXAge1xuICAgIHJlYWRBc0FycmF5QnVmZmVyOiBbQmxvYl07XG4gICAgcmVhZEFzRGF0YVVSTDogW0Jsb2JdO1xuICAgIHJlYWRBc1RleHQ6IFtCbG9iLCBzdHJpbmcgfCB1bmRlZmluZWRdO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgRmlsZVJlYWRlclJlc3VsdE1hcCB7XG4gICAgcmVhZEFzQXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyO1xuICAgIHJlYWRBc0RhdGFVUkw6IHN0cmluZztcbiAgICByZWFkQXNUZXh0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGVuIGBCbG9iYCByZWFkIG9wdGlvbnNcbiAqIEBqYSBgQmxvYmAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQmxvYlJlYWRPcHRpb25zIGV4dGVuZHMgQ2FuY2VsYWJsZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb2dyZXNzIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEBqYSDpgLLmjZfjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwcm9ncmVzc1xuICAgICAqICAtIGBlbmAgd29ya2VyIHByb2dyZXNzIGV2ZW50XG4gICAgICogIC0gYGphYCB3b3JrZXIg6YCy5o2X44Kk44OZ44Oz44OIXG4gICAgICovXG4gICAgb25wcm9ncmVzcz86IChwcm9ncmVzczogUHJvZ3Jlc3NFdmVudCkgPT4gdW5rbm93bjtcbn1cblxuLyoqIEBpbnRlcm5hbCBleGVjdXRlIHJlYWQgYmxvYiAqL1xuZnVuY3Rpb24gZXhlYzxUIGV4dGVuZHMga2V5b2YgRmlsZVJlYWRlclJlc3VsdE1hcD4oXG4gICAgbWV0aG9kTmFtZTogVCxcbiAgICBhcmdzOiBGaWxlUmVhZGVyQXJnc01hcFtUXSxcbiAgICBvcHRpb25zOiBCbG9iUmVhZE9wdGlvbnMsXG4pOiBQcm9taXNlPEZpbGVSZWFkZXJSZXN1bHRNYXBbVF0+IHtcbiAgICB0eXBlIFRSZXN1bHQgPSBGaWxlUmVhZGVyUmVzdWx0TWFwW1RdO1xuICAgIGNvbnN0IHsgY2FuY2VsOiB0b2tlbiwgb25wcm9ncmVzcyB9ID0gb3B0aW9ucztcbiAgICB0b2tlbiAmJiB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdG9rZW4pO1xuICAgIG9ucHJvZ3Jlc3MgJiYgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBvbnByb2dyZXNzKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8VFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0b2tlbj8ucmVnaXN0ZXIoKCkgPT4ge1xuICAgICAgICAgICAgcmVhZGVyLmFib3J0KCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZWFkZXIub25hYm9ydCA9IHJlYWRlci5vbmVycm9yID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcik7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbnByb2dyZXNzID0gb25wcm9ncmVzcyE7XG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQgYXMgVFJlc3VsdCk7XG4gICAgICAgIH07XG4gICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSAoKSA9PiB7XG4gICAgICAgICAgICBzdWJzY3JpcHRpb24gJiYgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgIH07XG4gICAgICAgIChyZWFkZXJbbWV0aG9kTmFtZV0gYXMgVW5rbm93bkZ1bmN0aW9uKSguLi5hcmdzKTtcbiAgICB9LCB0b2tlbik7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgYEFycmF5QnVmZmVyYCByZXN1bHQgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0FycmF5QnVmZmVyKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0FycmF5QnVmZmVyJywgW2Jsb2JdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGF0YS1VUkwgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgokgYGRhdGEtdXJsIOaWh+Wtl+WIl+OCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0RhdGFVUkwoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0RhdGFVUkwnLCBbYmxvYl0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnQgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgonjg4bjgq3jgrnjg4jmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBlbmNvZGluZ1xuICogIC0gYGVuYCBlbmNvZGluZyBzdHJpbmcgdG8gdXNlIGZvciB0aGUgcmV0dXJuZWQgZGF0YS4gZGVmYXVsdDogYHV0Zi04YFxuICogIC0gYGphYCDjgqjjg7PjgrPjg7zjg4fjgqPjg7PjgrDjgpLmjIflrprjgZnjgovmloflrZfliJcg5pei5a6aOiBgdXRmLThgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzVGV4dChibG9iOiBCbG9iLCBlbmNvZGluZz86IHN0cmluZyB8IG51bGwsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNUZXh0JywgW2Jsb2IsIGVuY29kaW5nID8/IHVuZGVmaW5lZF0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cbiIsImltcG9ydCB7XG4gICAgdHlwZSBLZXlzLFxuICAgIHR5cGUgVHlwZXMsXG4gICAgdHlwZSBUeXBlVG9LZXksXG4gICAgdG9UeXBlZERhdGEsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICByZXN0b3JlTnVsbGlzaCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICcuL2Jhc2U2NCc7XG5pbXBvcnQge1xuICAgIHR5cGUgQmxvYlJlYWRPcHRpb25zLFxuICAgIHJlYWRBc0FycmF5QnVmZmVyLFxuICAgIHJlYWRBc0RhdGFVUkwsXG4gICAgcmVhZEFzVGV4dCxcbn0gZnJvbSAnLi9ibG9iLXJlYWRlcic7XG5pbXBvcnQgeyBCbG9iIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIE1pbWVUeXBlIHtcbiAgICBCSU5BUlkgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJyxcbiAgICBURVhUID0gJ3RleHQvcGxhaW4nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBkYXRhLVVSTCDlsZ7mgKcgKi9cbmludGVyZmFjZSBEYXRhVVJMQ29udGV4dCB7XG4gICAgbWltZVR5cGU6IHN0cmluZztcbiAgICBiYXNlNjQ6IGJvb2xlYW47XG4gICAgZGF0YTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogZGF0YSBVUkkg5b2i5byP44Gu5q2j6KaP6KGo54++XG4gKiDlj4LogIM6IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvZGF0YV9VUklzXG4gKi9cbmZ1bmN0aW9uIHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTDogc3RyaW5nKTogRGF0YVVSTENvbnRleHQge1xuICAgIGNvbnN0IGNvbnRleHQgPSB7IGJhc2U2NDogZmFsc2UgfSBhcyBEYXRhVVJMQ29udGV4dDtcblxuICAgIC8qKlxuICAgICAqIFttYXRjaF0gMTogbWltZS10eXBlXG4gICAgICogICAgICAgICAyOiBcIjtiYXNlNjRcIiDjgpLlkKvjgoDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiAgICAgICAgIDM6IGRhdGEg5pys5L2TXG4gICAgICovXG4gICAgY29uc3QgcmVzdWx0ID0gL15kYXRhOiguKz9cXC8uKz8pPyg7Lis/KT8sKC4qKSQvLmV4ZWMoZGF0YVVSTCk7XG4gICAgaWYgKG51bGwgPT0gcmVzdWx0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBkYXRhLVVSTDogJHtkYXRhVVJMfWApO1xuICAgIH1cblxuICAgIGNvbnRleHQubWltZVR5cGUgPSByZXN1bHRbMV07XG4gICAgY29udGV4dC5iYXNlNjQgPSAvO2Jhc2U2NC8udGVzdChyZXN1bHRbMl0pOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItaW5jbHVkZXNcbiAgICBjb250ZXh0LmRhdGEgPSByZXN1bHRbM107XG5cbiAgICByZXR1cm4gY29udGV4dDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyICovXG5mdW5jdGlvbiBiaW5hcnlTdHJpbmdUb0JpbmFyeShieXRlczogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgY29uc3QgYXJyYXkgPSBieXRlcy5zcGxpdCgnJykubWFwKGMgPT4gYy5jaGFyQ29kZUF0KDApKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciAqL1xuZnVuY3Rpb24gYmluYXJ5VG9CaW5hcnlTdHJpbmcoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKGJpbmFyeSwgKGk6IG51bWJlcikgPT4gU3RyaW5nLmZyb21DaGFyQ29kZShpKSkuam9pbignJyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIHRvIGJpbmFyeS1zdHJpbmcuIChub3QgaHVtYW4gcmVhZGFibGUgc3RyaW5nKVxuICogQGphIOODkOOCpOODiuODquaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0JpbmFyeVN0cmluZyh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQodGV4dCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyBmcm9tIGJpbmFyeS1zdHJpbmcuXG4gKiBAamEg44OQ44Kk44OK44Oq5paH5a2X5YiX44GL44KJ5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ5dGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tQmluYXJ5U3RyaW5nKGJ5dGVzOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGJ5dGVzKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYmluYXJ5IHRvIGhleC1zdHJpbmcuXG4gKiBAamEg44OQ44Kk44OK44Oq44KSIEhFWCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gaGV4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tSGV4U3RyaW5nKGhleDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgY29uc3QgeCA9IGhleC5tYXRjaCgvLnsxLDJ9L2cpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShudWxsICE9IHggPyB4Lm1hcChieXRlID0+IHBhcnNlSW50KGJ5dGUsIDE2KSkgOiBbXSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIGZyb20gaGV4LXN0cmluZy5cbiAqIEBqYSBIRVgg5paH5a2X5YiX44GL44KJ44OQ44Kk44OK44Oq44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9IZXhTdHJpbmcoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5LnJlZHVjZSgoc3RyLCBieXRlKSA9PiBzdHIgKyBieXRlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpLnBhZFN0YXJ0KDIsICcwJyksICcnKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvQnVmZmVyKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgcmV0dXJuIHJlYWRBc0FycmF5QnVmZmVyKGJsb2IsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBgVWludDhBcnJheWAuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBgVWludDhBcnJheWAg44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBibG9iVG9CaW5hcnkoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShhd2FpdCByZWFkQXNBcnJheUJ1ZmZlcihibG9iLCBvcHRpb25zKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvRGF0YVVSTChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gcmVhZEFzRGF0YVVSTChibG9iLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCieODhuOCreOCueODiOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvVGV4dChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zICYgeyBlbmNvZGluZz86IHN0cmluZyB8IG51bGw7IH0pOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zID8/IHt9O1xuICAgIGNvbnN0IHsgZW5jb2RpbmcgfSA9IG9wdHM7XG4gICAgcmV0dXJuIHJlYWRBc1RleHQoYmxvYiwgZW5jb2RpbmcsIG9wdHMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYmxvYlRvQmFzZTY0KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBxdWVyeURhdGFVUkxDb250ZXh0KGF3YWl0IHJlYWRBc0RhdGFVUkwoYmxvYiwgb3B0aW9ucykpLmRhdGE7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gYEJsb2JgLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmxvYihidWZmZXI6IEFycmF5QnVmZmVyLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFtidWZmZXJdLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmluYXJ5KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvRGF0YVVSTChidWZmZXI6IEFycmF5QnVmZmVyLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9EYXRhVVJMKG5ldyBVaW50OEFycmF5KGJ1ZmZlciksIG1pbWVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CYXNlNjQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvQmFzZTY0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgonjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvVGV4dChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9UZXh0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gYEJsb2JgLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQmxvYihiaW5hcnk6IFVpbnQ4QXJyYXksIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW2JpbmFyeSBhcyBVaW50OEFycmF5PEFycmF5QnVmZmVyPl0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQnVmZmVyKGJpbmFyeTogVWludDhBcnJheSk6IEFycmF5QnVmZmVyTGlrZSB7XG4gICAgcmV0dXJuIGJpbmFyeS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvRGF0YVVSTChiaW5hcnk6IFVpbnQ4QXJyYXksIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiaW5hcnlUb0Jhc2U2NChiaW5hcnkpfWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CYXNlNjQoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmVuY29kZShiaW5hcnlUb1RleHQoYmluYXJ5KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokg44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9UZXh0KGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGZyb21CaW5hcnlTdHJpbmcoYmluYXJ5VG9CaW5hcnlTdHJpbmcoYmluYXJ5KSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmxvYihiYXNlNjQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBiaW5hcnlUb0Jsb2IoYmFzZTY0VG9CaW5hcnkoYmFzZTY0KSwgbWltZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CdWZmZXIoYmFzZTY0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlckxpa2Uge1xuICAgIHJldHVybiBiYXNlNjRUb0JpbmFyeShiYXNlNjQpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0JpbmFyeShiYXNlNjQ6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiaW5hcnlTdHJpbmdUb0JpbmFyeSh0b0JpbmFyeVN0cmluZyhCYXNlNjQuZGVjb2RlKGJhc2U2NCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvRGF0YVVSTChiYXNlNjQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2Jhc2U2NH1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgIEJhc2U2NCDmloflrZfliJfjgYvjgokg44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9UZXh0KGJhc2U2NDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmRlY29kZShiYXNlNjQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmxvYih0ZXh0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5URVhUKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFt0ZXh0XSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CdWZmZXIodGV4dDogc3RyaW5nKTogQXJyYXlCdWZmZXJMaWtlIHtcbiAgICByZXR1cm4gdGV4dFRvQmluYXJ5KHRleHQpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmluYXJ5KHRleHQ6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiaW5hcnlTdHJpbmdUb0JpbmFyeSh0b0JpbmFyeVN0cmluZyh0ZXh0KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvRGF0YVVSTCh0ZXh0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5URVhUKTogc3RyaW5nIHtcbiAgICBjb25zdCBiYXNlNjQgPSB0ZXh0VG9CYXNlNjQodGV4dCk7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2Jhc2U2NH1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmFzZTY0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUodGV4dCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0Jsb2IoZGF0YVVSTDogc3RyaW5nKTogQmxvYiB7XG4gICAgY29uc3QgY29udGV4dCA9IHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTCk7XG4gICAgaWYgKGNvbnRleHQuYmFzZTY0KSB7XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0Jsb2IoY29udGV4dC5kYXRhLCBjb250ZXh0Lm1pbWVUeXBlIHx8IE1pbWVUeXBlLkJJTkFSWSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRleHRUb0Jsb2IoZGVjb2RlVVJJQ29tcG9uZW50KGNvbnRleHQuZGF0YSksIGNvbnRleHQubWltZVR5cGUgfHwgTWltZVR5cGUuVEVYVCk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQnVmZmVyKGRhdGFVUkw6IHN0cmluZyk6IEFycmF5QnVmZmVyTGlrZSB7XG4gICAgcmV0dXJuIGRhdGFVUkxUb0JpbmFyeShkYXRhVVJMKS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmluYXJ5KGRhdGFVUkw6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiYXNlNjRUb0JpbmFyeShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgonjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb1RleHQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmRlY29kZShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMKTtcbiAgICBpZiAoY29udGV4dC5iYXNlNjQpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQuZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gQmFzZTY0LmVuY29kZShkZWNvZGVVUklDb21wb25lbnQoY29udGV4dC5kYXRhKSk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gU2VyaWFsaXphYmxlIGRhdGEgdHlwZSBsaXN0LlxuICogQGphIOOCt+ODquOCouODqeOCpOOCuuWPr+iDveOBquODh+ODvOOCv+Wei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlcmlhbGl6YWJsZSB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBvYmplY3Q6IG9iamVjdDtcbiAgICBidWZmZXI6IEFycmF5QnVmZmVyO1xuICAgIGJpbmFyeTogVWludDhBcnJheTtcbiAgICBibG9iOiBCbG9iO1xufVxuXG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVEYXRhVHlwZXMgPSBUeXBlczxTZXJpYWxpemFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXMgPSBTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkO1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlS2V5cyA9IEtleXM8U2VyaWFsaXphYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUNhc3RhYmxlID0gT21pdDxTZXJpYWxpemFibGUsICdidWZmZXInIHwgJ2JpbmFyeScgfCAnYmxvYic+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcyA9IFR5cGVzPFNlcmlhbGl6YWJsZUNhc3RhYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZVJldHVyblR5cGU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXM+ID0gVHlwZVRvS2V5PFNlcmlhbGl6YWJsZUNhc3RhYmxlLCBUPiBleHRlbmRzIG5ldmVyID8gbmV2ZXIgOiBUIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemFibGUgb3B0aW9ucyBpbnRlcmZhY2UuXG4gKiBAamEg44OH44K344Oq44Ki44Op44Kk44K644Gr5L2/55So44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVzZXJpYWxpemVPcHRpb25zPFQgZXh0ZW5kcyBTZXJpYWxpemFibGUgPSBTZXJpYWxpemFibGUsIEsgZXh0ZW5kcyBLZXlzPFQ+ID0gS2V5czxUPj4gZXh0ZW5kcyBDYW5jZWxhYmxlIHtcbiAgICAvKioge0BsaW5rIFNlcmlhbGl6YWJsZUtleXN9ICovXG4gICAgZGF0YVR5cGU/OiBLO1xufVxuXG4vKipcbiAqIEBlbiBTZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jgrfjg6rjgqLjg6njgqTjgrpcbiAqXG4gKiBAcGFyYW0gZGF0YSBpbnB1dFxuICogQHBhcmFtIG9wdGlvbnMgYmxvYiBjb252ZXJ0IG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXM+KGRhdGE6IFQsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgaWYgKG51bGwgPT0gZGF0YSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBidWZmZXJUb0RhdGFVUkwoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICByZXR1cm4gYmluYXJ5VG9EYXRhVVJMKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgICAgcmV0dXJuIGJsb2JUb0RhdGFVUkwoZGF0YSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZyb21UeXBlZERhdGEoZGF0YSkhO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzID0gU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcz4oXG4gICAgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IERlc2VyaWFsaXplT3B0aW9uczxTZXJpYWxpemFibGUsIG5ldmVyPlxuKTogUHJvbWlzZTxTZXJpYWxpemFibGVSZXR1cm5UeXBlPFQ+PjtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVLZXlzPih2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBEZXNlcmlhbGl6ZU9wdGlvbnM8U2VyaWFsaXphYmxlLCBUPik6IFByb21pc2U8U2VyaWFsaXphYmxlW1RdIHwgbnVsbCB8IHVuZGVmaW5lZD47XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZXNlcmlhbGl6ZSh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zPzogRGVzZXJpYWxpemVPcHRpb25zKTogUHJvbWlzZTxTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgeyBkYXRhVHlwZSwgY2FuY2VsIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG5cbiAgICBjb25zdCBkYXRhID0gcmVzdG9yZU51bGxpc2godG9UeXBlZERhdGEodmFsdWUpKTtcbiAgICBzd2l0Y2ggKGRhdGFUeXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YShkYXRhKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIEJvb2xlYW4oZGF0YSk7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0KGRhdGEpO1xuICAgICAgICBjYXNlICdidWZmZXInOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGFVUkxUb0J1ZmZlcihmcm9tVHlwZWREYXRhKGRhdGEpISk7XG4gICAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmluYXJ5KGZyb21UeXBlZERhdGEoZGF0YSkhKTtcbiAgICAgICAgY2FzZSAnYmxvYic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmxvYihmcm9tVHlwZWREYXRhKGRhdGEpISk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVUkwgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2Jsb2JNYXAgPSBuZXcgV2Vha01hcDxCbG9iLCBzdHJpbmc+KCk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF91cmxTZXQgID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbi8qKlxuICogQGVuIGBCbG9iIFVSTGAgdXRpbGl0eSBmb3IgYXV0b21hdGljIG1lbW9yeSBtYW5lZ2VtZW50LlxuICogQGphIOODoeODouODquiHquWLleeuoeeQhuOCkuihjOOBhiBgQmxvYiBVUkxgIOODpuODvOODhuOCo+ODquODhuOCo1xuICovXG5leHBvcnQgY2xhc3MgQmxvYlVSTCB7XG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjga7mp4vnr4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZSguLi5ibG9iczogQmxvYltdKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgYiBvZiBibG9icykge1xuICAgICAgICAgICAgY29uc3QgY2FjaGUgPSBfYmxvYk1hcC5nZXQoYik7XG4gICAgICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYik7XG4gICAgICAgICAgICBfYmxvYk1hcC5zZXQoYiwgdXJsKTtcbiAgICAgICAgICAgIF91cmxTZXQuYWRkKHVybCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIGBCbG9iIFVSTGAgY2FjaGUuXG4gICAgICogQGphIOOBmeOBueOBpuOBriBgQmxvYiBVUkxgIOOCreODo+ODg+OCt+ODpeOCkuegtOajhFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY2xlYXIoKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgdXJsIG9mIF91cmxTZXQpIHtcbiAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgfVxuICAgICAgICBfdXJsU2V0LmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBruWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0KGJsb2I6IEJsb2IpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBjYWNoZSA9IF9ibG9iTWFwLmdldChibG9iKTtcbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgX2Jsb2JNYXAuc2V0KGJsb2IsIHVybCk7XG4gICAgICAgIF91cmxTZXQuYWRkKHVybCk7XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGBCbG9iIFVSTGAgaXMgYXZhaWxhYmxlIGZyb20gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBjOacieWKueWMluWIpOWumlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgaGFzKGJsb2I6IEJsb2IpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIF9ibG9iTWFwLmhhcyhibG9iKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV2b2tlIGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZXMuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOCkueEoeWKueWMllxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgcmV2b2tlKC4uLmJsb2JzOiBCbG9iW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIGJsb2JzKSB7XG4gICAgICAgICAgICBjb25zdCB1cmwgPSBfYmxvYk1hcC5nZXQoYik7XG4gICAgICAgICAgICBpZiAodXJsKSB7XG4gICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICAgICAgICAgIF9ibG9iTWFwLmRlbGV0ZShiKTtcbiAgICAgICAgICAgICAgICBfdXJsU2V0LmRlbGV0ZSh1cmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBBSkFYID0gQ0RQX0tOT1dOX01PRFVMRS5BSkFYICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIEFKQVhfREVDTEFSRSAgICAgICAgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX0FKQVhfUkVTUE9OU0UgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMSwgJ25ldHdvcmsgZXJyb3IuJyksXG4gICAgICAgIEVSUk9SX0FKQVhfVElNRU9VVCAgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5BSkFYICsgMiwgJ3JlcXVlc3QgdGltZW91dC4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgRm9ybURhdGEgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkZvcm1EYXRhKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEhlYWRlcnMgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5IZWFkZXJzKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEFib3J0Q29udHJvbGxlciA9IHNhZmUoZ2xvYmFsVGhpcy5BYm9ydENvbnRyb2xsZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgVVJMU2VhcmNoUGFyYW1zID0gc2FmZShnbG9iYWxUaGlzLlVSTFNlYXJjaFBhcmFtcyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBYTUxIdHRwUmVxdWVzdCAgPSBzYWZlKGdsb2JhbFRoaXMuWE1MSHR0cFJlcXVlc3QpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZmV0Y2ggICAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmZldGNoKTtcbiIsImltcG9ydCB7XG4gICAgdHlwZSBQbGFpbk9iamVjdCxcbiAgICBpc0Z1bmN0aW9uLFxuICAgIGlzTnVtZXJpYyxcbiAgICBhc3NpZ25WYWx1ZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFVSTFNlYXJjaFBhcmFtcyB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCBlbnN1cmUgc3RyaW5nIHZhbHVlICovXG5jb25zdCBlbnN1cmVQYXJhbVZhbHVlID0gKHByb3A6IHVua25vd24pOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHZhbHVlID0gaXNGdW5jdGlvbihwcm9wKSA/IHByb3AoKSA6IHByb3A7XG4gICAgcmV0dXJuIHVuZGVmaW5lZCAhPT0gdmFsdWUgPyBTdHJpbmcodmFsdWUpIDogJyc7XG59O1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBQbGFpbk9iamVjdGAgdG8gcXVlcnkgc3RyaW5ncy5cbiAqIEBqYSBgUGxhaW5PYmplY3RgIOOCkuOCr+OCqOODquOCueODiOODquODs+OCsOOBq+WkieaPm1xuICovXG5leHBvcnQgY29uc3QgdG9RdWVyeVN0cmluZ3MgPSAoZGF0YTogUGxhaW5PYmplY3QpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHBhcmFtczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGVuc3VyZVBhcmFtVmFsdWUoZGF0YVtrZXldKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICBwYXJhbXMucHVzaChgJHtlbmNvZGVVUklDb21wb25lbnQoa2V5KX09JHtlbmNvZGVVUklDb21wb25lbnQodmFsdWUpfWApO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXMuam9pbignJicpO1xufTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCBgUGxhaW5PYmplY3RgIHRvIEFqYXggcGFyYW1ldGVycyBvYmplY3QuXG4gKiBAamEgYFBsYWluT2JqZWN0YCDjgpIgQWpheCDjg5Hjg6njg6Hjg7zjgr/jgqrjg5bjgrjjgqfjgq/jg4jjgavlpInmj5tcbiAqL1xuZXhwb3J0IGNvbnN0IHRvQWpheFBhcmFtcyA9IChkYXRhOiBQbGFpbk9iamVjdCk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPT4ge1xuICAgIGNvbnN0IHBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZW5zdXJlUGFyYW1WYWx1ZShkYXRhW2tleV0pO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIGFzc2lnblZhbHVlKHBhcmFtcywga2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcztcbn07XG5cbi8qKlxuICogQGVuIENvbnZlcnQgVVJMIHBhcmFtZXRlcnMgdG8gcHJpbWl0aXZlIHR5cGUuXG4gKiBAamEgVVJMIOODkeODqeODoeODvOOCv+OCkiBwcmltaXRpdmUg44Gr5aSJ5o+bXG4gKi9cbmV4cG9ydCBjb25zdCBjb252ZXJ0VXJsUGFyYW1UeXBlID0gKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCA9PiB7XG4gICAgaWYgKGlzTnVtZXJpYyh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIE51bWJlcih2YWx1ZSk7XG4gICAgfSBlbHNlIGlmICgndHJ1ZScgPT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoJ2ZhbHNlJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoJ251bGwnID09PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBQYXJzZSB1cmwgcXVlcnkgR0VUIHBhcmFtZXRlcnMuXG4gKiBAamEgVVJM44Kv44Ko44Oq44GuR0VU44OR44Op44Oh44O844K/44KS6Kej5p6QXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCB1cmwgPSAnL3BhZ2UvP2lkPTUmZm9vPWJhciZib29sPXRydWUnO1xuICogY29uc3QgcXVlcnkgPSBwYXJzZVVybFF1ZXJ5KHVybCk7XG4gKiAvLyB7IGlkOiA1LCBmb286ICdiYXInLCBib29sOiB0cnVlIH1cbiAqIGBgYFxuICpcbiAqIEByZXR1cm5zIHsga2V5OiB2YWx1ZSB9IG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IHBhcnNlVXJsUXVlcnkgPSA8VCA9IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsPj4odXJsOiBzdHJpbmcpOiBUID0+IHtcbiAgICBjb25zdCBxdWVyeTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHVybC5pbmNsdWRlcygnPycpID8gdXJsLnNwbGl0KCc/JylbMV0gOiB1cmwpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHBhcmFtcykge1xuICAgICAgICBxdWVyeVtkZWNvZGVVUklDb21wb25lbnQoa2V5KV0gPSBjb252ZXJ0VXJsUGFyYW1UeXBlKHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHF1ZXJ5IGFzIFQ7XG59O1xuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICB0eXBlIEFjY2Vzc2libGUsXG4gICAgdHlwZSBLZXlzLFxuICAgIGlzRnVuY3Rpb24sXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIFN1YnNjcmliYWJsZSwgRXZlbnRTb3VyY2UgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgdHlwZSB7IEFqYXhEYXRhU3RyZWFtRXZlbnQsIEFqYXhEYXRhU3RyZWFtIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuLyoqIEBpbnRlcm5hbCBQcm94eUhhbmRsZXIgaGVscGVyICovXG5jb25zdCBfZXhlY0dldERlZmF1bHQgPSAodGFyZ2V0OiBhbnksIHByb3A6IHN0cmluZyB8IHN5bWJvbCk6IGFueSA9PiB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGlmIChwcm9wIGluIHRhcmdldCkge1xuICAgICAgICBpZiAoaXNGdW5jdGlvbih0YXJnZXRbcHJvcF0pKSB7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdLmJpbmQodGFyZ2V0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcF07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfc3Vic2NyaWJhYmxlTWV0aG9kczogS2V5czxTdWJzY3JpYmFibGU+W10gPSBbXG4gICAgJ2hhc0xpc3RlbmVyJyxcbiAgICAnY2hhbm5lbHMnLFxuICAgICdvbicsXG4gICAgJ29mZicsXG4gICAgJ29uY2UnLFxuXTtcblxuZXhwb3J0IGNvbnN0IHRvQWpheERhdGFTdHJlYW0gPSAoc2VlZDogQmxvYiB8IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+LCBsZW5ndGg/OiBudW1iZXIpOiBBamF4RGF0YVN0cmVhbSA9PiB7XG4gICAgbGV0IGxvYWRlZCA9IDA7XG4gICAgY29uc3QgW3N0cmVhbSwgdG90YWxdID0gKCgpID0+IHtcbiAgICAgICAgaWYgKHNlZWQgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQuc3RyZWFtKCksIHNlZWQuc2l6ZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW3NlZWQsIGxlbmd0aCAhPSBudWxsID8gTWF0aC50cnVuYyhsZW5ndGgpIDogTmFOXTtcbiAgICAgICAgfVxuICAgIH0pKCk7XG5cbiAgICBjb25zdCBfZXZlbnRTb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2U8QWpheERhdGFTdHJlYW1FdmVudD4oKSBhcyBBY2Nlc3NpYmxlPEV2ZW50U291cmNlPEFqYXhEYXRhU3RyZWFtRXZlbnQ+LCBVbmtub3duRnVuY3Rpb24+O1xuXG4gICAgY29uc3QgX3Byb3h5UmVhZGVySGFuZGxlcjogUHJveHlIYW5kbGVyPFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxVaW50OEFycmF5Pj4gPSB7XG4gICAgICAgIGdldDogKHRhcmdldDogUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICgncmVhZCcgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9taXNlID0gdGFyZ2V0LnJlYWQoKTtcbiAgICAgICAgICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWU6IGNodW5rIH0gPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICAgICAgICAgICAgICBjaHVuayAmJiAobG9hZGVkICs9IGNodW5rLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIF9ldmVudFNvdXJjZS50cmlnZ2VyKCdwcm9ncmVzcycsIE9iamVjdC5mcmVlemUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcHV0YWJsZTogIU51bWJlci5pc05hTih0b3RhbCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2FkZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjaHVuayxcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICgpID0+IHByb21pc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBfZXhlY0dldERlZmF1bHQodGFyZ2V0LCBwcm9wKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBQcm94eShzdHJlYW0sIHtcbiAgICAgICAgZ2V0OiAodGFyZ2V0OiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiwgcHJvcDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAoJ2dldFJlYWRlcicgPT09IHByb3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKCkgPT4gbmV3IFByb3h5KHRhcmdldC5nZXRSZWFkZXIoKSwgX3Byb3h5UmVhZGVySGFuZGxlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCdsZW5ndGgnID09PSBwcm9wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfc3Vic2NyaWJhYmxlTWV0aG9kcy5pbmNsdWRlcyhwcm9wIGFzIEtleXM8U3Vic2NyaWJhYmxlPikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gX2V2ZW50U291cmNlW3Byb3BdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX2V4ZWNHZXREZWZhdWx0KHRhcmdldCwgcHJvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSkgYXMgQWpheERhdGFTdHJlYW07XG59O1xuIiwiaW1wb3J0IHsgaXNOdW1iZXIgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsICovIGxldCBfdGltZW91dDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgZ2V0IHRpbWVvdXQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF90aW1lb3V0O1xuICAgIH0sXG4gICAgc2V0IHRpbWVvdXQodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgICAgICBfdGltZW91dCA9IChpc051bWJlcih2YWx1ZSkgJiYgMCA8PSB2YWx1ZSkgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICB9LFxufTtcbiIsImltcG9ydCB7IENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCBtYWtlUmVzdWx0IH0gZnJvbSAnQGNkcC9yZXN1bHQnO1xuaW1wb3J0IHsgQmFzZTY0IH0gZnJvbSAnQGNkcC9iaW5hcnknO1xuaW1wb3J0IHR5cGUge1xuICAgIEFqYXhEYXRhVHlwZXMsXG4gICAgQWpheE9wdGlvbnMsXG4gICAgQWpheFJlc3VsdCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgRm9ybURhdGEsXG4gICAgSGVhZGVycyxcbiAgICBBYm9ydENvbnRyb2xsZXIsXG4gICAgVVJMU2VhcmNoUGFyYW1zLFxuICAgIGZldGNoLFxufSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyB0b1F1ZXJ5U3RyaW5ncywgdG9BamF4UGFyYW1zIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgdG9BamF4RGF0YVN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IHNldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB0eXBlIEFqYXhIZWFkZXJPcHRpb25zID0gUGljazxBamF4T3B0aW9uczxBamF4RGF0YVR5cGVzPiwgJ2hlYWRlcnMnIHwgJ21ldGhvZCcgfCAnY29udGVudFR5cGUnIHwgJ2RhdGFUeXBlJyB8ICdtb2RlJyB8ICdib2R5JyB8ICd1c2VybmFtZScgfCAncGFzc3dvcmQnPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2FjY2VwdEhlYWRlck1hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICB0ZXh0OiAndGV4dC9wbGFpbiwgdGV4dC9odG1sLCBhcHBsaWNhdGlvbi94bWw7IHE9MC44LCB0ZXh0L3htbDsgcT0wLjgsICovKjsgcT0wLjAxJyxcbiAgICBqc29uOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9qYXZhc2NyaXB0LCAqLyo7IHE9MC4wMScsXG59O1xuXG4vKipcbiAqIEBlbiBTZXR1cCBgaGVhZGVyc2AgZnJvbSBvcHRpb25zIHBhcmFtZXRlci5cbiAqIEBqYSDjgqrjg5fjgrfjg6fjg7PjgYvjgokgYGhlYWRlcnNgIOOCkuioreWumlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIZWFkZXJzKG9wdGlvbnM6IEFqYXhIZWFkZXJPcHRpb25zKTogSGVhZGVycyB7XG4gICAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycyk7XG4gICAgY29uc3QgeyBtZXRob2QsIGNvbnRlbnRUeXBlLCBkYXRhVHlwZSwgbW9kZSwgYm9keSwgdXNlcm5hbWUsIHBhc3N3b3JkIH0gPSBvcHRpb25zO1xuXG4gICAgLy8gQ29udGVudC1UeXBlXG4gICAgaWYgKCdQT1NUJyA9PT0gbWV0aG9kIHx8ICdQVVQnID09PSBtZXRob2QgfHwgJ1BBVENIJyA9PT0gbWV0aG9kKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIGZldGNoKCkg44Gu5aC05ZCILCBGb3JtRGF0YSDjgpLoh6rli5Xop6Pph4jjgZnjgovjgZ/jgoEsIOaMh+WumuOBjOOBguOCi+WgtOWQiOOBr+WJiumZpFxuICAgICAgICAgKiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zNTE5Mjg0MS9mZXRjaC1wb3N0LXdpdGgtbXVsdGlwYXJ0LWZvcm0tZGF0YVxuICAgICAgICAgKiBodHRwczovL211ZmZpbm1hbi5pby91cGxvYWRpbmctZmlsZXMtdXNpbmctZmV0Y2gtbXVsdGlwYXJ0LWZvcm0tZGF0YS9cbiAgICAgICAgICovXG4gICAgICAgIGlmIChoZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgJiYgYm9keSBpbnN0YW5jZW9mIEZvcm1EYXRhKSB7XG4gICAgICAgICAgICBoZWFkZXJzLmRlbGV0ZSgnQ29udGVudC1UeXBlJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIWhlYWRlcnMuZ2V0KCdDb250ZW50LVR5cGUnKSkge1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gY29udGVudFR5cGUgJiYgJ2pzb24nID09PSBkYXRhVHlwZSEpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzLnNldCgnQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLTgnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVsbCAhPSBjb250ZW50VHlwZSkge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMuc2V0KCdDb250ZW50LVR5cGUnLCBjb250ZW50VHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBY2NlcHRcbiAgICBpZiAoIWhlYWRlcnMuZ2V0KCdBY2NlcHQnKSkge1xuICAgICAgICBoZWFkZXJzLnNldCgnQWNjZXB0JywgX2FjY2VwdEhlYWRlck1hcFtkYXRhVHlwZSFdIHx8ICcqLyonKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIFgtUmVxdWVzdGVkLVdpdGhcbiAgICAgKiDpnZ7mqJnmupbjg5jjg4Pjg4Djg7zjgafjgYLjgovjgZ/jgoEsIOaXouWumuOBp+OBryBjb3JzIOOBriBwcmVmbGlnaHQgcmVzcG9uc2Ug44Gn6Kix5Y+v44GV44KM44Gq44GEXG4gICAgICog44G+44GfIG1vZGUg44Gu5pei5a6a5YCk44GvIGNvcnMg44Gn44GC44KL44Gf44KBLCDmnInlirnjgavjgZnjgovjgavjga8gbW9kZSDjga7mmI7npLrnmoTmjIflrprjgYzlv4XopoHjgajjgarjgotcbiAgICAgKi9cbiAgICBpZiAobW9kZSAmJiAnY29ycycgIT09IG1vZGUgJiYgIWhlYWRlcnMuZ2V0KCdYLVJlcXVlc3RlZC1XaXRoJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ1gtUmVxdWVzdGVkLVdpdGgnLCAnWE1MSHR0cFJlcXVlc3QnKTtcbiAgICB9XG5cbiAgICAvLyBCYXNpYyBBdXRob3JpemF0aW9uXG4gICAgaWYgKG51bGwgIT0gdXNlcm5hbWUgJiYgIWhlYWRlcnMuZ2V0KCdBdXRob3JpemF0aW9uJykpIHtcbiAgICAgICAgaGVhZGVycy5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmFzaWMgJHtCYXNlNjQuZW5jb2RlKGAke3VzZXJuYW1lfToke3Bhc3N3b3JkID8/ICcnfWApfWApO1xuICAgIH1cblxuICAgIHJldHVybiBoZWFkZXJzO1xufVxuXG4vKipcbiAqIEBlbiBQZXJmb3JtIGFuIGFzeW5jaHJvbm91cyBIVFRQIChBamF4KSByZXF1ZXN0LlxuICogQGphIEhUVFAgKEFqYXgp44Oq44Kv44Ko44K544OI44Gu6YCB5L+hXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgQWpheCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFqYXg8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAncmVzcG9uc2UnPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhPcHRpb25zPFQ+KTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiB7XG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IGNvbnRyb2xsZXIuYWJvcnQoKTtcblxuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdyZXNwb25zZScsXG4gICAgICAgIHRpbWVvdXQ6IHNldHRpbmdzLnRpbWVvdXQsXG4gICAgfSwgb3B0aW9ucywge1xuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLCAvLyBmb3JjZSBvdmVycmlkZVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIHRpbWVvdXQgfSA9IG9wdHM7XG5cbiAgICAvLyBjYW5jZWxsYXRpb25cbiAgICBpZiAob3JpZ2luYWxUb2tlbikge1xuICAgICAgICBpZiAob3JpZ2luYWxUb2tlbi5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgICAgICB9XG4gICAgICAgIG9yaWdpbmFsVG9rZW4ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuISk7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gc291cmNlO1xuICAgIHRva2VuLnJlZ2lzdGVyKGFib3J0KTtcblxuICAgIC8vIHRpbWVvdXRcbiAgICBpZiAodGltZW91dCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHNvdXJjZS5jYW5jZWwobWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1RJTUVPVVQsICdyZXF1ZXN0IHRpbWVvdXQnKSksIHRpbWVvdXQpO1xuICAgIH1cblxuICAgIC8vIG5vcm1hbGl6ZVxuICAgIG9wdHMubWV0aG9kID0gb3B0cy5tZXRob2QudG9VcHBlckNhc2UoKTtcblxuICAgIC8vIGhlYWRlclxuICAgIG9wdHMuaGVhZGVycyA9IHNldHVwSGVhZGVycyhvcHRzKTtcblxuICAgIC8vIHBhcnNlIHBhcmFtXG4gICAgY29uc3QgeyBtZXRob2QsIGRhdGEsIGRhdGFUeXBlIH0gPSBvcHRzO1xuICAgIGlmIChudWxsICE9IGRhdGEpIHtcbiAgICAgICAgaWYgKCgnR0VUJyA9PT0gbWV0aG9kIHx8ICdIRUFEJyA9PT0gbWV0aG9kKSAmJiAhdXJsLmluY2x1ZGVzKCc/JykpIHtcbiAgICAgICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdHMuYm9keSA/Pz0gbmV3IFVSTFNlYXJjaFBhcmFtcyh0b0FqYXhQYXJhbXMoZGF0YSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXhlY3V0ZVxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGZldGNoKHVybCwgb3B0cyksIHRva2VuKTtcbiAgICBpZiAoJ3Jlc3BvbnNlJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIGFzIEFqYXhSZXN1bHQ8VD47XG4gICAgfSBlbHNlIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgbWFrZVJlc3VsdChSRVNVTFRfQ09ERS5FUlJPUl9BSkFYX1JFU1BPTlNFLCByZXNwb25zZS5zdGF0dXNUZXh0LCByZXNwb25zZSk7XG4gICAgfSBlbHNlIGlmICgnc3RyZWFtJyA9PT0gZGF0YVR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRvQWpheERhdGFTdHJlYW0oXG4gICAgICAgICAgICByZXNwb25zZS5ib2R5ISxcbiAgICAgICAgICAgIE51bWJlcihyZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC1sZW5ndGgnKSksXG4gICAgICAgICkgYXMgQWpheFJlc3VsdDxUPjtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXNwb25zZVtkYXRhVHlwZSBhcyBFeGNsdWRlPEFqYXhEYXRhVHlwZXMsICdyZXNwb25zZScgfCAnc3RyZWFtJz5dKCksIHRva2VuKTtcbiAgICB9XG59XG5cbmFqYXguc2V0dGluZ3MgPSBzZXR0aW5ncztcblxuZXhwb3J0IHsgYWpheCB9O1xuIiwiaW1wb3J0IHR5cGUgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBSRVNVTFRfQ09ERSwgbWFrZVJlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB0eXBlIHtcbiAgICBBamF4RGF0YVR5cGVzLFxuICAgIEFqYXhPcHRpb25zLFxuICAgIEFqYXhSZXF1ZXN0T3B0aW9ucyxcbiAgICBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgYWpheCwgc2V0dXBIZWFkZXJzIH0gZnJvbSAnLi9jb3JlJztcbmltcG9ydCB7IHRvUXVlcnlTdHJpbmdzIH0gZnJvbSAnLi9wYXJhbXMnO1xuaW1wb3J0IHsgWE1MSHR0cFJlcXVlc3QgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVuc3VyZURhdGFUeXBlID0gKGRhdGFUeXBlPzogQWpheERhdGFUeXBlcyk6IEFqYXhEYXRhVHlwZXMgPT4ge1xuICAgIHJldHVybiBkYXRhVHlwZSA/PyAnanNvbic7XG59O1xuXG4vKipcbiAqIEBlbiBgR0VUYCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhXG4gKiAgLSBgZW5gIERhdGEgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogIC0gYGphYCDjgrXjg7zjg5Djg7zjgavpgIHkv6HjgZXjgozjgovjg4fjg7zjgr8uXG4gKiBAcGFyYW0gZGF0YVR5cGVcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBi+OCiei/lOOBleOCjOOCi+acn+W+heOBmeOCi+ODh+ODvOOCv+OBruWei+OCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmNvbnN0IGdldCA9IDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YT86IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4gPT4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdHRVQnLCBkYXRhLCBkYXRhVHlwZTogZW5zdXJlRGF0YVR5cGUoZGF0YVR5cGUpIH0gYXMgQWpheE9wdGlvbnM8VD4pO1xufTtcblxuLyoqXG4gKiBAZW4gYEdFVGAgdGV4dCByZXF1ZXN0IHNob3J0Y3V0LlxuICogQGphIGBHRVRgIOODhuOCreOCueODiOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5jb25zdCB0ZXh0ID0gKHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J3RleHQnPj4gPT4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICd0ZXh0Jywgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEBlbiBgR0VUYCBKU09OIHJlcXVlc3Qgc2hvcnRjdXQuXG4gKiBAamEgYEdFVGAgSlNPTiDjg6rjgq/jgqjjgrnjg4jjgrfjg6fjg7zjg4jjgqvjg4Pjg4hcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZXF1ZXN0IHNldHRpbmdzLlxuICogIC0gYGphYCDjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuY29uc3QganNvbiA9IDxUIGV4dGVuZHMgJ2pzb24nIHwgb2JqZWN0ID0gJ2pzb24nPih1cmw6IHN0cmluZywgb3B0aW9ucz86IEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zKTogUHJvbWlzZTxBamF4UmVzdWx0PFQ+PiA9PiB7XG4gICAgcmV0dXJuIGdldDxUPih1cmwsIHVuZGVmaW5lZCwgKCdqc29uJyBhcyBUIGV4dGVuZHMgQWpheERhdGFUeXBlcyA/IFQgOiAnanNvbicpLCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogQGVuIGBHRVRgIEJsb2IgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgR0VUYCBCbG9iIOODquOCr+OCqOOCueODiOOCt+ODp+ODvOODiOOCq+ODg+ODiFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIOODquOCr+OCqOOCueODiOioreWumlxuICovXG5jb25zdCBibG9iID0gKHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMpOiBQcm9taXNlPEFqYXhSZXN1bHQ8J2Jsb2InPj4gPT4ge1xuICAgIHJldHVybiBnZXQodXJsLCB1bmRlZmluZWQsICdibG9iJywgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEBlbiBgUE9TVGAgcmVxdWVzdCBzaG9ydGN1dC5cbiAqIEBqYSBgUE9TVGAg44Oq44Kv44Ko44K544OI44K344On44O844OI44Kr44OD44OIXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCBBIHN0cmluZyBjb250YWluaW5nIHRoZSBVUkwgdG8gd2hpY2ggdGhlIHJlcXVlc3QgaXMgc2VudC5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBUaGUgdHlwZSBvZiBkYXRhIHRoYXQgeW91J3JlIGV4cGVjdGluZyBiYWNrIGZyb20gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAg44Oq44Kv44Ko44K544OI6Kit5a6aXG4gKi9cbmNvbnN0IHBvc3QgPSA8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCBvYmplY3QgPSAnanNvbic+KFxuICAgIHVybDogc3RyaW5nLFxuICAgIGRhdGE6IFBsYWluT2JqZWN0LFxuICAgIGRhdGFUeXBlPzogVCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgPyBUIDogJ2pzb24nLFxuICAgIG9wdGlvbnM/OiBBamF4UmVxdWVzdE9wdGlvbnNcbik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4gPT4ge1xuICAgIHJldHVybiBhamF4KHVybCwgeyAuLi5vcHRpb25zLCBtZXRob2Q6ICdQT1NUJywgZGF0YSwgZGF0YVR5cGU6IGVuc3VyZURhdGFUeXBlKGRhdGFUeXBlKSB9IGFzIEFqYXhPcHRpb25zPFQ+KTtcbn07XG5cbi8qKlxuICogQGVuIFN5bmNocm9ub3VzIGBHRVRgIHJlcXVlc3QgZm9yIHJlc291cmNlIGFjY2Vzcy4gPGJyPlxuICogICAgIE1hbnkgYnJvd3NlcnMgaGF2ZSBkZXByZWNhdGVkIHN5bmNocm9ub3VzIFhIUiBzdXBwb3J0IG9uIHRoZSBtYWluIHRocmVhZCBlbnRpcmVseS5cbiAqIEBqYSDjg6rjgr3jg7zjgrnlj5blvpfjga7jgZ/jgoHjga4g5ZCM5pyfIGBHRVRgIOODquOCr+OCqOOCueODiC4gPGJyPlxuICogICAgIOWkmuOBj+OBruODluODqeOCpuOCtuOBp+OBr+ODoeOCpOODs+OCueODrOODg+ODieOBq+OBiuOBkeOCi+WQjOacn+eahOOBqiBYSFIg44Gu5a++5b+c44KS5YWo6Z2i55qE44Gr6Z2e5o6o5aWo44Go44GX44Gm44GE44KL44Gu44Gn56mN5qW15L2/55So44Gv6YG/44GR44KL44GT44GoLlxuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBkYXRhVHlwZVxuICogIC0gYGVuYCBUaGUgdHlwZSBvZiBkYXRhIHRoYXQgeW91J3JlIGV4cGVjdGluZyBiYWNrIGZyb20gdGhlIHNlcnZlci5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOOCkumAgeS/oeOBmeOCi1VSTOOCkuaMh+WumlxuICogQHBhcmFtIGRhdGFcbiAqICAtIGBlbmAgRGF0YSB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gKiAgLSBgamFgIOOCteODvOODkOODvOOBq+mAgeS/oeOBleOCjOOCi+ODh+ODvOOCvy5cbiAqL1xuY29uc3QgcmVzb3VyY2UgPSA8VCBleHRlbmRzICd0ZXh0JyB8ICdqc29uJyB8IG9iamVjdCA9ICdqc29uJz4oXG4gICAgdXJsOiBzdHJpbmcsXG4gICAgZGF0YVR5cGU/OiBUIGV4dGVuZHMgJ3RleHQnIHwgJ2pzb24nID8gVCA6ICdqc29uJyxcbiAgICBkYXRhPzogUGxhaW5PYmplY3QsXG4pOiBBamF4UmVzdWx0PFQ+ID0+IHtcbiAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgIGlmIChudWxsICE9IGRhdGEgJiYgIXVybC5pbmNsdWRlcygnPycpKSB7XG4gICAgICAgIHVybCArPSBgPyR7dG9RdWVyeVN0cmluZ3MoZGF0YSl9YDtcbiAgICB9XG5cbiAgICAvLyBzeW5jaHJvbm91c1xuICAgIHhoci5vcGVuKCdHRVQnLCB1cmwsIGZhbHNlKTtcblxuICAgIGNvbnN0IHR5cGUgPSBlbnN1cmVEYXRhVHlwZShkYXRhVHlwZSk7XG4gICAgY29uc3QgaGVhZGVycyA9IHNldHVwSGVhZGVycyh7IG1ldGhvZDogJ0dFVCcsIGRhdGFUeXBlOiB0eXBlIH0pO1xuICAgIGhlYWRlcnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHhoci5zZW5kKG51bGwpO1xuICAgIGlmICghKDIwMCA8PSB4aHIuc3RhdHVzICYmIHhoci5zdGF0dXMgPCAzMDApKSB7XG4gICAgICAgIHRocm93IG1ha2VSZXN1bHQoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSwgeGhyLnN0YXR1c1RleHQsIHhocik7XG4gICAgfVxuXG4gICAgcmV0dXJuICdqc29uJyA9PT0gdHlwZSA/IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKSA6IHhoci5yZXNwb25zZTtcbn07XG5cbmV4cG9ydCBjb25zdCByZXF1ZXN0ID0ge1xuICAgIGdldCxcbiAgICB0ZXh0LFxuICAgIGpzb24sXG4gICAgYmxvYixcbiAgICBwb3N0LFxuICAgIHJlc291cmNlLFxufTtcbiIsImltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBjbGFzc05hbWUsXG4gICAgc2FmZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqXG4gKiBAZW4ge0BsaW5rIElubGluZVdvcmtlcn0gc291cmNlIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgSW5saW5lV29ya2VyfSDjgavmjIflrprlj6/og73jgarjgr3jg7zjgrnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgSW5saWVuV29ya2VyU291cmNlID0gKChzZWxmOiBXb3JrZXIpID0+IHVua25vd24pIHwgc3RyaW5nO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IFVSTCAgICA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBXb3JrZXIgPSBzYWZlKGdsb2JhbFRoaXMuV29ya2VyKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgQmxvYiAgID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYzogSW5saWVuV29ya2VyU291cmNlKTogc3RyaW5nIHtcbiAgICBpZiAoIShpc0Z1bmN0aW9uKHNyYykgfHwgaXNTdHJpbmcoc3JjKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoc3JjKX0gaXMgbm90IGEgZnVuY3Rpb24gb3Igc3RyaW5nLmApO1xuICAgIH1cbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbaXNGdW5jdGlvbihzcmMpID8gYCgke3NyYy50b1N0cmluZygpfSkoc2VsZik7YCA6IHNyY10sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnIH0pKTtcbn1cblxuLyoqXG4gKiBAZW4gU3BlY2lmaWVkIGBXb3JrZXJgIGNsYXNzIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBhIHNjcmlwdCBmaWxlLlxuICogQGphIOOCueOCr+ODquODl+ODiOODleOCoeOCpOODq+OCkuW/heimgeOBqOOBl+OBquOBhCBgV29ya2VyYCDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIElubGluZVdvcmtlciBleHRlbmRzIFdvcmtlciB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX2NvbnRleHQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjXG4gICAgICogIC0gYGVuYCBzb3VyY2UgZnVuY3Rpb24gb3Igc2NyaXB0IGJvZHkuXG4gICAgICogIC0gYGphYCDlrp/ooYzplqLmlbDjgb7jgZ/jga/jgrnjgq/jg6rjg5fjg4jlrp/kvZNcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgd29ya2VyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBXb3JrZXIg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBJbmxpZW5Xb3JrZXJTb3VyY2UsIG9wdGlvbnM/OiBXb3JrZXJPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYyk7XG4gICAgICAgIHN1cGVyKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogV29ya2VyXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIEJMT0IgcmVsZWFzZS4gV2hlbiBjYWxsaW5nIGBjbG9zZSAoKWAgaW4gdGhlIFdvcmtlciwgY2FsbCB0aGlzIG1ldGhvZCBhcyB3ZWxsLlxuICAgICAqIEBqYSBCTE9CIOino+aUvueUqC4gV29ya2VyIOWGheOBpyBgY2xvc2UoKWAg44KS5ZG844G25aC05ZCILCDmnKzjg6Hjgr3jg4Pjg4njgoLjgrPjg7zjg6vjgZnjgovjgZPjgaguXG4gICAgICovXG4gICAgdGVybWluYXRlKCk6IHZvaWQge1xuICAgICAgICBzdXBlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLl9jb250ZXh0KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIENhbmNlbGFibGUsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IElubGluZVdvcmtlciB9IGZyb20gJy4vaW5pbmUtd29ya2VyJztcblxuLyoqXG4gKiBAZW4gVGhyZWFkIG9wdGlvbnNcbiAqIEBlbiDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUaHJlYWRPcHRpb25zPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+IGV4dGVuZHMgQ2FuY2VsYWJsZSwgV29ya2VyT3B0aW9ucyB7XG4gICAgYXJncz86IFBhcmFtZXRlcnM8VD47XG59XG5cbi8qKlxuICogQGVuIEVuc3VyZSBleGVjdXRpb24gaW4gd29ya2VyIHRocmVhZC5cbiAqIEBqYSDjg6/jg7zjgqvjg7zjgrnjg6zjg4Pjg4nlhoXjgaflrp/ooYzjgpLkv53oqLxcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGV4ZWMgPSAoYXJnMTogbnVtYmVyLCBhcmcyOiBzdHJpbmcpID0+IHtcbiAqICAgIC8vIHRoaXMgc2NvcGUgaXMgd29ya2VyIHNjb3BlLiB5b3UgY2Fubm90IHVzZSBjbG9zdXJlIGFjY2Vzcy5cbiAqICAgIGNvbnN0IHBhcmFtID0gey4uLn07XG4gKiAgICBjb25zdCBtZXRob2QgPSAocCkgPT4gey4uLn07XG4gKiAgICAvLyB5b3UgY2FuIGFjY2VzcyBhcmd1bWVudHMgZnJvbSBvcHRpb25zLlxuICogICAgY29uc29sZS5sb2coYXJnMSk7IC8vICcxJ1xuICogICAgY29uc29sZS5sb2coYXJnMik7IC8vICd0ZXN0J1xuICogICAgOlxuICogICAgcmV0dXJuIG1ldGhvZChwYXJhbSk7XG4gKiB9O1xuICpcbiAqIGNvbnN0IGFyZzEgPSAxO1xuICogY29uc3QgYXJnMiA9ICd0ZXN0JztcbiAqIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRocmVhZChleGVjLCB7IGFyZ3M6IFthcmcxLCBhcmcyXSB9KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBpbXBsZW1lbnQgYXMgZnVuY3Rpb24gc2NvcGUuXG4gKiAgLSBgamFgIOmWouaVsOOCueOCs+ODvOODl+OBqOOBl+OBpuWun+ijhVxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdGhyZWFkIG9wdGlvbnNcbiAqICAtIGBqYWAg44K544Os44OD44OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aHJlYWQ8VCwgVT4oZXhlY3V0b3I6ICguLi5hcmdzOiBVW10pID0+IFQgfCBQcm9taXNlPFQ+LCBvcHRpb25zPzogVGhyZWFkT3B0aW9uczx0eXBlb2YgZXhlY3V0b3I+KTogUHJvbWlzZTxUPiB7XG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIGFyZ3MgfSA9IE9iamVjdC5hc3NpZ24oeyBhcmdzOiBbXSB9LCBvcHRpb25zKTtcblxuICAgIC8vIGFscmVhZHkgY2FuY2VsXG4gICAgaWYgKG9yaWdpbmFsVG9rZW4/LnJlcXVlc3RlZCkge1xuICAgICAgICB0aHJvdyBvcmlnaW5hbFRva2VuLnJlYXNvbjtcbiAgICB9XG5cbiAgICBjb25zdCBleGVjID0gYChzZWxmID0+IHtcbiAgICAgICAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgYXN5bmMgKHsgZGF0YSB9KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICgke2V4ZWN1dG9yLnRvU3RyaW5nKCl9KSguLi5kYXRhKTtcbiAgICAgICAgICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKHJlc3VsdCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZTsgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pKHNlbGYpO2A7XG5cbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgSW5saW5lV29ya2VyKGV4ZWMsIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgYWJvcnQgPSAoKTogdm9pZCA9PiB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgb3JpZ2luYWxUb2tlbj8ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIGNvbnN0IHsgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuISk7XG5cbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB3b3JrZXIub25lcnJvciA9IGV2ID0+IHtcbiAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZWplY3QoZXYpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgICAgICB3b3JrZXIub25tZXNzYWdlID0gZXYgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShldi5kYXRhKTtcbiAgICAgICAgICAgIHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgfTtcbiAgICB9LCB0b2tlbik7XG5cbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoYXJncyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZSBhcyBQcm9taXNlPFQ+O1xufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJCbG9iIiwiVVJMIiwidmVyaWZ5IiwiQ2FuY2VsVG9rZW4iLCJjYyIsImZyb21UeXBlZERhdGEiLCJyZXN0b3JlTnVsbGlzaCIsInRvVHlwZWREYXRhIiwiaXNGdW5jdGlvbiIsImFzc2lnblZhbHVlIiwiaXNOdW1lcmljIiwiRXZlbnRTb3VyY2UiLCJpc051bWJlciIsIm1ha2VSZXN1bHQiLCJSRVNVTFRfQ09ERSIsImlzU3RyaW5nIiwiY2xhc3NOYW1lIl0sIm1hcHBpbmdz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