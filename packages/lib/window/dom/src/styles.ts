/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    PlainObject,
    isString,
    isNumber,
    isArray,
    classify,
    dasherize,
    setMixClassAttribute,
} from '@cdp/core-utils';
import {
    ElementBase,
    dom as $,
} from './static';
import {
    DOMIterable,
    isNodeHTMLOrSVGElement,
    isTypeHTMLOrSVGElement,
    isTypeDocument,
    isTypeWindow,
    getOffsetParent,
} from './base';
import { window } from './ssr';

/** @internal helper for `css()` */
function ensureChainCaseProperies(props: PlainObject<string | null>): PlainObject<string | null> {
    const retval = {};
    for (const key in props) {
        retval[dasherize(key)] = props[key];
    }
    return retval;
}

/** @internal helper for `css()` get props */
function getDefaultView(el: Element): Window {
    return (el.ownerDocument && el.ownerDocument.defaultView) || window;
}

/** @internal helper for `css()` get props */
function getComputedStyleFrom(el: Element): CSSStyleDeclaration {
    const view = getDefaultView(el);
    return view.getComputedStyle(el);
}

/** @internal helper for css value to number */
function toNumber(val: string): number {
    return parseFloat(val) || 0;
}

const _resolver = {
    width: ['left', 'right'],
    height: ['top', 'bottom'],
};

/** @internal helper for size calcution */
function getPadding(style: CSSStyleDeclaration, type: 'width' | 'height'): number {
    return toNumber(style.getPropertyValue(`padding-${_resolver[type][0]}`))
         + toNumber(style.getPropertyValue(`padding-${_resolver[type][1]}`));
}

/** @internal helper for size calcution */
function getBorder(style: CSSStyleDeclaration, type: 'width' | 'height'): number {
    return toNumber(style.getPropertyValue(`border-${_resolver[type][0]}-width`))
         + toNumber(style.getPropertyValue(`border-${_resolver[type][1]}-width`));
}

/** @internal helper for size calcution */
function getMargin(style: CSSStyleDeclaration, type: 'width' | 'height'): number {
    return toNumber(style.getPropertyValue(`margin-${_resolver[type][0]}`))
         + toNumber(style.getPropertyValue(`margin-${_resolver[type][1]}`));
}

/** @internal helper for `width()` and `heigth()` */
function manageSizeFor<T extends ElementBase>(dom: DOMStyles<T>, type: 'width' | 'height', value?: number | string): number | DOMStyles<T> {
    if (null == value) {
        // getter
        if (isTypeWindow(dom)) {
            // スクロールバーを除いた幅 (clientWidth / clientHeight)
            return dom[0].document.documentElement[`client${classify(type)}`];
        } else if (isTypeDocument(dom)) {
            // (scrollWidth / scrollHeight)
            return dom[0].documentElement[`scroll${classify(type)}`];
        } else {
            const el = dom[0];
            if (isNodeHTMLOrSVGElement(el)) {
                const style = getComputedStyleFrom(el);
                const size = toNumber(style.getPropertyValue(type));
                if ('border-box' === style.getPropertyValue('box-sizing')) {
                    return size - (getBorder(style, type) + getPadding(style, type));
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

/** @internal helper for `innerWidth()` and `innerHeigth()` */
function manageInnerSizeFor<T extends ElementBase>(dom: DOMStyles<T>, type: 'width' | 'height', value?: number | string): number | DOMStyles<T> {
    if (null == value) {
        // getter
        if (isTypeWindow(dom) || isTypeDocument(dom)) {
            return manageSizeFor(dom as DOMStyles<T>, type);
        } else {
            const el = dom[0];
            if (isNodeHTMLOrSVGElement(el)) {
                // (clientWidth / clientHeight)
                return el[`client${classify(type)}`];
            } else {
                return 0;
            }
        }
    } else if (isTypeWindow(dom) || isTypeDocument(dom)) {
        // setter (no reaction)
        return dom;
    } else {
        // setter
        const isTextProp = isString(value);
        for (const el of dom) {
            if (isNodeHTMLOrSVGElement(el)) {
                const { style, newVal } = (() => {
                    if (isTextProp) {
                        el.style.setProperty(type, value as string);
                    }
                    const style = getComputedStyleFrom(el);
                    const newVal = isTextProp ? toNumber(style.getPropertyValue(type)) : value as number;
                    return { style, newVal };
                })();
                if ('border-box' === style.getPropertyValue('box-sizing')) {
                    el.style.setProperty(type, `${newVal + getBorder(style, type)}px`);
                } else {
                    el.style.setProperty(type, `${newVal - getPadding(style, type)}px`);
                }
            }
        }
        return dom;
    }
}

/** @internal helper for `outerWidth()` and `outerHeigth()` */
function parseOuterSizeArgs(...args: any[]): { includeMargin: boolean; value: number | string; } {
    let [value, includeMargin] = args;
    if (!isNumber(value) && !isString(value)) {
        includeMargin = !!value;
        value = undefined;
    }
    return { includeMargin, value };
}

/** @internal helper for `outerWidth()` and `outerHeigth()` */
function manageOuterSizeFor<T extends ElementBase>(dom: DOMStyles<T>, type: 'width' | 'height', includeMargin: boolean, value?: number | string): number | DOMStyles<T> {
    if (null == value) {
        // getter
        if (isTypeWindow(dom)) {
            // スクロールバーを含めた幅 (innerWidth / innerHeight)
            return dom[0][`inner${classify(type)}`];
        } else if (isTypeDocument(dom)) {
            return manageSizeFor(dom as DOMStyles<T>, type);
        } else {
            const el = dom[0];
            if (isNodeHTMLOrSVGElement(el)) {
                // (offsetWidth / offsetHeight)
                const offset = getOffsetSize(el, type);
                if (includeMargin) {
                    const style = getComputedStyleFrom(el);
                    return offset + getMargin(style, type);
                } else {
                    return offset;
                }
            } else {
                return 0;
            }
        }
    } else if (isTypeWindow(dom) || isTypeDocument(dom)) {
        // setter (no reaction)
        return dom;
    } else {
        // setter
        const isTextProp = isString(value);
        for (const el of dom) {
            if (isNodeHTMLOrSVGElement(el)) {
                const { style, newVal } = (() => {
                    if (isTextProp) {
                        el.style.setProperty(type, value as string);
                    }
                    const style = getComputedStyleFrom(el);
                    const margin = includeMargin ? getMargin(style, type) : 0;
                    const newVal = (isTextProp ? toNumber(style.getPropertyValue(type)) : value as number) - margin;
                    return { style, newVal };
                })();
                if ('content-box' === style.getPropertyValue('box-sizing')) {
                    el.style.setProperty(type, `${newVal - getBorder(style, type) - getPadding(style, type)}px`);
                } else {
                    el.style.setProperty(type, `${newVal}px`);
                }
            }
        }
        return dom;
    }
}

/** @internal helper for `position()` and `offset()` */
function getOffsetPosition(el: Element): { top: number; left: number; } {
    // for display none
    if (el.getClientRects().length <= 0) {
        return { top: 0, left: 0 };
    }

    const rect = el.getBoundingClientRect();
    const view = getDefaultView(el);
    return {
        top: rect.top + view.pageYOffset,
        left: rect.left + view.pageXOffset
    };
}

/**
 * @en Get offset[Width | Height]. This function will work SVGElement, too.
 * @ja offse[Width | Height] の取得. SVGElement にも適用可能
 */
export function getOffsetSize(el: HTMLOrSVGElement, type: 'width' | 'height'): number {
    if (null != (el as HTMLElement).offsetWidth) {
        // (offsetWidth / offsetHeight)
        return el[`offset${classify(type)}`];
    } else {
        /*
         * [NOTE] SVGElement は offsetWidth がサポートされない
         *        getBoundingClientRect() は transform に影響を受けるため,
         *        定義通り border, paddin を含めた値を算出する
         */
        const style = getComputedStyleFrom(el as SVGElement);
        const size = toNumber(style.getPropertyValue(type));
        if ('content-box' === style.getPropertyValue('box-sizing')) {
            return size + getBorder(style, type) + getPadding(style, type);
        } else {
            return size;
        }
    }
}

//__________________________________________________________________________________________________//

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
     *  - `en` string value to set for the property. if null passed, remove property.
     *  - `ja` 設定する値を文字列で指定. null 指定で削除.
     */
    public css(name: string, value: string | null): this;

    /**
     * @en Set one or more CSS properties for the set of matched elements.
     * @ja 要素の CSS 複数のプロパティに値を設定
     *
     * @param properties
     *  - `en` An object of property-value pairs to set.
     *  - `ja` CSS プロパティを格納したオブジェクト
     */
    public css(properties: PlainObject<string | null>): this;

    public css(name: string | string[] | PlainObject<string | null>, value?: string | null): string | PlainObject<string> | this {
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
            if (undefined === value) {
                // get property single
                const el = this[0] as Element;
                return getComputedStyleFrom(el).getPropertyValue(dasherize(name));
            } else {
                // set property single
                const propName = dasherize(name);
                const remove = (null === value);
                for (const el of this) {
                    if (isNodeHTMLOrSVGElement(el)) {
                        if (remove) {
                            el.style.removeProperty(propName);
                        } else {
                            el.style.setProperty(propName, value);
                        }
                    }
                }
                return this;
            }
        } else if (isArray(name)) {
            // get multiple properties
            const el = this[0] as Element;
            const view = getDefaultView(el);
            const props = {} as PlainObject<string>;
            for (const key of name) {
                const propName = dasherize(key);
                props[key] = view.getComputedStyle(el).getPropertyValue(propName);
            }
            return props;
        } else {
            // set multiple properties
            const props = ensureChainCaseProperies(name);
            for (const el of this) {
                if (isNodeHTMLOrSVGElement(el)) {
                    const { style } = el;
                    for (const propName in props) {
                        if (null === props[propName]) {
                            style.removeProperty(propName);
                        } else {
                            style.setProperty(propName, props[propName]);
                        }
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
     * @ja 配下の要素の横幅を指定
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
     * @ja 配下の要素の縦幅を指定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     */
    public height(value: number | string): this;

    public height(value?: number | string): number | this {
        return manageSizeFor(this, 'height', value) as (number | this);
    }

    /**
     * @en Get the current computed inner width for the first element in the set of matched elements, including padding but not border.
     * @ja 最初の要素の内部横幅(borderは除き、paddingは含む)を取得
     */
    public innerWidth(): number;

    /**
     * @en Set the CSS inner width of each element in the set of matched elements.
     * @ja 配下の要素の内部横幅(borderは除き、paddingは含む)を設定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     */
    public innerWidth(value: number | string): this;

    public innerWidth(value?: number | string): number | this {
        return manageInnerSizeFor(this, 'width', value) as (number | this);
    }

    /**
     * @en Get the current computed inner height for the first element in the set of matched elements, including padding but not border.
     * @ja 最初の要素の内部縦幅(borderは除き、paddingは含む)を取得
     */
    public innerHeight(): number;

    /**
     * @en Set the CSS inner height of each element in the set of matched elements.
     * @ja 配下の要素の内部縦幅(borderは除き、paddingは含む)を設定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     */
    public innerHeight(value: number | string): this;

    public innerHeight(value?: number | string): number | this {
        return manageInnerSizeFor(this, 'height', value) as (number | this);
    }

    /**
     * @en Get the current computed outer width (including padding, border, and optionally margin) for the first element in the set of matched elements.
     * @ja 最初の要素の外部横幅(border、paddingを含む)を取得. オプション指定によりマージン領域を含めたものも取得可
     *
     * @param includeMargin
     *  - `en` A Boolean indicating whether to include the element's margin in the calculation.
     *  - `ja` マージン領域を含める場合は true を指定
     */
    public outerWidth(includeMargin?: boolean): number;

    /**
     * @en Set the CSS outer width of each element in the set of matched elements.
     * @ja 配下の要素の外部横幅(border、paddingを含む)を設定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     * @param includeMargin
     *  - `en` A Boolean indicating whether to include the element's margin in the calculation.
     *  - `ja` マージン領域を含める場合は true を指定
     */
    public outerWidth(value: number | string, includeMargin?: boolean): this;

    public outerWidth(...args: any[]): number | this {
        const { includeMargin, value } = parseOuterSizeArgs(...args);
        return manageOuterSizeFor(this, 'width', includeMargin, value) as (number | this);
    }

    /**
     * @en Get the current computed outer height (including padding, border, and optionally margin) for the first element in the set of matched elements.
     * @ja 最初の要素の外部縦幅(border、paddingを含む)を取得. オプション指定によりマージン領域を含めたものも取得可
     *
     * @param includeMargin
     *  - `en` A Boolean indicating whether to include the element's margin in the calculation.
     *  - `ja` マージン領域を含める場合は true を指定
     */
    public outerHeight(includeMargin?: boolean): number;

    /**
     * @en Set the CSS outer height of each element in the set of matched elements.
     * @ja 配下の要素の外部縦幅(border、paddingを含む)を設定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     * @param includeMargin
     *  - `en` A Boolean indicating whether to include the element's margin in the calculation.
     *  - `ja` マージン領域を含める場合は true を指定
     */
    public outerHeight(value: number | string, includeMargin?: boolean): this;

    public outerHeight(...args: any[]): number | this {
        const { includeMargin, value } = parseOuterSizeArgs(...args);
        return manageOuterSizeFor(this, 'height', includeMargin, value) as (number | this);
    }

    /**
     * @en Get the current coordinates of the first element in the set of matched elements, relative to the offset parent.
     * @ja 最初の要素の親要素からの相対的な表示位置を返却
     */
    public position(): { top: number; left: number; } {
        // valid elements
        if (!isTypeHTMLOrSVGElement(this)) {
            return { top: 0, left: 0 };
        }

        let offset: { top: number; left: number; };
        let parentOffset = { top: 0, left: 0 };
        const el = this[0];
        const { position, marginTop: mt, marginLeft: ml } = $(el).css(['position', 'marginTop', 'marginLeft']);
        const marginTop = toNumber(mt);
        const marginLeft = toNumber(ml);

        // position:fixed elements are offset from the viewport, which itself always has zero offset
        if ('fixed' === position) {
            // Assume position:fixed implies availability of getBoundingClientRect
            offset = el.getBoundingClientRect();
        } else {
            offset = getOffsetPosition(el);

            // Account for the *real* offset parent, which can be the document or its root element
            // when a statically positioned element is identified
            const doc = el.ownerDocument as Document;
            let offsetParent = getOffsetParent(el) || doc.documentElement;
            let $offsetParent = $(offsetParent);
            while (offsetParent &&
                (offsetParent === doc.body || offsetParent === doc.documentElement) &&
                'static' === $offsetParent.css('position')
            ) {
                offsetParent = offsetParent.parentNode as Element;
                $offsetParent = $(offsetParent);
            }
            if (offsetParent && offsetParent !== el && Node.ELEMENT_NODE === offsetParent.nodeType) {
                // Incorporate borders into its offset, since they are outside its content origin
                parentOffset = getOffsetPosition(offsetParent);
                const { borderTopWidth, borderLeftWidth } = $offsetParent.css(['borderTopWidth', 'borderLeftWidth']);
                parentOffset.top += toNumber(borderTopWidth);
                parentOffset.left += toNumber(borderLeftWidth);
            }
        }

        // Subtract parent offsets and element margins
        return {
            top: offset.top - parentOffset.top - marginTop,
            left: offset.left - parentOffset.left - marginLeft,
        };
    }

    /**
     * @en Get the current coordinates of the first element in the set of matched elements, relative to the document.
     * @ja document を基準として, マッチしている要素集合の1つ目の要素の現在の座標を取得
     */
    public offset(): { top: number; left: number; };

    /**
     * @en Set the current coordinates of every element in the set of matched elements, relative to the document.
     * @ja 配下の要素に document を基準にした現在座標を設定
     *
     * @param coordinates
     *  - `en` An object containing the properties `top` and `left`.
     *  - `ja` `top`, `left` プロパティを含むオブジェクトを指定
     */
    public offset(coordinates: { top?: number; left?: number; }): this;

    public offset(coordinates?: { top?: number; left?: number; }): { top: number; left: number; } | this {
        // valid elements
        if (!isTypeHTMLOrSVGElement(this)) {
            return null == coordinates ? { top: 0, left: 0 } : this;
        } else if (null == coordinates) {
            // get
            return getOffsetPosition(this[0]);
        } else {
            // set
            for (const el of this) {
                const $el = $(el);
                const props: { top?: string; left?: string; } = {};
                const { position, top: cssTop, left: cssLeft } = $el.css(['position', 'top', 'left']);

                // Set position first, in-case top/left are set even on static elem
                if ('static' === position) {
                    (el as HTMLElement).style.position = 'relative';
                }

                const curOffset = $el.offset();
                const curPosition = (() => {
                    const needCalculatePosition
                        = ('absolute' === position || 'fixed' === position) && (cssTop + cssLeft).includes('auto');
                    if (needCalculatePosition) {
                        return $el.position();
                    } else {
                        return { top: toNumber(cssTop), left: toNumber(cssLeft) };
                    }
                })();

                if (null != coordinates.top) {
                    props.top = `${(coordinates.top - curOffset.top) + curPosition.top}px`;
                }
                if (null != coordinates.left) {
                    props.left = `${(coordinates.left - curOffset.left) + curPosition.left}px`;
                }

                $el.css(props as PlainObject<string>);
            }
            return this;
        }
    }
}

setMixClassAttribute(DOMStyles, 'protoExtendsOnly');
