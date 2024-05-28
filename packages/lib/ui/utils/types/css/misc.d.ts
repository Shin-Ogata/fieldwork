/**
 * @en CSS vendor prefix string definition.
 * @ja CSS ベンダープリフィックス文字列定義
 */
export declare const cssPrefixes: string[];
/**
 * @en Stores the value specified in css `transform(3d)`.
 * @ja css `transform(3d)` に指定される値を格納
 */
export interface TransformMatrixValues {
    translateX: number;
    translateY: number;
    translateZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
}
/**
 * @en Get the value of the transform matrix specified in `Element`.
 * @ja `Element` に指定された transform 行列の値を取得
 *
 * @param el
 *  - `en` target `Element` instance
 *  - `ja` 対象 `Element` インスタンス
 */
export declare const getTransformMatrixValues: (el: Element) => TransformMatrixValues;
/**
 * @en Setting property conversion animation using css transition for specified element.
 * @ja 指定要素に対して css transition を用いたプロパティ変換アニメーションの設定
 *
 * @param el
 *  - `en` target `HTMLElement` instance
 *  - `ja` 対象 `HTMLElement` インスタンス
 * @param prop
 *  - `en` target property name [ex: height]
 *  - `ja` 対象プロパティ名 [ex: height]
 * @param msec
 *  - `en` animation duration [msec]
 *  - `ja` アニメーション時間 [msec]
 * @param el
 *  - `en` timing function name [default: ease]
 *  - `ja` タイミング関数名 [default: ease]
 */
export declare const setTransformTransition: (el: HTMLElement, prop: string, msec: number, timingFunction?: string) => void;
/**
 * @en Clear css transition settings for specified element.
 * @ja 指定要素の css transition 設定を解除
 *
 * @param el
 *  - `en` target `HTMLElement` instance
 *  - `ja` 対象 `HTMLElement` インスタンス
 */
export declare const clearTransition: (el: HTMLElement) => void;
