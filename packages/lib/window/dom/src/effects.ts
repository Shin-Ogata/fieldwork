import { setMixClassAttribute } from '@cdp/core-utils';
import { ElementBase } from './static';
import { DOMIterable } from './base';

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
}

setMixClassAttribute(DOMEffects, 'noConstructor');
