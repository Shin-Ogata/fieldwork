/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-explicit-any */
import {
    ElementBase,
    SelectorBase,
    QueryContext,
} from './utils';
import * as utils from './utils';
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

type DOMFactory = <T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext) => DOMResult<T>;

let _factory!: DOMFactory;

/**
 * @en Create [[DOMClass]] instance from `selector` arg.
 * @ja 指定された `selector` [[DOMClass]] インスタンスを作成
 *
 * @param selector
 *  - `en` Object(s) or the selector string which becomes origin of [[DOMClass]].
 *  - `ja` [[DOMClass]] のもとになるオブジェクト(群)またはセレクタ文字列
 * @param context
 *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
 *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
 * @returns [[DOMClass]] instance.
 */
function dom<T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext): DOMResult<T> {
    return _factory(selector, context);
}

dom.utils = utils;

/** @internal 循環参照回避のための遅延コンストラクションメソッド */
export function setup(fn: DOMClass, factory: DOMFactory): void {
    _factory = factory;
    dom.fn = fn;
}

export {
    ElementBase,
    SelectorBase,
    QueryContext,
    DOM,
    DOMSelector,
    DOMIterateCallback,
    dom,
};
