import { Nil } from '@cdp/core-utils';
export type ElementBase = Node | Window;
export type ElementResult<T> = T extends ElementBase ? T : HTMLElement;
export type SelectorBase = Node | Window | string | Nil;
export type ElementifySeed<T extends SelectorBase = HTMLElement> = T | (T extends ElementBase ? T[] : never) | NodeListOf<T extends Node ? T : never>;
export type QueryContext = ParentNode & Partial<NonElementParentNode>;
/**
 * @en Check the value-type is Window.
 * @ja Window 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export declare function isWindowContext(x: unknown): x is Window;
/**
 * @en Create Element array from seed arg.
 * @ja 指定された Seed から Element 配列を作成
 *
 * @param seed
 *  - `en` Object(s) or the selector string which becomes origin of Element array.
 *  - `ja` Element 配列のもとになるオブジェクト(群)またはセレクタ文字列
 * @param context
 *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
 *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
 * @returns Element[] based Node or Window object.
 */
export declare function elementify<T extends SelectorBase>(seed?: ElementifySeed<T>, context?: QueryContext | null): ElementResult<T>[];
/**
 * @en Ensure positive number, if not returned `undefined`.
 * @en 正値の保証. 異なる場合 `undefined` を返却
 */
export declare function ensurePositiveNumber(value: number | undefined): number | undefined;
/**
 * @en For easing `swing` timing-function.
 * @ja easing `swing` 用タイミング関数
 *
 * @reference
 *  - https://stackoverflow.com/questions/9245030/looking-for-a-swing-like-easing-expressible-both-with-jquery-and-css3
 *  - https://stackoverflow.com/questions/5207301/jquery-easing-functions-without-using-a-plugin
 *
 * @param progress [0 - 1]
 */
export declare function swing(progress: number): number;
/**
 * @en [[evaluate]]() options.
 * @ja [[evaluate]]() に渡すオプション
 */
export interface EvalOptions {
    type?: string;
    src?: string;
    nonce?: string;
    noModule?: string;
}
/**
 * @en The `eval` function by which script `nonce` attribute considered under the CSP condition.
 * @ja CSP 環境においてスクリプト `nonce` 属性を考慮した `eval` 実行関数
 */
export declare function evaluate(code: string, options?: Element | EvalOptions, context?: Document | null): any;
