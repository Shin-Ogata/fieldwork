import {
    post,
    statusAddRef,
    statusRelease,
    statusScope,
    isStatusIn,
} from '@cdp/core-utils';

describe('utils/status spec', () => {
    it('check instance', () => {
        expect(statusAddRef).toBeDefined();
        expect(statusRelease).toBeDefined();
        expect(statusScope).toBeDefined();
        expect(isStatusIn).toBeDefined();
    });

    it('standard usage', () => {
        expect(isStatusIn('test:status')).toBe(false);

        let refcount = statusAddRef('test:status');
        expect(refcount).toBe(1);
        expect(isStatusIn('test:status')).toBe(true);

        refcount = statusAddRef('test:status');
        expect(refcount).toBe(2);
        expect(isStatusIn('test:status')).toBe(true);

        refcount = statusAddRef('test:status');
        expect(refcount).toBe(3);
        expect(isStatusIn('test:status')).toBe(true);

        refcount = statusRelease('test:status');
        expect(refcount).toBe(2);
        expect(isStatusIn('test:status')).toBe(true);

        refcount = statusRelease('test:status');
        expect(refcount).toBe(1);
        expect(isStatusIn('test:status')).toBe(true);

        refcount = statusRelease('test:status');
        expect(refcount).toBe(0);
        expect(isStatusIn('test:status')).toBe(false);

        refcount = statusRelease('test:status');
        expect(refcount).toBe(0);
        expect(isStatusIn('test:status')).toBe(false);
    });

    it('check statusScope', async () => {
        expect(isStatusIn('test:statusScope')).toBe(false);
        const val = await statusScope('test:statusScope', () => post(() => 'ok'));
        expect(isStatusIn('test:statusScope')).toBe(false);
        expect(val).toBe('ok');
    });
});
