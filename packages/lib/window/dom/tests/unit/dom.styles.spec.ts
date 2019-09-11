/* eslint-disable block-spacing, @typescript-eslint/no-explicit-any */
import $ from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
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
});
