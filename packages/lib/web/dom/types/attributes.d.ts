import { PlainObject, NonFunctionPropertyNames, TypedData } from '@cdp/core-utils';
import { ElementBase } from './static';
import { DOMIterable } from './base';
export declare type DOMValueType<T, K = 'value'> = T extends HTMLSelectElement ? (string | string[]) : K extends keyof T ? T[K] : undefined;
export declare type DOMData = PlainObject<TypedData>;
/**
 * @en Mixin base class which concentrated the attributes methods.
 * @ja 属性操作メソッドを集約した Mixin Base クラス
 */
export declare class DOMAttributes<TElement extends ElementBase> implements DOMIterable<TElement> {
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
    /**
     * @en Add css class to elements.
     * @ja css class 要素に追加
     *
     * @param className
     *  - `en` class name or class name list (array).
     *  - `ja` クラス名またはクラス名の配列を指定
     */
    addClass(className: string | string[]): this;
    /**
     * @en Remove css class to elements.
     * @ja css class 要素を削除
     *
     * @param className
     *  - `en` class name or class name list (array).
     *  - `ja` クラス名またはクラス名の配列を指定
     */
    removeClass(className: string | string[]): this;
    /**
     * @en Determine whether any of the matched elements are assigned the given class.
     * @ja 指定されたクラス名を少なくとも要素が持っているか判定
     *
     * @param className
     *  - `en` class name
     *  - `ja` クラス名
     */
    hasClass(className: string): boolean;
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
    toggleClass(className: string | string[], force?: boolean): this;
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
    prop<T extends NonFunctionPropertyNames<TElement>>(name: T): TElement[T];
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
    prop<T extends NonFunctionPropertyNames<TElement>>(name: T, value: TElement[T]): this;
    /**
     * @en Set multi property values for the set of matched elements.
     * @ja 配下の要素に対して複数プロパティの設定
     *
     * @param properties
     *  - `en` An object of property-value pairs to set.
     *  - `ja` property-value ペアを持つオブジェクトを指定
     */
    prop(properties: PlainObject): this;
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
    attr(name: string): string | undefined;
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
    attr(name: string, value: string | number | boolean | null): this;
    /**
     * @en Set multi attribute values for the set of matched elements.
     * @ja 配下の要素に対して複数属性の設定
     *
     * @param attributes
     *  - `en` An object of attribute-value pairs to set.
     *  - `ja` attribute-value ペアを持つオブジェクトを指定
     */
    attr(properties: PlainObject): this;
    /**
     * @en Remove specified attribute.
     * @ja 指定した属性を削除
     *
     * @param name
     *  - `en` attribute name or attribute name list (array).
     *  - `ja` 属性名または属性名の配列を指定
     */
    removeAttr(name: string | string[]): this;
    /**
     * @en Get the current value of the first element in the set of matched elements.
     * @ja value 値の取得. 最初の要素が取得対象
     *
     * @returns
     *  - `en` `string` or `number` or `string[]` (`<select multiple="multiple">`).
     *  - `ja` `string` または `number` または `string[]` (`<select multiple="multiple">`)
     */
    val<T extends ElementBase = TElement>(): DOMValueType<T>;
    /**
     * @en Set the value of every matched element.
     * @ja 配下の要素に対して value 値を設定
     *
     * @param value
     *  - `en` `string` or `number` or `string[]` (`<select multiple="multiple">`).
     *  - `ja` `string` または `number` または `string[]` (`<select multiple="multiple">`)
     */
    val<T extends ElementBase = TElement>(value: DOMValueType<T>): this;
    /**
     * @en Return the values all `DOMStringMap` store set by an HTML5 data-* attribute for the first element in the collection.
     * @ja 最初の要素の HTML5 data-* 属性で `DOMStringMap` に格納された全データ値を返却
     */
    data(): DOMData | undefined;
    /**
     * @en Return the value at the named data store for the first element in the collection, as set by data(key, value) or by an HTML5 data-* attribute.
     * @ja 最初の要素の key で指定した HTML5 data-* 属性値を返却
     *
     * @param key
     *  - `en` string equivalent to data-`key` is given.
     *  - `ja` data-`key` に相当する文字列を指定
     */
    data(key: string): TypedData | undefined;
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
    data(key: string, value: TypedData): this;
    /**
     * @en Remove specified data.
     * @ja 指定したデータをデータ領域から削除
     *
     * @param key
     *  - `en` string equivalent to data-`key` is given.
     *  - `ja` data-`key` に相当する文字列を指定
     */
    removeData(key: string | string[]): this;
}
