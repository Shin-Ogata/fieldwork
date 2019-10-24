import { deepEqual, deepCopy } from '@cdp/core-utils';
import {
    toBinaryString,
    fromBinaryString,
    fromHexString,
    toHexString,
    blobToBuffer,
    blobToBinary,
    blobToDataURL,
    blobToText,
    blobToBase64,
    bufferToBlob,
    bufferToBinary,
    bufferToDataURL,
    bufferToText,
    bufferToBase64,
    binaryToBlob,
    binaryToBuffer,
    binaryToDataURL,
    binaryToText,
    binaryToBase64,
    base64ToBlob,
    base64ToBuffer,
    base64ToBinary,
    base64ToDataURL,
    base64ToText,
    textToBlob,
    textToBuffer,
    textToBinary,
    textToDataURL,
    textToBase64,
    dataURLToBlob,
    dataURLToBuffer,
    dataURLToBinary,
    dataURLToText,
    dataURLToBase64,
} from '@cdp/binary';

describe('binary/converter spec', () => {

    const text   = 'binary/converter テスト';
    const base64 = 'YmluYXJ5L2NvbnZlcnRlciDjg4bjgrnjg4g=';
    const hex    = '62696E6172792F636F6E76657274657220E38386E382B9E38388';
    const buffer = new Uint8Array([98, 105, 110, 97, 114, 121, 47, 99, 111, 110, 118, 101, 114, 116, 101, 114, 32, 227, 131, 134, 227, 130, 185, 227, 131, 136]).buffer;

    it('check binary-string', () => {
        const src = 'test01.バイナリ文字列のチェックです';
        const enc = toBinaryString(src);
        const dec = fromBinaryString(enc);
        expect(dec).toBe(src);
    });

    it('check hex-string', () => {
        const src = 'test02.HEX 文字列のチェックです';
        const bin = new Uint8Array(toBinaryString(src).split('').map(c => c.charCodeAt(0)));
        const convHex = toHexString(bin);
        const convBin = fromHexString(convHex);
        const dec = fromBinaryString(Array.prototype.map.call(convBin, (i: number) => String.fromCharCode(i)).join(''));
        expect(dec).toBe(src);
    });

    it('check blobToXXX()', async (done) => {
        const blob = new Blob([text]);

        const buff = await blobToBuffer(blob);
        expect(deepEqual(buff, buffer)).toBe(true);

        const binary = await blobToBinary(blob);
        const hexStr = toHexString(binary);
        expect(hexStr).toBe(hex);

        const dataURL = await blobToDataURL(blob);
        expect(dataURL).toBe(`data:application/octet-stream;base64,${base64}`);

        const txt = await blobToText(blob);
        expect(txt).toBe(text);

        const b64 = await blobToBase64(blob);
        expect(b64).toBe(base64);

        done();
    });

    it('check bufferToXXX()', async (done) => {
        const buff = deepCopy(buffer);

        const blb = bufferToBlob(buff);
        expect(await blobToText(blb)).toBe(text);

        const binary = bufferToBinary(buff);
        const hexStr = toHexString(binary);
        expect(hexStr).toBe(hex);

        const dataURL = bufferToDataURL(buff);
        expect(dataURL).toBe(`data:application/octet-stream;base64,${base64}`);

        const txt = bufferToText(buff);
        expect(txt).toBe(text);

        const b64 = bufferToBase64(buff);
        expect(b64).toBe(base64);

        done();
    });

    it('check binaryToXXX()', async (done) => {
        const bin = new Uint8Array(buffer);

        const blb = binaryToBlob(bin);
        expect(await blobToText(blb)).toBe(text);

        const buff = binaryToBuffer(bin);
        expect(deepEqual(buff, buffer)).toBe(true);

        const dataURL = binaryToDataURL(bin);
        expect(dataURL).toBe(`data:application/octet-stream;base64,${base64}`);

        const txt = binaryToText(bin);
        expect(txt).toBe(text);

        const b64 = binaryToBase64(bin);
        expect(b64).toBe(base64);

        done();
    });

    it('check base64ToXXX()', async (done) => {
        const b64 = base64;

        const blb = base64ToBlob(b64);
        expect(await blobToText(blb)).toBe(text);

        const buff = base64ToBuffer(b64);
        expect(deepEqual(buff, buffer)).toBe(true);

        const bin = base64ToBinary(b64);
        expect(toHexString(bin)).toBe(hex);

        const dataURL = base64ToDataURL(b64);
        expect(dataURL).toBe(`data:application/octet-stream;base64,${base64}`);

        const txt = base64ToText(b64);
        expect(txt).toBe(text);

        done();
    });

    it('check textToXXX()', async (done) => {
        const txt = text;

        const blb = textToBlob(txt);
        expect(await blobToText(blb)).toBe(text);

        const buff = textToBuffer(txt);
        expect(deepEqual(buff, buffer)).toBe(true);

        const bin = textToBinary(txt);
        expect(toHexString(bin)).toBe(hex);

        const dataURL = textToDataURL(txt);
        expect(dataURL).toBe(`data:text/plain;base64,${base64}`);

        const b64 = textToBase64(txt);
        expect(b64).toBe(base64);

        done();
    });

    it('check dataURLToXXX()', async (done) => {
        const dataURL = `data:application/octet-stream;base64,${base64}`;

        const blb = dataURLToBlob(dataURL);
        expect(await blobToText(blb)).toBe(text);

        const buff = dataURLToBuffer(dataURL);
        expect(deepEqual(buff, buffer)).toBe(true);

        const bin = dataURLToBinary(dataURL);
        expect(toHexString(bin)).toBe(hex);

        const txt = dataURLToText(dataURL);
        expect(txt).toBe(text);

        const b64 = dataURLToBase64(dataURL);
        expect(b64).toBe(base64);

        done();
    });

    it('check advanced', async (done) => {
        const b64 = dataURLToBase64('data:,Hello%2C%20World!');
        const txt = base64ToText(b64);
        expect(txt).toBe('Hello, World!');

        let blb = dataURLToBlob('data:,Hello%2C%20World!');
        expect(await blobToText(blb)).toBe('Hello, World!');

        blb = dataURLToBlob('data:text/html;charset=utf-8,%3Ch1%3EHello%2C%20World!%3C%2Fh1%3E');
        expect(await blobToText(blb)).toBe('<h1>Hello, World!</h1>');

        blb = dataURLToBlob('data:;base64,YmluYXJ5L2NvbnZlcnRlciDjg4bjgrnjg4g=');
        expect(await blobToText(blb)).toBe(text);

        const buff = fromHexString('');
        expect(buff.byteLength).toBe(0);

        expect(() => dataURLToBase64(txt)).toThrow(new Error(`Invalid data-URL: ${txt}`));
        done();
    });
});
