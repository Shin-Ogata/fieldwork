import { Primitive } from './types';

/**
 * @en Ensure asynchronous execution.
 * @ja 非同期実行を保証
 *
 * @example <br>
 *
 * ```ts
 * post(() => exec(arg));
 * ```
 *
 * @param executor
 *  - `en` implement as function scope.
 *  - `ja` 関数スコープとして実装
*/
export function post<T>(executor: () => T): Promise<T> {
    return Promise.resolve().then(executor);
}

/**
 * @en Generic No-Operation.
 * @ja 汎用 No-Operation
 */
export function noop(...args: any[]): void {    // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    // noop
}

//__________________________________________________________________________________________________//

/**
 * @en Create escape function from map.
 * @ja 文字置換関数を作成
 *
 * @param map
 *  - `en` key: target char, value: replace char
 *  - `ja` key: 置換対象, value: 置換文字
 * @returns
 *  - `en` espace function
 *  - `ja` エスケープ関数
 */
export function createEscaper(map: object): (src: Primitive) => string {
    const escaper = (match: string): string => {
        return map[match];
    };

    const source = `(?:${Object.keys(map).join('|')})`;
    const regexTest = RegExp(source);
    const regexReplace = RegExp(source, 'g');

    return (src: Primitive): string => {
        src = (null == src || 'symbol' === typeof src) ? '' : String(src);
        return regexTest.test(src) ? src.replace(regexReplace, escaper) : src;
    };
}

/**
 * @en Escape HTML string
 * @ja HTML で使用する文字を制御文字に置換
 *
 * @brief <br>
 *
 * ```ts
 * const mapHtmlEscape = {
 *     '<': '&lt;',
 *     '>': '&gt;',
 *     '&': '&amp;',
 *     '"': '&quot;',
 *     "'": '&#39;',
 *     '`': '&#x60;'
 * };
 * ```
 */
export const escapeHTML = createEscaper({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#x60;'
});
