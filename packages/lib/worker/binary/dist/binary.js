/*!
 * @cdp/binary 0.9.0
 *   binary utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/promise')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/promise'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Utils, global.CDP));
}(this, (function (exports, coreUtils, promise) { 'use strict';

    const _btoa = coreUtils.safe(globalThis.btoa);
    const _atob = coreUtils.safe(globalThis.atob);
    const _Blob = coreUtils.safe(globalThis.Blob);
    const _FileReader = coreUtils.safe(globalThis.FileReader);
    const _URL = coreUtils.safe(globalThis.URL);

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
            return _btoa(unescape(encodeURIComponent(src)));
        }
        /**
         * @en Decodes a string of data which has been encoded using base-64 encoding.
         * @ja base64 形式でエンコードされたデータの文字列をデコード
         */
        static decode(encoded) {
            return decodeURIComponent(escape(_atob(encoded)));
        }
    }

    /* eslint-disable prefer-spread, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
    /** execute read blob */
    function exec(methodName, args, options) {
        const { cancel: token, onprogress } = options;
        token && coreUtils.verify('instanceOf', promise.CancelToken, token);
        onprogress && coreUtils.verify('typeOf', 'function', onprogress);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const subscription = token && token.register(() => {
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
            reader[methodName].apply(reader, args);
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
    /** helper */
    function binaryStringToBinary(bytes) {
        const array = bytes.split('').map(c => c.charCodeAt(0));
        return new Uint8Array(array);
    }
    /** helper */
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
        return new _Blob([buffer], { type: mimeType });
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
        return new _Blob([binary], { type: mimeType });
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
        return new _Blob([text], { type: mimeType });
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
        await promise.checkCanceled(cancel);
        if (null == data) {
            return String(data);
        }
        else if (data instanceof ArrayBuffer) {
            return bufferToDataURL(data);
        }
        else if (data instanceof Uint8Array) {
            return binaryToDataURL(data);
        }
        else if (data instanceof _Blob) {
            return blobToDataURL(data, options);
        }
        else {
            return coreUtils.fromTypedData(data);
        }
    }
    async function deserialize(value, options) {
        const { dataType, cancel } = options || {};
        await promise.checkCanceled(cancel);
        const data = coreUtils.restoreNil(coreUtils.toTypedData(value));
        switch (dataType) {
            case 'string':
                return coreUtils.fromTypedData(data);
            case 'number':
                return Number(data);
            case 'boolean':
                return Boolean(data);
            case 'object':
                return Object(data);
            case 'buffer':
                return dataURLToBuffer(coreUtils.fromTypedData(data));
            case 'binary':
                return dataURLToBinary(coreUtils.fromTypedData(data));
            case 'blob':
                return dataURLToBlob(coreUtils.fromTypedData(data));
            default:
                return data;
        }
    }

    const _blobMap = new WeakMap();
    const _urlSet = new Set();
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
                const url = _URL.createObjectURL(b);
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
                _URL.revokeObjectURL(url);
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
            const url = _URL.createObjectURL(blob);
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
                    _URL.revokeObjectURL(url);
                    _blobMap.delete(b);
                    _urlSet.delete(url);
                }
            }
        }
    }

    exports.Base64 = Base64;
    exports.Blob = _Blob;
    exports.BlobURL = BlobURL;
    exports.FileReader = _FileReader;
    exports.URL = _URL;
    exports.atob = _atob;
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
    exports.btoa = _btoa;
    exports.bufferToBase64 = bufferToBase64;
    exports.bufferToBinary = bufferToBinary;
    exports.bufferToBlob = bufferToBlob;
    exports.bufferToDataURL = bufferToDataURL;
    exports.bufferToText = bufferToText;
    exports.dataURLToBase64 = dataURLToBase64;
    exports.dataURLToBinary = dataURLToBinary;
    exports.dataURLToBlob = dataURLToBlob;
    exports.dataURLToBuffer = dataURLToBuffer;
    exports.dataURLToText = dataURLToText;
    exports.deserialize = deserialize;
    exports.fromBinaryString = fromBinaryString;
    exports.fromHexString = fromHexString;
    exports.readAsArrayBuffer = readAsArrayBuffer;
    exports.readAsDataURL = readAsDataURL;
    exports.readAsText = readAsText;
    exports.serialize = serialize;
    exports.textToBase64 = textToBase64;
    exports.textToBinary = textToBinary;
    exports.textToBlob = textToBlob;
    exports.textToBuffer = textToBuffer;
    exports.textToDataURL = textToDataURL;
    exports.toBinaryString = toBinaryString;
    exports.toHexString = toHexString;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5LmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJiYXNlNjQudHMiLCJibG9iLXJlYWRlci50cyIsImNvbnZlcnRlci50cyIsImJsb2ItdXJsLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG5jb25zdCBfYnRvYSA9IHNhZmUoZ2xvYmFsVGhpcy5idG9hKTtcbmNvbnN0IF9hdG9iID0gc2FmZShnbG9iYWxUaGlzLmF0b2IpO1xuY29uc3QgX0Jsb2IgPSBzYWZlKGdsb2JhbFRoaXMuQmxvYik7XG5jb25zdCBfRmlsZVJlYWRlciA9IHNhZmUoZ2xvYmFsVGhpcy5GaWxlUmVhZGVyKTtcbmNvbnN0IF9VUkwgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcblxuZXhwb3J0IHtcbiAgICBfYnRvYSBhcyBidG9hLFxuICAgIF9hdG9iIGFzIGF0b2IsXG4gICAgX0Jsb2IgYXMgQmxvYixcbiAgICBfRmlsZVJlYWRlciBhcyBGaWxlUmVhZGVyLFxuICAgIF9VUkwgYXMgVVJMLFxufTtcbiIsImltcG9ydCB7IGF0b2IsIGJ0b2EgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIGBiYXNlNjRgIHV0aWxpdHkgZm9yIGluZGVwZW5kZW50IGNoYXJhY3RvciBjb2RlLlxuICogQGphIOaWh+Wtl+OCs+ODvOODieOBq+S+neWtmOOBl+OBquOBhCBgYmFzZTY0YCDjg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2U2NCB7XG4gICAgLyoqXG4gICAgICogQGVuIEVuY29kZSBhIGJhc2UtNjQgZW5jb2RlZCBzdHJpbmcgZnJvbSBhIGJpbmFyeSBzdHJpbmcuXG4gICAgICogQGphIOaWh+Wtl+WIl+OCkiBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3JjKSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWNvZGVzIGEgc3RyaW5nIG9mIGRhdGEgd2hpY2ggaGFzIGJlZW4gZW5jb2RlZCB1c2luZyBiYXNlLTY0IGVuY29kaW5nLlxuICAgICAqIEBqYSBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJ44GV44KM44Gf44OH44O844K/44Gu5paH5a2X5YiX44KS44OH44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBkZWNvZGUoZW5jb2RlZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYXRvYihlbmNvZGVkKSkpO1xuICAgIH1cbn1cbiIsIi8qIGVzbGludC1kaXNhYmxlIHByZWZlci1zcHJlYWQsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24gKi9cblxuaW1wb3J0IHsgdmVyaWZ5IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IENhbmNlbFRva2VuLCBDYW5jZWxhYmxlIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEZpbGVSZWFkZXJBcmdzTWFwIHtcbiAgICByZWFkQXNBcnJheUJ1ZmZlcjogW0Jsb2JdO1xuICAgIHJlYWRBc0RhdGFVUkw6IFtCbG9iXTtcbiAgICByZWFkQXNUZXh0OiBbQmxvYiwgc3RyaW5nIHwgdW5kZWZpbmVkXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEZpbGVSZWFkZXJSZXN1bHRNYXAge1xuICAgIHJlYWRBc0FycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcjtcbiAgICByZWFkQXNEYXRhVVJMOiBzdHJpbmc7XG4gICAgcmVhZEFzVGV4dDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBgQmxvYmAgcmVhZCBvcHRpb25zXG4gKiBAamEgYEJsb2JgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEJsb2JSZWFkT3B0aW9ucyBleHRlbmRzIENhbmNlbGFibGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBQcm9ncmVzcyBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAamEg6YCy5o2X44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvZ3Jlc3NcbiAgICAgKiAgLSBgZW5gIHdvcmtlciBwcm9ncmVzcyBldmVudFxuICAgICAqICAtIGBqYWAgd29ya2VyIOmAsuaNl+OCpOODmeODs+ODiFxuICAgICAqL1xuICAgIG9ucHJvZ3Jlc3M/OiAocHJvZ3Jlc3M6IFByb2dyZXNzRXZlbnQpID0+IGFueTtcbn1cblxuLyoqIGV4ZWN1dGUgcmVhZCBibG9iICovXG5mdW5jdGlvbiBleGVjPFQgZXh0ZW5kcyBrZXlvZiBGaWxlUmVhZGVyUmVzdWx0TWFwPihcbiAgICBtZXRob2ROYW1lOiBULFxuICAgIGFyZ3M6IEZpbGVSZWFkZXJBcmdzTWFwW1RdLFxuICAgIG9wdGlvbnM6IEJsb2JSZWFkT3B0aW9ucyxcbik6IFByb21pc2U8RmlsZVJlYWRlclJlc3VsdE1hcFtUXT4ge1xuICAgIHR5cGUgVFJlc3VsdCA9IEZpbGVSZWFkZXJSZXN1bHRNYXBbVF07XG4gICAgY29uc3QgeyBjYW5jZWw6IHRva2VuLCBvbnByb2dyZXNzIH0gPSBvcHRpb25zO1xuICAgIHRva2VuICYmIHZlcmlmeSgnaW5zdGFuY2VPZicsIENhbmNlbFRva2VuLCB0b2tlbik7XG4gICAgb25wcm9ncmVzcyAmJiB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIG9ucHJvZ3Jlc3MpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxUUmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRva2VuICYmIHRva2VuLnJlZ2lzdGVyKCgpID0+IHtcbiAgICAgICAgICAgIHJlYWRlci5hYm9ydCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVhZGVyLm9uYWJvcnQgPSByZWFkZXIub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25wcm9ncmVzcyA9IG9ucHJvZ3Jlc3MhO1xuICAgICAgICByZWFkZXIub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0IGFzIFRSZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25sb2FkZW5kID0gKCkgPT4ge1xuICAgICAgICAgICAgc3Vic2NyaXB0aW9uICYmIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXJbbWV0aG9kTmFtZV0uYXBwbHkocmVhZGVyLCBhcmdzKTtcbiAgICB9LCB0b2tlbik7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgYEFycmF5QnVmZmVyYCByZXN1bHQgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0FycmF5QnVmZmVyKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0FycmF5QnVmZmVyJywgW2Jsb2JdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGF0YS1VUkwgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgokgYGRhdGEtdXJsIOaWh+Wtl+WIl+OCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc0RhdGFVUkwoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc0RhdGFVUkwnLCBbYmxvYl0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB0ZXh0IGNvbnRlbnQgc3RyaW5nIGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgonjg4bjgq3jgrnjg4jmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBlbmNvZGluZ1xuICogIC0gYGVuYCBlbmNvZGluZyBzdHJpbmcgdG8gdXNlIGZvciB0aGUgcmV0dXJuZWQgZGF0YS4gZGVmYXVsdDogYHV0Zi04YFxuICogIC0gYGphYCDjgqjjg7PjgrPjg7zjg4fjgqPjg7PjgrDjgpLmjIflrprjgZnjgovmloflrZfliJcg5pei5a6aOiBgdXRmLThgXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzVGV4dChibG9iOiBCbG9iLCBlbmNvZGluZz86IHN0cmluZyB8IG51bGwsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNUZXh0JywgW2Jsb2IsIGVuY29kaW5nIHx8IHVuZGVmaW5lZF0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cbiIsImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBUeXBlcyxcbiAgICBUeXBlVG9LZXksXG4gICAgdG9UeXBlZERhdGEsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICByZXN0b3JlTmlsLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICcuL2Jhc2U2NCc7XG5pbXBvcnQge1xuICAgIEJsb2JSZWFkT3B0aW9ucyxcbiAgICByZWFkQXNBcnJheUJ1ZmZlcixcbiAgICByZWFkQXNEYXRhVVJMLFxuICAgIHJlYWRBc1RleHQsXG59IGZyb20gJy4vYmxvYi1yZWFkZXInO1xuaW1wb3J0IHsgQmxvYiB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBNaW1lVHlwZSB7XG4gICAgQklOQVJZID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScsXG4gICAgVEVYVCA9ICd0ZXh0L3BsYWluJyxcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZGF0YS1VUkwg5bGe5oCnICovXG5pbnRlcmZhY2UgRGF0YVVSTENvbnRleHQge1xuICAgIG1pbWVUeXBlOiBzdHJpbmc7XG4gICAgYmFzZTY0OiBib29sZWFuO1xuICAgIGRhdGE6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIGRhdGEgVVJJIOW9ouW8j+OBruato+imj+ihqOePvlxuICog5Y+C6ICDOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL2RhdGFfVVJJc1xuICovXG5mdW5jdGlvbiBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkw6IHN0cmluZyk6IERhdGFVUkxDb250ZXh0IHtcbiAgICBjb25zdCBjb250ZXh0ID0geyBiYXNlNjQ6IGZhbHNlIH0gYXMgRGF0YVVSTENvbnRleHQ7XG5cbiAgICAvKipcbiAgICAgKiBbbWF0Y2hdIDE6IG1pbWUtdHlwZVxuICAgICAqICAgICAgICAgMjogXCI7YmFzZTY0XCIg44KS5ZCr44KA44Kq44OX44K344On44OzXG4gICAgICogICAgICAgICAzOiBkYXRhIOacrOS9k1xuICAgICAqL1xuICAgIGNvbnN0IHJlc3VsdCA9IC9eZGF0YTooLis/XFwvLis/KT8oOy4rPyk/LCguKikkLy5leGVjKGRhdGFVUkwpO1xuICAgIGlmIChudWxsID09IHJlc3VsdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGF0YS1VUkw6ICR7ZGF0YVVSTH1gKTtcbiAgICB9XG5cbiAgICBjb250ZXh0Lm1pbWVUeXBlID0gcmVzdWx0WzFdO1xuICAgIGNvbnRleHQuYmFzZTY0ID0gLztiYXNlNjQvLnRlc3QocmVzdWx0WzJdKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWluY2x1ZGVzXG4gICAgY29udGV4dC5kYXRhID0gcmVzdWx0WzNdO1xuXG4gICAgcmV0dXJuIGNvbnRleHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogaGVscGVyICovXG5mdW5jdGlvbiBiaW5hcnlTdHJpbmdUb0JpbmFyeShieXRlczogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgY29uc3QgYXJyYXkgPSBieXRlcy5zcGxpdCgnJykubWFwKGMgPT4gYy5jaGFyQ29kZUF0KDApKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpO1xufVxuXG4vKiogaGVscGVyICovXG5mdW5jdGlvbiBiaW5hcnlUb0JpbmFyeVN0cmluZyhiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwoYmluYXJ5LCAoaTogbnVtYmVyKSA9PiBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpKS5qb2luKCcnKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgdG8gYmluYXJ5LXN0cmluZy4gKG5vdCBodW1hbiByZWFkYWJsZSBzdHJpbmcpXG4gKiBAamEg44OQ44Kk44OK44Oq5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQmluYXJ5U3RyaW5nKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudCh0ZXh0KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIGZyb20gYmluYXJ5LXN0cmluZy5cbiAqIEBqYSDjg5DjgqTjg4rjg6rmloflrZfliJfjgYvjgonlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnl0ZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21CaW5hcnlTdHJpbmcoYnl0ZXM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYnl0ZXMpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBiaW5hcnkgdG8gaGV4LXN0cmluZy5cbiAqIEBqYSDjg5DjgqTjg4rjg6rjgpIgSEVYIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBoZXhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21IZXhTdHJpbmcoaGV4OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICBjb25zdCB4ID0gaGV4Lm1hdGNoKC8uezEsMn0vZyk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG51bGwgIT0geCA/IHgubWFwKGJ5dGUgPT4gcGFyc2VJbnQoYnl0ZSwgMTYpKSA6IFtdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgZnJvbSBoZXgtc3RyaW5nLlxuICogQGphIEhFWCDmloflrZfliJfjgYvjgonjg5DjgqTjg4rjg6rjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0hleFN0cmluZyhiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnkucmVkdWNlKChzdHIsIGJ5dGUpID0+IHN0ciArIGJ5dGUudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkucGFkU3RhcnQoMiwgJzAnKSwgJycpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9CdWZmZXIoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgICByZXR1cm4gcmVhZEFzQXJyYXlCdWZmZXIoYmxvYiwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGBVaW50OEFycmF5YCDjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJsb2JUb0JpbmFyeShibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGF3YWl0IHJlYWRBc0FycmF5QnVmZmVyKGJsb2IsIG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9EYXRhVVJMKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiByZWFkQXNEYXRhVVJMKGJsb2IsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJ44OG44Kt44K544OI44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9UZXh0KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMgJiB7IGVuY29kaW5nPzogc3RyaW5nIHwgbnVsbDsgfSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgfHwge307XG4gICAgY29uc3QgeyBlbmNvZGluZyB9ID0gb3B0cztcbiAgICByZXR1cm4gcmVhZEFzVGV4dChibG9iLCBlbmNvZGluZywgb3B0cyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBibG9iVG9CYXNlNjQoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHF1ZXJ5RGF0YVVSTENvbnRleHQoYXdhaXQgcmVhZEFzRGF0YVVSTChibG9iLCBvcHRpb25zKSkuZGF0YTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBgQmxvYmAuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CbG9iKGJ1ZmZlcjogQXJyYXlCdWZmZXIsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW2J1ZmZlcl0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBgVWludDhBcnJheWAuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CaW5hcnkoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9EYXRhVVJMKGJ1ZmZlcjogQXJyYXlCdWZmZXIsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb0RhdGFVUkwobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSwgbWltZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0Jhc2U2NChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9CYXNlNjQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCieODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9UZXh0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb1RleHQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBgQmxvYmAuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CbG9iKGJpbmFyeTogVWludDhBcnJheSwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbYmluYXJ5XSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CdWZmZXIoYmluYXJ5OiBVaW50OEFycmF5KTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiBiaW5hcnkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0RhdGFVUkwoYmluYXJ5OiBVaW50OEFycmF5LCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmluYXJ5VG9CYXNlNjQoYmluYXJ5KX1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQmFzZTY0KGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUoYmluYXJ5VG9UZXh0KGJpbmFyeSkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIOODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvVGV4dChiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBmcm9tQmluYXJ5U3RyaW5nKGJpbmFyeVRvQmluYXJ5U3RyaW5nKGJpbmFyeSkpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0Jsb2IoYmFzZTY0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gYmluYXJ5VG9CbG9iKGJhc2U2NFRvQmluYXJ5KGJhc2U2NCksIG1pbWVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQnVmZmVyKGJhc2U2NDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiBiYXNlNjRUb0JpbmFyeShiYXNlNjQpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0JpbmFyeShiYXNlNjQ6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiaW5hcnlTdHJpbmdUb0JpbmFyeSh0b0JpbmFyeVN0cmluZyhCYXNlNjQuZGVjb2RlKGJhc2U2NCkpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvRGF0YVVSTChiYXNlNjQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2Jhc2U2NH1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgIEJhc2U2NCDmloflrZfliJfjgYvjgokg44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9UZXh0KGJhc2U2NDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmRlY29kZShiYXNlNjQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmxvYih0ZXh0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5URVhUKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFt0ZXh0XSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CdWZmZXIodGV4dDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiB0ZXh0VG9CaW5hcnkodGV4dCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CaW5hcnkodGV4dDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJpbmFyeVN0cmluZ1RvQmluYXJ5KHRvQmluYXJ5U3RyaW5nKHRleHQpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9EYXRhVVJMKHRleHQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLlRFWFQpOiBzdHJpbmcge1xuICAgIGNvbnN0IGJhc2U2NCA9IHRleHRUb0Jhc2U2NCh0ZXh0KTtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CYXNlNjQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmVuY29kZSh0ZXh0KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmxvYihkYXRhVVJMOiBzdHJpbmcpOiBCbG9iIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMKTtcbiAgICBpZiAoY29udGV4dC5iYXNlNjQpIHtcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQmxvYihjb250ZXh0LmRhdGEsIGNvbnRleHQubWltZVR5cGUgfHwgTWltZVR5cGUuQklOQVJZKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGV4dFRvQmxvYihkZWNvZGVVUklDb21wb25lbnQoY29udGV4dC5kYXRhKSwgY29udGV4dC5taW1lVHlwZSB8fCBNaW1lVHlwZS5URVhUKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CdWZmZXIoZGF0YVVSTDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICAgIHJldHVybiBkYXRhVVJMVG9CaW5hcnkoZGF0YVVSTCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0JpbmFyeShkYXRhVVJMOiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmFzZTY0VG9CaW5hcnkoZGF0YVVSTFRvQmFzZTY0KGRhdGFVUkwpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJ44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9UZXh0KGRhdGFVUkw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5kZWNvZGUoZGF0YVVSTFRvQmFzZTY0KGRhdGFVUkwpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmFzZTY0KGRhdGFVUkw6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgY29udGV4dCA9IHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTCk7XG4gICAgaWYgKGNvbnRleHQuYmFzZTY0KSB7XG4gICAgICAgIHJldHVybiBjb250ZXh0LmRhdGE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUoZGVjb2RlVVJJQ29tcG9uZW50KGNvbnRleHQuZGF0YSkpO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFNlcmlhbGl6YWJsZSBkYXRhIHR5cGUgbGlzdC5cbiAqIEBqYSDjgrfjg6rjgqLjg6njgqTjgrrlj6/og73jgarjg4fjg7zjgr/lnovkuIDopqdcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXJpYWxpemFibGUge1xuICAgIHN0cmluZzogc3RyaW5nO1xuICAgIG51bWJlcjogbnVtYmVyO1xuICAgIGJvb2xlYW46IGJvb2xlYW47XG4gICAgb2JqZWN0OiBvYmplY3Q7XG4gICAgYnVmZmVyOiBBcnJheUJ1ZmZlcjtcbiAgICBiaW5hcnk6IFVpbnQ4QXJyYXk7XG4gICAgYmxvYjogQmxvYjtcbn1cblxuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlRGF0YVR5cGVzID0gVHlwZXM8U2VyaWFsaXphYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUlucHV0RGF0YVR5cGVzID0gU2VyaWFsaXphYmxlRGF0YVR5cGVzIHwgbnVsbCB8IHVuZGVmaW5lZDtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUtleXMgPSBLZXlzPFNlcmlhbGl6YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVDYXN0YWJsZSA9IE9taXQ8U2VyaWFsaXphYmxlLCAnYnVmZmVyJyB8ICdiaW5hcnknIHwgJ2Jsb2InPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXMgPSBUeXBlczxTZXJpYWxpemFibGVDYXN0YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVSZXR1cm5UeXBlPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzPiA9IFR5cGVUb0tleTxTZXJpYWxpemFibGVDYXN0YWJsZSwgVD4gZXh0ZW5kcyBuZXZlciA/IG5ldmVyIDogVCB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXphYmxlIG9wdGlvbnMgaW50ZXJmYWNlLlxuICogQGphIOODh+OCt+ODquOCouODqeOCpOOCuuOBq+S9v+eUqOOBmeOCi+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIERlc2VyaWFsaXplT3B0aW9uczxUIGV4dGVuZHMgU2VyaWFsaXphYmxlID0gU2VyaWFsaXphYmxlLCBLIGV4dGVuZHMgS2V5czxUPiA9IEtleXM8VD4+IGV4dGVuZHMgQ2FuY2VsYWJsZSB7XG4gICAgLyoqIFtbU2VyaWFsaXphYmxlS2V5c11dICovXG4gICAgZGF0YVR5cGU/OiBLO1xufVxuXG4vKipcbiAqIEBlbiBTZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jgrfjg6rjgqLjg6njgqTjgrpcbiAqXG4gKiBAcGFyYW0gZGF0YSBpbnB1dFxuICogQHBhcmFtIG9wdGlvbnMgYmxvYiBjb252ZXJ0IG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXM+KGRhdGE6IFQsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgaWYgKG51bGwgPT0gZGF0YSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBidWZmZXJUb0RhdGFVUkwoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICByZXR1cm4gYmluYXJ5VG9EYXRhVVJMKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgICAgcmV0dXJuIGJsb2JUb0RhdGFVUkwoZGF0YSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzID0gU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcz4oXG4gICAgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IERlc2VyaWFsaXplT3B0aW9uczxTZXJpYWxpemFibGUsIG5ldmVyPlxuKTogUHJvbWlzZTxTZXJpYWxpemFibGVSZXR1cm5UeXBlPFQ+PjtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVLZXlzPih2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBEZXNlcmlhbGl6ZU9wdGlvbnM8U2VyaWFsaXphYmxlLCBUPik6IFByb21pc2U8U2VyaWFsaXphYmxlW1RdIHwgbnVsbCB8IHVuZGVmaW5lZD47XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZXNlcmlhbGl6ZSh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zPzogRGVzZXJpYWxpemVPcHRpb25zKTogUHJvbWlzZTxTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgeyBkYXRhVHlwZSwgY2FuY2VsIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG5cbiAgICBjb25zdCBkYXRhID0gcmVzdG9yZU5pbCh0b1R5cGVkRGF0YSh2YWx1ZSkpO1xuICAgIHN3aXRjaCAoZGF0YVR5cGUpIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKGRhdGEpO1xuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgcmV0dXJuIE51bWJlcihkYXRhKTtcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICByZXR1cm4gQm9vbGVhbihkYXRhKTtcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2J1ZmZlcic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQnVmZmVyKGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nKTtcbiAgICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CaW5hcnkoZnJvbVR5cGVkRGF0YShkYXRhKSBhcyBzdHJpbmcpO1xuICAgICAgICBjYXNlICdibG9iJzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CbG9iKGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFVSTCB9IGZyb20gJy4vc3NyJztcblxuY29uc3QgX2Jsb2JNYXAgPSBuZXcgV2Vha01hcDxCbG9iLCBzdHJpbmc+KCk7XG5jb25zdCBfdXJsU2V0ICA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4vKipcbiAqIEBlbiBgQmxvYiBVUkxgIHV0aWxpdHkgZm9yIGF1dG9tYXRpYyBtZW1vcnkgbWFuZWdlbWVudC5cbiAqIEBqYSDjg6Hjg6Ljg6roh6rli5XnrqHnkIbjgpLooYzjgYYgYEJsb2IgVVJMYCDjg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAqL1xuZXhwb3J0IGNsYXNzIEJsb2JVUkwge1xuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlcy5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44Gu5qeL56+JXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjcmVhdGUoLi4uYmxvYnM6IEJsb2JbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGIgb2YgYmxvYnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gX2Jsb2JNYXAuZ2V0KGIpO1xuICAgICAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGIpO1xuICAgICAgICAgICAgX2Jsb2JNYXAuc2V0KGIsIHVybCk7XG4gICAgICAgICAgICBfdXJsU2V0LmFkZCh1cmwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENsZWFyIGFsbCBgQmxvYiBVUkxgIGNhY2hlLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga4gYEJsb2IgVVJMYCDjgq3jg6Pjg4Pjgrfjg6XjgpLnoLTmo4RcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNsZWFyKCk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiBfdXJsU2V0KSB7XG4gICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgIH1cbiAgICAgICAgX3VybFNldC5jbGVhcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjga7lj5blvpdcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGdldChibG9iOiBCbG9iKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgY2FjaGUgPSBfYmxvYk1hcC5nZXQoYmxvYik7XG4gICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhY2hlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgIF9ibG9iTWFwLnNldChibG9iLCB1cmwpO1xuICAgICAgICBfdXJsU2V0LmFkZCh1cmwpO1xuICAgICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDaGVjayBgQmxvYiBVUkxgIGlzIGF2YWlsYWJsZSBmcm9tIGluc3RhbmNlLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjgYzmnInlirnljJbliKTlrppcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGhhcyhibG9iOiBCbG9iKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiBfYmxvYk1hcC5oYXMoYmxvYik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldm9rZSBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjgpLnhKHlirnljJZcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHJldm9rZSguLi5ibG9iczogQmxvYltdKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgYiBvZiBibG9icykge1xuICAgICAgICAgICAgY29uc3QgdXJsID0gX2Jsb2JNYXAuZ2V0KGIpO1xuICAgICAgICAgICAgaWYgKHVybCkge1xuICAgICAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgICAgICAgICBfYmxvYk1hcC5kZWxldGUoYik7XG4gICAgICAgICAgICAgICAgX3VybFNldC5kZWxldGUodXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJzYWZlIiwiYnRvYSIsImF0b2IiLCJ2ZXJpZnkiLCJDYW5jZWxUb2tlbiIsIkJsb2IiLCJjYyIsImZyb21UeXBlZERhdGEiLCJyZXN0b3JlTmlsIiwidG9UeXBlZERhdGEiLCJVUkwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O1VBRU0sS0FBSyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRTtVQUM5QixLQUFLLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFO1VBQzlCLEtBQUssR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUU7VUFDOUIsV0FBVyxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRTtVQUMxQyxJQUFJLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsR0FBRzs7SUNKaEM7Ozs7QUFJQSxVQUFhLE1BQU07Ozs7O1FBS1IsT0FBTyxNQUFNLENBQUMsR0FBVztZQUM1QixPQUFPQyxLQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNsRDs7Ozs7UUFNTSxPQUFPLE1BQU0sQ0FBQyxPQUFlO1lBQ2hDLE9BQU8sa0JBQWtCLENBQUMsTUFBTSxDQUFDQyxLQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3BEO0tBQ0o7O0lDdEJEO0FBRUEsSUFpQ0E7SUFDQSxTQUFTLElBQUksQ0FDVCxVQUFhLEVBQ2IsSUFBMEIsRUFDMUIsT0FBd0I7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
