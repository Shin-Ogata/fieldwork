import {
    defaultSync,
    dataSyncNULL,
    dataSyncREST,
    dataSyncSTORAGE,
} from '@cdp/data-sync';

describe('data-sync/settings spec', () => {

    afterEach(() => {
        defaultSync(dataSyncNULL);
    });

    it('check defaultSync()', () => {
        const current = defaultSync();
        expect(current).toBe(dataSyncNULL);
        expect(current.kind).toBe('null');

        let old = defaultSync(dataSyncREST);
        expect(old).toBe(dataSyncNULL);
        expect(old.kind).toBe('null');

        old = defaultSync(dataSyncSTORAGE);
        expect(old).toBe(dataSyncREST);
        expect(old.kind).toBe('rest');

        old = defaultSync(dataSyncNULL);
        expect(old).toBe(dataSyncSTORAGE);
        expect(old.kind).toBe('storage');
    });
});
