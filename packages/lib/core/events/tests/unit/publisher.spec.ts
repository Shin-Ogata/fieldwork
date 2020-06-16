/* eslint-disable
    @typescript-eslint/require-await
 ,  @typescript-eslint/unbound-method
 ,  @typescript-eslint/no-empty-function
 */

import {
    EventAll,
    EventPublisher,
    EventBroker,
    EventArguments,
} from '@cdp/events';

const symbolKey = Symbol('SymbolKey');

interface TestEvent extends EventAll {
    error: [Error];
    message: [string];
    multi: [number, string, boolean];
    void: [void];
    empty: void;
    simple: number;
    [symbolKey]: [string];
}

class TestPublisher extends EventPublisher<TestEvent> {
    public checkCompile(): void {
        this.publish('error', new TypeError('error'));
        this.publish('void');
        this.publish('empty');
        this.publish('message', '100');
        this.publish('multi', 100, '1');
        this.publish('multi', 100);
        this.publish('multi', 10, 'str', true);
        this.publish('simple', 1);
        this.publish('*', 'any', 'any');
        this.publish(symbolKey, symbolKey.toString());
    }
    public async trigger<Channel extends keyof TestEvent>(channel: Channel, ...args: EventArguments<Partial<TestEvent[Channel]>>): Promise<void> {
        this.publish(channel, ...args);
    }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
const checkCompile = new TestPublisher();
checkCompile.off();
checkCompile.off('error', () => { });
checkCompile.off('error', (e: Error) => { });
checkCompile.on('error', () => { });
checkCompile.on('error', (e: Error) => { });
checkCompile.on(['error', 'message', 'multi'], () => { });
checkCompile.on(['error', 'message'], (hoge) => { });
/* eslint-enable @typescript-eslint/no-unused-vars */

describe('events/publisher spec', () => {

    let count: number;

    beforeEach(() => {
        count = 0;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const onCallback = (...args: any[]): void => {
        count++;
//      console.log(`received: ${JSON.stringify([...args])} \n`);
    };

    it('check hasListener()', () => {
        const publisher = new TestPublisher();
        const stub = { onCallback };

        expect(publisher.hasListener()).toBeFalsy();

        publisher.on('message', stub.onCallback);
        expect(publisher.hasListener()).toBeTruthy();

        publisher.off();
        expect(publisher.hasListener()).toBeFalsy();

        publisher.on(['message', 'error', 'simple'], stub.onCallback);
        expect(publisher.hasListener()).toBeTruthy();

        publisher.off();
        expect(publisher.hasListener()).toBeFalsy();
    });

    it('check hasListener(channel)', () => {
        const publisher = new TestPublisher();
        const stub = { onCallback };

        expect(publisher.hasListener()).toBeFalsy();

        publisher.on('message', stub.onCallback);
        expect(publisher.hasListener('error')).toBeFalsy();
        expect(publisher.hasListener('message')).toBeTruthy();

        publisher.off();
        expect(publisher.hasListener()).toBeFalsy();

        publisher.on(['message', 'error', 'simple'], stub.onCallback);
        expect(publisher.hasListener('message')).toBeTruthy();
        expect(publisher.hasListener('error')).toBeTruthy();
        expect(publisher.hasListener('simple')).toBeTruthy();
        expect(publisher.hasListener('void')).toBeFalsy();

        publisher.off();
        expect(publisher.hasListener()).toBeFalsy();
    });

    it('check hasListener(channel, function)', () => {
        const publisher = new TestPublisher();
        const stub = { onCallback };

        expect(publisher.hasListener()).toBeFalsy();

        publisher.on('message', stub.onCallback);
        expect(publisher.hasListener('message', stub.onCallback)).toBeTruthy();
        expect(publisher.hasListener('message', () => { })).toBeFalsy();

        publisher.off();
        expect(publisher.hasListener()).toBeFalsy();

        publisher.on(['message', 'error', 'simple'], stub.onCallback);
        expect(publisher.hasListener('message', stub.onCallback)).toBeTruthy();
        expect(publisher.hasListener('message', () => { })).toBeFalsy();
        expect(publisher.hasListener('error', stub.onCallback)).toBeTruthy();
        expect(publisher.hasListener('error', () => { })).toBeFalsy();
        expect(publisher.hasListener('simple', stub.onCallback)).toBeTruthy();
        expect(publisher.hasListener('simple', () => { })).toBeFalsy();
        expect(publisher.hasListener('void', stub.onCallback)).toBeFalsy();
        expect(publisher.hasListener('void', () => { })).toBeFalsy();

        publisher.off();
        expect(publisher.hasListener()).toBeFalsy();
    });

    it('check channels()', () => {
        const publisher = new TestPublisher();
        const stub = { onCallback };

        let channels = publisher.channels();
        expect(channels).toBeDefined();
        expect(channels.length).toBe(0);
        publisher.on('message', stub.onCallback);

        channels = publisher.channels();
        expect(channels.length).toBe(1);
        expect(channels[0]).toBe('message');

        publisher.off();
        channels = publisher.channels();
        expect(channels.length).toBe(0);

        publisher.on(['message', symbolKey], stub.onCallback);
        channels = publisher.channels();
        expect(channels.length).toBe(2);
        expect(channels[0]).toBe('message');
        expect(channels[1]).toBe(symbolKey);

        publisher.off();
        channels = publisher.channels();
        expect(channels.length).toBe(0);
    });

    it('check on(single)', async done => {
        const publisher = new TestPublisher();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        publisher.on('message', stub.onCallback);

        await publisher.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await publisher.trigger('message', 'good morning');
        expect(stub.onCallback).toHaveBeenCalledWith('good morning');

        expect(count).toBe(2);

        done();
    });

    it('check on(multi)', async done => {
        const publisher = new TestPublisher();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        publisher.on(['message', 'multi'], stub.onCallback);

        await publisher.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await publisher.trigger('multi', 10, 'good morning', true);
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'good morning', true);

        expect(count).toBe(2);

        done();
    });

    it('check on(*)', async done => {
        const publisher = new TestPublisher();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        publisher.on('*', stub.onCallback);

        await publisher.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('message', 'hello');

        await publisher.trigger('multi', 10, 'good morning', true);
        expect(stub.onCallback).toHaveBeenCalledWith('multi', 10, 'good morning', true);

        await publisher.trigger('*', 'any', 'any', 'any');
        expect(stub.onCallback).toHaveBeenCalledWith('any', 'any', 'any');

        expect(count).toBe(3);

        done();
    });

    it('check subscription', async done => {
        const publisher = new TestPublisher();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = publisher.on(['message', 'multi'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();

        await publisher.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(subscription.enable).toBeTruthy();

        subscription.unsubscribe();
        expect(subscription.enable).toBeFalsy();

        await publisher.trigger('multi', 10, 'good morning', true);
        expect(stub.onCallback).not.toHaveBeenCalledWith(10, 'good morning', true);

        expect(count).toBe(1);

        done();
    });

    it('check off(single)', async done => {
        const publisher = new TestPublisher();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        publisher.on('message', stub.onCallback);
        publisher.on('simple', stub.onCallback);
        await publisher.trigger('message', 'hello');
        await publisher.trigger('simple', 1);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(1);
        expect(count).toBe(2);

        publisher.off('message', stub.onCallback);
        await publisher.trigger('message', 'good morning');
        await publisher.trigger('simple', 2);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(2);
        expect(count).toBe(3);

        publisher.off('simple');
        await publisher.trigger('message', 'good evening');
        await publisher.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good evening');
        expect(stub.onCallback).not.toHaveBeenCalledWith(3);
        expect(count).toBe(3);

        done();
    });

    it('check off(multi)', async done => {
        const publisher = new TestPublisher();
        const error1 = new Error('error1');
        const error2 = new Error('error2');
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        publisher.on(['message', 'multi', 'simple', 'error'], stub.onCallback);
        await publisher.trigger('message', 'hello');
        await publisher.trigger('multi', 10, 'multi', true);
        await publisher.trigger('simple', 1);
        await publisher.trigger('error', error1);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(1);
        expect(stub.onCallback).toHaveBeenCalledWith(error1);

        publisher.off(['message', 'error'], stub.onCallback);
        await publisher.trigger('message', 'good morning');
        await publisher.trigger('multi', 20, 'multi', true);
        await publisher.trigger('simple', 2);
        await publisher.trigger('error', error2);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(20, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(2);
        expect(stub.onCallback).not.toHaveBeenCalledWith(error2);

        publisher.off(['multi'], stub.onCallback);
        await publisher.trigger('multi', 30, 'multi', true);
        await publisher.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalledWith(30, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(3);

        publisher.off(['simple']);
        await publisher.trigger('simple', 4);
        expect(stub.onCallback).not.toHaveBeenCalledWith(4);

        expect(count).toBe(7);

        done();
    });

    it('check once(single)', async done => {
        const publisher = new TestPublisher();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = publisher.once('message', stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await publisher.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await publisher.trigger('message', 'good morning');
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        done();
    });

    it('check once(multi)', async done => {
        const publisher = new TestPublisher();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = publisher.once(['message', 'multi'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await publisher.trigger('multi', 10, 'multi', true);
        await publisher.trigger('message', 'hello');
        expect(stub.onCallback).not.toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'multi', true);

        await publisher.trigger('multi', 20, 'multi', true);
        expect(stub.onCallback).not.toHaveBeenCalledWith(20, 'multi', true);
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        done();
    });

    it('check query event', () => {
        interface QueryEvent {
            'query-eldest': { name: string; };
        }
        const publisher = new class extends EventPublisher<QueryEvent> {
            public queryEldest(): string {
                const event = { name: '' };
                this.publish('query-eldest', event);
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

        publisher.on('query-eldest', bigbrother.onQuery);
        publisher.on('query-eldest', youngbrother.onQuery);

        const eldest = publisher.queryEldest();

        expect(eldest).toBe('I am big brother.');
        expect(bigbrother.onQuery).toHaveBeenCalled();
        expect(youngbrother.onQuery).not.toHaveBeenCalled();
    });

    it('check broker', async () => {
        const broker = new EventBroker<TestEvent>();
        const stub2 = { onCallback };
        spyOn(stub2, 'onCallback').and.callThrough();
        broker.on('message', stub2.onCallback);

        await (async () => broker.trigger('message', 'hello'))();
        expect(stub2.onCallback).toHaveBeenCalledWith('hello');

        const { trigger } = broker;
        expect(() => trigger('message', 'good morning')).toThrow(new TypeError('This is not a valid EventPublisher.'));
    });

    it('check advanced', async () => {
        const publisher = new TestPublisher();
        const error = new Error('error');
        const stub = {
            onCallback() {
                count++;
                throw error;
            },
        };
        spyOn(stub, 'onCallback').and.callThrough();

        publisher.on('message', stub.onCallback);

        expect(async () => await publisher.trigger('message', 'hello')).not.toThrow();
        expect(stub.onCallback).toHaveBeenCalled();
        expect(count).toBe(1);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => publisher.on(null as any, stub.onCallback)).toThrow(new TypeError('Type of Null is not a valid channel.'));
    });
});
