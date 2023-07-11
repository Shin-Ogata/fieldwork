/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/dot-notation,
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

/** @internal */
export function isWindowContext(x: unknown): x is Window {
    return (x as Window)?.parent instanceof Window;
}

/** @internal */
export function elementify<T extends SelectorBase>(seed?: ElementifySeed<T>, context?: QueryContext | null): ElementResult<T>[] {
    if (!seed) {
        return [];
    }

    context = context ?? document;
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
        } else if (0 < (seed as T[]).length && ((seed as any)[0].nodeType || isWindowContext((seed as any)[0]))) {
            // array of elements or collection of DOM
            elements.push(...(seed as Node[] as Element[]));
        }
    } catch (e) {
        console.warn(`elementify(${className(seed)}, ${className(context)}), failed. [error:${e}]`);
    }

    return elements as ElementResult<T>[];
}

/** @internal */
export function rootify<T extends SelectorBase>(seed?: ElementifySeed<T>, context?: QueryContext | null): ElementResult<T>[] {
    const parse = (el: Element, pool: ParentNode[]): void => {
        const root = (el instanceof HTMLTemplateElement) ? el.content : el;
        pool.push(root);
        const templates = root.querySelectorAll('template');
        for (const t of templates) {
            parse(t, pool);
        }
    };

    const roots: ParentNode[] = [];

    for (const el of elementify(seed, context)) {
        parse(el as Element, roots);
    }

    return roots as ElementResult<T>[];
}

/**
 * @internal
 * @en Ensure positive number, if not returned `undefined`.
 * @en 正値の保証. 異なる場合 `undefined` を返却
 */
export function ensurePositiveNumber(value: number | undefined): number | undefined {
    return (isNumber(value) && 0 <= value) ? value : undefined;
}

/**
 * @internal
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
 * @en {@link DOMStatic.utils.evaluate | evaluate}() options.
 * @ja {@link DOMStatic.utils.evaluate | evaluate}() に渡すオプション
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

/** @internal */
export function evaluate(code: string, options?: Element | EvalOptions, context?: Document | null): any {
    const doc: Document = context ?? document;
    const script = doc.createElement('script');
    script.text = `CDP_DOM_EVAL_RETURN_VALUE_BRIDGE = (() => { return ${code}; })();`;

    if (options) {
        for (const attr of _scriptsAttrs) {
            const val = (options as Record<string, string>)[attr] || (options as Element)?.getAttribute?.(attr);
            if (val) {
                script.setAttribute(attr, val);
            }
        }
    }

    // execute
    try {
        getGlobalNamespace('CDP_DOM_EVAL_RETURN_VALUE_BRIDGE');
        doc.head.appendChild(script).parentNode!.removeChild(script);
        const retval = (globalThis as any)['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
        return retval;
    } finally {
        delete (globalThis as any)['CDP_DOM_EVAL_RETURN_VALUE_BRIDGE'];
    }
}
