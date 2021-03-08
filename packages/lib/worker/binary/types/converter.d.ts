import { Keys, Types, TypeToKey } from '@cdp/core-utils';
import { Cancelable } from '@cdp/promise';
import { BlobReadOptions } from './blob-reader';
/**
 * @en Convert string to binary-string. (not human readable string)
 * @ja バイナリ文字列に変換
 *
 * @param text
 */
export declare function toBinaryString(text: string): string;
/**
 * @en Convert string from binary-string.
 * @ja バイナリ文字列から変換
 *
 * @param bytes
 */
export declare function fromBinaryString(bytes: string): string;
/**
 * @en Convert binary to hex-string.
 * @ja バイナリを HEX 文字列に変換
 *
 * @param hex
 */
export declare function fromHexString(hex: string): Uint8Array;
/**
 * @en Convert string from hex-string.
 * @ja HEX 文字列からバイナリに変換
 *
 * @param binary
 */
export declare function toHexString(binary: Uint8Array): string;
/**
 * @en Convert `Blob` to `ArrayBuffer`.
 * @ja `Blob` から `ArrayBuffer` へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToBuffer(blob: Blob, options?: BlobReadOptions): Promise<ArrayBuffer>;
/**
 * @en Convert `Blob` to `Uint8Array`.
 * @ja `Blob` から `Uint8Array` へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToBinary(blob: Blob, options?: BlobReadOptions): Promise<Uint8Array>;
/**
 * @en Convert `Blob` to data-URL string.
 * @ja `Blob` から data-URL 文字列へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToDataURL(blob: Blob, options?: BlobReadOptions): Promise<string>;
/**
 * @en Convert `Blob` to text string.
 * @ja `Blob` からテキストへ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToText(blob: Blob, options?: BlobReadOptions & {
    encoding?: string | null;
}): Promise<string>;
/**
 * @en Convert `Blob` to Base64 string.
 * @ja `Blob` から Base64 文字列へ変換
 *
 * @param blob
 *  - `en` `Blob` instance
 *  - `ja` `Blob` インスタンスを指定
 * @param options
 */
export declare function blobToBase64(blob: Blob, options?: BlobReadOptions): Promise<string>;
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
export declare function bufferToBlob(buffer: ArrayBuffer, mimeType?: string): Blob;
/**
 * @en Convert `ArrayBuffer` to `Uint8Array`.
 * @ja `ArrayBuffer` から `Uint8Array` に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 */
export declare function bufferToBinary(buffer: ArrayBuffer): Uint8Array;
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
export declare function bufferToDataURL(buffer: ArrayBuffer, mimeType?: string): string;
/**
 * @en Convert `ArrayBuffer` to Base64 string.
 * @ja `ArrayBuffer` から Base64 文字列に変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 */
export declare function bufferToBase64(buffer: ArrayBuffer): string;
/**
 * @en Convert `ArrayBuffer` to text string.
 * @ja `ArrayBuffer` からテキストに変換
 *
 * @param buffer
 *  - `en` `ArrayBuffer` instance
 *  - `ja` `ArrayBuffer` インスタンスを指定
 */
export declare function bufferToText(buffer: ArrayBuffer): string;
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
export declare function binaryToBlob(binary: Uint8Array, mimeType?: string): Blob;
/**
 * @en Convert `Uint8Array` to `ArrayBuffer`.
 * @ja `Uint8Array` から `ArrayBuffer` に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 */
export declare function binaryToBuffer(binary: Uint8Array): ArrayBuffer;
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
export declare function binaryToDataURL(binary: Uint8Array, mimeType?: string): string;
/**
 * @en Convert `Uint8Array` to Base64 string.
 * @ja `Uint8Array` から Base64 文字列に変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 */
export declare function binaryToBase64(binary: Uint8Array): string;
/**
 * @en Convert `Uint8Array` to text string.
 * @ja `Uint8Array` から テキストに変換
 *
 * @param binary
 *  - `en` `Uint8Array` instance
 *  - `ja` `Uint8Array` インスタンスを指定
 */
export declare function binaryToText(binary: Uint8Array): string;
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
export declare function base64ToBlob(base64: string, mimeType?: string): Blob;
/**
 * @en Convert Base64 string to `ArrayBuffer`.
 * @ja Base64 文字列から `ArrayBuffer` に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 */
export declare function base64ToBuffer(base64: string): ArrayBuffer;
/**
 * @en Convert Base64 string to `Uint8Array`.
 * @ja Base64 文字列から `Uint8Array` に変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 */
export declare function base64ToBinary(base64: string): Uint8Array;
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
export declare function base64ToDataURL(base64: string, mimeType?: string): string;
/**
 * @en Convert Base64 string to text string.
 * @ja  Base64 文字列から テキストに変換
 *
 * @param base64
 *  - `en` Base64 string data
 *  - `ja` Base64 文字列
 */
export declare function base64ToText(base64: string): string;
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
export declare function textToBlob(text: string, mimeType?: string): Blob;
/**
 * @en Convert text string to `ArrayBuffer`.
 * @ja テキストから `ArrayBuffer` に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 */
export declare function textToBuffer(text: string): ArrayBuffer;
/**
 * @en Convert text string to `Uint8Array`.
 * @ja テキストから `Uint8Array` に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 */
export declare function textToBinary(text: string): Uint8Array;
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
export declare function textToDataURL(text: string, mimeType?: string): string;
/**
 * @en Convert text string to Base64 string.
 * @ja テキストから Base64 文字列に変換
 *
 * @param text
 *  - `en` text string data
 *  - `ja` テキスト文字列
 */
export declare function textToBase64(text: string): string;
/**
 * @en Convert data-URL string to `Blob`.
 * @ja data-URL 文字列から `Blob` に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToBlob(dataURL: string): Blob;
/**
 * @en Convert data-URL string to `ArrayBuffer`.
 * @ja data-URL 文字列から `ArrayBuffer` に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToBuffer(dataURL: string): ArrayBuffer;
/**
 * @en Convert data-URL string to `Uint8Array`.
 * @ja data-URL 文字列から `Uint8Array` に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToBinary(dataURL: string): Uint8Array;
/**
 * @en Convert data-URL string to text string.
 * @ja data-URL 文字列からテキストに変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToText(dataURL: string): string;
/**
 * @en Convert data-URL string to Base64 string.
 * @ja data-URL 文字列から Base64 文字列に変換
 *
 * @param dataURL
 *  - `en` data-URL string data
 *  - `ja` data-URL 文字列
 */
export declare function dataURLToBase64(dataURL: string): string;
/**
 * @en Serializable data type list.
 * @ja シリアライズ可能なデータ型一覧
 */
export interface Serializable {
    string: string;
    number: number;
    boolean: boolean;
    object: object;
    buffer: ArrayBuffer;
    binary: Uint8Array;
    blob: Blob;
}
export declare type SerializableDataTypes = Types<Serializable>;
export declare type SerializableInputDataTypes = SerializableDataTypes | null | undefined;
export declare type SerializableKeys = Keys<Serializable>;
export declare type SerializableCastable = Omit<Serializable, 'buffer' | 'binary' | 'blob'>;
export declare type SerializableCastableTypes = Types<SerializableCastable>;
export declare type SerializableReturnType<T extends SerializableCastableTypes> = TypeToKey<SerializableCastable, T> extends never ? never : T | null | undefined;
/**
 * @en Deserializable options interface.
 * @ja デシリアライズに使用するオプション
 */
export interface DeserializeOptions<T extends Serializable = Serializable, K extends Keys<T> = Keys<T>> extends Cancelable {
    /** [[SerializableKeys]] */
    dataType?: K;
}
/**
 * @en Serialize data.
 * @ja データシリアライズ
 *
 * @param data input
 * @param options blob convert options
 */
export declare function serialize<T extends SerializableInputDataTypes>(data: T, options?: BlobReadOptions): Promise<string>;
/**
 * @en Deserialize data.
 * @ja データの復元
 *
 * @param value input string or undefined.
 * @param options deserialize options
 */
export declare function deserialize<T extends SerializableCastableTypes = SerializableCastableTypes>(value: string | undefined, options?: DeserializeOptions<Serializable, never>): Promise<SerializableReturnType<T>>;
/**
 * @en Deserialize data.
 * @ja データの復元
 *
 * @param value input string or undefined.
 * @param options deserialize options
 */
export declare function deserialize<T extends SerializableKeys>(value: string | undefined, options: DeserializeOptions<Serializable, T>): Promise<Serializable[T] | null | undefined>;
