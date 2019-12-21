/* eslint-disable no-new-wrappers, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { STATUS, check } from '@cdp/fs-storage';

describe('storage/attributes spec', () => {

    it('check template', () => {
        expect(STATUS).toBe('TODO');
        expect(check('aaa')).toBe(false);
    });

    //it('check WebStorage#kind()', () => {
    //    expect(_storage.kind).toBe('web:local-storage');
    //});

});
