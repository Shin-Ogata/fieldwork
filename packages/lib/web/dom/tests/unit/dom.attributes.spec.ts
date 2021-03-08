/* eslint-disable
    block-spacing
 ,  @typescript-eslint/no-explicit-any
 */

import { dom as $ } from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
    mixedCollection,
} from './tools';

describe('dom/attributes spec', () => {
    const testee = $.utils.elementify.bind($.utils);

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check DOM#addClass()', () => {
        const divs = prepareTestElements();

        const orgDiv0ClassLength = divs[0].classList.length;
        const orgDiv1ClassLength = divs[1].classList.length;
        const orgDiv2ClassLength = divs[2].classList.length;

        const $dom = $('.test-dom');
        $dom.addClass('hoge');

        expect($dom[0].classList.contains('hoge')).toBe(true);
        expect($dom[0].classList.contains('fuga')).toBe(false);
        expect($dom[0].classList.length).toBe(orgDiv0ClassLength + 1);
        expect($dom[1].classList.contains('hoge')).toBe(true);
        expect($dom[1].classList.contains('fuga')).toBe(false);
        expect($dom[1].classList.length).toBe(orgDiv1ClassLength + 1);
        expect($dom[2].classList.contains('hoge')).toBe(true);
        expect($dom[2].classList.contains('fuga')).toBe(false);
        expect($dom[2].classList.length).toBe(orgDiv2ClassLength + 1);

        $dom.addClass(['hoge', 'fuga']);
        expect($dom[0].classList.contains('hoge')).toBe(true);
        expect($dom[0].classList.contains('fuga')).toBe(true);
        expect($dom[0].classList.length).toBe(orgDiv0ClassLength + 2);
        expect($dom[1].classList.contains('hoge')).toBe(true);
        expect($dom[1].classList.contains('fuga')).toBe(true);
        expect($dom[1].classList.length).toBe(orgDiv1ClassLength + 2);
        expect($dom[2].classList.contains('hoge')).toBe(true);
        expect($dom[2].classList.contains('fuga')).toBe(true);
        expect($dom[2].classList.length).toBe(orgDiv2ClassLength + 2);

        expect(() => $(document).addClass('hoge')).not.toThrow();
        expect(() => $(window).addClass('hoge')).not.toThrow();
    });

    it('check DOM#removeClass()', () => {
        prepareTestElements();

        const $dom = $('.test-dom');
        $dom.addClass(['hoge', 'fuga']);

        $dom.removeClass('hoge');
        expect($dom[0].classList.contains('hoge')).toBe(false);
        expect($dom[0].classList.contains('fuga')).toBe(true);
        expect($dom[1].classList.contains('hoge')).toBe(false);
        expect($dom[1].classList.contains('fuga')).toBe(true);
        expect($dom[2].classList.contains('hoge')).toBe(false);
        expect($dom[2].classList.contains('fuga')).toBe(true);

        $dom.removeClass(['hoge', 'fuga']);
        expect($dom[0].classList.contains('hoge')).toBe(false);
        expect($dom[0].classList.contains('fuga')).toBe(false);
        expect($dom[1].classList.contains('hoge')).toBe(false);
        expect($dom[1].classList.contains('fuga')).toBe(false);
        expect($dom[2].classList.contains('hoge')).toBe(false);
        expect($dom[2].classList.contains('fuga')).toBe(false);

        expect(() => $(document).removeClass('hoge')).not.toThrow();
        expect(() => $(window).removeClass('hoge')).not.toThrow();
    });

    it('check DOM#hasClass()', () => {
        prepareTestElements();

        const $dom = $('.test-dom');
        $dom.addClass('hoge');
        $dom[1].classList.add('fuga');

        expect($dom.hasClass('hoge')).toBe(true);
        expect($dom.hasClass('fuga')).toBe(true);

        $dom.removeClass('hoge');
        expect($dom.hasClass('hoge')).toBe(false);
        expect($dom.hasClass('fuga')).toBe(true);

        expect($(document).hasClass('hoge')).toBe(false);
        expect($(window).hasClass('hoge')).toBe(false);
    });

    it('check DOM#toggleClass()', () => {
        const divs = prepareTestElements();
        divs[0].classList.add('aaa');
        divs[1].classList.add('aaa', 'bbb');
        divs[2].classList.add('aaa', 'bbb', 'ccc');

        const $dom = $('.test-dom');

        // toggle
        $dom.toggleClass('bbb');
        expect(divs[0].classList.contains('bbb')).toBe(true);
        expect(divs[1].classList.contains('bbb')).toBe(false);
        expect(divs[2].classList.contains('bbb')).toBe(false);

        // add
        $dom.toggleClass('ccc', true);
        expect(divs[0].classList.contains('ccc')).toBe(true);
        expect(divs[1].classList.contains('ccc')).toBe(true);
        expect(divs[2].classList.contains('ccc')).toBe(true);

        // remove
        $dom.toggleClass(['aaa', 'bbb'], false);
        expect(divs[0].classList.contains('aaa')).toBe(false);
        expect(divs[0].classList.contains('bbb')).toBe(false);
        expect(divs[1].classList.contains('aaa')).toBe(false);
        expect(divs[1].classList.contains('bbb')).toBe(false);
        expect(divs[2].classList.contains('aaa')).toBe(false);
        expect(divs[2].classList.contains('bbb')).toBe(false);

        expect(() => $(document).toggleClass('hoge')).not.toThrow();
        expect(() => $(window).toggleClass('hoge')).not.toThrow();
    });

    it('check DOM#prop(name), getter', () => {
        const divs = prepareTestElements();
        const $dom = $('#d1');
        expect($dom.prop('draggable')).toBe(false);
        divs[0].draggable = true;
        expect($dom.prop('draggable')).toBe(true);

        const $e = $();
        expect(($e as any).prop('draggable')).toBeUndefined();
    });

    it('check DOM#prop(name, value), single setter', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        expect(divs[0].draggable).toBe(false);
        expect(divs[1].draggable).toBe(false);
        expect(divs[2].draggable).toBe(false);
        $dom.prop('draggable', true);
        expect(divs[0].draggable).toBe(true);
        expect(divs[1].draggable).toBe(true);
        expect(divs[2].draggable).toBe(true);
    });

    it('check DOM#prop(properties), multi setter', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');

        expect(divs[0].draggable).toBe(false);
        expect(divs[0].hidden).toBe(false);
        expect((divs[0] as any).hoge).toBeUndefined();
        expect(divs[1].draggable).toBe(false);
        expect(divs[1].hidden).toBe(false);
        expect((divs[1] as any).hoge).toBeUndefined();
        expect(divs[2].draggable).toBe(false);
        expect(divs[2].hidden).toBe(false);
        expect((divs[2] as any).hoge).toBeUndefined();
        $dom.prop({
            draggable: true,
            hidden: true,
            hoge: 1,
        });
        expect(divs[0].draggable).toBe(true);
        expect(divs[0].hidden).toBe(true);
        expect((divs[0] as any).hoge).toBeUndefined();
        expect(divs[1].draggable).toBe(true);
        expect(divs[1].hidden).toBe(true);
        expect((divs[1] as any).hoge).toBeUndefined();
        expect(divs[2].draggable).toBe(true);
        expect(divs[2].hidden).toBe(true);
        expect((divs[2] as any).hoge).toBeUndefined();
    });

    it('check DOM#attr(name), getter', () => {
        const divs = prepareTestElements();
        const $dom = $('#d1');
        expect($dom.attr('id')).toBe('d1');
        expect($dom.attr('hoge')).toBeUndefined();
        divs[0].setAttribute('hoge', 'test');
        expect($dom.attr('hoge')).toBe('test');

        const $e = $();
        expect($e.attr('id')).toBeUndefined();
    });

    it('check DOM#attr(name, value), single setter', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        $dom.attr('hoge', 'test');
        expect(divs[0].getAttribute('hoge')).toBe('test');
        expect(divs[1].getAttribute('hoge')).toBe('test');
        expect(divs[2].getAttribute('hoge')).toBe('test');
        $dom.attr('fuga', 100);
        expect(divs[0].getAttribute('fuga')).toBe('100');
        expect(divs[1].getAttribute('fuga')).toBe('100');
        expect(divs[2].getAttribute('fuga')).toBe('100');
        $dom.attr('hoge', null);
        expect(divs[0].getAttribute('hoge')).toBe(null);
        expect(divs[1].getAttribute('hoge')).toBe(null);
        expect(divs[2].getAttribute('hoge')).toBe(null);

        const $e = $().attr('id', 'empty');
        expect(($e as any).attr('id')).toBeUndefined();
    });

    it('check DOM#attr(attributes), multi setter', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        $dom.attr({
            hoge: 'test',
            fuga: 100,
        });
        expect(divs[0].getAttribute('hoge')).toBe('test');
        expect(divs[1].getAttribute('hoge')).toBe('test');
        expect(divs[2].getAttribute('hoge')).toBe('test');
        expect(divs[0].getAttribute('fuga')).toBe('100');
        expect(divs[1].getAttribute('fuga')).toBe('100');
        expect(divs[2].getAttribute('fuga')).toBe('100');
        $dom.attr({ hoge: null });
        expect(divs[0].getAttribute('hoge')).toBe(null);
        expect(divs[1].getAttribute('hoge')).toBe(null);
        expect(divs[2].getAttribute('hoge')).toBe(null);
    });

    it('check DOM#removeAttr()', () => {
        const divs = prepareTestElements();
        const $dom = $('.test-dom');
        $dom.attr({
            hoge: 'test',
            fuga: 100,
            bar: true,
        });
        expect(divs[0].getAttribute('hoge')).toBe('test');
        expect(divs[1].getAttribute('hoge')).toBe('test');
        expect(divs[2].getAttribute('hoge')).toBe('test');
        expect(divs[0].getAttribute('fuga')).toBe('100');
        expect(divs[1].getAttribute('fuga')).toBe('100');
        expect(divs[2].getAttribute('fuga')).toBe('100');
        expect(divs[0].getAttribute('bar')).toBe('true');
        expect(divs[1].getAttribute('bar')).toBe('true');
        expect(divs[2].getAttribute('bar')).toBe('true');
        $dom.removeAttr('hoge');
        expect(divs[0].getAttribute('hoge')).toBeNull();
        expect(divs[1].getAttribute('hoge')).toBeNull();
        expect(divs[2].getAttribute('hoge')).toBeNull();
        expect(divs[0].getAttribute('fuga')).toBe('100');
        expect(divs[1].getAttribute('fuga')).toBe('100');
        expect(divs[2].getAttribute('fuga')).toBe('100');
        expect(divs[0].getAttribute('bar')).toBe('true');
        expect(divs[1].getAttribute('bar')).toBe('true');
        expect(divs[2].getAttribute('bar')).toBe('true');
        $dom.removeAttr(['fuga', 'bar']);
        expect(divs[0].getAttribute('hoge')).toBeNull();
        expect(divs[1].getAttribute('hoge')).toBeNull();
        expect(divs[2].getAttribute('hoge')).toBeNull();
        expect(divs[0].getAttribute('fuga')).toBeNull();
        expect(divs[1].getAttribute('fuga')).toBeNull();
        expect(divs[2].getAttribute('fuga')).toBeNull();
        expect(divs[0].getAttribute('bar')).toBeNull();
        expect(divs[1].getAttribute('bar')).toBeNull();
        expect(divs[2].getAttribute('bar')).toBeNull();

        const $e = $();
        expect(() => $e.removeAttr('id')).not.toThrow();
    });

    it('check DOM#val(), get value', () => {
        const divs = prepareTestElements(testee(`
<div id="d1" class="test-dom father">
    <input type="radio" name="test-radio" id="test-radio-1" value="on" checked="checked">
</div>
<div id="d2" class="test-dom father">
    <select id="s1">
      <option>Single</option>
      <option selected="selected">Single2</option>
    </select>
</div>
<div id="d3" class="test-dom father">
    <select id="s2" multiple="multiple">
      <option selected="selected">Multi</option>
      <option selected="selected">Multi2</option>
    </select>
</div>
<div id="d4" class="test-dom father">
    <meter id="m1" min="0" low="60" high="80" max="100" value="65"></meter>
</div>
`));

        const $radio = $(divs[0].firstElementChild as HTMLInputElement);
        expect($radio.val()).toBe('on');
        const $select = $(divs[1].firstElementChild as HTMLSelectElement);
        expect($select.val()).toBe('Single2');
        const $mselect = $(divs[2].firstElementChild as HTMLSelectElement);
        expect($mselect.val()).toEqual(['Multi', 'Multi2']);
        const $meter = $(divs[3].firstElementChild as HTMLMeterElement);
        expect($meter.val()).toBe(65);
        const $div = $(divs[0]);
        expect($div.val()).toBeUndefined();
        const $window = $(window);
        expect($window.val()).toBeUndefined();
    });

    it('check DOM#val(), set value', () => {
        const divs = prepareTestElements(testee(`
<div id="d1" class="test-dom father">
    <input type="checkbox" name="test-check" id="test-check-1" value="one" checked="checked">
    <input type="checkbox" name="test-check" id="test-check-1" value="two" >
    <input type="checkbox" name="test-check" id="test-check-1" value="three">
</div>
<div id="d2" class="test-dom father">
    <select id="s1">
      <option>Single</option>
      <option selected="selected">Single2</option>
    </select>
</div>
<div id="d3" class="test-dom father">
    <select id="s2" multiple="multiple">
      <option selected="selected">Multi</option>
      <option selected="selected">Multi2</option>
    </select>
</div>
<div id="d4" class="test-dom father">
    <meter id="m1" min="0" low="60" high="80" max="100" value="65"></meter>
</div>
`));
        const checkbox = divs[0].children as any as NodeListOf<HTMLInputElement>;
        const $checkbox = $(checkbox);
        expect(checkbox[0].value).toBe('one');
        expect(checkbox[1].value).toBe('two');
        expect(checkbox[2].value).toBe('three');
        $checkbox.val('on');
        expect(checkbox[0].value).toBe('on');
        expect(checkbox[1].value).toBe('on');
        expect(checkbox[2].value).toBe('on');
        const select = divs[1].firstElementChild as HTMLSelectElement;
        const $select = $(select);
        expect(select.value).toBe('Single2');
        $select.val(['invalid', 'Single']);
        expect(select.value).toBe('');
        $select.val('Single');
        expect(select.value).toBe('Single');
        const mselect = divs[2].firstElementChild as HTMLSelectElement;
        const $mselect = $(mselect);
        expect(mselect.value).toBe('Multi');
        $mselect.val('Multi2');
        expect(mselect.value).toBe('Multi2');
        expect($mselect.val()).toEqual(['Multi2']);
        $mselect.val(['Multi', 'Multi2']);
        expect(mselect.value).toBe('Multi');
        expect($mselect.val()).toEqual(['Multi', 'Multi2']);
        const meter = divs[3].firstElementChild as HTMLMeterElement;
        const $meter = $(meter);
        expect(meter.value).toBe(65);
        $meter.val(11);
        expect(meter.value).toBe(11);
        const $document = $(document);
        expect(() => $document.val('hoge' as any)).not.toThrow();
        const $div = $(divs[0]);
        expect(() => $div.val('hoge' as any)).not.toThrow();
    });

    it('check DOM#data(), get value', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" data-test="hoge" data-test-bool="false" data-test-number="100">
    <p class="test-dom-child"></p>
</div>
<div id="d2" class="test-dom">
    <span class="test-dom-child"></span>
</div>
<div id="d3" class="test-dom">
    <hr class="test-dom-child"></hr>
</div>`));

        const $dom = $('.test-dom');
        const allData = $dom.data() as any;
        expect(allData).toBeDefined();
        expect(allData.test).toBeDefined();
        expect(allData.test).toBe('hoge');
        expect(allData.testBool).toBeDefined();
        expect(allData.testBool).toBe(false);
        expect(allData.testNumber).toBeDefined();
        expect(allData.testNumber).toBe(100);
        expect(Object.keys(allData).length).toBe(3);

        expect($dom.data('test')).toBe('hoge');
        expect($dom.data('test-bool')).toBe(false);
        expect($dom.data('test-number')).toBe(100);
        expect($dom.data('fuga')).toBeUndefined();

        const $window = $(window);
        expect($window.data()).toBeUndefined();
    });

    it('check DOM#data(), set value', () => {
        const divs = prepareTestElements(testee(`
<div id="d1" class="test-dom" data-test="hoge" data-test-bool="false" data-test-number="100">
    <p class="test-dom-child"></p>
</div>
<div id="d2" class="test-dom">
    <span class="test-dom-child"></span>
</div>
<div id="d3" class="test-dom">
    <hr class="test-dom-child"></hr>
</div>`));

        expect(Object.keys(divs[0].dataset).length).toBe(3);
        expect(divs[0].dataset.test).toBe('hoge');
        expect(Object.keys(divs[1].dataset).length).toBe(0);
        expect(Object.keys(divs[2].dataset).length).toBe(0);

        const $dom = $('.test-dom');
        $dom.data('test', 'fuga');
        expect(Object.keys(divs[0].dataset).length).toBe(3);
        expect(divs[0].dataset.test).toBe('fuga');
        expect(Object.keys(divs[1].dataset).length).toBe(1);
        expect(divs[1].dataset.test).toBe('fuga');
        expect(Object.keys(divs[2].dataset).length).toBe(1);
        expect(divs[2].dataset.test).toBe('fuga');

        $dom.data('test-bool2', true);
        expect(Object.keys(divs[0].dataset).length).toBe(4);
        expect(divs[0].dataset.testBool2).toBe('true');
        expect(Object.keys(divs[1].dataset).length).toBe(2);
        expect(divs[1].dataset.testBool2).toBe('true');
        expect(Object.keys(divs[2].dataset).length).toBe(2);
        expect(divs[2].dataset.testBool2).toBe('true');
        expect($dom.attr('data-test-bool2')).toBe('true');

        const obj = { prop: [100, true, 200] };
        $dom.data('test-object', obj);
        expect(Object.keys(divs[0].dataset).length).toBe(5);
        expect(Object.keys(divs[1].dataset).length).toBe(3);
        expect(Object.keys(divs[2].dataset).length).toBe(3);
        expect(divs[2].dataset.testObject).toBe('{"prop":[100,true,200]}');
        expect($dom.data('test-object')).toEqual(obj);

        const $document = $(document);
        expect(() => $document.data('hoge', 'fuga')).not.toThrow();
        expect(() => $dom.data(undefined as any, 333)).not.toThrow();
        expect(() => $dom.data('--', 999)).not.toThrow();

        divs.push(window as any);
        const $invalid = $(divs);
        expect(() => $invalid.data('test', 'hoge')).not.toThrow();
        expect(divs[0].dataset.test).toBe('hoge');
    });

    it('check DOM#removeData(), set value', () => {
        const divs = prepareTestElements(testee(`
<div id="d1" class="test-dom" data-test="hoge" data-test-bool="false" data-test-number="100">
    <p class="test-dom-child"></p>
</div>
<div id="d3" class="test-dom" data-test="fuga">
    <hr class="test-dom-child"></hr>
</div>`));

        expect(Object.keys(divs[0].dataset).length).toBe(3);
        expect(divs[0].dataset.test).toBe('hoge');
        expect(Object.keys(divs[1].dataset).length).toBe(1);
        expect(divs[1].dataset.test).toBe('fuga');

        const $dom = $('.test-dom');
        $dom.removeData('test-object');
        expect(Object.keys(divs[0].dataset).length).toBe(3);
        expect(Object.keys(divs[1].dataset).length).toBe(1);

        $dom.removeData('test-bool');
        expect(Object.keys(divs[0].dataset).length).toBe(2);
        expect(Object.keys(divs[1].dataset).length).toBe(1);

        $dom.removeData(['test', 'test-bool', 'test-number']);
        expect(Object.keys(divs[0].dataset).length).toBe(0);
        expect(Object.keys(divs[1].dataset).length).toBe(0);

        const $document = $(document);
        expect(() => $document.removeData('hoge')).not.toThrow();
        divs.push(window as any);
        const $invalid = $(divs);
        expect(() => $invalid.removeData(['test', 'hoge'])).not.toThrow();
    });

    it('check mixedCollection', () => {
        const $dom = mixedCollection().add(window).add(document);
        expect(() => $dom.addClass('hoge')).not.toThrow();
        expect(() => $dom.removeClass('hoge')).not.toThrow();
        expect(() => $dom.toggleClass('hoge', true)).not.toThrow();
        expect(() => $dom.attr('fuga', true)).not.toThrow();
        expect(() => $dom.removeAttr('fuga')).not.toThrow();
    });
});
