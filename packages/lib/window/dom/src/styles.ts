import {
    PlainObject,
    isString,
    isArray,
    dasherize,
    setMixClassAttribute,
} from '@cdp/core-utils';
import { ElementBase } from './static';
import {
    DOMIterable,
    isNodeHTMLOrSVGElement,
    isTypeHTMLOrSVGElement,
} from './base';
import { window } from './ssr';

/** @internal helper for `css()` */
function ensureChainCaseProperies(props: PlainObject<string>): PlainObject<string> {
    const retval = {};
    for (const key in props) {
        retval[dasherize(key)] = props[key];
    }
    return retval;
}

/** @internal helper for `css()` get props */
function getComputedStyleView(el: Element): Window {
    return (el.ownerDocument && el.ownerDocument.defaultView) || window;
}

/**
 * @en Mixin base class which concentrated the style management methods.
 * @ja スタイル関連メソッドを集約した Mixin Base クラス
 */
export class DOMStyles<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// imprements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public: Styles

    /**
     * @en Get the computed style properties for the first element in the set of matched elements.
     * @ja 先頭要素の CSS に設定されているプロパティ値を取得
     *
     * @param name
     *  - `en` CSS property name as chain-cace.
     *  - `ja` CSS プロパティ名をチェインケースで指定
     * @returns
     *  - `en` CSS property value string.
     *  - `ja` CSS プロパティ値を文字列で返却
     */
    public css(name: string): string;

    /**
     * @en Get the multiple computed style properties for the first element in the set of matched elements.
     * @ja 先頭要素の CSS に設定されているプロパティ値を複数取得
     *
     * @param names
     *  - `en` CSS property name array as chain-cace.
     *  - `ja` CSS プロパティ名配列をチェインケースで指定
     * @returns
     *  - `en` CSS property-value object.
     *  - `ja` CSS プロパティを格納したオブジェクト
     */
    public css(names: string[]): PlainObject<string>;

    /**
     * @en Set CSS propertiy for the set of matched elements.
     * @ja 要素の CSS プロパティに値を設定
     *
     * @param name
     *  - `en` CSS property name as chain-cace.
     *  - `ja` CSS プロパティ名をチェインケースで指定
     * @param value
     *  - `en` string value to set for the property.
     *  - `ja` 設定する値を文字列で指定
     */
    public css(name: string, value: string): this;

    /**
     * @en Set one or more CSS properties for the set of matched elements.
     * @ja 要素の CSS 複数のプロパティに値を設定
     *
     * @param properties
     *  - `en` An object of property-value pairs to set.
     *  - `ja` CSS プロパティを格納したオブジェクト
     */
    public css(properties: PlainObject<string>): this;

    public css(name: string | string[] | PlainObject<string>, value?: string): string | PlainObject<string> | this {
        // valid elements
        if (!isTypeHTMLOrSVGElement(this)) {
            if (isString(name)) {
                return null == value ? '' : this;
            } else if (isArray(name)) {
                return {} as PlainObject<string>;
            } else {
                return this;
            }
        }

        if (isString(name)) {
            if (null == value) {
                // get property single
                const el = this[0] as Element;
                const view = getComputedStyleView(el);
                return view.getComputedStyle(el).getPropertyValue(dasherize(name));
            } else {
                // set property single
                for (const el of this) {
                    if (isNodeHTMLOrSVGElement(el)) {
                        el.style.setProperty(dasherize(name), value);
                    }
                }
                return this;
            }
        } else if (isArray(name)) {
            // get multiple properties
            const el = this[0] as Element;
            const view = getComputedStyleView(el);
            const props = {} as PlainObject<string>;
            for (const key of name) {
                const propName = dasherize(key);
                props[propName] = view.getComputedStyle(el).getPropertyValue(propName);
            }
            return props;
        } else {
            // set multiple properties
            const props = ensureChainCaseProperies(name);
            for (const el of this) {
                if (isNodeHTMLOrSVGElement(el)) {
                    const { style } = el;
                    for (const propName in props) {
                        style.setProperty(propName, props[propName]);
                    }
                }
            }
            return this;
        }
    }
}

setMixClassAttribute(DOMStyles, 'protoExtendsOnly');

/*
[dom7]
.width()
.height()
.offset()
.outerHeight()
.outerWidth()

[jquery]
.innerHeight()
.innerWidth()
.position()
.offsetParent()
 */
