/*!
 * @cdp/view 0.9.5
 *   generic view scheme
 */

import { EventSource } from '@cdp/events';

/**
 * @en Base class definition for view that manages the layout and a DOM events.
 * @ja レイアウト管理と DOM イベントの監視を行う View の基底クラス定義
 *
 * TODO:
 */
class View extends EventSource {
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

export { STATUS, View };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlldy5tanMiLCJzb3VyY2VzIjpbImJhc2UudHMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFNvdXJjZSB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IH0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgVmlld0NvbnN0cnVjdGlvbk9wdGlvbnMgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBCYXNlIGNsYXNzIGRlZmluaXRpb24gZm9yIHZpZXcgdGhhdCBtYW5hZ2VzIHRoZSBsYXlvdXQgYW5kIGEgRE9NIGV2ZW50cy5cbiAqIEBqYSDjg6zjgqTjgqLjgqbjg4jnrqHnkIbjgaggRE9NIOOCpOODmeODs+ODiOOBruebo+imluOCkuihjOOBhiBWaWV3IOOBruWfuuW6leOCr+ODqeOCueWumue+qVxuICpcbiAqIFRPRE86XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBWaWV3PFRFbGVtZW50IGV4dGVuZHMgTm9kZSA9IEhUTUxFbGVtZW50LCBURXZlbnQgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3Q+IGV4dGVuZHMgRXZlbnRTb3VyY2U8VEV2ZW50PiB7XG59XG5cbi8qXG7imIUgZXZlbnRzKCk6IEV2ZW50c0hhc2g7XG5cbuKYhSAkKHNlbGVjdG9yOiBzdHJpbmcpOiBKUXVlcnk7XG7imIUgJChzZWxlY3RvcjogYW55KTogSlF1ZXJ5O1xu4peHIG1vZGVsOiBUTW9kZWw7XG7il4cgY29sbGVjdGlvbjogQ29sbGVjdGlvbjxUTW9kZWw+O1xu4piFIC8vdGVtcGxhdGU6IChqc29uLCBvcHRpb25zPykgPT4gc3RyaW5nO1xu4piFIHNldEVsZW1lbnQoZWxlbWVudDogSFRNTEVsZW1lbnR8SlF1ZXJ5LCBkZWxlZ2F0ZT86IGJvb2xlYW4pOiBWaWV3PFRNb2RlbD47XG7imIUgaWQ6IHN0cmluZztcbuKYhSBjaWQ6IHN0cmluZztcbuKYhSBjbGFzc05hbWU6IHN0cmluZztcbuKYhSB0YWdOYW1lOiBzdHJpbmc7XG5cbuKYhSBlbDogYW55O1xu4piFICRlbDogSlF1ZXJ5O1xu4piFIHNldEVsZW1lbnQoZWxlbWVudDogYW55KTogVmlldzxUTW9kZWw+O1xu4piFIGF0dHJpYnV0ZXM6IGFueTtcbuKYhSByZW5kZXIoKTogVmlldzxUTW9kZWw+O1xu4piFIHJlbW92ZSgpOiBWaWV3PFRNb2RlbD47XG7imIUgZGVsZWdhdGVFdmVudHMoZXZlbnRzPzogRXZlbnRzSGFzaCk6IGFueTtcbuKYhSBkZWxlZ2F0ZShldmVudE5hbWU6IHN0cmluZywgc2VsZWN0b3I6IHN0cmluZywgbGlzdGVuZXI6IEZ1bmN0aW9uKTogVmlldzxUTW9kZWw+O1xu4piFIHVuZGVsZWdhdGVFdmVudHMoKTogYW55O1xu4piFIHVuZGVsZWdhdGUoZXZlbnROYW1lOiBzdHJpbmcsIHNlbGVjdG9yPzogc3RyaW5nLCBsaXN0ZW5lcj86IEZ1bmN0aW9uKTogVmlldzxUTW9kZWw+O1xuXG7imIUgX2Vuc3VyZUVsZW1lbnQoKTogdm9pZDtcbiAqL1xuIiwiZXhwb3J0ICogZnJvbSAnLi9pbnRlcmZhY2VzJztcbmV4cG9ydCAqIGZyb20gJy4vYmFzZSc7XG4vLyBUT0RPOlxuZXhwb3J0IGNvbnN0IFNUQVRVUyA9ICdVTkRFUiBDT05TVFJVQ1RJT04nO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFLQTs7Ozs7O01BTXNCLElBQTBFLFNBQVEsV0FBbUI7Q0FDMUg7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ1pBO01BQ2EsTUFBTSxHQUFHOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC92aWV3LyJ9
