/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    Nullish,
    isNumber,
    isFunction,
    className,
    getGlobalNamespace,
} from '@cdp/core-utils';
import { document } from './ssr';

export type ElementBase = Node | Window;
export type ElementResult<T> = T extends ElementBase ? T : HTMLElement;
export type SelectorBase = Node | Window | string | Nullish;
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
export function isWindowContext(x: unknown): x is Window {
    return (x as Window)?.parent instanceof Window;
}

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
export function elementify<T extends SelectorBase>(seed?: ElementifySeed<T>, context?: QueryContext | null): ElementResult<T>[] {
    if (!seed) {
        return [];
    }

    context = context || document;
    const elements: Element[] = [];

    try {
        if ('string' === typeof seed) {
            const html = seed.trim();
            if (html.startsWith('<') && html.endsWith('>')) {
                // markup
                const template = document.createElement('template');
                template.innerHTML = html;
                elements.push(...template.content.children);
            } else {
                const selector = html;
                if (isFunction(context.getElementById) && ('#' === selector[0]) && !/[ .<>:~]/.exec(selector)) {
                    // pure ID selector
                    const el = context.getElementById(selector.substring(1));
                    el && elements.push(el);
                } else if ('body' === selector) {
                    // body
                    elements.push(document.body);
                } else {
                    // other selectors
                    elements.push(...context.querySelectorAll(selector));
                }
            }
        } else if ((seed as Node).nodeType || isWindowContext(seed)) {
            // Node/element, Window
            elements.push(seed as Node as Element);
        } else if (0 < (seed as T[]).length && (seed[0].nodeType || isWindowContext(seed[0]))) {
            // array of elements or collection of DOM
            elements.push(...(seed as Node[] as Element[]));
        }
    } catch (e) {
        console.warn(`elementify(${className(seed)}, ${className(context)}), failed. [error:${e}]`);
    }

    return elements as ElementResult<T>[];
}

/**
 * @en Ensure positive number, if not returned `undefined`.
 * @en 正値の保証. 異なる場合 `undefined` を返却
 */
export function ensurePositiveNumber(value: number | undefined): number | undefined {
    return (isNumber(value) && 0 <= value) ? value : undefined;
}

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
export function swing(progress: number): number {
    return 0.5 - (Math.cos(progress * Math.PI) / 2);
}

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

/** @internal */
const _scriptsAttrs: (keyof EvalOptions)[] = [
    'type',
    'src',
    'nonce',
    'noModule',
];

/**
 * @en The `eval` function by which script `nonce` attribute considered under the CSP condition.
 * @ja CSP 環境においてスクリプト `nonce` 属性を考慮した `eval` 実行関数
 */
export function evaluate(code: string, options?: Element | EvalOptions, context?: Document | null): any {
    const doc: Document = context || document;
    const script = doc.createElement('script');
    script.text = `CDP_DOM_EVAL_RETURN_VALUE_BRIDGE = (() => { return ${code}; })();`;

    if (options) {
        for (const attr of _scriptsAttrs) {
            const val = options[attr] || ((options as Element).getAttribute && (options as Element).getAttribute(attr));
            if (val) {
                script.setAttribute(attr, val);
            }
        }
    }

    // execute
    try {
        getGlobalNamespace('CDP_DOM_EVAL_RETURN_VALUE_BRIDGE');
        doc.head.appendChild(script).parentNode!.removeChild(script); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        const retval = globalThis['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
        return retval;
    } finally {
        delete globalThis['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
    }
}
