/* eslint-disable block-spacing, @typescript-eslint/no-explicit-any */
import $ from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
} from './tools';

describe('dom/effects spec', () => {
    const testee = $.utils.elementify.bind($.utils);

    afterEach((): void => {
        cleanupTestElements();
    });

    it('template', () => {
        prepareTestElements(testee(`
<div id="d1" class="test-dom">
    <p class="test-dom-child"></p>
</div>`));
        expect($).toBeDefined();
    });
});
