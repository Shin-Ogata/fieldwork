/* eslint-disable
    block-spacing
 ,  no-duplicate-imports
 ,  @typescript-eslint/no-explicit-any
 */

import { dom } from '@cdp/dom';
// only '@cdp/dom' available
// import $ from '@cdp/dom';
import { dom as $ } from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
} from './tools';

describe('dom/base spec', () => {
    const body = document.body;

    afterEach((): void => {
        cleanupTestElements();
    });

    it('support `default` and `named` import', () => {
        expect($).toBe(dom);
    });

    xit('check construction performance', () => {
        // peformance
        class Vanilla { }
        console.time('vanilla');
        for (let i = 0; i < 1000000; i++) {
            new Vanilla(); // eslint-disable-line
        }
        console.timeEnd('vanilla');

        console.time('DOM');
        const t0 = performance.now();
        for (let i = 0; i < 1000000; i++) {
            $();
        }
        const t1 = performance.now() - t0;
        console.timeEnd('DOM');

        expect(t1).toBeLessThanOrEqual(300);
    });

    it('check index access', () => {
        const test = prepareTestElements();
        const $dom = $('.test-dom');
        expect($dom).toBeDefined();
        expect($dom.length).toBe(3);
        expect($dom[0]).toEqual(test[0]);
        expect($dom[1]).toEqual(test[1]);
        expect($dom[2]).toEqual(test[2]);
    });

    it('check [Symbol.iterator]', () => {
        const test = prepareTestElements();
        const $dom = $('.test-dom');
        let count = 0;
        for (const el of $dom) {
            expect(el).toEqual(test[count]);
            count++;
        }
    });

    it('check entries()', () => {
        const test = prepareTestElements();
        const $dom = $('.test-dom');
        for (const [index, el] of $dom.entries()) {
            expect(el).toEqual(test[index]);
        }
    });

    it('check keys()', () => {
        prepareTestElements();
        const $dom = $('.test-dom');
        let count = 0;
        for (const key of $dom.keys()) {
            expect(key).toEqual(count);
            count++;
        }
    });

    it('check values()', () => {
        const test = prepareTestElements();
        const $dom = $('.test-dom');
        let count = 0;
        for (const value of $dom.values()) {
            expect(value).toEqual(test[count]);
            count++;
        }
    });

    it('check $(string)', () => {
        {// empty
            const $dom1 = $();
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(0);

            const $dom2 = $(undefined);
            expect($dom2).toBeDefined();
            expect($dom2.length).toBe(0);

            const $dom3 = $(null);
            expect($dom3).toBeDefined();
            expect($dom3.length).toBe(0);

            const $dom4 = $('');
            expect($dom4).toBeDefined();
            expect($dom4.length).toBe(0);
        }

        {// check instance
            const $dom = $(`
<div id="d1" class="test-dom">
    <p class="test-dom-child"></p>
</div>
<div id="d2" class="test-dom">
    <span class="test-dom-child"></span>
</div>
<div id="d3" class="test-dom">
    <hr class="test-dom-child"></hr>
</div>`);
            expect($dom).toBeDefined();
            expect($dom.length).toBe(3);

            expect($dom[0] instanceof HTMLDivElement).toBe(true);
            expect($dom[1] instanceof HTMLDivElement).toBe(true);
            expect($dom[2] instanceof HTMLDivElement).toBe(true);
        }

        const divs = prepareTestElements();

        {// pure ID selector
            const $dom1 = $('#d1');
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(1);
            expect($dom1[0]).toEqual(divs[0]);

            const $dom2 = $('#d2');
            expect($dom2).toBeDefined();
            expect($dom2.length).toBe(1);
            expect($dom2[0]).toEqual(divs[1]);

            const $dom3 = $('#d3');
            expect($dom3).toBeDefined();
            expect($dom3.length).toBe(1);
            expect($dom3[0]).toEqual(divs[2]);

            const $dom4 = $('#d99');
            expect($dom4).toBeDefined();
            expect($dom4.length).toBe(0);
        }

        {// class selector
            const $dom1 = $('.test-dom-child');
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(3);

            expect($dom1[0] instanceof HTMLParagraphElement).toBe(true);
            expect($dom1[1] instanceof HTMLSpanElement).toBe(true);
            expect($dom1[2] instanceof HTMLHRElement).toBe(true);

            const $dom2 = $('.test-dom-child-invalid');
            expect($dom2).toBeDefined();
            expect($dom2.length).toBe(0);
        }

        {// special case, 'body'
            const $dom1 = $('body');
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(1);
            expect($dom1[0]).toEqual(body);
        }
    });

    it('check $(element)', () => {
        const divs = prepareTestElements();

        {// HTML Element
            const $dom1 = $(divs[0]);
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(1);
            expect($dom1[0]).toEqual(divs[0]);

            const $dom2 = $(divs[1]);
            expect($dom2).toBeDefined();
            expect($dom2.length).toBe(1);
            expect($dom2[0]).toEqual(divs[1]);

            const $dom3 = $(divs[2]);
            expect($dom3).toBeDefined();
            expect($dom3.length).toBe(1);
            expect($dom3[0]).toEqual(divs[2]);

            const $children = $('.test-dom-child');
            const $dom4 = $($children[0]);
            expect($dom4).toBeDefined();
            expect($dom4.length).toBe(1);
            expect($dom4[0]).toEqual($children[0]);

            const $dom5 = $($children[1]);
            expect($dom5).toBeDefined();
            expect($dom5.length).toBe(1);
            expect($dom5[0]).toEqual($children[1]);

            const $dom6 = $($children[2]);
            expect($dom6).toBeDefined();
            expect($dom6.length).toBe(1);
            expect($dom6[0]).toEqual($children[2]);
        }

        {// document / body
            const $dom1 = $(document);
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(1);
            expect($dom1[0]).toEqual(document);

            const $dom2 = $(body);
            expect($dom2).toBeDefined();
            expect($dom2.length).toBe(1);
            expect($dom2[0]).toEqual(body);
        }

        {// window
            const $dom1 = $(window);
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(1);
            expect($dom1[0]).toEqual(window);
        }
    });

    it('check $(element collection)', () => {
        const divs = prepareTestElements();

        {// HTMLElement Array
            const $dom1 = $(divs);
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(3);
            expect($dom1[0]).toEqual(divs[0]);
            expect($dom1[1]).toEqual(divs[1]);
            expect($dom1[2]).toEqual(divs[2]);
        }

        {// HTMLElement Collection
            const collection = document.querySelectorAll('.test-dom-child');
            const $dom1 = $(collection);
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(3);
            expect($dom1[0]).toEqual(collection[0]);
            expect($dom1[1]).toEqual(collection[1]);
            expect($dom1[2]).toEqual(collection[2]);
        }

        {// other Array
            const $dom1 = $([window]);
            expect($dom1).toBeDefined();
            expect($dom1.length).toBe(1);
            expect($dom1[0]).toEqual(window);

            const $dom2 = $([document]);
            expect($dom2).toBeDefined();
            expect($dom2.length).toBe(1);
            expect($dom2[0]).toEqual(document);

            const $dom3 = $([body]);
            expect($dom3).toBeDefined();
            expect($dom3.length).toBe(1);
            expect($dom3[0]).toEqual(body);

            // string array will be comile error.
            const $dom4 = $(['.test-dom', '.test-dom-child'] as any);
            expect($dom4).toBeDefined();
            expect($dom4.length).toBe(0);
        }
    });

    it('check $(DOMClass)', () => {
        prepareTestElements();

        const $base = $('.test-dom');
        const $dom = $($base);
        expect($dom).toBeDefined();
        expect($dom.length).toBe(3);
        expect($dom).toEqual($base);
    });
});

