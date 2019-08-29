/* eslint-disable block-spacing, @typescript-eslint/no-explicit-any */
import $ from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
} from './tools';

describe('dom events spec', () => {
    afterEach((): void => {
        cleanupTestElements();
    });

    it('template', () => {
        expect($).toBeDefined();
    });
});
