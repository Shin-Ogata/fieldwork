import { noop } from '@cdp/core-utils';
import { CancelToken } from '@cdp/promise';
import {
    readAsArrayBuffer,
    readAsDataURL,
    readAsText,
} from '@cdp/binary';

describe('binary/blob-reader spec', () => {

    const source = 'テスト';
    const blob = new Blob([source]);
    const binStr = unescape(encodeURIComponent(source));

    it('check readAsArrayBuffer()', async (done) => {
        const arrBuf = await readAsArrayBuffer(blob);
        const result = new Uint8Array(arrBuf);
        const expected = new Uint8Array([...binStr].map(s => s.charCodeAt(0)));
        expect(result).toEqual(expected);
        done();
    });

    it('check readAsDataURL()', async (done) => {
        const result = await readAsDataURL(blob);
        expect(result.endsWith(btoa(binStr))).toBe(true);
        done();
    });

    it('check readAsText()', async (done) => {
        const result = await readAsText(blob);
        expect(result).toBe(source);
        done();
    });

    it('check readAsArrayBuffer() w/ cancel', async (done) => {
        const cancelSource = CancelToken.source();
        const promise = readAsArrayBuffer(blob, { cancel: cancelSource.token, onprogress: noop });
        cancelSource.cancel('cancel');
        await expectAsync(promise).toBeRejected();
        done();
    });
});
