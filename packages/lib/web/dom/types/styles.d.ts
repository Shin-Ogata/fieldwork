import { PlainObject } from '@cdp/core-utils';
import { ElementBase } from './static';
import { DOMIterable } from './base';
/**
 * @en Get offset[Width | Height]. This function will work SVGElement, too.
 * @ja offse[Width | Height] の取得. SVGElement にも適用可能
 */
export declare function getOffsetSize(el: HTMLOrSVGElement, type: 'width' | 'height'): number;
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
     *  - `en` string value to set for the property. if null passed, remove property.
     *  - `ja` 設定する値を文字列で指定. null 指定で削除.
     */
    css(name: string, value: string | null): this;
    /**
     * @en Set one or more CSS properties for the set of matched elements.
     * @ja 要素の CSS 複数のプロパティに値を設定
     *
     * @param properties
     *  - `en` An object of property-value pairs to set.
     *  - `ja` CSS プロパティを格納したオブジェクト
     */
    css(properties: PlainObject<string | number | boolean | null>): this;
    /**
     * @en Get the current computed width for the first element in the set of matched elements or set the width of every matched element.
     * @ja 最初の要素の計算済み横幅をピクセル単位で取得
     */
    width(): number;
    /**
     * @en Set the CSS width of each element in the set of matched elements.
     * @ja 配下の要素の横幅を指定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     */
    width(value: number | string): this;
    /**
     * @en Get the current computed height for the first element in the set of matched elements or set the width of every matched element.
     * @ja 最初の要素の計算済み立幅をピクセル単位で取得
     */
    height(): number;
    /**
     * @en Set the CSS height of each element in the set of matched elements.
     * @ja 配下の要素の縦幅を指定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     */
    height(value: number | string): this;
    /**
     * @en Get the current computed inner width for the first element in the set of matched elements, including padding but not border.
     * @ja 最初の要素の内部横幅(borderは除き、paddingは含む)を取得
     */
    innerWidth(): number;
    /**
     * @en Set the CSS inner width of each element in the set of matched elements.
     * @ja 配下の要素の内部横幅(borderは除き、paddingは含む)を設定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     */
    innerWidth(value: number | string): this;
    /**
     * @en Get the current computed inner height for the first element in the set of matched elements, including padding but not border.
     * @ja 最初の要素の内部縦幅(borderは除き、paddingは含む)を取得
     */
    innerHeight(): number;
    /**
     * @en Set the CSS inner height of each element in the set of matched elements.
     * @ja 配下の要素の内部縦幅(borderは除き、paddingは含む)を設定
     *
     * @param value
     *  - `en` An integer representing the number of pixels, or an integer along with an optional unit of measure appended (as a string).
     *  - `ja` 引数の値が数値のときは `px` として扱い, 文字列は CSS のルールに従う
     */
    innerHeight(value: number | string): this;
    /**
     * @en Get the current computed outer width (including padding, border, and optionally margin) for the first element in the set of matched elements.
     * @ja 最初の要素の外部横幅(border、paddingを含む)を取得. オプション指定によりマージン領域を含めたものも取得可
     *
     * @param includeMargin
     *  - `en` A Boolean indicating whether to include the element's margin in the calculation.
     *  - `ja` マージン領域を含める場合は true を指定
     */
    outerWidth(includeMargin?: boolean): number;
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
    outerWidth(value: number | string, includeMargin?: boolean): this;
    /**
     * @en Get the current computed outer height (including padding, border, and optionally margin) for the first element in the set of matched elements.
     * @ja 最初の要素の外部縦幅(border、paddingを含む)を取得. オプション指定によりマージン領域を含めたものも取得可
     *
     * @param includeMargin
     *  - `en` A Boolean indicating whether to include the element's margin in the calculation.
     *  - `ja` マージン領域を含める場合は true を指定
     */
    outerHeight(includeMargin?: boolean): number;
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
    outerHeight(value: number | string, includeMargin?: boolean): this;
    /**
     * @en Get the current coordinates of the first element in the set of matched elements, relative to the offset parent.
     * @ja 最初の要素の親要素からの相対的な表示位置を返却
     */
    position(): {
        top: number;
        left: number;
    };
    /**
     * @en Get the current coordinates of the first element in the set of matched elements, relative to the document.
     * @ja document を基準として, マッチしている要素集合の1つ目の要素の現在の座標を取得
     */
    offset(): {
        top: number;
        left: number;
    };
    /**
     * @en Set the current coordinates of every element in the set of matched elements, relative to the document.
     * @ja 配下の要素に document を基準にした現在座標を設定
     *
     * @param coordinates
     *  - `en` An object containing the properties `top` and `left`.
     *  - `ja` `top`, `left` プロパティを含むオブジェクトを指定
     */
    offset(coordinates: {
        top?: number;
        left?: number;
    }): this;
}
