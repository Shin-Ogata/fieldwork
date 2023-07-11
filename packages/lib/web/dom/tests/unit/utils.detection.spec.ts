/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import { sleep } from '@cdp/core-utils';
import { dom as $ } from '@cdp/dom';
import {
    prepareTestElements as prepareTestDivs,
    cleanupTestElements as cleanup,
} from './tools';

describe('dom/utils detection spec', () => {
    const { detectify, undetectify } = $.utils; // eslint-disable-line @typescript-eslint/unbound-method

    const testee = $.utils.elementify.bind($.utils);
    let count: number;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const onCallback = (...args: any[]): void => {
        count++;
        // console.log(`received: ${JSON.stringify([...args])} \n`);
    };

    beforeEach(() => {
        count = 0;
    });

    afterEach((): void => {
        cleanup();
        undetectify();
    });

    it('check accessible', () => {
        expect(detectify).toBeDefined();
        expect(typeof detectify).toBe('function');
        expect(undetectify).toBeDefined();
        expect(typeof undetectify).toBe('function');
    });

    it('check connect handle event, from document', async () => {
        prepareTestDivs(testee(`<div id="d1" class="test-dom"></div>`));

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        const el = $('<div class="testee"></div>')[0];

        el.addEventListener('connected', stub.onCallback);
        el.addEventListener('disconnected', stub.onCallback);

        detectify(el);

        $dom.append(el);
        await sleep(0);
        $dom.children().remove();
        await sleep(0);

        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(2);

        undetectify(el);
    });

    it('check connect handle event, from ownerDocument', async () => {
        prepareTestDivs(testee(`<div id="d1" class="test-dom"><div class="testee"></div></div>`));

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        const el = $dom.find('.testee')[0];

        el.addEventListener('disconnected', stub.onCallback);

        detectify(el);

        $dom.children().remove();
        await sleep(0);

        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);
    });

    it('check connect handle event, nested case & specified listener root', async () => {
        prepareTestDivs(testee(`
            <div id="d1" class="test-dom">
                <div class="parent">
                    <div class="testee"></div>
                </div>
            </div>
        `));

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        const el = $dom.find('.testee')[0];

        el.addEventListener('disconnected', stub.onCallback);

        detectify(el, $dom[0]);

        $dom.find('.parent').remove();
        await sleep(0);

        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);
    });

    it('check multiple observ', async () => {
        prepareTestDivs(testee(`
            <div id="d1" class="test-dom">
                <div class="parent">
                    <div id="d2" class="testee"></div>
                    <div id="d3" class="testee"></div>
                </div>
            </div>
        `));

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        const $el = $dom.find('.testee');
        const el1 = $el[0];
        const el2 = $el[1];

        el1.addEventListener('disconnected', stub.onCallback);
        el2.addEventListener('disconnected', stub.onCallback);

        detectify(el1);
        detectify(el2);

        $dom.find('.parent').remove();
        await sleep(0);

        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(2);

        undetectify(el1);
        undetectify(el2);
    });

    it('check no thrown fron undetectify w/ unobserved target', async () => {
        prepareTestDivs(testee(`
            <div id="d1" class="test-dom">
                <div class="parent">
                    <div class="testee"></div>
                </div>
            </div>
        `));

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const $dom = $('#d1');
        const el = $dom.find('.testee')[0];

        el.addEventListener('disconnected', stub.onCallback);

        detectify(el, $dom[0]);
        expect(() => undetectify($dom[0])).not.toThrow();

        $dom.find('.parent').remove();
        await sleep(0);

        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);
    });
});
