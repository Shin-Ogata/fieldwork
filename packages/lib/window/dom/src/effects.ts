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

///////////////////////////////////////////////////////////////////////
// public: Effects
}

setMixClassAttribute(DOMEffects, 'protoExtendsOnly');

/*
[dom7]
.animate()
.stop()
.show()
.hide()
.transform()
.transition()

[jquery]
.clearQueue()   // 未定
.delay()        // 未定
.dequeue()      // 未定
.fadeIn()
.fadeOut()
.fadeTo()
.fadeToggle()
.finish()       // 未定
.queue()        // 未定
.slideDown()    // やらない
.slideToggle()  // やらない
.slideUp()      // やらない
.toggle()       // やらない?
 */
