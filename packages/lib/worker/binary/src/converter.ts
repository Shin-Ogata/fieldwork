import { Base64 } from './base64';
import {
    BlobReadOptions,
    readAsArrayBuffer,
    readAsDataURL,
    readAsText,
} from './blob-reader';
import { Blob } from './ssr';

/** @internal */
const enum MimeType {
    BINARY = 'application/octet-stream',
    TEXT = 'text/plain',
}

/** @internal */
interface DataURLContext {
    mimeType: string;
    base64: boolean;
    data: string;
}

/**
 * data URI 形式の正規表現
 * 参考: https://developer.mozilla.org/ja/docs/data_URIs
 */
function queryDataURLContext(dataURL: string): DataURLContext {
    /**
     * [match] 1: mime-type
     *         2: ";base64" を含むオプション
     *         3: data 本体
     */
    const reDataURL = /^data:(.+?\/.+?)?(;.+?)?,(.*)$/;
    const result = reDataURL.exec(dataURL);

    const component = { base64: false } as DataURLContext;
    if (null == result) {
        throw new Error(`Invalid data-URL: ${dataURL}`);
    }

    component.mimeType = result[1];
    component.base64 = /;base64/.test(result[2]); // eslint-disable-line @typescript-eslint/prefer-includes
    component.data = result[3];

    return component;
}

//__________________________________________________________________________________________________//

/** helper */
function binaryStringToBinary(bytes: string): Uint8Array {
    const array = bytes.split('').map(c => c.charCodeAt(0));
    return new Uint8Array(array);
}

/** helper */
function binaryToBinaryString(binary: Uint8Array): string {
    return Array.prototype.map.call(binary, (i: number) => String.fromCharCode(i)).join('');
}

/**
 * @en Convert string to binary-string. (not human readable string)
 * @ja バイナリ文字列に変換
 *
 * @param text
 */
export function toBinaryString(text: string): string {
    return unescape(encodeURIComponent(text));
}

/**
 * @en Convert string from binary-string.
 * @ja バイナリ文字列から変換
 *
 * @param bytes
 */
export function fromBinaryString(bytes: string): string {
    return decodeURIComponent(escape(bytes));
}

/**
 * @en Convert binary to hex-string.
 * @ja バイナリを HEX 文字列に変換
 *
 * @param hex
 */
export function fromHexString(hex: string): Uint8Array {
    const x = hex.match(/.{1,2}/g);
    return new Uint8Array(null != x ? x.map(byte => parseInt(byte, 16)) : []);
}

/**
 * @en Convert string from hex-string.
 * @ja HEX 文字列からバイナリに変換
 *
 * @param binary
 */
export function toHexString(binary: Uint8Array): string {
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
export function blobToBuffer(blob: Blob, options?: BlobReadOptions): Promise<ArrayBuffer> {
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
export async function blobToBinary(blob: Blob, options?: BlobReadOptions): Promise<Uint8Array> {
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
export function blobToDataURL(blob: Blob, options?: BlobReadOptions): Promise<string> {
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
export function blobToText(blob: Blob, options?: BlobReadOptions & { encoding?: string | null; }): Promise<string> {
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
export async function blobToBase64(blob: Blob, options?: BlobReadOptions): Promise<string> {
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
export function bufferToBlob(buffer: ArrayBuffer, mimeType: string = MimeType.BINARY): Blob {
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
export function bufferToBinary(buffer: ArrayBuffer): Uint8Array {
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
export function bufferToDataURL(buffer: ArrayBuffer, mimeType: string = MimeType.BINARY): string {
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
export function bufferToBase64(buffer: ArrayBuffer): string {
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
export function bufferToText(buffer: ArrayBuffer): string {
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
export function binaryToBlob(binary: Uint8Array, mimeType: string = MimeType.BINARY): Blob {
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
export function binaryToBuffer(binary: Uint8Array): ArrayBuffer {
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
export function binaryToDataURL(binary: Uint8Array, mimeType: string = MimeType.BINARY): string {
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
export function binaryToBase64(binary: Uint8Array): string {
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
export function binaryToText(binary: Uint8Array): string {
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
export function base64ToBlob(base64: string, mimeType: string = MimeType.BINARY): Blob {
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
export function base64ToBuffer(base64: string): ArrayBuffer {
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
export function base64ToBinary(base64: string): Uint8Array {
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
export function base64ToDataURL(base64: string, mimeType: string = MimeType.BINARY): string {
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
export function base64ToText(base64: string): string {
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
export function textToBlob(text: string, mimeType: string = MimeType.TEXT): Blob {
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
export function textToBuffer(text: string): ArrayBuffer {
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
export function textToBinary(text: string): Uint8Array {
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
export function textToDataURL(text: string, mimeType: string = MimeType.TEXT): string {
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
export function textToBase64(text: string): string {
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
export function dataURLToBlob(dataURL: string): Blob {
    const context = queryDataURLContext(dataURL);
    if (context.base64) {
        return base64ToBlob(context.data, context.mimeType || MimeType.BINARY);
    } else {
        return textToBlob(decodeURIComponent(context.data), context.mimeType || MimeType.TEXT);
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
export function dataURLToBuffer(dataURL: string): ArrayBuffer {
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
export function dataURLToBinary(dataURL: string): Uint8Array {
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
export function dataURLToText(dataURL: string): string {
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
export function dataURLToBase64(dataURL: string): string {
    const context = queryDataURLContext(dataURL);
    if (context.base64) {
        return context.data;
    } else {
        return Base64.encode(decodeURIComponent(context.data));
    }
}
