/*!
 * @cdp/ui-components 0.9.18
 *   ui-componets collection
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/runtime')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/runtime'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, runtime) { 'use strict';

    /*!
     * @cdp/ui-utils 0.9.18
     *   UI components common utilities
     */


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

    const UI_UTILS_STATUS = 'UNDER CONSTRUCTION';
    runtime.isFunction(runtime.i18n.t) && console.log('okok');

    /*!
     * @cdp/ui-forms 0.9.18
     *   UI form components
     */


    const styleCore = "div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}";

    const styleButton = "div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}";

    const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
    void runtime.post(runtime.noop(styleCore, styleButton));

    /*!
     * @cdp/ui-listview 0.9.18
     *   web domain utilities
     */

    const UI_LISTVIEW_STATUS = 'UNDER CONSTRUCTION';

    exports.UI_FORMS_STATUS = UI_FORMS_STATUS;
    exports.UI_LISTVIEW_STATUS = UI_LISTVIEW_STATUS;
    exports.UI_UTILS_STATUS = UI_UTILS_STATUS;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy5qcyIsInNvdXJjZXMiOlsidWktdXRpbHMvcmVzdWx0LWNvZGUtZGVmcy50cyIsInVpLXV0aWxzL2luZGV4LnRzIiwidWktZm9ybXMvaW5kZXgudHMiLCJ1aS1saXN0dmlldy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICovXG5cbm5hbWVzcGFjZSBDRFBfREVDTEFSRSB7XG5cbiAgICBjb25zdCBlbnVtIENEUF9LTk9XTl9VSV9NT0RVTEUge1xuICAgICAgICAvKiogYEBjZHAvdWktdXRpbHNgICovXG4gICAgICAgIFVUSUxTICA9IDEsXG4gICAgICAgIE9GRlNFVCA9IDIsXG4gICAgfVxuXG4gICAgY29uc3QgZW51bSBMT0NBTF9DT0RFX0JBU0Uge1xuICAgICAgICBVSV9VVElMUyA9IChDRFBfS05PV05fTU9EVUxFLk9GRlNFVCArIENEUF9LTk9XTl9VSV9NT0RVTEUuVVRJTFMpICogTE9DQUxfQ09ERV9SQU5HRV9HVUlERS5GVU5DVElPTixcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRXh0ZW5kcyBlcnJvciBjb2RlIGRlZmluaXRpb25zLlxuICAgICAqIEBqYSDmi6HlvLXjgqjjg6njg7zjgrPjg7zjg4nlrprnvqlcbiAgICAgKi9cbiAgICBleHBvcnQgZW51bSBSRVNVTFRfQ09ERSB7XG4gICAgICAgIFVJX1VUSUxTX0RFQ0xBUkUgPSBSRVNVTFRfQ09ERV9CQVNFLkRFQ0xBUkUsXG4gICAgICAgIEVSUk9SX1VJX1VUSUxTX0ZBVEFMID0gREVDTEFSRV9FUlJPUl9DT0RFKFJFU1VMVF9DT0RFX0JBU0UuQ0RQLCBMT0NBTF9DT0RFX0JBU0UuVUlfVVRJTFMgKyAxLCAnVUkgdXRpbHMgc29tZXRoaW5nIHdyb25nLicpLFxuICAgIH1cbn1cbiIsImV4cG9ydCBjb25zdCBVSV9VVElMU19TVEFUVVMgPSAnVU5ERVIgQ09OU1RSVUNUSU9OJztcblxuLy8gVE9ETzogdGVzdFxuaW1wb3J0ICcuL3Jlc3VsdC1jb2RlLWRlZnMnO1xuaW1wb3J0IHsgaTE4biwgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbmlzRnVuY3Rpb24oaTE4bi50KSAmJiAgY29uc29sZS5sb2coJ29rb2snKTtcbiIsImV4cG9ydCBjb25zdCBVSV9GT1JNU19TVEFUVVMgPSAnVU5ERVIgQ09OU1RSVUNUSU9OJztcblxuaW1wb3J0IHsgbm9vcCwgcG9zdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbmltcG9ydCBzdHlsZUNvcmUgZnJvbSAnQGNzcy9zdHJ1Y3R1cmUuY3NzJyBhc3NlcnQgeyB0eXBlOiAnY3NzJyB9O1xuaW1wb3J0IHN0eWxlQnV0dG9uIGZyb20gJ0Bjc3Mvc3RydWN0dXJlLWJ1dHRvbi5jc3MnIGFzc2VydCB7IHR5cGU6ICdjc3MnIH07XG52b2lkIHBvc3Qobm9vcChzdHlsZUNvcmUsIHN0eWxlQnV0dG9uKSk7XG4iLCJleHBvcnQgY29uc3QgVUlfTElTVFZJRVdfU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG4iXSwibmFtZXMiOlsiaXNGdW5jdGlvbiIsImkxOG4iLCJwb3N0Iiwibm9vcCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFBQTs7O0lBR0c7SUFFSCxDQUFBLFlBQXFCO0lBWWpCOzs7SUFHRztJQUNILElBQUEsSUFHQyxXQUFBLEdBQUEsV0FBQSxDQUFBLFdBQUEsQ0FBQTtJQUhELElBQUEsQ0FBQSxZQUF1QjtJQUNuQixRQUFBLFdBQUEsQ0FBQSxXQUFBLENBQUEsa0JBQUEsQ0FBQSxHQUFBLGdCQUFBLENBQUEsR0FBQSxrQkFBMkMsQ0FBQTtZQUMzQyxXQUF1QixDQUFBLFdBQUEsQ0FBQSxzQkFBQSxDQUFBLEdBQUEsV0FBQSxDQUFBLGtCQUFrQixDQUF1QixHQUFBLDZCQUFBLEdBQUEsa0NBQTJCLENBQUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFBLEdBQUEsc0JBQUEsQ0FBQTtJQUM5SCxLQUFDLEdBQUEsQ0FBQTtJQUNMLENBQUMsR0FBQSxDQUFBOztBQ3pCWSxVQUFBLGVBQWUsR0FBRyxxQkFBcUI7QUFNcERBLHNCQUFVLENBQUNDLFlBQUksQ0FBQyxDQUFDLENBQUMsSUFBSyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQzs7Ozs7Ozs7Ozs7O0FDTjdCLFVBQUEsZUFBZSxHQUFHLHFCQUFxQjtJQU1wRCxLQUFLQyxZQUFJLENBQUNDLFlBQUksQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7Ozs7Ozs7QUNOaEMsVUFBTSxrQkFBa0IsR0FBRzs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC91aS1jb21wb25lbnRzLyJ9