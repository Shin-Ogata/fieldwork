/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method */

import {
    post,
    noop,
    escapeHTML,
} from '@cdp/core-utils';

describe('utils/misc spec', () => {
    it('check post', async () => {
        let resolver: any;
        const promise = new Promise((resolve) => { resolver = resolve; });
        let step = 0;
        const stub = {
            postee(): void {
                step++;
                resolver();
            },
        };
        spyOn(stub, 'postee').and.callThrough();

        post(stub.postee);
        expect(step).toBe(0);
        expect(stub.postee).not.toHaveBeenCalled();

        await promise;

        expect(step).toBe(1);
        expect(stub.postee).toHaveBeenCalled();
    });

    it('check noop', () => {
        const hook = { noop };
        spyOn(hook, 'noop').and.callThrough();
        hook.noop();
        expect(hook.noop).toHaveBeenCalled();
    });

    it('check escapeHTML', () => {
        const backquote = '`';
        const src = `& < > ' " ${backquote}`;
        expect(escapeHTML(src)).toBe('&amp; &lt; &gt; &#39; &quot; &#x60;');

        const src2 = 'hogehoge';
        expect(escapeHTML(src2)).toBe('hogehoge');

        const src3 = null;
        expect(escapeHTML(src3)).toBe('');

        const src4 = undefined;
        expect(escapeHTML(src4)).toBe('');

        const src5 = '';
        expect(escapeHTML(src5)).toBe('');

        const src6 = Symbol.iterator;
        expect(escapeHTML(src6)).toBe('');
    });
});
