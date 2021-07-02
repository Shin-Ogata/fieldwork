/* eslint-disable
    block-spacing,
    @typescript-eslint/no-explicit-any,
*/

import { dom as $ } from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
    mixedCollection,
    wait,
} from './tools';

describe('dom/effects spec', () => {
    const testee = $.utils.elementify.bind($.utils);

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check DOM#animate()', async () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom" style="position: absolute; width: 10px; height: 10px;"></div>
<div id="d2" class="test-dom" style="position: absolute; width: 10px; height: 10px;"></div>
<div id="d3" class="test-dom" style="position: absolute; width: 10px; height: 10px;"></div>
`));
        const $dom = $('.test-dom');
        const contexts = $dom.animate([{ opacity: 1 }, { opacity: 0.5 }], 100);
        contexts.finished.then(ctx => ctx.dom.css('opacity', '0.5'));
        await wait(150);
        expect(contexts.animations.size).toBe(3);
        expect([...contexts.animations.values()][0].playState).toBe('finished');
        expect([...contexts.animations.values()][1].playState).toBe('finished');
        expect([...contexts.animations.values()][2].playState).toBe('finished');
        expect($dom.css('opacity')).toBe('0.5');
    });

    it('check DOM#cancel()', async () => {
        prepareTestElements(testee(`<div id="d1" class="test-dom" style="position: absolute; width: 10px; height: 10px;"></div>`));
        const $dom = $('.test-dom');
        // NOTE: 塗りつぶしモードはスコアが高いまま永続化されるので finished で値を入れる代価の方式が推奨されている
        // https://developer.mozilla.org/en-US/docs/Web/API/EffectTiming/fill#Alternatives_to_fill_modes
        const contexts = $dom.animate([{ opacity: 1 }, { opacity: 0.5 }], { duration: 100, fill: 'forwards' });
        contexts.finished.catch((e: DOMException) => expect(e.name).toBe('AbortError'));
        $dom.cancel();
        await wait(150);
        expect([...contexts.animations.values()][0].playState).toBe('idle');
        expect($dom.css('opacity')).toBe('1');
    });

    it('check DOM#finish()', async () => {
        prepareTestElements(testee(`<div id="d1" class="test-dom" style="position: absolute; width: 10px; height: 10px;"></div>`));
        const $dom = $('.test-dom');
        const contexts = $dom.animate([{ opacity: 1 }, { opacity: 0.5 }], { duration: 100, fill: 'forwards' });
        contexts.finished.catch((e: DOMException) => expect(e.name).toBe('AbortError'));
        $dom.finish();
        await wait(150);
        expect([...contexts.animations.values()][0].playState).toBe('finished');
        expect($dom.css('opacity')).toBe('0.5');

        // キャンセル
        $dom.cancel();
        expect([...contexts.animations.values()][0].playState).toBe('idle');
        expect($dom.css('opacity')).toBe('1');
    });

    it('check mixedCollection', async () => {
        const $dom = mixedCollection().add(window).add(document);
        expect(() => $(window).animate([{ opacity: 1 }, { opacity: 0.5 }], { duration: 100 })).not.toThrow();
        expect(() => $(document).animate([{ opacity: 1 }, { opacity: 0.5 }], { duration: 100 })).not.toThrow();
        expect(() => $(window).cancel()).not.toThrow();
        expect(() => $(document).finish()).not.toThrow();
        expect(() => $dom.animate([{ opacity: 1 }, { opacity: 0.5 }], { duration: 100 })).not.toThrow();
        await wait(150);
        expect(() => $dom.finish()).not.toThrow();
        expect(() => $dom.cancel()).not.toThrow();
    });
});
