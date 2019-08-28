/* eslint-disable block-spacing, @typescript-eslint/no-explicit-any */
import $ from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
} from './tools';

describe('dom methods spec', () => {
    const body = document.body;
    const testee = $.utils.elementify.bind($.utils);

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

    it('check DOM#parent', () => {
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

    it('check DOM#parents / parentsUntil', () => {
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
