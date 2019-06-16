/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    post,
    noop,
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
});
