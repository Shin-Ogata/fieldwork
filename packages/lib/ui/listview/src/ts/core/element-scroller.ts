import {
    type Nullable,
    type UnknownFunction,
    type DOM,
    type DOMSelector,
    type DOMEventListener,
    type ConnectEventMap,
    type TimerHandle,
    setTimeout,
    clearTimeout,
    dom as $,
} from '@cdp/runtime';
import type {
    ListScrollerFactory,
    ListContextOptions,
    IListScroller,
} from '../interfaces';

/** @internal */
type ScrollerEventMap = HTMLElementEventMap & ConnectEventMap & { 'scrollstop': Event; };

/** @internal */
const enum Const {
    MIN_SCROLLSTOP_DURATION = 50,
}

/**
 * @internal
 * @en {@link IListScroller} implementation class for HTMLElement.
 * @ja HTMLElement を対象とした {@link IListScroller} 実装クラス
 */
export class ElementScroller implements IListScroller {
    private readonly _$target: DOM;
    private readonly _$scrollMap: DOM;
    private readonly _options: ListContextOptions;
    private readonly _scrollStopTrigger: DOMEventListener;
    private _scrollDuration?: number;

    /** constructor */
    constructor(target: DOMSelector, map: DOMSelector, options: ListContextOptions) {
        this._$target = $(target);
        this._$scrollMap = this._$target.children().first();
        this._options = options;

        /*
         * fire custom event: `scrollstop`
         * `scrollend` の Safari 対応待ち
         * https://developer.mozilla.org/ja/docs/Web/API/Element/scrollend_event
         */
        let timer: TimerHandle;
        this._scrollStopTrigger = (): void => {
            if (null != timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => {
                this._$target.trigger(new CustomEvent('scrollstop', { bubbles: true, cancelable: true }));
            }, this._scrollDuration ?? Const.MIN_SCROLLSTOP_DURATION);
        };
        this._$target.on('scroll', this._scrollStopTrigger);
    }

///////////////////////////////////////////////////////////////////////
// static methods:

    /** タイプ定義識別子 */
    static get TYPE(): string {
        return 'cdp:element-overflow-scroller';
    }

    /** factory 取得 */
    static getFactory(): ListScrollerFactory {
        const factory = (target: DOMSelector, map: DOMSelector, options: ListContextOptions): IListScroller => {
            return new ElementScroller(target, map, options);
        };
        // set type signature.
        Object.defineProperties(factory, {
            type: {
                configurable: false,
                writable: false,
                enumerable: true,
                value: ElementScroller.TYPE,
            },
        });
        return factory as ListScrollerFactory;
    }

///////////////////////////////////////////////////////////////////////
// implements: IListScroller

    /** Scroller の型情報を取得 */
    get type(): string {
        return ElementScroller.TYPE;
    }

    /** スクロール位置取得 */
    get pos(): number {
        return this._$target.scrollTop();
    }

    /** スクロール最大値位置を取得 */
    get posMax(): number {
        return Math.max(this._$scrollMap.height() - this._$target.height(), 0);
    }

    /** スクロールイベント登録 */
    on(type: 'scroll' | 'scrollstop', callback: DOMEventListener): void {
        this._$target.on<ScrollerEventMap>(type, callback as UnknownFunction);
    }

    /** スクロールイベント登録解除 */
    off(type: 'scroll' | 'scrollstop', callback: DOMEventListener): void {
        this._$target.off<ScrollerEventMap>(type, callback as UnknownFunction);
    }

    /** スクロール位置を指定 */
    scrollTo(pos: number, animate?: boolean, time?: number): Promise<void> {
        if (pos === this._$target.scrollTop()) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            this._scrollDuration = (animate ?? this._options.enableAnimation) ? time ?? this._options.animationDuration : undefined;
            this._$target.scrollTop(pos, this._scrollDuration, undefined, () => {
                this._scrollDuration = undefined;
                resolve();
            });
        });
    }

    /** Scroller の状態更新 */
    update(): void {
        // noop
    }

    /** Scroller の破棄 */
    destroy(): void {
        this._$target?.off();
        (this._$target as Nullable<DOM>) = (this._$scrollMap as Nullable<DOM>) = null;
    }
}
