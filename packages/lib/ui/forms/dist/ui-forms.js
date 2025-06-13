/*!
 * @cdp/ui-forms 0.9.19
 *   UI form components
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/runtime')) :
  typeof define === 'function' && define.amd ? define(['exports', '@cdp/runtime'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, runtime) { 'use strict';

  const sheet$1 = new CSSStyleSheet();sheet$1.replaceSync("div{display:block;-webkit-text-decoration-skip: ink;text-decoration-skip-ink: auto;}");

  const sheet = new CSSStyleSheet();sheet.replaceSync("div{display:block;-webkit-text-decoration-skip: ink;text-decoration-skip-ink: auto;}");

  const UI_FORMS_STATUS = 'UNDER CONSTRUCTION';
  void runtime.post(runtime.noop(sheet$1, sheet));

  exports.UI_FORMS_STATUS = UI_FORMS_STATUS;

  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktZm9ybXMuanMiLCJzb3VyY2VzIjpbIi4uL3Njc3Mvc3RydWN0dXJlLnNjc3MiLCIuLi9zY3NzL3N0cnVjdHVyZS1idXR0b24uc2NzcyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbbnVsbCxudWxsLCJleHBvcnQgY29uc3QgVUlfRk9STVNfU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG5cbmltcG9ydCB7IG5vb3AsIHBvc3QgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuXG5pbXBvcnQgc3R5bGVDb3JlIGZyb20gJ0Bjc3Mvc3RydWN0dXJlLmNzcycgd2l0aCB7IHR5cGU6ICdjc3MnIH07XG5pbXBvcnQgc3R5bGVCdXR0b24gZnJvbSAnQGNzcy9zdHJ1Y3R1cmUtYnV0dG9uLmNzcycgd2l0aCB7IHR5cGU6ICdjc3MnIH07XG5cbnZvaWQgcG9zdChub29wKHN0eWxlQ29yZSwgc3R5bGVCdXR0b24pKTtcbiJdLCJuYW1lcyI6WyJzaGVldCIsInBvc3QiLCJub29wIiwic3R5bGVDb3JlIiwic3R5bGVCdXR0b24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0VBQ0EsTUFBQUEsT0FBQSxHQUFBLElBQUEsYUFBQSxFQUFBLENBQUFBLE9BQUEsQ0FBQSxXQUFBLENBQUEsc0ZBQUEsQ0FBQTs7RUNBQSxNQUFBLEtBQUEsR0FBQSxJQUFBLGFBQUEsRUFBQSxDQUFBLEtBQUEsQ0FBQSxXQUFBLENBQUEsc0ZBQUEsQ0FBQTs7QUNETyxRQUFNLGVBQWUsR0FBRztFQU8vQixLQUFLQyxZQUFJLENBQUNDLFlBQUksQ0FBQ0MsT0FBUyxFQUFFQyxLQUFXLENBQUMsQ0FBQzs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdWktZm9ybXMvIn0=