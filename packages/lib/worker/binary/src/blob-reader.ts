import { type UnknownFunction, verify } from '@cdp/core-utils';
import { type Cancelable, CancelToken } from '@cdp/promise';
import { FileReader } from './ssr';

/** @internal */
interface FileReaderArgsMap {
    readAsArrayBuffer: [Blob];
    readAsDataURL: [Blob];
    readAsText: [Blob, string | undefined];
}

/** @internal */
interface FileReaderResultMap {
    readAsArrayBuffer: ArrayBuffer;
    readAsDataURL: string;
    readAsText: string;
}

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

/** @internal execute read blob */
function exec<T extends keyof FileReaderResultMap>(
    methodName: T,
    args: FileReaderArgsMap[T],
    options: BlobReadOptions,
): Promise<FileReaderResultMap[T]> {
    type TResult = FileReaderResultMap[T];
    const { cancel: token, onprogress } = options;
    token && verify('instanceOf', CancelToken, token);
    onprogress && verify('typeOf', 'function', onprogress);
    return new Promise<TResult>((resolve, reject) => {
        const reader = new FileReader();
        const subscription = token?.register(() => {
            reader.abort();
        });
        reader.onabort = reader.onerror = () => {
            reject(reader.error);
        };
        reader.onprogress = onprogress!;
        reader.onload = () => {
            resolve(reader.result as TResult);
        };
        reader.onloadend = () => {
            subscription && subscription.unsubscribe();
        };
        (reader[methodName] as UnknownFunction)(...args);
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
export function readAsArrayBuffer(blob: Blob, options?: BlobReadOptions): Promise<ArrayBuffer> {
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
export function readAsDataURL(blob: Blob, options?: BlobReadOptions): Promise<string> {
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
export function readAsText(blob: Blob, encoding?: string | null, options?: BlobReadOptions): Promise<string> {
    return exec('readAsText', [blob, encoding ?? undefined], { ...options });
}
