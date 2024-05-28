import {
    Writable,
    setMixClassAttribute,
    noop,
} from '@cdp/core-utils';
import type { ElementBase, DOM } from './static';
import {
    DOMIterable,
    isNodeElement,
    isTypeElement,
} from './base';

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

//__________________________________________________________________________________________________//

/** @internal */ const _animContextMap = new WeakMap<Element, Set<Animation>>();

//__________________________________________________________________________________________________//

/**
 * @en Mixin base class which concentrated the animation/effect methods.
 * @ja アニメーション/エフェクト操作メソッドを集約した Mixin Base クラス
 */
export class DOMEffects<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// implements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]!: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public: Effects animation

    /**
     * @en Start animation by `Web Animation API`.
     * @ja `Web Animation API` を用いてアニメーションを実行
     */
    public animate(params: DOMEffectParameters, options: DOMEffectOptions): DOMEffectContext<TElement> {
        const result = {
            dom: this as DOMIterable<TElement> as DOM<TElement>,
            animations: new Map<TElement, Animation>(),
        } as Writable<DOMEffectContext<TElement>>;

        if (!isTypeElement(this)) {
            result.finished = Promise.resolve(result);
            return result;
        }

        for (const el of this) {
            if (isNodeElement(el)) {
                const anim = el.animate(params, options);
                const context = _animContextMap.get(el) ?? new Set();
                context.add(anim);
                _animContextMap.set(el, context);
                result.animations.set(el as Node as TElement, anim);
            }
        }

        result.finished = Promise.all([...result.animations.values()].map(anim => anim.finished)).then(() => result);

        return result;
    }

    /**
     * @en Cancel current running animation.
     * @ja 現在実行しているアニメーションを中止
     */
    public cancel(): this {
        if (isTypeElement(this)) {
            for (const el of this) {
                const context = _animContextMap.get(el as Element);
                if (context) {
                    for (const animation of context) {
                        animation.cancel();
                    }
                    _animContextMap.delete(el as Element);
                }
            }
        }
        return this;
    }

    /**
     * @en Finish current running animation.
     * @ja 現在実行しているアニメーションを終了
     */
    public finish(): this {
        if (isTypeElement(this)) {
            for (const el of this) {
                const context = _animContextMap.get(el as Element);
                if (context) {
                    for (const animation of context) {
                        animation.finish();
                    }
                    // finish では破棄しない
                }
            }
        }
        return this;
    }

///////////////////////////////////////////////////////////////////////
// public: Effects utility

    /**
     * @en Execute force reflow.
     * @ja 強制リフローを実行
     */
    public reflow(): this {
        if (this[0] instanceof HTMLElement) {
            for (const el of this as unknown as DOM)  {
                noop(el.offsetHeight);
            }
        }
        return this;
    }

    /**
     * @en Execute force repaint.
     * @ja 強制再描画を実行
     */
    public repaint(): this {
        if (this[0] instanceof HTMLElement) {
            for (const el of this as unknown as DOM)  {
                const current = el.style.display;
                el.style.display = 'none';
                el.style.display = current;
            }
        }
        return this;
    }
}

setMixClassAttribute(DOMEffects, 'protoExtendsOnly');
