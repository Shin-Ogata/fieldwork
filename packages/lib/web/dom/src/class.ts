import {
    Class,
    mixins,
    setMixClassAttribute,
} from '@cdp/core-utils';
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

type DOMFeatures<T extends ElementBase>
    = DOMBase<T>
    & DOMAttributes<T>
    & DOMTraversing<T>
    & DOMManipulation<T>
    & DOMStyles<T>
    & DOMEvents<T>
    & DOMScroll<T>
    & DOMEffects<T>;

/**
 * @en {@link DOM} plugin method definition.
 * @ja {@link DOM} プラグインメソッド定義
 *
 * @note
 *  - プラグイン拡張定義はこのインターフェイスマージする.
 *  - TypeScript 3.7 時点で, module interface のマージは module の完全なパスを必要とするため,
 *    本レポジトリでは bundle した `dist/dom.d.ts` を提供する.
 *
 * @see
 *  - https://github.com/microsoft/TypeScript/issues/33326
 *  - https://stackoverflow.com/questions/57848134/trouble-updating-an-interface-using-declaration-merging
 */
export interface DOMPlugin { } // eslint-disable-line @typescript-eslint/no-empty-interface

/**
 * @en This interface provides DOM operations like `jQuery` library.
 * @ja `jQuery` のようなDOM 操作を提供するインターフェイス
 */
export interface DOM<T extends ElementBase = HTMLElement> extends DOMFeatures<T>, DOMPlugin { }

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
     * @en Create {@link DOM} instance from `selector` arg.
     * @ja 指定された `selector` {@link DOM} インスタンスを作成
     *
     * @internal
     *
     * @param selector
     *  - `en` Object(s) or the selector string which becomes origin of {@link DOM}.
     *  - `ja` {@link DOM} のもとになるオブジェクト(群)またはセレクタ文字列
     * @param context
     *  - `en` Set using `Document` context. When being un-designating, a fixed value of the environment is used.
     *  - `ja` 使用する `Document` コンテキストを指定. 未指定の場合は環境の既定値が使用される.
     * @returns {@link DOM} instance.
     */
    public static create<T extends SelectorBase>(selector?: DOMSelector<T>, context?: QueryContext | null): DOMResult<T> {
        if (selector && !context) {
            if (isDOMClass(selector)) {
                return selector as DOMResult<T>;
            }
        }
        return new DOMClass((elementify(selector as ElementifySeed<T>, context))) as unknown as DOMResult<T>;
    }
}

// mixin による `instanceof` は無効に設定
setMixClassAttribute(DOMClass as unknown as Class, 'instanceOf', null);

/**
 * @en Check the value-type is {@link DOM}.
 * @ja {@link DOM} 型であるか判定
 *
 * @param x
 *  - `en` evaluated value
 *  - `ja` 評価する値
 */
export function isDOMClass(x: unknown): x is DOM {
    return x instanceof DOMClass;
}
