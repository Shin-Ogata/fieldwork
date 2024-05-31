/*!
 * @cdp/ui-forms 0.9.18
 *   UI form components
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/runtime')) :
  typeof define === 'function' && define.amd ? define(['exports', '@cdp/runtime'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, runtime) { 'use strict';

  const sheet$1 = new CSSStyleSheet();sheet$1.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

  const sheet = new CSSStyleSheet();sheet.replaceSync("div{display:block;-webkit-text-decoration-skip:ink;text-decoration-skip-ink:auto;}");

  const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
  void runtime.post(runtime.noop(sheet$1, sheet));

  exports.UI_FORMS_STATUS = UI_FORMS_STATUS;

  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktZm9ybXMuanMiLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBVSV9GT1JNU19TVEFUVVMgPSAnVU5ERVIgQ09OU1RSVUNUSU9OJztcblxuaW1wb3J0IHsgbm9vcCwgcG9zdCB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG5cbmltcG9ydCBzdHlsZUNvcmUgZnJvbSAnQGNzcy9zdHJ1Y3R1cmUuY3NzJyB3aXRoIHsgdHlwZTogJ2NzcycgfTtcbmltcG9ydCBzdHlsZUJ1dHRvbiBmcm9tICdAY3NzL3N0cnVjdHVyZS1idXR0b24uY3NzJyB3aXRoIHsgdHlwZTogJ2NzcycgfTtcblxudm9pZCBwb3N0KG5vb3Aoc3R5bGVDb3JlLCBzdHlsZUJ1dHRvbikpO1xuIl0sIm5hbWVzIjpbInBvc3QiLCJub29wIiwic3R5bGVDb3JlIiwic3R5bGVCdXR0b24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFPLFFBQU0sZUFBZSxHQUFHLHFCQUFxQjtFQU9wRCxLQUFLQSxZQUFJLENBQUNDLFlBQUksQ0FBQ0MsT0FBUyxFQUFFQyxLQUFXLENBQUMsQ0FBQzs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdWktZm9ybXMvIn0=