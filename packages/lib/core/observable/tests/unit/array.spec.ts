/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-explicit-any */

import {
    ArrayChangeRecord,
    ArrayChangeType,
    ObservableArray,
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
                expect(observable.isActive).toBe(false);
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
            expect(observable.isActive).toBe(false);
            observable.resume();
            expect(observable.isActive).toBe(true);
        }, 0);
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
