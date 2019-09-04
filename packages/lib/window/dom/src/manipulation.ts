import { setMixClassAttribute } from '@cdp/core-utils';
import { ElementBase } from './static';
import { DOMIterable } from './base';

/**
 * @en Mixin base class which concentrated the manipulation methods.
 * @ja マニピュレーションメソッドを集約した Mixin Base クラス
 */
export class DOMManipulation<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// imprements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;
}

setMixClassAttribute(DOMManipulation, 'noConstructor');

// TODO:
    //transform,
    //transition,
    //width,
    //outerWidth,
    //height,
    //outerHeight,
    //offset,
    //hide, <- やらない?
    //show, <- やらない?
    //styles,
    //css,
    //toArray,
    //each,
    //forEach,
    //filter,
    //map,
    //html,
    //text,
    //indexOf,
    //index,
    //eq,
    //append,
    //appendTo,
    //prepend,
    //prependTo,
    //insertBefore,
    //insertAfter,
    //next,
    //nextAll,
    //prev,
    //prevAll,
    //siblings,
    //closest,
    //find,
    //children,
    //remove,
    //detach,
    //add,
    //empty,

/////

// contents
// position
// scrollTop (window) <- scroll (pr2)
// clone
// wrap
// unwrap
// replaceWith
// fade, fadeIn, fadeOut, fadeTo, fadeToggle <- animation (pr3)
// slideUp, slideDown, slideToggle <- やらない

///

// first
// has
// last
// innerHeight
// innerWidth
// nextUntil
// offsetParent
// outerHeight
// outerWidth
// prevUntil
// replaceAll
// wrapAll
// wrapInner
