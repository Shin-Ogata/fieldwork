import { type Cancelable } from '@cdp/promise';
/**
 * @en `Blob` read options
 * @ja `Blob` 読み取りオプション
 */
export interface BlobReadOptions extends Cancelable {
    /**
     * @en Progress callback function.
     * @ja 進捗コールバック関数
     *
     * @param progress
     *  - `en` worker progress event
     *  - `ja` worker 進捗イベント
     */
    onprogress?: (progress: ProgressEvent) => unknown;
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
export declare function readAsArrayBuffer(blob: Blob, options?: BlobReadOptions): Promise<ArrayBuffer>;
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
export declare function readAsDataURL(blob: Blob, options?: BlobReadOptions): Promise<string>;
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
export declare function readAsText(blob: Blob, encoding?: string | null, options?: BlobReadOptions): Promise<string>;
