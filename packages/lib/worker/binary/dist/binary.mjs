/*!
 * @cdp/binary 0.9.16
 *   binary utility module
 */

import { safe, verify, fromTypedData, restoreNullish, toTypedData } from '@cdp/core-utils';
import { CancelToken, checkCanceled } from '@cdp/promise';

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
    const data = restoreNullish(toTypedData(value));
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

export { Base64, BlobURL, base64ToBinary, base64ToBlob, base64ToBuffer, base64ToDataURL, base64ToText, binaryToBase64, binaryToBlob, binaryToBuffer, binaryToDataURL, binaryToText, blobToBase64, blobToBinary, blobToBuffer, blobToDataURL, blobToText, bufferToBase64, bufferToBinary, bufferToBlob, bufferToDataURL, bufferToText, dataURLToBase64, dataURLToBinary, dataURLToBlob, dataURLToBuffer, dataURLToText, deserialize, fromBinaryString, fromHexString, readAsArrayBuffer, readAsDataURL, readAsText, serialize, textToBase64, textToBinary, textToBlob, textToBuffer, textToDataURL, toBinaryString, toHexString };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5Lm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwiYmFzZTY0LnRzIiwiYmxvYi1yZWFkZXIudHMiLCJjb252ZXJ0ZXIudHMiLCJibG9iLXVybC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgYnRvYSAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5idG9hKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGF0b2IgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuYXRvYik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBCbG9iICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgRmlsZVJlYWRlciA9IHNhZmUoZ2xvYmFsVGhpcy5GaWxlUmVhZGVyKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTCAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcbiIsImltcG9ydCB7IGF0b2IsIGJ0b2EgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIGBiYXNlNjRgIHV0aWxpdHkgZm9yIGluZGVwZW5kZW50IGNoYXJhY3RvciBjb2RlLlxuICogQGphIOaWh+Wtl+OCs+ODvOODieOBq+S+neWtmOOBl+OBquOBhCBgYmFzZTY0YCDjg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2U2NCB7XG4gICAgLyoqXG4gICAgICogQGVuIEVuY29kZSBhIGJhc2UtNjQgZW5jb2RlZCBzdHJpbmcgZnJvbSBhIGJpbmFyeSBzdHJpbmcuXG4gICAgICogQGphIOaWh+Wtl+WIl+OCkiBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3JjKSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWNvZGVzIGEgc3RyaW5nIG9mIGRhdGEgd2hpY2ggaGFzIGJlZW4gZW5jb2RlZCB1c2luZyBiYXNlLTY0IGVuY29kaW5nLlxuICAgICAqIEBqYSBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJ44GV44KM44Gf44OH44O844K/44Gu5paH5a2X5YiX44KS44OH44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBkZWNvZGUoZW5jb2RlZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYXRvYihlbmNvZGVkKSkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFVua25vd25GdW5jdGlvbiwgdmVyaWZ5IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IENhbmNlbFRva2VuLCBDYW5jZWxhYmxlIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEZpbGVSZWFkZXIgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBGaWxlUmVhZGVyQXJnc01hcCB7XG4gICAgcmVhZEFzQXJyYXlCdWZmZXI6IFtCbG9iXTtcbiAgICByZWFkQXNEYXRhVVJMOiBbQmxvYl07XG4gICAgcmVhZEFzVGV4dDogW0Jsb2IsIHN0cmluZyB8IHVuZGVmaW5lZF07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBGaWxlUmVhZGVyUmVzdWx0TWFwIHtcbiAgICByZWFkQXNBcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXI7XG4gICAgcmVhZEFzRGF0YVVSTDogc3RyaW5nO1xuICAgIHJlYWRBc1RleHQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gYEJsb2JgIHJlYWQgb3B0aW9uc1xuICogQGphIGBCbG9iYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCbG9iUmVhZE9wdGlvbnMgZXh0ZW5kcyBDYW5jZWxhYmxlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvZ3Jlc3MgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQGphIOmAsuaNl+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb2dyZXNzXG4gICAgICogIC0gYGVuYCB3b3JrZXIgcHJvZ3Jlc3MgZXZlbnRcbiAgICAgKiAgLSBgamFgIHdvcmtlciDpgLLmjZfjgqTjg5njg7Pjg4hcbiAgICAgKi9cbiAgICBvbnByb2dyZXNzPzogKHByb2dyZXNzOiBQcm9ncmVzc0V2ZW50KSA9PiB1bmtub3duO1xufVxuXG4vKiogQGludGVybmFsIGV4ZWN1dGUgcmVhZCBibG9iICovXG5mdW5jdGlvbiBleGVjPFQgZXh0ZW5kcyBrZXlvZiBGaWxlUmVhZGVyUmVzdWx0TWFwPihcbiAgICBtZXRob2ROYW1lOiBULFxuICAgIGFyZ3M6IEZpbGVSZWFkZXJBcmdzTWFwW1RdLFxuICAgIG9wdGlvbnM6IEJsb2JSZWFkT3B0aW9ucyxcbik6IFByb21pc2U8RmlsZVJlYWRlclJlc3VsdE1hcFtUXT4ge1xuICAgIHR5cGUgVFJlc3VsdCA9IEZpbGVSZWFkZXJSZXN1bHRNYXBbVF07XG4gICAgY29uc3QgeyBjYW5jZWw6IHRva2VuLCBvbnByb2dyZXNzIH0gPSBvcHRpb25zO1xuICAgIHRva2VuICYmIHZlcmlmeSgnaW5zdGFuY2VPZicsIENhbmNlbFRva2VuLCB0b2tlbik7XG4gICAgb25wcm9ncmVzcyAmJiB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIG9ucHJvZ3Jlc3MpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxUUmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRva2VuICYmIHRva2VuLnJlZ2lzdGVyKCgpID0+IHtcbiAgICAgICAgICAgIHJlYWRlci5hYm9ydCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVhZGVyLm9uYWJvcnQgPSByZWFkZXIub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25wcm9ncmVzcyA9IG9ucHJvZ3Jlc3MhOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCBhcyBUUmVzdWx0KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbiAmJiBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgKHJlYWRlclttZXRob2ROYW1lXSBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3MpO1xuICAgIH0sIHRva2VuKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBgQXJyYXlCdWZmZXJgIHJlc3VsdCBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzQXJyYXlCdWZmZXIoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzQXJyYXlCdWZmZXInLCBbYmxvYl0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBkYXRhLVVSTCBzdHJpbmcgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCiSBgZGF0YS11cmwg5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzRGF0YVVSTChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzRGF0YVVSTCcsIFtibG9iXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHRleHQgY29udGVudCBzdHJpbmcgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCieODhuOCreOCueODiOaWh+Wtl+WIl+OCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIGVuY29kaW5nXG4gKiAgLSBgZW5gIGVuY29kaW5nIHN0cmluZyB0byB1c2UgZm9yIHRoZSByZXR1cm5lZCBkYXRhLiBkZWZhdWx0OiBgdXRmLThgXG4gKiAgLSBgamFgIOOCqOODs+OCs+ODvOODh+OCo+ODs+OCsOOCkuaMh+WumuOBmeOCi+aWh+Wtl+WIlyDml6Llrpo6IGB1dGYtOGBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNUZXh0KGJsb2I6IEJsb2IsIGVuY29kaW5nPzogc3RyaW5nIHwgbnVsbCwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc1RleHQnLCBbYmxvYiwgZW5jb2RpbmcgfHwgdW5kZWZpbmVkXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuIiwiaW1wb3J0IHtcbiAgICBLZXlzLFxuICAgIFR5cGVzLFxuICAgIFR5cGVUb0tleSxcbiAgICB0b1R5cGVkRGF0YSxcbiAgICBmcm9tVHlwZWREYXRhLFxuICAgIHJlc3RvcmVOdWxsaXNoLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBCYXNlNjQgfSBmcm9tICcuL2Jhc2U2NCc7XG5pbXBvcnQge1xuICAgIEJsb2JSZWFkT3B0aW9ucyxcbiAgICByZWFkQXNBcnJheUJ1ZmZlcixcbiAgICByZWFkQXNEYXRhVVJMLFxuICAgIHJlYWRBc1RleHQsXG59IGZyb20gJy4vYmxvYi1yZWFkZXInO1xuaW1wb3J0IHsgQmxvYiB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBNaW1lVHlwZSB7XG4gICAgQklOQVJZID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScsXG4gICAgVEVYVCA9ICd0ZXh0L3BsYWluJyxcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgZGF0YS1VUkwg5bGe5oCnICovXG5pbnRlcmZhY2UgRGF0YVVSTENvbnRleHQge1xuICAgIG1pbWVUeXBlOiBzdHJpbmc7XG4gICAgYmFzZTY0OiBib29sZWFuO1xuICAgIGRhdGE6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIGRhdGEgVVJJIOW9ouW8j+OBruato+imj+ihqOePvlxuICog5Y+C6ICDOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL2RhdGFfVVJJc1xuICovXG5mdW5jdGlvbiBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkw6IHN0cmluZyk6IERhdGFVUkxDb250ZXh0IHtcbiAgICBjb25zdCBjb250ZXh0ID0geyBiYXNlNjQ6IGZhbHNlIH0gYXMgRGF0YVVSTENvbnRleHQ7XG5cbiAgICAvKipcbiAgICAgKiBbbWF0Y2hdIDE6IG1pbWUtdHlwZVxuICAgICAqICAgICAgICAgMjogXCI7YmFzZTY0XCIg44KS5ZCr44KA44Kq44OX44K344On44OzXG4gICAgICogICAgICAgICAzOiBkYXRhIOacrOS9k1xuICAgICAqL1xuICAgIGNvbnN0IHJlc3VsdCA9IC9eZGF0YTooLis/XFwvLis/KT8oOy4rPyk/LCguKikkLy5leGVjKGRhdGFVUkwpO1xuICAgIGlmIChudWxsID09IHJlc3VsdCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGF0YS1VUkw6ICR7ZGF0YVVSTH1gKTtcbiAgICB9XG5cbiAgICBjb250ZXh0Lm1pbWVUeXBlID0gcmVzdWx0WzFdO1xuICAgIGNvbnRleHQuYmFzZTY0ID0gLztiYXNlNjQvLnRlc3QocmVzdWx0WzJdKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvcHJlZmVyLWluY2x1ZGVzXG4gICAgY29udGV4dC5kYXRhID0gcmVzdWx0WzNdO1xuXG4gICAgcmV0dXJuIGNvbnRleHQ7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGhlbHBlciAqL1xuZnVuY3Rpb24gYmluYXJ5U3RyaW5nVG9CaW5hcnkoYnl0ZXM6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IGFycmF5ID0gYnl0ZXMuc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKSk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGFycmF5KTtcbn1cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGJpbmFyeVRvQmluYXJ5U3RyaW5nKGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5tYXAuY2FsbChiaW5hcnksIChpOiBudW1iZXIpID0+IFN0cmluZy5mcm9tQ2hhckNvZGUoaSkpLmpvaW4oJycpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyB0byBiaW5hcnktc3RyaW5nLiAobm90IGh1bWFuIHJlYWRhYmxlIHN0cmluZylcbiAqIEBqYSDjg5DjgqTjg4rjg6rmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9CaW5hcnlTdHJpbmcodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHRleHQpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgZnJvbSBiaW5hcnktc3RyaW5nLlxuICogQGphIOODkOOCpOODiuODquaWh+Wtl+WIl+OBi+OCieWkieaPm1xuICpcbiAqIEBwYXJhbSBieXRlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUJpbmFyeVN0cmluZyhieXRlczogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShieXRlcykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGJpbmFyeSB0byBoZXgtc3RyaW5nLlxuICogQGphIOODkOOCpOODiuODquOCkiBIRVgg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGhleFxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbUhleFN0cmluZyhoZXg6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IHggPSBoZXgubWF0Y2goLy57MSwyfS9nKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobnVsbCAhPSB4ID8geC5tYXAoYnl0ZSA9PiBwYXJzZUludChieXRlLCAxNikpIDogW10pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyBmcm9tIGhleC1zdHJpbmcuXG4gKiBAamEgSEVYIOaWh+Wtl+WIl+OBi+OCieODkOOCpOODiuODquOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvSGV4U3RyaW5nKGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeS5yZWR1Y2UoKHN0ciwgYnl0ZSkgPT4gc3RyICsgYnl0ZS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKS5wYWRTdGFydCgyLCAnMCcpLCAnJyk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGBCbG9iYCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb0J1ZmZlcihibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIHJldHVybiByZWFkQXNBcnJheUJ1ZmZlcihibG9iLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGBCbG9iYCDjgYvjgokgYFVpbnQ4QXJyYXlgIOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYmxvYlRvQmluYXJ5KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXdhaXQgcmVhZEFzQXJyYXlCdWZmZXIoYmxvYiwgb3B0aW9ucykpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb0RhdGFVUkwoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHJlYWRBc0RhdGFVUkwoYmxvYiwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgonjg4bjgq3jgrnjg4jjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJsb2JUb1RleHQoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyAmIHsgZW5jb2Rpbmc/OiBzdHJpbmcgfCBudWxsOyB9KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBvcHRzID0gb3B0aW9ucyB8fCB7fTtcbiAgICBjb25zdCB7IGVuY29kaW5nIH0gPSBvcHRzO1xuICAgIHJldHVybiByZWFkQXNUZXh0KGJsb2IsIGVuY29kaW5nLCBvcHRzKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJsb2JUb0Jhc2U2NChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gcXVlcnlEYXRhVVJMQ29udGV4dChhd2FpdCByZWFkQXNEYXRhVVJMKGJsb2IsIG9wdGlvbnMpKS5kYXRhO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGBCbG9iYC5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0Jsb2IoYnVmZmVyOiBBcnJheUJ1ZmZlciwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbYnVmZmVyXSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0JpbmFyeShidWZmZXI6IEFycmF5QnVmZmVyKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0RhdGFVUkwoYnVmZmVyOiBBcnJheUJ1ZmZlciwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvRGF0YVVSTChuZXcgVWludDhBcnJheShidWZmZXIpLCBtaW1lVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb0Jhc2U2NChuZXcgVWludDhBcnJheShidWZmZXIpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJ44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb1RleHQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvVGV4dChuZXcgVWludDhBcnJheShidWZmZXIpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGBCbG9iYC5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0Jsb2IoYmluYXJ5OiBVaW50OEFycmF5LCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFtiaW5hcnldLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0J1ZmZlcihiaW5hcnk6IFVpbnQ4QXJyYXkpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGJpbmFyeS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvRGF0YVVSTChiaW5hcnk6IFVpbnQ4QXJyYXksIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiaW5hcnlUb0Jhc2U2NChiaW5hcnkpfWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CYXNlNjQoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmVuY29kZShiaW5hcnlUb1RleHQoYmluYXJ5KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokg44OG44Kt44K544OI44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9UZXh0KGJpbmFyeTogVWludDhBcnJheSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGZyb21CaW5hcnlTdHJpbmcoYmluYXJ5VG9CaW5hcnlTdHJpbmcoYmluYXJ5KSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmxvYihiYXNlNjQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBiaW5hcnlUb0Jsb2IoYmFzZTY0VG9CaW5hcnkoYmFzZTY0KSwgbWltZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBCYXNlNjQg5paH5a2X5YiX44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CdWZmZXIoYmFzZTY0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGJhc2U2NFRvQmluYXJ5KGJhc2U2NCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmluYXJ5KGJhc2U2NDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJpbmFyeVN0cmluZ1RvQmluYXJ5KHRvQmluYXJ5U3RyaW5nKEJhc2U2NC5kZWNvZGUoYmFzZTY0KSkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9EYXRhVVJMKGJhc2U2NDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSAgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSDjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb1RleHQoYmFzZTY0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKGJhc2U2NCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CbG9iKHRleHQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLlRFWFQpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW3RleHRdLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0J1ZmZlcih0ZXh0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIHRleHRUb0JpbmFyeSh0ZXh0KS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0JpbmFyeSh0ZXh0OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmluYXJ5U3RyaW5nVG9CaW5hcnkodG9CaW5hcnlTdHJpbmcodGV4dCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0RhdGFVUkwodGV4dDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuVEVYVCk6IHN0cmluZyB7XG4gICAgY29uc3QgYmFzZTY0ID0gdGV4dFRvQmFzZTY0KHRleHQpO1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiYXNlNjR9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0Jhc2U2NCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKHRleHQpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CbG9iKGRhdGFVUkw6IHN0cmluZyk6IEJsb2Ige1xuICAgIGNvbnN0IGNvbnRleHQgPSBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkwpO1xuICAgIGlmIChjb250ZXh0LmJhc2U2NCkge1xuICAgICAgICByZXR1cm4gYmFzZTY0VG9CbG9iKGNvbnRleHQuZGF0YSwgY29udGV4dC5taW1lVHlwZSB8fCBNaW1lVHlwZS5CSU5BUlkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0ZXh0VG9CbG9iKGRlY29kZVVSSUNvbXBvbmVudChjb250ZXh0LmRhdGEpLCBjb250ZXh0Lm1pbWVUeXBlIHx8IE1pbWVUeXBlLlRFWFQpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0J1ZmZlcihkYXRhVVJMOiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gICAgcmV0dXJuIGRhdGFVUkxUb0JpbmFyeShkYXRhVVJMKS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmluYXJ5KGRhdGFVUkw6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiYXNlNjRUb0JpbmFyeShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgonjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb1RleHQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmRlY29kZShkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CYXNlNjQoZGF0YVVSTDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMKTtcbiAgICBpZiAoY29udGV4dC5iYXNlNjQpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQuZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gQmFzZTY0LmVuY29kZShkZWNvZGVVUklDb21wb25lbnQoY29udGV4dC5kYXRhKSk7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gU2VyaWFsaXphYmxlIGRhdGEgdHlwZSBsaXN0LlxuICogQGphIOOCt+ODquOCouODqeOCpOOCuuWPr+iDveOBquODh+ODvOOCv+Wei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlcmlhbGl6YWJsZSB7XG4gICAgc3RyaW5nOiBzdHJpbmc7XG4gICAgbnVtYmVyOiBudW1iZXI7XG4gICAgYm9vbGVhbjogYm9vbGVhbjtcbiAgICBvYmplY3Q6IG9iamVjdDtcbiAgICBidWZmZXI6IEFycmF5QnVmZmVyO1xuICAgIGJpbmFyeTogVWludDhBcnJheTtcbiAgICBibG9iOiBCbG9iO1xufVxuXG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVEYXRhVHlwZXMgPSBUeXBlczxTZXJpYWxpemFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlSW5wdXREYXRhVHlwZXMgPSBTZXJpYWxpemFibGVEYXRhVHlwZXMgfCBudWxsIHwgdW5kZWZpbmVkO1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlS2V5cyA9IEtleXM8U2VyaWFsaXphYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZUNhc3RhYmxlID0gT21pdDxTZXJpYWxpemFibGUsICdidWZmZXInIHwgJ2JpbmFyeScgfCAnYmxvYic+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcyA9IFR5cGVzPFNlcmlhbGl6YWJsZUNhc3RhYmxlPjtcbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZVJldHVyblR5cGU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXM+ID0gVHlwZVRvS2V5PFNlcmlhbGl6YWJsZUNhc3RhYmxlLCBUPiBleHRlbmRzIG5ldmVyID8gbmV2ZXIgOiBUIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemFibGUgb3B0aW9ucyBpbnRlcmZhY2UuXG4gKiBAamEg44OH44K344Oq44Ki44Op44Kk44K644Gr5L2/55So44GZ44KL44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVzZXJpYWxpemVPcHRpb25zPFQgZXh0ZW5kcyBTZXJpYWxpemFibGUgPSBTZXJpYWxpemFibGUsIEsgZXh0ZW5kcyBLZXlzPFQ+ID0gS2V5czxUPj4gZXh0ZW5kcyBDYW5jZWxhYmxlIHtcbiAgICAvKiogW1tTZXJpYWxpemFibGVLZXlzXV0gKi9cbiAgICBkYXRhVHlwZT86IEs7XG59XG5cbi8qKlxuICogQGVuIFNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OCt+ODquOCouODqeOCpOOCulxuICpcbiAqIEBwYXJhbSBkYXRhIGlucHV0XG4gKiBAcGFyYW0gb3B0aW9ucyBibG9iIGNvbnZlcnQgb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVJbnB1dERhdGFUeXBlcz4oZGF0YTogVCwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgfHwge307XG4gICAgYXdhaXQgY2MoY2FuY2VsKTtcbiAgICBpZiAobnVsbCA9PSBkYXRhKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlclRvRGF0YVVSTChkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBVaW50OEFycmF5KSB7XG4gICAgICAgIHJldHVybiBiaW5hcnlUb0RhdGFVUkwoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICByZXR1cm4gYmxvYlRvRGF0YVVSTChkYXRhLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YShkYXRhKSBhcyBzdHJpbmc7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OBruW+qeWFg1xuICpcbiAqIEBwYXJhbSB2YWx1ZSBpbnB1dCBzdHJpbmcgb3IgdW5kZWZpbmVkLlxuICogQHBhcmFtIG9wdGlvbnMgZGVzZXJpYWxpemUgb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXMgPSBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzPihcbiAgICB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zPzogRGVzZXJpYWxpemVPcHRpb25zPFNlcmlhbGl6YWJsZSwgbmV2ZXI+XG4pOiBQcm9taXNlPFNlcmlhbGl6YWJsZVJldHVyblR5cGU8VD4+O1xuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OBruW+qeWFg1xuICpcbiAqIEBwYXJhbSB2YWx1ZSBpbnB1dCBzdHJpbmcgb3IgdW5kZWZpbmVkLlxuICogQHBhcmFtIG9wdGlvbnMgZGVzZXJpYWxpemUgb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUtleXM+KHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM6IERlc2VyaWFsaXplT3B0aW9uczxTZXJpYWxpemFibGUsIFQ+KTogUHJvbWlzZTxTZXJpYWxpemFibGVbVF0gfCBudWxsIHwgdW5kZWZpbmVkPjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlc2VyaWFsaXplKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBEZXNlcmlhbGl6ZU9wdGlvbnMpOiBQcm9taXNlPFNlcmlhbGl6YWJsZURhdGFUeXBlcyB8IG51bGwgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCB7IGRhdGFUeXBlLCBjYW5jZWwgfSA9IG9wdGlvbnMgfHwge307XG4gICAgYXdhaXQgY2MoY2FuY2VsKTtcblxuICAgIGNvbnN0IGRhdGEgPSByZXN0b3JlTnVsbGlzaCh0b1R5cGVkRGF0YSh2YWx1ZSkpO1xuICAgIHN3aXRjaCAoZGF0YVR5cGUpIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKGRhdGEpO1xuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgcmV0dXJuIE51bWJlcihkYXRhKTtcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICByZXR1cm4gQm9vbGVhbihkYXRhKTtcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2J1ZmZlcic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQnVmZmVyKGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nKTtcbiAgICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CaW5hcnkoZnJvbVR5cGVkRGF0YShkYXRhKSBhcyBzdHJpbmcpO1xuICAgICAgICBjYXNlICdibG9iJzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CbG9iKGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFVSTCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYmxvYk1hcCA9IG5ldyBXZWFrTWFwPEJsb2IsIHN0cmluZz4oKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3VybFNldCAgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuLyoqXG4gKiBAZW4gYEJsb2IgVVJMYCB1dGlsaXR5IGZvciBhdXRvbWF0aWMgbWVtb3J5IG1hbmVnZW1lbnQuXG4gKiBAamEg44Oh44Oi44Oq6Ieq5YuV566h55CG44KS6KGM44GGIGBCbG9iIFVSTGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCbG9iVVJMIHtcbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZXMuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBruani+eviVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlKC4uLmJsb2JzOiBCbG9iW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIGJsb2JzKSB7XG4gICAgICAgICAgICBjb25zdCBjYWNoZSA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChiKTtcbiAgICAgICAgICAgIF9ibG9iTWFwLnNldChiLCB1cmwpO1xuICAgICAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYEJsb2IgVVJMYCBjYWNoZS5cbiAgICAgKiBAamEg44GZ44G544Gm44GuIGBCbG9iIFVSTGAg44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhcigpOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgX3VybFNldCkge1xuICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIF91cmxTZXQuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44Gu5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZXQoYmxvYjogQmxvYik6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gX2Jsb2JNYXAuZ2V0KGJsb2IpO1xuICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICBfYmxvYk1hcC5zZXQoYmxvYiwgdXJsKTtcbiAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYEJsb2IgVVJMYCBpcyBhdmFpbGFibGUgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44GM5pyJ5Yq55YyW5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBoYXMoYmxvYjogQmxvYik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gX2Jsb2JNYXAuaGFzKGJsb2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXZva2UgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlcy5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44KS54Sh5Yq55YyWXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyByZXZva2UoLi4uYmxvYnM6IEJsb2JbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGIgb2YgYmxvYnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgX2Jsb2JNYXAuZGVsZXRlKGIpO1xuICAgICAgICAgICAgICAgIF91cmxTZXQuZGVsZXRlKHVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iXSwibmFtZXMiOlsiY2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBRUEsaUJBQXdCLE1BQU0sSUFBSSxHQUFTLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakUsaUJBQXdCLE1BQU0sSUFBSSxHQUFTLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakUsaUJBQXdCLE1BQU0sSUFBSSxHQUFTLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakUsaUJBQXdCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDdkUsaUJBQXdCLE1BQU0sR0FBRyxHQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDOztBQ0ovRDs7O0FBR0c7TUFDVSxNQUFNLENBQUE7QUFDZjs7O0FBR0c7SUFDSSxPQUFPLE1BQU0sQ0FBQyxHQUFXLEVBQUE7UUFDNUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNsRDtBQUVEOzs7QUFHRztJQUNJLE9BQU8sTUFBTSxDQUFDLE9BQWUsRUFBQTtRQUNoQyxPQUFPLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxJQUFJ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QUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsWUFBQSxJQUFJLEtBQUssRUFBRTtnQkFDUCxTQUFTO0FBQ1osYUFBQTtZQUNELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsWUFBQSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNyQixZQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEIsU0FBQTtLQUNKO0FBRUQ7OztBQUdHO0FBQ0ksSUFBQSxPQUFPLEtBQUssR0FBQTtBQUNmLFFBQUEsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7QUFDdkIsWUFBQSxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLFNBQUE7UUFDRCxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDbkI7QUFFRDs7O0FBR0c7SUFDSSxPQUFPLEdBQUcsQ0FBQyxJQUFVLEVBQUE7UUFDeEIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqQyxRQUFBLElBQUksS0FBSyxFQUFFO0FBQ1AsWUFBQSxPQUFPLEtBQUssQ0FBQztBQUNoQixTQUFBO1FBQ0QsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QyxRQUFBLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLFFBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNqQixRQUFBLE9BQU8sR0FBRyxDQUFDO0tBQ2Q7QUFFRDs7O0FBR0c7SUFDSSxPQUFPLEdBQUcsQ0FBQyxJQUFVLEVBQUE7QUFDeEIsUUFBQSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDN0I7QUFFRDs7O0FBR0c7QUFDSSxJQUFBLE9BQU8sTUFBTSxDQUFDLEdBQUcsS0FBYSxFQUFBO0FBQ2pDLFFBQUEsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUU7WUFDbkIsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixZQUFBLElBQUksR0FBRyxFQUFFO0FBQ0wsZ0JBQUEsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6QixnQkFBQSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLGdCQUFBLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkIsYUFBQTtBQUNKLFNBQUE7S0FDSjtBQUNKOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9iaW5hcnkvIn0=