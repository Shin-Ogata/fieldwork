/*!
 * @cdp/binary 0.9.0
 *   binary utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Utils));
}(this, function (exports, coreUtils) { 'use strict';

    const _btoa = coreUtils.safe(globalThis.btoa);
    const _atob = coreUtils.safe(globalThis.atob);
    const _Blob = coreUtils.safe(globalThis.Blob);
    const _FileReader = coreUtils.safe(globalThis.FileReader);

    /**
     * @en `base64` utility for independent charactor code.
     * @ja 文字コードに依存しない `base64` ユーティリティ
     */
    class Base64 {
        /**
         * @en Encode a base-64 encoded string from a binary string.
         * @ja 文字列を base64 形式でエンコード
         */
        static encode(src) {
            return _btoa(unescape(encodeURIComponent(src)));
        }
        /**
         * @en Decodes a string of data which has been encoded using base-64 encoding.
         * @ja base64 形式でエンコードされたデータの文字列をデコード
         */
        static decode(encoded) {
            return decodeURIComponent(escape(_atob(encoded)));
        }
    }

    exports.Base64 = Base64;
    exports.Blob = _Blob;
    exports.FileReader = _FileReader;
    exports.atob = _atob;
    exports.btoa = _btoa;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5LmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJiYXNlNjQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbmNvbnN0IF9idG9hID0gc2FmZShnbG9iYWxUaGlzLmJ0b2EpO1xuY29uc3QgX2F0b2IgPSBzYWZlKGdsb2JhbFRoaXMuYXRvYik7XG5jb25zdCBfQmxvYiA9IHNhZmUoZ2xvYmFsVGhpcy5CbG9iKTtcbmNvbnN0IF9GaWxlUmVhZGVyID0gc2FmZShnbG9iYWxUaGlzLkZpbGVSZWFkZXIpO1xuXG5leHBvcnQge1xuICAgIF9idG9hIGFzIGJ0b2EsXG4gICAgX2F0b2IgYXMgYXRvYixcbiAgICBfQmxvYiBhcyBCbG9iLFxuICAgIF9GaWxlUmVhZGVyIGFzIEZpbGVSZWFkZXIsXG59O1xuIiwiaW1wb3J0IHsgYXRvYiwgYnRvYSB9IGZyb20gJy4vc3NyJztcblxuLyoqXG4gKiBAZW4gYGJhc2U2NGAgdXRpbGl0eSBmb3IgaW5kZXBlbmRlbnQgY2hhcmFjdG9yIGNvZGUuXG4gKiBAamEg5paH5a2X44Kz44O844OJ44Gr5L6d5a2Y44GX44Gq44GEIGBiYXNlNjRgIOODpuODvOODhuOCo+ODquODhuOCo1xuICovXG5leHBvcnQgY2xhc3MgQmFzZTY0IHtcbiAgICAvKipcbiAgICAgKiBAZW4gRW5jb2RlIGEgYmFzZS02NCBlbmNvZGVkIHN0cmluZyBmcm9tIGEgYmluYXJ5IHN0cmluZy5cbiAgICAgKiBAamEg5paH5a2X5YiX44KSIGJhc2U2NCDlvaLlvI/jgafjgqjjg7PjgrPjg7zjg4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGVuY29kZShzcmM6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzcmMpKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIERlY29kZXMgYSBzdHJpbmcgb2YgZGF0YSB3aGljaCBoYXMgYmVlbiBlbmNvZGVkIHVzaW5nIGJhc2UtNjQgZW5jb2RpbmcuXG4gICAgICogQGphIGJhc2U2NCDlvaLlvI/jgafjgqjjg7PjgrPjg7zjg4njgZXjgozjgZ/jg4fjg7zjgr/jga7mloflrZfliJfjgpLjg4fjgrPjg7zjg4lcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGRlY29kZShlbmNvZGVkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShhdG9iKGVuY29kZWQpKSk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJidG9hIiwiYXRvYiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7VUFFTSxLQUFLLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEMsVUFBTSxLQUFLLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEMsVUFBTSxLQUFLLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEMsVUFBTSxXQUFXLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDOztJQ0gvQzs7OztBQUlBLFVBQWEsTUFBTTs7Ozs7UUFLUixPQUFPLE1BQU0sQ0FBQyxHQUFXO1lBQzVCLE9BQU9DLEtBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2xEOzs7OztRQU1NLE9BQU8sTUFBTSxDQUFDLE9BQWU7WUFDaEMsT0FBTyxrQkFBa0IsQ0FBQyxNQUFNLENBQUNDLEtBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDcEQ7S0FDSjs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvYmluYXJ5LyJ9
