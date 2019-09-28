/* eslint-disable @typescript-eslint/no-explicit-any */

import { settings, ajax } from '@cdp/ajax';

/* compile check
(async () => {
    const hoge0 = await ajax('aaa', new Request('aaa'));
    const hoge1 = await ajax('aaa', { dataType: 'text' });
    const hoge2 = await ajax('aaa', { dataType: 'json' });
    const hoge3 = await ajax<{ prop: number; }>('aaa', { dataType: 'json' });
    const hoge4 = await ajax('aaa', { dataType: 'arrayBuffer' });
    const hoge5 = await ajax('aaa', { dataType: 'blob' });
    const hoge6 = await ajax('aaa', { dataType: 'stream' });
    const hoge7 = await ajax('aaa', { dataType: 'response' });
//  const hoge8 = await ajax<{ prop: number; }>('aaa', { dataType: 'text' }); // error
    const hoge9 = await ajax<{ prop: number; }>('aaa', {}); // no-error 注意.
})();
*/

describe('ajax/ajax spec', () => {

    it('template', async (done) => {
        expect(settings.timeout).toBeUndefined();
        await Promise.resolve();
        done();
    });
});
