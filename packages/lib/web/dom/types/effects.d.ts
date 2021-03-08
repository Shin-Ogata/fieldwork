import { ElementBase, DOM } from './static';
import { DOMIterable } from './base';
/**
 * @en [[DOM]] effect parameter.
 * @ja [[DOM]] エフェクト効果のパラメータ
 */
export declare type DOMEffectParameters = Keyframe[] | PropertyIndexedKeyframes | null;
/**
 * @en [[DOM]] effect options.
 * @ja [[DOM]] エフェクト効果のオプション
 */
export declare type DOMEffectOptions = number | KeyframeAnimationOptions;
/**
 * @en [[DOM]] effect context object.
 * @ja [[DOM]] のエフェクト効果のコンテキストオブジェクト
 */
export interface DOMEffectContext<TElement extends ElementBase> {
    /**
     * @en [[DOM]] instance that called [[animate]]() method.
     * @ja [[animate]]() メソッドを実行した [[DOM]] インスタンス
     */
    readonly dom: DOM<TElement>;
    /**
     * @en `Element` and `Animation` instance map by execution [[animate]]() method at this time.
     * @ja 今回実行した `Element` と `Animation` インスタンスのマップ
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
}
