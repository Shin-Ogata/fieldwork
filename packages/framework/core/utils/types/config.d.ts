/**
 * @es Safe `global` accessor.
 * @ja `global` アクセッサ
 *
 * @returns
 *  - `en` `global` object of the runtime environment
 *  - `ja` 環境に応じた `global` オブジェクト
 */
export declare function getGlobal(): typeof globalThis;
/**
 * @es Global config accessor.
 * @ja グローバルコンフィグアクセッサ
 */
export declare function getConfig<T extends {} = {}>(): T;
