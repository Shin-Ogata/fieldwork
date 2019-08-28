import { ElementBase, SelectorBase, ElementifySeed } from './utils';
import { DOMBase, DOMIterable } from './base';
import { DOMMethods } from './methods';
/**
 * @en This interface provides DOM operations like `jQuery` library.
 * @ja `jQuery` のようなDOM 操作を提供するインターフェイス
 */
export interface DOM<T extends ElementBase = Element> extends DOMClass<T> {
}
export declare type DOMSelector<T extends SelectorBase = Element> = ElementifySeed<T> | DOM<T extends ElementBase ? T : never>;
export declare type DOMResult<T extends SelectorBase> = T extends DOM<ElementBase> ? T : (T extends ElementBase ? DOM<T> : DOM<Element>);
export declare type DOMIterateCallback<T extends ElementBase> = (index: number, element: T) => boolean | void;
declare const DOMClass_base: import("@cdp/core-utils").MixinConstructor<typeof DOMBase, import("@cdp/core-utils").MixinClass & DOMBase<ElementBase> & DOMMethods<any>>;
/**
 * @en This class provides DOM operations like `jQuery` library.
 * @ja `jQuery` のようなDOM 操作を提供
 */
export declare class DOMClass<TElement extends ElementBase = Element> extends DOMClass_base implements DOMIterable<TElement> {
    /**
     * private constructor
     *
     * @param elements
     *  - `en` operation targets `Element` array.
     *  - `ja` 操作対象の `Element` 配列
     */
    private constructor();
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
    keys: () => IterableIterator<number>;
    values: () => IterableIterator<TElement>;
}
export {};
