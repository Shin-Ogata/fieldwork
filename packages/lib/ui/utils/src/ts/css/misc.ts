import { getComputedStyle } from '../ssr';

/**
 * @en CSS vendor prefix string definition.
 * @ja CSS ベンダープリフィックス文字列定義
 */
export const cssPrefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];

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
export const getTransformMatrixValues = (el: Element): TransformMatrixValues => {
    const style = getComputedStyle(el);
    const { m11, m22, m33, m41, m42, m43 } = new DOMMatrixReadOnly(style.transform);
    return {
        translateX: m41,
        translateY: m42,
        translateZ: m43,
        scaleX: m11,
        scaleY: m22,
        scaleZ: m33,
    };
};

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
export const setTransformTransition = (el: HTMLElement, prop: string, msec: number, timingFunction = 'ease'): void => {
    const animation = `${(msec / 1000)}s ${timingFunction}`;
    el.style.setProperty('transition', `${prop} ${animation}, transform ${animation}`);
};


/**
 * @en Clear css transition settings for specified element.
 * @ja 指定要素の css transition 設定を解除
 *
 * @param el
 *  - `en` target `HTMLElement` instance
 *  - `ja` 対象 `HTMLElement` インスタンス
 */
export const clearTransition = (el: HTMLElement): void => {
    el.style.removeProperty('transition');
};
