import {
    Nil,
    isFunction,
    className,
} from '@cdp/core-utils';
import { document } from './ssr';

export type ElementBase = Node | Window;
export type ElementResult<T> = T extends ElementBase ? T : HTMLElement;
export type SelectorBase = Node | Window | string | Nil;
export type ElementifySeed<T extends SelectorBase = HTMLElement> = T | (T extends ElementBase ? T[] : never) | NodeListOf<T extends Node ? T : never>;
export type QueryContext = ParentNode & Partial<NonElementParentNode>;

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
export function elementify<T extends SelectorBase>(seed?: ElementifySeed<T>, context: QueryContext = document): ElementResult<T>[] {
    if (!seed) {
        return [];
    }

    const elements: Element[] = [];

    try {
        if ('string' === typeof seed) {
            const html = seed.trim();
            if (html.includes('<') && html.includes('>')) {
                // markup
                const template = document.createElement('template');
                template.innerHTML = html;
                elements.push(...template.content.children);
            } else {
                const selector = seed.trim();
                // eslint-disable-next-line @typescript-eslint/unbound-method
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
        } else if ((seed as Node).nodeType || window === seed) {
            // Node/element, Window
            elements.push(seed as Node as Element);
        } else if (0 < (seed as T[]).length && (seed[0].nodeType || window === seed[0])) {
            // array of elements or collection of DOM
            elements.push(...(seed as Node[] as Element[]));
        }
    } catch (e) {
        console.warn(`elementify(${className(seed)}, ${className(context)}), failed. [error:${e}]`);
    }

    return elements as ElementResult<T>[];
}
