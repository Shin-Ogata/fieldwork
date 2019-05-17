import { isNil } from '@cdp/core-utils';
//import { isNil } from './_testee';

describe('utils/types spec', () => {
    beforeEach(() => {
        // noop.
    });
    afterEach(() => {
        // noop.
    });

    it('check isNil', () => {
        let val1 = undefined;
        expect(isNil(val1)).toBeTruthy();
        val1 = 'test';
        expect(isNil(val1)).toBeFalsy();
    });
});
