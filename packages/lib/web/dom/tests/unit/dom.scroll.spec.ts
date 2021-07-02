/* eslint-disable
    block-spacing,
    @typescript-eslint/no-explicit-any,
 */

import { dom as $ } from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
    mixedCollection,
    wait,
} from './tools';

describe('dom/scroll spec', () => {
    const testee = $.utils.elementify.bind($.utils);

    let count: number;
    const onCallback = (): void => {
        count++;
    };

    beforeEach(() => {
        count = 0;
    });

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check DOM#scrollTop() getter', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="position: absolute; width: 10px; height: 10px; overflow: auto;">
    <div class="test-dom-child" style="position: relative; width: 20px; height: 20px;"></div>
</div>`));
        const $dom = $('.test-dom');
        $dom[0].scrollTop = 5;
        expect($dom.scrollTop()).toBe(5);
        expect(() => $(window).scrollTop()).not.toThrow();
        expect(() => $(document).scrollTop()).not.toThrow();
    });

    it('check DOM#scrollTop(...args) setter', async () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="position: absolute; width: 10px; height: 10px; overflow: auto;">
    <div class="test-dom-child" style="position: relative; width: 20px; height: 20px;"></div>
</div>`));
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('.test-dom');

        $dom.scrollTop(10, 300, 'linear', stub.onCallback);
        await wait(350);
        expect($dom[0].scrollTop).toBe(10);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        $dom.scrollTop(2, 100, 'swing', stub.onCallback);
        await wait(150);
        expect($dom[0].scrollTop).toBe(2);
        expect(count).toBe(2);

        $dom.scrollTop(5, 0, undefined, stub.onCallback);
        expect($dom[0].scrollTop).toBe(5);
        expect(count).toBe(3);
    });

    it('check DOM#scrollLeft() getter', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="position: absolute; width: 10px; height: 10px; overflow: auto;">
    <div class="test-dom-child" style="position: relative; width: 20px; height: 20px;"></div>
</div>`));
        const $dom = $('.test-dom');
        $dom[0].scrollLeft = 5;
        expect($dom.scrollLeft()).toBe(5);
        expect(() => $(window).scrollLeft()).not.toThrow();
        expect(() => $(document).scrollLeft()).not.toThrow();
    });

    it('check DOM#scrollLeft(...args) setter', async () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="position: absolute; width: 10px; height: 10px; overflow: auto;">
    <div class="test-dom-child" style="position: relative; width: 20px; height: 20px;"></div>
</div>`));
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('.test-dom');

        $dom.scrollLeft(10, 100, 'linear', stub.onCallback);
        await wait(150);
        expect($dom[0].scrollLeft).toBe(10);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        $dom.scrollLeft(2, 100, 'swing', stub.onCallback);
        await wait(150);
        expect($dom[0].scrollLeft).toBe(2);
        expect(count).toBe(2);

        $dom.scrollLeft(5, 0, undefined, stub.onCallback);
        expect($dom[0].scrollLeft).toBe(5);
        expect(count).toBe(3);
    });

    it('check DOM#scrollTo(x, y, ...args)', async () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="position: absolute; width: 10px; height: 10px; overflow: auto;">
    <div class="test-dom-child" style="position: relative; width: 20px; height: 20px;"></div>
</div>`));
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const progress = (value: number): number => {
            return Math.exp(value) / Math.E;
        };

        const $dom = $('.test-dom');

        $dom.scrollTo(0, 0, 100, progress, stub.onCallback);
        await wait(150);
        expect($dom[0].scrollLeft).toBe(0);
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);

        $dom.scrollTo(5, 20, 100, progress, stub.onCallback);
        await wait(150);
        expect($dom[0].scrollLeft).toBe(5);
        expect($dom[0].scrollTop).toBe(10);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);
    });

    it('check DOM#scrollTo(options)', async () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="position: absolute; width: 10px; height: 10px; overflow: auto;">
    <div class="test-dom-child" style="position: relative; width: 20px; height: 20px;"></div>
</div>`));

        const $dom = $('.test-dom');

        $dom.scrollTo({ top: 5, duration: 100 });
        await wait(150);
        expect($dom[0].scrollTop).toBe(5);
        $dom.scrollTo({ left: 5 });
        expect($dom[0].scrollLeft).toBe(5);
    });

    it('check mixedCollection', () => {
        const $dom = mixedCollection();
        const $nonElem = $($dom[1]);
        expect($nonElem.scrollTop()).toBe(0);
        expect($nonElem.scrollLeft()).toBe(0);
        expect(() => $nonElem.scrollTo({ top: 5, duration: 100 })).not.toThrow();
    });
});
