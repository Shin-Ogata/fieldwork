import type { Writable } from '@cdp/core-utils';
import {
    ElementBase,
    ElementifySeed,
    ElementResult,
    SelectorBase,
    QueryContext,
    EvalOptions,
    isWindowContext,
    elementify,
    rootify,
    evaluate,
} from './utils';
import { detectify, undetectify } from './detection';
import {
    DOM,
    DOMPlugin,
    DOMClass,
    DOMSelector,
    DOMResult,
    DOMIterateCallback,
} from './class';

/**
 * @en Provides functionality equivalent to `jQuery` DOM manipulation.
 * @ja `jQuery` の DOM 操作と同等の機能を提供
 *
 * @example <br>
 *
 * ```ts
 * import { dom as $ } from '@cdp/runtime';
 *
 * // Get the <button> element with the class 'continue' and change its HTML to 'Next Step...'
 * $('button.continue').html('Next Step...');
 * ```
 */
export interface DOMStatic {
    /**
     * @en Provides functionality equivalent to `jQuery` DOM manipulation. <br>
     *     Create {@link DOM} instance from `selector` arg.
     * @ja `jQuery` の DOM 操作と同等の機能を提供 <br>
     *     指定された `selector` {@link DOM} インスタンスを作成
     *
     * @example <br>
     *
     * ```ts
     * import { dom as $ } from '@cdp/runtime';
     *
     * // Get the <button> element with the class 'continue' and change its HTML to 'Next Step...'
     * $('button.continue').html('Next Step...');
     * ```
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
     *  - `ja` {@link DOM} のもとになるオブジェクト(群)またはセレクタ文字列
     * @param context
     *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     * @returns {@link DOM} instance.
     */
    <T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null): DOMResult<T>;

    /**
     * @en The object's `prototype` alias.
     * @ja オブジェクトの `prototype`エイリアス
     */
    fn: DOMClass & Record<string | symbol, unknown>;

    /** DOM Utilities */
    readonly utils: {
        /**
         * @en Check the value-type is Window.
         * @ja Window 型であるか判定
         *
         * @param x
         *  - `en` evaluated value
         *  - `ja` 評価する値
         */
        isWindowContext(x: unknown): x is Window;

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
        elementify<T extends SelectorBase>(seed?: ElementifySeed<T>, context?: QueryContext | null): ElementResult<T>[];

        /**
         * @en Create Element array from seed arg. <br>
         *     And also lists for the `DocumentFragment` inside the `<template>` tag.
         * @ja 指定された Seed から Element 配列を作成 <br>
         *     `<template>` タグ内の `DocumentFragment` も列挙する
         *
         * @param seed
         *  - `en` Object(s) or the selector string which becomes origin of Element array.
         *  - `ja` Element 配列のもとになるオブジェクト(群)またはセレクタ文字列
         * @param context
         *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
         *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
         * @returns Element[] based Node.
         */
        rootify<T extends SelectorBase>(seed?: ElementifySeed<T>, context?: QueryContext | null): ElementResult<T>[];

        /**
         * @en The `eval` function by which script `nonce` attribute considered under the CSP condition.
         * @ja CSP 環境においてスクリプト `nonce` 属性を考慮した `eval` 実行関数
         */
        evaluate(code: string, options?: Element | EvalOptions, context?: Document | null): any; // eslint-disable-line @typescript-eslint/no-explicit-any

        /**
         * @en Enabling the node to detect events of DOM connected and disconnected.
         * @ja 要素に対して, DOM への接続, DOM からの切断イベントを検出可能にする
         *
         * @example <br>
         *
         * ```ts
         * import { dom } from '@cdp/runtime';
         * const { detectify, undetectify } = dom.utils;
         *
         * const el = document.createElement('div');
         *
         * // observation start
         * detectify(el);
         * el.addEventListener('connected', () => {
         *     console.log('on connected');
         * });
         * el.addEventListener('disconnected', () => {
         *     console.log('on disconnected');
         * });
         *
         * // observation stop
         * undetectify(el);
         * ```
         *
         * @param node
         *  - `en` target node
         *  - `ja` 対象の要素
         * @param observed
         *  - `en` Specifies the root element to watch. If not specified, `ownerDocument` is evaluated first, followed by global `document`.
         *  - `ja` 監視対象のルート要素を指定. 未指定の場合は `ownerDocument`, グローバル `document` の順に評価される
         */
        detectify<T extends Node>(node: T, observed?: Node): T;

        /**
         * @en Undetect connected and disconnected from DOM events for an element.
         * @ja 要素に対して, DOM への接続, DOM からの切断イベントを検出を解除する
         *
         * @param node
         *  - `en` target node. If not specified, execute all release.
         *  - `ja` 対象の要素. 指定しない場合は全解除を実行
         */
        undetectify<T extends Node>(node?: T): void;
    };
}

/** @internal */
export type DOMFactory = <T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null) => DOMResult<T>;

let _factory!: DOMFactory;

const dom = (<T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null): DOMResult<T> => {
    return _factory(selector, context);
}) as DOMStatic;

(dom as Writable<DOMStatic>).utils = {
    isWindowContext,
    elementify,
    rootify,
    evaluate,
    detectify,
    undetectify,
};

/** @internal 循環参照回避のための遅延コンストラクションメソッド */
export function setup(fn: DOMClass, factory: DOMFactory): void {
    _factory = factory;
    (dom.fn as DOMClass) = fn;
}

export {
    ElementBase,
    SelectorBase,
    QueryContext,
    EvalOptions,
    DOM,
    DOMPlugin,
    DOMSelector,
    DOMResult,
    DOMIterateCallback,
    dom,
};
