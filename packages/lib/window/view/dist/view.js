/*!
 * @cdp/view 0.9.5
 *   generic view scheme
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/events')) :
	typeof define === 'function' && define.amd ? define(['exports', '@cdp/events'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
}(this, (function (exports, events) { 'use strict';

	/**
	 * @en Base class definition for view that manages the layout and a DOM events.
	 * @ja レイアウト管理と DOM イベントの監視を行う View の基底クラス定義
	 *
	 * TODO:
	 */
	class View extends events.EventSource {
	}
	/*
	★ events(): EventsHash;

	★ $(selector: string): JQuery;
	★ $(selector: any): JQuery;
	◇ model: TModel;
	◇ collection: Collection<TModel>;
	★ //template: (json, options?) => string;
	★ setElement(element: HTMLElement|JQuery, delegate?: boolean): View<TModel>;
	★ id: string;
	★ cid: string;
	★ className: string;
	★ tagName: string;

	★ el: any;
	★ $el: JQuery;
	★ setElement(element: any): View<TModel>;
	★ attributes: any;
	★ render(): View<TModel>;
	★ remove(): View<TModel>;
	★ delegateEvents(events?: EventsHash): any;
	★ delegate(eventName: string, selector: string, listener: Function): View<TModel>;
	★ undelegateEvents(): any;
	★ undelegate(eventName: string, selector?: string, listener?: Function): View<TModel>;

	★ _ensureElement(): void;
	 */

	// TODO:
	const STATUS = 'UNDER CONSTRUCTION';

	exports.STATUS = STATUS;
	exports.View = View;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5qcyIsInNvdXJjZXMiOlsiYmFzZS50cyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEV2ZW50U291cmNlIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHsgfSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBWaWV3Q29uc3RydWN0aW9uT3B0aW9ucyB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKlxuICogQGVuIEJhc2UgY2xhc3MgZGVmaW5pdGlvbiBmb3IgdmlldyB0aGF0IG1hbmFnZXMgdGhlIGxheW91dCBhbmQgYSBET00gZXZlbnRzLlxuICogQGphIOODrOOCpOOCouOCpuODiOeuoeeQhuOBqCBET00g44Kk44OZ44Oz44OI44Gu55uj6KaW44KS6KGM44GGIFZpZXcg44Gu5Z+65bqV44Kv44Op44K55a6a576pXG4gKlxuICogVE9ETzpcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFZpZXc8VEVsZW1lbnQgZXh0ZW5kcyBOb2RlID0gSFRNTEVsZW1lbnQsIFRFdmVudCBleHRlbmRzIG9iamVjdCA9IG9iamVjdD4gZXh0ZW5kcyBFdmVudFNvdXJjZTxURXZlbnQ+IHtcbn1cblxuLypcbuKYhSBldmVudHMoKTogRXZlbnRzSGFzaDtcblxu4piFICQoc2VsZWN0b3I6IHN0cmluZyk6IEpRdWVyeTtcbuKYhSAkKHNlbGVjdG9yOiBhbnkpOiBKUXVlcnk7XG7il4cgbW9kZWw6IFRNb2RlbDtcbuKXhyBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uPFRNb2RlbD47XG7imIUgLy90ZW1wbGF0ZTogKGpzb24sIG9wdGlvbnM/KSA9PiBzdHJpbmc7XG7imIUgc2V0RWxlbWVudChlbGVtZW50OiBIVE1MRWxlbWVudHxKUXVlcnksIGRlbGVnYXRlPzogYm9vbGVhbik6IFZpZXc8VE1vZGVsPjtcbuKYhSBpZDogc3RyaW5nO1xu4piFIGNpZDogc3RyaW5nO1xu4piFIGNsYXNzTmFtZTogc3RyaW5nO1xu4piFIHRhZ05hbWU6IHN0cmluZztcblxu4piFIGVsOiBhbnk7XG7imIUgJGVsOiBKUXVlcnk7XG7imIUgc2V0RWxlbWVudChlbGVtZW50OiBhbnkpOiBWaWV3PFRNb2RlbD47XG7imIUgYXR0cmlidXRlczogYW55O1xu4piFIHJlbmRlcigpOiBWaWV3PFRNb2RlbD47XG7imIUgcmVtb3ZlKCk6IFZpZXc8VE1vZGVsPjtcbuKYhSBkZWxlZ2F0ZUV2ZW50cyhldmVudHM/OiBFdmVudHNIYXNoKTogYW55O1xu4piFIGRlbGVnYXRlKGV2ZW50TmFtZTogc3RyaW5nLCBzZWxlY3Rvcjogc3RyaW5nLCBsaXN0ZW5lcjogRnVuY3Rpb24pOiBWaWV3PFRNb2RlbD47XG7imIUgdW5kZWxlZ2F0ZUV2ZW50cygpOiBhbnk7XG7imIUgdW5kZWxlZ2F0ZShldmVudE5hbWU6IHN0cmluZywgc2VsZWN0b3I/OiBzdHJpbmcsIGxpc3RlbmVyPzogRnVuY3Rpb24pOiBWaWV3PFRNb2RlbD47XG5cbuKYhSBfZW5zdXJlRWxlbWVudCgpOiB2b2lkO1xuICovXG4iLCJleHBvcnQgKiBmcm9tICcuL2ludGVyZmFjZXMnO1xuZXhwb3J0ICogZnJvbSAnLi9iYXNlJztcbi8vIFRPRE86XG5leHBvcnQgY29uc3QgU1RBVFVTID0gJ1VOREVSIENPTlNUUlVDVElPTic7XG4iXSwibmFtZXMiOlsiRXZlbnRTb3VyY2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0NBS0E7Ozs7OztPQU1zQixJQUEwRSxTQUFRQSxrQkFBbUI7RUFDMUg7Q0FFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQ1pBO09BQ2EsTUFBTSxHQUFHOzs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdmlldy8ifQ==
