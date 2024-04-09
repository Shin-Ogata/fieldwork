/* eslint-disable
    @stylistic:js/block-spacing,
    @typescript-eslint/no-explicit-any,
 */

import { dom as $ } from '@cdp/dom';
import {
    DOM,
    prepareTestElements,
    cleanupTestElements,
    mixedCollection,
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
            const $dom = $() as DOM<HTMLElement>;
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
        const $empty = $() as DOM<HTMLElement>;

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
        const $empty = $() as DOM<HTMLElement>;

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

        {// body
            const $dom = $(body);
            const $result = $dom.not('body');
            expect($result.length).toBe(0);
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
            const $result = $window.find('.test-dom') as DOM<HTMLDivElement>;
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

        // no hit
        $closet = $dom.closest('.hoge-hoge');
        expect($closet.length).toBe(0);

        // own
        $closet = $dom.closest('.test-dom-child');
        expect($closet.length).toBe(1);
        expect($closet[0]).toBe($dom[0]);

        // own from $
        $closet = $dom.closest($closet);
        expect($closet.length).toBe(1);
        expect($closet[0]).toBe($dom[0]);

        // elements
        $closet = $dom.closest(divs);
        expect($closet.length).toBe(1);
        expect($closet[0]).toBe(divs[1]);

        // no supported
        $closet = $dom.closest(null as any);
        expect($closet.length).toBe(0);

        // no supported
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

        {// fragment parent
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
        const fragment = $dom[0].parentNode!;

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

    it('check DOM#next()', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        let $next = $dom.next();
        expect($next.length).toBe(2);
        expect($next[0]).toBe(divs[1]);
        expect($next[1]).toBe(divs[2]);

        $next = $dom.next('#d3');
        expect($next.length).toBe(1);
        expect($next[0]).toBe(divs[2]);

        $next = $(document).next();
        expect($next.length).toBe(0);

        $next = $(window).next();
        expect($next.length).toBe(0);
    });

    it('check DOM#nextAll() / nextUntil()', () => {
        const $dom = $(`
<dl class="test-dom">
  <dt id="term-1">term 1</dt>
  <dd>definition 1-a</dd>
  <dd>definition 1-b</dd>
  <dd>definition 1-c</dd>
  <dd>definition 1-d</dd>
  <dt id="term-2">term 2</dt>
  <dd>definition 2-a</dd>
  <dd>definition 2-b</dd>
  <dd>definition 2-c</dd>
  <dt id="term-3">term 3</dt>
  <dd>definition 3-a</dd>
  <dd>definition 3-b</dd>
</dl>`);

        const $children = $dom.children();
        const $dt = $dom.find('#term-1');
        let $next = $dt.nextAll();
        expect($next.length).toBe(11);
        expect($next[0]).toBe($children[1]);
        expect($next[10]).toBe($children[11]);

        $next = $dt.nextAll('dd');
        expect($next.length).toBe(9);

        $next = $dt.nextAll($dom.find('dt'));
        expect($next.length).toBe(2);
        expect($next[0]).toBe($children[5]);
        expect($next[1]).toBe($children[9]);

        $next = $dt.nextUntil('dt');
        expect($next.length).toBe(4);
        expect($next[0]).toBe($children[1]);
        expect($next[1]).toBe($children[2]);
        expect($next[2]).toBe($children[3]);
        expect($next[3]).toBe($children[4]);

        $next = $dom.find('dt').nextUntil($children.last(), 'dd');
        expect($next.length).toBe(8);
        expect($next[0]).toBe($children[1]);
        expect($next[1]).toBe($children[2]);
        expect($next[2]).toBe($children[3]);
        expect($next[3]).toBe($children[4]);
        expect($next[4]).toBe($children[6]);
        expect($next[5]).toBe($children[7]);
        expect($next[6]).toBe($children[8]);
        expect($next[7]).toBe($children[10]);
    });

    it('check DOM#prev()', () => {
        const $div = $(`
<div class="test-dom">
    <div id="d1" class="test-dom" tabindex="-1">
        <p class="test-dom-child"></p>
    </div>
    <div id="d2" class="test-dom">
        <span class="test-dom-child"></span>
    </div>
    <div id="d3" class="test-dom">
        <hr class="test-dom-child"></hr>
    </div>
</div>`);
        const $dom = $div.children();
        let $prev = $dom.prev();
        expect($prev.length).toBe(2);
        expect($prev[0]).toBe($dom[0]);
        expect($prev[1]).toBe($dom[1]);

        $prev = $dom.prev('#d1');
        expect($prev.length).toBe(1);
        expect($prev[0]).toBe($dom[0]);

        $prev = $(document).prev();
        expect($prev.length).toBe(0);

        $prev = $(window).prev();
        expect($prev.length).toBe(0);
    });

    it('check DOM#prevAll() / prevUntil()', () => {
        const $dom = $(`
<dl class="test-dom">
  <dt id="term-1">term 1</dt>
  <dd>definition 1-a</dd>
  <dd>definition 1-b</dd>
  <dd>definition 1-c</dd>
  <dd>definition 1-d</dd>
  <dt id="term-2">term 2</dt>
  <dd>definition 2-a</dd>
  <dd>definition 2-b</dd>
  <dd>definition 2-c</dd>
  <dt id="term-3">term 3</dt>
  <dd>definition 3-a</dd>
  <dd>definition 3-b</dd>
</dl>`);

        const $children = $dom.children();
        const $dt = $dom.find('#term-3');
        let $prev = $dt.prevAll();
        expect($prev.length).toBe(9);
        expect($prev[0]).toBe($children[8]);
        expect($prev[8]).toBe($children[0]);

        $prev = $dt.prevAll('dd');
        expect($prev.length).toBe(7);

        $prev = $dt.prevAll($dom.find('dt'));
        expect($prev.length).toBe(2);
        expect($prev[0]).toBe($children[5]);
        expect($prev[1]).toBe($children[0]);

        $prev = $dt.prevUntil('dt');
        expect($prev.length).toBe(3);
        expect($prev[0]).toBe($children[8]);
        expect($prev[1]).toBe($children[7]);
        expect($prev[2]).toBe($children[6]);

        $prev = $dom.find('dt').prevUntil($children.first(), 'dd');
        expect($prev.length).toBe(7);
        expect($prev[0]).toBe($children[4]);
        expect($prev[1]).toBe($children[3]);
        expect($prev[2]).toBe($children[2]);
        expect($prev[3]).toBe($children[1]);
        expect($prev[4]).toBe($children[8]);
        expect($prev[5]).toBe($children[7]);
        expect($prev[6]).toBe($children[6]);

        $prev = $(document).prevUntil();
        expect($prev.length).toBe(0);

        $prev = $(window).prevAll();
        expect($prev.length).toBe(0);
    });

    it('check DOM#siblings()', () => {
        const $dom = $(`
<ul class="test-dom">
  <li class='hoge'>list item 1</li>
  <li>list item 2</li>
  <li class="third-item">list item 3</li>
  <li class='hoge'>list item 4</li>
  <li>list item 5</li>
</ul>`);

        const $children = $dom.children();
        const $third = $dom.find('.third-item');
        let $siblings = $third.siblings();
        expect($siblings.length).toBe(4);
        expect($siblings[0]).toBe($children[0]);
        expect($siblings[1]).toBe($children[1]);
        expect($siblings[2]).toBe($children[3]);
        expect($siblings[3]).toBe($children[4]);

        $siblings = $third.siblings('.hoge');
        expect($siblings.length).toBe(2);
        expect($siblings[0]).toBe($children[0]);
        expect($siblings[1]).toBe($children[3]);

        $siblings = $dom.siblings();
        expect($siblings.length).toBe(0);

        $siblings = $(document).siblings();
        expect($siblings.length).toBe(0);

        $siblings = $(window).siblings();
        expect($siblings.length).toBe(0);
    });

    it('check DOM#contents()', () => {
        const $dom = $(`
<div class="container">
  <!-- comment -->
  Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed
  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
  <br><br>
  Ut enim ad minim veniam, quis nostrud exercitation ullamco
  laboris nisi ut aliquip ex ea commodo consequat.
  <br><br>
  Duis aute irure dolor in reprehenderit in voluptate velit
  esse cillum dolore eu fugiat nulla pariatur.
  <template id="templ-1">
      <tr>
        <td class="record"></td>
        <td></td>
      </tr>
  </template>
</div>`);
        let $contents = $dom.contents();
        expect($contents.length).toBe(11);
        expect($contents[0].nodeType).toBe(Node.TEXT_NODE);
        expect($contents[1].nodeType).toBe(Node.COMMENT_NODE);
        expect($contents[2].nodeType).toBe(Node.TEXT_NODE);
        expect($contents[3].nodeType).toBe(Node.ELEMENT_NODE);
        expect($contents[4].nodeType).toBe(Node.ELEMENT_NODE);
        expect($contents[5].nodeType).toBe(Node.TEXT_NODE);
        expect($contents[6].nodeType).toBe(Node.ELEMENT_NODE);
        expect($contents[7].nodeType).toBe(Node.ELEMENT_NODE);
        expect($contents[8].nodeType).toBe(Node.TEXT_NODE);
        expect($contents[9].nodeType).toBe(Node.ELEMENT_NODE);
        expect($contents[10].nodeType).toBe(Node.TEXT_NODE);

        const $template = $dom.find('#templ-1');
        $contents = $template.contents();
        expect($contents.length).toBe(1);
        expect($contents[0].nodeType).toBe(Node.DOCUMENT_FRAGMENT_NODE);
        expect($contents.find('.record').length).toBe(1);

        const $iframe = $(document).find('iframe');
        $contents = $iframe.contents();
        expect($contents.length).toBe(1);
        expect($contents.find('body').length).toBe(1);

        $contents = $(document).contents();
        expect($contents.length).toBe(2);

        $contents = $(window).contents();
        expect($contents.length).toBe(0);
    });

    it('check DOM#offsetParent()', () => {
        prepareTestElements(testee(`
<ul class="level-1 test-dom">
  <li class="item-i">I</li>
  <li class="item-ii" style="position: relative;">II
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
</ul>`));

        const rootElement = document.documentElement;
        const $dom = $('li.item-a');
        let $offsetParent = $dom.offsetParent();
        expect($offsetParent.hasClass('item-ii')).toBe(true);

        $offsetParent = $('<div></div>').offsetParent();
        expect($offsetParent[0]).toBe(rootElement);

        $offsetParent = $().offsetParent();
        expect($offsetParent.length).toBe(0);

        $offsetParent = $(window).offsetParent();
        expect($offsetParent[0]).toBe(rootElement);

        $offsetParent = $(document).offsetParent();
        expect($offsetParent[0]).toBe(rootElement);
    });

    it('check DOM#offsetParent() svg', () => {
        prepareTestElements(testee(`
<div class="level-1 test-dom">
    <svg id="test-svg1" style="width: 40px; height: 40px;" ><rect/></svg>
    <div class="div1" style="position: relative;">
        <svg id="test-svg2"><rect/></svg>
    </div>
    <div class="div2" style="position: relative; display: none;">
        <svg id="test-svg3"><rect/></svg>
    </div>
    <div class="div3" style="position: relative;">
        <svg id="test-svg4" style="position: fixed;"><rect/></svg>
    </div>
    <div class="div4" style="display: none;">
        <svg id="test-svg5"><rect/></svg>
    </div>
</div>`));

        const rootElement = document.documentElement;
        let $svg = $('#test-svg1');
        let $offsetParent = $svg.offsetParent();
        expect($offsetParent[0]).toBe(rootElement);

        $svg = $('#test-svg2');
        $offsetParent = $svg.offsetParent();
        expect($offsetParent.hasClass('div1')).toBe(true);

        $svg = $('#test-svg3');
        $offsetParent = $svg.offsetParent();
        expect($offsetParent[0]).toBe(rootElement);

        $svg = $('#test-svg4');
        $offsetParent = $svg.offsetParent();
        expect($offsetParent[0]).toBe(rootElement);

        $svg = $('#test-svg5');
        $offsetParent = $svg.offsetParent();
        expect($offsetParent[0]).toBe(rootElement);
    });

    it('check mixedCollection', () => {
        const $dom = mixedCollection().add(window).add(document);
        expect(() => $dom.find('br')).not.toThrow();
        expect(() => $dom.has('template')).not.toThrow();
        expect(() => $dom.closest('.test-dom')).not.toThrow();
        expect(() => $dom.children()).not.toThrow();
        expect(() => $dom.next()).not.toThrow();
        expect(() => $dom.prev()).not.toThrow();
        expect(() => $dom.siblings()).not.toThrow();
        expect(() => $dom.contents()).not.toThrow();
    });
});
