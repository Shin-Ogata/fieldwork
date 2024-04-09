/* eslint-disable
    @stylistic:js/block-spacing,
 */

import { dom as $ } from '@cdp/dom';
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

        // remove
        $dom.css('border-style', 'solid');
        expect(getComputedStyle(divs[0]).borderStyle).toBe('solid');
        $dom.css('border-style', null);
        expect(getComputedStyle(divs[0]).borderStyle).toBe('none');
    });

    it('check DOM#css(props), set property multi', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        const props = {
            'background-color': '#FFFFFF',
            'border-color': '#00FF00',
            'border-style': 'solid',
        };
        $dom.css(props);
        expect(getComputedStyle(divs[0]).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(divs[0]).borderColor).toBe('rgb(0, 255, 0)');
        expect(getComputedStyle(divs[0]).borderStyle).toBe('solid');
        expect(getComputedStyle(divs[1]).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(divs[1]).borderColor).toBe('rgb(0, 255, 0)');
        expect(getComputedStyle(divs[1]).borderStyle).toBe('solid');
        expect(getComputedStyle(divs[2]).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(divs[2]).borderColor).toBe('rgb(0, 255, 0)');
        expect(getComputedStyle(divs[2]).borderStyle).toBe('solid');

        // remove
        $dom.css({ 'border-style': null });
        expect(getComputedStyle(divs[0]).borderStyle).toBe('none');
        expect(getComputedStyle(divs[2]).borderStyle).toBe('none');
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

    it('check DOM#innerWidth()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="font-size: 16px; width: 100px; height: 100px; padding: 10px; border: 5px solid;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        expect($dom.innerWidth()).toBe(120);

        const $window = $(window);
        expect($window.innerWidth()).toBe(document.documentElement.clientWidth);

        const $document = $(document);
        expect($document.innerWidth()).toBe(document.documentElement.scrollWidth);
    });

    it('check DOM#innerWidth(value)', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="font-size: 16px; width: 100px; height: 100px; padding: 10px; border: 5px solid;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        $dom.innerWidth('5em');
        expect($dom.innerWidth()).toBe(80);
        $dom.innerWidth(100);
        expect($dom.innerWidth()).toBe(100);

        $dom.css({
            'box-sizing': 'border-box',
        });
        expect($dom.innerWidth()).toBe(70); // ずれるのは制限事項

        $dom.innerWidth(100);
        expect($dom.innerWidth()).toBe(100);

        const $window = $(window);
        const winInnerWidth = $window.innerWidth();
        $window.innerWidth(100);
        expect($window.innerWidth()).toBe(winInnerWidth);

        const $document = $(document);
        const docInnerWidth = $document.innerWidth();
        $document.innerWidth(100);
        expect($document.innerWidth()).toBe(docInnerWidth);
    });

    it('check DOM#innerHeight()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="font-size: 16px; width: 100px; height: 100px; padding: 10px; border: 5px solid;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        expect($dom.innerHeight()).toBe(120);

        const $window = $(window);
        expect($window.innerHeight()).toBe(document.documentElement.clientHeight);

        const $document = $(document);
        expect($document.innerHeight()).toBe(document.documentElement.scrollHeight);
    });

    it('check DOM#innerHeight(value)', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="font-size: 16px; width: 100px; height: 100px; padding: 10px; border: 5px solid;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        $dom.innerHeight('5em');
        expect($dom.innerHeight()).toBe(80);
        $dom.innerHeight(100);
        expect($dom.innerHeight()).toBe(100);

        $dom.css({
            'box-sizing': 'border-box',
        });
        expect($dom.innerHeight()).toBe(70); // ずれるのは制限事項

        $dom.innerHeight(100);
        expect($dom.innerHeight()).toBe(100);

        const $window = $(window);
        const winInnerHeight = $window.innerHeight();
        $window.innerHeight(100);
        expect($window.innerHeight()).toBe(winInnerHeight);

        const $document = $(document);
        const docInnerHeight = $document.innerHeight();
        $document.innerHeight(100);
        expect($document.innerHeight()).toBe(docInnerHeight);
    });

    it('check DOM#outerWidth()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="font-size: 16px; transform: scale(2); width: 100px; height: 100px; padding: 10px; border: 5px solid; margin: 2px;">
    <svg id="test-svg" style="width: 100px; height: 100px; padding: 10px; border: 5px solid; margin: 2px;" >
        <rect/>
    </svg>
</div>`));

        const $dom = $('.test-dom');
        expect($dom.outerWidth()).toBe(130);
        expect($dom.outerWidth(true)).toBe(134);

        const $svg = $dom.find('#test-svg');
        expect($svg.outerWidth()).toBe(130);
        $svg.css('box-sizing', 'border-box');
        expect($svg.outerWidth(true)).toBe(104);

        const $window = $(window);
        expect($window.outerWidth()).toBe(window.innerWidth);

        const $document = $(document);
        expect($document.outerWidth()).toBe(document.documentElement.scrollWidth);
    });

    it('check DOM#outerWidth(value)', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="font-size: 16px; width: 100px; height: 100px; padding: 10px; border: 5px solid;; margin: 2px;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        $dom.outerWidth('5em');
        expect($dom.outerWidth()).toBe(80);
        $dom.outerWidth(100, true);
        expect($dom.outerWidth()).toBe(96);

        $dom.css('box-sizing', 'border-box');
        expect($dom.outerWidth()).toBe(66); // ずれるのは制限事項

        $dom.outerWidth(100);
        expect($dom.outerWidth()).toBe(100);

        const $window = $(window);
        const winOuterWidth = $window.outerWidth();
        $window.outerWidth(100);
        expect($window.outerWidth()).toBe(winOuterWidth);

        const $document = $(document);
        const docOuterWidth = $document.outerWidth();
        $document.outerWidth(100);
        expect($document.outerWidth()).toBe(docOuterWidth);
    });

    it('check DOM#outerHeight()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="font-size: 16px; transform: scale(2); width: 100px; height: 100px; padding: 10px; border: 5px solid; margin: 2px;">
    <svg id="test-svg" style="width: 100px; height: 100px; padding: 10px; border: 5px solid; margin: 2px;" >
        <rect/>
    </svg>
</div>`));

        const $dom = $('.test-dom');
        expect($dom.outerHeight()).toBe(130);
        expect($dom.outerHeight(true)).toBe(134);

        const $svg = $dom.find('#test-svg');
        expect($svg.outerHeight()).toBe(130);
        $svg.css('box-sizing', 'border-box');
        expect($svg.outerHeight(true)).toBe(104);

        const $window = $(window);
        expect($window.outerHeight()).toBe(window.innerHeight);

        const $document = $(document);
        expect($document.outerHeight()).toBe(document.documentElement.scrollHeight);
    });

    it('check DOM#outerHeight(value)', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="font-size: 16px; width: 100px; height: 100px; padding: 10px; border: 5px solid;; margin: 2px;">
    <p class="test-dom-child"></p>
</div>`));

        const $dom = $('.test-dom');
        $dom.outerHeight('5em');
        expect($dom.outerHeight()).toBe(80);
        $dom.outerHeight(100, true);
        expect($dom.outerHeight()).toBe(96);

        $dom.css('box-sizing', 'border-box');
        expect($dom.outerHeight()).toBe(66); // ずれるのは制限事項

        $dom.outerHeight(100);
        expect($dom.outerHeight()).toBe(100);

        const $window = $(window);
        const winOuterHeight = $window.outerHeight();
        $window.outerHeight(100);
        expect($window.outerHeight()).toBe(winOuterHeight);

        const $document = $(document);
        const docOuterHeight = $document.outerHeight();
        $document.outerHeight(100);
        expect($document.outerHeight()).toBe(docOuterHeight);
    });

    it('check DOM#position()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="position: absolute; width: 100px; height: 100px; padding: 10px; border: 5px solid;; margin: 2px;">
    <div id="test-div" style="position: relative; width: 40px; height: 40px; padding: 2px; border: 3px solid;; margin: 4px;"></div>
    <svg id="test-svg" style="position: relative; width: 40px; height: 40px; padding: 2px; border: 3px solid;; margin: 4px;" >
        <rect/>
    </svg>
    <div id="test-div2" style="display: none;"></div>
    <div id="test-div3" style="position: fixed; width: 40px; height: 40px; padding: 2px; border: 3px solid;; margin: 4px;"></div>
</div>`));

        const $dom = $('.test-dom');
        const $div = $dom.find('#test-div');
        let pos = $div.position();
        expect(pos.top).toBe(10);
        expect(pos.left).toBe(10);

        const $div2 = $dom.find('#test-div2');
        pos = $div2.position();
        expect(pos.top).toBe(0);
        expect(pos.left).toBe(0);

        const $svg = $dom.find('#test-svg');
        pos = $svg.position();
        expect(pos.top).toBe(68);
        expect(pos.left).toBe(10);

        const $div3 = $dom.find('#test-div3');
        pos = $div3.position();
        expect('number' === typeof pos.top).toBe(true);
        expect('number' === typeof pos.left).toBe(true);

        const $mem = $(`
<div id="d1" class="test-dom" style="position: absolute; width: 100px; height: 100px; padding: 10px; border: 5px solid;; margin: 2px;">
    <div id="test-div4" style="position: relative; width: 40px; height: 40px; padding: 2px; border: 3px solid;; margin: 4px;"></div>
</div>`);

        const $div4 = $mem.find('#test-div4');
        pos = $div4.position();
        expect(pos.top).toBe(0);
        expect(pos.left).toBe(0);
    });

    it('check DOM#offset()', () => {
        prepareTestElements(testee(`
<div class="test-dom" style="position: absolute; left: 0; top: 0; right: 0; bottom: 0;">
    <div id="testee-1" style="position: relative; width: 40px; height: 40px;"></div>
</div>`));

        const $test1 = $('#testee-1');
        let offset = $test1.offset();
        expect(offset.top).toBe(0);
        expect(offset.left).toBe(0);

        offset = $(window).offset();
        expect(offset.top).toBe(0);
        expect(offset.left).toBe(0);

        offset = $(document).offset();
        expect(offset.top).toBe(0);
        expect(offset.left).toBe(0);
    });

    it('check DOM#offset(coodinate)', () => {
        prepareTestElements(testee(`
<div class="test-dom" style="position: absolute; left: 0; top: 0; right: 0; bottom: 0;">
    <div id="testee-1" style="width: 40px; height: 40px;"></div>
</div>`));

        const $test1 = $('#testee-1');
        let offset = $test1.offset();
        expect(offset.top).toBe(0);
        expect(offset.left).toBe(0);

        $test1.offset({ top: 100 });
        offset = $test1.offset();
        expect(offset.top).toBe(100);
        expect(offset.left).toBe(0);

        $test1.offset({ left: 100 });
        offset = $test1.offset();
        expect(offset.top).toBe(100);
        expect(offset.left).toBe(100);

        // reset
        $test1.css({
            position: 'fixed',
            top: 'auto',
            left: 'auto',
        });
        $test1.parent().css('display', 'none');

        $test1.offset({ top: 10, left: 10 });
        offset = $test1.offset();
        expect(offset.top).toBe(0);
        expect(offset.left).toBe(0);

        const $window = $(window);
        $window.offset({ top: 100, left: 100 });
        offset = $window.offset();
        expect(offset.top).toBe(0);
        expect(offset.left).toBe(0);

        const $document = $(document);
        $document.offset({ top: 100, left: 100 });
        offset = $document.offset();
        expect(offset.top).toBe(0);
        expect(offset.left).toBe(0);
    });

    it('check mixedCollection', () => {
        const $dom = mixedCollection().add(window).add(document);
        const $nonElem = $($dom[1]);
        expect(() => $dom.css('background-color', '#FFFFFF')).not.toThrow();
        expect(() => $dom.css({ 'background-color': '#FFFFFF', 'border-color': '#00FF00' })).not.toThrow();
        expect(() => $nonElem.width()).not.toThrow();
        expect(() => $nonElem.innerWidth()).not.toThrow();
        expect(() => $nonElem.innerHeight('5em')).not.toThrow();
        expect(() => $nonElem.outerWidth()).not.toThrow();
        expect(() => $nonElem.outerHeight('5em')).not.toThrow();
        expect(() => $dom.position()).not.toThrow();
        expect(() => $nonElem.position()).not.toThrow();
    });
});
