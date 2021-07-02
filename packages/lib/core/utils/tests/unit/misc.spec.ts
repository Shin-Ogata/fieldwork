/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/unbound-method,
 */

import {
    post,
    noop,
    sleep,
    throttle,
    debounce,
    once,
    escapeHTML,
    unescapeHTML,
    toTypedData,
    fromTypedData,
    dropUndefined,
    restoreNil,
    luid,
    randomInt,
    isChancelLikeError,
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

    it('check sleep()', async () => {
        const start = Date.now();
        await sleep(100);
        expect(Date.now() - start).toBeGreaterThanOrEqual(100);
    });

    it('check throttle()', async () => {
        let count = 0;
        const exec = (): number => {
            count++;
            return count;
        };
        const throttled = throttle(exec, 50);
        for (let i = 0; i < 5; i++) {
            throttled();
            await sleep(10);
        }
        expect(count).toBe(2);
    });

    it('check throttle({ leading: false })', async () => {
        let count = 0;
        const exec = (): number => {
            count++;
            return count;
        };
        const throttled = throttle(exec, 50, { leading: false });
        for (let i = 0; i < 5; i++) {
            throttled();
            await sleep(10);
        }
        expect(count).toBe(1);
    });

    it('check throttle() w/ cancel', async () => {
        let count = 0;
        const exec = (): number => {
            count++;
            return count;
        };
        const throttled = throttle(exec, 10);
        for (let i = 0; i < 5; i++) {
            throttled.cancel();
            throttled();
            await sleep(50);
        }
        expect(count).toBe(5);
    });

    it('check throttle() w/ nest call', async () => {
        let count = 0;
        const exec = (): void => {
            count++;
            throttled(); // eslint-disable-line
        };
        const throttled = throttle(exec, 20);
        for (let i = 0; i < 5; i++) {
            throttled();
            await sleep(10);
        }
        expect(count).toBe(3);
    });

    it('check throttle() for coverage', async () => {
        let count = 0;
        const exec = (): number => {
            count++;
            return count;
        };
        const throttled = throttle(exec, 100);

        const orgDateNow = Date.now;

        throttled();
        await sleep(10);
        throttled();
        Date.now = () => { return 0; };
        throttled();
        await sleep(10);

        expect(count).toBe(2);

        Date.now = orgDateNow;
    });

    it('check debounce()', async () => {
        let value = 0;
        const exec = (lhs: number, rhs: number): number => {
            value += (lhs + rhs);
            return value;
        };
        const debounced = debounce(exec, 50);
        for (let i = 0; i < 5; i++) {
            debounced(i, i + 1);
        }

        await sleep(50);

        expect(value).toBe(9);
    });

    it('check debounce(immediate)', async () => {
        let value = 0;
        const exec = (lhs: number, rhs: number): number => {
            value += (lhs + rhs);
            return value;
        };
        const debounced = debounce(exec, 50, true);
        for (let i = 0; i < 5; i++) {
            debounced(i, i + 1);
        }

        await sleep(50);

        expect(value).toBe(1);
    });

    it('check debounce() w/ cancel', async () => {
        let value = 0;
        const exec = (lhs: number, rhs: number): number => {
            value += (lhs + rhs);
            return value;
        };
        const debounced = debounce(exec, 50);
        for (let i = 0; i < 5; i++) {
            debounced(i, i + 1);
            debounced.cancel();
        }

        await sleep(50);

        expect(value).toBe(0);
    });

    it('check once()', () => {
        let value = 0;
        const exec = (lhs: number, rhs: number): number => {
            value += (lhs + rhs);
            return value;
        };
        const oncefy = once(exec);
        for (let i = 0; i < 5; i++) {
            oncefy(i, i + 1);
        }

        expect(value).toBe(1);
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

    it('check unescapeHTML()', () => {
        const backquote = '`';
        const conv = `& < > ' " ${backquote}`;
        expect(unescapeHTML('&amp; &lt; &gt; &#39; &quot; &#x60;')).toBe(conv);

        const src2 = 'hogehoge';
        expect(unescapeHTML(src2)).toBe('hogehoge');

        const src3 = null;
        expect(unescapeHTML(src3)).toBe('');

        const src4 = undefined;
        expect(unescapeHTML(src4)).toBe('');

        const src5 = '';
        expect(unescapeHTML(src5)).toBe('');

        const src6 = Symbol.iterator;
        expect(unescapeHTML(src6)).toBe('');
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

    it('check dropUndefined() w/ nilSelialize', () => {
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

    it('check luid()', (): void => {
        const id1 = luid();
        expect(id1).not.toBe(luid());

        const id2 = luid('test:');
        expect(id2.startsWith('test:')).toBe(true);

        const id3 = luid('test:', 8);
        expect(id3.startsWith('test:00')).toBe(true);
    });

    it('check randomInt()', (): void => {
        const val1 = randomInt(10);
        expect(val1).toBeGreaterThanOrEqual(0);
        expect(val1).toBeLessThanOrEqual(10);

        const val2 = randomInt(10, 20);
        expect(val2).toBeGreaterThanOrEqual(10);
        expect(val2).toBeLessThanOrEqual(20);
    });

    it('check isChancelLikeError', () => {
        const e1 = new Error('abort');
        const e2 = new Error('Abort');
        const e3 = new Error('cancel');
        const e4 = new Error('Cancel');
        const e5 = new Error('ABORT operation');
        const e6 = new Error('Cancel operation');
        const e7 = new Error('operation aborted.');
        expect(isChancelLikeError(e1)).toBeTruthy();
        expect(isChancelLikeError(e2)).toBeTruthy();
        expect(isChancelLikeError(e3)).toBeTruthy();
        expect(isChancelLikeError(e4)).toBeTruthy();
        expect(isChancelLikeError(e5)).toBeTruthy();
        expect(isChancelLikeError(e6)).toBeTruthy();
        expect(isChancelLikeError(e7)).toBeTruthy();

        expect(isChancelLikeError(undefined)).toBeFalsy();
        expect(isChancelLikeError(null)).toBeFalsy();
        expect(isChancelLikeError(-1)).toBeFalsy();
        expect(isChancelLikeError(Symbol('hoge'))).toBeFalsy();
        expect(isChancelLikeError([])).toBeFalsy();
        expect(isChancelLikeError({})).toBeFalsy();
        expect(isChancelLikeError({ message: 'abort' })).toBeTruthy();

        expect(isChancelLikeError('abort')).toBeTruthy();
        expect(isChancelLikeError('Cancel')).toBeTruthy();
        expect(isChancelLikeError('error')).toBeFalsy();
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
