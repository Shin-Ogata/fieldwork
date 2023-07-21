/*!
 * @cdp/ui-components 0.9.17
 *   ui-componets collection
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/runtime')) :
	typeof define === 'function' && define.amd ? define(['exports', '@cdp/runtime'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, runtime) { 'use strict';

	/*!
	 * @cdp/ui-utils 0.9.17
	 *   UI components common utilities
	 */

	const UI_UTILS_STATUS = 'UNDER CONSTRUCTION';

	/*!
	 * @cdp/ui-forms 0.9.17
	 *   UI form components
	 */


	const sheet$1 = new CSSStyleSheet();sheet$1.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

	const sheet = new CSSStyleSheet();sheet.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

	const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
	void runtime.post(runtime.noop(sheet$1, sheet));

	/*!
	 * @cdp/ui-listview 0.9.17
	 *   web domain utilities
	 */

	const UI_LISTVIEW_STATUS = 'UNDER CONSTRUCTION';

	exports.UI_FORMS_STATUS = UI_FORMS_STATUS;
	exports.UI_LISTVIEW_STATUS = UI_LISTVIEW_STATUS;
	exports.UI_UTILS_STATUS = UI_UTILS_STATUS;

	Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50cy5qcyIsInNvdXJjZXMiOlsidWktdXRpbHMvaW5kZXgudHMiLCJ1aS1mb3Jtcy9pbmRleC50cyIsInVpLWxpc3R2aWV3L2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBVSV9VVElMU19TVEFUVVMgPSAnVU5ERVIgQ09OU1RSVUNUSU9OJztcbiIsImV4cG9ydCBjb25zdCBVSV9GT1JNU19TVEFUVVMgPSAnVU5ERVIgQ09OU1RSVUNUSU9OJztcblxuaW1wb3J0IHsgbm9vcCwgcG9zdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbmltcG9ydCBzdHlsZUNvcmUgZnJvbSAnQGNzcy9zdHJ1Y3R1cmUuY3NzJyBhc3NlcnQgeyB0eXBlOiAnY3NzJyB9O1xuaW1wb3J0IHN0eWxlQnV0dG9uIGZyb20gJ0Bjc3Mvc3RydWN0dXJlLWJ1dHRvbi5jc3MnIGFzc2VydCB7IHR5cGU6ICdjc3MnIH07XG52b2lkIHBvc3Qobm9vcChzdHlsZUNvcmUsIHN0eWxlQnV0dG9uKSk7XG4iLCJleHBvcnQgY29uc3QgVUlfTElTVFZJRVdfU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG4iXSwibmFtZXMiOlsicG9zdCIsIm5vb3AiLCJzdHlsZUNvcmUiLCJzdHlsZUJ1dHRvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFPLE9BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7Ozs7QUNBbEIsT0FBQSxlQUFlLEdBQUcscUJBQXFCO0NBTXBELEtBQUtBLFlBQUksQ0FBQ0MsWUFBSSxDQUFDQyxPQUFTLEVBQUVDLEtBQVcsQ0FBQyxDQUFDOzs7Ozs7O0FDTmhDLE9BQU0sa0JBQWtCLEdBQUc7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdWktY29tcG9uZW50cy8ifQ==