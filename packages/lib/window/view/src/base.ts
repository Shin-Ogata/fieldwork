import { } from '@cdp/core-utils';
import { EventSource } from '@cdp/events';
import { } from '@cdp/dom';
import { ViewConstructionOptions } from './interfaces';

/**
 * @en Base class definition for view that manages the layout and a DOM events.
 * @ja レイアウト管理と DOM イベントの監視を行う View の基底クラス定義
 *
 * TODO:
 */
export abstract class View<TElement extends Node = HTMLElement, TEvent extends object = object> extends EventSource<TEvent> {
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
