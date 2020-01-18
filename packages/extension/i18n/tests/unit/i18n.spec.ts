/* eslint-disable @typescript-eslint/no-explicit-any */

import { i18n } from '@cdp/extension-i18n';

// check compile: `$ npm run compile:test`
// import { i18n } from '../../dist/extension-i18n';

describe('extention-i18n spec', () => {
    it('check instance', () => {
        expect(i18n.context).toBeDefined();
    });
});

