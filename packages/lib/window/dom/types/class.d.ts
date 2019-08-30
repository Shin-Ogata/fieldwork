import { ElementBase, SelectorBase, ElementifySeed } from './utils';
import { DOMBase } from './base';
import { DOMMethods } from './methods';
import { DOMEvents } from './events';
/**
 * @en This interface provides DOM operations like `jQuery` library.
 * @ja `jQuery` のようなDOM 操作を提供するインターフェイス
 */
export interface DOM<T extends ElementBase = HTMLElement> extends DOMBase<T>, DOMMethods<T>, DOMEvents<T> {
}
export declare type DOMSelector<T extends SelectorBase = HTMLElement> = ElementifySeed<T> | DOM<T extends ElementBase ? T : never>;
export declare type DOMResult<T extends SelectorBase> = T extends DOM<ElementBase> ? T : (T extends ElementBase ? DOM<T> : DOM<HTMLElement>);
export declare type DOMIterateCallback<T extends ElementBase> = (index: number, element: T) => boolean | void;
declare const DOMClass_base: import("@cdp/core-utils").MixinConstructor<typeof DOMBase, import("@cdp/core-utils").MixinClass & DOMBase<ElementBase> & DOMMethods<any> & DOMEvents<any>>;
/**
 * @en This class provides DOM operations like `jQuery` library.
 * @ja `jQuery` のようなDOM 操作を提供
 */
export declare class DOMClass extends DOMClass_base {
    /**
     * private constructor
     *
     * @param elements
     *  - `en` operation targets `Element` array.
     *  - `ja` 操作対象の `Element` 配列
     */
    private constructor();
}
export {};
