/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    dom as $,
    DOMEventMap,
} from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
    mixedCollection,
} from './tools';

describe('dom/events spec', () => {
    const testee = $.utils.elementify.bind($.utils);

    const evClick = (() => {
        const e = document.createEvent('Event');
        e.initEvent('click', true, true);
        return e;
    })();

    const createEvent = (name: string, objectName = 'Event'): Event => {
        const e = document.createEvent(objectName);
        e.initEvent(name, true, true);
        return e;
    };

    let count: number;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const onCallback = (...args: any[]): void => {
        count++;
//      console.log(`received: ${JSON.stringify([...args])} \n`);
    };

    const onCallback2 = (...args: any[]): void => { count++; };
    const onCallback3 = (...args: any[]): void => { count++; };
    /* eslint-enable @typescript-eslint/no-unused-vars */

    beforeEach(() => {
        count = 0;
    });

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check DOM#on(type, listener), single element', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        $dom.on('click', stub.onCallback);

        await $dom[0].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom[0].dispatchEvent(evClick);
        expect(count).toBe(2);
    });

    it('check DOM#on(type, listener), multi element', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('.test-dom');
        await $dom[0].dispatchEvent(evClick);
        await $dom[1].dispatchEvent(evClick);
        await $dom[2].dispatchEvent(evClick);
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);

        $dom.on('click', stub.onCallback);

        await $dom[0].dispatchEvent(evClick);
        await $dom[1].dispatchEvent(evClick);
        await $dom[2].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(3);
    });

    it('check DOM#on(type, listener, options=true), multi element', async () => {
        prepareTestElements();
        const stub = {
            onEvent: (e: Event): void => {
                onCallback(e);
                e.stopPropagation();
            },
        };
        const stub2 = { onCallback };
        spyOn(stub, 'onEvent').and.callThrough();
        spyOn(stub2, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        $dom.on('click', stub.onEvent, true);
        const $child = $('#d1 > .test-dom-child');
        $child.on('click', stub2.onCallback);

        await $child[0].dispatchEvent(evClick);
        expect(stub.onEvent).toHaveBeenCalled();
        expect(stub2.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(1);
    });

    it('check DOM#on(type, selector, listener), multi element', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('.test-dom');

        $dom.on('click', '#d2', stub.onCallback);

        await $dom[0].dispatchEvent(evClick);
        await $dom[1].dispatchEvent(evClick);
        await $dom[2].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);
    });

    it('check DOM#on(type, selector, listener), multi element child click', async () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom father">
    <p class="test-dom-child"></p>
</div>
<div id="d2" class="test-dom mother1">
    <span class="test-dom-child"></span>
</div>
<div id="d3" class="test-dom mother2">
    <hr class="test-dom-child twins"></hr>
    <p class="test-dom-child twins"></p>
</div>`));

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('.test-dom');

        $dom.on('click', '.mother2', stub.onCallback);

        const $children = $('.test-dom-child');

        await $children[0].dispatchEvent(evClick);
        await $children[1].dispatchEvent(evClick);
        await $children[2].dispatchEvent(evClick);
        await $children[3].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(2);
    });

    it('check DOM#on(type, listener), single element, multi register ensure one call (mistake)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        $dom.on('click', stub.onCallback);
        $dom.on('click', stub.onCallback); // mistake register

        await $dom[0].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom[0].dispatchEvent(evClick);
        expect(count).toBe(2);
    });

    it('check DOM#off(type, listener), single element', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        $dom.on('click', stub.onCallback);

        await $dom[0].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        $dom.off('dblclick', stub.onCallback);
        await $dom[0].dispatchEvent(evClick);
        expect(count).toBe(2);

        $dom.off('click', stub.onCallback);
        await $dom[0].dispatchEvent(evClick);
        expect(count).toBe(2);
    });

    it('check DOM#off(type), single element', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const stub2 = { onCallback2 };
        spyOn(stub2, 'onCallback2').and.callThrough();

        const $dom = $('#d1');
        $dom.on('click', stub.onCallback);
        $dom.on('click', stub2.onCallback2);

        await $dom[0].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub2.onCallback2).toHaveBeenCalled();
        expect(count).toBe(2);

        $dom.off('click');
        await $dom[0].dispatchEvent(evClick);
        expect(count).toBe(2);
    });

    it('check DOM#off(), multi element', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const stub2 = { onCallback2 };
        spyOn(stub2, 'onCallback2').and.callThrough();
        const stub3 = { onCallback3 };
        spyOn(stub3, 'onCallback3').and.callThrough();

        const $dom = $('.test-dom');
        $dom.on('click', stub.onCallback);
        $dom.on('click', '#d2', stub2.onCallback2);
        $dom.on('click', stub3.onCallback3);

        await $dom[0].dispatchEvent(evClick);
        await $dom[1].dispatchEvent(evClick);
        await $dom[2].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub2.onCallback2).toHaveBeenCalled();
        expect(stub3.onCallback3).toHaveBeenCalled();
        expect(count).toBe(7);

        $dom.off();
        await $dom[0].dispatchEvent(evClick);
        await $dom[1].dispatchEvent(evClick);
        await $dom[2].dispatchEvent(evClick);
        expect(count).toBe(7);
    });

    it('check DOM#off(), no set case', () => {
        prepareTestElements();
        const stub = { onCallback };

        const $dom = $('.test-dom');
        expect(() => $dom.off('click', stub.onCallback)).not.toThrow();
        expect(() => $dom.off('click')).not.toThrow();
        expect(() => $dom.off()).not.toThrow();

        const stub2 = { onCallback2 };
        $dom.on('click', stub.onCallback);
        expect(() => $dom.off('click', stub2.onCallback2)).not.toThrow();
    });

    it('check DOM#on([type], selector, listener, options) -> DOM#off([type], selector, listener, options)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evDblClick = createEvent('dblclick');

        const $dom = $('.test-dom');

        $dom.on(['click', 'dblclick'], '#d2', stub.onCallback, { passive: true });

        await $dom[0].dispatchEvent(evClick);
        await $dom[1].dispatchEvent(evClick);
        await $dom[2].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom[0].dispatchEvent(evDblClick);
        await $dom[1].dispatchEvent(evDblClick);
        await $dom[2].dispatchEvent(evDblClick);
        expect(count).toBe(2);

        $dom.off(['click', 'dblclick'], '#d2', stub.onCallback, { passive: true });

        await $dom[0].dispatchEvent(evClick);
        await $dom[1].dispatchEvent(evClick);
        await $dom[2].dispatchEvent(evClick);
        expect(count).toBe(2);

        await $dom[0].dispatchEvent(evDblClick);
        await $dom[1].dispatchEvent(evDblClick);
        await $dom[2].dispatchEvent(evDblClick);
        expect(count).toBe(2);
    });

    it('check DOM#once(type, listener), multi element', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('.test-dom');
        $dom.once('click', stub.onCallback);

        await $dom[0].dispatchEvent(evClick);
        await $dom[1].dispatchEvent(evClick);
        await $dom[2].dispatchEvent(evClick);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);
    });

    it('check DOM#once(type, selector, listener) -> DOM#off(type, selector, listener)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('.test-dom');
        $dom.once('click', '#d1', stub.onCallback);
        $dom.off('click', '#d1', stub.onCallback);

        await $dom[0].dispatchEvent(evClick);
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    it('check DOM#once([type], listener) -> DOM#off([type])', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evDblClick = createEvent('dblclick');

        const $dom = $('.test-dom');
        $dom.once(['click', 'dblclick'], stub.onCallback);
        $dom.off(['click', 'dblclick']);

        await $dom[0].dispatchEvent(evClick);
        await $dom[0].dispatchEvent(evDblClick);
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    it('check DOM#trigger(string)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        $dom.on('click', stub.onCallback);
        await $dom.trigger('click');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);
    });

    it('check DOM#trigger(string, ...args)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        $dom.on('click', stub.onCallback);
        await $dom.trigger('click', 100, 'test');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith(jasmine.any(Event), 100, 'test');
        expect(count).toBe(1);
    });

    it('check DOM#trigger([string], ...args)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        $dom.on(['click', 'dblclick'], stub.onCallback);
        await $dom.trigger(['click', 'dblclick'], 200, 'test2');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith(jasmine.any(Event), 200, 'test2');
        expect(count).toBe(2);
    });

    it('check DOM#trigger(Event, ...args)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        $dom.on('click', stub.onCallback);
        await $dom.trigger(evClick, 100, 'test');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith(jasmine.any(Event), 100, 'test');
        expect(count).toBe(1);
    });

    it('check DOM#trigger([Event], ...args)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evDblClick = createEvent('dblclick');

        const $dom = $('#d1');
        $dom.on(['click', 'dblclick'], stub.onCallback);
        await $dom.trigger([evClick, evDblClick], 200, 'test2');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith(jasmine.any(Event), 200, 'test2');
        expect(count).toBe(2);
    });

    it('check DOM#trigger([string, Event], ...args)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evDblClick = createEvent('dblclick');

        const $dom = $('#d1');
        $dom.on(['click', 'dblclick'], stub.onCallback);
        await $dom.trigger(['click', evDblClick], 200, 'test2');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith(jasmine.any(Event), 200, 'test2');
        expect(count).toBe(2);
    });

    it('check DOM#trigger("custom")', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');

        interface Hoge extends DOMEventMap<HTMLElement> {
            hoge: Event;
        }

        $dom.on<Hoge>('hoge', stub.onCallback);
        await $dom.trigger<Hoge>('hoge');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);
    });

    it('check events, mixedCollection', async () => {
        const $dom = mixedCollection();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        $dom.on('click', stub.onCallback);
        await $dom.trigger('click');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe($dom.length);
    });

    it('check DOM#transitionStart(callback)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evTransitionStart = createEvent('transitionstart', 'TransitionEvent');

        const $dom = $('#d1');

        $dom.transitionStart(stub.onCallback);
        await $dom.trigger(evTransitionStart);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom.trigger(evTransitionStart);
        expect(count).toBe(1);
    });

    it('check DOM#transitionStart(callback, true)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evTransitionStart = createEvent('transitionstart', 'TransitionEvent');

        const $dom = $('#d1');

        $dom.transitionStart(stub.onCallback, true);
        await $dom.trigger(evTransitionStart);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom.trigger(evTransitionStart);
        expect(count).toBe(2);
    });

    it('check DOM#transitionStart(callback), child', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evTransitionStart = createEvent('transitionstart', 'TransitionEvent');

        const $dom = $('#d1');

        $dom.transitionStart(stub.onCallback);
        await $dom[0].firstElementChild!.dispatchEvent(evTransitionStart); // eslint-disable-line
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    it('check DOM#transitionStart(callback), callback invalid', () => {
        prepareTestElements();
        const evTransitionStart = createEvent('transitionstart', 'TransitionEvent');

        const $dom = $('#d1');

        expect(() => $dom.transitionStart(null as any)).not.toThrow();
        expect(() => $dom.trigger(evTransitionStart)).not.toThrow();
    });

    it('check DOM#transitionEnd(callback)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evTransitionEnd = createEvent('transitionend', 'TransitionEvent');

        const $dom = $('#d1');

        $dom.transitionEnd(stub.onCallback);
        await $dom.trigger(evTransitionEnd);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom.trigger(evTransitionEnd);
        expect(count).toBe(1);
    });

    it('check DOM#transitionEnd(callback, true)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evTransitionEnd = createEvent('transitionend', 'TransitionEvent');

        const $dom = $('#d1');

        $dom.transitionEnd(stub.onCallback, true);
        await $dom.trigger(evTransitionEnd);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom.trigger(evTransitionEnd);
        expect(count).toBe(2);
    });

    it('check DOM#transitionEnd(callback), child', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evTransitionEnd = createEvent('transitionend', 'TransitionEvent');

        const $dom = $('#d1');

        $dom.transitionEnd(stub.onCallback);
        await $dom[0].firstElementChild!.dispatchEvent(evTransitionEnd); // eslint-disable-line
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    it('check DOM#transitionEnd(callback), callback invalid', () => {
        prepareTestElements();
        const evTransitionEnd = createEvent('transitionend', 'TransitionEvent');

        const $dom = $('#d1');

        expect(() => $dom.transitionEnd(null as any)).not.toThrow();
        expect(() => $dom.trigger(evTransitionEnd)).not.toThrow();
    });

    it('check DOM#animationStart(callback)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evAnimationStart = createEvent('animationstart', 'AnimationEvent');

        const $dom = $('#d1');

        $dom.animationStart(stub.onCallback);
        await $dom.trigger(evAnimationStart);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom.trigger(evAnimationStart);
        expect(count).toBe(1);
    });

    it('check DOM#animationStart(callback, true)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evAnimationStart = createEvent('animationstart', 'AnimationEvent');

        const $dom = $('#d1');

        $dom.animationStart(stub.onCallback, true);
        await $dom.trigger(evAnimationStart);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom.trigger(evAnimationStart);
        expect(count).toBe(2);
    });

    it('check DOM#animationStart(callback), child', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evAnimationStart = createEvent('animationstart', 'AnimationEvent');

        const $dom = $('#d1');

        $dom.animationStart(stub.onCallback);
        await $dom[0].firstElementChild!.dispatchEvent(evAnimationStart); // eslint-disable-line
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    it('check DOM#animationStart(callback), callback invalid', () => {
        prepareTestElements();
        const evAnimationStart = createEvent('animationstart', 'AnimationEvent');

        const $dom = $('#d1');

        expect(() => $dom.animationStart(null as any)).not.toThrow();
        expect(() => $dom.trigger(evAnimationStart)).not.toThrow();
    });

    it('check DOM#animationEnd(callback)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evAnimationEnd = createEvent('animationend', 'AnimationEvent');

        const $dom = $('#d1');

        $dom.animationEnd(stub.onCallback);
        await $dom.trigger(evAnimationEnd);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom.trigger(evAnimationEnd);
        expect(count).toBe(1);
    });

    it('check DOM#animationEnd(callback, true)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evAnimationEnd = createEvent('animationend', 'AnimationEvent');

        const $dom = $('#d1');

        $dom.animationEnd(stub.onCallback, true);
        await $dom.trigger(evAnimationEnd);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        await $dom.trigger(evAnimationEnd);
        expect(count).toBe(2);
    });

    it('check DOM#animationEnd(callback), child', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evAnimationEnd = createEvent('animationend', 'AnimationEvent');

        const $dom = $('#d1');

        $dom.animationEnd(stub.onCallback);
        await $dom[0].firstElementChild!.dispatchEvent(evAnimationEnd); // eslint-disable-line
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    it('check DOM#animationEnd(callback), callback invalid', () => {
        prepareTestElements();
        const evAnimationEnd = createEvent('animationend', 'AnimationEvent');

        const $dom = $('#d1');

        expect(() => $dom.animationEnd(null as any)).not.toThrow();
        expect(() => $dom.trigger(evAnimationEnd)).not.toThrow();
    });

    it('check DOM#hover(handlerIn, handlerOut)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const stub2 = { onCallback2 };
        spyOn(stub2, 'onCallback2').and.callThrough();
        const evMouseEnter = createEvent('mouseenter');
        const evMouseOver = createEvent('mouseover');
        const evMouseLeave = createEvent('mouseleave');

        const $dom = $('#d1');
        $dom.hover(stub.onCallback, stub2.onCallback2);

        await $dom.trigger(evMouseEnter, 'enter');
        await $dom.trigger(evMouseOver, 'over');
        await $dom.trigger(evMouseLeave, 'leave');

        expect(stub.onCallback).toHaveBeenCalledWith(jasmine.any(Event), 'enter');
        expect(stub2.onCallback2).toHaveBeenCalledWith(jasmine.any(Event), 'leave');
        expect(count).toBe(2);
    });

    it('check DOM#hover(handlerIOut)', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const evMouseEnter = createEvent('mouseenter');
        const evMouseOver = createEvent('mouseover');
        const evMouseLeave = createEvent('mouseleave');

        const $dom = $('#d1');
        $dom.hover(stub.onCallback);

        await $dom.trigger(evMouseEnter, 'enter');
        await $dom.trigger(evMouseOver, 'over');
        await $dom.trigger(evMouseLeave, 'leave');

        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(2);
    });

    it('check event shortcut, two-way', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const events = [
            'click',
            'dblclick',
            'focus',    // * test では順番が大事
            'blur',     // * test では順番が大事
            'focusin',
            'focusout',
            'keyup',
            'keydown',
            'keypress',
            'submit',
            'contextmenu',
            'change',
            'mousedown',
            'mousemove',
            'mouseup',
            'mouseenter',
            'mouseleave',
            'mouseout',
            'mouseover',
            'touchstart',
            'touchend',
            'touchmove',
            'touchcancel',
        ];

        const $dom = $('#d1');

        for (const event of events) {
            $dom[event](stub.onCallback);
            await $dom[event]();
        }

        expect(count).toBeGreaterThanOrEqual(events.length - 2 /* focus, blur は Testem UI 上ではタイミング問題で発火しないことがある */);
    });

    it('check event shortcut, no-trigger', async () => {
        prepareTestElements();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const events = [
            'resize',
            'scroll',
        ];

        const $dom = $('#d1');

        for (const event of events) {
            $dom[event](stub.onCallback);
            await $dom[event]();
        }

        expect(count).toBe(0);

        $dom.trigger('resize');
        $dom.trigger('scroll');

        expect(count).toBe(2);
    });

    it('check DOM#clone()', async () => {
        prepareTestElements(testee(`
<div class="test-dom father">
    <p class="test-dom-child"></p>
</div>`));

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        const stub2 = { onCallback2 };
        spyOn(stub2, 'onCallback2').and.callThrough();

        const $dom = $('.test-dom');
        $dom.on('click', stub.onCallback);
        $dom.find('.test-dom-child').on('click', stub2.onCallback2);

        const $clone1 = $dom.clone();
        await $clone1.trigger('click');
        expect(count).toBe(0);

        const $clone2 = $dom.clone(false, true);
        await $clone2.trigger('click');
        expect(count).toBe(0);

        const $clone3 = $dom.clone(true);
        await $clone3.trigger('click');
        expect(count).toBe(1);

        const $clone4 = $dom.clone(true, true);
        await $clone4.children().trigger('click');
        expect(stub2.onCallback2).toHaveBeenCalled();

        expect(() => $(window).clone()).not.toThrow();
        expect(() => $(document).clone(true, true)).not.toThrow();
    });

    describe('event namespace', () => {
        it('check DOM#on(type, listener), single namespace', async () => {
            prepareTestElements();
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const $dom = $('#d1');
            $dom.on('click.ns1', stub.onCallback);

            await $dom[0].dispatchEvent(evClick);
            expect(stub.onCallback).toHaveBeenCalled();
            expect(count).toBe(1);

            await $dom.trigger('click');
            expect(count).toBe(2);

            await $dom.trigger('click.ns1');
            expect(count).toBe(3);
        });

        it('check DOM#on(type, listener), multi namespace', async () => {
            prepareTestElements();
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const $dom = $('#d1');
            $dom.on('click.ns2.ns1', stub.onCallback);
            $dom.on('dblclick.ns1', stub.onCallback);

            await $dom.trigger('click');
            expect(count).toBe(1);

            await $dom.trigger('click.ns1');
            expect(count).toBe(2);

            await $dom.trigger('click.ns2');
            expect(count).toBe(3);

            await $dom.trigger('click.ns2.ns1');
            expect(count).toBe(4);

            await $dom.trigger('click.ns1.ns2');
            expect(count).toBe(5);

            await $dom.trigger('dblclick');
            expect(count).toBe(6);

            $dom.off('click.ns2');

            await $dom.trigger('click.ns1');
            expect(count).toBe(6);

            await $dom.trigger('click.ns2');
            expect(count).toBe(6);

            await $dom.trigger('click.ns1.ns2');
            expect(count).toBe(6);

            await $dom.trigger('click');
            expect(count).toBe(6);

            await $dom.trigger('dblclick.ns1');
            expect(count).toBe(7);
        });

        it('check DOM#trigger(type), w/ namespace', async () => {
            prepareTestElements();
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();
            const stub2 = { onCallback2 };
            spyOn(stub2, 'onCallback2').and.callThrough();

            const $dom = $('#d1');
            $dom.on('click.hoge.piyo', stub.onCallback);
            $dom.on('click.hoge', stub2.onCallback2);

//          await $dom.trigger('.hoge'); // compile error. (not fire)

            await $dom.trigger('click');
            expect(count).toBe(2);

            await $dom.trigger('click.hoge');
            expect(count).toBe(4);

            await $dom.trigger('click.hoge.piyo');
            expect(count).toBe(5);
        });

        it('check DOM#off(type), w/ namespace1', async () => {
            prepareTestElements();
            const stub = { onCallback };
            const stub2 = { onCallback2 };

            const $dom = $('#d1');
            $dom.on('click.hoge.piyo', stub.onCallback);
            $dom.on('click.hoge', stub2.onCallback2);

            $dom.off('.hoge');

            await $dom.trigger('click');
            expect(count).toBe(0);

            await $dom.trigger('click.hoge');
            expect(count).toBe(0);

            await $dom.trigger('click.hoge.piyo');
            expect(count).toBe(0);

            $dom.off('.piyo');
        });

        it('check DOM#off(type), w/ namespace2', async () => {
            prepareTestElements();
            const stub = { onCallback };
            const stub2 = { onCallback2 };

            const $dom = $('#d1');
            $dom.on('click.piyo', stub.onCallback);
            $dom.on('click.hoge', stub2.onCallback2);

            $dom.off('.hoge');

            await $dom.trigger('click');
            expect(count).toBe(1);

            await $dom.trigger('click.hoge');
            expect(count).toBe(1);

            await $dom.trigger('click.piyo');
            expect(count).toBe(2);

            $dom.off('.piyo');

            await $dom.trigger('click.piyo');
            expect(count).toBe(2);
        });
    });
});
