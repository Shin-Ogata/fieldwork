/* eslint-disable
    @typescript-eslint/no-namespace,
 */

import {
    ElementBase,
    SelectorBase,
    QueryContext,
    EvalOptions,
    isWindowContext,
    elementify,
    rootify,
    evaluate,
} from './utils';
import {
    DOM,
    DOMPlugin,
    DOMClass,
    DOMSelector,
    DOMResult,
    DOMIterateCallback,
} from './class';

declare namespace dom {
    let fn: DOMClass & Record<string | symbol, unknown>;
}

export type DOMFactory = <T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null) => DOMResult<T>;

/** @internal */ let _factory!: DOMFactory;

/**
 * @en Create [[DOM]] instance from `selector` arg.
 * @ja 指定された `selector` [[DOM]] インスタンスを作成
 *
 * @param selector
 *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
 *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
 * @param context
 *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
 *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
 * @returns [[DOM]] instance.
 */
function dom<T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null): DOMResult<T> {
    return _factory(selector, context);
}

dom.utils = {
    isWindowContext,
    elementify,
    rootify,
    evaluate,
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
