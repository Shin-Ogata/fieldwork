import { setMixClassAttribute } from '@cdp/core-utils';
import { ElementBase } from './static';
import {
    DOMIterable,
    isNodeElement,
    isTypeElement,
} from './base';

/**
 * @en [[DOM]] effect parameter.
 * @ja [[DOM]] エフェクト効果のパラメータ
 */
export type DOMEffectParameters = Keyframe[] | PropertyIndexedKeyframes | null;

/**
 * @en [[DOM]] effect options.
 * @ja [[DOM]] エフェクト効果のオプション
 */
export type DOMEffectOptions = number | KeyframeAnimationOptions;

/**
 * @en [[DOM]] effect context object.
 * @ja [[DOM]] のエフェクト効果のコンテキストオブジェクト
 */
export interface DOMEffectContext<TElement extends ElementBase> {
    element: TElement;
    animation: Animation;
}

//__________________________________________________________________________________________________//

/** @internal */
const _animContextMap = new WeakMap<Element, Animation>();

//__________________________________________________________________________________________________//

/**
 * @en Mixin base class which concentrated the animation/effect methods.
 * @ja アニメーション/エフェクト操作メソッドを集約した Mixin Base クラス
 */
export class DOMEffects<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// imprements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public: Effects

    /**
     * @en Start animation by `Web Animation API`.
     * @ja `Web Animation API` を用いてアニメーションを実行
     */
    public animate(params: DOMEffectParameters, options: DOMEffectOptions): DOMEffectContext<TElement>[] {
        if (!isTypeElement(this)) {
            return [];
        }

        const contexts = new Map<Element, DOMEffectContext<TElement>>();
        for (const el of this) {
            if (isNodeElement(el)) {
                const anim = el.animate(params, options);
                _animContextMap.set(el, anim);
                contexts.set(el, { element: el as Node as TElement, animation: anim });
            }
        }

        return [...contexts.values()];
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
                    context.cancel();
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
                    // finish では破棄しない
                    context.finish();
                }
            }
        }
        return this;
    }
}

setMixClassAttribute(DOMEffects, 'protoExtendsOnly');
