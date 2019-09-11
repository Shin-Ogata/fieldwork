import { PlainObject } from '@cdp/core-utils';
import { ElementBase } from './static';
import { DOMIterable } from './base';
/**
 * @en Mixin base class which concentrated the style management methods.
 * @ja スタイル関連メソッドを集約した Mixin Base クラス
 */
export declare class DOMStyles<TElement extends ElementBase> implements DOMIterable<TElement> {
    readonly [n: number]: TElement;
    readonly length: number;
    [Symbol.iterator]: () => Iterator<TElement>;
    entries: () => IterableIterator<[number, TElement]>;
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
    css(name: string): string;
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
    css(names: string[]): PlainObject<string>;
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
    css(name: string, value: string): this;
    /**
     * @en Set one or more CSS properties for the set of matched elements.
     * @ja 要素の CSS 複数のプロパティに値を設定
     *
     * @param properties
     *  - `en` An object of property-value pairs to set.
     *  - `ja` CSS プロパティを格納したオブジェクト
     */
    css(properties: PlainObject<string>): this;
}
