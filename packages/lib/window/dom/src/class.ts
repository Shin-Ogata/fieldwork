/* eslint-disable @typescript-eslint/no-explicit-any */

import { mixins } from '@cdp/core-utils';
import {
    ElementBase,
    SelectorBase,
    ElementifySeed,
    QueryContext,
    elementify,
} from './utils';
import { DOMBase } from './base';
import { DOMAttributes } from './attributes';
import { DOMTraversing } from './traversing';
import { DOMManipulation } from './manipulation';
import { DOMStyles } from './styles';
import { DOMEvents } from './events';
import { DOMScroll } from './scroll';
import { DOMEffects } from './effects';

/**
 * @en This interface provides DOM operations like `jQuery` library.
 * @ja `jQuery` のようなDOM 操作を提供するインターフェイス
 */
export interface DOM<T extends ElementBase = HTMLElement>
    extends DOMBase<T>, DOMAttributes<T>, DOMTraversing<T>, DOMManipulation<T>, DOMStyles<T>, DOMEvents<T>, DOMScroll<T>, DOMEffects<T>
{ } // eslint-disable-line @typescript-eslint/no-empty-interface

export type DOMSelector<T extends SelectorBase = HTMLElement> = ElementifySeed<T> | DOM<T extends ElementBase ? T : never>;
export type DOMResult<T extends SelectorBase> = T extends DOM<ElementBase> ? T : (T extends ElementBase ? DOM<T> : DOM<HTMLElement>);
export type DOMIterateCallback<T extends ElementBase> = (index: number, element: T) => boolean | void;

/**
 * @en This class provides DOM operations like `jQuery` library.
 * @ja `jQuery` のようなDOM 操作を提供
 *
 * UNSUPPORTED METHOD LIST
 *
 * [Traversing]
 *  .addBack()
 *  .end()
 *
 * [Effects]
 * .show()
 * .hide()
 * .toggle()
 * .stop()
 * .clearQueue()
 * .delay()
 * .dequeue()
 * .fadeIn()
 * .fadeOut()
 * .fadeTo()
 * .fadeToggle()
 * .queue()
 * .slideDown()
 * .slideToggle()
 * .slideUp()
 */
export class DOMClass extends mixins(
    DOMBase,
    DOMAttributes,
    DOMTraversing,
    DOMManipulation,
    DOMStyles,
    DOMEvents,
    DOMScroll,
    DOMEffects,
) {
    /**
     * private constructor
     *
     * @param elements
     *  - `en` operation targets `Element` array.
     *  - `ja` 操作対象の `Element` 配列
     */
    private constructor(elements: ElementBase[]) {
        super(elements);
        // all source classes have no constructor.
    }

    /**
     * @en Create [[DOM]] instance from `selector` arg.
     * @ja 指定された `selector` [[DOM]] インスタンスを作成
     *
     * @internal
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
     *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
     * @param context
     *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     * @returns [[DOM]] instance.
     */
    public static create<T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null): DOMResult<T> {
        if (selector && !context) {
            if (selector instanceof DOMClass) {
                return selector as any;
            }
        }
        return new DOMClass((elementify(selector as ElementifySeed<T>, context))) as any;
    }
}
