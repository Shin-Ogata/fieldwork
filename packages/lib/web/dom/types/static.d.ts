import { ElementBase, SelectorBase, QueryContext, EvalOptions, isWindowContext, elementify, rootify, evaluate } from './utils';
import { DOM, DOMPlugin, DOMClass, DOMSelector, DOMResult, DOMIterateCallback } from './class';
declare namespace dom {
    let fn: DOMClass & Record<string | symbol, unknown>;
}
export type DOMFactory = <T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null) => DOMResult<T>;
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
declare function dom<T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null): DOMResult<T>;
declare namespace dom {
    var utils: {
        isWindowContext: typeof isWindowContext;
        elementify: typeof elementify;
        rootify: typeof rootify;
        evaluate: typeof evaluate;
        detectify: <T extends Node>(node: T, observed?: Node | undefined) => T;
        undetectify: <T_1 extends Node>(node?: T_1 | undefined) => void;
    };
}
export { ElementBase, SelectorBase, QueryContext, EvalOptions, DOM, DOMPlugin, DOMSelector, DOMResult, DOMIterateCallback, dom, };
