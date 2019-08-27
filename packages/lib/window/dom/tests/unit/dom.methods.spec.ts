/* eslint-disable block-spacing, @typescript-eslint/no-explicit-any */
import $ from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
} from './tools';

describe('dom methods spec', () => {
    const body = document.body;

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check DOM#is', () => {
        const divs = prepareTestElements();

        {// no entry
            const $dom = $();
            expect($dom.is('.test-dom')).toBe(false);
        }

        {// empty selector
            const $dom = $('.test-dom');
            expect($dom.is('')).toBe(false);
            expect($dom.is(null)).toBe(false);
            expect($dom.is(undefined)).toBe(false);
        }

        {// string selector
            const $dom = $('.test-dom');
            expect($dom.is('.test-dom')).toBe(true);
            expect($dom.is('.test-dom-child')).toBe(false);
            expect($dom.is('div')).toBe(true);
            expect($dom.is('#d1')).toBe(true);
            expect($dom.is('#d2')).toBe(true);
            expect($dom.is('#d3')).toBe(true);
            expect($dom.is('#d999')).toBe(false);
            expect($dom.is('body > #d3')).toBe(true);

            const $body = $(body);
            expect($body.is('body')).toBe(true);
        }

        {// document selector
            const $document = $(document);
            expect($document.is(document)).toBe(true);
            expect($document.is(window)).toBe(false);
            const $body = $(body);
            expect($body.is(document)).toBe(false);
        }

        {// window selector
            const $window = $(window);
            expect($window.is(window)).toBe(true);
            expect($window.is(document)).toBe(false);
            const $body = $(body);
            expect($body.is(window)).toBe(false);
        }

        {// element selector
            const $dom = $('.test-dom');
            expect($dom.is(divs[0])).toBe(true);
            expect($dom.is(divs[1])).toBe(true);
            expect($dom.is(divs[2])).toBe(true);

            const elem = document.querySelector('span.test-dom-child');
            expect($dom.is(elem)).toBe(false);
        }

        {// elements selector
            const $dom = $('.test-dom');
            expect($dom.is(divs)).toBe(true);
            const elems = document.querySelectorAll('.test-dom');
            expect($dom.is(elems)).toBe(true);

            const children = document.querySelectorAll('.test-dom-child');
            expect($dom.is(children)).toBe(false);

            expect($dom.is([children[0], children[1]])).toBe(false);
            expect($dom.is([divs[0], children[1]])).toBe(true);
            expect($dom.is([children[0], divs[1]])).toBe(true);
        }

        {// function selector
            const $dom = $('.test-dom');
            expect($dom.is((index, elem: Element) => elem.classList.contains('test-dom'))).toBe(true);
            expect($dom.is((index) => 99 === index)).toBe(false);
        }

        {// invalid selector
            const $dom = $('.test-dom');
            expect($dom.is({} as any)).toBe(false);
        }
    });
});
