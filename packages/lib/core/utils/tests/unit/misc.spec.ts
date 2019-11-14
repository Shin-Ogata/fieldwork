/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method */

import {
    post,
    noop,
    sleep,
    escapeHTML,
    toTypedData,
    fromTypedData,
    dropUndefined,
    restoreNil,
    capitalize,
    decapitalize,
    camelize,
    classify,
    underscored,
    dasherize,
} from '@cdp/core-utils';

describe('utils/misc spec', () => {
    it('check post()', async () => {
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

    it('check noop()', () => {
        const hook = { noop };
        spyOn(hook, 'noop').and.callThrough();
        hook.noop();
        expect(hook.noop).toHaveBeenCalled();
    });

    it('check sleep()', async (done) => {
        const start = Date.now();
        await sleep(100);
        expect(Date.now() - start).toBeGreaterThanOrEqual(100);
        done();
    });

    it('check escapeHTML()', () => {
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

    it('check toTypedData()', () => {
        expect(toTypedData('true')).toBe(true);
        expect(toTypedData('false')).toBe(false);
        expect(toTypedData('null')).toBe(null);
        expect(toTypedData('100')).toBe(100);
        expect(toTypedData('2.5')).toBe(2.5);
        expect(toTypedData('hoge')).toBe('hoge');
        expect(toTypedData('{ "prop": "hoge" }')).toEqual({ prop: 'hoge' });
        expect(toTypedData('99%')).toBe('99%');
    });

    it('check fromTypedData()', () => {
        expect(fromTypedData(true)).toBe('true');
        expect(fromTypedData(false)).toBe('false');
        expect(fromTypedData(null)).toBe('null');
        expect(fromTypedData(100)).toBe('100');
        expect(fromTypedData(2.5)).toBe('2.5');
        expect(fromTypedData('hoge')).toBe('hoge');
        expect(fromTypedData({ prop: 'hoge' })).toEqual('{"prop":"hoge"}');
        expect(fromTypedData('99%')).toBe('99%');
        expect(fromTypedData(undefined)).toBeUndefined();
    });

    it('check dropUndefined()', () => {
        expect(dropUndefined('str')).toBe('str');
        expect(dropUndefined(100)).toBe(100);
        expect(dropUndefined(true)).toBe(true);
        expect(dropUndefined({ hoge: 'hoge' })).toEqual({ hoge: 'hoge' });
        expect(dropUndefined(null)).toBe(null);
        expect(dropUndefined(undefined)).toBe(null);
    });

    it('check dropUndefined() /w nilSelialize', () => {
        expect(dropUndefined('str', true)).toBe('str');
        expect(dropUndefined(100, true)).toBe(100);
        expect(dropUndefined(true, true)).toBe(true);
        expect(dropUndefined({ hoge: 'hoge' }, true)).toEqual({ hoge: 'hoge' });
        expect(dropUndefined(null, true)).toBe('null');
        expect(dropUndefined(undefined, true)).toBe('undefined');
    });

    it('check restoreNil()', () => {
        expect(restoreNil('str')).toBe('str');
        expect(restoreNil(100)).toBe(100);
        expect(restoreNil(true)).toBe(true);
        expect(restoreNil({ hoge: 'hoge' })).toEqual({ hoge: 'hoge' });
        expect(restoreNil(null)).toBe(null);
        expect(restoreNil(undefined)).toBe(undefined);
        expect(restoreNil('null')).toBe(null);
        expect(restoreNil('undefined')).toBe(undefined);
    });

    it('check capitalize()', () => {
        expect(capitalize('foo Bar')).toBe('Foo Bar');
        expect(capitalize('FOO Bar', true)).toBe('Foo bar');
    });

    it('check decapitalize()', () => {
        expect(decapitalize('Foo Bar')).toBe('foo Bar');
    });

    it('check camelize()', () => {
        expect(camelize('moz-transform')).toBe('mozTransform');
        expect(camelize('-moz-transform')).toBe('MozTransform');
        expect(camelize('_moz_transform')).toBe('MozTransform');
        expect(camelize('Moz-transform')).toBe('MozTransform');
        expect(camelize('-moz-transform', true)).toBe('mozTransform');
        expect(camelize('__--__  _ _ - - _')).toBe('');
    });

    it('check classify()', () => {
        expect(classify('some_class_name')).toBe('SomeClassName');
    });

    it('check underscored()', () => {
        expect(underscored('MozTransform')).toBe('moz_transform');
    });

    it('check dasherize()', () => {
        expect(dasherize('MozTransform')).toBe('-moz-transform');
        expect(dasherize('backgroundColor')).toBe('background-color');
        expect(dasherize('--css-varialble')).toBe('--css-varialble');
    });
});
