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

///////////////////////////////////////////////////////////////////////
// public: Insertion, Inside

///////////////////////////////////////////////////////////////////////
// public: Insertion, Outside

///////////////////////////////////////////////////////////////////////
// public: Insertion, Around

///////////////////////////////////////////////////////////////////////
// public: Removal

///////////////////////////////////////////////////////////////////////
// public: Replacement
}

setMixClassAttribute(DOMManipulation, 'protoExtendsOnly');

/*
[dom7]
// DOM Insertion, Inside
.append()
.appendTo()
.html()
.prepend()
.prependTo()
.text()
// DOM Insertion, Outside
.after()
.before()
.insertAfter()
.insertBefore()
// DOM Removal
.detach()
.empty()
.remove()

[jquery]
// DOM Insertion, Around
.unwrap()
.wrap()
.wrapAll()
.wrapInner()
// DOM Replacement
.replaceAll()
.replaceWith()
 */
