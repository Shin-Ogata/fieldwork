import {
    PlainObject,
    isString,
    isArray,
    classify,
    dasherize,
    setMixClassAttribute,
} from '@cdp/core-utils';
import { ElementBase } from './static';
import {
    DOMIterable,
    isNodeHTMLOrSVGElement,
    isTypeHTMLOrSVGElement,
    isTypeDocument,
    isTypeWindow,
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

const _resolver = {
    width: ['left', 'right'],
    height: ['top', 'bottom'],
};

/** @internal helper for `width()` and `heigth()` */
function manageSizeFor<T extends ElementBase>(dom: DOMStyles<T>, type: 'width' | 'height', value?: number | string): number | DOMStyles<T> {
    if (null == value) {
        // getter
        if (isTypeWindow(dom)) {
            // スクロールバーを除いた幅 (clientWidth / clientHeight)
            return dom[0].document.documentElement[`client${classify(type)}`];
        } else if (isTypeDocument(dom)) {
            // (scroll$Width / scroll$Height)
            return dom[0].documentElement[`scroll${classify(type)}`];
        } else {
            const el = dom[0];
            if (isNodeHTMLOrSVGElement(el)) {
                const view = getComputedStyleView(el);
                const style = view.getComputedStyle(el);
                const size = parseFloat(style.getPropertyValue(type));
                if ('border-box' === style.getPropertyValue('box-sizing')) {
                    const border = parseFloat(style.getPropertyValue(`border-${_resolver[type][0]}-width`))
                        + parseFloat(style.getPropertyValue(`border-${_resolver[type][1]}-width`));
                    const padding = parseFloat(style.getPropertyValue(`padding-${_resolver[type][0]}`))
                        + parseFloat(style.getPropertyValue(`padding-${_resolver[type][1]}`));
                    return size - (border + padding);
                } else {
                    return size;
                }
            } else {
                return 0;
            }
        }
    } else {
        // setter
        return dom.css(type, isString(value) ? value : `${value}px`);
    }
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

    /**
     * @en Get the current computed width for the first element in the set of matched elements or set the width of every matched element.
     * @ja 最初の要素の計算済み横幅をピクセル単位で取得
     */
    public width(): number;

    /**
     * @en Set the CSS width of each element in the set of matched elements.
     * @ja 全ての要素の横幅を指定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     */
    public width(value: number | string): this;

    public width(value?: number | string): number | this {
        return manageSizeFor(this, 'width', value) as (number | this);
    }

    /**
     * @en Get the current computed height for the first element in the set of matched elements or set the width of every matched element.
     * @ja 最初の要素の計算済み立幅をピクセル単位で取得
     */
    public height(): number;

    /**
     * @en Set the CSS height of each element in the set of matched elements.
     * @ja 全ての要素の縦幅を指定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     */
    public height(value: number | string): this;

    public height(value?: number | string): number | this {
        return manageSizeFor(this, 'height', value) as (number | this);
    }
}

setMixClassAttribute(DOMStyles, 'protoExtendsOnly');

/*
[dom7]
.offset() // setOffset: sticky にも注意
.outerHeight()
.outerWidth()

[jquery]
.innerHeight()
.innerWidth()
.position()

-----
* innerWidth()

- get
  - 常に clientWidth

- set
  ※指定値が string のときは 一度設定して compute する
  - border-box
    width に 指定値 + border
  - content-box
    width に 指定値 - padding


* outerWidth()
- get
  - 基本 offsetWidth
    - includingMargin で + margin

- set
  ※指定値が string のときは 一度設定して compute する
  - border-box
    - includingMargin
       width に 指定値 - margin

  - content-box
    width に 指定値 - (border + padding)
    - includingMargin
       width に 指定値 - (border + padding + margin)

https://q-az.net/without-jquery-height-width-offset-scrolltop/

* position
{ left: el.offsetLeft, top: el.offsetTop } は嘘

{ left: el.offsetLeft - margin , top: el.offsetTop - margin }


* offset() コード量からして jQuery が優秀
  - set
    - relative
      - get した offset 値 に -指定値
    - absolute
 */
