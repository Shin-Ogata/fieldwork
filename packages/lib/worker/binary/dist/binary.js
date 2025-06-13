/*!
 * @cdp/binary 0.9.19
 *   binary utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/promise')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/promise'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, promise) { 'use strict';

    /** @internal */ const btoa = coreUtils.safe(globalThis.btoa);
    /** @internal */ const atob = coreUtils.safe(globalThis.atob);
    /** @internal */ const Blob = coreUtils.safe(globalThis.Blob);
    /** @internal */ const FileReader = coreUtils.safe(globalThis.FileReader);
    /** @internal */ const URL = coreUtils.safe(globalThis.URL);
    /** @internal */ const TextEncoder = coreUtils.safe(globalThis.TextEncoder);

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
        token && coreUtils.verify('instanceOf', promise.CancelToken, token);
        onprogress && coreUtils.verify('typeOf', 'function', onprogress);
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
        else if (data instanceof Blob) {
            return blobToDataURL(data, options);
        }
        else {
            return coreUtils.fromTypedData(data);
        }
    }
    async function deserialize(value, options) {
        const { dataType, cancel } = options ?? {};
        await promise.checkCanceled(cancel);
        const data = coreUtils.restoreNullish(coreUtils.toTypedData(value));
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

    exports.Base64 = Base64;
    exports.BlobURL = BlobURL;
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

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5LmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJiYXNlNjQudHMiLCJibG9iLXJlYWRlci50cyIsImNvbnZlcnRlci50cyIsImJsb2ItdXJsLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBidG9hICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5idG9hKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGF0b2IgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmF0b2IpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgQmxvYiAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuQmxvYik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBGaWxlUmVhZGVyICA9IHNhZmUoZ2xvYmFsVGhpcy5GaWxlUmVhZGVyKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTCAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLlVSTCk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBUZXh0RW5jb2RlciA9IHNhZmUoZ2xvYmFsVGhpcy5UZXh0RW5jb2Rlcik7XG4iLCJpbXBvcnQge1xuICAgIFRleHRFbmNvZGVyLFxuICAgIGF0b2IsXG4gICAgYnRvYSxcbn0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBgYmFzZTY0YCB1dGlsaXR5IGZvciBpbmRlcGVuZGVudCBjaGFyYWN0b3IgY29kZS5cbiAqIEBqYSDmloflrZfjgrPjg7zjg4njgavkvp3lrZjjgZfjgarjgYQgYGJhc2U2NGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCYXNlNjQge1xuICAgIC8qKlxuICAgICAqIEBlbiBFbmNvZGUgYSBiYXNlLTY0IGVuY29kZWQgc3RyaW5nIGZyb20gYSBiaW5hcnkgc3RyaW5nLlxuICAgICAqIEBqYSDmloflrZfliJfjgpIgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZW5jb2RlKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgdXRmOEJ5dGVzID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHNyYyk7XG4gICAgICAgIGNvbnN0IGJpbmFyeVN0cmluZyA9IEFycmF5LmZyb20odXRmOEJ5dGVzKVxuICAgICAgICAgICAgLm1hcChieXRlID0+IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZSkpXG4gICAgICAgICAgICAuam9pbignJyk7XG4gICAgICAgIHJldHVybiBidG9hKGJpbmFyeVN0cmluZyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlY29kZXMgYSBzdHJpbmcgb2YgZGF0YSB3aGljaCBoYXMgYmVlbiBlbmNvZGVkIHVzaW5nIGJhc2UtNjQgZW5jb2RpbmcuXG4gICAgICogQGphIGJhc2U2NCDlvaLlvI/jgafjgqjjg7PjgrPjg7zjg4njgZXjgozjgZ/jg4fjg7zjgr/jga7mloflrZfliJfjgpLjg4fjgrPjg7zjg4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGRlY29kZShlbmNvZGVkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBiaW5hcnlTdHJpbmcgPSBhdG9iKGVuY29kZWQpO1xuICAgICAgICBjb25zdCB1dGY4Qnl0ZXMgPSBVaW50OEFycmF5LmZyb20oYmluYXJ5U3RyaW5nLCBjaGFyID0+IGNoYXIuY2hhckNvZGVBdCgwKSk7XG4gICAgICAgIHJldHVybiBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUodXRmOEJ5dGVzKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB0eXBlIFVua25vd25GdW5jdGlvbiwgdmVyaWZ5IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHR5cGUgQ2FuY2VsYWJsZSwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgRmlsZVJlYWRlciB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEZpbGVSZWFkZXJBcmdzTWFwIHtcbiAgICByZWFkQXNBcnJheUJ1ZmZlcjogW0Jsb2JdO1xuICAgIHJlYWRBc0RhdGFVUkw6IFtCbG9iXTtcbiAgICByZWFkQXNUZXh0OiBbQmxvYiwgc3RyaW5nIHwgdW5kZWZpbmVkXTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIEZpbGVSZWFkZXJSZXN1bHRNYXAge1xuICAgIHJlYWRBc0FycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcjtcbiAgICByZWFkQXNEYXRhVVJMOiBzdHJpbmc7XG4gICAgcmVhZEFzVGV4dDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBlbiBgQmxvYmAgcmVhZCBvcHRpb25zXG4gKiBAamEgYEJsb2JgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEJsb2JSZWFkT3B0aW9ucyBleHRlbmRzIENhbmNlbGFibGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBQcm9ncmVzcyBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAamEg6YCy5o2X44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcHJvZ3Jlc3NcbiAgICAgKiAgLSBgZW5gIHdvcmtlciBwcm9ncmVzcyBldmVudFxuICAgICAqICAtIGBqYWAgd29ya2VyIOmAsuaNl+OCpOODmeODs+ODiFxuICAgICAqL1xuICAgIG9ucHJvZ3Jlc3M/OiAocHJvZ3Jlc3M6IFByb2dyZXNzRXZlbnQpID0+IHVua25vd247XG59XG5cbi8qKiBAaW50ZXJuYWwgZXhlY3V0ZSByZWFkIGJsb2IgKi9cbmZ1bmN0aW9uIGV4ZWM8VCBleHRlbmRzIGtleW9mIEZpbGVSZWFkZXJSZXN1bHRNYXA+KFxuICAgIG1ldGhvZE5hbWU6IFQsXG4gICAgYXJnczogRmlsZVJlYWRlckFyZ3NNYXBbVF0sXG4gICAgb3B0aW9uczogQmxvYlJlYWRPcHRpb25zLFxuKTogUHJvbWlzZTxGaWxlUmVhZGVyUmVzdWx0TWFwW1RdPiB7XG4gICAgdHlwZSBUUmVzdWx0ID0gRmlsZVJlYWRlclJlc3VsdE1hcFtUXTtcbiAgICBjb25zdCB7IGNhbmNlbDogdG9rZW4sIG9ucHJvZ3Jlc3MgfSA9IG9wdGlvbnM7XG4gICAgdG9rZW4gJiYgdmVyaWZ5KCdpbnN0YW5jZU9mJywgQ2FuY2VsVG9rZW4sIHRva2VuKTtcbiAgICBvbnByb2dyZXNzICYmIHZlcmlmeSgndHlwZU9mJywgJ2Z1bmN0aW9uJywgb25wcm9ncmVzcyk7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFRSZXN1bHQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdG9rZW4/LnJlZ2lzdGVyKCgpID0+IHtcbiAgICAgICAgICAgIHJlYWRlci5hYm9ydCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVhZGVyLm9uYWJvcnQgPSByZWFkZXIub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25wcm9ncmVzcyA9IG9ucHJvZ3Jlc3MhO1xuICAgICAgICByZWFkZXIub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0IGFzIFRSZXN1bHQpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25sb2FkZW5kID0gKCkgPT4ge1xuICAgICAgICAgICAgc3Vic2NyaXB0aW9uICYmIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICB9O1xuICAgICAgICAocmVhZGVyW21ldGhvZE5hbWVdIGFzIFVua25vd25GdW5jdGlvbikoLi4uYXJncyk7XG4gICAgfSwgdG9rZW4pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGBBcnJheUJ1ZmZlcmAgcmVzdWx0IGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNBcnJheUJ1ZmZlcihibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNBcnJheUJ1ZmZlcicsIFtibG9iXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGRhdGEtVVJMIHN0cmluZyBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJIGBkYXRhLXVybCDmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNEYXRhVVJMKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNEYXRhVVJMJywgW2Jsb2JdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdGV4dCBjb250ZW50IHN0cmluZyBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJ44OG44Kt44K544OI5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gZW5jb2RpbmdcbiAqICAtIGBlbmAgZW5jb2Rpbmcgc3RyaW5nIHRvIHVzZSBmb3IgdGhlIHJldHVybmVkIGRhdGEuIGRlZmF1bHQ6IGB1dGYtOGBcbiAqICAtIGBqYWAg44Ko44Oz44Kz44O844OH44Kj44Oz44Kw44KS5oyH5a6a44GZ44KL5paH5a2X5YiXIOaXouWumjogYHV0Zi04YFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc1RleHQoYmxvYjogQmxvYiwgZW5jb2Rpbmc/OiBzdHJpbmcgfCBudWxsLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzVGV4dCcsIFtibG9iLCBlbmNvZGluZyA/PyB1bmRlZmluZWRdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgS2V5cyxcbiAgICB0eXBlIFR5cGVzLFxuICAgIHR5cGUgVHlwZVRvS2V5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgcmVzdG9yZU51bGxpc2gsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgQmFzZTY0IH0gZnJvbSAnLi9iYXNlNjQnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEJsb2JSZWFkT3B0aW9ucyxcbiAgICByZWFkQXNBcnJheUJ1ZmZlcixcbiAgICByZWFkQXNEYXRhVVJMLFxuICAgIHJlYWRBc1RleHQsXG59IGZyb20gJy4vYmxvYi1yZWFkZXInO1xuaW1wb3J0IHsgQmxvYiB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBNaW1lVHlwZSB7XG4gICAgQklOQVJZID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScsXG4gICAgVEVYVCA9ICd0ZXh0L3BsYWluJyxcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZGF0YS1VUkwg5bGe5oCnICovXG5pbnRlcmZhY2UgRGF0YVVSTENvbnRleHQge1xuICAgIG1pbWVUeXBlOiBzdHJpbmc7XG4gICAgYmFzZTY0OiBib29sZWFuO1xuICAgIGRhdGE6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIGRhdGEgVVJJIOW9ouW8j+OBruato+imj+ihqOePvlxuICog5Y+C6ICDOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL2RhdGFfVVJJc1xuICovXG5mdW5jdGlvbiBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkw6IHN0cmluZyk6IERhdGFVUkxDb250ZXh0IHtcbiAgICBjb25zdCBjb250ZXh0ID0geyBiYXNlNjQ6IGZhbHNlIH0gYXMgRGF0YVVSTENvbnRleHQ7XG5cbiAgICAvKipcbiAgICAgKiBbbWF0Y2hdIDE6IG1pbWUtdHlwZVxuICAgICAqICAgICAgICAgMjogXCI7YmFzZTY0XCIg44KS5ZCr44KA44Kq44OX44K344On44OzXG4gICAgICogICAgICAgICAzOiBkYXRhIOacrOS9k1xuICAgICAqL1xuICAgIGNvbnN0IHJlc3VsdCA9IC9eZGF0YTooLis/XFwvLis/KT8oOy4rPyk/LCguKikkLy5leGVjKGRhdGFVUkwpO1xuICAgIGlmIChudWxsID09IHJlc3VsdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGF0YS1VUkw6ICR7ZGF0YVVSTH1gKTtcbiAgICB9XG5cbiAgICBjb250ZXh0Lm1pbWVUeXBlID0gcmVzdWx0WzFdO1xuICAgIGNvbnRleHQuYmFzZTY0ID0gLztiYXNlNjQvLnRlc3QocmVzdWx0WzJdKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWluY2x1ZGVzXG4gICAgY29udGV4dC5kYXRhID0gcmVzdWx0WzNdO1xuXG4gICAgcmV0dXJuIGNvbnRleHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGhlbHBlciAqL1xuZnVuY3Rpb24gYmluYXJ5U3RyaW5nVG9CaW5hcnkoYnl0ZXM6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IGFycmF5ID0gYnl0ZXMuc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKSk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGFycmF5KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGJpbmFyeVRvQmluYXJ5U3RyaW5nKGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5tYXAuY2FsbChiaW5hcnksIChpOiBudW1iZXIpID0+IFN0cmluZy5mcm9tQ2hhckNvZGUoaSkpLmpvaW4oJycpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyB0byBiaW5hcnktc3RyaW5nLiAobm90IGh1bWFuIHJlYWRhYmxlIHN0cmluZylcbiAqIEBqYSDjg5DjgqTjg4rjg6rmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9CaW5hcnlTdHJpbmcodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHRleHQpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgZnJvbSBiaW5hcnktc3RyaW5nLlxuICogQGphIOODkOOCpOODiuODquaWh+Wtl+WIl+OBi+OCieWkieaPm1xuICpcbiAqIEBwYXJhbSBieXRlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUJpbmFyeVN0cmluZyhieXRlczogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShieXRlcykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGJpbmFyeSB0byBoZXgtc3RyaW5nLlxuICogQGphIOODkOOCpOODiuODquOCkiBIRVgg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGhleFxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUhleFN0cmluZyhoZXg6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IHggPSBoZXgubWF0Y2goLy57MSwyfS9nKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobnVsbCAhPSB4ID8geC5tYXAoYnl0ZSA9PiBwYXJzZUludChieXRlLCAxNikpIDogW10pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyBmcm9tIGhleC1zdHJpbmcuXG4gKiBAamEgSEVYIOaWh+Wtl+WIl+OBi+OCieODkOOCpOODiuODquOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvSGV4U3RyaW5nKGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeS5yZWR1Y2UoKHN0ciwgYnl0ZSkgPT4gc3RyICsgYnl0ZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKS5wYWRTdGFydCgyLCAnMCcpLCAnJyk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGBCbG9iYCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb0J1ZmZlcihibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIHJldHVybiByZWFkQXNBcnJheUJ1ZmZlcihibG9iLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGBCbG9iYCDjgYvjgokgYFVpbnQ4QXJyYXlgIOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYmxvYlRvQmluYXJ5KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXdhaXQgcmVhZEFzQXJyYXlCdWZmZXIoYmxvYiwgb3B0aW9ucykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb0RhdGFVUkwoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHJlYWRBc0RhdGFVUkwoYmxvYiwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgonjg4bjgq3jgrnjg4jjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb1RleHQoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyAmIHsgZW5jb2Rpbmc/OiBzdHJpbmcgfCBudWxsOyB9KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBvcHRzID0gb3B0aW9ucyA/PyB7fTtcbiAgICBjb25zdCB7IGVuY29kaW5nIH0gPSBvcHRzO1xuICAgIHJldHVybiByZWFkQXNUZXh0KGJsb2IsIGVuY29kaW5nLCBvcHRzKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJsb2JUb0Jhc2U2NChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gcXVlcnlEYXRhVVJMQ29udGV4dChhd2FpdCByZWFkQXNEYXRhVVJMKGJsb2IsIG9wdGlvbnMpKS5kYXRhO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGBCbG9iYC5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0Jsb2IoYnVmZmVyOiBBcnJheUJ1ZmZlciwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbYnVmZmVyXSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0JpbmFyeShidWZmZXI6IEFycmF5QnVmZmVyKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0RhdGFVUkwoYnVmZmVyOiBBcnJheUJ1ZmZlciwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvRGF0YVVSTChuZXcgVWludDhBcnJheShidWZmZXIpLCBtaW1lVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb0Jhc2U2NChuZXcgVWludDhBcnJheShidWZmZXIpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJ44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb1RleHQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvVGV4dChuZXcgVWludDhBcnJheShidWZmZXIpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGBCbG9iYC5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0Jsb2IoYmluYXJ5OiBVaW50OEFycmF5LCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFtiaW5hcnldLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0J1ZmZlcihiaW5hcnk6IFVpbnQ4QXJyYXkpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGJpbmFyeS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvRGF0YVVSTChiaW5hcnk6IFVpbnQ4QXJyYXksIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiaW5hcnlUb0Jhc2U2NChiaW5hcnkpfWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CYXNlNjQoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmVuY29kZShiaW5hcnlUb1RleHQoYmluYXJ5KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokg44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9UZXh0KGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGZyb21CaW5hcnlTdHJpbmcoYmluYXJ5VG9CaW5hcnlTdHJpbmcoYmluYXJ5KSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmxvYihiYXNlNjQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBiaW5hcnlUb0Jsb2IoYmFzZTY0VG9CaW5hcnkoYmFzZTY0KSwgbWltZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CdWZmZXIoYmFzZTY0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGJhc2U2NFRvQmluYXJ5KGJhc2U2NCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmluYXJ5KGJhc2U2NDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJpbmFyeVN0cmluZ1RvQmluYXJ5KHRvQmluYXJ5U3RyaW5nKEJhc2U2NC5kZWNvZGUoYmFzZTY0KSkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9EYXRhVVJMKGJhc2U2NDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSAgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSDjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb1RleHQoYmFzZTY0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKGJhc2U2NCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CbG9iKHRleHQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLlRFWFQpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW3RleHRdLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0J1ZmZlcih0ZXh0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRleHRUb0JpbmFyeSh0ZXh0KS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0JpbmFyeSh0ZXh0OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmluYXJ5U3RyaW5nVG9CaW5hcnkodG9CaW5hcnlTdHJpbmcodGV4dCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0RhdGFVUkwodGV4dDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuVEVYVCk6IHN0cmluZyB7XG4gICAgY29uc3QgYmFzZTY0ID0gdGV4dFRvQmFzZTY0KHRleHQpO1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiYXNlNjR9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0Jhc2U2NCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKHRleHQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CbG9iKGRhdGFVUkw6IHN0cmluZyk6IEJsb2Ige1xuICAgIGNvbnN0IGNvbnRleHQgPSBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkwpO1xuICAgIGlmIChjb250ZXh0LmJhc2U2NCkge1xuICAgICAgICByZXR1cm4gYmFzZTY0VG9CbG9iKGNvbnRleHQuZGF0YSwgY29udGV4dC5taW1lVHlwZSB8fCBNaW1lVHlwZS5CSU5BUlkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0ZXh0VG9CbG9iKGRlY29kZVVSSUNvbXBvbmVudChjb250ZXh0LmRhdGEpLCBjb250ZXh0Lm1pbWVUeXBlIHx8IE1pbWVUeXBlLlRFWFQpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0J1ZmZlcihkYXRhVVJMOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGRhdGFVUkxUb0JpbmFyeShkYXRhVVJMKS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmluYXJ5KGRhdGFVUkw6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiYXNlNjRUb0JpbmFyeShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgonjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb1RleHQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmRlY29kZShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMKTtcbiAgICBpZiAoY29udGV4dC5iYXNlNjQpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQuZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gQmFzZTY0LmVuY29kZShkZWNvZGVVUklDb21wb25lbnQoY29udGV4dC5kYXRhKSk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gU2VyaWFsaXphYmxlIGRhdGEgdHlwZSBsaXN0LlxuICogQGphIOOCt+ODquOCouODqeOCpOOCuuWPr+iDveOBquODh+ODvOOCv+Wei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlcmlhbGl6YWJsZSB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBvYmplY3Q6IG9iamVjdDtcbiAgICBidWZmZXI6IEFycmF5QnVmZmVyO1xuICAgIGJpbmFyeTogVWludDhBcnJheTtcbiAgICBibG9iOiBCbG9iO1xufVxuXG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVEYXRhVHlwZXMgPSBUeXBlczxTZXJpYWxpemFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXMgPSBTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkO1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlS2V5cyA9IEtleXM8U2VyaWFsaXphYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUNhc3RhYmxlID0gT21pdDxTZXJpYWxpemFibGUsICdidWZmZXInIHwgJ2JpbmFyeScgfCAnYmxvYic+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcyA9IFR5cGVzPFNlcmlhbGl6YWJsZUNhc3RhYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZVJldHVyblR5cGU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXM+ID0gVHlwZVRvS2V5PFNlcmlhbGl6YWJsZUNhc3RhYmxlLCBUPiBleHRlbmRzIG5ldmVyID8gbmV2ZXIgOiBUIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemFibGUgb3B0aW9ucyBpbnRlcmZhY2UuXG4gKiBAamEg44OH44K344Oq44Ki44Op44Kk44K644Gr5L2/55So44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVzZXJpYWxpemVPcHRpb25zPFQgZXh0ZW5kcyBTZXJpYWxpemFibGUgPSBTZXJpYWxpemFibGUsIEsgZXh0ZW5kcyBLZXlzPFQ+ID0gS2V5czxUPj4gZXh0ZW5kcyBDYW5jZWxhYmxlIHtcbiAgICAvKioge0BsaW5rIFNlcmlhbGl6YWJsZUtleXN9ICovXG4gICAgZGF0YVR5cGU/OiBLO1xufVxuXG4vKipcbiAqIEBlbiBTZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jgrfjg6rjgqLjg6njgqTjgrpcbiAqXG4gKiBAcGFyYW0gZGF0YSBpbnB1dFxuICogQHBhcmFtIG9wdGlvbnMgYmxvYiBjb252ZXJ0IG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXM+KGRhdGE6IFQsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHsgY2FuY2VsIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG4gICAgaWYgKG51bGwgPT0gZGF0YSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBidWZmZXJUb0RhdGFVUkwoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICByZXR1cm4gYmluYXJ5VG9EYXRhVVJMKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgICAgcmV0dXJuIGJsb2JUb0RhdGFVUkwoZGF0YSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZyb21UeXBlZERhdGEoZGF0YSkhO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzID0gU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcz4oXG4gICAgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IERlc2VyaWFsaXplT3B0aW9uczxTZXJpYWxpemFibGUsIG5ldmVyPlxuKTogUHJvbWlzZTxTZXJpYWxpemFibGVSZXR1cm5UeXBlPFQ+PjtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZGF0YS5cbiAqIEBqYSDjg4fjg7zjgr/jga7lvqnlhYNcbiAqXG4gKiBAcGFyYW0gdmFsdWUgaW5wdXQgc3RyaW5nIG9yIHVuZGVmaW5lZC5cbiAqIEBwYXJhbSBvcHRpb25zIGRlc2VyaWFsaXplIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVLZXlzPih2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBEZXNlcmlhbGl6ZU9wdGlvbnM8U2VyaWFsaXphYmxlLCBUPik6IFByb21pc2U8U2VyaWFsaXphYmxlW1RdIHwgbnVsbCB8IHVuZGVmaW5lZD47XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZXNlcmlhbGl6ZSh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zPzogRGVzZXJpYWxpemVPcHRpb25zKTogUHJvbWlzZTxTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgeyBkYXRhVHlwZSwgY2FuY2VsIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIGF3YWl0IGNjKGNhbmNlbCk7XG5cbiAgICBjb25zdCBkYXRhID0gcmVzdG9yZU51bGxpc2godG9UeXBlZERhdGEodmFsdWUpKTtcbiAgICBzd2l0Y2ggKGRhdGFUeXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YShkYXRhKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIEJvb2xlYW4oZGF0YSk7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0KGRhdGEpO1xuICAgICAgICBjYXNlICdidWZmZXInOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGFVUkxUb0J1ZmZlcihmcm9tVHlwZWREYXRhKGRhdGEpISk7XG4gICAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmluYXJ5KGZyb21UeXBlZERhdGEoZGF0YSkhKTtcbiAgICAgICAgY2FzZSAnYmxvYic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmxvYihmcm9tVHlwZWREYXRhKGRhdGEpISk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVUkwgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2Jsb2JNYXAgPSBuZXcgV2Vha01hcDxCbG9iLCBzdHJpbmc+KCk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF91cmxTZXQgID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbi8qKlxuICogQGVuIGBCbG9iIFVSTGAgdXRpbGl0eSBmb3IgYXV0b21hdGljIG1lbW9yeSBtYW5lZ2VtZW50LlxuICogQGphIOODoeODouODquiHquWLleeuoeeQhuOCkuihjOOBhiBgQmxvYiBVUkxgIOODpuODvOODhuOCo+ODquODhuOCo1xuICovXG5leHBvcnQgY2xhc3MgQmxvYlVSTCB7XG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjga7mp4vnr4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZSguLi5ibG9iczogQmxvYltdKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgYiBvZiBibG9icykge1xuICAgICAgICAgICAgY29uc3QgY2FjaGUgPSBfYmxvYk1hcC5nZXQoYik7XG4gICAgICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYik7XG4gICAgICAgICAgICBfYmxvYk1hcC5zZXQoYiwgdXJsKTtcbiAgICAgICAgICAgIF91cmxTZXQuYWRkKHVybCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIGBCbG9iIFVSTGAgY2FjaGUuXG4gICAgICogQGphIOOBmeOBueOBpuOBriBgQmxvYiBVUkxgIOOCreODo+ODg+OCt+ODpeOCkuegtOajhFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY2xlYXIoKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgdXJsIG9mIF91cmxTZXQpIHtcbiAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgfVxuICAgICAgICBfdXJsU2V0LmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBruWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0KGJsb2I6IEJsb2IpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBjYWNoZSA9IF9ibG9iTWFwLmdldChibG9iKTtcbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgX2Jsb2JNYXAuc2V0KGJsb2IsIHVybCk7XG4gICAgICAgIF91cmxTZXQuYWRkKHVybCk7XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGBCbG9iIFVSTGAgaXMgYXZhaWxhYmxlIGZyb20gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBjOacieWKueWMluWIpOWumlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgaGFzKGJsb2I6IEJsb2IpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIF9ibG9iTWFwLmhhcyhibG9iKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV2b2tlIGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZXMuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOCkueEoeWKueWMllxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgcmV2b2tlKC4uLmJsb2JzOiBCbG9iW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIGJsb2JzKSB7XG4gICAgICAgICAgICBjb25zdCB1cmwgPSBfYmxvYk1hcC5nZXQoYik7XG4gICAgICAgICAgICBpZiAodXJsKSB7XG4gICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICAgICAgICAgIF9ibG9iTWFwLmRlbGV0ZShiKTtcbiAgICAgICAgICAgICAgICBfdXJsU2V0LmRlbGV0ZSh1cmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJ2ZXJpZnkiLCJDYW5jZWxUb2tlbiIsImNjIiwiZnJvbVR5cGVkRGF0YSIsInJlc3RvcmVOdWxsaXNoIiwidG9UeXBlZERhdGEiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBRUEsaUJBQXdCLE1BQU0sSUFBSSxHQUFVQSxjQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztJQUNqRSxpQkFBd0IsTUFBTSxJQUFJLEdBQVVBLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ2pF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SyxFQUFFO2dCQUNuQixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDN0IsSUFBSSxLQUFLLEVBQUU7b0JBQ1A7O2dCQUVKLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLFlBQUEsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO0lBQ3BCLFlBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7OztJQUl4Qjs7O0lBR0c7SUFDSSxJQUFBLE9BQU8sS0FBSyxHQUFBO0lBQ2YsUUFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTtJQUN2QixZQUFBLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDOztZQUU1QixPQUFPLENBQUMsS0FBSyxFQUFFOztJQUduQjs7O0lBR0c7UUFDSSxPQUFPLEdBQUcsQ0FBQyxJQUFVLEVBQUE7WUFDeEIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDaEMsSUFBSSxLQUFLLEVBQUU7SUFDUCxZQUFBLE9BQU8sS0FBSzs7WUFFaEIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7SUFDckMsUUFBQSxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7SUFDdkIsUUFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUNoQixRQUFBLE9BQU8sR0FBRzs7SUFHZDs7O0lBR0c7UUFDSSxPQUFPLEdBQUcsQ0FBQyxJQUFVLEVBQUE7SUFDeEIsUUFBQSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDOztJQUc3Qjs7O0lBR0c7SUFDSSxJQUFBLE9BQU8sTUFBTSxDQUFDLEdBQUcsS0FBYSxFQUFBO0lBQ2pDLFFBQUEsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUU7Z0JBQ25CLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLEdBQUcsRUFBRTtJQUNMLGdCQUFBLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDO0lBQ3hCLGdCQUFBLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLGdCQUFBLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDOzs7O0lBSWxDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvYmluYXJ5LyJ9