/*!
 * @cdp/i18n 0.9.0
 *   internationalization module
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-i18n')) :
	typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-i18n'], factory) :
	(global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Extension));
}(this, (function (exports, extensionI18n) { 'use strict';

	/**
	 * @en Translate funcion.
	 * @ja 翻訳関数
	 */
	const t = extensionI18n.i18n.t.bind(extensionI18n.i18n);

	Object.keys(extensionI18n).forEach(function (k) {
		if (k !== 'default') Object.defineProperty(exports, k, {
			enumerable: true,
			get: function () {
				return extensionI18n[k];
			}
		});
	});
	exports.t = t;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZXMiOlsiY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgKiBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcblxuLyoqXG4gKiBAZW4gVHJhbnNsYXRlIGZ1bmNpb24uXG4gKiBAamEg57+76Kiz6Zai5pWwXG4gKi9cbmV4cG9ydCBjb25zdCB0OiBpMThuLlRGdW5jdGlvbiA9IGkxOG4udC5iaW5kKGkxOG4pO1xuIl0sIm5hbWVzIjpbImkxOG4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0NBR0E7Ozs7T0FJYSxDQUFDLEdBQW1CQSxrQkFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUNBLGtCQUFJOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvaTE4bi8ifQ==
