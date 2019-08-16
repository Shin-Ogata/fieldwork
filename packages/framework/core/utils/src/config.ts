/**
 * @en Safe `global` accessor.
 * @ja `global` アクセッサ
 * 
 * @returns
 *  - `en` `global` object of the runtime environment
 *  - `ja` 環境に応じた `global` オブジェクト
 */
export function getGlobal(): typeof globalThis {
    // eslint-disable-next-line no-new-func
    return ('object' === typeof globalThis) ? globalThis : Function('return this')();
}

/**
 * @en Global config accessor.
 * @ja グローバルコンフィグアクセッサ
 */
export function getConfig<T extends {} = {}>(): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root: any = getGlobal();
    if (!root.CDP || !root.CDP.Config) {
        root.CDP = root.CDP || {};
        root.CDP.Config = root.Config || {};
    }
    return root.CDP.Config;
}
