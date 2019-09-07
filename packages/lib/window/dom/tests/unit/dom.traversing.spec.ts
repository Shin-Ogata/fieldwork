/* eslint-disable block-spacing, @typescript-eslint/no-explicit-any */
import $ from '@cdp/dom';
import {
    DOM,
    prepareTestElements,
    cleanupTestElements,
} from './tools';

describe('dom/traversing spec', () => {
    const body = document.body;
    const testee = $.utils.elementify.bind($.utils);

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check DOM#get(index)', () => {
        const divs = prepareTestElements();

        const $dom = $('.test-dom');
        expect($dom.get(0)).toBe(divs[0]);
        expect($dom.get(2)).toBe(divs[2]);
        expect($dom.get(3)).toBeUndefined();

        expect($dom.get(-1)).toBe(divs[2]);
        expect($dom.get(-2)).toBe(divs[1]);
        expect($dom.get(-3)).toBe(divs[0]);
        expect($dom.get(-4)).toBeUndefined();
    });

    it('check DOM#get()', () => {
        const divs = prepareTestElements();

        const $dom = $('.test-dom');
        expect($dom.get()).toEqual(divs);
        const $empty = $();
        expect($empty.get()).toEqual([]);
    });

    it('check DOM#index()', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom">
    <div class="test-dom-child"></div>
    <div class="test-dom-child"></div>
    <div class="test-dom-child"></div>
</div>`));

        const $children = $('.test-dom-child');
        const $dom = $($children[1]);
        expect($dom.index()).toBe(1);
    });

    it('check DOM#index(selector)', () => {
        const divs = prepareTestElements();

        const $dom = $('.test-dom');

        {// string selector
            expect($dom.index('#d2')).toBe(1);
            expect($dom.index('#d4')).toBeUndefined();
        }

        {// element selector
            expect($dom.index(divs[0])).toBe(0);
            const $children = $('.test-dom-child');
            expect($dom.index($children[0])).toBeUndefined();
        }

        {// dom selector
            const $div = $(divs[2]);
            expect($dom.index($div)).toBe(2);
        }

        {// invalid element
            const $document = $(document);
            expect($document.index()).toBeUndefined();
        }
    });

    it('check DOM#first()', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        const $first = $dom.first();
        expect($first.length).toBe(1);
        expect($first[0]).toBe(divs[0]);

        const $empty = $();
        const $efirst = $empty.first();
        expect($efirst).toBeDefined();
        expect($efirst.length).toBe(0);
    });

    it('check DOM#last()', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        const $last = $dom.last();
        expect($last.length).toBe(1);
        expect($last[0]).toBe(divs[2]);

        const $empty = $();
        const $elast = $empty.last();
        expect($elast).toBeDefined();
        expect($elast.length).toBe(0);
    });

    it('check DOM#add()', () => {
        prepareTestElements();
        const $dom = $('.test-dom');
        const $add = $dom.add('.test-dom-child');
        expect($dom === $add).toBe(false);
        expect($add.length).toBe(6);
    });

    it('check DOM#is()', () => {
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

    it('check DOM#filter()', () => {
        const divs = prepareTestElements();
        const $empty = $() as DOM<HTMLElement>; // eslint-disable-line

        {// no entry
            const $dom = $empty;
            const $filter = $dom.filter('.test-dom');
            expect($filter).toBeDefined();
        }

        {// empty selector
            const $dom = $('.test-dom');
            expect($dom.filter('')).toEqual($empty);
            expect($dom.filter(null)).toEqual($empty);
            expect($dom.filter(undefined)).toEqual($empty);
        }

        {// string selector
            const $dom = $('.test-dom');
            let $filter = $dom.filter('.test-dom');
            expect($filter.length).toBe(3);
            $filter = $dom.filter('.test-dom-child');
            expect($filter.length).toBe(0);
            $filter = $dom.filter('div');
            expect($filter.length).toBe(3);
            $filter = $dom.filter('#d1');
            expect($filter.length).toBe(1);
            expect($filter[0]).toBe(divs[0]);
            $filter = $dom.filter('#d2');
            expect($filter.length).toBe(1);
            expect($filter[0]).toBe(divs[1]);
            $filter = $dom.filter('#d3');
            expect($filter.length).toBe(1);
            expect($filter[0]).toBe(divs[2]);
            $filter = $dom.filter('#d999');
            expect($filter.length).toBe(0);
            $filter = $dom.filter('body > #d3');
            expect($filter.length).toBe(1);
            expect($filter[0]).toBe(divs[2]);

            const $body = $(body);
            $filter = $body.filter('body');
            expect($filter.length).toBe(1);
            expect($filter[0]).toBe(body);
        }

        {// document selector
            const $document = $(document);
            let $filter = $document.filter(document);
            expect($filter.length).toBe(1);
            $filter = $document.filter(window);
            expect($filter.length).toBe(0);
            const $body = $(body);
            const $filter2 = $body.filter(document);
            expect($filter2.length).toBe(0);
        }

        {// window selector
            const $window = $(window);
            let $filter = $window.filter(window);
            expect($filter.length).toBe(1);
            $filter = $window.filter(document);
            expect($filter.length).toBe(0);
            const $body = $(body);
            const $filter2 = $body.filter(window);
            expect($filter2.length).toBe(0);
        }

        {// element selector
            const $dom = $('.test-dom');
            let $filter = $dom.filter(divs[0]);
            expect($filter[0]).toBe(divs[0]);
            $filter = $dom.filter(divs[1]);
            expect($filter[0]).toBe(divs[1]);
            $filter = $dom.filter(divs[2]);
            expect($filter[0]).toBe(divs[2]);

            const elem = document.querySelector('span.test-dom-child');
            $filter = $dom.filter(elem);
            expect($filter.length).toBe(0);
        }

        {// elements selector
            const $dom = $('.test-dom');
            let $filter = $dom.filter(divs);
            expect($filter.length).toBe(3);
            const elems = document.querySelectorAll('.test-dom');
            $filter = $dom.filter(elems);
            expect($filter.length).toBe(3);

            const children = document.querySelectorAll('.test-dom-child');
            $filter = $dom.filter(children);
            expect($filter.length).toBe(0);

            $filter = $dom.filter([children[0], children[1]]);
            expect($filter.length).toBe(0);
            $filter = $dom.filter([divs[0], children[1]]);
            expect($filter.length).toBe(1);
            $filter = $dom.filter([children[0], divs[1]]);
            expect($filter.length).toBe(1);
        }

        {// function selector
            const $dom = $('.test-dom');
            let $filter = $dom.filter((index, elem: Element) => elem.classList.contains('test-dom'));
            expect($filter.length).toBe(3);
            $filter = $dom.filter((index) => 99 === index);
            expect($filter.length).toBe(0);
        }

        {// invalid selector
            const $dom = $('.test-dom');
            const $filter = $dom.filter({} as any);
            expect($filter.length).toBe(0);
        }
    });

    it('check DOM#not()', () => {
        const divs = prepareTestElements();
        const $empty = $() as DOM<HTMLElement>; // eslint-disable-line

        {// no entry
            const $dom = $empty;
            const $result = $dom.not('.test-dom');
            expect($result).toBeDefined();
            expect($result.length).toBe(0);
        }

        {// empty selector
            const $dom = $('.test-dom');
            expect($dom.not('')).toEqual($empty);
            expect($dom.not(null)).toEqual($empty);
            expect($dom.not(undefined)).toEqual($empty);
        }

        {// string selector
            const $dom = $('.test-dom');
            let $result = $dom.not('.test-dom');
            expect($result.length).toBe(0);
            $result = $dom.not('.test-dom-child');
            expect($result.length).toBe(3);
            $result = $dom.not('div');
            expect($result.length).toBe(0);
            $result = $dom.not('#d1');
            expect($result.length).toBe(2);
            expect($result[0]).toBe(divs[1]);
            expect($result[1]).toBe(divs[2]);
            $result = $dom.not('#d2');
            expect($result.length).toBe(2);
            expect($result[0]).toBe(divs[0]);
            expect($result[1]).toBe(divs[2]);
            $result = $dom.not('#d3');
            expect($result.length).toBe(2);
            expect($result[0]).toBe(divs[0]);
            expect($result[1]).toBe(divs[1]);
            $result = $dom.not('#d999');
            expect($result.length).toBe(3);
            $result = $dom.not('body > #d2');
            expect($result.length).toBe(2);
            expect($result[0]).toBe(divs[0]);
            expect($result[1]).toBe(divs[2]);
        }

        {// document selector
            const $document = $(document);
            let $result = $document.not(document);
            expect($result.length).toBe(0);
            $result = $document.not(window);
            expect($result.length).toBe(1);
            const $body = $(body);
            const $result2 = $body.not(document);
            expect($result2.length).toBe(1);
        }

        {// window selector
            const $window = $(window);
            let $result = $window.not(window);
            expect($result.length).toBe(0);
            $result = $window.not(document);
            expect($result.length).toBe(1);
            const $body = $(body);
            const $result2 = $body.not(window);
            expect($result2.length).toBe(1);
        }

        {// element selector
            const $dom = $('.test-dom');
            let $result = $dom.not(divs[0]);
            expect($result[0]).toBe(divs[1]);
            expect($result[1]).toBe(divs[2]);
            $result = $dom.not(divs[1]);
            expect($result[0]).toBe(divs[0]);
            expect($result[1]).toBe(divs[2]);
            $result = $dom.not(divs[2]);
            expect($result[0]).toBe(divs[0]);
            expect($result[1]).toBe(divs[1]);

            const elem = document.querySelector('span.test-dom-child');
            $result = $dom.not(elem);
            expect($result.length).toBe(3);
        }

        {// elements selector
            const $dom = $('.test-dom');
            let $result = $dom.not(divs);
            expect($result.length).toBe(0);
            const elems = document.querySelectorAll('.test-dom');
            $result = $dom.not(elems);
            expect($result.length).toBe(0);

            const children = document.querySelectorAll('.test-dom-child');
            $result = $dom.not(children);
            expect($result.length).toBe(3);

            $result = $dom.not([children[0], children[1]]);
            expect($result.length).toBe(3);
            $result = $dom.not([divs[0], children[1]]);
            expect($result.length).toBe(2);
            $result = $dom.not([children[0], divs[1]]);
            expect($result.length).toBe(2);
        }

        {// function selector
            const $dom = $('.test-dom');
            let $result = $dom.not((index, elem: Element) => elem.classList.contains('test-dom'));
            expect($result.length).toBe(0);
            $result = $dom.not((index) => 2 === index);
            expect($result.length).toBe(2);
        }

        {// invalid selector
            const $dom = $('.test-dom');
            const $result = $dom.not({} as any);
            expect($result.length).toBe(3);
        }
    });

    it('check DOM#find()', () => {
        const divs = prepareTestElements();

        {// string selector
            const $dom = $('.test-dom');
            let $result = $dom.find('.test-dom-child');
            expect($result.length).toBe(3);
            $result = $dom.find('span');
            expect($result.length).toBe(1);
        }

        {// window selector
            const $window = $(window);
            const $result = $window.find<HTMLDivElement>('.test-dom');
            expect($result.length).toBe(0);
        }

        {// elements selector
            const $dom = $('.test-dom');
            let $result = $dom.find(divs);
            expect($result.length).toBe(0);

            const $children = $('.test-dom-child');
            $result = $dom.find($children);
            expect($result.length).toBe(3);
        }
    });

    it('check DOM#has()', () => {
        const divs = prepareTestElements();

        {// string selector
            const $dom = $('.test-dom');
            let $result = $dom.has('.test-dom-child');
            expect($result.length).toBe(3);
            expect($result[0]).toBe(divs[0]);
            expect($result[1]).toBe(divs[1]);
            expect($result[2]).toBe(divs[2]);
            $result = $dom.has('span');
            expect($result.length).toBe(1);
            expect($result[0]).toBe(divs[1]);
        }

        {// window selector
            const $window = $(window);
            const $result = $window.has('.test-dom');
            expect($result.length).toBe(0);
        }

        {// elements selector
            const $dom = $('.test-dom');
            let $result = $dom.has(divs);
            expect($result.length).toBe(0);

            const $children = $('.test-dom-child');
            $result = $dom.has($children);
            expect($result.length).toBe(3);
        }
    });

    it('check DOM#map()', () => {
        prepareTestElements();
        const $dom = $('.test-dom');
        const $map = $dom.map((index, el) => el.firstElementChild as HTMLElement);
        expect($map.length).toBe(3);
        expect($map[0] instanceof HTMLParagraphElement).toBe(true);
        expect($map[1] instanceof HTMLSpanElement).toBe(true);
        expect($map[2] instanceof HTMLHRElement).toBe(true);
    });

    it('check DOM#each()', () => {
        prepareTestElements();
        let count = 0;
        const stub = { onCallback: (index: number, el: HTMLElement) => { count++; } }; // eslint-disable-line
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('.test-dom');
        $dom.each(stub.onCallback);
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(3);

        count = 0;
        const stub2 = {
            onCallback: (index: number, el: HTMLElement) => {   // eslint-disable-line
                count++;
                if (1 === index) {
                    return false;
                }
                return true;
            }
        };
        spyOn(stub2, 'onCallback').and.callThrough();
        $dom.each(stub2.onCallback);
        expect(stub2.onCallback).toHaveBeenCalled();
        expect(count).toBe(2);
    });

    it('check DOM#slice()', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');

        let $slice = $dom.slice();
        expect($slice.length).toBe(3);
        expect($slice[0]).toBe(divs[0]);
        expect($slice[1]).toBe(divs[1]);
        expect($slice[2]).toBe(divs[2]);

        $slice = $dom.slice(1, 2);
        expect($slice.length).toBe(1);
        expect($slice[0]).toBe(divs[1]);

        $slice = $dom.slice(-3, -1);
        expect($slice.length).toBe(2);
        expect($slice[0]).toBe(divs[0]);
        expect($slice[1]).toBe(divs[1]);
    });

    it('check DOM#eq()', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');

        let $eq = $dom.eq(0);
        expect($eq.length).toBe(1);
        expect($eq[0]).toBe(divs[0]);
        $eq = $dom.eq(1);
        expect($eq.length).toBe(1);
        expect($eq[0]).toBe(divs[1]);
        $eq = $dom.eq(-1);
        expect($eq.length).toBe(1);
        expect($eq[0]).toBe(divs[2]);
        $eq = $dom.eq(null as any);
        expect($eq.length).toBe(0);
    });

    it('check DOM#closest()', () => {
        const divs = prepareTestElements();
        const $dom = $('span.test-dom-child');

        let $closet = $dom.closest('div');
        expect($closet.length).toBe(1);
        expect($closet[0]).toBe(divs[1]);

        $closet = $dom.closest('.test-dom-child');
        expect($closet.length).toBe(1);
        expect($closet).toBe($dom); // jQuery は新規インスタンスを返却

        $closet = $dom.closest(null as any);
        expect($closet.length).toBe(0);

        $closet = $(window).closest('.test-dom-child');
        expect($closet.length).toBe(0);
    });

    it('check DOM#children()', () => {
        prepareTestElements();
        const children: NodeListOf<HTMLElement> = document.querySelectorAll('.test-dom-child');

        const $dom = $('.test-dom');
        let $children = $dom.children();
        expect($children.length).toBe(3);
        expect($children[0]).toBe(children[0]);
        expect($children[1]).toBe(children[1]);
        expect($children[2]).toBe(children[2]);

        $children = $dom.children('hr');
        expect($children.length).toBe(1);
        expect($children[0]).toBe(children[2]);

        const $window = $(window);
        expect($window.children().length).toBe(0);
        const $document = $(document);
        expect($document.children().length).toBe(1);
    });

    it('check DOM#parent()', () => {
        const divs = prepareTestElements(testee(`
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

        {// standard
            const $parent = $('.test-dom-child').parent();
            expect($parent).toBeDefined();
            expect($parent.length).toBe(3);
            expect($parent[0]).toEqual(divs[0]);
            expect($parent[1]).toEqual(divs[1]);
            expect($parent[2]).toEqual(divs[2]);
        }

        {// filtered
            const $parent = $('.test-dom-child').parent('.mother1');
            expect($parent).toBeDefined();
            expect($parent.length).toBe(1);
            expect($parent[0]).toEqual(divs[1]);
        }

        {// no parent
            const $parent1 = $(document).parent();
            expect($parent1).toBeDefined();
            expect($parent1.length).toBe(0);

            const $parent2 = $(window).parent();
            expect($parent2).toBeDefined();
            expect($parent2.length).toBe(0);

            const $parent3 = $(body).parent();
            expect($parent3).toBeDefined();
            expect($parent3.length).toBe(1); // <html>
        }

        {// flagment parent
            const $dom = $('<div class="test-dom"></div>');
            expect($dom).toBeDefined();
            const $parent = $dom.parent();
            expect($parent).toBeDefined();
            expect($parent.length).toBe(0);
        }
    });

    it('check DOM#parents() / parentsUntil()', () => {
        const $dom = $(`
<ul class="test-dom level-1">
  <li class="item-i">I</li>
  <li class="item-ii">II
    <ul class="level-2">
      <li class="item-a">A</li>
      <li class="item-b">B
        <ul class="level-3">
          <li class="item-1">1</li>
          <li class="item-2">2</li>
          <li class="item-3">3</li>
        </ul>
      </li>
      <li class="item-c">C</li>
    </ul>
  </li>
  <li class="item-iii">III</li>
</ul>`);
        const fragment = $dom[0].parentNode as ParentNode;

        {// standard
            const $parents1 = $('.item-i', fragment).parents();
            expect($parents1).toBeDefined();
            expect($parents1.length).toBe(1);
            expect($parents1[0].classList.contains('level-1')).toBe(true);

            const $parents2 = $('.item-a', fragment).parents();
            expect($parents2).toBeDefined();
            expect($parents2.length).toBe(3);
            expect($parents2[0].classList.contains('level-2')).toBe(true);
            expect($parents2[1].classList.contains('item-ii')).toBe(true);
            expect($parents2[2].classList.contains('level-1')).toBe(true);

            const $parents3 = $('li', fragment).parents();
            expect($parents3).toBeDefined();
            expect($parents3.length).toBe(5);
            expect($parents3[0].classList.contains('level-3')).toBe(true);
            expect($parents3[1].classList.contains('item-b')).toBe(true);
            expect($parents3[2].classList.contains('level-2')).toBe(true);
            expect($parents3[3].classList.contains('item-ii')).toBe(true);
            expect($parents3[4].classList.contains('level-1')).toBe(true);
        }

        {// filtered
            const $parents1 = $('.item-3', fragment).parents('ul');
            expect($parents1).toBeDefined();
            expect($parents1.length).toBe(3);
            expect($parents1[0].classList.contains('level-3')).toBe(true);
            expect($parents1[1].classList.contains('level-2')).toBe(true);
            expect($parents1[2].classList.contains('level-1')).toBe(true);

            const $parents2 = $('.item-3', fragment).parents('li');
            expect($parents2).toBeDefined();
            expect($parents2.length).toBe(2);
            expect($parents2[0].classList.contains('item-b')).toBe(true);
            expect($parents2[1].classList.contains('item-ii')).toBe(true);

            const $parents3 = $('.item-3', fragment).parents('.item-ii');
            expect($parents3).toBeDefined();
            expect($parents3.length).toBe(1);
            expect($parents3[0].classList.contains('item-ii')).toBe(true);
        }

        {// until
            const $parents1 = $('.item-3', fragment).parentsUntil('.level-2');
            expect($parents1).toBeDefined();
            expect($parents1.length).toBe(2);
            expect($parents1[0].classList.contains('level-3')).toBe(true);
            expect($parents1[1].classList.contains('item-b')).toBe(true);

            const children = fragment.querySelectorAll('.level-3 > li');

            const $parents2 = $('.item-3', fragment).parentsUntil(children, '.item-b');
            expect($parents2).toBeDefined();
            expect($parents2.length).toBe(1);
            expect($parents2[0].classList.contains('item-b')).toBe(true);
        }

        {// no parent
            const $parent1 = $(document).parents();
            expect($parent1).toBeDefined();
            expect($parent1.length).toBe(0);

            const $parent2 = $(window).parents();
            expect($parent2).toBeDefined();
            expect($parent2.length).toBe(0);

            const $parent3 = $(body).parents();
            expect($parent3).toBeDefined();
            expect($parent3.length).toBe(1); // <html>
        }
    });
});
