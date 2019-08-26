import {
    ElementBase,
    ElementResult,
    SelectorBase,
    ElementifySeed,
    QueryContext,
} from './utils';
import * as utils from './utils';
import {
    DOM,
    DOMClass,
    DOMSelector,
    DOMResult,
} from './class';

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
    return DOMClass.create(selector, context);
}

dom.utils = utils;

export {
    ElementBase,
    ElementResult,
    SelectorBase,
    ElementifySeed,
    QueryContext,
    DOM,
    dom,
};
export default dom;
