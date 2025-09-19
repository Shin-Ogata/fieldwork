/*!
 * @cdp/binary 0.9.20
 *   binary utility module
 */

import { safe, verify, fromTypedData, restoreNullish, toTypedData } from '@cdp/core-utils';
import { CancelToken, checkCanceled } from '@cdp/promise';

/** @internal */ const btoa = safe(globalThis.btoa);
/** @internal */ const atob = safe(globalThis.atob);
/** @internal */ const Blob = safe(globalThis.Blob);
/** @internal */ const FileReader = safe(globalThis.FileReader);
/** @internal */ const URL = safe(globalThis.URL);
/** @internal */ const TextEncoder = safe(globalThis.TextEncoder);

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
    token && verify('instanceOf', CancelToken, token);
    onprogress && verify('typeOf', 'function', onprogress);
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
            subscription?.unsubscribe();
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
    const { dataType, cancel } = options ?? {};
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5Lm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwiYmFzZTY0LnRzIiwiYmxvYi1yZWFkZXIudHMiLCJjb252ZXJ0ZXIudHMiLCJibG9iLXVybC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgYnRvYSAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuYnRvYSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBhdG9iICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5hdG9iKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IEJsb2IgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgRmlsZVJlYWRlciAgPSBzYWZlKGdsb2JhbFRoaXMuRmlsZVJlYWRlcik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBVUkwgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgVGV4dEVuY29kZXIgPSBzYWZlKGdsb2JhbFRoaXMuVGV4dEVuY29kZXIpO1xuIiwiaW1wb3J0IHtcbiAgICBUZXh0RW5jb2RlcixcbiAgICBhdG9iLFxuICAgIGJ0b2EsXG59IGZyb20gJy4vc3NyJztcblxuLyoqXG4gKiBAZW4gYGJhc2U2NGAgdXRpbGl0eSBmb3IgaW5kZXBlbmRlbnQgY2hhcmFjdG9yIGNvZGUuXG4gKiBAamEg5paH5a2X44Kz44O844OJ44Gr5L6d5a2Y44GX44Gq44GEIGBiYXNlNjRgIOODpuODvOODhuOCo+ODquODhuOCo1xuICovXG5leHBvcnQgY2xhc3MgQmFzZTY0IHtcbiAgICAvKipcbiAgICAgKiBAZW4gRW5jb2RlIGEgYmFzZS02NCBlbmNvZGVkIHN0cmluZyBmcm9tIGEgYmluYXJ5IHN0cmluZy5cbiAgICAgKiBAamEg5paH5a2X5YiX44KSIGJhc2U2NCDlvaLlvI/jgafjgqjjg7PjgrPjg7zjg4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGVuY29kZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHV0ZjhCeXRlcyA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShzcmMpO1xuICAgICAgICBjb25zdCBiaW5hcnlTdHJpbmcgPSBBcnJheS5mcm9tKHV0ZjhCeXRlcylcbiAgICAgICAgICAgIC5tYXAoYnl0ZSA9PiBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGUpKVxuICAgICAgICAgICAgLmpvaW4oJycpO1xuICAgICAgICByZXR1cm4gYnRvYShiaW5hcnlTdHJpbmcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWNvZGVzIGEgc3RyaW5nIG9mIGRhdGEgd2hpY2ggaGFzIGJlZW4gZW5jb2RlZCB1c2luZyBiYXNlLTY0IGVuY29kaW5nLlxuICAgICAqIEBqYSBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJ44GV44KM44Gf44OH44O844K/44Gu5paH5a2X5YiX44KS44OH44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBkZWNvZGUoZW5jb2RlZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gYXRvYihlbmNvZGVkKTtcbiAgICAgICAgY29uc3QgdXRmOEJ5dGVzID0gVWludDhBcnJheS5mcm9tKGJpbmFyeVN0cmluZywgY2hhciA9PiBjaGFyLmNoYXJDb2RlQXQoMCkpO1xuICAgICAgICByZXR1cm4gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKHV0ZjhCeXRlcyk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdHlwZSBVbmtub3duRnVuY3Rpb24sIHZlcmlmeSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIENhbmNlbGFibGUsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEZpbGVSZWFkZXIgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBGaWxlUmVhZGVyQXJnc01hcCB7XG4gICAgcmVhZEFzQXJyYXlCdWZmZXI6IFtCbG9iXTtcbiAgICByZWFkQXNEYXRhVVJMOiBbQmxvYl07XG4gICAgcmVhZEFzVGV4dDogW0Jsb2IsIHN0cmluZyB8IHVuZGVmaW5lZF07XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBGaWxlUmVhZGVyUmVzdWx0TWFwIHtcbiAgICByZWFkQXNBcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXI7XG4gICAgcmVhZEFzRGF0YVVSTDogc3RyaW5nO1xuICAgIHJlYWRBc1RleHQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBAZW4gYEJsb2JgIHJlYWQgb3B0aW9uc1xuICogQGphIGBCbG9iYCDoqq3jgb/lj5bjgorjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCbG9iUmVhZE9wdGlvbnMgZXh0ZW5kcyBDYW5jZWxhYmxlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvZ3Jlc3MgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQGphIOmAsuaNl+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqXG4gICAgICogQHBhcmFtIHByb2dyZXNzXG4gICAgICogIC0gYGVuYCB3b3JrZXIgcHJvZ3Jlc3MgZXZlbnRcbiAgICAgKiAgLSBgamFgIHdvcmtlciDpgLLmjZfjgqTjg5njg7Pjg4hcbiAgICAgKi9cbiAgICBvbnByb2dyZXNzPzogKHByb2dyZXNzOiBQcm9ncmVzc0V2ZW50KSA9PiB1bmtub3duO1xufVxuXG4vKiogQGludGVybmFsIGV4ZWN1dGUgcmVhZCBibG9iICovXG5mdW5jdGlvbiBleGVjPFQgZXh0ZW5kcyBrZXlvZiBGaWxlUmVhZGVyUmVzdWx0TWFwPihcbiAgICBtZXRob2ROYW1lOiBULFxuICAgIGFyZ3M6IEZpbGVSZWFkZXJBcmdzTWFwW1RdLFxuICAgIG9wdGlvbnM6IEJsb2JSZWFkT3B0aW9ucyxcbik6IFByb21pc2U8RmlsZVJlYWRlclJlc3VsdE1hcFtUXT4ge1xuICAgIHR5cGUgVFJlc3VsdCA9IEZpbGVSZWFkZXJSZXN1bHRNYXBbVF07XG4gICAgY29uc3QgeyBjYW5jZWw6IHRva2VuLCBvbnByb2dyZXNzIH0gPSBvcHRpb25zO1xuICAgIHRva2VuICYmIHZlcmlmeSgnaW5zdGFuY2VPZicsIENhbmNlbFRva2VuLCB0b2tlbik7XG4gICAgb25wcm9ncmVzcyAmJiB2ZXJpZnkoJ3R5cGVPZicsICdmdW5jdGlvbicsIG9ucHJvZ3Jlc3MpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxUUmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRva2VuPy5yZWdpc3RlcigoKSA9PiB7XG4gICAgICAgICAgICByZWFkZXIuYWJvcnQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlYWRlci5vbmFib3J0ID0gcmVhZGVyLm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVhZGVyLm9ucHJvZ3Jlc3MgPSBvbnByb2dyZXNzITtcbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdCBhcyBUUmVzdWx0KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9ICgpID0+IHtcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbj8udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgfTtcbiAgICAgICAgKHJlYWRlclttZXRob2ROYW1lXSBhcyBVbmtub3duRnVuY3Rpb24pKC4uLmFyZ3MpO1xuICAgIH0sIHRva2VuKTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBgQXJyYXlCdWZmZXJgIHJlc3VsdCBmcm9tIGBCbG9iYCBvciBgRmlsZWAuXG4gKiBAamEgYEJsb2JgIOOBvuOBn+OBryBgRmlsZWAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzQXJyYXlCdWZmZXIoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzQXJyYXlCdWZmZXInLCBbYmxvYl0sIHsgLi4ub3B0aW9ucyB9KTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBkYXRhLVVSTCBzdHJpbmcgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCiSBgZGF0YS11cmwg5paH5a2X5YiX44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgc3BlY2lmaWVkIHJlYWRpbmcgdGFyZ2V0IG9iamVjdC5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK5a++6LGh44Gu44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCByZWFkaW5nIG9wdGlvbnMuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZEFzRGF0YVVSTChibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gZXhlYygncmVhZEFzRGF0YVVSTCcsIFtibG9iXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHRleHQgY29udGVudCBzdHJpbmcgZnJvbSBgQmxvYmAgb3IgYEZpbGVgLlxuICogQGphIGBCbG9iYCDjgb7jgZ/jga8gYEZpbGVgIOOBi+OCieODhuOCreOCueODiOaWh+Wtl+WIl+OCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBibG9iXG4gKiAgLSBgZW5gIHNwZWNpZmllZCByZWFkaW5nIHRhcmdldCBvYmplY3QuXG4gKiAgLSBgamFgIOiqreOBv+WPluOCiuWvvuixoeOBruOCquODluOCuOOCp+OCr+ODiOOCkuaMh+WumlxuICogQHBhcmFtIGVuY29kaW5nXG4gKiAgLSBgZW5gIGVuY29kaW5nIHN0cmluZyB0byB1c2UgZm9yIHRoZSByZXR1cm5lZCBkYXRhLiBkZWZhdWx0OiBgdXRmLThgXG4gKiAgLSBgamFgIOOCqOODs+OCs+ODvOODh+OCo+ODs+OCsOOCkuaMh+WumuOBmeOCi+aWh+Wtl+WIlyDml6Llrpo6IGB1dGYtOGBcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHJlYWRpbmcgb3B0aW9ucy5cbiAqICAtIGBqYWAg6Kqt44G/5Y+W44KK44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQXNUZXh0KGJsb2I6IEJsb2IsIGVuY29kaW5nPzogc3RyaW5nIHwgbnVsbCwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIGV4ZWMoJ3JlYWRBc1RleHQnLCBbYmxvYiwgZW5jb2RpbmcgPz8gdW5kZWZpbmVkXSwgeyAuLi5vcHRpb25zIH0pO1xufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIEtleXMsXG4gICAgdHlwZSBUeXBlcyxcbiAgICB0eXBlIFR5cGVUb0tleSxcbiAgICB0b1R5cGVkRGF0YSxcbiAgICBmcm9tVHlwZWREYXRhLFxuICAgIHJlc3RvcmVOdWxsaXNoLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEJhc2U2NCB9IGZyb20gJy4vYmFzZTY0JztcbmltcG9ydCB7XG4gICAgdHlwZSBCbG9iUmVhZE9wdGlvbnMsXG4gICAgcmVhZEFzQXJyYXlCdWZmZXIsXG4gICAgcmVhZEFzRGF0YVVSTCxcbiAgICByZWFkQXNUZXh0LFxufSBmcm9tICcuL2Jsb2ItcmVhZGVyJztcbmltcG9ydCB7IEJsb2IgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gTWltZVR5cGUge1xuICAgIEJJTkFSWSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nLFxuICAgIFRFWFQgPSAndGV4dC9wbGFpbicsXG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsIGRhdGEtVVJMIOWxnuaApyAqL1xuaW50ZXJmYWNlIERhdGFVUkxDb250ZXh0IHtcbiAgICBtaW1lVHlwZTogc3RyaW5nO1xuICAgIGJhc2U2NDogYm9vbGVhbjtcbiAgICBkYXRhOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBkYXRhIFVSSSDlvaLlvI/jga7mraPopo/ooajnj75cbiAqIOWPguiAgzogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9kYXRhX1VSSXNcbiAqL1xuZnVuY3Rpb24gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMOiBzdHJpbmcpOiBEYXRhVVJMQ29udGV4dCB7XG4gICAgY29uc3QgY29udGV4dCA9IHsgYmFzZTY0OiBmYWxzZSB9IGFzIERhdGFVUkxDb250ZXh0O1xuXG4gICAgLyoqXG4gICAgICogW21hdGNoXSAxOiBtaW1lLXR5cGVcbiAgICAgKiAgICAgICAgIDI6IFwiO2Jhc2U2NFwiIOOCkuWQq+OCgOOCquODl+OCt+ODp+ODs1xuICAgICAqICAgICAgICAgMzogZGF0YSDmnKzkvZNcbiAgICAgKi9cbiAgICBjb25zdCByZXN1bHQgPSAvXmRhdGE6KC4rP1xcLy4rPyk/KDsuKz8pPywoLiopJC8uZXhlYyhkYXRhVVJMKTtcbiAgICBpZiAobnVsbCA9PSByZXN1bHQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGRhdGEtVVJMOiAke2RhdGFVUkx9YCk7XG4gICAgfVxuXG4gICAgY29udGV4dC5taW1lVHlwZSA9IHJlc3VsdFsxXTtcbiAgICBjb250ZXh0LmJhc2U2NCA9IC87YmFzZTY0Ly50ZXN0KHJlc3VsdFsyXSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3ByZWZlci1pbmNsdWRlc1xuICAgIGNvbnRleHQuZGF0YSA9IHJlc3VsdFszXTtcblxuICAgIHJldHVybiBjb250ZXh0O1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqIEBpbnRlcm5hbCBoZWxwZXIgKi9cbmZ1bmN0aW9uIGJpbmFyeVN0cmluZ1RvQmluYXJ5KGJ5dGVzOiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICBjb25zdCBhcnJheSA9IGJ5dGVzLnNwbGl0KCcnKS5tYXAoYyA9PiBjLmNoYXJDb2RlQXQoMCkpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShhcnJheSk7XG59XG5cbi8qKiBAaW50ZXJuYWwgaGVscGVyICovXG5mdW5jdGlvbiBiaW5hcnlUb0JpbmFyeVN0cmluZyhiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwoYmluYXJ5LCAoaTogbnVtYmVyKSA9PiBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpKS5qb2luKCcnKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgdG8gYmluYXJ5LXN0cmluZy4gKG5vdCBodW1hbiByZWFkYWJsZSBzdHJpbmcpXG4gKiBAamEg44OQ44Kk44OK44Oq5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvQmluYXJ5U3RyaW5nKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudCh0ZXh0KSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgc3RyaW5nIGZyb20gYmluYXJ5LXN0cmluZy5cbiAqIEBqYSDjg5DjgqTjg4rjg6rmloflrZfliJfjgYvjgonlpInmj5tcbiAqXG4gKiBAcGFyYW0gYnl0ZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21CaW5hcnlTdHJpbmcoYnl0ZXM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYnl0ZXMpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBiaW5hcnkgdG8gaGV4LXN0cmluZy5cbiAqIEBqYSDjg5DjgqTjg4rjg6rjgpIgSEVYIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBoZXhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21IZXhTdHJpbmcoaGV4OiBzdHJpbmcpOiBVaW50OEFycmF5IHtcbiAgICBjb25zdCB4ID0gaGV4Lm1hdGNoKC8uezEsMn0vZyk7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG51bGwgIT0geCA/IHgubWFwKGJ5dGUgPT4gcGFyc2VJbnQoYnl0ZSwgMTYpKSA6IFtdKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBzdHJpbmcgZnJvbSBoZXgtc3RyaW5nLlxuICogQGphIEhFWCDmloflrZfliJfjgYvjgonjg5DjgqTjg4rjg6rjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0hleFN0cmluZyhiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnkucmVkdWNlKChzdHIsIGJ5dGUpID0+IHN0ciArIGJ5dGUudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkucGFkU3RhcnQoMiwgJzAnKSwgJycpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9CdWZmZXIoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgICByZXR1cm4gcmVhZEFzQXJyYXlCdWZmZXIoYmxvYiwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSBgQmxvYmAg44GL44KJIGBVaW50OEFycmF5YCDjgbjlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmxvYlxuICogIC0gYGVuYCBgQmxvYmAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYEJsb2JgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG9wdGlvbnNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJsb2JUb0JpbmFyeShibG9iOiBCbG9iLCBvcHRpb25zPzogQmxvYlJlYWRPcHRpb25zKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGF3YWl0IHJlYWRBc0FycmF5QnVmZmVyKGJsb2IsIG9wdGlvbnMpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgQmxvYmAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBCbG9iYCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9EYXRhVVJMKGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHJldHVybiByZWFkQXNEYXRhVVJMKGJsb2IsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBCbG9iYCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgQmxvYmAg44GL44KJ44OG44Kt44K544OI44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBibG9iVG9UZXh0KGJsb2I6IEJsb2IsIG9wdGlvbnM/OiBCbG9iUmVhZE9wdGlvbnMgJiB7IGVuY29kaW5nPzogc3RyaW5nIHwgbnVsbDsgfSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3Qgb3B0cyA9IG9wdGlvbnMgPz8ge307XG4gICAgY29uc3QgeyBlbmNvZGluZyB9ID0gb3B0cztcbiAgICByZXR1cm4gcmVhZEFzVGV4dChibG9iLCBlbmNvZGluZywgb3B0cyk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEJsb2JgIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgYEJsb2JgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44G45aSJ5o+bXG4gKlxuICogQHBhcmFtIGJsb2JcbiAqICAtIGBlbmAgYEJsb2JgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBCbG9iYCDjgqTjg7Pjgrnjgr/jg7PjgrnjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBibG9iVG9CYXNlNjQoYmxvYjogQmxvYiwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHF1ZXJ5RGF0YVVSTENvbnRleHQoYXdhaXQgcmVhZEFzRGF0YVVSTChibG9iLCBvcHRpb25zKSkuZGF0YTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBgQmxvYmAuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CbG9iKGJ1ZmZlcjogQXJyYXlCdWZmZXIsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW2J1ZmZlcl0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byBgVWludDhBcnJheWAuXG4gKiBAamEgYEFycmF5QnVmZmVyYCDjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9CaW5hcnkoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IFVpbnQ4QXJyYXkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBBcnJheUJ1ZmZlcmAg44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9EYXRhVVJMKGJ1ZmZlcjogQXJyYXlCdWZmZXIsIG1pbWVUeXBlOiBzdHJpbmcgPSBNaW1lVHlwZS5CSU5BUlkpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb0RhdGFVUkwobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSwgbWltZVR5cGUpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBBcnJheUJ1ZmZlcmAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCiSBCYXNlNjQg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJ1ZmZlclxuICogIC0gYGVuYCBgQXJyYXlCdWZmZXJgIGluc3RhbmNlXG4gKiAgLSBgamFgIGBBcnJheUJ1ZmZlcmAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWZmZXJUb0Jhc2U2NChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYmluYXJ5VG9CYXNlNjQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgYEFycmF5QnVmZmVyYCB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSBgQXJyYXlCdWZmZXJgIOOBi+OCieODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBidWZmZXJcbiAqICAtIGBlbmAgYEFycmF5QnVmZmVyYCBpbnN0YW5jZVxuICogIC0gYGphYCBgQXJyYXlCdWZmZXJgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVmZmVyVG9UZXh0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICAgIHJldHVybiBiaW5hcnlUb1RleHQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IGBVaW50OEFycmF5YCB0byBgQmxvYmAuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CbG9iKGJpbmFyeTogVWludDhBcnJheSwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IEJsb2Ige1xuICAgIHJldHVybiBuZXcgQmxvYihbYmluYXJ5IGFzIFVpbnQ4QXJyYXk8QXJyYXlCdWZmZXI+XSwgeyB0eXBlOiBtaW1lVHlwZSB9KTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gYEFycmF5QnVmZmVyYC5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9CdWZmZXIoYmluYXJ5OiBVaW50OEFycmF5KTogQXJyYXlCdWZmZXJMaWtlIHtcbiAgICByZXR1cm4gYmluYXJ5LmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIGBVaW50OEFycmF5YCDjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJpbmFyeVxuICogIC0gYGVuYCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAqICAtIGBqYWAgYFVpbnQ4QXJyYXlgIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumlxuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmluYXJ5VG9EYXRhVVJMKGJpbmFyeTogVWludDhBcnJheSwgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLkJJTkFSWSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBkYXRhOiR7bWltZVR5cGV9O2Jhc2U2NCwke2JpbmFyeVRvQmFzZTY0KGJpbmFyeSl9YDtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSBgVWludDhBcnJheWAg44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb0Jhc2U2NChiaW5hcnk6IFVpbnQ4QXJyYXkpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKGJpbmFyeVRvVGV4dChiaW5hcnkpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBgVWludDhBcnJheWAgdG8gdGV4dCBzdHJpbmcuXG4gKiBAamEgYFVpbnQ4QXJyYXlgIOOBi+OCiSDjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmluYXJ5XG4gKiAgLSBgZW5gIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICogIC0gYGphYCBgVWludDhBcnJheWAg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiaW5hcnlUb1RleHQoYmluYXJ5OiBVaW50OEFycmF5KTogc3RyaW5nIHtcbiAgICByZXR1cm4gZnJvbUJpbmFyeVN0cmluZyhiaW5hcnlUb0JpbmFyeVN0cmluZyhiaW5hcnkpKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgQmxvYmAuXG4gKiBAamEgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSBgQmxvYmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9CbG9iKGJhc2U2NDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogQmxvYiB7XG4gICAgcmV0dXJuIGJpbmFyeVRvQmxvYihiYXNlNjRUb0JpbmFyeShiYXNlNjQpLCBtaW1lVHlwZSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byBgQXJyYXlCdWZmZXJgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYEFycmF5QnVmZmVyYCDjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb0J1ZmZlcihiYXNlNjQ6IHN0cmluZyk6IEFycmF5QnVmZmVyTGlrZSB7XG4gICAgcmV0dXJuIGJhc2U2NFRvQmluYXJ5KGJhc2U2NCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBiYXNlNjRcbiAqICAtIGBlbmAgQmFzZTY0IHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIEJhc2U2NCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhc2U2NFRvQmluYXJ5KGJhc2U2NDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJpbmFyeVN0cmluZ1RvQmluYXJ5KHRvQmluYXJ5U3RyaW5nKEJhc2U2NC5kZWNvZGUoYmFzZTY0KSkpO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IEJhc2U2NCBzdHJpbmcgdG8gZGF0YS1VUkwgc3RyaW5nLlxuICogQGphIEJhc2U2NCDmloflrZfliJfjgYvjgokgZGF0YS1VUkwg5paH5a2X5YiX44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGJhc2U2NFxuICogIC0gYGVuYCBCYXNlNjQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgQmFzZTY0IOaWh+Wtl+WIl1xuICogQHBhcmFtIG1pbWVUeXBlXG4gKiAgLSBgZW5gIG1pbWUtdHlwZSBzdHJpbmdcbiAqICAtIGBqYWAgbWltZS10eXBlIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0VG9EYXRhVVJMKGJhc2U2NDogc3RyaW5nLCBtaW1lVHlwZTogc3RyaW5nID0gTWltZVR5cGUuQklOQVJZKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgQmFzZTY0IHN0cmluZyB0byB0ZXh0IHN0cmluZy5cbiAqIEBqYSAgQmFzZTY0IOaWh+Wtl+WIl+OBi+OCiSDjg4bjgq3jgrnjg4jjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gYmFzZTY0XG4gKiAgLSBgZW5gIEJhc2U2NCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBCYXNlNjQg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlNjRUb1RleHQoYmFzZTY0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKGJhc2U2NCk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CbG9iKHRleHQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLlRFWFQpOiBCbG9iIHtcbiAgICByZXR1cm4gbmV3IEJsb2IoW3RleHRdLCB7IHR5cGU6IG1pbWVUeXBlIH0pO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIHRleHRcbiAqICAtIGBlbmAgdGV4dCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCDjg4bjgq3jgrnjg4jmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRUb0J1ZmZlcih0ZXh0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlckxpa2Uge1xuICAgIHJldHVybiB0ZXh0VG9CaW5hcnkodGV4dCkuYnVmZmVyO1xufVxuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRleHQgc3RyaW5nIHRvIGBVaW50OEFycmF5YC5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgYFVpbnQ4QXJyYXlgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CaW5hcnkodGV4dDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJpbmFyeVN0cmluZ1RvQmluYXJ5KHRvQmluYXJ5U3RyaW5nKHRleHQpKTtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCB0ZXh0IHN0cmluZyB0byBkYXRhLVVSTCBzdHJpbmcuXG4gKiBAamEg44OG44Kt44K544OI44GL44KJIGRhdGEtVVJMIOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKiBAcGFyYW0gbWltZVR5cGVcbiAqICAtIGBlbmAgbWltZS10eXBlIHN0cmluZ1xuICogIC0gYGphYCBtaW1lLXR5cGUg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9EYXRhVVJMKHRleHQ6IHN0cmluZywgbWltZVR5cGU6IHN0cmluZyA9IE1pbWVUeXBlLlRFWFQpOiBzdHJpbmcge1xuICAgIGNvbnN0IGJhc2U2NCA9IHRleHRUb0Jhc2U2NCh0ZXh0KTtcbiAgICByZXR1cm4gYGRhdGE6JHttaW1lVHlwZX07YmFzZTY0LCR7YmFzZTY0fWA7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgdGV4dCBzdHJpbmcgdG8gQmFzZTY0IHN0cmluZy5cbiAqIEBqYSDjg4bjgq3jgrnjg4jjgYvjgokgQmFzZTY0IOaWh+Wtl+WIl+OBq+WkieaPm1xuICpcbiAqIEBwYXJhbSB0ZXh0XG4gKiAgLSBgZW5gIHRleHQgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAg44OG44Kt44K544OI5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0ZXh0VG9CYXNlNjQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQmFzZTY0LmVuY29kZSh0ZXh0KTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBCbG9iYC5cbiAqIEBqYSBkYXRhLVVSTCDmloflrZfliJfjgYvjgokgYEJsb2JgIOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvQmxvYihkYXRhVVJMOiBzdHJpbmcpOiBCbG9iIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcXVlcnlEYXRhVVJMQ29udGV4dChkYXRhVVJMKTtcbiAgICBpZiAoY29udGV4dC5iYXNlNjQpIHtcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQmxvYihjb250ZXh0LmRhdGEsIGNvbnRleHQubWltZVR5cGUgfHwgTWltZVR5cGUuQklOQVJZKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGV4dFRvQmxvYihkZWNvZGVVUklDb21wb25lbnQoY29udGV4dC5kYXRhKSwgY29udGV4dC5taW1lVHlwZSB8fCBNaW1lVHlwZS5URVhUKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIGBBcnJheUJ1ZmZlcmAuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIGBBcnJheUJ1ZmZlcmAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CdWZmZXIoZGF0YVVSTDogc3RyaW5nKTogQXJyYXlCdWZmZXJMaWtlIHtcbiAgICByZXR1cm4gZGF0YVVSTFRvQmluYXJ5KGRhdGFVUkwpLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiBAZW4gQ29udmVydCBkYXRhLVVSTCBzdHJpbmcgdG8gYFVpbnQ4QXJyYXlgLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCiSBgVWludDhBcnJheWAg44Gr5aSJ5o+bXG4gKlxuICogQHBhcmFtIGRhdGFVUkxcbiAqICAtIGBlbmAgZGF0YS1VUkwgc3RyaW5nIGRhdGFcbiAqICAtIGBqYWAgZGF0YS1VUkwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXRhVVJMVG9CaW5hcnkoZGF0YVVSTDogc3RyaW5nKTogVWludDhBcnJheSB7XG4gICAgcmV0dXJuIGJhc2U2NFRvQmluYXJ5KGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIHRleHQgc3RyaW5nLlxuICogQGphIGRhdGEtVVJMIOaWh+Wtl+WIl+OBi+OCieODhuOCreOCueODiOOBq+WkieaPm1xuICpcbiAqIEBwYXJhbSBkYXRhVVJMXG4gKiAgLSBgZW5gIGRhdGEtVVJMIHN0cmluZyBkYXRhXG4gKiAgLSBgamFgIGRhdGEtVVJMIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGF0YVVSTFRvVGV4dChkYXRhVVJMOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBCYXNlNjQuZGVjb2RlKGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMKSk7XG59XG5cbi8qKlxuICogQGVuIENvbnZlcnQgZGF0YS1VUkwgc3RyaW5nIHRvIEJhc2U2NCBzdHJpbmcuXG4gKiBAamEgZGF0YS1VUkwg5paH5a2X5YiX44GL44KJIEJhc2U2NCDmloflrZfliJfjgavlpInmj5tcbiAqXG4gKiBAcGFyYW0gZGF0YVVSTFxuICogIC0gYGVuYCBkYXRhLVVSTCBzdHJpbmcgZGF0YVxuICogIC0gYGphYCBkYXRhLVVSTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRhdGFVUkxUb0Jhc2U2NChkYXRhVVJMOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IGNvbnRleHQgPSBxdWVyeURhdGFVUkxDb250ZXh0KGRhdGFVUkwpO1xuICAgIGlmIChjb250ZXh0LmJhc2U2NCkge1xuICAgICAgICByZXR1cm4gY29udGV4dC5kYXRhO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBCYXNlNjQuZW5jb2RlKGRlY29kZVVSSUNvbXBvbmVudChjb250ZXh0LmRhdGEpKTtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBTZXJpYWxpemFibGUgZGF0YSB0eXBlIGxpc3QuXG4gKiBAamEg44K344Oq44Ki44Op44Kk44K65Y+v6IO944Gq44OH44O844K/5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VyaWFsaXphYmxlIHtcbiAgICBzdHJpbmc6IHN0cmluZztcbiAgICBudW1iZXI6IG51bWJlcjtcbiAgICBib29sZWFuOiBib29sZWFuO1xuICAgIG9iamVjdDogb2JqZWN0O1xuICAgIGJ1ZmZlcjogQXJyYXlCdWZmZXI7XG4gICAgYmluYXJ5OiBVaW50OEFycmF5O1xuICAgIGJsb2I6IEJsb2I7XG59XG5cbmV4cG9ydCB0eXBlIFNlcmlhbGl6YWJsZURhdGFUeXBlcyA9IFR5cGVzPFNlcmlhbGl6YWJsZT47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVJbnB1dERhdGFUeXBlcyA9IFNlcmlhbGl6YWJsZURhdGFUeXBlcyB8IG51bGwgfCB1bmRlZmluZWQ7XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVLZXlzID0gS2V5czxTZXJpYWxpemFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlQ2FzdGFibGUgPSBPbWl0PFNlcmlhbGl6YWJsZSwgJ2J1ZmZlcicgfCAnYmluYXJ5JyB8ICdibG9iJz47XG5leHBvcnQgdHlwZSBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzID0gVHlwZXM8U2VyaWFsaXphYmxlQ2FzdGFibGU+O1xuZXhwb3J0IHR5cGUgU2VyaWFsaXphYmxlUmV0dXJuVHlwZTxUIGV4dGVuZHMgU2VyaWFsaXphYmxlQ2FzdGFibGVUeXBlcz4gPSBUeXBlVG9LZXk8U2VyaWFsaXphYmxlQ2FzdGFibGUsIFQ+IGV4dGVuZHMgbmV2ZXIgPyBuZXZlciA6IFQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6YWJsZSBvcHRpb25zIGludGVyZmFjZS5cbiAqIEBqYSDjg4fjgrfjg6rjgqLjg6njgqTjgrrjgavkvb/nlKjjgZnjgovjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZXNlcmlhbGl6ZU9wdGlvbnM8VCBleHRlbmRzIFNlcmlhbGl6YWJsZSA9IFNlcmlhbGl6YWJsZSwgSyBleHRlbmRzIEtleXM8VD4gPSBLZXlzPFQ+PiBleHRlbmRzIENhbmNlbGFibGUge1xuICAgIC8qKiB7QGxpbmsgU2VyaWFsaXphYmxlS2V5c30gKi9cbiAgICBkYXRhVHlwZT86IEs7XG59XG5cbi8qKlxuICogQGVuIFNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OCt+ODquOCouODqeOCpOOCulxuICpcbiAqIEBwYXJhbSBkYXRhIGlucHV0XG4gKiBAcGFyYW0gb3B0aW9ucyBibG9iIGNvbnZlcnQgb3B0aW9uc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2VyaWFsaXplPFQgZXh0ZW5kcyBTZXJpYWxpemFibGVJbnB1dERhdGFUeXBlcz4oZGF0YTogVCwgb3B0aW9ucz86IEJsb2JSZWFkT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgeyBjYW5jZWwgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgYXdhaXQgY2MoY2FuY2VsKTtcbiAgICBpZiAobnVsbCA9PSBkYXRhKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlclRvRGF0YVVSTChkYXRhKTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBVaW50OEFycmF5KSB7XG4gICAgICAgIHJldHVybiBiaW5hcnlUb0RhdGFVUkwoZGF0YSk7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgICByZXR1cm4gYmxvYlRvRGF0YVVSTChkYXRhLCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZnJvbVR5cGVkRGF0YShkYXRhKSE7XG4gICAgfVxufVxuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OBruW+qeWFg1xuICpcbiAqIEBwYXJhbSB2YWx1ZSBpbnB1dCBzdHJpbmcgb3IgdW5kZWZpbmVkLlxuICogQHBhcmFtIG9wdGlvbnMgZGVzZXJpYWxpemUgb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUNhc3RhYmxlVHlwZXMgPSBTZXJpYWxpemFibGVDYXN0YWJsZVR5cGVzPihcbiAgICB2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRpb25zPzogRGVzZXJpYWxpemVPcHRpb25zPFNlcmlhbGl6YWJsZSwgbmV2ZXI+XG4pOiBQcm9taXNlPFNlcmlhbGl6YWJsZVJldHVyblR5cGU8VD4+O1xuXG4vKipcbiAqIEBlbiBEZXNlcmlhbGl6ZSBkYXRhLlxuICogQGphIOODh+ODvOOCv+OBruW+qeWFg1xuICpcbiAqIEBwYXJhbSB2YWx1ZSBpbnB1dCBzdHJpbmcgb3IgdW5kZWZpbmVkLlxuICogQHBhcmFtIG9wdGlvbnMgZGVzZXJpYWxpemUgb3B0aW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVzZXJpYWxpemU8VCBleHRlbmRzIFNlcmlhbGl6YWJsZUtleXM+KHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM6IERlc2VyaWFsaXplT3B0aW9uczxTZXJpYWxpemFibGUsIFQ+KTogUHJvbWlzZTxTZXJpYWxpemFibGVbVF0gfCBudWxsIHwgdW5kZWZpbmVkPjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlc2VyaWFsaXplKHZhbHVlOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM/OiBEZXNlcmlhbGl6ZU9wdGlvbnMpOiBQcm9taXNlPFNlcmlhbGl6YWJsZURhdGFUeXBlcyB8IG51bGwgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCB7IGRhdGFUeXBlLCBjYW5jZWwgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgYXdhaXQgY2MoY2FuY2VsKTtcblxuICAgIGNvbnN0IGRhdGEgPSByZXN0b3JlTnVsbGlzaCh0b1R5cGVkRGF0YSh2YWx1ZSkpO1xuICAgIHN3aXRjaCAoZGF0YVR5cGUpIHtcbiAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKGRhdGEpO1xuICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgcmV0dXJuIE51bWJlcihkYXRhKTtcbiAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICByZXR1cm4gQm9vbGVhbihkYXRhKTtcbiAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QoZGF0YSk7XG4gICAgICAgIGNhc2UgJ2J1ZmZlcic6XG4gICAgICAgICAgICByZXR1cm4gZGF0YVVSTFRvQnVmZmVyKGZyb21UeXBlZERhdGEoZGF0YSkhKTtcbiAgICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CaW5hcnkoZnJvbVR5cGVkRGF0YShkYXRhKSEpO1xuICAgICAgICBjYXNlICdibG9iJzpcbiAgICAgICAgICAgIHJldHVybiBkYXRhVVJMVG9CbG9iKGZyb21UeXBlZERhdGEoZGF0YSkhKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFVSTCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfYmxvYk1hcCA9IG5ldyBXZWFrTWFwPEJsb2IsIHN0cmluZz4oKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX3VybFNldCAgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuLyoqXG4gKiBAZW4gYEJsb2IgVVJMYCB1dGlsaXR5IGZvciBhdXRvbWF0aWMgbWVtb3J5IG1hbmVnZW1lbnQuXG4gKiBAamEg44Oh44Oi44Oq6Ieq5YuV566h55CG44KS6KGM44GGIGBCbG9iIFVSTGAg44Om44O844OG44Kj44Oq44OG44KjXG4gKi9cbmV4cG9ydCBjbGFzcyBCbG9iVVJMIHtcbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZXMuXG4gICAgICogQGphIOOCpOODs+OCueOCv+ODs+OCueOCkuaMh+WumuOBl+OBpiBgQmxvYiBVUkxgIOOBruani+eviVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY3JlYXRlKC4uLmJsb2JzOiBCbG9iW10pOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIGJsb2JzKSB7XG4gICAgICAgICAgICBjb25zdCBjYWNoZSA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmIChjYWNoZSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChiKTtcbiAgICAgICAgICAgIF9ibG9iTWFwLnNldChiLCB1cmwpO1xuICAgICAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgYEJsb2IgVVJMYCBjYWNoZS5cbiAgICAgKiBAamEg44GZ44G544Gm44GuIGBCbG9iIFVSTGAg44Kt44Oj44OD44K344Ol44KS56C05qOEXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjbGVhcigpOiB2b2lkIHtcbiAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgX3VybFNldCkge1xuICAgICAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICB9XG4gICAgICAgIF91cmxTZXQuY2xlYXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGBCbG9iIFVSTGAgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44Gu5Y+W5b6XXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZXQoYmxvYjogQmxvYik6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNhY2hlID0gX2Jsb2JNYXAuZ2V0KGJsb2IpO1xuICAgICAgICBpZiAoY2FjaGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICBfYmxvYk1hcC5zZXQoYmxvYiwgdXJsKTtcbiAgICAgICAgX3VybFNldC5hZGQodXJsKTtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2hlY2sgYEJsb2IgVVJMYCBpcyBhdmFpbGFibGUgZnJvbSBpbnN0YW5jZS5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44GM5pyJ5Yq55YyW5Yik5a6aXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBoYXMoYmxvYjogQmxvYik6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gX2Jsb2JNYXAuaGFzKGJsb2IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXZva2UgYEJsb2IgVVJMYCBmcm9tIGluc3RhbmNlcy5cbiAgICAgKiBAamEg44Kk44Oz44K544K/44Oz44K544KS5oyH5a6a44GX44GmIGBCbG9iIFVSTGAg44KS54Sh5Yq55YyWXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyByZXZva2UoLi4uYmxvYnM6IEJsb2JbXSk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IGIgb2YgYmxvYnMpIHtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IF9ibG9iTWFwLmdldChiKTtcbiAgICAgICAgICAgIGlmICh1cmwpIHtcbiAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgICAgICAgICAgX2Jsb2JNYXAuZGVsZXRlKGIpO1xuICAgICAgICAgICAgICAgIF91cmxTZXQuZGVsZXRlKHVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG4iXSwibmFtZXMiOlsiY2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBRUEsaUJBQXdCLE1BQU0sSUFBSSxHQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO0FBQ2pFLGlCQUF3QixNQUFNLElBQUksR0FBVSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztBQUNqRSxpQkFBd0IsTUFBTSxJQUFJLEdBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7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R0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLEtBQUssRUFBRTtnQkFDUDtZQUNKO1lBQ0EsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7QUFDbEMsWUFBQSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7QUFDcEIsWUFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUNwQjtJQUNKO0FBRUE7OztBQUdHO0FBQ0ksSUFBQSxPQUFPLEtBQUssR0FBQTtBQUNmLFFBQUEsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUU7QUFDdkIsWUFBQSxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQztRQUM1QjtRQUNBLE9BQU8sQ0FBQyxLQUFLLEVBQUU7SUFDbkI7QUFFQTs7O0FBR0c7SUFDSSxPQUFPLEdBQUcsQ0FBQyxJQUFVLEVBQUE7UUFDeEIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDaEMsSUFBSSxLQUFLLEVBQUU7QUFDUCxZQUFBLE9BQU8sS0FBSztRQUNoQjtRQUNBLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO0FBQ3JDLFFBQUEsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDO0FBQ3ZCLFFBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7QUFDaEIsUUFBQSxPQUFPLEdBQUc7SUFDZDtBQUVBOzs7QUFHRztJQUNJLE9BQU8sR0FBRyxDQUFDLElBQVUsRUFBQTtBQUN4QixRQUFBLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFDN0I7QUFFQTs7O0FBR0c7QUFDSSxJQUFBLE9BQU8sTUFBTSxDQUFDLEdBQUcsS0FBYSxFQUFBO0FBQ2pDLFFBQUEsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUU7WUFDbkIsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0IsSUFBSSxHQUFHLEVBQUU7QUFDTCxnQkFBQSxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQztBQUN4QixnQkFBQSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNsQixnQkFBQSxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUN2QjtRQUNKO0lBQ0o7QUFDSDs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvYmluYXJ5LyJ9