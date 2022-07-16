/*
 eslint-disable
    @typescript-eslint/no-explicit-any
 */

import {
    registerPage,
    AppContext,
} from '@cdp/app';

describe('context spec', () => {

    it('check instance', () => {
        expect(AppContext).toBeDefined();
        expect(registerPage).toBeDefined();
    });

});
