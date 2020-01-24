/* eslint-disable
   @typescript-eslint/no-namespace
 , @typescript-eslint/no-explicit-any
 */

import {
    ElementBase,
    SelectorBase,
    QueryContext,
    EvalOptions,
    elementify,
    evaluate,
} from './utils';
import {
    DOM,
    DOMClass,
    DOMSelector,
    DOMResult,
    DOMIterateCallback,
} from './class';

declare namespace dom {
    let fn: DOMClass;
}

type DOMFactory = <T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null) => DOMResult<T>;

let _factory!: DOMFactory;

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
    elementify,
    evaluate,
};

/** @internal 循環参照回避のための遅延コンストラクションメソッド */
export function setup(fn: DOMClass, factory: DOMFactory): void {
    _factory = factory;
    dom.fn = fn;
}

export {
    ElementBase,
    SelectorBase,
    QueryContext,
    EvalOptions,
    DOM,
    DOMSelector,
    DOMResult,
    DOMIterateCallback,
    dom,
};
