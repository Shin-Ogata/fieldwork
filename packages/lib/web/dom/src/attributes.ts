/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    UnknownObject,
    PlainObject,
    NonFunctionPropertyNames,
    TypedData,
    isString,
    isArray,
    toTypedData,
    fromTypedData,
    assignValue,
    camelize,
    setMixClassAttribute,
} from '@cdp/core-utils';
import { ElementBase } from './static';
import {
    DOMIterable,
    isNodeElement,
    isNodeHTMLOrSVGElement,
    isTypeElement,
    isTypeHTMLOrSVGElement,
} from './base';

export type DOMValueType<T, K = 'value'> = T extends HTMLSelectElement ? (string | string[]) : K extends keyof T ? T[K] : string;
export type DOMData = PlainObject<TypedData>;

/** @internal helper for `val()`*/
function isMultiSelectElement(el: ElementBase): el is HTMLSelectElement {
    return isNodeElement(el) && 'select' === el.nodeName.toLowerCase() && (el as HTMLSelectElement).multiple;
}

/** @internal helper for `val()`*/
function isInputElement(el: ElementBase): el is HTMLInputElement {
    return isNodeElement(el) && (null != (el as HTMLInputElement).value);
}

//__________________________________________________________________________________________________//

/**
 * @en Mixin base class which concentrated the attributes methods.
 * @ja 属性操作メソッドを集約した Mixin Base クラス
 */
export class DOMAttributes<TElement extends ElementBase> implements DOMIterable<TElement> {

///////////////////////////////////////////////////////////////////////
// implements: DOMIterable<T>

    readonly [n: number]: TElement;
    readonly length!: number;
    [Symbol.iterator]!: () => Iterator<TElement>;
    entries!: () => IterableIterator<[number, TElement]>;

///////////////////////////////////////////////////////////////////////
// public: Classes

    /**
     * @en Add css class to elements.
     * @ja css class 要素に追加
     *
     * @param className
     *  - `en` class name or class name list (array).
     *  - `ja` クラス名またはクラス名の配列を指定
     */
    public addClass(className: string | string[]): this {
        if (!isTypeElement(this)) {
            return this;
        }
        const classes = isArray(className) ? className : [className];
        for (const el of this) {
            if (isNodeElement(el)) {
                el.classList.add(...classes);
            }
        }
        return this;
    }

    /**
     * @en Remove css class to elements.
     * @ja css class 要素を削除
     *
     * @param className
     *  - `en` class name or class name list (array).
     *  - `ja` クラス名またはクラス名の配列を指定
     */
    public removeClass(className: string | string[]): this {
        if (!isTypeElement(this)) {
            return this;
        }
        const classes = isArray(className) ? className : [className];
        for (const el of this) {
            if (isNodeElement(el)) {
                el.classList.remove(...classes);
            }
        }
        return this;
    }

    /**
     * @en Determine whether any of the matched elements are assigned the given class.
     * @ja 指定されたクラス名を少なくとも要素が持っているか判定
     *
     * @param className
     *  - `en` class name
     *  - `ja` クラス名
     */
    public hasClass(className: string): boolean {
        if (!isTypeElement(this)) {
            return false;
        }
        for (const el of this) {
            if (isNodeElement(el) && el.classList.contains(className)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @en Add or remove one or more classes from each element in the set of matched elements, <br>
     *     depending on either the class's presence or the value of the state argument.
     * @ja 現在の状態に応じて, 指定されたクラス名を要素に追加/削除を実行
     *
     * @param className
     *  - `en` class name or class name list (array).
     *  - `ja` クラス名またはクラス名の配列を指定
     * @param force
     *  - `en` if this argument exists, true: the classes should be added / false: removed.
     *  - `ja` 引数が存在する場合, true: クラスを追加 / false: クラスを削除
     */
    public toggleClass(className: string | string[], force?: boolean): this {
        if (!isTypeElement(this)) {
            return this;
        }

        const classes = isArray(className) ? className : [className];
        const operation = (() => {
            if (null == force) {
                return (elem: Element): void => {
                    for (const name of classes) {
                        elem.classList.toggle(name);
                    }
                };
            } else if (force) {
                return (elem: Element) => elem.classList.add(...classes);
            } else {
                return (elem: Element) => elem.classList.remove(...classes);
            }
        })();

        for (const el of this) {
            if (isNodeElement(el)) {
                operation(el);
            }
        }

        return this;
    }

///////////////////////////////////////////////////////////////////////
// public: Properties

    /**
     * @en Get property value. <br>
     *     The method gets the property value for only the first element in the matched set.
     * @ja プロパティ値の取得 <br>
     *     最初の要素が取得対象
     *
     * @param name
     *  - `en` target property name
     *  - `ja` プロパティ名を指定
     */
    public prop<T extends NonFunctionPropertyNames<TElement>>(name: T): TElement[T];

    /**
     * @en Set single property value for the set of matched elements.
     * @ja 配下の要素に対して単一プロパティの設定
     *
     * @param name
     *  - `en` target property name
     *  - `ja` プロパティ名を指定
     * @param value
     *  - `en` target property value
     *  - `ja` 設定するプロパティ値
     */
    public prop<T extends NonFunctionPropertyNames<TElement>>(name: T, value: TElement[T]): this;

    /**
     * @en Set multi property values for the set of matched elements.
     * @ja 配下の要素に対して複数プロパティの設定
     *
     * @param properties
     *  - `en` An object of property-value pairs to set.
     *  - `ja` property-value ペアを持つオブジェクトを指定
     */
    public prop(properties: PlainObject): this;

    public prop<T extends NonFunctionPropertyNames<TElement>>(key: T | PlainObject, value?: TElement[T]): TElement[T] | this {
        if (null == value && isString(key)) {
            // get first element property
            const first = this[0] as TElement & Record<string, TElement[T]>;
            return first && first[key];
        } else {
            // set property
            for (const el of this) {
                if (null != value) {
                    // single
                    assignValue(el as unknown as UnknownObject, key as string, value);
                } else {
                    // multiple
                    for (const name of Object.keys(key)) {
                        if (name in el) {
                            assignValue(el as unknown as UnknownObject, name, (key as Record<string, TElement[T]>)[name]);
                        }
                    }
                }
            }
            return this;
        }
    }

///////////////////////////////////////////////////////////////////////
// public: Attributes

    /**
     * @en Get attribute value. <br>
     *     The method gets the attribute value for only the first element in the matched set.
     * @ja 属性値の取得 <br>
     *     最初の要素が取得対象
     *
     * @param name
     *  - `en` target attribute name
     *  - `ja` 属性名を指定
     */
    public attr(name: string): string | undefined;

    /**
     * @en Set single attribute value for the set of matched elements.
     * @ja 配下の要素に対して単一属性の設定
     *
     * @param name
     *  - `en` target attribute name
     *  - `ja` 属性名を指定
     * @param value
     *  - `en` target attribute value. if `null` set, remove attribute.
     *  - `ja` 設定する属性値. `null` が指定された場合削除
     */
    public attr(name: string, value: string | number | boolean | null): this;

    /**
     * @en Set multi attribute values for the set of matched elements.
     * @ja 配下の要素に対して複数属性の設定
     *
     * @param attributes
     *  - `en` An object of attribute-value pairs to set.
     *  - `ja` attribute-value ペアを持つオブジェクトを指定
     */
    public attr(properties: PlainObject): this;

    public attr(key: string | PlainObject, value?: string | number | boolean | null): string | undefined | this {
        if (!isTypeElement(this)) {
            // non element
            return undefined === value ? undefined : this;
        } else if (undefined === value && isString(key)) {
            // get first element attribute
            const attr = this[0].getAttribute(key);
            return attr ?? undefined;
        } else if (null === value) {
            // remove attribute
            return this.removeAttr(key as string);
        } else {
            // set attribute
            for (const el of this) {
                if (isNodeElement(el)) {
                    if (null != value) {
                        // single
                        el.setAttribute(key as string, String(value));
                    } else {
                        // multiple
                        for (const name of Object.keys(key)) {
                            const val = (key as Record<string, unknown>)[name];
                            if (null === val) {
                                el.removeAttribute(name);
                            } else {
                                el.setAttribute(name, String(val));
                            }
                        }
                    }
                }
            }
            return this;
        }
    }

    /**
     * @en Remove specified attribute.
     * @ja 指定した属性を削除
     *
     * @param name
     *  - `en` attribute name or attribute name list (array).
     *  - `ja` 属性名または属性名の配列を指定
     */
    public removeAttr(name: string | string[]): this {
        if (!isTypeElement(this)) {
            return this;
        }
        const attrs = isArray(name) ? name : [name];
        for (const el of this) {
            if (isNodeElement(el)) {
                for (const attr of attrs) {
                    el.removeAttribute(attr);
                }
            }
        }
        return this;
    }

///////////////////////////////////////////////////////////////////////
// public: Values

    /**
     * @en Get the current value of the first element in the set of matched elements.
     * @ja value 値の取得. 最初の要素が取得対象
     *
     * @returns
     *  - `en` `string` or `number` or `string[]` (`<select multiple="multiple">`).
     *  - `ja` `string` または `number` または `string[]` (`<select multiple="multiple">`)
     */
    public val<T extends ElementBase = TElement>(): DOMValueType<T>;

    /**
     * @en Set the value of every matched element.
     * @ja 配下の要素に対して value 値を設定
     *
     * @param value
     *  - `en` `string` or `number` or `string[]` (`<select multiple="multiple">`).
     *  - `ja` `string` または `number` または `string[]` (`<select multiple="multiple">`)
     */
    public val<T extends ElementBase = TElement>(value: DOMValueType<T>): this;

    public val<T extends ElementBase = TElement>(value?: DOMValueType<T>): any {
        if (!isTypeElement(this)) {
            // non element
            return null == value ? undefined : this;
        }

        if (null == value) {
            // get first element value
            const el = this[0];
            if (isMultiSelectElement(el)) {
                const values = [];
                for (const option of el.selectedOptions) {
                    values.push(option.value);
                }
                return values;
            } else if ('value' in el) {
                return (el as any).value;
            } else {
                // no support value
                return undefined;
            }
        } else {
            // set value
            for (const el of this) {
                if (isArray(value) && isMultiSelectElement(el)) {
                    for (const option of el.options) {
                        option.selected = value.includes(option.value);
                    }
                } else if (isInputElement(el)) {
                    el.value = value as string;
                }
            }
            return this;
        }
    }

///////////////////////////////////////////////////////////////////////
// public: Data

    /**
     * @en Return the values all `DOMStringMap` store set by an HTML5 data-* attribute for the first element in the collection.
     * @ja 最初の要素の HTML5 data-* 属性で `DOMStringMap` に格納された全データ値を返却
     */
    public data(): DOMData | undefined;

    /**
     * @en Return the value at the named data store for the first element in the collection, as set by data(key, value) or by an HTML5 data-* attribute.
     * @ja 最初の要素の key で指定した HTML5 data-* 属性値を返却
     *
     * @param key
     *  - `en` string equivalent to data-`key` is given.
     *  - `ja` data-`key` に相当する文字列を指定
     */
    public data(key: string): TypedData | undefined;

    /**
     * @en Store arbitrary data associated with the matched elements.
     * @ja 配下の要素に対して任意のデータを格納
     *
     * @param key
     *  - `en` string equivalent to data-`key` is given.
     *  - `ja` data-`key` に相当する文字列を指定
     * @param value
     *  - `en` data value (not only `string`)
     *  - `ja` 設定する値を指定 (文字列以外も受付可)
     */
    public data(key: string, value: TypedData): this;

    public data(key?: string, value?: TypedData): DOMData | TypedData | undefined | this {
        if (!isTypeHTMLOrSVGElement(this)) {
            // non supported dataset element
            return null == value ? undefined : this;
        }

        if (undefined === value) {
            // get first element dataset
            const dataset = this[0].dataset;
            if (null == key) {
                // get all data
                const data: DOMData = {};
                for (const prop of Object.keys(dataset)) {
                    assignValue(data, prop, toTypedData(dataset[prop]));
                }
                return data;
            } else {
                // typed value
                return toTypedData(dataset[camelize(key)]);
            }
        } else {
            // set value
            const prop = camelize(key ?? '');
            if (prop) {
                for (const el of this) {
                    if (isNodeHTMLOrSVGElement(el)) {
                        assignValue(el.dataset as unknown as UnknownObject, prop, fromTypedData(value));
                    }
                }
            }
            return this;
        }
    }

    /**
     * @en Remove specified data.
     * @ja 指定したデータをデータ領域から削除
     *
     * @param key
     *  - `en` string equivalent to data-`key` is given.
     *  - `ja` data-`key` に相当する文字列を指定
     */
    public removeData(key: string | string[]): this {
        if (!isTypeHTMLOrSVGElement(this)) {
            return this;
        }
        const props = isArray(key) ? key.map(k => camelize(k)) : [camelize(key)];
        for (const el of this) {
            if (isNodeHTMLOrSVGElement(el)) {
                const { dataset } = el;
                for (const prop of props) {
                    delete dataset[prop];
                }
            }
        }
        return this;
    }
}

setMixClassAttribute(DOMAttributes, 'protoExtendsOnly');
