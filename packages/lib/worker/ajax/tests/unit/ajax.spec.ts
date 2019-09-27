/* eslint-disable @typescript-eslint/no-explicit-any */

import { settings } from '@cdp/ajax';

describe('ajax/ajax spec', () => {

    it('template', async (done) => {
        expect(settings.timeout).toBeUndefined();
        await Promise.resolve();
        done();
    });
});
