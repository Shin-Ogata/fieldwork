/* eslint-disable block-spacing, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import $ from '@cdp/dom';
import {
    DOM,
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

        $dom.text('<script>悪意のあるスクリプト</script>');
        expect($dom.text()).toBe('<script>悪意のあるスクリプト</script>');

        const $document = $(document);
        $document.text('hoge');
        expect($document.text()).toBe('');

        const $window = $(window);
        expect(() => $window.text()).not.toThrow();
        expect(() => $window.text('hoge')).not.toThrow();
    });

    it('check DOM#append()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom"></div>
<div id="d2" class="test-dom"></div>
<div class="test-query"></div>
<div class="test-query"></div>
    `));
        const $dom = $('#d1');
        $dom.append(' hoge ');
        expect($dom[0].textContent).toBe(' hoge ');
        $dom.append('<p class="test-dom-child"></p>');
        expect($dom.find('.test-dom-child').length).toBe(1);
        const $dom3 = $('<div id="d3"></div>');
        $dom.append($dom3);
        expect($dom.find('#d3').length).toBe(1);
        const $dom2 = $('#d2');
        $dom.append($dom2);
        expect($dom.find('#d2').length).toBe(1);
        $dom.children().remove();

        const divs = document.querySelectorAll('.test-query');
        $dom.append(divs);
        expect($dom.find('.test-query').length).toBe(2);

        const $reuse = $dom.children();
        $reuse.detach();
        expect($dom.children().length).toBe(0);

        $dom.append('fuga', $reuse[0], '<div></div>', $reuse[1]);
        expect($dom.children().length).toBe(3);

        const $window = $(window);
        expect(() => $window.append('<div></div>')).not.toThrow();
        const $document = $(document);
        expect(() => $document.append('<div></div>')).not.toThrow();
    });

    it('check DOM#appendTo()', () => {
        const divs = prepareTestElements();
        prepareTestElements(testee(`<div id="test-parent"></div>`));
        const $dom = $('.test-dom');
        $dom.appendTo('#test-parent');
        const $parent = $dom.parent();
        const $testee = $parent.children();
        expect($testee.length).toBe(3);
        expect($testee[0]).toBe(divs[0]);
        expect($testee[1]).toBe(divs[1]);
        expect($testee[2]).toBe(divs[2]);
        $parent.remove();
    });

    it('check DOM#prepend()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom"></div>
<div id="d2" class="test-dom"></div>
<div class="test-query one"></div>
<div class="test-query twe"></div>
    `));
        const $dom = $('#d1');
        $dom.prepend(' hoge ');
        expect($dom[0].textContent).toBe(' hoge ');
        $dom.prepend('<p class="test-dom-child"></p>');
        expect($dom.find('.test-dom-child').length).toBe(1);
        const $dom3 = $('<div id="d3"></div>');
        $dom.prepend($dom3);
        expect($dom.find('#d3').length).toBe(1);
        const $dom2 = $('#d2');
        $dom.prepend($dom2);
        expect($dom.find('#d2').length).toBe(1);
        const $children = $dom.children();
        expect($children[0].getAttribute('id')).toBe('d2');
        expect($children[1].getAttribute('id')).toBe('d3');
        expect($children[2].classList.contains('test-dom-child')).toBe(true);
        $children.remove();

        const divs = document.querySelectorAll('.test-query');
        $dom.prepend(divs);
        const $query = $dom.find('.test-query');
        expect($query.length).toBe(2);
        expect($query[0].classList.contains('one')).toBe(true);
        expect($query[1].classList.contains('twe')).toBe(true);

        const $reuse = $dom.children();
        $reuse.detach();
        expect($dom.children().length).toBe(0);

        $dom.prepend('fuga', $reuse[0], '<div></div>', $reuse[1]);
        expect($dom.children().length).toBe(3);

        const $window = $(window);
        expect(() => $window.prepend('<div></div>')).not.toThrow();
        const $document = $(document);
        expect(() => $document.prepend('<div></div>')).not.toThrow();
    });

    it('check DOM#prependTo()', () => {
        const divs = prepareTestElements();
        prepareTestElements(testee(`<div id="test-parent"></div>`));
        const $dom = $('.test-dom');
        $dom.prependTo('#test-parent');
        const $parent = $dom.parent();
        const $testee = $parent.children();
        expect($testee.length).toBe(3);
        expect($testee[0]).toBe(divs[0]);
        expect($testee[1]).toBe(divs[1]);
        expect($testee[2]).toBe(divs[2]);
        $parent.remove();
    });

    it('check DOM#before()', () => {
        const divs = prepareTestElements();
        const $dom = $(divs[0]);

        $dom.before(divs[1], divs[2]);
        const $result = $('.test-dom');
        expect($result[0]).toBe(divs[1]);
        expect($result[1]).toBe(divs[2]);
        expect($result[2]).toBe(divs[0]);

        $dom.children().before('hoge', 'fuga');
        expect($dom.text()).toBe('hogefuga');

        const $window = $(window);
        expect(() => $window.before('<div></div>')).not.toThrow();
        const $document = $(document);
        expect(() => $document.before('<div></div>')).not.toThrow();
    });

    it('check DOM#insertBefore()', () => {
        const divs = prepareTestElements();
        const $dom = $(divs[0]);

        $dom.insertBefore(divs[2]);
        const $result = $('.test-dom');
        expect($result[0]).toBe(divs[1]);
        expect($result[1]).toBe(divs[0]);
        expect($result[2]).toBe(divs[2]);

        expect(() => $dom.insertBefore($dom)).not.toThrow();

        const $window = $(window);
        expect(() => $window.insertBefore('<div></div>')).not.toThrow();
        const $document = $(document);
        expect(() => $document.insertBefore('<div></div>')).not.toThrow();
    });

    it('check DOM#after()', () => {
        const divs = prepareTestElements();
        const $dom = $(divs[2]);

        $dom.after('<div id="d4" class="test-dom"></div>', divs[0]);
        const $result = $('.test-dom');
        expect($result[0]).toBe(divs[1]);
        expect($result[1]).toBe(divs[2]);
        expect($result[2].getAttribute('id')).toBe('d4');
        expect($result[3]).toBe(divs[0]);

        $dom.children().after('hoge', 'fuga');
        expect($dom.text()).toBe('hogefuga');

        const $window = $(window);
        expect(() => $window.after('<div></div>')).not.toThrow();
        const $document = $(document);
        expect(() => $document.after('<div></div>')).not.toThrow();
    });

    it('check DOM#insertAfter()', () => {
        const divs = prepareTestElements();
        const $dom = $(divs[0]);

        $dom.insertAfter(divs[2]);
        const $result = $('.test-dom');
        expect($result[0]).toBe(divs[1]);
        expect($result[1]).toBe(divs[2]);
        expect($result[2]).toBe(divs[0]);

        expect(() => $dom.insertAfter($dom)).not.toThrow();

        const $window = $(window);
        expect(() => $window.insertAfter('<div></div>')).not.toThrow();
        const $document = $(document);
        expect(() => $document.insertAfter('<div></div>')).not.toThrow();
    });

    it('check DOM#wrapAll()', () => {
        let divs = prepareTestElements();
        let $dom = $('.test-dom');
        $dom.wrapAll('<div class="test-parent"></div>');
        let $parent = $('.test-parent');
        let $result = $parent.children();
        expect($result.length).toBe(3);
        expect($result[0]).toBe(divs[0]);
        expect($result[1]).toBe(divs[1]);
        expect($result[2]).toBe(divs[2]);
        $parent.remove();

        divs = prepareTestElements();
        $dom = $([divs[1], divs[2]]);
        $dom.removeClass('test-dom');
        $dom.wrapAll(divs[0]);
        $result = $('.test-dom');
        expect($result.length).toBe(2);
        expect($result[0]).toBe(divs[0]); // original
        expect($result[1].getAttribute('id')).toBe('d1'); // cloned
        $result.remove();

        divs = prepareTestElements();
        $dom = $(document.createElement('div'));
        $dom.wrapAll(divs[0]);
        $parent = $dom.parent();
        expect($parent.length).toBe(1);
        expect($parent.hasClass('test-dom-child')).toBe(true); // div[0] child

        expect(() => $(window).wrapAll(divs[0])).not.toThrow();
        expect(() => $(document).wrapAll(divs[0])).not.toThrow();
    });

    it('check DOM#wrapInner()', () => {
        prepareTestElements(testee(`
<div class="test-dom">
    <div class="inner">Hello</div>
    <div class="inner">Goodbye</div>
    <div class="inner"></div>
</div>
    `));
        const $dom = $('.inner');
        $dom.wrapInner('<div class="new"></div>');
        const $result = $dom.find('.new');
        expect($result.length).toBe(3);
        expect($result[0].textContent).toBe('Hello');
        expect($result[1].textContent).toBe('Goodbye');

        expect(() => $(window).wrapInner($dom)).not.toThrow();
        expect(() => $(document).wrapInner($dom)).not.toThrow();
    });

    it('check DOM#wrap() / unwrap()', () => {
        prepareTestElements(testee(`
<div class="test-dom">
    <div class="inner">Hello</div>
    <div class="inner">Goodbye</div>
</div>
    `));
        const $dom = $('.inner');
        $dom.wrap('<div class="test-new"></div>');
        let $result = $('.test-dom').find('.test-new');
        expect($result.length).toBe(2);
        expect($result[0].firstElementChild!.textContent).toBe('Hello');
        expect($result[1].firstElementChild!.textContent).toBe('Goodbye');

        $result[0].classList.add('one');
        $dom.unwrap('.one');
        $result = $('.test-dom').find('.test-new');
        expect($result.length).toBe(1);
        expect($result[0].firstElementChild!.textContent).toBe('Goodbye');

        $dom.unwrap();
        $result = $('.test-dom');
        expect($result.length).toBe(0);
        $dom.remove();

        expect(() => $(window).wrap($dom)).not.toThrow();
        expect(() => $(document).wrap($dom)).not.toThrow();
        expect(() => $(window).unwrap($dom)).not.toThrow();
        expect(() => $(document).unwrap($dom)).not.toThrow();
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

        expect(() => $(window).empty()).not.toThrow();
        expect(() => $(document).empty()).not.toThrow();
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

    it('check DOM#replaceWith()', () => {
        const divs = prepareTestElements();
        const $dom = $(divs[0]);
        $dom.replaceWith(divs[1]);
        expect($dom.attr('id')).toBe('d1'); // $dom 自体が参照している element には変更がない (https://github.com/jquery/jquery/issues/3024)
        let $replaced = $('.test-dom');
        expect($replaced.length).toBe(2);

        // eslint-disable-next-line
        $replaced.replaceWith($() as DOM);  // 長さ 0 の場合は削除
        expect($('.test-dom').length).toBe(0);

        // multi replace
        prepareTestElements(testee(`<div id="dd" class="test-dom"></div>
<div class="test-dom test-query one"></div>
<div class="test-dom test-query twe"></div>
    `));
        expect($('.test-dom').length).toBe(3);
        $replaced = $('#dd');
        $replaced.replaceWith('.test-query');
        expect($('.test-dom').length).toBe(2);

        // text replace
        $('.test-dom').replaceWith('<p class="test-dom"></p>');
        $replaced = $('.test-dom');
        expect($replaced.length).toBe(1); // 同一 DOM の連続 replaceWith のため 1つ
        expect($replaced[0].nodeName).toBe('P');

        expect(() => $(window).replaceWith('<div></div>')).not.toThrow();
        expect(() => $(document).replaceWith('<div></div>')).not.toThrow();
    });

    it('check DOM#replaceAll()', () => {
        const divs = prepareTestElements();
        const $dom = $([divs[0], divs[1]]);

        $dom.replaceAll(divs[2]);
        const $result = $('.test-dom');
        expect($result.length).toBe(2);
        expect($result[0]).toBe(divs[0]);
        expect($result[1]).toBe(divs[1]);

        expect(() => $(window).replaceAll('<div></div>')).not.toThrow();
        expect(() => $(document).replaceAll('<div></div>')).not.toThrow();
    });

    it('check mixedCollection', () => {
        const $dom = mixedCollection().add(window).add(document);
        const $nonElem = $($dom[1]);
        expect(() => $dom.html('<div></div>')).not.toThrow();
        expect(() => $nonElem.html()).not.toThrow();
        expect(() => $dom.html('hoge')).not.toThrow();
        expect(() => $nonElem.text()).not.toThrow();
        expect(() => $nonElem.empty()).not.toThrow();
        expect(() => $('<div></div>').replaceWith($nonElem)).not.toThrow();
    });
});
