/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method, @typescript-eslint/no-empty-function */

import { EventSource } from '@cdp/events';

const symbolKey = Symbol('SymbolKey');

interface TestEvent {
    error: [Error];
    message: [string];
    multi: [number, string, boolean];
    void: [void];
    empty: void;
    simple: number;
    [symbolKey]: [string];
}

const broker = new EventSource<TestEvent>();

/* eslint-disable @typescript-eslint/no-unused-vars */
const checkCompile = new EventSource<TestEvent>();
checkCompile.off();
checkCompile.off('error', () => { });
checkCompile.off('error', (e: Error) => { });
checkCompile.on('error', () => { });
checkCompile.on('error', (e: Error) => { });
checkCompile.on(['error', 'message', 'multi'], () => { });
checkCompile.on(['error', 'message'], (hoge) => { });
checkCompile.stopListening();
checkCompile.stopListening(broker, 'error', () => { });
checkCompile.stopListening(broker, 'error', (e: Error) => { });
checkCompile.listenTo(broker, 'error', () => { });
checkCompile.listenTo(broker, 'error', (e: Error) => { });
checkCompile.listenTo(broker, ['error', 'message', 'multi'], () => { });
checkCompile.listenTo(broker, ['error', 'message'], (hoge: Error | string) => { });
/* eslint-enable @typescript-eslint/no-unused-vars */

describe('events/source spec', () => {

    let count: number;

    beforeEach(() => {
        count = 0;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const onCallback = (...args: any[]): void => {
        count++;
    };

    it('check hasListener()', () => {
        const source = new EventSource<TestEvent>();
        const stub = { onCallback };

        expect(source.hasListener()).toBeFalsy();

        source.on('message', stub.onCallback);
        expect(source.hasListener()).toBeTruthy();

        source.off();
        expect(source.hasListener()).toBeFalsy();

        source.on(['message', 'error', 'simple'], stub.onCallback);
        expect(source.hasListener()).toBeTruthy();

        source.off();
        expect(source.hasListener()).toBeFalsy();
    });

    it('check hasListener(channel)', () => {
        const source = new EventSource<TestEvent>();
        const stub = { onCallback };

        expect(source.hasListener()).toBeFalsy();

        source.on('message', stub.onCallback);
        expect(source.hasListener('error')).toBeFalsy();
        expect(source.hasListener('message')).toBeTruthy();

        source.off();
        expect(source.hasListener()).toBeFalsy();

        source.on(['message', 'error', 'simple'], stub.onCallback);
        expect(source.hasListener('message')).toBeTruthy();
        expect(source.hasListener('error')).toBeTruthy();
        expect(source.hasListener('simple')).toBeTruthy();
        expect(source.hasListener('void')).toBeFalsy();

        source.off();
        expect(source.hasListener()).toBeFalsy();
    });

    it('check hasListener(channel, function)', () => {
        const source = new EventSource<TestEvent>();
        const stub = { onCallback };

        expect(source.hasListener()).toBeFalsy();

        source.on('message', stub.onCallback);
        expect(source.hasListener('message', stub.onCallback)).toBeTruthy();
        expect(source.hasListener('message', () => { })).toBeFalsy();

        source.off();
        expect(source.hasListener()).toBeFalsy();

        source.on(['message', 'error', 'simple'], stub.onCallback);
        expect(source.hasListener('message', stub.onCallback)).toBeTruthy();
        expect(source.hasListener('message', () => { })).toBeFalsy();
        expect(source.hasListener('error', stub.onCallback)).toBeTruthy();
        expect(source.hasListener('error', () => { })).toBeFalsy();
        expect(source.hasListener('simple', stub.onCallback)).toBeTruthy();
        expect(source.hasListener('simple', () => { })).toBeFalsy();
        expect(source.hasListener('void', stub.onCallback)).toBeFalsy();
        expect(source.hasListener('void', () => { })).toBeFalsy();

        source.off();
        expect(source.hasListener()).toBeFalsy();
    });

    it('check channels()', () => {
        const source = new EventSource<TestEvent>();
        const stub = { onCallback };

        let channels = source.channels();
        expect(channels).toBeDefined();
        expect(channels.length).toBe(0);
        source.on('message', stub.onCallback);

        channels = source.channels();
        expect(channels.length).toBe(1);
        expect(channels[0]).toBe('message');

        source.off();
        channels = source.channels();
        expect(channels.length).toBe(0);

        source.on(['message', symbolKey], stub.onCallback);
        channels = source.channels();
        expect(channels.length).toBe(2);
        expect(channels[0]).toBe('message');
        expect(channels[1]).toBe(symbolKey);

        source.off();
        channels = source.channels();
        expect(channels.length).toBe(0);
    });

    it('check on(single)', async (done) => {
        const source = new EventSource<TestEvent>();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        source.on('message', stub.onCallback);

        await source.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await source.trigger('message', 'good morning');
        expect(stub.onCallback).toHaveBeenCalledWith('good morning');

        expect(count).toBe(2);

        done();
    });

    it('check on(multi)', async (done) => {
        const source = new EventSource<TestEvent>();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        source.on(['message', 'multi'], stub.onCallback);

        await source.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await source.trigger('multi', 10, 'good morning', true);
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'good morning', true);

        expect(count).toBe(2);

        done();
    });

    it('check off(single)', async (done) => {
        const source = new EventSource<TestEvent>();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        source.on('message', stub.onCallback);
        source.on('simple', stub.onCallback);
        await source.trigger('message', 'hello');
        await source.trigger('simple', 1);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(1);
        expect(count).toBe(2);

        source.off('message', stub.onCallback);
        await source.trigger('message', 'good morning');
        await source.trigger('simple', 2);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(2);
        expect(count).toBe(3);

        source.off('simple');
        await source.trigger('message', 'good evening');
        await source.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good evening');
        expect(stub.onCallback).not.toHaveBeenCalledWith(3);
        expect(count).toBe(3);

        done();
    });

    it('check off(multi)', async (done) => {
        const source = new EventSource<TestEvent>();
        const error1 = new Error('error1');
        const error2 = new Error('error2');
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        source.on(['message', 'multi', 'simple', 'error'], stub.onCallback);
        await source.trigger('message', 'hello');
        await source.trigger('multi', 10, 'multi', true);
        await source.trigger('simple', 1);
        await source.trigger('error', error1);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(1);
        expect(stub.onCallback).toHaveBeenCalledWith(error1);

        source.off(['message', 'error'], stub.onCallback);
        await source.trigger('message', 'good morning');
        await source.trigger('multi', 20, 'multi', true);
        await source.trigger('simple', 2);
        await source.trigger('error', error2);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(20, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(2);
        expect(stub.onCallback).not.toHaveBeenCalledWith(error2);

        source.off(['multi'], stub.onCallback);
        await source.trigger('multi', 30, 'multi', true);
        await source.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalledWith(30, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(3);

        source.off(['simple']);
        await source.trigger('simple', 4);
        expect(stub.onCallback).not.toHaveBeenCalledWith(4);

        expect(count).toBe(7);

        done();
    });

    it('check once(single)', async (done) => {
        const source = new EventSource<TestEvent>();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = source.once('message', stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await source.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await source.trigger('message', 'good morning');
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        done();
    });

    it('check once(multi)', async (done) => {
        const source = new EventSource<TestEvent>();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = source.once(['message', 'multi'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await source.trigger('multi', 10, 'multi', true);
        await source.trigger('message', 'hello');
        expect(stub.onCallback).not.toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'multi', true);

        await source.trigger('multi', 20, 'multi', true);
        expect(stub.onCallback).not.toHaveBeenCalledWith(20, 'multi', true);
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        done();
    });

    it('check query event', () => {
        interface QueryEvent {
            'query-eldest': { name: string; };
        }
        const source = new class extends EventSource<QueryEvent> {
            public queryEldest(): string {
                const event = { name: '' };
                this.trigger('query-eldest', event);
                return event.name;
            }
        };

        const bigbrother = {
            onQuery: (event: { name: string; }) => {
                event.name = 'I am big brother.';
                return true; // handle query event.
            },
        };

        const youngbrother = {
            onQuery: (event: { name: string; }) => {
                event.name = 'I am youngbrother.';
                return true; // handle query event.
            },
        };

        spyOn(bigbrother, 'onQuery').and.callThrough();
        spyOn(youngbrother, 'onQuery').and.callThrough();

        source.on('query-eldest', bigbrother.onQuery);
        source.on('query-eldest', youngbrother.onQuery);

        const eldest = source.queryEldest();

        expect(eldest).toBe('I am big brother.');
        expect(bigbrother.onQuery).toHaveBeenCalled();
        expect(youngbrother.onQuery).not.toHaveBeenCalled();
    });

    it('check listenTo(single)', async (done) => {
        const source = new EventSource();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        source.listenTo(broker, 'message', stub.onCallback);

        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await broker.trigger('message', 'good morning');
        expect(stub.onCallback).toHaveBeenCalledWith('good morning');

        expect(count).toBe(2);

        source.stopListening();
        done();
    });

    it('check listenTo(multi)', async (done) => {
        const source = new EventSource();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        source.listenTo(broker, ['message', 'multi'], stub.onCallback);

        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await broker.trigger('multi', 10, 'good morning', true);
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'good morning', true);

        expect(count).toBe(2);

        source.stopListening();
        done();
    });

    it('check subscription', async (done) => {
        const source = new EventSource();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = source.listenTo(broker, ['message', 'multi'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();

        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(subscription.enable).toBeTruthy();

        subscription.unsubscribe();
        expect(subscription.enable).toBeFalsy();

        await broker.trigger('multi', 10, 'good morning', true);
        expect(stub.onCallback).not.toHaveBeenCalledWith(10, 'good morning', true);

        expect(count).toBe(1);

        source.stopListening();
        done();
    });

    it('check stopListening(single)', async (done) => {
        const source = new EventSource();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        source.listenTo(broker, 'message', stub.onCallback);
        source.listenTo(broker, 'simple', stub.onCallback);
        await broker.trigger('message', 'hello');
        await broker.trigger('simple', 1);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(1);
        expect(count).toBe(2);

        source.stopListening(broker, 'message', stub.onCallback);
        await broker.trigger('message', 'good morning');
        await broker.trigger('simple', 2);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(2);
        expect(count).toBe(3);

        source.stopListening(broker, 'simple');
        await broker.trigger('message', 'good evening');
        await broker.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good evening');
        expect(stub.onCallback).not.toHaveBeenCalledWith(3);
        expect(count).toBe(3);

        source.stopListening();
        done();
    });

    it('check stopListening(multi)', async (done) => {
        const source = new EventSource();
        const error1 = new Error('error1');
        const error2 = new Error('error2');
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        source.listenTo(broker, ['message', 'multi', 'simple', 'error'], stub.onCallback);
        await broker.trigger('message', 'hello');
        await broker.trigger('multi', 10, 'multi', true);
        await broker.trigger('simple', 1);
        await broker.trigger('error', error1);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(1);
        expect(stub.onCallback).toHaveBeenCalledWith(error1);

        source.stopListening(broker, ['message', 'error'], stub.onCallback);
        await broker.trigger('message', 'good morning');
        await broker.trigger('multi', 20, 'multi', true);
        await broker.trigger('simple', 2);
        await broker.trigger('error', error2);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(20, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(2);
        expect(stub.onCallback).not.toHaveBeenCalledWith(error2);

        source.stopListening(broker, ['multi'], stub.onCallback);
        await broker.trigger('multi', 30, 'multi', true);
        await broker.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalledWith(30, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(3);

        source.stopListening(broker, ['simple']);
        await broker.trigger('simple', 4);
        expect(stub.onCallback).not.toHaveBeenCalledWith(4);

        expect(count).toBe(7);

        source.stopListening();
        done();
    });

    it('check stopListening(variation)', async (done) => {
        const source = new EventSource();
        const stub = { onCallback };
        const broker2 = new EventSource<TestEvent>();
        const stub2 = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        spyOn(stub2, 'onCallback').and.callThrough();

        source.listenTo(broker, 'message', stub.onCallback);
        source.listenTo(broker, 'message', stub2.onCallback);
        source.listenTo(broker, 'void', stub.onCallback);
        source.listenTo(broker2, 'multi', stub2.onCallback);
        source.listenTo(broker2, 'simple', stub2.onCallback);

        source.stopListening(broker, 'message');
        await broker.trigger('message', 'good morning');
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(stub2.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);

        source.stopListening(broker2);
        await broker.trigger('multi', 30, 'multi', true);
        await broker.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(stub2.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);

        expect(() => source.stopListening(broker, 'error')).not.toThrow();
        expect(() => source.stopListening(broker, 'void', () => {})).not.toThrow();

        source.stopListening();
        done();
    });

    it('check listenToOnce(single)', async (done) => {
        const source = new EventSource();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = source.listenToOnce(broker, 'message', stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await broker.trigger('message', 'good morning');
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        source.stopListening();
        done();
    });

    it('check listenToOnce(multi)', async (done) => {
        const source = new EventSource();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = source.listenToOnce(broker, ['message', 'multi'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await broker.trigger('multi', 10, 'multi', true);
        await broker.trigger('message', 'hello');
        expect(stub.onCallback).not.toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'multi', true);

        await broker.trigger('multi', 20, 'multi', true);
        expect(stub.onCallback).not.toHaveBeenCalledWith(20, 'multi', true);
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        source.stopListening();
        done();
    });
});
