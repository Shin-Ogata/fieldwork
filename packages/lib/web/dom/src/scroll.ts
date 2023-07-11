import {
    Nullish,
    isNumber,
    isFunction,
    classify,
    setMixClassAttribute,
} from '@cdp/core-utils';
import {
    isWindowContext,
    ensurePositiveNumber,
    swing,
} from './utils';
import { ElementBase } from './static';
import {
    DOMIterable,
    isNodeElement,
    isNodeHTMLOrSVGElement,
    isNodeDocument,
} from './base';
import { getOffsetSize } from './styles';
import { requestAnimationFrame } from './ssr';

/**
 * @en {@link DOM}`.scrollTo()` options definition.
 * @ja {@link DOM}`.scrollTo()` に指定するオプション定義
 */
export interface DOMScrollOptions {
    /**
     * @en the vertical scroll value by pixcels.
     * @ja 縦スクロール量をピクセルで指定
     */
    top?: number;

    /**
     * @en the horizontal scroll value by pixcels.
     * @ja 横スクロール量をピクセルで指定
     */
    left?: number;

    /**
     * @en the time to spend on scroll. [msec]
     * @ja スクロールに費やす時間 [msec]
     */
    duration?: number;

    /**
     * @en timing function default: 'swing'
     * @ja タイミング関数 既定値: 'swing'
     */
    easing?: 'linear' | 'swing' | ((progress: number) => number);

    /**
     * @en scroll completion callback.
     * @ja スクロール完了コールバック
     */
    callback?: () => void;
}

//__________________________________________________________________________________________________//

/** @internal query scroll target element */
function queryTargetElement(el: ElementBase | Nullish): Element | null {
    if (isNodeElement(el)) {
        return el;
    } else if (isNodeDocument(el)) {
        return el.documentElement;
    } else if (isWindowContext(el)) {
        return el.document.documentElement;
    } else {
        return null;
    }
}

/** @internal helper for `scrollTo()` */
function parseArgs(...args: unknown[]): DOMScrollOptions {
    const options: DOMScrollOptions = { easing: 'swing' };
    if (1 === args.length) {
        Object.assign(options, args[0]);
    } else {
        const [left, top, duration, easing, callback] = args;
        Object.assign(options, {
            top,
            left,
            duration,
            easing,
            callback,
        });
    }

    options.top      = ensurePositiveNumber(options.top);
    options.left     = ensurePositiveNumber(options.left);
    options.duration = ensurePositiveNumber(options.duration);

    return options;
}

/** @internal helper for `scrollTo()` */
function execScroll(el: HTMLElement | SVGElement, options: DOMScrollOptions): void {
    const { top, left, duration, easing, callback } = options;

    const initialTop = el.scrollTop;
    const initialLeft = el.scrollLeft;
    let enableTop = isNumber(top);
    let enableLeft = isNumber(left);

    // non animation case
    if (!duration) {
        let notify = false;
        if (enableTop && top !== initialTop) {
            el.scrollTop = top!;
            notify = true;
        }
        if (enableLeft && left !== initialLeft) {
            el.scrollLeft = left!;
            notify = true;
        }
        if (notify && isFunction(callback)) {
            callback();
        }
        return;
    }

    const calcMetrics = (enable: boolean, base: number, initialValue: number, type: 'width' | 'height'): { max: number; new: number; initial: number; } => {
        if (!enable) {
            return { max: 0, new: 0, initial: 0 };
        }
        const maxValue = (el as unknown as Record<string, number>)[`scroll${classify(type)}`] - getOffsetSize(el, type);
        const newValue = Math.max(Math.min(base, maxValue), 0);
        return { max: maxValue, new: newValue, initial: initialValue };
    };

    const metricsTop = calcMetrics(enableTop, top!, initialTop, 'height');
    const metricsLeft = calcMetrics(enableLeft, left!, initialLeft, 'width');

    if (enableTop && metricsTop.new === metricsTop.initial) {
        enableTop = false;
    }
    if (enableLeft && metricsLeft.new === metricsLeft.initial) {
        enableLeft = false;
    }
    if (!enableTop && !enableLeft) {
        // need not to scroll
        return;
    }

    const calcProgress = (value: number): number => {
        if (isFunction(easing)) {
            return easing(value);
        } else {
            return 'linear' === easing ? value : swing(value);
        }
    };

    const delta = { top: 0, left: 0 };
    const startTime = Date.now();

    const animate = (): void => {
        const elapse = Date.now() - startTime;
        const progress = Math.max(Math.min(elapse / duration, 1), 0);
        const progressCoeff = calcProgress(progress);

        // update delta
        if (enableTop) {
            delta.top = metricsTop.initial + (progressCoeff * (metricsTop.new - metricsTop.initial));
        }
        if (enableLeft) {
            delta.left = metricsLeft.initial + (progressCoeff * (metricsLeft.new - metricsLeft.initial));
        }

        // check done
        if ((enableTop && metricsTop.new > metricsTop.initial && delta.top >= metricsTop.new)       || // scroll down
            (enableTop && metricsTop.new < metricsTop.initial && delta.top <= metricsTop.new)       || // scroll up
            (enableLeft && metricsLeft.new > metricsLeft.initial && delta.left >= metricsLeft.new)  || // scroll right
            (enableLeft && metricsLeft.new < metricsLeft.initial && delta.left <= metricsLeft.new)     // scroll left
        ) {
            // ensure destination
            enableTop && (el.scrollTop = metricsTop.new);
            enableLeft && (el.scrollLeft = metricsLeft.new);
            if (isFunction(callback)) {
                callback();
            }
            // release reference immediately.
            el = null!;
            return;
        }

        // update scroll position
        enableTop && (el.scrollTop = delta.top);
        enableLeft && (el.scrollLeft = delta.left);

        requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
}

//__________________________________________________________________________________________________//

/**
 * @en Mixin base class which concentrated the manipulation methods.
 * @ja スクロールメソッドを集約した Mixin Base クラス
 */
export class DOMScroll<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// imprements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]!: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public: Scroll

    /**
     * @en Get the number of pixels vertical scrolled.
     * @ja 縦方向スクロールされたピクセル数を取得
     */
    public scrollTop(): number;

    /**
     * @en Set the number of pixels vertical scrolled.
     * @ja 縦方向スクロールするピクセル数を指定
     *
     * @param position
     *  - `en` the scroll value by pixcels.
     *  - `ja` スクロール量をピクセルで指定
     * @param duration
     *  - `en` the time to spend on scroll. [msec]
     *  - `ja` スクロールに費やす時間 [msec]
     * @param easing
     *  - `en` timing function default: 'swing'
     *  - `ja` タイミング関数 既定値: 'swing'
     * @param callback
     *  - `en` scroll completion callback.
     *  - `ja` スクロール完了コールバック
     */
    public scrollTop(
        position: number,
        duration?: number,
        easing?: 'linear' | 'swing' | ((progress: number) => number),
        callback?: () => void
    ): this;

    public scrollTop(
        position?: number,
        duration?: number,
        easing?: 'linear' | 'swing' | ((progress: number) => number),
        callback?: () => void
    ): number | this {
        if (null == position) {
            // getter
            const el = queryTargetElement(this[0]);
            return el ? el.scrollTop : 0;
        } else {
            // setter
            return this.scrollTo({
                top: position,
                duration,
                easing,
                callback,
            });
        }
    }

    /**
     * @en Get the number of pixels horizontal scrolled.
     * @ja 横方向スクロールされたピクセル数を取得
     */
    public scrollLeft(): number;

    /**
     * @en Set the number of pixels horizontal scrolled.
     * @ja 横方向スクロールするピクセル数を指定
     *
     * @param position
     *  - `en` the scroll value by pixcels.
     *  - `ja` スクロール量をピクセルで指定
     * @param duration
     *  - `en` the time to spend on scroll. [msec]
     *  - `ja` スクロールに費やす時間 [msec]
     * @param easing
     *  - `en` timing function default: 'swing'
     *  - `ja` タイミング関数 既定値: 'swing'
     * @param callback
     *  - `en` scroll completion callback.
     *  - `ja` スクロール完了コールバック
     */
    public scrollLeft(
        position: number,
        duration?: number,
        easing?: 'linear' | 'swing' | ((progress: number) => number),
        callback?: () => void
    ): this;

    public scrollLeft(
        position?: number,
        duration?: number,
        easing?: 'linear' | 'swing' | ((progress: number) => number),
        callback?: () => void
    ): number | this {
        if (null == position) {
            // getter
            const el = queryTargetElement(this[0]);
            return el ? el.scrollLeft : 0;
        } else {
            // setter
            return this.scrollTo({
                left: position,
                duration,
                easing,
                callback,
            });
        }
    }

    /**
     * @en Set the number of pixels vertical and horizontal scrolled.
     * @ja 縦横方向スクロールするピクセル数を指定
     *
     * @param x
     *  - `en` the horizontal scroll value by pixcels.
     *  - `ja` 横スクロール量をピクセルで指定
     * @param y
     *  - `en` the vertical scroll value by pixcels.
     *  - `ja` 縦スクロール量をピクセルで指定
     * @param duration
     *  - `en` the time to spend on scroll. [msec]
     *  - `ja` スクロールに費やす時間 [msec]
     * @param easing
     *  - `en` timing function default: 'swing'
     *  - `ja` タイミング関数 既定値: 'swing'
     * @param callback
     *  - `en` scroll completion callback.
     *  - `ja` スクロール完了コールバック
     */
    public scrollTo(
        x: number,
        y: number,
        duration?: number,
        easing?: 'linear' | 'swing' | ((progress: number) => number),
        callback?: () => void
    ): this;

    /**
     * @en Set the scroll values by optoins.
     * @ja オプションを用いてスクロール指定
     */
    public scrollTo(options: DOMScrollOptions): this;

    public scrollTo(...args: unknown[]): this {
        const options = parseArgs(...args);
        for (const el of this) {
            const elem = queryTargetElement(el);
            if (isNodeHTMLOrSVGElement(elem)) {
                execScroll(elem, options);
            }
        }
        return this;
    }
}

setMixClassAttribute(DOMScroll, 'protoExtendsOnly');
