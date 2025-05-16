import {
    dom as $,
    type DOM,
} from '@cdp/dom';
import { defaultSync, dataSyncSTORAGE } from '@cdp/data-sync';

defaultSync(dataSyncSTORAGE);

export interface OrderProvider {
    nextOrder(): number;
}

let _orderProvider!: OrderProvider;

export const setOrderProvider = (provider: OrderProvider): OrderProvider => {
    _orderProvider = provider;
    return _orderProvider;
};

export const nextOrder = (): number => {
    return _orderProvider.nextOrder();
};

// DOM extention example

declare module '@cdp/dom' {
    interface DOMPlugin {
        show(): this;
        hide(): this;
    }
}

function show(this: DOM): DOM {
    return this.each((index: number, el: HTMLElement) => {
        const $el = $(el);
        $el.css('display', 'block');
    });
}

function hide(this: DOM): DOM {
    return this.each((index: number, el: HTMLElement) => {
        const $el = $(el);
        $el.css('display', 'none');
    });
}

$.fn['show'] = show;
$.fn['hide'] = hide;
