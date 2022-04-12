/*!
 * @cdp/binary 0.9.11
 *   binary utility module
 */

import { safe, verify, fromTypedData, restoreNil, toTypedData } from '@cdp/core-utils';
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

export { Base64, BlobURL, base64ToBinary, base64ToBlob, base64ToBuffer, base64ToDataURL, base64ToText, binaryToBase64, binaryToBlob, binaryToBuffer, binaryToDataURL, binaryToText, blobToBase64, blobToBinary, blobToBuffer, blobToDataURL, blobToText, bufferToBase64, bufferToBinary, bufferToBlob, bufferToDataURL, bufferToText, dataURLToBase64, dataURLToBinary, dataURLToBlob, dataURLToBuffer, dataURLToText, deserialize, fromBinaryString, fromHexString, readAsArrayBuffer, readAsDataURL, readAsText, serialize, textToBase64, textToBinary, textToBlob, textToBuffer, textToDataURL, toBinaryString, toHexString };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5Lm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwiYmFzZTY0LnRzIiwiYmxvYi1yZWFkZXIudHMiLCJjb252ZXJ0ZXIudHMiLCJibG9iLXVybC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgYnRvYSAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5idG9hKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGF0b2IgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuYXRvYik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBCbG9iICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgRmlsZVJlYWRlciA9IHNhZmUoZ2xvYmFsVGhpcy5GaWxlUmVhZGVyKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IFVSTCAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcbiIsImltcG9ydCB7IGF0b2IsIGJ0b2EgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIGBiYXNlNjRgIHV0aWxpdHkgZm9yIGluZGVwZW5kZW50IGNoYXJhY3RvciBjb2RlLlxuICogQGphIOaWh+Wtl+OCs+ODvOODieOBq+S+neWtmOOBl+OBquOBhCBgYmFzZTY0YCDjg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2U2NCB7XG4gICAgLyoqXG4gICAgICogQGVuIEVuY29kZSBhIGJhc2UtNjQgZW5jb2RlZCBzdHJpbmcgZnJvbSBhIGJpbmFyeSBzdHJpbmcuXG4gICAgICogQGphIOaWh+Wtl+WIl+OCkiBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3JjKSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWNvZGVzIGEgc3RyaW5nIG9mIGRhdGEgd2hpY2ggaGFzIGJlZW4gZW5jb2RlZCB1c2luZyBiYXNlLTY0IGVuY29kaW5nLlxuICAgICAqIEBqYSBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJ44GV44KM44Gf44OH44O844K/44Gu5paH5a2X5YiX44KS44OH44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBkZWNvZGUoZW5jb2RlZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYXRvYihlbmNvZGVkKSkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFVua25vd25GdW5jdGlvbiwgdmVyaWZ5IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IENhbmNlbFRva2VuLCBDYW5jZWxhYmxlIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEZpbGVSZWFkZXIgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBGaWxlUmVhZGVyQXJnc01hcCB7XG4gICAgcmVhZEFzQXJyYXlCdWZmZXI6IFtCbG9iXTtcbiAgICByZWFkQXNEYXRhVVJMOiBbQmxvYl07XG4gICAgcmVhZEFzVGV4dDogW0Jsb2IsIHN0cmluZyB8IHVuZGVmaW5lZF07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBGaWxlUmVhZGVyUmVzdWx0TWFwIHtcbiAgICByZWFkQXNBcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXI7XG4gICAgcmVhZEFzRGF0YVVSTDogc3RyaW5nO1xuICAgIHJlYWRBc1RleHQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gYEJsb2JgIHJlYWQgb3B0aW9uc1xuICogQGphIGBCbG9iYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCbG9iUmVhZE9wdGlvbnMgZXh0ZW5kcyBDYW5jZWxhYmxlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvZ3Jlc3MgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQGphIOmAsuaNl+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb2dyZXNzXG4gICAgICogIC0gYGVuYCB3b3JrZXIgcHJvZ3Jlc3MgZXZlbnRcbiAgICAgKiAgLSBgamFgIHdvcmtlciDpgLLmjZfjgqTjg5njg7Pjg4hcbiAgICAgKi9cbiAgICBvbnByb2dyZXNzPzogKHByb2dyZXNzOiBQcm9ncmVzc0V2ZW50KSA9PiB1bmtub3duO1xufVxuXG4vKiogQGludGVybmFsIGV4ZWN1dGUgcmVhZCBibG9iICovXG5mdW5jdGlvbiBleGVjPFQgZXh0ZW5kcyBrZXlvZiBGaWxlUmVhZGVyUmVzdWx0TWFwPihcbiAgICBtZXRob2ROYW1lOiBULFxuICAgIGFyZ3M6IEZpbGVSZWFkZXJBcmdzTWFwW1RdLFxuICAgIG9wdGlvbnM6IEJsb2JSZWFkT3B0aW9ucyxcbik6IFByb21pc2U8RmlsZVJlYWRlclJlc3VsdE1hcFtUXT4ge1xuICAgIHR5cGUgVFJlc3VsdCA9IEZpbGVSZWFkZXJSZXN1bHRNYXBbVF07XG4gICAgY29uc3QgeyBjYW5jZWw6IHRva2VuLCBvbnByb2dyZXNzIH0gPSBvcHRpb25zO1xuICAgIHRva2VuICYmIHZlcmlmeSgnaW5zdGFuY2VPZicsIENhbmNlbFRva2VuLCB0b2tlbik7XG4gICAgb25wcm9ncmVzcyAmJiB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIG9ucHJvZ3Jlc3MpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxUUmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRva2VuICYmIHRva2VuLnJlZ2lzdGVyKCgpID0+IHtcbiAgICAgICAgICAgIHJlYWRlci5hYm9ydCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVhZGVyLm9uYWJvcnQgPSByZWFkZXIub25lcnJvciA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICByZWFkZXIub25wcm9ncmVzcyA9IG9ucHJvZ3Jlc3MhOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCBhcyBUUmVzdWx0KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbiAmJiBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgKHJlYWRlclttZXRob2ROYW1lXSBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3MpO1xuICAgIH0sIHRva2VuKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBgQXJyYXlCdWZmZXJgIHJlc3VsdCBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzQXJyYXlCdWZmZXIoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzQXJyYXlCdWZmZXInLCBbYmxvYl0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBkYXRhLVVSTCBzdHJpbmcgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCiSBgZGF0YS11cmwg5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzRGF0YVVSTChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzRGF0YVVSTCcsIFtibG9iXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHRleHQgY29udGVudCBzdHJpbmcgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCieODhuOCreOCueODiOaWh+Wtl+WIl+OCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIGVuY29kaW5nXG4gKiAgLSBgZW5gIGVuY29kaW5nIHN0cmluZyB0byB1c2UgZm9yIHRoZSByZXR1cm5lZCBkYXRhLiBkZWZhdWx0OiBgdXRmLThgXG4gKiAgLSBgamFgIOOCqOODs+OCs+ODvOODh+OCo+ODs+OCsOOCkuaMh+WumuOBmeOCi+aWh+Wtl+WIlyDml6Llrpo6IGB1dGYtOGBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNUZXh0KGJsb2I6IEJsb2IsIGVuY29kaW5nPzogc3RyaW5nIHwgbnVsbCwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc1RleHQnLCBbYmxvYiwgZW5jb2RpbmcgfHwgdW5kZWZpbmVkXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuIiwiaW1wb3J0IHtcbiAgICBLZXlzLFxuICAgIFR5cGVzLFxuICAgIFR5cGVUb0tleSxcbiAgICB0b1R5cGVkRGF0YSxcbiAgICBmcm9tVHlwZWREYXRhLFxuICAgIHJlc3RvcmVOaWwsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEJhc2U2NCB9IGZyb20gJy4vYmFzZTY0JztcbmltcG9ydCB7XG4gICAgQmxvYlJlYWRPcHRpb25zLFxuICAgIHJlYWRBc0FycmF5QnVmZmVyLFxuICAgIHJlYWRBc0RhdGFVUkwsXG4gICAgcmVhZEFzVGV4dCxcbn0gZnJvbSAnLi9ibG9iLXJlYWRlcic7XG5pbXBvcnQgeyBCbG9iIH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIE1pbWVUeXBlIHtcbiAgICBCSU5BUlkgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJyxcbiAgICBURVhUID0gJ3RleHQvcGxhaW4nLFxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBkYXRhLVVSTCDlsZ7mgKcgKi9cbmludGVyZmFjZSBEYXRhVVJMQ29udGV4dCB7XG4gICAgbWltZVR5cGU6IHN0cmluZztcbiAgICBiYXNlNjQ6IGJvb2xlYW47XG4gICAgZGF0YTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICogZGF0YSBVUkkg5b2i5byP44Gu5q2j6KaP6KGo54++XG4gKiDlj4LogIM6IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvZGF0YV9VUklzXG4gKi9cbmZ1bmN0aW9uIHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTDogc3RyaW5nKTogRGF0YVVSTENvbnRleHQge1xuICAgIGNvbnN0IGNvbnRleHQgPSB7IGJhc2U2NDogZmFsc2UgfSBhcyBEYXRhVVJMQ29udGV4dDtcblxuICAgIC8qKlxuICAgICAqIFttYXRjaF0gMTogbWltZS10eXBlXG4gICAgICogICAgICAgICAyOiBcIjtiYXNlNjRcIiDjgpLlkKvjgoDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiAgICAgICAgIDM6IGRhdGEg5pys5L2TXG4gICAgICovXG4gICAgY29uc3QgcmVzdWx0ID0gL15kYXRhOiguKz9cXC8uKz8pPyg7Lis/KT8sKC4qKSQvLmV4ZWMoZGF0YVVSTCk7XG4gICAgaWYgKG51bGwgPT0gcmVzdWx0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBkYXRhLVVSTDogJHtkYXRhVVJMfWApO1xuICAgIH1cblxuICAgIGNvbnRleHQubWltZVR5cGUgPSByZXN1bHRbMV07XG4gICAgY29udGV4dC5iYXNlNjQgPSAvO2Jhc2U2NC8udGVzdChyZXN1bHRbMl0pOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9wcmVmZXItaW5jbHVkZXNcbiAgICBjb250ZXh0LmRhdGEgPSByZXN1bHRbM107XG5cbiAgICByZXR1cm4gY29udGV4dDtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyICovXG5mdW5jdGlvbiBiaW5hcnlTdHJpbmdUb0JpbmFyeShieXRlczogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgY29uc3QgYXJyYXkgPSBieXRlcy5zcGxpdCgnJykubWFwKGMgPT4gYy5jaGFyQ29kZUF0KDApKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpO1xufVxuXG4vKiogQGludGVybmFsIGhlbHBlciAqL1xuZnVuY3Rpb24gYmluYXJ5VG9CaW5hcnlTdHJpbmcoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKGJpbmFyeSwgKGk6IG51bWJlcikgPT4gU3RyaW5nLmZyb21DaGFyQ29kZShpKSkuam9pbignJyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIHRvIGJpbmFyeS1zdHJpbmcuIChub3QgaHVtYW4gcmVhZGFibGUgc3RyaW5nKVxuICogQGphIOODkOOCpOODiuODquaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0JpbmFyeVN0cmluZyh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQodGV4dCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyBmcm9tIGJpbmFyeS1zdHJpbmcuXG4gKiBAamEg44OQ44Kk44OK44Oq5paH5a2X5YiX44GL44KJ5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ5dGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tQmluYXJ5U3RyaW5nKGJ5dGVzOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGJ5dGVzKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYmluYXJ5IHRvIGhleC1zdHJpbmcuXG4gKiBAamEg44OQ44Kk44OK44Oq44KSIEhFWCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gaGV4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tSGV4U3RyaW5nKGhleDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgY29uc3QgeCA9IGhleC5tYXRjaCgvLnsxLDJ9L2cpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShudWxsICE9IHggPyB4Lm1hcChieXRlID0+IHBhcnNlSW50KGJ5dGUsIDE2KSkgOiBbXSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIGZyb20gaGV4LXN0cmluZy5cbiAqIEBqYSBIRVgg5paH5a2X5YiX44GL44KJ44OQ44Kk44OK44Oq44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9IZXhTdHJpbmcoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5LnJlZHVjZSgoc3RyLCBieXRlKSA9PiBzdHIgKyBieXRlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpLnBhZFN0YXJ0KDIsICcwJyksICcnKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvQnVmZmVyKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgcmV0dXJuIHJlYWRBc0FycmF5QnVmZmVyKGJsb2IsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBgVWludDhBcnJheWAuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBgVWludDhBcnJheWAg44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBibG9iVG9CaW5hcnkoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShhd2FpdCByZWFkQXNBcnJheUJ1ZmZlcihibG9iLCBvcHRpb25zKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvRGF0YVVSTChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gcmVhZEFzRGF0YVVSTChibG9iLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCieODhuOCreOCueODiOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvVGV4dChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zICYgeyBlbmNvZGluZz86IHN0cmluZyB8IG51bGw7IH0pOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGNvbnN0IHsgZW5jb2RpbmcgfSA9IG9wdHM7XG4gICAgcmV0dXJuIHJlYWRBc1RleHQoYmxvYiwgZW5jb2RpbmcsIG9wdHMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYmxvYlRvQmFzZTY0KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBxdWVyeURhdGFVUkxDb250ZXh0KGF3YWl0IHJlYWRBc0RhdGFVUkwoYmxvYiwgb3B0aW9ucykpLmRhdGE7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gYEJsb2JgLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmxvYihidWZmZXI6IEFycmF5QnVmZmVyLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFtidWZmZXJdLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmluYXJ5KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvRGF0YVVSTChidWZmZXI6IEFycmF5QnVmZmVyLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9EYXRhVVJMKG5ldyBVaW50OEFycmF5KGJ1ZmZlciksIG1pbWVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CYXNlNjQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvQmFzZTY0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgonjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvVGV4dChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9UZXh0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gYEJsb2JgLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQmxvYihiaW5hcnk6IFVpbnQ4QXJyYXksIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW2JpbmFyeV0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQnVmZmVyKGJpbmFyeTogVWludDhBcnJheSk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gYmluYXJ5LmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9EYXRhVVJMKGJpbmFyeTogVWludDhBcnJheSwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2JpbmFyeVRvQmFzZTY0KGJpbmFyeSl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0Jhc2U2NChiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKGJpbmFyeVRvVGV4dChiaW5hcnkpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSDjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb1RleHQoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gZnJvbUJpbmFyeVN0cmluZyhiaW5hcnlUb0JpbmFyeVN0cmluZyhiaW5hcnkpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CbG9iKGJhc2U2NDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIGJpbmFyeVRvQmxvYihiYXNlNjRUb0JpbmFyeShiYXNlNjQpLCBtaW1lVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0J1ZmZlcihiYXNlNjQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gYmFzZTY0VG9CaW5hcnkoYmFzZTY0KS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CaW5hcnkoYmFzZTY0OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmluYXJ5U3RyaW5nVG9CaW5hcnkodG9CaW5hcnlTdHJpbmcoQmFzZTY0LmRlY29kZShiYXNlNjQpKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0RhdGFVUkwoYmFzZTY0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiYXNlNjR9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIHRleHQgc3RyaW5nLlxuICogQGphICBCYXNlNjQg5paH5a2X5YiX44GL44KJIOODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvVGV4dChiYXNlNjQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5kZWNvZGUoYmFzZTY0KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0Jsb2IodGV4dDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuVEVYVCk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbdGV4dF0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQnVmZmVyKHRleHQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gdGV4dFRvQmluYXJ5KHRleHQpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmluYXJ5KHRleHQ6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiaW5hcnlTdHJpbmdUb0JpbmFyeSh0b0JpbmFyeVN0cmluZyh0ZXh0KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvRGF0YVVSTCh0ZXh0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5URVhUKTogc3RyaW5nIHtcbiAgICBjb25zdCBiYXNlNjQgPSB0ZXh0VG9CYXNlNjQodGV4dCk7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2Jhc2U2NH1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmFzZTY0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUodGV4dCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0Jsb2IoZGF0YVVSTDogc3RyaW5nKTogQmxvYiB7XG4gICAgY29uc3QgY29udGV4dCA9IHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTCk7XG4gICAgaWYgKGNvbnRleHQuYmFzZTY0KSB7XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0Jsb2IoY29udGV4dC5kYXRhLCBjb250ZXh0Lm1pbWVUeXBlIHx8IE1pbWVUeXBlLkJJTkFSWSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRleHRUb0Jsb2IoZGVjb2RlVVJJQ29tcG9uZW50KGNvbnRleHQuZGF0YSksIGNvbnRleHQubWltZVR5cGUgfHwgTWltZVR5cGUuVEVYVCk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQnVmZmVyKGRhdGFVUkw6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gZGF0YVVSTFRvQmluYXJ5KGRhdGFVUkwpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CaW5hcnkoZGF0YVVSTDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJhc2U2NFRvQmluYXJ5KGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCieODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvVGV4dChkYXRhVVJMOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNvbnRleHQgPSBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkwpO1xuICAgIGlmIChjb250ZXh0LmJhc2U2NCkge1xuICAgICAgICByZXR1cm4gY29udGV4dC5kYXRhO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKGRlY29kZVVSSUNvbXBvbmVudChjb250ZXh0LmRhdGEpKTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBTZXJpYWxpemFibGUgZGF0YSB0eXBlIGxpc3QuXG4gKiBAamEg44K344Oq44Ki44Op44Kk44K65Y+v6IO944Gq44OH44O844K/5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VyaWFsaXphYmxlIHtcbiAgICBzdHJpbmc6IHN0cmluZztcbiAgICBudW1iZXI6IG51bWJlcjtcbiAgICBib29sZWFuOiBib29sZWFuO1xuICAgIG9iamVjdDogb2JqZWN0O1xuICAgIGJ1ZmZlcjogQXJyYXlCdWZmZXI7XG4gICAgYmluYXJ5OiBVaW50OEFycmF5O1xuICAgIGJsb2I6IEJsb2I7XG59XG5cbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZURhdGFUeXBlcyA9IFR5cGVzPFNlcmlhbGl6YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVJbnB1dERhdGFUeXBlcyA9IFNlcmlhbGl6YWJsZURhdGFUeXBlcyB8IG51bGwgfCB1bmRlZmluZWQ7XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVLZXlzID0gS2V5czxTZXJpYWxpemFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlQ2FzdGFibGUgPSBPbWl0PFNlcmlhbGl6YWJsZSwgJ2J1ZmZlcicgfCAnYmluYXJ5JyB8ICdibG9iJz47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzID0gVHlwZXM8U2VyaWFsaXphYmxlQ2FzdGFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlUmV0dXJuVHlwZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcz4gPSBUeXBlVG9LZXk8U2VyaWFsaXphYmxlQ2FzdGFibGUsIFQ+IGV4dGVuZHMgbmV2ZXIgPyBuZXZlciA6IFQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6YWJsZSBvcHRpb25zIGludGVyZmFjZS5cbiAqIEBqYSDjg4fjgrfjg6rjgqLjg6njgqTjgrrjgavkvb/nlKjjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZXNlcmlhbGl6ZU9wdGlvbnM8VCBleHRlbmRzIFNlcmlhbGl6YWJsZSA9IFNlcmlhbGl6YWJsZSwgSyBleHRlbmRzIEtleXM8VD4gPSBLZXlzPFQ+PiBleHRlbmRzIENhbmNlbGFibGUge1xuICAgIC8qKiBbW1NlcmlhbGl6YWJsZUtleXNdXSAqL1xuICAgIGRhdGFUeXBlPzogSztcbn1cblxuLyoqXG4gKiBAZW4gU2VyaWFsaXplIGRhdGEuXG4gKiBAamEg44OH44O844K/44K344Oq44Ki44Op44Kk44K6XG4gKlxuICogQHBhcmFtIGRhdGEgaW5wdXRcbiAqIEBwYXJhbSBvcHRpb25zIGJsb2IgY29udmVydCBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUlucHV0RGF0YVR5cGVzPihkYXRhOiBULCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCB7IGNhbmNlbCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgIGlmIChudWxsID09IGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gYnVmZmVyVG9EYXRhVVJMKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIGJpbmFyeVRvRGF0YVVSTChkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgIHJldHVybiBibG9iVG9EYXRhVVJMKGRhdGEsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKGRhdGEpIGFzIHN0cmluZztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXplIGRhdGEuXG4gKiBAamEg44OH44O844K/44Gu5b6p5YWDXG4gKlxuICogQHBhcmFtIHZhbHVlIGlucHV0IHN0cmluZyBvciB1bmRlZmluZWQuXG4gKiBAcGFyYW0gb3B0aW9ucyBkZXNlcmlhbGl6ZSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcyA9IFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXM+KFxuICAgIHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBEZXNlcmlhbGl6ZU9wdGlvbnM8U2VyaWFsaXphYmxlLCBuZXZlcj5cbik6IFByb21pc2U8U2VyaWFsaXphYmxlUmV0dXJuVHlwZTxUPj47XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXplIGRhdGEuXG4gKiBAamEg44OH44O844K/44Gu5b6p5YWDXG4gKlxuICogQHBhcmFtIHZhbHVlIGlucHV0IHN0cmluZyBvciB1bmRlZmluZWQuXG4gKiBAcGFyYW0gb3B0aW9ucyBkZXNlcmlhbGl6ZSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlS2V5cz4odmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9uczogRGVzZXJpYWxpemVPcHRpb25zPFNlcmlhbGl6YWJsZSwgVD4pOiBQcm9taXNlPFNlcmlhbGl6YWJsZVtUXSB8IG51bGwgfCB1bmRlZmluZWQ+O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVzZXJpYWxpemUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IERlc2VyaWFsaXplT3B0aW9ucyk6IFByb21pc2U8U2VyaWFsaXphYmxlRGF0YVR5cGVzIHwgbnVsbCB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHsgZGF0YVR5cGUsIGNhbmNlbCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICBhd2FpdCBjYyhjYW5jZWwpO1xuXG4gICAgY29uc3QgZGF0YSA9IHJlc3RvcmVOaWwodG9UeXBlZERhdGEodmFsdWUpKTtcbiAgICBzd2l0Y2ggKGRhdGFUeXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YShkYXRhKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIEJvb2xlYW4oZGF0YSk7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0KGRhdGEpO1xuICAgICAgICBjYXNlICdidWZmZXInOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGFVUkxUb0J1ZmZlcihmcm9tVHlwZWREYXRhKGRhdGEpIGFzIHN0cmluZyk7XG4gICAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmluYXJ5KGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nKTtcbiAgICAgICAgY2FzZSAnYmxvYic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmxvYihmcm9tVHlwZWREYXRhKGRhdGEpIGFzIHN0cmluZyk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVUkwgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2Jsb2JNYXAgPSBuZXcgV2Vha01hcDxCbG9iLCBzdHJpbmc+KCk7XG4vKiogQGludGVybmFsICovIGNvbnN0IF91cmxTZXQgID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbi8qKlxuICogQGVuIGBCbG9iIFVSTGAgdXRpbGl0eSBmb3IgYXV0b21hdGljIG1lbW9yeSBtYW5lZ2VtZW50LlxuICogQGphIOODoeODouODquiHquWLleeuoeeQhuOCkuihjOOBhiBgQmxvYiBVUkxgIOODpuODvOODhuOCo+ODquODhuOCo1xuICovXG5leHBvcnQgY2xhc3MgQmxvYlVSTCB7XG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2VzLlxuICAgICAqIEBqYSDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrprjgZfjgaYgYEJsb2IgVVJMYCDjga7mp4vnr4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNyZWF0ZSguLi5ibG9iczogQmxvYltdKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgYiBvZiBibG9icykge1xuICAgICAgICAgICAgY29uc3QgY2FjaGUgPSBfYmxvYk1hcC5nZXQoYik7XG4gICAgICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYik7XG4gICAgICAgICAgICBfYmxvYk1hcC5zZXQoYiwgdXJsKTtcbiAgICAgICAgICAgIF91cmxTZXQuYWRkKHVybCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIGBCbG9iIFVSTGAgY2FjaGUuXG4gICAgICogQGphIOOBmeOBueOBpuOBriBgQmxvYiBVUkxgIOOCreODo+ODg+OCt+ODpeOCkuegtOajhFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY2xlYXIoKTogdm9pZCB7XG4gICAgICAgIGZvciAoY29uc3QgdXJsIG9mIF91cmxTZXQpIHtcbiAgICAgICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgfVxuICAgICAgICBfdXJsU2V0LmNsZWFyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBgQmxvYiBVUkxgIGZyb20gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBruWPluW+l1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0KGJsb2I6IEJsb2IpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBjYWNoZSA9IF9ibG9iTWFwLmdldChibG9iKTtcbiAgICAgICAgaWYgKGNhY2hlKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgX2Jsb2JNYXAuc2V0KGJsb2IsIHVybCk7XG4gICAgICAgIF91cmxTZXQuYWRkKHVybCk7XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIENoZWNrIGBCbG9iIFVSTGAgaXMgYXZhaWxhYmxlIGZyb20gaW5zdGFuY2UuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBjOacieWKueWMluWIpOWumlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgaGFzKGJsb2I6IEJsb2IpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIF9ibG9iTWFwLmhhcyhibG9iKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV2b2tlIGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZXMuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOCkueEoeWKueWMllxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgcmV2b2tlKC4uLmJsb2JzOiBCbG9iW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIGJsb2JzKSB7XG4gICAgICAgICAgICBjb25zdCB1cmwgPSBfYmxvYk1hcC5nZXQoYik7XG4gICAgICAgICAgICBpZiAodXJsKSB7XG4gICAgICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICAgICAgICAgIF9ibG9iTWFwLmRlbGV0ZShiKTtcbiAgICAgICAgICAgICAgICBfdXJsU2V0LmRlbGV0ZSh1cmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUVBLGlCQUF3QixNQUFNLElBQUksR0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pFLGlCQUF3QixNQUFNLElBQUksR0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pFLGlCQUF3QixNQUFNLElBQUksR0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pFLGlCQUF3QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3ZFLGlCQUF3QixNQUFNLEdBQUcsR0FBVSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQzs7QUNKL0Q7OztBQUdHO01BQ1UsTUFBTSxDQUFBO0FBQ2Y7OztBQUdHO0lBQ0ksT0FBTyxNQUFNLENBQUMsR0FBVyxFQUFBO1FBQzVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEQ7QUFFRDs7O0FBR0c7SUFDSSxPQUFPLE1BQU0sQ0FBQyxPQUFlLEVBQUE7UUFDaEMsT0FBTyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9B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LENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsWUFBQSxJQUFJLEtBQUssRUFBRTtnQkFDUCxTQUFTO0FBQ1osYUFBQTtZQUNELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsWUFBQSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNyQixZQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEIsU0FBQTtLQUNKO0FBRUQ7OztBQUdHO0FBQ0ksSUFBQSxPQUFPLEtBQUssR0FBQTtBQUNmLFFBQUEsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7QUFDdkIsWUFBQSxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLFNBQUE7UUFDRCxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDbkI7QUFFRDs7O0FBR0c7SUFDSSxPQUFPLEdBQUcsQ0FBQyxJQUFVLEVBQUE7UUFDeEIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqQyxRQUFBLElBQUksS0FBSyxFQUFFO0FBQ1AsWUFBQSxPQUFPLEtBQUssQ0FBQztBQUNoQixTQUFBO1FBQ0QsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QyxRQUFBLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLFFBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNqQixRQUFBLE9BQU8sR0FBRyxDQUFDO0tBQ2Q7QUFFRDs7O0FBR0c7SUFDSSxPQUFPLEdBQUcsQ0FBQyxJQUFVLEVBQUE7QUFDeEIsUUFBQSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDN0I7QUFFRDs7O0FBR0c7QUFDSSxJQUFBLE9BQU8sTUFBTSxDQUFDLEdBQUcsS0FBYSxFQUFBO0FBQ2pDLFFBQUEsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUU7WUFDbkIsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixZQUFBLElBQUksR0FBRyxFQUFFO0FBQ0wsZ0JBQUEsR0FBRyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6QixnQkFBQSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLGdCQUFBLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkIsYUFBQTtBQUNKLFNBQUE7S0FDSjtBQUNKOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9iaW5hcnkvIn0=
