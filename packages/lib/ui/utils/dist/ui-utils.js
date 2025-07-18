/*!
 * @cdp/ui-utils 0.9.20
 *   UI components common utilities
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/runtime')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/runtime'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, runtime) { 'use strict';

    /* eslint-disable
        @typescript-eslint/no-namespace,
        @typescript-eslint/no-unused-vars,
     */
    (function () {
        /**
         * @en Extends error code definitions.
         * @ja 拡張エラーコード定義
         */
        let RESULT_CODE = CDP_DECLARE.RESULT_CODE;
        (function () {
            RESULT_CODE[RESULT_CODE["UI_UTILS_DECLARE"] = 9007199254740991] = "UI_UTILS_DECLARE";
            RESULT_CODE[RESULT_CODE["ERROR_UI_UTILS_FATAL"] = CDP_DECLARE.DECLARE_ERROR_CODE(100 /* RESULT_CODE_BASE.CDP */, 120 /* LOCAL_CODE_BASE.UI_UTILS */ + 1, 'UI utils something wrong.')] = "ERROR_UI_UTILS_FATAL";
        })();
    })();

    /** @internal */ const getComputedStyle = runtime.safe(globalThis.getComputedStyle);

    /**
     * @en CSS vendor prefix string definition.
     * @ja CSS ベンダープリフィックス文字列定義
     */
    const cssPrefixes = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
    /**
     * @en Get the value of the transform matrix specified in `Element`.
     * @ja `Element` に指定された transform 行列の値を取得
     *
     * @param el
     *  - `en` target `Element` instance
     *  - `ja` 対象 `Element` インスタンス
     */
    const getTransformMatrixValues = (el) => {
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
    const setTransformTransition = (el, prop, msec, timingFunction = 'ease') => {
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
    const clearTransition = (el) => {
        el.style.removeProperty('transition');
    };

    exports.clearTransition = clearTransition;
    exports.cssPrefixes = cssPrefixes;
    exports.getTransformMatrixValues = getTransformMatrixValues;
    exports.setTransformTransition = setTransformTransition;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktdXRpbHMuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJzc3IudHMiLCJjc3MvbWlzYy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBleHBvcnQgY29uc3QgZW51bSBDRFBfS05PV05fVUlfTU9EVUxFIHtcbiAgICAgICAgLyoqIGBAY2RwL3VpLXV0aWxzYCAqL1xuICAgICAgICBVVElMUyAgICAgPSAxLFxuICAgICAgICAvKiogYEBjZHAvdWktbGlzdHZpZXdgICovXG4gICAgICAgIExJU1RWSUVXICA9IDIsXG4gICAgICAgIC8qKiBvZmZzZXQgZm9yIHVua25vd24gdWktbW9kdWxlICovXG4gICAgICAgIE9GRlNFVCxcbiAgICB9XG5cbiAgICBjb25zdCBlbnVtIExPQ0FMX0NPREVfQkFTRSB7XG4gICAgICAgIFVJX1VUSUxTID0gKENEUF9LTk9XTl9NT0RVTEUuT0ZGU0VUICsgQ0RQX0tOT1dOX1VJX01PRFVMRS5VVElMUykgKiBMT0NBTF9DT0RFX1JBTkdFX0dVSURFLkZVTkNUSU9OLFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFeHRlbmRzIGVycm9yIGNvZGUgZGVmaW5pdGlvbnMuXG4gICAgICogQGphIOaLoeW8teOCqOODqeODvOOCs+ODvOODieWumue+qVxuICAgICAqL1xuICAgIGV4cG9ydCBlbnVtIFJFU1VMVF9DT0RFIHtcbiAgICAgICAgVUlfVVRJTFNfREVDTEFSRSA9IFJFU1VMVF9DT0RFX0JBU0UuREVDTEFSRSxcbiAgICAgICAgRVJST1JfVUlfVVRJTFNfRkFUQUwgPSBERUNMQVJFX0VSUk9SX0NPREUoUkVTVUxUX0NPREVfQkFTRS5DRFAsIExPQ0FMX0NPREVfQkFTRS5VSV9VVElMUyArIDEsICdVSSB1dGlscyBzb21ldGhpbmcgd3JvbmcuJyksXG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGdldENvbXB1dGVkU3R5bGUgPSBzYWZlKGdsb2JhbFRoaXMuZ2V0Q29tcHV0ZWRTdHlsZSk7XG4iLCJpbXBvcnQgeyBnZXRDb21wdXRlZFN0eWxlIH0gZnJvbSAnLi4vc3NyJztcblxuLyoqXG4gKiBAZW4gQ1NTIHZlbmRvciBwcmVmaXggc3RyaW5nIGRlZmluaXRpb24uXG4gKiBAamEgQ1NTIOODmeODs+ODgOODvOODl+ODquODleOCo+ODg+OCr+OCueaWh+Wtl+WIl+Wumue+qVxuICovXG5leHBvcnQgY29uc3QgY3NzUHJlZml4ZXMgPSBbJy13ZWJraXQtJywgJy1tb3otJywgJy1tcy0nLCAnLW8tJywgJyddO1xuXG4vKipcbiAqIEBlbiBTdG9yZXMgdGhlIHZhbHVlIHNwZWNpZmllZCBpbiBjc3MgYHRyYW5zZm9ybSgzZClgLlxuICogQGphIGNzcyBgdHJhbnNmb3JtKDNkKWAg44Gr5oyH5a6a44GV44KM44KL5YCk44KS5qC857SNXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNmb3JtTWF0cml4VmFsdWVzIHtcbiAgICB0cmFuc2xhdGVYOiBudW1iZXI7XG4gICAgdHJhbnNsYXRlWTogbnVtYmVyO1xuICAgIHRyYW5zbGF0ZVo6IG51bWJlcjtcbiAgICBzY2FsZVg6IG51bWJlcjtcbiAgICBzY2FsZVk6IG51bWJlcjtcbiAgICBzY2FsZVo6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IHRoZSB2YWx1ZSBvZiB0aGUgdHJhbnNmb3JtIG1hdHJpeCBzcGVjaWZpZWQgaW4gYEVsZW1lbnRgLlxuICogQGphIGBFbGVtZW50YCDjgavmjIflrprjgZXjgozjgZ8gdHJhbnNmb3JtIOihjOWIl+OBruWApOOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0YXJnZXQgYEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBjb25zdCBnZXRUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgPSAoZWw6IEVsZW1lbnQpOiBUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG4gICAgY29uc3QgeyBtMTEsIG0yMiwgbTMzLCBtNDEsIG00MiwgbTQzIH0gPSBuZXcgRE9NTWF0cml4UmVhZE9ubHkoc3R5bGUudHJhbnNmb3JtKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0cmFuc2xhdGVYOiBtNDEsXG4gICAgICAgIHRyYW5zbGF0ZVk6IG00MixcbiAgICAgICAgdHJhbnNsYXRlWjogbTQzLFxuICAgICAgICBzY2FsZVg6IG0xMSxcbiAgICAgICAgc2NhbGVZOiBtMjIsXG4gICAgICAgIHNjYWxlWjogbTMzLFxuICAgIH07XG59O1xuXG4vKipcbiAqIEBlbiBTZXR0aW5nIHByb3BlcnR5IGNvbnZlcnNpb24gYW5pbWF0aW9uIHVzaW5nIGNzcyB0cmFuc2l0aW9uIGZvciBzcGVjaWZpZWQgZWxlbWVudC5cbiAqIEBqYSDmjIflrpropoHntKDjgavlr77jgZfjgaYgY3NzIHRyYW5zaXRpb24g44KS55So44GE44Gf44OX44Ot44OR44OG44Kj5aSJ5o+b44Ki44OL44Oh44O844K344On44Oz44Gu6Kit5a6aXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgSFRNTEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgSFRNTEVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCuVxuICogQHBhcmFtIHByb3BcbiAqICAtIGBlbmAgdGFyZ2V0IHByb3BlcnR5IG5hbWUgW2V4OiBoZWlnaHRdXG4gKiAgLSBgamFgIOWvvuixoeODl+ODreODkeODhuOCo+WQjSBbZXg6IGhlaWdodF1cbiAqIEBwYXJhbSBtc2VjXG4gKiAgLSBgZW5gIGFuaW1hdGlvbiBkdXJhdGlvbiBbbXNlY11cbiAqICAtIGBqYWAg44Ki44OL44Oh44O844K344On44Oz5pmC6ZaTIFttc2VjXVxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRpbWluZyBmdW5jdGlvbiBuYW1lIFtkZWZhdWx0OiBlYXNlXVxuICogIC0gYGphYCDjgr/jgqTjg5/jg7PjgrDplqLmlbDlkI0gW2RlZmF1bHQ6IGVhc2VdXG4gKi9cbmV4cG9ydCBjb25zdCBzZXRUcmFuc2Zvcm1UcmFuc2l0aW9uID0gKGVsOiBIVE1MRWxlbWVudCwgcHJvcDogc3RyaW5nLCBtc2VjOiBudW1iZXIsIHRpbWluZ0Z1bmN0aW9uID0gJ2Vhc2UnKTogdm9pZCA9PiB7XG4gICAgY29uc3QgYW5pbWF0aW9uID0gYCR7KG1zZWMgLyAxMDAwKX1zICR7dGltaW5nRnVuY3Rpb259YDtcbiAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgndHJhbnNpdGlvbicsIGAke3Byb3B9ICR7YW5pbWF0aW9ufSwgdHJhbnNmb3JtICR7YW5pbWF0aW9ufWApO1xufTtcblxuXG4vKipcbiAqIEBlbiBDbGVhciBjc3MgdHJhbnNpdGlvbiBzZXR0aW5ncyBmb3Igc3BlY2lmaWVkIGVsZW1lbnQuXG4gKiBAamEg5oyH5a6a6KaB57Sg44GuIGNzcyB0cmFuc2l0aW9uIOioreWumuOCkuino+mZpFxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0YXJnZXQgYEhUTUxFbGVtZW50YCBpbnN0YW5jZVxuICogIC0gYGphYCDlr77osaEgYEhUTUxFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyVHJhbnNpdGlvbiA9IChlbDogSFRNTEVsZW1lbnQpOiB2b2lkID0+IHtcbiAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eSgndHJhbnNpdGlvbicpO1xufTtcbiJdLCJuYW1lcyI6WyJzYWZlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7SUFHRztJQUVILENBQUEsWUFBcUI7SUFlakI7OztJQUdHO0lBQ0gsSUFBQSxJQUFBLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQTtJQUFBLElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsa0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxrQkFBMkM7WUFDM0MsV0FBQSxDQUFBLFdBQUEsQ0FBQSxzQkFBQSxDQUFBLEdBQXVCLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBQSxHQUFBLDZCQUF1QixHQUFBLGtDQUEyQixDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQSxHQUFBLHNCQUFBO0lBQzlILElBQUEsQ0FBQyxHQUhzQjtJQUkzQixDQUFDLEdBdkJvQjs7SUNIckIsaUJBQXdCLE1BQU0sZ0JBQWdCLEdBQUdBLFlBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7O0lDQWxGOzs7SUFHRztBQUNJLFVBQU0sV0FBVyxHQUFHLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7SUFlbEU7Ozs7Ozs7SUFPRztBQUNJLFVBQU0sd0JBQXdCLEdBQUcsQ0FBQyxFQUFXLEtBQTJCO0lBQzNFLElBQUEsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztRQUMvRSxPQUFPO0lBQ0gsUUFBQSxVQUFVLEVBQUUsR0FBRztJQUNmLFFBQUEsVUFBVSxFQUFFLEdBQUc7SUFDZixRQUFBLFVBQVUsRUFBRSxHQUFHO0lBQ2YsUUFBQSxNQUFNLEVBQUUsR0FBRztJQUNYLFFBQUEsTUFBTSxFQUFFLEdBQUc7SUFDWCxRQUFBLE1BQU0sRUFBRSxHQUFHO1NBQ2Q7SUFDTDtJQUVBOzs7Ozs7Ozs7Ozs7Ozs7O0lBZ0JHO0FBQ0ksVUFBTSxzQkFBc0IsR0FBRyxDQUFDLEVBQWUsRUFBRSxJQUFZLEVBQUUsSUFBWSxFQUFFLGNBQWMsR0FBRyxNQUFNLEtBQVU7UUFDakgsTUFBTSxTQUFTLEdBQUcsQ0FBQSxHQUFJLElBQUksR0FBRyxJQUFJLEVBQUMsRUFBQSxFQUFLLGNBQWMsQ0FBQSxDQUFFO0lBQ3ZELElBQUEsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUEsRUFBRyxJQUFJLElBQUksU0FBUyxDQUFBLFlBQUEsRUFBZSxTQUFTLENBQUEsQ0FBRSxDQUFDO0lBQ3RGO0lBR0E7Ozs7Ozs7SUFPRztBQUNJLFVBQU0sZUFBZSxHQUFHLENBQUMsRUFBZSxLQUFVO0lBQ3JELElBQUEsRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDO0lBQ3pDOzs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC91aS11dGlscy8ifQ==