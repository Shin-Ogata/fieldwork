/* eslint-disable block-spacing, @typescript-eslint/no-explicit-any */
import $ from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
    mixedCollection,
} from './tools';

describe('dom/styles spec', () => {
    const testee = $.utils.elementify.bind($.utils);

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check DOM#css(name), get property single', () => {
        const divs = prepareTestElements();
        divs[0].style.backgroundColor = '#FFFFFF';

        const $dom = $('.test-dom');
        expect($dom.css('background-color')).toBe('rgb(255, 255, 255)');
        // camel case
        expect($dom.css('backgroundColor')).toBe('rgb(255, 255, 255)');
    });

    it('check DOM#css([name]), get property multi', () => {
        const divs = prepareTestElements();
        divs[0].style.backgroundColor = '#FFFFFF';
        divs[0].style.borderColor     = '#00FF00';

        const $dom = $('.test-dom');
        const props = $dom.css(['background-color', 'border-color']);
        expect(props['background-color']).toBe('rgb(255, 255, 255)');
        expect(props['border-color']).toBe('rgb(0, 255, 0)');
    });

    it('check DOM#css(name, value), set property single', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        $dom.css('background-color', '#FFFFFF');
        expect(getComputedStyle(divs[0]).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(divs[1]).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(divs[2]).backgroundColor).toBe('rgb(255, 255, 255)');
    });

    it('check DOM#css(props), set property multi', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        const props = {
            'background-color': '#FFFFFF',
            'border-color': '#00FF00',
        };
        $dom.css(props);
        expect(getComputedStyle(divs[0]).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(divs[0]).borderColor).toBe('rgb(0, 255, 0)');
        expect(getComputedStyle(divs[1]).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(divs[1]).borderColor).toBe('rgb(0, 255, 0)');
        expect(getComputedStyle(divs[2]).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(divs[2]).borderColor).toBe('rgb(0, 255, 0)');
    });

    it('check DOM#css(), etc', () => {
        {// no host
            const $dom = $(`<div class="test-dom"></div>`);
            $dom[0].style.backgroundColor = '#FFFFFF';
            expect($dom.css('background-color')).toBe('');
        }

        {// non element
            const $window = $(window);
            expect($window.css('background-color')).toBe('');
            expect($window.css('background-color', '#FFFFFF')).toBe($window);
            const $document = $(document);
            expect($document.css(['background-color', 'border-color'])).toEqual({});
            expect($document.css({
                'background-color': '#FFFFFF',
                'border-color': '#00FF00',
            })).toBe($document);
        }
    });

    it('check DOM#width()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="width: 100px; height: 100px;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        expect($dom.width()).toBe(100);

        $dom.css({
            'box-sizing': 'border-box',
            'border': '5px solid',
        });
        expect($dom.width()).toBe(90);

        const $window = $(window);
        expect($window.width()).toBe(document.documentElement.clientWidth);

        const $document = $(document);
        expect($document.width()).toBe(document.documentElement.scrollWidth);
    });

    it('check DOM#width(value)', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="width: 100px; height: 100px;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        $dom.width('5em');
        expect($dom.width()).toBe(80);

        $dom.css({
            'box-sizing': 'border-box',
            'border': '5px solid',
        }).width(200);
        expect($dom.width()).toBe(190);

        const $window = $(window);
        const winWidth = $window.width();
        $window.width(100);
        expect($window.width()).toBe(winWidth);

        const $document = $(document);
        const docWidth = $document.width();
        $document.width(100);
        expect($document.width()).toBe(docWidth);
    });

    it('check DOM#height()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="width: 100px; height: 100px;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        expect($dom.height()).toBe(100);

        $dom.css({
            'box-sizing': 'border-box',
            'border': '5px solid',
        });
        expect($dom.height()).toBe(90);

        const $window = $(window);
        expect($window.height()).toBe(document.documentElement.clientHeight);

        const $document = $(document);
        expect($document.height()).toBe(document.documentElement.scrollHeight);
    });

    it('check DOM#height(value)', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="width: 100px; height: 100px;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        $dom.height('5em');
        expect($dom.height()).toBe(80);

        $dom.css({
            'box-sizing': 'border-box',
            'border': '5px solid',
        }).height(200);
        expect($dom.height()).toBe(190);

        const $window = $(window);
        const winHeight = $window.height();
        $window.height(100);
        expect($window.height()).toBe(winHeight);

        const $document = $(document);
        const docHeight = $document.height();
        $document.height(100);
        expect($document.height()).toBe(docHeight);
    });

    it('check mixedCollection', () => {
        const $dom = mixedCollection().add(window).add(document);
        expect(() => $dom.css('background-color', '#FFFFFF')).not.toThrow();
        expect(() => $dom.css({ 'background-color': '#FFFFFF', 'border-color': '#00FF00' })).not.toThrow();
        expect(() => $($dom[1]).width()).not.toThrow();
    });
});
