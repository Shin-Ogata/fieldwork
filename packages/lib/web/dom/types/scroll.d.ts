import { ElementBase } from './static';
import { DOMIterable } from './base';
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
/**
 * @en Mixin base class which concentrated the manipulation methods.
 * @ja スクロールメソッドを集約した Mixin Base クラス
 */
export declare class DOMScroll<TElement extends ElementBase> implements DOMIterable<TElement> {
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
    /**
     * @en Get the number of pixels vertical scrolled.
     * @ja 縦方向スクロールされたピクセル数を取得
     */
    scrollTop(): number;
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
    scrollTop(position: number, duration?: number, easing?: 'linear' | 'swing' | ((progress: number) => number), callback?: () => void): this;
    /**
     * @en Get the number of pixels horizontal scrolled.
     * @ja 横方向スクロールされたピクセル数を取得
     */
    scrollLeft(): number;
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
    scrollLeft(position: number, duration?: number, easing?: 'linear' | 'swing' | ((progress: number) => number), callback?: () => void): this;
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
    scrollTo(x: number, y: number, duration?: number, easing?: 'linear' | 'swing' | ((progress: number) => number), callback?: () => void): this;
    /**
     * @en Set the scroll values by optoins.
     * @ja オプションを用いてスクロール指定
     */
    scrollTo(options: DOMScrollOptions): this;
}
