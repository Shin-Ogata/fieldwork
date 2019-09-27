/*!
 * @cdp/binary 0.9.0
 *   binary utility module
 */

import { safe } from '@cdp/core-utils';

const _btoa = safe(globalThis.btoa);
const _atob = safe(globalThis.atob);
const _Blob = safe(globalThis.Blob);
const _FileReader = safe(globalThis.FileReader);

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

export { Base64, _Blob as Blob, _FileReader as FileReader, _atob as atob, _btoa as btoa };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5Lm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwiYmFzZTY0LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG5jb25zdCBfYnRvYSA9IHNhZmUoZ2xvYmFsVGhpcy5idG9hKTtcbmNvbnN0IF9hdG9iID0gc2FmZShnbG9iYWxUaGlzLmF0b2IpO1xuY29uc3QgX0Jsb2IgPSBzYWZlKGdsb2JhbFRoaXMuQmxvYik7XG5jb25zdCBfRmlsZVJlYWRlciA9IHNhZmUoZ2xvYmFsVGhpcy5GaWxlUmVhZGVyKTtcblxuZXhwb3J0IHtcbiAgICBfYnRvYSBhcyBidG9hLFxuICAgIF9hdG9iIGFzIGF0b2IsXG4gICAgX0Jsb2IgYXMgQmxvYixcbiAgICBfRmlsZVJlYWRlciBhcyBGaWxlUmVhZGVyLFxufTtcbiIsImltcG9ydCB7IGF0b2IsIGJ0b2EgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIGBiYXNlNjRgIHV0aWxpdHkgZm9yIGluZGVwZW5kZW50IGNoYXJhY3RvciBjb2RlLlxuICogQGphIOaWh+Wtl+OCs+ODvOODieOBq+S+neWtmOOBl+OBquOBhCBgYmFzZTY0YCDjg6bjg7zjg4bjgqPjg6rjg4bjgqNcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2U2NCB7XG4gICAgLyoqXG4gICAgICogQGVuIEVuY29kZSBhIGJhc2UtNjQgZW5jb2RlZCBzdHJpbmcgZnJvbSBhIGJpbmFyeSBzdHJpbmcuXG4gICAgICogQGphIOaWh+Wtl+WIl+OCkiBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBlbmNvZGUoc3JjOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3JjKSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWNvZGVzIGEgc3RyaW5nIG9mIGRhdGEgd2hpY2ggaGFzIGJlZW4gZW5jb2RlZCB1c2luZyBiYXNlLTY0IGVuY29kaW5nLlxuICAgICAqIEBqYSBiYXNlNjQg5b2i5byP44Gn44Ko44Oz44Kz44O844OJ44GV44KM44Gf44OH44O844K/44Gu5paH5a2X5YiX44KS44OH44Kz44O844OJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBkZWNvZGUoZW5jb2RlZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYXRvYihlbmNvZGVkKSkpO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJidG9hIiwiYXRvYiJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztNQUVNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQzs7QUNIL0M7Ozs7QUFJQSxNQUFhLE1BQU07Ozs7O0lBS1IsT0FBTyxNQUFNLENBQUMsR0FBVztRQUM1QixPQUFPQSxLQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNsRDs7Ozs7SUFNTSxPQUFPLE1BQU0sQ0FBQyxPQUFlO1FBQ2hDLE9BQU8sa0JBQWtCLENBQUMsTUFBTSxDQUFDQyxLQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3BEO0NBQ0o7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2JpbmFyeS8ifQ==
