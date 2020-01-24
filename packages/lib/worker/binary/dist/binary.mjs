/*!
 * @cdp/binary 0.9.0
 *   binary utility module
 */

import { safe, verify, fromTypedData, restoreNil, toTypedData } from '@cdp/core-utils';
import { CancelToken, checkCanceled } from '@cdp/promise';

const _btoa = safe(globalThis.btoa);
const _atob = safe(globalThis.atob);
const _Blob = safe(globalThis.Blob);
const _FileReader = safe(globalThis.FileReader);
const _URL = safe(globalThis.URL);

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

/* eslint-disable
   prefer-spread
 , @typescript-eslint/no-explicit-any
 , @typescript-eslint/no-non-null-assertion
 */
/** execute read blob */
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
    else if (data instanceof _Blob) {
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

export { Base64, _Blob as Blob, BlobURL, _FileReader as FileReader, _URL as URL, _atob as atob, base64ToBinary, base64ToBlob, base64ToBuffer, base64ToDataURL, base64ToText, binaryToBase64, binaryToBlob, binaryToBuffer, binaryToDataURL, binaryToText, blobToBase64, blobToBinary, blobToBuffer, blobToDataURL, blobToText, _btoa as btoa, bufferToBase64, bufferToBinary, bufferToBlob, bufferToDataURL, bufferToText, dataURLToBase64, dataURLToBinary, dataURLToBlob, dataURLToBuffer, dataURLToText, deserialize, fromBinaryString, fromHexString, readAsArrayBuffer, readAsDataURL, readAsText, serialize, textToBase64, textToBinary, textToBlob, textToBuffer, textToDataURL, toBinaryString, toHexString };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5Lm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwiYmFzZTY0LnRzIiwiYmxvYi1yZWFkZXIudHMiLCJjb252ZXJ0ZXIudHMiLCJibG9iLXVybC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuY29uc3QgX2J0b2EgPSBzYWZlKGdsb2JhbFRoaXMuYnRvYSk7XG5jb25zdCBfYXRvYiA9IHNhZmUoZ2xvYmFsVGhpcy5hdG9iKTtcbmNvbnN0IF9CbG9iID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuY29uc3QgX0ZpbGVSZWFkZXIgPSBzYWZlKGdsb2JhbFRoaXMuRmlsZVJlYWRlcik7XG5jb25zdCBfVVJMID0gc2FmZShnbG9iYWxUaGlzLlVSTCk7XG5cbmV4cG9ydCB7XG4gICAgX2J0b2EgYXMgYnRvYSxcbiAgICBfYXRvYiBhcyBhdG9iLFxuICAgIF9CbG9iIGFzIEJsb2IsXG4gICAgX0ZpbGVSZWFkZXIgYXMgRmlsZVJlYWRlcixcbiAgICBfVVJMIGFzIFVSTCxcbn07XG4iLCJpbXBvcnQgeyBhdG9iLCBidG9hIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBgYmFzZTY0YCB1dGlsaXR5IGZvciBpbmRlcGVuZGVudCBjaGFyYWN0b3IgY29kZS5cbiAqIEBqYSDmloflrZfjgrPjg7zjg4njgavkvp3lrZjjgZfjgarjgYQgYGJhc2U2NGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCYXNlNjQge1xuICAgIC8qKlxuICAgICAqIEBlbiBFbmNvZGUgYSBiYXNlLTY0IGVuY29kZWQgc3RyaW5nIGZyb20gYSBiaW5hcnkgc3RyaW5nLlxuICAgICAqIEBqYSDmloflrZfliJfjgpIgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZW5jb2RlKHNyYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHNyYykpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVjb2RlcyBhIHN0cmluZyBvZiBkYXRhIHdoaWNoIGhhcyBiZWVuIGVuY29kZWQgdXNpbmcgYmFzZS02NCBlbmNvZGluZy5cbiAgICAgKiBAamEgYmFzZTY0IOW9ouW8j+OBp+OCqOODs+OCs+ODvOODieOBleOCjOOBn+ODh+ODvOOCv+OBruaWh+Wtl+WIl+OCkuODh+OCs+ODvOODiVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZGVjb2RlKGVuY29kZWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGF0b2IoZW5jb2RlZCkpKTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgcHJlZmVyLXNwcmVhZFxuICwgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICwgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICovXG5cbmltcG9ydCB7IHZlcmlmeSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDYW5jZWxUb2tlbiwgQ2FuY2VsYWJsZSB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBGaWxlUmVhZGVyQXJnc01hcCB7XG4gICAgcmVhZEFzQXJyYXlCdWZmZXI6IFtCbG9iXTtcbiAgICByZWFkQXNEYXRhVVJMOiBbQmxvYl07XG4gICAgcmVhZEFzVGV4dDogW0Jsb2IsIHN0cmluZyB8IHVuZGVmaW5lZF07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBGaWxlUmVhZGVyUmVzdWx0TWFwIHtcbiAgICByZWFkQXNBcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXI7XG4gICAgcmVhZEFzRGF0YVVSTDogc3RyaW5nO1xuICAgIHJlYWRBc1RleHQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gYEJsb2JgIHJlYWQgb3B0aW9uc1xuICogQGphIGBCbG9iYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCbG9iUmVhZE9wdGlvbnMgZXh0ZW5kcyBDYW5jZWxhYmxlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvZ3Jlc3MgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQGphIOmAsuaNl+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb2dyZXNzXG4gICAgICogIC0gYGVuYCB3b3JrZXIgcHJvZ3Jlc3MgZXZlbnRcbiAgICAgKiAgLSBgamFgIHdvcmtlciDpgLLmjZfjgqTjg5njg7Pjg4hcbiAgICAgKi9cbiAgICBvbnByb2dyZXNzPzogKHByb2dyZXNzOiBQcm9ncmVzc0V2ZW50KSA9PiBhbnk7XG59XG5cbi8qKiBleGVjdXRlIHJlYWQgYmxvYiAqL1xuZnVuY3Rpb24gZXhlYzxUIGV4dGVuZHMga2V5b2YgRmlsZVJlYWRlclJlc3VsdE1hcD4oXG4gICAgbWV0aG9kTmFtZTogVCxcbiAgICBhcmdzOiBGaWxlUmVhZGVyQXJnc01hcFtUXSxcbiAgICBvcHRpb25zOiBCbG9iUmVhZE9wdGlvbnMsXG4pOiBQcm9taXNlPEZpbGVSZWFkZXJSZXN1bHRNYXBbVF0+IHtcbiAgICB0eXBlIFRSZXN1bHQgPSBGaWxlUmVhZGVyUmVzdWx0TWFwW1RdO1xuICAgIGNvbnN0IHsgY2FuY2VsOiB0b2tlbiwgb25wcm9ncmVzcyB9ID0gb3B0aW9ucztcbiAgICB0b2tlbiAmJiB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBDYW5jZWxUb2tlbiwgdG9rZW4pO1xuICAgIG9ucHJvZ3Jlc3MgJiYgdmVyaWZ5KCd0eXBlT2YnLCAnZnVuY3Rpb24nLCBvbnByb2dyZXNzKTtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8VFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0b2tlbiAmJiB0b2tlbi5yZWdpc3RlcigoKSA9PiB7XG4gICAgICAgICAgICByZWFkZXIuYWJvcnQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlYWRlci5vbmFib3J0ID0gcmVhZGVyLm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVhZGVyLm9ucHJvZ3Jlc3MgPSBvbnByb2dyZXNzITtcbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCBhcyBUUmVzdWx0KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbiAmJiBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVhZGVyW21ldGhvZE5hbWVdLmFwcGx5KHJlYWRlciwgYXJncyk7XG4gICAgfSwgdG9rZW4pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGBBcnJheUJ1ZmZlcmAgcmVzdWx0IGZyb20gYEJsb2JgIG9yIGBGaWxlYC5cbiAqIEBqYSBgQmxvYmAg44G+44Gf44GvIGBGaWxlYCDjgYvjgokgYEFycmF5QnVmZmVyYCDjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNBcnJheUJ1ZmZlcihibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNBcnJheUJ1ZmZlcicsIFtibG9iXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGRhdGEtVVJMIHN0cmluZyBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJIGBkYXRhLXVybCDmloflrZfliJfjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBzcGVjaWZpZWQgcmVhZGluZyB0YXJnZXQgb2JqZWN0LlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorlr77osaHjga7jgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNEYXRhVVJMKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBleGVjKCdyZWFkQXNEYXRhVVJMJywgW2Jsb2JdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdGV4dCBjb250ZW50IHN0cmluZyBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJ44OG44Kt44K544OI5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gZW5jb2RpbmdcbiAqICAtIGBlbmAgZW5jb2Rpbmcgc3RyaW5nIHRvIHVzZSBmb3IgdGhlIHJldHVybmVkIGRhdGEuIGRlZmF1bHQ6IGB1dGYtOGBcbiAqICAtIGBqYWAg44Ko44Oz44Kz44O844OH44Kj44Oz44Kw44KS5oyH5a6a44GZ44KL5paH5a2X5YiXIOaXouWumjogYHV0Zi04YFxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcmVhZGluZyBvcHRpb25zLlxuICogIC0gYGphYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBc1RleHQoYmxvYjogQmxvYiwgZW5jb2Rpbmc/OiBzdHJpbmcgfCBudWxsLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzVGV4dCcsIFtibG9iLCBlbmNvZGluZyB8fCB1bmRlZmluZWRdLCB7IC4uLm9wdGlvbnMgfSk7XG59XG4iLCJpbXBvcnQge1xuICAgIEtleXMsXG4gICAgVHlwZXMsXG4gICAgVHlwZVRvS2V5LFxuICAgIHRvVHlwZWREYXRhLFxuICAgIGZyb21UeXBlZERhdGEsXG4gICAgcmVzdG9yZU5pbCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgQmFzZTY0IH0gZnJvbSAnLi9iYXNlNjQnO1xuaW1wb3J0IHtcbiAgICBCbG9iUmVhZE9wdGlvbnMsXG4gICAgcmVhZEFzQXJyYXlCdWZmZXIsXG4gICAgcmVhZEFzRGF0YVVSTCxcbiAgICByZWFkQXNUZXh0LFxufSBmcm9tICcuL2Jsb2ItcmVhZGVyJztcbmltcG9ydCB7IEJsb2IgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gTWltZVR5cGUge1xuICAgIEJJTkFSWSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nLFxuICAgIFRFWFQgPSAndGV4dC9wbGFpbicsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGRhdGEtVVJMIOWxnuaApyAqL1xuaW50ZXJmYWNlIERhdGFVUkxDb250ZXh0IHtcbiAgICBtaW1lVHlwZTogc3RyaW5nO1xuICAgIGJhc2U2NDogYm9vbGVhbjtcbiAgICBkYXRhOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBkYXRhIFVSSSDlvaLlvI/jga7mraPopo/ooajnj75cbiAqIOWPguiAgzogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9kYXRhX1VSSXNcbiAqL1xuZnVuY3Rpb24gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMOiBzdHJpbmcpOiBEYXRhVVJMQ29udGV4dCB7XG4gICAgY29uc3QgY29udGV4dCA9IHsgYmFzZTY0OiBmYWxzZSB9IGFzIERhdGFVUkxDb250ZXh0O1xuXG4gICAgLyoqXG4gICAgICogW21hdGNoXSAxOiBtaW1lLXR5cGVcbiAgICAgKiAgICAgICAgIDI6IFwiO2Jhc2U2NFwiIOOCkuWQq+OCgOOCquODl+OCt+ODp+ODs1xuICAgICAqICAgICAgICAgMzogZGF0YSDmnKzkvZNcbiAgICAgKi9cbiAgICBjb25zdCByZXN1bHQgPSAvXmRhdGE6KC4rP1xcLy4rPyk/KDsuKz8pPywoLiopJC8uZXhlYyhkYXRhVVJMKTtcbiAgICBpZiAobnVsbCA9PSByZXN1bHQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGRhdGEtVVJMOiAke2RhdGFVUkx9YCk7XG4gICAgfVxuXG4gICAgY29udGV4dC5taW1lVHlwZSA9IHJlc3VsdFsxXTtcbiAgICBjb250ZXh0LmJhc2U2NCA9IC87YmFzZTY0Ly50ZXN0KHJlc3VsdFsyXSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1pbmNsdWRlc1xuICAgIGNvbnRleHQuZGF0YSA9IHJlc3VsdFszXTtcblxuICAgIHJldHVybiBjb250ZXh0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIGhlbHBlciAqL1xuZnVuY3Rpb24gYmluYXJ5U3RyaW5nVG9CaW5hcnkoYnl0ZXM6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIGNvbnN0IGFycmF5ID0gYnl0ZXMuc3BsaXQoJycpLm1hcChjID0+IGMuY2hhckNvZGVBdCgwKSk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGFycmF5KTtcbn1cblxuLyoqIGhlbHBlciAqL1xuZnVuY3Rpb24gYmluYXJ5VG9CaW5hcnlTdHJpbmcoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKGJpbmFyeSwgKGk6IG51bWJlcikgPT4gU3RyaW5nLmZyb21DaGFyQ29kZShpKSkuam9pbignJyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIHRvIGJpbmFyeS1zdHJpbmcuIChub3QgaHVtYW4gcmVhZGFibGUgc3RyaW5nKVxuICogQGphIOODkOOCpOODiuODquaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0JpbmFyeVN0cmluZyh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQodGV4dCkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHN0cmluZyBmcm9tIGJpbmFyeS1zdHJpbmcuXG4gKiBAamEg44OQ44Kk44OK44Oq5paH5a2X5YiX44GL44KJ5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ5dGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tQmluYXJ5U3RyaW5nKGJ5dGVzOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGJ5dGVzKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYmluYXJ5IHRvIGhleC1zdHJpbmcuXG4gKiBAamEg44OQ44Kk44OK44Oq44KSIEhFWCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gaGV4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tSGV4U3RyaW5nKGhleDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgY29uc3QgeCA9IGhleC5tYXRjaCgvLnsxLDJ9L2cpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShudWxsICE9IHggPyB4Lm1hcChieXRlID0+IHBhcnNlSW50KGJ5dGUsIDE2KSkgOiBbXSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIGZyb20gaGV4LXN0cmluZy5cbiAqIEBqYSBIRVgg5paH5a2X5YiX44GL44KJ44OQ44Kk44OK44Oq44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9IZXhTdHJpbmcoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5LnJlZHVjZSgoc3RyLCBieXRlKSA9PiBzdHIgKyBieXRlLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpLnBhZFN0YXJ0KDIsICcwJyksICcnKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvQnVmZmVyKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gICAgcmV0dXJuIHJlYWRBc0FycmF5QnVmZmVyKGJsb2IsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBgVWludDhBcnJheWAuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBgVWludDhBcnJheWAg44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBibG9iVG9CaW5hcnkoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShhd2FpdCByZWFkQXNBcnJheUJ1ZmZlcihibG9iLCBvcHRpb25zKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvRGF0YVVSTChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gcmVhZEFzRGF0YVVSTChibG9iLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCieODhuOCreOCueODiOOBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmxvYlRvVGV4dChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zICYgeyBlbmNvZGluZz86IHN0cmluZyB8IG51bGw7IH0pOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGNvbnN0IHsgZW5jb2RpbmcgfSA9IG9wdHM7XG4gICAgcmV0dXJuIHJlYWRBc1RleHQoYmxvYiwgZW5jb2RpbmcsIG9wdHMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byBCYXNlNjQgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBuOWkieaPm1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIGBCbG9iYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQmxvYmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYmxvYlRvQmFzZTY0KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiBxdWVyeURhdGFVUkxDb250ZXh0KGF3YWl0IHJlYWRBc0RhdGFVUkwoYmxvYiwgb3B0aW9ucykpLmRhdGE7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gYEJsb2JgLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmxvYihidWZmZXI6IEFycmF5QnVmZmVyLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIG5ldyBCbG9iKFtidWZmZXJdLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvQmluYXJ5KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIGRhdGEtVVJMIHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvRGF0YVVSTChidWZmZXI6IEFycmF5QnVmZmVyLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9EYXRhVVJMKG5ldyBVaW50OEFycmF5KGJ1ZmZlciksIG1pbWVUeXBlKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQXJyYXlCdWZmZXJgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CYXNlNjQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJpbmFyeVRvQmFzZTY0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgonjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnVmZmVyXG4gKiAgLSBgZW5gIGBBcnJheUJ1ZmZlcmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEFycmF5QnVmZmVyYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1ZmZlclRvVGV4dChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9UZXh0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcikpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gYEJsb2JgLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQmxvYihiaW5hcnk6IFVpbnQ4QXJyYXksIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW2JpbmFyeV0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYFVpbnQ4QXJyYXlgIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiaW5hcnlcbiAqICAtIGBlbmAgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBVaW50OEFycmF5YCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJpbmFyeVRvQnVmZmVyKGJpbmFyeTogVWludDhBcnJheSk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gYmluYXJ5LmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9EYXRhVVJMKGJpbmFyeTogVWludDhBcnJheSwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2JpbmFyeVRvQmFzZTY0KGJpbmFyeSl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0Jhc2U2NChiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKGJpbmFyeVRvVGV4dChiaW5hcnkpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSDjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb1RleHQoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gZnJvbUJpbmFyeVN0cmluZyhiaW5hcnlUb0JpbmFyeVN0cmluZyhiaW5hcnkpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CbG9iKGJhc2U2NDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIGJpbmFyeVRvQmxvYihiYXNlNjRUb0JpbmFyeShiYXNlNjQpLCBtaW1lVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0J1ZmZlcihiYXNlNjQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gYmFzZTY0VG9CaW5hcnkoYmFzZTY0KS5idWZmZXI7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CaW5hcnkoYmFzZTY0OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICByZXR1cm4gYmluYXJ5U3RyaW5nVG9CaW5hcnkodG9CaW5hcnlTdHJpbmcoQmFzZTY0LmRlY29kZShiYXNlNjQpKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0RhdGFVUkwoYmFzZTY0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgZGF0YToke21pbWVUeXBlfTtiYXNlNjQsJHtiYXNlNjR9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBCYXNlNjQgc3RyaW5nIHRvIHRleHQgc3RyaW5nLlxuICogQGphICBCYXNlNjQg5paH5a2X5YiX44GL44KJIOODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvVGV4dChiYXNlNjQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5kZWNvZGUoYmFzZTY0KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYEJsb2JgLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqIEBwYXJhbSBtaW1lVHlwZVxuICogIC0gYGVuYCBtaW1lLXR5cGUgc3RyaW5nXG4gKiAgLSBgamFgIG1pbWUtdHlwZSDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0Jsb2IodGV4dDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuVEVYVCk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbdGV4dF0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQnVmZmVyKHRleHQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gdGV4dFRvQmluYXJ5KHRleHQpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBgVWludDhBcnJheWAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBVaW50OEFycmF5YCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmluYXJ5KHRleHQ6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBiaW5hcnlTdHJpbmdUb0JpbmFyeSh0b0JpbmFyeVN0cmluZyh0ZXh0KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIOODhuOCreOCueODiOOBi+OCiSBkYXRhLVVSTCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvRGF0YVVSTCh0ZXh0OiBzdHJpbmcsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5URVhUKTogc3RyaW5nIHtcbiAgICBjb25zdCBiYXNlNjQgPSB0ZXh0VG9CYXNlNjQodGV4dCk7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2Jhc2U2NH1gO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gdGV4dFxuICogIC0gYGVuYCB0ZXh0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIOODhuOCreOCueODiOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dFRvQmFzZTY0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIEJhc2U2NC5lbmNvZGUodGV4dCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBCbG9iYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0Jsb2IoZGF0YVVSTDogc3RyaW5nKTogQmxvYiB7XG4gICAgY29uc3QgY29udGV4dCA9IHF1ZXJ5RGF0YVVSTENvbnRleHQoZGF0YVVSTCk7XG4gICAgaWYgKGNvbnRleHQuYmFzZTY0KSB7XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0Jsb2IoY29udGV4dC5kYXRhLCBjb250ZXh0Lm1pbWVUeXBlIHx8IE1pbWVUeXBlLkJJTkFSWSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRleHRUb0Jsb2IoZGVjb2RlVVJJQ29tcG9uZW50KGNvbnRleHQuZGF0YSksIGNvbnRleHQubWltZVR5cGUgfHwgTWltZVR5cGUuVEVYVCk7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGRhdGEtVVJMIHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgQXJyYXlCdWZmZXJgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQnVmZmVyKGRhdGFVUkw6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgICByZXR1cm4gZGF0YVVSTFRvQmluYXJ5KGRhdGFVUkwpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CaW5hcnkoZGF0YVVSTDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJhc2U2NFRvQmluYXJ5KGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCieODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvVGV4dChkYXRhVVJMOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNvbnRleHQgPSBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkwpO1xuICAgIGlmIChjb250ZXh0LmJhc2U2NCkge1xuICAgICAgICByZXR1cm4gY29udGV4dC5kYXRhO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKGRlY29kZVVSSUNvbXBvbmVudChjb250ZXh0LmRhdGEpKTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBTZXJpYWxpemFibGUgZGF0YSB0eXBlIGxpc3QuXG4gKiBAamEg44K344Oq44Ki44Op44Kk44K65Y+v6IO944Gq44OH44O844K/5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VyaWFsaXphYmxlIHtcbiAgICBzdHJpbmc6IHN0cmluZztcbiAgICBudW1iZXI6IG51bWJlcjtcbiAgICBib29sZWFuOiBib29sZWFuO1xuICAgIG9iamVjdDogb2JqZWN0O1xuICAgIGJ1ZmZlcjogQXJyYXlCdWZmZXI7XG4gICAgYmluYXJ5OiBVaW50OEFycmF5O1xuICAgIGJsb2I6IEJsb2I7XG59XG5cbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZURhdGFUeXBlcyA9IFR5cGVzPFNlcmlhbGl6YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVJbnB1dERhdGFUeXBlcyA9IFNlcmlhbGl6YWJsZURhdGFUeXBlcyB8IG51bGwgfCB1bmRlZmluZWQ7XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVLZXlzID0gS2V5czxTZXJpYWxpemFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlQ2FzdGFibGUgPSBPbWl0PFNlcmlhbGl6YWJsZSwgJ2J1ZmZlcicgfCAnYmluYXJ5JyB8ICdibG9iJz47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzID0gVHlwZXM8U2VyaWFsaXphYmxlQ2FzdGFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlUmV0dXJuVHlwZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcz4gPSBUeXBlVG9LZXk8U2VyaWFsaXphYmxlQ2FzdGFibGUsIFQ+IGV4dGVuZHMgbmV2ZXIgPyBuZXZlciA6IFQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6YWJsZSBvcHRpb25zIGludGVyZmFjZS5cbiAqIEBqYSDjg4fjgrfjg6rjgqLjg6njgqTjgrrjgavkvb/nlKjjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZXNlcmlhbGl6ZU9wdGlvbnM8VCBleHRlbmRzIFNlcmlhbGl6YWJsZSA9IFNlcmlhbGl6YWJsZSwgSyBleHRlbmRzIEtleXM8VD4gPSBLZXlzPFQ+PiBleHRlbmRzIENhbmNlbGFibGUge1xuICAgIC8qKiBbW1NlcmlhbGl6YWJsZUtleXNdXSAqL1xuICAgIGRhdGFUeXBlPzogSztcbn1cblxuLyoqXG4gKiBAZW4gU2VyaWFsaXplIGRhdGEuXG4gKiBAamEg44OH44O844K/44K344Oq44Ki44Op44Kk44K6XG4gKlxuICogQHBhcmFtIGRhdGEgaW5wdXRcbiAqIEBwYXJhbSBvcHRpb25zIGJsb2IgY29udmVydCBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUlucHV0RGF0YVR5cGVzPihkYXRhOiBULCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCB7IGNhbmNlbCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICBhd2FpdCBjYyhjYW5jZWwpO1xuICAgIGlmIChudWxsID09IGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gYnVmZmVyVG9EYXRhVVJMKGRhdGEpO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIGJpbmFyeVRvRGF0YVVSTChkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgIHJldHVybiBibG9iVG9EYXRhVVJMKGRhdGEsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKGRhdGEpIGFzIHN0cmluZztcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXplIGRhdGEuXG4gKiBAamEg44OH44O844K/44Gu5b6p5YWDXG4gKlxuICogQHBhcmFtIHZhbHVlIGlucHV0IHN0cmluZyBvciB1bmRlZmluZWQuXG4gKiBAcGFyYW0gb3B0aW9ucyBkZXNlcmlhbGl6ZSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcyA9IFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXM+KFxuICAgIHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBEZXNlcmlhbGl6ZU9wdGlvbnM8U2VyaWFsaXphYmxlLCBuZXZlcj5cbik6IFByb21pc2U8U2VyaWFsaXphYmxlUmV0dXJuVHlwZTxUPj47XG5cbi8qKlxuICogQGVuIERlc2VyaWFsaXplIGRhdGEuXG4gKiBAamEg44OH44O844K/44Gu5b6p5YWDXG4gKlxuICogQHBhcmFtIHZhbHVlIGlucHV0IHN0cmluZyBvciB1bmRlZmluZWQuXG4gKiBAcGFyYW0gb3B0aW9ucyBkZXNlcmlhbGl6ZSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXNlcmlhbGl6ZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlS2V5cz4odmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9uczogRGVzZXJpYWxpemVPcHRpb25zPFNlcmlhbGl6YWJsZSwgVD4pOiBQcm9taXNlPFNlcmlhbGl6YWJsZVtUXSB8IG51bGwgfCB1bmRlZmluZWQ+O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVzZXJpYWxpemUodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0aW9ucz86IERlc2VyaWFsaXplT3B0aW9ucyk6IFByb21pc2U8U2VyaWFsaXphYmxlRGF0YVR5cGVzIHwgbnVsbCB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHsgZGF0YVR5cGUsIGNhbmNlbCB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICBhd2FpdCBjYyhjYW5jZWwpO1xuXG4gICAgY29uc3QgZGF0YSA9IHJlc3RvcmVOaWwodG9UeXBlZERhdGEodmFsdWUpKTtcbiAgICBzd2l0Y2ggKGRhdGFUeXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YShkYXRhKTtcbiAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgcmV0dXJuIEJvb2xlYW4oZGF0YSk7XG4gICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0KGRhdGEpO1xuICAgICAgICBjYXNlICdidWZmZXInOlxuICAgICAgICAgICAgcmV0dXJuIGRhdGFVUkxUb0J1ZmZlcihmcm9tVHlwZWREYXRhKGRhdGEpIGFzIHN0cmluZyk7XG4gICAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmluYXJ5KGZyb21UeXBlZERhdGEoZGF0YSkgYXMgc3RyaW5nKTtcbiAgICAgICAgY2FzZSAnYmxvYic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQmxvYihmcm9tVHlwZWREYXRhKGRhdGEpIGFzIHN0cmluZyk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVUkwgfSBmcm9tICcuL3Nzcic7XG5cbmNvbnN0IF9ibG9iTWFwID0gbmV3IFdlYWtNYXA8QmxvYiwgc3RyaW5nPigpO1xuY29uc3QgX3VybFNldCAgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuLyoqXG4gKiBAZW4gYEJsb2IgVVJMYCB1dGlsaXR5IGZvciBhdXRvbWF0aWMgbWVtb3J5IG1hbmVnZW1lbnQuXG4gKiBAamEg44Oh44Oi44Oq6Ieq5YuV566h55CG44KS6KGM44GGIGBCbG9iIFVSTGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCbG9iVVJMIHtcbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZXMuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBruani+eviVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlKC4uLmJsb2JzOiBCbG9iW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIGJsb2JzKSB7XG4gICAgICAgICAgICBjb25zdCBjYWNoZSA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChiKTtcbiAgICAgICAgICAgIF9ibG9iTWFwLnNldChiLCB1cmwpO1xuICAgICAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYEJsb2IgVVJMYCBjYWNoZS5cbiAgICAgKiBAamEg44GZ44G544Gm44GuIGBCbG9iIFVSTGAg44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhcigpOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgX3VybFNldCkge1xuICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIF91cmxTZXQuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44Gu5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZXQoYmxvYjogQmxvYik6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gX2Jsb2JNYXAuZ2V0KGJsb2IpO1xuICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICBfYmxvYk1hcC5zZXQoYmxvYiwgdXJsKTtcbiAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYEJsb2IgVVJMYCBpcyBhdmFpbGFibGUgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44GM5pyJ5Yq55YyW5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBoYXMoYmxvYjogQmxvYik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gX2Jsb2JNYXAuaGFzKGJsb2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXZva2UgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlcy5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44KS54Sh5Yq55YyWXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyByZXZva2UoLi4uYmxvYnM6IEJsb2JbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGIgb2YgYmxvYnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgX2Jsb2JNYXAuZGVsZXRlKGIpO1xuICAgICAgICAgICAgICAgIF91cmxTZXQuZGVsZXRlKHVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iXSwibmFtZXMiOlsiYnRvYSIsImF0b2IiLCJCbG9iIiwiY2MiLCJVUkwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O01BRU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFO01BQzlCLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRTtNQUM5QixLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUU7TUFDOUIsV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFO01BQzFDLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUc7O0FDSmhDOzs7O0FBSUEsTUFBYSxNQUFNOzs7OztJQUtSLE9BQU8sTUFBTSxDQUFDLEdBQVc7UUFDNUIsT0FBT0EsS0FBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEQ7Ozs7O0lBTU0sT0FBTyxNQUFNLENBQUMsT0FBZTtRQUNoQyxPQUFPLGtCQUFrQixDQUFDLE1BQU0sQ0FBQ0MsS0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNwRDtDQUNKOztBQ3RCRDs7Ozs7QUFNQSxBQWlDQTtBQUNBLFNBQVMsSUFBSSxDQUNULFVBQWEsRUFDYixJQUEwQixFQUMxQixPQUF3QjtJQUd4QixNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFD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
