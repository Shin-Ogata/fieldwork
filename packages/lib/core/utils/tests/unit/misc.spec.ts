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
    scheduler,
    escapeHTML,
    unescapeHTML,
    toTypedData,
    fromTypedData,
    dropUndefined,
    restoreNullish,
    luid,
    randomInt,
    isCancelLikeError,
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

        void post(stub.postee);
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
        const throttled = throttle(exec, 40);
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
        const throttled = throttle(exec, 40, { leading: false });
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

    it('TODO: check debounce() w/ cancel2', async () => {
        let value = 0;
        const exec = (lhs: number, rhs: number): number => {
            value += (lhs + rhs);
            return value;
        };
        const debounced = debounce(exec, 50);
        for (let i = 0; i < 5; i++) {
            debounced(i, i + 1);
            debounced.cancel();
            await sleep(10);
        }

        await sleep(50);

        expect(value).toBe(0);
    });

    it('check debounce() w/ flush & pending', () => {
        let value = 0;
        const exec = (lhs: number, rhs: number): number => {
            value += (lhs + rhs);
            return value;
        };
        const debounced = debounce(exec, 50);
        for (let i = 0; i < 5; i++) {
            debounced(i, i + 1);
        }

        expect(debounced.pending()).toBe(true);
        expect(debounced.flush()).toBe(9);
        expect(debounced.pending()).toBe(false);
        expect(debounced.flush()).toBe(9);

        expect(value).toBe(9);
    });

    it('check invalid `maxWait` option', (done) => {
        let callCount = 0;

        const debounced = debounce(
            (value) => {
                ++callCount;
                return value;
            },
            32,
            { maxWait: NaN }
        );

        debounced(null);
        debounced(null);
        expect(callCount).toBe(0);

        setTimeout(() => {
            expect(callCount).toBe(1);
            debounced(null);
            debounced(null);
            expect(callCount).toBe(1);
            done();
        }, 128);
    });

    describe('debounce spec', () => {
        const identity = <T>(value: T): T => {
            return value;
        };

        it('should debounce a function', (done) => {
            let callCount = 0;

            const debounced = debounce((value: any) => {
                ++callCount;
                return value;
            }, 32);

            const results = [debounced('a'), debounced('b'), debounced('c')];
            expect(results).toEqual([undefined, undefined, undefined]);
            expect(callCount).toBe(0);

            setTimeout(() => {
                expect(callCount).toBe(1);

                const results = [debounced('d'), debounced('e'), debounced('f')];
                expect(results).toEqual(['c', 'c', 'c']);
                expect(callCount).toBe(1);
            }, 128);

            setTimeout(() => {
                expect(callCount).toBe(2);
                done();
            }, 256);
        });

        it('subsequent debounced calls return the last `func` result', (done) => {
            const debounced = debounce(identity, 32);
            debounced('a');

            setTimeout(() => {
                expect(debounced('b')).not.toBe('b');
            }, 64);

            setTimeout(() => {
                expect(debounced('c')).not.toBe('c');
                done();
            }, 128);
        });

        it('should not immediately call `func` when `wait` is `0`', (done) => {
            let callCount = 0;
            const debounced = debounce(() => {
                ++callCount;
            }, 0);

            debounced();
            debounced();
            expect(callCount).toBe(0);

            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 5);
        });

        it('should apply default options', (done) => {
            let callCount = 0;
            const debounced = debounce(
                () => {
                    callCount++;
                },
                32,
                {}
            );

            debounced();
            expect(callCount).toBe(0);

            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 64);
        });

        it('should support a `leading` option', (done) => {
            const callCounts = [0, 0];

            const withLeading = debounce(
                () => {
                    callCounts[0]++;
                },
                32,
                { leading: true }
            );

            const withLeadingAndTrailing = debounce(
                () => {
                    callCounts[1]++;
                },
                32,
                { leading: true }
            );

            withLeading();
            expect(callCounts[0]).toBe(1);

            withLeadingAndTrailing();
            withLeadingAndTrailing();
            expect(callCounts[1]).toBe(1);

            setTimeout(() => {
                expect(callCounts).toEqual([1, 2]);

                withLeading();
                expect(callCounts[0]).toBe(2);

                done();
            }, 64);
        });

        it('subsequent leading debounced calls return the last `func` result', (done) => {
            const debounced = debounce(identity, 32, {
                    leading: true,
                    trailing: false,
                }),
                results = [debounced('a'), debounced('b')];

            expect(results).toEqual(['a', 'a']);

            setTimeout(() => {
                const results = [debounced('c'), debounced('d')];
                expect(results).toEqual(['c', 'c']);
                done();
            }, 64);
        });

        it('should support a `trailing` option', (done) => {
            let withCount = 0;
            let withoutCount = 0;

            const withTrailing = debounce(
                () => {
                    withCount++;
                },
                32,
                { trailing: true }
            );

            const withoutTrailing = debounce(
                () => {
                    withoutCount++;
                },
                32,
                { trailing: false }
            );

            withTrailing();
            expect(withCount).toBe(0);

            withoutTrailing();
            expect(withoutCount).toBe(0);

            setTimeout(() => {
                expect(withCount).toBe(1);
                expect(withoutCount).toBe(0);
                done();
            }, 64);
        });

        it('should support a `maxWait` option', (done) => {
            let callCount = 0;

            const debounced = debounce(
                (value) => {
                    ++callCount;
                    return value;
                },
                32,
                { maxWait: 64 }
            );

            debounced(null);
            debounced(null);
            expect(callCount).toBe(0);

            setTimeout(() => {
                expect(callCount).toBe(1);
                debounced(null);
                debounced(null);
                expect(callCount).toBe(1);
            }, 128);

            setTimeout(() => {
                expect(callCount).toBe(2);
                done();
            }, 256);
        });

        it('should support `maxWait` in a tight loop', (done) => {
            const limit = 1000;
            let withCount = 0;
            let withoutCount = 0;

            const withMaxWait = debounce(
                () => {
                    withCount++;
                },
                64,
                { maxWait: 128 }
            );

            const withoutMaxWait = debounce(() => {
                withoutCount++;
            }, 96);

            const start = +new Date();
            while (new Date().valueOf() - start < limit) {
                withMaxWait();
                withoutMaxWait();
            }
            const actual = [Boolean(withoutCount), Boolean(withCount)];
            setTimeout(() => {
                expect(actual).toEqual([false, true]);
                done();
            }, 1);
        });

        it('should queue a trailing call for subsequent debounced calls after `maxWait`', (done) => {
            let callCount = 0;

            const debounced = debounce(
                () => {
                    ++callCount;
                },
                200,
                { maxWait: 200 }
            );

            debounced();

            setTimeout(debounced, 190);
            setTimeout(debounced, 200);
            setTimeout(debounced, 210);

            setTimeout(() => {
                expect(callCount).toBe(2);
                done();
            }, 500);
        });

        it('should cancel `maxDelayed` when `delayed` is invoked', (done) => {
            let callCount = 0;

            const debounced = debounce(
                () => {
                    callCount++;
                },
                32,
                { maxWait: 64 }
            );

            debounced();

            setTimeout(() => {
                debounced();
                expect(callCount).toBe(1);
            }, 128);

            setTimeout(() => {
                expect(callCount).toBe(2);
                done();
            }, 192);
        });

        it('should invoke the trailing call with the correct arguments and `this` binding', (done) => {
            const object = {};
            let actual: any;
            let callCount = 0;

            const debounced = debounce(
                function (this: any, ...args: any) {
                    actual = [this]; // eslint-disable-line no-invalid-this
                    Array.prototype.push.apply(actual, args);
                    return ++callCount !== 2;
                },
                32,
                { leading: true, maxWait: 64 }
            );

            for (;;) {
                if (!debounced.call(object, 'a')) {
                    break;
                }
            }
            setTimeout(() => {
                expect(callCount).toBe(2);
                expect(actual).toEqual([object, 'a']);
                done();
            }, 64);
        });
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

    it('check scheduler()', async () => {
        let count = 0;
        const defer = scheduler();
        const up = (): number => count++;

        defer(up);
        defer(up);

        expect(count).toBe(0);

        await post(noop);

        expect(count).toBe(2);
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

    it('check restoreNullish()', () => {
        expect(restoreNullish('str')).toBe('str');
        expect(restoreNullish(100)).toBe(100);
        expect(restoreNullish(true)).toBe(true);
        expect(restoreNullish({ hoge: 'hoge' })).toEqual({ hoge: 'hoge' });
        expect(restoreNullish(null)).toBe(null);
        expect(restoreNullish(undefined)).toBe(undefined);
        expect(restoreNullish('null')).toBe(null);
        expect(restoreNullish('undefined')).toBe(undefined);
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

    it('check isCancelLikeError', () => {
        const e1 = new Error('abort');
        const e2 = new Error('Abort');
        const e3 = new Error('cancel');
        const e4 = new Error('Cancel');
        const e5 = new Error('ABORT operation');
        const e6 = new Error('Cancel operation');
        const e7 = new Error('operation aborted.');
        expect(isCancelLikeError(e1)).toBeTruthy();
        expect(isCancelLikeError(e2)).toBeTruthy();
        expect(isCancelLikeError(e3)).toBeTruthy();
        expect(isCancelLikeError(e4)).toBeTruthy();
        expect(isCancelLikeError(e5)).toBeTruthy();
        expect(isCancelLikeError(e6)).toBeTruthy();
        expect(isCancelLikeError(e7)).toBeTruthy();

        expect(isCancelLikeError(undefined)).toBeFalsy();
        expect(isCancelLikeError(null)).toBeFalsy();
        expect(isCancelLikeError(-1)).toBeFalsy();
        expect(isCancelLikeError(Symbol('hoge'))).toBeFalsy();
        expect(isCancelLikeError([])).toBeFalsy();
        expect(isCancelLikeError({})).toBeFalsy();
        expect(isCancelLikeError({ message: 'abort' })).toBeTruthy();

        expect(isCancelLikeError('abort')).toBeTruthy();
        expect(isCancelLikeError('Cancel')).toBeTruthy();
        expect(isCancelLikeError('error')).toBeFalsy();
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
