/*!
 * @cdp/ui-utils 0.9.18
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

    // TODO: test
    const UI_UTILS_STATUS = 'UNDER CONSTRUCTION';
    runtime.isFunction(runtime.i18n.t) && console.log('okok');

    exports.UI_UTILS_STATUS = UI_UTILS_STATUS;
    exports.clearTransition = clearTransition;
    exports.cssPrefixes = cssPrefixes;
    exports.getTransformMatrixValues = getTransformMatrixValues;
    exports.setTransformTransition = setTransformTransition;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktdXRpbHMuanMiLCJzb3VyY2VzIjpbInJlc3VsdC1jb2RlLWRlZnMudHMiLCJzc3IudHMiLCJjc3MvbWlzYy50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gKi9cblxubmFtZXNwYWNlIENEUF9ERUNMQVJFIHtcblxuICAgIGV4cG9ydCBjb25zdCBlbnVtIENEUF9LTk9XTl9VSV9NT0RVTEUge1xuICAgICAgICAvKiogYEBjZHAvdWktdXRpbHNgICovXG4gICAgICAgIFVUSUxTICAgICA9IDEsXG4gICAgICAgIC8qKiBgQGNkcC91aS1saXN0dmlld2AgKi9cbiAgICAgICAgTElTVFZJRVcgID0gMixcbiAgICAgICAgLyoqIG9mZnNldCBmb3IgdW5rbm93biB1aS1tb2R1bGUgKi9cbiAgICAgICAgT0ZGU0VULFxuICAgIH1cblxuICAgIGNvbnN0IGVudW0gTE9DQUxfQ09ERV9CQVNFIHtcbiAgICAgICAgVUlfVVRJTFMgPSAoQ0RQX0tOT1dOX01PRFVMRS5PRkZTRVQgKyBDRFBfS05PV05fVUlfTU9EVUxFLlVUSUxTKSAqIExPQ0FMX0NPREVfUkFOR0VfR1VJREUuRlVOQ1RJT04sXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEV4dGVuZHMgZXJyb3IgY29kZSBkZWZpbml0aW9ucy5cbiAgICAgKiBAamEg5ouh5by144Ko44Op44O844Kz44O844OJ5a6a576pXG4gICAgICovXG4gICAgZXhwb3J0IGVudW0gUkVTVUxUX0NPREUge1xuICAgICAgICBVSV9VVElMU19ERUNMQVJFID0gUkVTVUxUX0NPREVfQkFTRS5ERUNMQVJFLFxuICAgICAgICBFUlJPUl9VSV9VVElMU19GQVRBTCA9IERFQ0xBUkVfRVJST1JfQ09ERShSRVNVTFRfQ09ERV9CQVNFLkNEUCwgTE9DQUxfQ09ERV9CQVNFLlVJX1VUSUxTICsgMSwgJ1VJIHV0aWxzIHNvbWV0aGluZyB3cm9uZy4nKSxcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZ2V0Q29tcHV0ZWRTdHlsZSA9IHNhZmUoZ2xvYmFsVGhpcy5nZXRDb21wdXRlZFN0eWxlKTtcbiIsImltcG9ydCB7IGdldENvbXB1dGVkU3R5bGUgfSBmcm9tICcuLi9zc3InO1xuXG4vKipcbiAqIEBlbiBDU1MgdmVuZG9yIHByZWZpeCBzdHJpbmcgZGVmaW5pdGlvbi5cbiAqIEBqYSBDU1Mg44OZ44Oz44OA44O844OX44Oq44OV44Kj44OD44Kv44K55paH5a2X5YiX5a6a576pXG4gKi9cbmV4cG9ydCBjb25zdCBjc3NQcmVmaXhlcyA9IFsnLXdlYmtpdC0nLCAnLW1vei0nLCAnLW1zLScsICctby0nLCAnJ107XG5cbi8qKlxuICogQGVuIFN0b3JlcyB0aGUgdmFsdWUgc3BlY2lmaWVkIGluIGNzcyBgdHJhbnNmb3JtKDNkKWAuXG4gKiBAamEgY3NzIGB0cmFuc2Zvcm0oM2QpYCDjgavmjIflrprjgZXjgozjgovlgKTjgpLmoLzntI1cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFuc2Zvcm1NYXRyaXhWYWx1ZXMge1xuICAgIHRyYW5zbGF0ZVg6IG51bWJlcjtcbiAgICB0cmFuc2xhdGVZOiBudW1iZXI7XG4gICAgdHJhbnNsYXRlWjogbnVtYmVyO1xuICAgIHNjYWxlWDogbnVtYmVyO1xuICAgIHNjYWxlWTogbnVtYmVyO1xuICAgIHNjYWxlWjogbnVtYmVyO1xufVxuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHZhbHVlIG9mIHRoZSB0cmFuc2Zvcm0gbWF0cml4IHNwZWNpZmllZCBpbiBgRWxlbWVudGAuXG4gKiBAamEgYEVsZW1lbnRgIOOBq+aMh+WumuOBleOCjOOBnyB0cmFuc2Zvcm0g6KGM5YiX44Gu5YCk44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgRWxlbWVudGAgaW5zdGFuY2VcbiAqICAtIGBqYWAg5a++6LGhIGBFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqL1xuZXhwb3J0IGNvbnN0IGdldFRyYW5zZm9ybU1hdHJpeFZhbHVlcyA9IChlbDogRWxlbWVudCk6IFRyYW5zZm9ybU1hdHJpeFZhbHVlcyA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICBjb25zdCB7IG0xMSwgbTIyLCBtMzMsIG00MSwgbTQyLCBtNDMgfSA9IG5ldyBET01NYXRyaXhSZWFkT25seShzdHlsZS50cmFuc2Zvcm0pO1xuICAgIHJldHVybiB7XG4gICAgICAgIHRyYW5zbGF0ZVg6IG00MSxcbiAgICAgICAgdHJhbnNsYXRlWTogbTQyLFxuICAgICAgICB0cmFuc2xhdGVaOiBtNDMsXG4gICAgICAgIHNjYWxlWDogbTExLFxuICAgICAgICBzY2FsZVk6IG0yMixcbiAgICAgICAgc2NhbGVaOiBtMzMsXG4gICAgfTtcbn07XG5cbi8qKlxuICogQGVuIFNldHRpbmcgcHJvcGVydHkgY29udmVyc2lvbiBhbmltYXRpb24gdXNpbmcgY3NzIHRyYW5zaXRpb24gZm9yIHNwZWNpZmllZCBlbGVtZW50LlxuICogQGphIOaMh+Wumuimgee0oOOBq+WvvuOBl+OBpiBjc3MgdHJhbnNpdGlvbiDjgpLnlKjjgYTjgZ/jg5fjg63jg5Hjg4bjgqPlpInmj5vjgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7oqK3lrppcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgdGFyZ2V0IGBIVE1MRWxlbWVudGAgaW5zdGFuY2VcbiAqICAtIGBqYWAg5a++6LGhIGBIVE1MRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K5XG4gKiBAcGFyYW0gcHJvcFxuICogIC0gYGVuYCB0YXJnZXQgcHJvcGVydHkgbmFtZSBbZXg6IGhlaWdodF1cbiAqICAtIGBqYWAg5a++6LGh44OX44Ot44OR44OG44Kj5ZCNIFtleDogaGVpZ2h0XVxuICogQHBhcmFtIG1zZWNcbiAqICAtIGBlbmAgYW5pbWF0aW9uIGR1cmF0aW9uIFttc2VjXVxuICogIC0gYGphYCDjgqLjg4vjg6Hjg7zjgrfjg6fjg7PmmYLplpMgW21zZWNdXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgdGltaW5nIGZ1bmN0aW9uIG5hbWUgW2RlZmF1bHQ6IGVhc2VdXG4gKiAgLSBgamFgIOOCv+OCpOODn+ODs+OCsOmWouaVsOWQjSBbZGVmYXVsdDogZWFzZV1cbiAqL1xuZXhwb3J0IGNvbnN0IHNldFRyYW5zZm9ybVRyYW5zaXRpb24gPSAoZWw6IEhUTUxFbGVtZW50LCBwcm9wOiBzdHJpbmcsIG1zZWM6IG51bWJlciwgdGltaW5nRnVuY3Rpb24gPSAnZWFzZScpOiB2b2lkID0+IHtcbiAgICBjb25zdCBhbmltYXRpb24gPSBgJHsobXNlYyAvIDEwMDApfXMgJHt0aW1pbmdGdW5jdGlvbn1gO1xuICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCd0cmFuc2l0aW9uJywgYCR7cHJvcH0gJHthbmltYXRpb259LCB0cmFuc2Zvcm0gJHthbmltYXRpb259YCk7XG59O1xuXG5cbi8qKlxuICogQGVuIENsZWFyIGNzcyB0cmFuc2l0aW9uIHNldHRpbmdzIGZvciBzcGVjaWZpZWQgZWxlbWVudC5cbiAqIEBqYSDmjIflrpropoHntKDjga4gY3NzIHRyYW5zaXRpb24g6Kit5a6a44KS6Kej6ZmkXG4gKlxuICogQHBhcmFtIGVsXG4gKiAgLSBgZW5gIHRhcmdldCBgSFRNTEVsZW1lbnRgIGluc3RhbmNlXG4gKiAgLSBgamFgIOWvvuixoSBgSFRNTEVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgY29uc3QgY2xlYXJUcmFuc2l0aW9uID0gKGVsOiBIVE1MRWxlbWVudCk6IHZvaWQgPT4ge1xuICAgIGVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd0cmFuc2l0aW9uJyk7XG59O1xuIiwiaW1wb3J0ICcuL3Jlc3VsdC1jb2RlLWRlZnMnO1xuZXhwb3J0ICogZnJvbSAnLi9jc3MnO1xuXG4vLyBUT0RPOiB0ZXN0XG5leHBvcnQgY29uc3QgVUlfVVRJTFNfU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG5pbXBvcnQgeyBpMThuLCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbmlzRnVuY3Rpb24oaTE4bi50KSAmJiAgY29uc29sZS5sb2coJ29rb2snKTtcbiJdLCJuYW1lcyI6WyJzYWZlIiwiaXNGdW5jdGlvbiIsImkxOG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQUdHO0lBRUgsQ0FBQSxZQUFxQjtJQWVqQjs7O0lBR0c7SUFDSCxJQUFBLElBR0MsV0FBQSxHQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUE7SUFIRCxJQUFBLENBQUEsWUFBdUI7SUFDbkIsUUFBQSxXQUFBLENBQUEsV0FBQSxDQUFBLGtCQUFBLENBQUEsR0FBQSxnQkFBQSxDQUFBLEdBQUEsa0JBQTJDLENBQUE7WUFDM0MsV0FBdUIsQ0FBQSxXQUFBLENBQUEsc0JBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxHQUFBLGtDQUEyQixDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQSxHQUFBLHNCQUFBLENBQUE7SUFDOUgsS0FBQyxHQUFBLENBQUE7SUFDTCxDQUFDLEdBQUE7O0lDMUJELGlCQUF3QixNQUFNLGdCQUFnQixHQUFHQSxZQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDOztJQ0FsRjs7O0lBR0c7QUFDSSxVQUFNLFdBQVcsR0FBRyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7SUFlcEU7Ozs7Ozs7SUFPRztBQUNVLFVBQUEsd0JBQXdCLEdBQUcsQ0FBQyxFQUFXLEtBQTJCO0lBQzNFLElBQUEsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbkMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEYsT0FBTztJQUNILFFBQUEsVUFBVSxFQUFFLEdBQUc7SUFDZixRQUFBLFVBQVUsRUFBRSxHQUFHO0lBQ2YsUUFBQSxVQUFVLEVBQUUsR0FBRztJQUNmLFFBQUEsTUFBTSxFQUFFLEdBQUc7SUFDWCxRQUFBLE1BQU0sRUFBRSxHQUFHO0lBQ1gsUUFBQSxNQUFNLEVBQUUsR0FBRztTQUNkLENBQUM7SUFDTixFQUFFO0lBRUY7Ozs7Ozs7Ozs7Ozs7Ozs7SUFnQkc7QUFDSSxVQUFNLHNCQUFzQixHQUFHLENBQUMsRUFBZSxFQUFFLElBQVksRUFBRSxJQUFZLEVBQUUsY0FBYyxHQUFHLE1BQU0sS0FBVTtRQUNqSCxNQUFNLFNBQVMsR0FBRyxDQUFBLEdBQUksSUFBSSxHQUFHLElBQUksRUFBQyxFQUFBLEVBQUssY0FBYyxDQUFBLENBQUUsQ0FBQztJQUN4RCxJQUFBLEVBQUUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFHLEVBQUEsSUFBSSxJQUFJLFNBQVMsQ0FBQSxZQUFBLEVBQWUsU0FBUyxDQUFBLENBQUUsQ0FBQyxDQUFDO0lBQ3ZGLEVBQUU7SUFHRjs7Ozs7OztJQU9HO0FBQ1UsVUFBQSxlQUFlLEdBQUcsQ0FBQyxFQUFlLEtBQVU7SUFDckQsSUFBQSxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMxQzs7SUN4RUE7QUFDTyxVQUFNLGVBQWUsR0FBRyxxQkFBcUI7QUFFcERDLHNCQUFVLENBQUNDLFlBQUksQ0FBQyxDQUFDLENBQUMsSUFBSyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3VpLXV0aWxzLyJ9