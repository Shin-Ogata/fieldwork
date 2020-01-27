/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import {
    getWebDirectory,
    webRoot,
    toUrl,
} from '@cdp/environment';

describe('web spec', () => {
    it('check instance', () => {
        expect(getWebDirectory).toBeDefined();
        expect(webRoot).toBeDefined();
        expect(toUrl).toBeDefined();
    });

    it('check getWebDirectory', () => {
        expect(/^http:\/\/localhost:7357\/[\d]+\/.temp\/testem\/$/.test(webRoot)).toBe(true);
        expect(getWebDirectory('http://hogehoge.com/app/')).toBeDefined('http://hogehoge.com/app/');
        expect(getWebDirectory('http://hogehoge.com/app/index.html')).toBeDefined('http://hogehoge.com/app/');
        expect(getWebDirectory('http://hogehoge.com/app/index.html#L80')).toBeDefined('http://hogehoge.com/app/');
        expect(getWebDirectory('/app/index.html#L80')).toBeDefined('/app/');
        expect(getWebDirectory('invalid')).toBeDefined('');
        expect(getWebDirectory(undefined as any)).toBeDefined('');
    });

    it('check toUrl', () => {
        expect(toUrl('/res/data/collection.json')).toBe(`${webRoot}res/data/collection.json`);
        expect(toUrl('res/data/collection.json')).toBe(`${webRoot}res/data/collection.json`);
        expect(toUrl(null as any)).toBe(`${webRoot}`);
    });
});
