import type { ElementBase, DOM } from './static';
import { type DOMIterable } from './base';
/**
 * @en {@link DOM} effect parameter.
 * @ja {@link DOM} エフェクト効果のパラメータ
 */
export type DOMEffectParameters = Keyframe[] | PropertyIndexedKeyframes | null;
/**
 * @en {@link DOM} effect options.
 * @ja {@link DOM} エフェクト効果のオプション
 */
export type DOMEffectOptions = number | KeyframeAnimationOptions;
/**
 * @en {@link DOM} effect context object.
 * @ja {@link DOM} のエフェクト効果のコンテキストオブジェクト
 */
export interface DOMEffectContext<TElement extends ElementBase> {
    /**
     * @en {@link DOM} instance that called {@link DOMEffects.animate | animate}() method.
     * @ja {@link DOMEffects.animate | animate}() メソッドを実行した {@link DOM} インスタンス
     */
    readonly dom: DOM<TElement>;
    /**
     * @en `Element` and `Animation` instance map by execution {@link DOMEffects.animate | animate}() method at this time.
     * @ja 今回 {@link DOMEffects.animate | animate}() 実行した `Element` と `Animation` インスタンスのマップ
     */
    readonly animations: Map<TElement, Animation>;
    /**
     * @en The current finished Promise for this animation.
     * @ja 対象アニメーションの終了時に発火する `Promise` オブジェクト
     */
    readonly finished: Promise<DOMEffectContext<TElement>>;
}
/**
 * @en Mixin base class which concentrated the animation/effect methods.
 * @ja アニメーション/エフェクト操作メソッドを集約した Mixin Base クラス
 */
export declare class DOMEffects<TElement extends ElementBase> implements DOMIterable<TElement> {
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
    /**
     * @en Start animation by `Web Animation API`.
     * @ja `Web Animation API` を用いてアニメーションを実行
     */
    animate(params: DOMEffectParameters, options: DOMEffectOptions): DOMEffectContext<TElement>;
    /**
     * @en Cancel current running animation.
     * @ja 現在実行しているアニメーションを中止
     */
    cancel(): this;
    /**
     * @en Finish current running animation.
     * @ja 現在実行しているアニメーションを終了
     */
    finish(): this;
    /**
     * @en Execute force reflow.
     * @ja 強制リフローを実行
     */
    reflow(): this;
    /**
     * @en Execute force repaint.
     * @ja 強制再描画を実行
     */
    repaint(): this;
}
