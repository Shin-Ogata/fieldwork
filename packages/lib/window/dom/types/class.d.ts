import { ElementBase, SelectorBase, ElementifySeed } from './utils';
import { DOMBase } from './base';
/**
 * @en This interface provides DOM operations like `jQuery` library.
 * @ja `jQuery` のようなDOM 操作を提供するインターフェイス
 */
export interface DOM<T extends ElementBase = Element> extends DOMClass<T> {
}
export declare type DOMSelector<T extends SelectorBase = Element> = ElementifySeed<T> | DOM<T extends ElementBase ? T : never>;
export declare type DOMResult<T extends SelectorBase> = T extends DOM<ElementBase> ? T : (T extends ElementBase ? DOM<T> : DOM<Element>);
/**
 * @en This class provides DOM operations like `jQuery` library.
 * @ja `jQuery` のようなDOM 操作を提供
 */
export declare class DOMClass<TElement extends ElementBase = Element> extends DOMBase<TElement> {
    /**
     * private constructor
     *
     * @param elements
     *  - `en` operation targets `Element` array.
     *  - `ja` 操作対象の `Element` 配列
     */
    private constructor();
}
