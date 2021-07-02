/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/explicit-member-accessibility,
 */

import {
    ObservableState,
    ObservableObject,
    IObservable,
    IObservableEventBrokerAccess,
    isObservable,
} from '@cdp/observable';

describe('observable/object spec', () => {

///*
    class Model extends ObservableObject {
        constructor(public a: number, public b: number) {
            super();
        }
        get sum(): number { return this.a + this.b; }
    }
//*/
    // under `useDefineForClassFields` options, you should use following class instead of above.
/*
    class Model extends ObservableObject {
        public a: number;
        public b: number;
        constructor(a: number, b: number) {
            super();
            this.a = a;
            this.b = b;
        }
        get sum(): number { return this.a + this.b; }
    }
//*/
    it('ObservableObject#on(notify if target is changed)', done => {
        const model = new Model(1, 1);
        model.on('sum', (newValue, oldValue, key): void => {
            expect(key).toBe('sum');
            expect(newValue).toBe(3);
            expect(oldValue).toBe(2);
            done();
        });
        model.a = 2;
    });

    it('ObservableObject#on(NOT notify unless target is changed)', done => {
        const model = new Model(1, 1);
        model.on('sum', () => expect('UNEXPECTED FLOW').toBeNull());
        model.a = 2;
        model.b = 0;
        setTimeout(() => {
            expect(model.a).toBe(2);
            expect(model.b).toBe(0);
            done();
        }, 0);
    });

    it('ObservableObject#off', done => {
        const model = new Model(1, 1);
        const stub = {
            onCallback: () => { expect('UNEXPECTED FLOW').toBeNull(); },
        };
        spyOn(stub, 'onCallback').and.callThrough();

        model.on('sum', stub.onCallback);
        model.off('sum', stub.onCallback);
        model.a = 2;
        model.b = 1;
        setTimeout(() => {
            expect(stub.onCallback).not.toHaveBeenCalled();
            done();
        }, 0);
    });

    it('ObservableObject w/ EventSubscription#unsubscribe', done => {
        const model = new Model(1, 1);
        const stub = {
            onCallback: () => { expect('UNEXPECTED FLOW').toBeNull(); },
        };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = model.on('sum', stub.onCallback);
        model.off('sum', stub.onCallback);
        subscription.unsubscribe();
        model.a = 2;
        setTimeout(() => {
            expect(stub.onCallback).not.toHaveBeenCalled();
            done();
        }, 0);
    });

    it('ObservableObject#suspend(NOT notify during suspend)', done => {
        const model = new Model(1, 1).suspend();
        const stub = {
            onCallback: () => { expect('UNEXPECTED FLOW').toBeNull(); },
        };
        spyOn(stub, 'onCallback').and.callThrough();

        model.on('sum', stub.onCallback);
        model.off('sum', stub.onCallback);
        model.a = 2;
        setTimeout(() => {
            expect(stub.onCallback).not.toHaveBeenCalled();
            done();
        }, 0);
    });

    it('ObservableObject#resume(notify after called #resume) w/ ObservableObject#isActive', done => {
        const model = new Model(1, 1).suspend();
        model.on('sum', (newValue, oldValue) => {
            expect(newValue).toBe(3);
            expect(oldValue).toBe(2);
            done();
        });
        model.a = Math.random();
        setTimeout(() => {
            expect(model.getObservableState()).toBe(ObservableState.SUSEPNDED);
            model.resume().a = 2;
            expect(model.getObservableState()).toBe(ObservableState.ACTIVE);
            // no effect
            expect(() => model.resume()).not.toThrow();
        }, 0);
    });

    it('ObservableObject#suspend(true)', done => {
        const model = new Model(1, 1).suspend(true);
        const stub = {
            onCallback: () => { expect('UNEXPECTED FLOW').toBeNull(); },
        };
        spyOn(stub, 'onCallback').and.callThrough();

        model.on('sum', stub.onCallback);
        model.off('sum', stub.onCallback);
        model.a = 2;
        setTimeout(() => {
            expect(model.getObservableState()).toBe(ObservableState.DISABLED);
            expect(stub.onCallback).not.toHaveBeenCalled();
            model.resume();
            setTimeout(() => {
                expect(model.getObservableState()).toBe(ObservableState.ACTIVE);
                done();
            });
        }, 0);
    });

    it('ObservableObject#on(notify merged change)', done => {
        const model = new Model(1, 1);
        model.on('sum', (newValue, oldValue) => {
            expect(newValue).toBe(3);
            expect(oldValue).toBe(2);
            done();
        });
        setTimeout(() => {
            model.a = Math.random();
            model.a = Math.random();
            model.a = 2;
        }, 0);
    });

    it('ObservableObject#on(multi properties)', done => {
        const model = new Model(1, 1);
        const stub = {
            count: 0,
            onCallback: () => { stub.count++; },
        };
        model.on(['a', 'b'], stub.onCallback);
        model.a = Math.random();
        model.b = Math.random();
        setTimeout(() => {
            expect(stub.count).toBe(2);
            done();
        }, 0);
    });

    it('ObservableObject.from()', done => {
        const model = ObservableObject.from({ a: 1, b: 1 });
        const stub = {
            count: 0,
            onCallback: () => { stub.count++; },
        };
        model.on(['a', 'b'], stub.onCallback);
        model.a = Math.random();
        model.b = Math.random();
        setTimeout(() => {
            expect(stub.count).toBe(2);
            done();
        }, 0);
    });

    it('check no-prop', done => {
        class NoProp extends ObservableObject { }
        const model = new NoProp();
        (model as IObservable).on('prop', () => {
            expect(model['prop']).toBe('enable');
            done();
        });
        model['prop'] = 'enable';
    });

    it('advanced model', done => {
        const symbol = Symbol('prop');
        class Advanced extends ObservableObject {
            constructor(public prop: string) {
                super(ObservableState.SUSEPNDED);
            }
            fire(): void {
                this.notify();
                this.notify('prop', 'newProp');
            }
        }

        const model = new Advanced('test');
        model.on('prop', (newVal) => {
            model[symbol] = newVal;
            expect(model.getObservableState()).toBe(ObservableState.SUSEPNDED);
        });
        model.prop = 'enable';
        model.fire();
        setTimeout(() => {
            expect(model[symbol]).toBe('enable');
            done();
        }, 0);
    });

    it('check isObservable()', () => {
        const model = new Model(1, 1);
        expect(isObservable(model)).toBe(true);
        expect(isObservable({})).toBe(false);
    });

    it('ObservableObject#on(@)', done => {
        const model = ObservableObject.from({ a: 1, b: 1 });
        const stub = {
            count: 0,
            onCallback: () => { stub.count++; },
        };
        model.on('@', stub.onCallback);
        model.a = Math.random();
        model.b = Math.random();
        setTimeout(() => {
            expect(stub.count).toBe(1);
            done();
        }, 0);
    });

    it('IObservableEventBrokerAccess#trigger', done => {
        const observable = new Model(1, 1) as IObservable as IObservableEventBrokerAccess<{ custom: number; }>; // eslint-disable-line
        setTimeout(() => {
            observable.on('custom', (value: number) => {
                expect(value).toBe(100);
                done();
            });
            const broker = observable.getBroker();
            broker.trigger('custom', 100);
        }, 0);
    });

    xit('check construction performance', () => {
        const _wmap = new WeakMap<any, any>();
        // peformance
        class Vanilla { }
        console.time('vanilla');
        const b0 = performance.now();
        for (let i = 0; i < 1000000; i++) {
//            new Vanilla(); // eslint-disable-line
            _wmap.set(new Vanilla(), new Map());
        }
        const base = performance.now() - b0;
        console.timeEnd('vanilla');

        class Observable extends ObservableObject { }
        console.time('ObservableObject');
        const t0 = performance.now();
        for (let i = 0; i < 1000000; i++) {
            new Observable(); // eslint-disable-line
        }
        const t1 = performance.now() - t0;
        console.timeEnd('ObservableObject');

        expect(t1).toBeLessThanOrEqual(base);
        expect(t1).toBeLessThanOrEqual(800);
    });

    it('check advanced', () => {
        const model = new Model(1, 1);
        const invalid = {} as any;
        invalid.suspend = model.suspend;
        expect(() => {
            invalid.suspend();
        }).toThrow(new TypeError(`The object passed is not an IObservable.`));
    });
});
