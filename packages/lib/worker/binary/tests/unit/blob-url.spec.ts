import { BlobURL } from '@cdp/binary';

describe('binary/blob-url spec', () => {
    const source = 'テスト';
    const blob = new Blob([source]);

    beforeEach(() => {
        BlobURL.create(blob);
    });

    afterEach(() => {
        BlobURL.clear();
    });

    it('check BlobURL.has()', () => {
        expect(BlobURL.has(blob)).toBe(true);
        expect(BlobURL.has(new Blob(['dummy']))).toBe(false);
    });

    it('check BlobURL.get(automatically create new URL)', () => {
        const url = BlobURL.get(new Blob(['dummy']));
        expect(url).toBeTruthy();
    });

    it('check BlobURL.get(returns unique URL for each Blob)', () => {
        const url1 = BlobURL.get(blob);
        const url2 = BlobURL.get(blob);
        expect(url1).toBe(url2);
    });

    it('check BlobURL.revoke()', () => {
        BlobURL.revoke(blob);
        expect(BlobURL.has(blob)).toBe(false);
        expect(() => BlobURL.revoke(new Blob(['dummy']))).not.toThrow();
    });
});
