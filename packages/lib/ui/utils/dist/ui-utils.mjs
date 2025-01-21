/*!
 * @cdp/ui-utils 0.9.19
 *   UI components common utilities
 */

import { safe } from '@cdp/runtime';

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

/** @internal */ const getComputedStyle = safe(globalThis.getComputedStyle);

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

export { clearTransition, cssPrefixes, getTransformMatrixValues, setTransformTransition };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktdXRpbHMubWpzIiwic291cmNlcyI6WyJyZXN1bHQtY29kZS1kZWZzLnRzIiwic3NyLnRzIiwiY3NzL21pc2MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAqL1xuXG5uYW1lc3BhY2UgQ0RQX0RFQ0xBUkUge1xuXG4gICAgZXhwb3J0IGNvbnN0IGVudW0gQ0RQX0tOT1dOX1VJX01PRFVMRSB7XG4gICAgICAgIC8qKiBgQGNkcC91aS11dGlsc2AgKi9cbiAgICAgICAgVVRJTFMgICAgID0gMSxcbiAgICAgICAgLyoqIGBAY2RwL3VpLWxpc3R2aWV3YCAqL1xuICAgICAgICBMSVNUVklFVyAgPSAyLFxuICAgICAgICAvKiogb2Zmc2V0IGZvciB1bmtub3duIHVpLW1vZHVsZSAqL1xuICAgICAgICBPRkZTRVQsXG4gICAgfVxuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBVSV9VVElMUyA9IChDRFBfS05PV05fTU9EVUxFLk9GRlNFVCArIENEUF9LTk9XTl9VSV9NT0RVTEUuVVRJTFMpICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIFVJX1VUSUxTX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX1VJX1VUSUxTX0ZBVEFMID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfVVRJTFMgKyAxLCAnVUkgdXRpbHMgc29tZXRoaW5nIHdyb25nLicpLFxuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBnZXRDb21wdXRlZFN0eWxlID0gc2FmZShnbG9iYWxUaGlzLmdldENvbXB1dGVkU3R5bGUpO1xuIiwiaW1wb3J0IHsgZ2V0Q29tcHV0ZWRTdHlsZSB9IGZyb20gJy4uL3Nzcic7XG5cbi8qKlxuICogQGVuIENTUyB2ZW5kb3IgcHJlZml4IHN0cmluZyBkZWZpbml0aW9uLlxuICogQGphIENTUyDjg5njg7Pjg4Djg7zjg5fjg6rjg5XjgqPjg4Pjgq/jgrnmloflrZfliJflrprnvqlcbiAqL1xuZXhwb3J0IGNvbnN0IGNzc1ByZWZpeGVzID0gWyctd2Via2l0LScsICctbW96LScsICctbXMtJywgJy1vLScsICcnXTtcblxuLyoqXG4gKiBAZW4gU3RvcmVzIHRoZSB2YWx1ZSBzcGVjaWZpZWQgaW4gY3NzIGB0cmFuc2Zvcm0oM2QpYC5cbiAqIEBqYSBjc3MgYHRyYW5zZm9ybSgzZClgIOOBq+aMh+WumuOBleOCjOOCi+WApOOCkuagvOe0jVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zZm9ybU1hdHJpeFZhbHVlcyB7XG4gICAgdHJhbnNsYXRlWDogbnVtYmVyO1xuICAgIHRyYW5zbGF0ZVk6IG51bWJlcjtcbiAgICB0cmFuc2xhdGVaOiBudW1iZXI7XG4gICAgc2NhbGVYOiBudW1iZXI7XG4gICAgc2NhbGVZOiBudW1iZXI7XG4gICAgc2NhbGVaOiBudW1iZXI7XG59XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdmFsdWUgb2YgdGhlIHRyYW5zZm9ybSBtYXRyaXggc3BlY2lmaWVkIGluIGBFbGVtZW50YC5cbiAqIEBqYSBgRWxlbWVudGAg44Gr5oyH5a6a44GV44KM44GfIHRyYW5zZm9ybSDooYzliJfjga7lgKTjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgdGFyZ2V0IGBFbGVtZW50YCBpbnN0YW5jZVxuICogIC0gYGphYCDlr77osaEgYEVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCuVxuICovXG5leHBvcnQgY29uc3QgZ2V0VHJhbnNmb3JtTWF0cml4VmFsdWVzID0gKGVsOiBFbGVtZW50KTogVHJhbnNmb3JtTWF0cml4VmFsdWVzID0+IHtcbiAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoZWwpO1xuICAgIGNvbnN0IHsgbTExLCBtMjIsIG0zMywgbTQxLCBtNDIsIG00MyB9ID0gbmV3IERPTU1hdHJpeFJlYWRPbmx5KHN0eWxlLnRyYW5zZm9ybSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHJhbnNsYXRlWDogbTQxLFxuICAgICAgICB0cmFuc2xhdGVZOiBtNDIsXG4gICAgICAgIHRyYW5zbGF0ZVo6IG00MyxcbiAgICAgICAgc2NhbGVYOiBtMTEsXG4gICAgICAgIHNjYWxlWTogbTIyLFxuICAgICAgICBzY2FsZVo6IG0zMyxcbiAgICB9O1xufTtcblxuLyoqXG4gKiBAZW4gU2V0dGluZyBwcm9wZXJ0eSBjb252ZXJzaW9uIGFuaW1hdGlvbiB1c2luZyBjc3MgdHJhbnNpdGlvbiBmb3Igc3BlY2lmaWVkIGVsZW1lbnQuXG4gKiBAamEg5oyH5a6a6KaB57Sg44Gr5a++44GX44GmIGNzcyB0cmFuc2l0aW9uIOOCkueUqOOBhOOBn+ODl+ODreODkeODhuOCo+WkieaPm+OCouODi+ODoeODvOOCt+ODp+ODs+OBruioreWumlxuICpcbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0YXJnZXQgYEhUTUxFbGVtZW50YCBpbnN0YW5jZVxuICogIC0gYGphYCDlr77osaEgYEhUTUxFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAqIEBwYXJhbSBwcm9wXG4gKiAgLSBgZW5gIHRhcmdldCBwcm9wZXJ0eSBuYW1lIFtleDogaGVpZ2h0XVxuICogIC0gYGphYCDlr77osaHjg5fjg63jg5Hjg4bjgqPlkI0gW2V4OiBoZWlnaHRdXG4gKiBAcGFyYW0gbXNlY1xuICogIC0gYGVuYCBhbmltYXRpb24gZHVyYXRpb24gW21zZWNdXG4gKiAgLSBgamFgIOOCouODi+ODoeODvOOCt+ODp+ODs+aZgumWkyBbbXNlY11cbiAqIEBwYXJhbSBlbFxuICogIC0gYGVuYCB0aW1pbmcgZnVuY3Rpb24gbmFtZSBbZGVmYXVsdDogZWFzZV1cbiAqICAtIGBqYWAg44K/44Kk44Of44Oz44Kw6Zai5pWw5ZCNIFtkZWZhdWx0OiBlYXNlXVxuICovXG5leHBvcnQgY29uc3Qgc2V0VHJhbnNmb3JtVHJhbnNpdGlvbiA9IChlbDogSFRNTEVsZW1lbnQsIHByb3A6IHN0cmluZywgbXNlYzogbnVtYmVyLCB0aW1pbmdGdW5jdGlvbiA9ICdlYXNlJyk6IHZvaWQgPT4ge1xuICAgIGNvbnN0IGFuaW1hdGlvbiA9IGAkeyhtc2VjIC8gMTAwMCl9cyAke3RpbWluZ0Z1bmN0aW9ufWA7XG4gICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoJ3RyYW5zaXRpb24nLCBgJHtwcm9wfSAke2FuaW1hdGlvbn0sIHRyYW5zZm9ybSAke2FuaW1hdGlvbn1gKTtcbn07XG5cblxuLyoqXG4gKiBAZW4gQ2xlYXIgY3NzIHRyYW5zaXRpb24gc2V0dGluZ3MgZm9yIHNwZWNpZmllZCBlbGVtZW50LlxuICogQGphIOaMh+Wumuimgee0oOOBriBjc3MgdHJhbnNpdGlvbiDoqK3lrprjgpLop6PpmaRcbiAqXG4gKiBAcGFyYW0gZWxcbiAqICAtIGBlbmAgdGFyZ2V0IGBIVE1MRWxlbWVudGAgaW5zdGFuY2VcbiAqICAtIGBqYWAg5a++6LGhIGBIVE1MRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K5XG4gKi9cbmV4cG9ydCBjb25zdCBjbGVhclRyYW5zaXRpb24gPSAoZWw6IEhUTUxFbGVtZW50KTogdm9pZCA9PiB7XG4gICAgZWwuc3R5bGUucmVtb3ZlUHJvcGVydHkoJ3RyYW5zaXRpb24nKTtcbn07XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBOzs7QUFHRztBQUVILENBQUEsWUFBcUI7QUFlakI7OztBQUdHO0FBQ0gsSUFBQSxJQUFBLFdBQUEsR0FBQSxXQUFBLENBQUEsV0FBQTtBQUFBLElBQUEsQ0FBQSxZQUF1QjtBQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsa0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxrQkFBMkM7UUFDM0MsV0FBdUIsQ0FBQSxXQUFBLENBQUEsc0JBQUEsQ0FBQSxHQUFBLFdBQUEsQ0FBQSxrQkFBa0IsQ0FBdUIsR0FBQSw2QkFBQSxHQUFBLGtDQUEyQixDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQSxHQUFBLHNCQUFBO0FBQzlILEtBQUMsR0FBQTtBQUNMLENBQUMsR0FBQTs7QUMxQkQsaUJBQXdCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQzs7QUNBbEY7OztBQUdHO0FBQ0ksTUFBTSxXQUFXLEdBQUcsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtBQWVsRTs7Ozs7OztBQU9HO0FBQ1UsTUFBQSx3QkFBd0IsR0FBRyxDQUFDLEVBQVcsS0FBMkI7QUFDM0UsSUFBQSxNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7SUFDbEMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDO0lBQy9FLE9BQU87QUFDSCxRQUFBLFVBQVUsRUFBRSxHQUFHO0FBQ2YsUUFBQSxVQUFVLEVBQUUsR0FBRztBQUNmLFFBQUEsVUFBVSxFQUFFLEdBQUc7QUFDZixRQUFBLE1BQU0sRUFBRSxHQUFHO0FBQ1gsUUFBQSxNQUFNLEVBQUUsR0FBRztBQUNYLFFBQUEsTUFBTSxFQUFFLEdBQUc7S0FDZDtBQUNMO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkc7QUFDSSxNQUFNLHNCQUFzQixHQUFHLENBQUMsRUFBZSxFQUFFLElBQVksRUFBRSxJQUFZLEVBQUUsY0FBYyxHQUFHLE1BQU0sS0FBVTtJQUNqSCxNQUFNLFNBQVMsR0FBRyxDQUFBLEdBQUksSUFBSSxHQUFHLElBQUksRUFBQyxFQUFBLEVBQUssY0FBYyxDQUFBLENBQUU7QUFDdkQsSUFBQSxFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBRyxFQUFBLElBQUksSUFBSSxTQUFTLENBQUEsWUFBQSxFQUFlLFNBQVMsQ0FBQSxDQUFFLENBQUM7QUFDdEY7QUFHQTs7Ozs7OztBQU9HO0FBQ1UsTUFBQSxlQUFlLEdBQUcsQ0FBQyxFQUFlLEtBQVU7QUFDckQsSUFBQSxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUM7QUFDekM7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3VpLXV0aWxzLyJ9