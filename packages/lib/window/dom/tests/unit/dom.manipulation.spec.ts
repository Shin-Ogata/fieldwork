/* eslint-disable block-spacing, @typescript-eslint/no-explicit-any */
import $ from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
    mixedCollection,
} from './tools';

describe('dom/manipulation spec', () => {
    const testee = $.utils.elementify.bind($.utils);

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check DOM#html()', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        const html = $dom.html().trim();
        expect(html).toBe('<p class="test-dom-child"></p>');

        $dom.html('<div class="test-new-child"></div>');
        expect($(divs[1]).children().hasClass('test-new-child')).toBe(true);
        expect($(divs[2]).children().hasClass('test-dom-child')).toBe(false);

        expect(() => $dom.html(100 as any)).not.toThrow();
    });

    it('check DOM#text()', () => {
        const divs = prepareTestElements(testee(`<div id="d1" class="test-dom">hoge</div><div id="d2" class="test-dom">fuga</div>`));
        const $dom = $('.test-dom');
        const text = $dom.text();
        expect(text).toBe('hoge');

        $dom.text('new');
        expect(divs[0].textContent).toBe('new');
        expect(divs[1].textContent).toBe('new');

        $dom.text(100);
        expect(divs[0].textContent).toBe('100');
        expect(divs[1].textContent).toBe('100');

        $dom.text(false);
        expect($dom.text()).toBe('false');

        const $document = $(document);
        $document.text('hoge');
        expect($document.text()).toBe('');

        const $window = $(window);
        expect(() => $window.text()).not.toThrow();
        expect(() => $window.text('hoge')).not.toThrow();
    });

    it('check DOM#empty()', () => {
        prepareTestElements();
        const $dom = $('.test-dom');

        let $children = $dom.children();
        expect($children.length).toBe(3);
        $dom.empty();
        expect($dom.length).toBe(3);
        $children = $dom.children();
        expect($children.length).toBe(0);
    });

    it('check DOM#detach()', () => {
        prepareTestElements();
        let count = 0;
        const stub = { onCallback: () => { count++; } };

        const $dom = $('.test-dom');
        $dom.on('click', stub.onCallback);

        $dom.detach('#d2');
        expect($dom.length).toBe(3);
        let $requery = $('.test-dom');
        expect($requery.length).toBe(2);

        $dom.detach();
        expect($dom.length).toBe(3);
        $requery = $('.test-dom');
        expect($requery.length).toBe(0);

        // check listener alive
        $dom.trigger('click');
        expect(count).toBe(3);

        expect(() => $(window).detach()).not.toThrow();
        expect(() => $(document).detach()).not.toThrow();
    });

    it('check DOM#remove()', () => {
        prepareTestElements();
        let count = 0;
        const stub = { onCallback: () => { count++; } };

        const $dom = $('.test-dom');
        $dom.on('click', stub.onCallback);

        $dom.remove('#d2');
        expect($dom.length).toBe(3);
        let $requery = $('.test-dom');
        expect($requery.length).toBe(2);

        $dom.remove();
        expect($dom.length).toBe(3);
        $requery = $('.test-dom');
        expect($requery.length).toBe(0);

        // check listener disabled
        $dom.trigger('click');
        expect(count).toBe(0);

        expect(() => $(window).remove()).not.toThrow();
        expect(() => $(document).remove()).not.toThrow();
    });

    it('check mixedCollection', () => {
        const $dom = mixedCollection().add(window).add(document);
        const $nonElem = $($dom[1]);
        expect(() => $dom.html('<div></div>')).not.toThrow();
        expect(() => $nonElem.html()).not.toThrow();
        expect(() => $dom.html('hoge')).not.toThrow();
        expect(() => $nonElem.text()).not.toThrow();
        expect(() => $nonElem.empty()).not.toThrow();
    });
});
