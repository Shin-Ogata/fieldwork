/*
 eslint-disable
    @typescript-eslint/no-explicit-any
 */

import {
    webRoot,
    getWebDirectory,
    toUrl,
} from '@cdp/web-utils';

describe('web-root spec', () => {

    it('check instance', () => {
        expect(getWebDirectory).toBeDefined();
        expect(webRoot).toBeDefined();
        expect(toUrl).toBeDefined();
    });

    it('check getWebDirectory', () => {
        expect(/^http:\/\/localhost:7357\/[\d]+\/.temp\/testem\/$/.test(webRoot)).toBe(true);
        expect(getWebDirectory('http://hogehoge.com/app/')).toBe('http://hogehoge.com/app/');
        expect(getWebDirectory('http://hogehoge.com/app/index.html')).toBe('http://hogehoge.com/app/');
        expect(getWebDirectory('http://hogehoge.com/app/index.html#L80')).toBe('http://hogehoge.com/app/');
        expect(getWebDirectory('/app/index.html#L80')).toBe('/app/');
        expect(getWebDirectory('invalid')).toBe('');
        expect(getWebDirectory(undefined as any)).toBe('');
    });

    it('check toUrl', () => {
        expect(toUrl('/res/data/collection.json')).toBe(`${webRoot}res/data/collection.json`);
        expect(toUrl('res/data/collection.json')).toBe(`${webRoot}res/data/collection.json`);
        expect(toUrl('http://hogehoge.com/app/index.html#L80')).toBe('http://hogehoge.com/app/index.html#L80');
        expect(toUrl(null as any)).toBe(`${webRoot}`);
    });

});
