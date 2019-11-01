/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-explicit-any */

import {
    ObservableState,
    ArrayChangeRecord,
    ArrayChangeType,
    ObservableArray,
    isObservable,
} from '@cdp/observable';

describe('observable/array spec', () => {
    it('ObservableArray#on(INSERT)', async (done) => {
        const observable = ObservableArray.of('a', 'b', 'c');
        const newValue = 'x';
        const expected: ArrayChangeRecord<string> = {
            type: ArrayChangeType.INSERT,
            index: 0,
            newValue,
            oldValue: undefined,
        };
        setTimeout(() => {
            observable.on(records => {
                expect(records.length).toBe(1);
                expect(records[0]).toEqual(expected);
                done();
            });
            observable.unshift(newValue);
        }, 0);
    });

    it('ObservableArray#on(UPDATE)', async (done) => {
        const observable = ObservableArray.of('a', 'b', 'c');
        const newValue = 'x';
        const expected: ArrayChangeRecord<string> = {
            type: ArrayChangeType.UPDATE,
            index: 0,
            newValue,
            oldValue: 'a',
        };
        setTimeout(() => {
            observable.on(records => {
                expect(records.length).toBe(1);
                expect(records[0]).toEqual(expected);
                done();
            });
            observable[0] = newValue;
        }, 0);
    });

    it('ObservableArray#on(REMOVE)', async (done) => {
        const observable = ObservableArray.of('a', 'b', 'c');
        const expected: ArrayChangeRecord<string> = {
            type: ArrayChangeType.REMOVE,
            index: 0,
            newValue: undefined,
            oldValue: 'a',
        };
        setTimeout(() => {
            observable.on(records => {
                expect(records.length).toBe(1);
                expect(records[0]).toEqual(expected);
                done();
            });
            observable.shift();
        }, 0);
    });

    it('ObservableArray#off()', async (done) => {
        const observable = ObservableArray.of('a', 'b', 'c');
        const callback = (): boolean => expect('UNEXPECTED FLOW').toBeNull();
        setTimeout(() => {
            observable.on(callback);
            observable.off(callback);
            observable.push('x');
            setTimeout(() => {
                expect(observable.length).toBe(4);
                done();
            }, 0);
        }, 0);
    });

    it('ObservableArray w/ Subscription#unsubscribe()', async (done) => {
        const observable = ObservableArray.of('a', 'b', 'c');
        setTimeout(() => {
            const subscription = observable.on(() => expect('UNEXPECTED FLOW').toBeNull());
            subscription.unsubscribe();
            observable.push('x');
            setTimeout(() => {
                expect(observable.length).toBe(4);
                done();
            }, 0);
        }, 0);
    });

    it('ObservableArray#on(NOT notify unless target is changed)', async (done) => {
        const observable = ObservableArray.of('a', 'b', 'c');
        setTimeout(() => {
            observable.on(() => expect('UNEXPECTED FLOW').toBeNull());
            observable.push('x', 'y', 'z');
            observable.splice(3, 3);
            setTimeout(() => {
                expect(observable[0]).toBe('a');
                expect(observable[1]).toBe('b');
                expect(observable[2]).toBe('c');
                done();
            }, 0);
        }, 0);
    });

    it('ObservableArray#suspend(NOT notify during suspend)', async (done) => {
        const observable = ObservableArray.of('a', 'b', 'c');
        setTimeout(() => {
            observable.suspend();
            observable.on(() => expect('UNEXPECTED FLOW').toBeNull());
            observable.splice(0, 3, 'x', 'y', 'z');
            setTimeout(() => {
                expect(observable.getObservableState()).toBe(ObservableState.SUSEPNDED);
                expect(observable[0]).toBe('x');
                expect(observable[1]).toBe('y');
                expect(observable[2]).toBe('z');
                done();
            }, 0);
        }, 0);
    });

    it('ObservableArray#resume(notify after called #resume)', async (done) => {
        const observable = ObservableArray.of('a', 'b', 'c');
        setTimeout(() => {
            observable.suspend();
            observable.on(records => {
                expect(records).toEqual([
                    { type: ArrayChangeType.UPDATE, index: 0, newValue: 'x', oldValue: 'a' },
                    { type: ArrayChangeType.UPDATE, index: 1, newValue: 'y', oldValue: 'b' },
                    { type: ArrayChangeType.UPDATE, index: 2, newValue: 'z', oldValue: 'c' },
                ]);
                // no effect
                expect(() => observable.resume()).not.toThrow();
                done();
            });
            observable.splice(0, 3, 'x', 'y', 'z');
            expect(observable.getObservableState()).toBe(ObservableState.SUSEPNDED);
            observable.resume();
            expect(observable.getObservableState()).toBe(ObservableState.ACTIVE);
        }, 0);
    });

    it('ObservableArray#suspend(true)', async (done) => {
        const observable = ObservableArray.of('a', 'b', 'c');
        setTimeout(() => {
            observable.suspend(true);
            observable.on(() => expect('UNEXPECTED FLOW').toBeNull());
            observable.splice(0, 3, 'x', 'y', 'z');
            setTimeout(() => {
                expect(observable.getObservableState()).toBe(ObservableState.DISABLED);
                expect(observable[0]).toBe('x');
                expect(observable[1]).toBe('y');
                expect(observable[2]).toBe('z');
                observable.sort((lhs, rhs) => lhs < rhs ? 1 : -1);
                const item = observable.shift();
                observable.unshift(item as string);
                observable.resume();
                setTimeout(() => {
                    expect(observable.getObservableState()).toBe(ObservableState.ACTIVE);
                    expect(observable[0]).toBe('z');
                    expect(observable[1]).toBe('y');
                    expect(observable[2]).toBe('x');
                    done();
                }, 0);
            }, 0);
        });
    });

    it('ObservableArray#on(notify merged change records)', async (done) => {
        const observable = ObservableArray.from<string>([]);
        setTimeout(() => {
            observable.on(records => {
                expect(records).toEqual([
                    { type: ArrayChangeType.INSERT, index: 0, newValue: 'y', oldValue: void 0 },
                ]);
                done();
            });
            observable.push('a', 'b', 'c');
            observable[0] = 'x';
            observable[1] = 'y';
            observable[2] = 'z';
            observable.shift();
            observable.pop();
        }, 0);
    });

    it('ObservableArray#on(UPDATE => UPDATE : UPDATE, UPDATE => REMOVE : INSERT)', async (done) => {
        const observable = ObservableArray.from(['a', 'b', 'c']);
        setTimeout(() => {
            observable.on(records => {
                expect(records).toEqual([
                    { type: ArrayChangeType.UPDATE, index: 0, newValue: 'a', oldValue: 'a' },
                    { type: ArrayChangeType.UPDATE, index: 2, newValue: 'c', oldValue: 'c' },
                ]);
                done();
            });
            // UPDATE => UPDATE : UPDATE
            observable[0] = 'x';
            observable[0] = 'a';
            // UPDATE => REMOVE : INSERT
            observable.pop();
            observable.push('c');
        }, 0);
    });

    it('ObservableArray#pop()', async (done) => {
        const observable = ObservableArray.from(['a', 'b', 'c']);
        setTimeout(() => {
            observable.on(records => {
                expect(records).toEqual([
                    { type: ArrayChangeType.REMOVE, index: 2, newValue: undefined, oldValue: 'c' },
                    { type: ArrayChangeType.REMOVE, index: 1, newValue: undefined, oldValue: 'b' },
                    { type: ArrayChangeType.REMOVE, index: 0, newValue: undefined, oldValue: 'a' },
                ]);
                done();
            });
            observable.pop();
            observable.pop();
            observable.pop();
            observable.pop(); // too much operation
        }, 0);
    });

    it('ObservableArray#shift()', async (done) => {
        const observable = ObservableArray.from(['a', 'b', 'c']);
        setTimeout(() => {
            observable.on(records => {
                expect(records).toEqual([
                    { type: ArrayChangeType.REMOVE, index: 0, newValue: undefined, oldValue: 'a' },
                    { type: ArrayChangeType.REMOVE, index: 0, newValue: undefined, oldValue: 'b' },
                    { type: ArrayChangeType.REMOVE, index: 0, newValue: undefined, oldValue: 'c' },
                ]);
                done();
            });
            observable.shift();
            observable.shift();
            observable.shift();
            observable.shift(); // too much operation
        }, 0);
    });

    it('ObservableArray#sort()', async (done) => {
        const observable = ObservableArray.from(['a', 'b', 'c']);
        setTimeout(() => {
            observable.on(records => {
                expect(records).toEqual([
                    { type: ArrayChangeType.UPDATE, index: 0, newValue: 'c', oldValue: 'a' },
                    { type: ArrayChangeType.UPDATE, index: 2, newValue: 'a', oldValue: 'c' },
                ]);
                done();
            });
            observable.sort((lhs, rhs) => {
                return lhs < rhs ? 1 : -1;
            });
        }, 0);
    });

    it('ObservableArray#splice(-1)', async (done) => {
        const observable = ObservableArray.from(['a', 'b', 'c']);
        setTimeout(() => {
            observable.on(records => {
                expect(records).toEqual([
                    { type: ArrayChangeType.REMOVE, index: 2, newValue: undefined, oldValue: 'c' },
                ]);
                done();
            });
            observable.splice(-1);
        }, 0);
    });

    it('ObservableArray#length +', async (done) => {
        const observable = ObservableArray.from(['a', 'b', 'c']);
        setTimeout(() => {
            observable.on(records => {
                expect(records).toEqual([
                    { type: ArrayChangeType.INSERT, index: 3, newValue: undefined, oldValue: undefined },
                ]);
                done();
            });
            observable.length = 4;
        }, 0);
    });

    it('check map performance', async (done) => {
        const array = new Array(100000);
        const observable = ObservableArray.from(array);
        let checkType: ObservableArray<any>;
        setTimeout(() => {
            // map
            let i = 0;
            console.time('Array.map');
            let b0 = performance.now();
            array.map(() => i++);
            let base = performance.now() - b0;
            console.timeEnd('Array.map');

            console.time('ObservableArray.map');
            let t0 = performance.now();
            i = 0;
            checkType = observable.map(() => i++);
            let t1 = performance.now() - t0;
            console.timeEnd('ObservableArray.map');

            expect(isObservable(checkType)).toBe(true);
            expect(t1).toBeLessThanOrEqual(base * 500); // map はとても遅い. 大体 250 倍近いコスト

            // slice
            console.time('Array.slice');
            b0 = performance.now();
            array.slice(50000, 50000);
            base = performance.now() - b0;
            console.timeEnd('Array.slice');

            console.time('ObservableArray.slice');
            t0 = performance.now();
            checkType = observable.slice(50000, 50000);
            t1 = performance.now() - t0;
            console.timeEnd('ObservableArray.slice');

            expect(isObservable(checkType)).toBe(true);
            expect(t1).toBeLessThanOrEqual(0.1);    // slice は速い. 無視できるコスト

            // filter
            console.time('Array.filter');
            b0 = performance.now();
            array.filter(e => 50000 < e);
            base = performance.now() - b0;
            console.timeEnd('Array.filter');

            console.time('ObservableArray.filter');
            t0 = performance.now();
            checkType = observable.filter(e => 50000 < e);
            t1 = performance.now() - t0;
            console.timeEnd('ObservableArray.filter');

            expect(isObservable(checkType)).toBe(true);
            expect(t1).toBeLessThanOrEqual(base * 150); // filter は遅い. 80倍近いコスト

            // concat
            const appendee = array.slice();
            console.time('Array.concat');
            b0 = performance.now();
            array.concat(...appendee);
            base = performance.now() - b0;
            console.timeEnd('Array.concat');

            console.time('ObservableArray.concat');
            t0 = performance.now();
            checkType = observable.concat(...appendee);
            t1 = performance.now() - t0;
            console.timeEnd('ObservableArray.concat');

            expect(isObservable(checkType)).toBe(true);
            expect(t1).toBeLessThanOrEqual(base * 60); // filter はやや遅い. 44倍近いコスト

            done();
        });
    });

    it('check advanced', async (done) => {
        const observable = ObservableArray.from([]);
        // from new
        const fromNew = new (observable as any).constructor('x', 'y', 'z') as ObservableArray<string>;
        expect(fromNew[0]).toBe('x');
        expect(fromNew[1]).toBe('y');
        expect(fromNew[2]).toBe('z');
        done();
    });
});
