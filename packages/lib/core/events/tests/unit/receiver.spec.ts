/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method, @typescript-eslint/no-empty-function */

import { EventBroker, EventRevceiver } from '@cdp/events';

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

const broker = new EventBroker<TestEvent>();

/* eslint-disable @typescript-eslint/no-unused-vars */
const checkCompile = new EventRevceiver();
checkCompile.stopListening();
checkCompile.stopListening(broker, 'error', () => { });
checkCompile.stopListening(broker, 'error', (e: Error) => { });
checkCompile.listenTo(broker, 'error', () => { });
checkCompile.listenTo(broker, 'error', (e: Error) => { });
checkCompile.listenTo(broker, ['error', 'message', 'multi'], () => { });
checkCompile.listenTo(broker, ['error', 'message'], (hoge: Error | string) => { });
/* eslint-enable @typescript-eslint/no-unused-vars */

describe('events/receiver spec', () => {

    let count: number;

    beforeEach(() => {
        count = 0;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const onCallback = (...args: any[]): void => {
        count++;
    };

    it('check listenTo(single)', async (done) => {
        const receiver = new EventRevceiver();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        receiver.listenTo(broker, 'message', stub.onCallback);

        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await broker.trigger('message', 'good morning');
        expect(stub.onCallback).toHaveBeenCalledWith('good morning');

        expect(count).toBe(2);

        receiver.stopListening();
        done();
    });

    it('check listenTo(multi)', async (done) => {
        const receiver = new EventRevceiver();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        receiver.listenTo(broker, ['message', 'multi'], stub.onCallback);

        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await broker.trigger('multi', 10, 'good morning', true);
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'good morning', true);

        expect(count).toBe(2);

        receiver.stopListening();
        done();
    });

    it('check subscription', async (done) => {
        const receiver = new EventRevceiver();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = receiver.listenTo(broker, ['message', 'multi'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();

        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(subscription.enable).toBeTruthy();

        subscription.unsubscribe();
        expect(subscription.enable).toBeFalsy();

        await broker.trigger('multi', 10, 'good morning', true);
        expect(stub.onCallback).not.toHaveBeenCalledWith(10, 'good morning', true);

        expect(count).toBe(1);

        receiver.stopListening();
        done();
    });

    it('check stopListening(single)', async (done) => {
        const receiver = new EventRevceiver();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        receiver.listenTo(broker, 'message', stub.onCallback);
        receiver.listenTo(broker, 'simple', stub.onCallback);
        await broker.trigger('message', 'hello');
        await broker.trigger('simple', 1);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(1);
        expect(count).toBe(2);

        receiver.stopListening(broker, 'message', stub.onCallback);
        await broker.trigger('message', 'good morning');
        await broker.trigger('simple', 2);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(2);
        expect(count).toBe(3);

        receiver.stopListening(broker, 'simple');
        await broker.trigger('message', 'good evening');
        await broker.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good evening');
        expect(stub.onCallback).not.toHaveBeenCalledWith(3);
        expect(count).toBe(3);

        receiver.stopListening();
        done();
    });

    it('check stopListening(multi)', async (done) => {
        const receiver = new EventRevceiver();
        const error1 = new Error('error1');
        const error2 = new Error('error2');
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        receiver.listenTo(broker, ['message', 'multi', 'simple', 'error'], stub.onCallback);
        await broker.trigger('message', 'hello');
        await broker.trigger('multi', 10, 'multi', true);
        await broker.trigger('simple', 1);
        await broker.trigger('error', error1);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(1);
        expect(stub.onCallback).toHaveBeenCalledWith(error1);

        receiver.stopListening(broker, ['message', 'error'], stub.onCallback);
        await broker.trigger('message', 'good morning');
        await broker.trigger('multi', 20, 'multi', true);
        await broker.trigger('simple', 2);
        await broker.trigger('error', error2);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(20, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(2);
        expect(stub.onCallback).not.toHaveBeenCalledWith(error2);

        receiver.stopListening(broker, ['multi'], stub.onCallback);
        await broker.trigger('multi', 30, 'multi', true);
        await broker.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalledWith(30, 'multi', true);
        expect(stub.onCallback).toHaveBeenCalledWith(3);

        receiver.stopListening(broker, ['simple']);
        await broker.trigger('simple', 4);
        expect(stub.onCallback).not.toHaveBeenCalledWith(4);

        expect(count).toBe(7);

        receiver.stopListening();
        done();
    });

    it('check stopListening(variation)', async (done) => {
        const receiver = new EventRevceiver();
        const stub = { onCallback };
        const broker2 = new EventBroker<TestEvent>();
        const stub2 = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();
        spyOn(stub2, 'onCallback').and.callThrough();

        receiver.listenTo(broker, 'message', stub.onCallback);
        receiver.listenTo(broker, 'message', stub2.onCallback);
        receiver.listenTo(broker, 'void', stub.onCallback);
        receiver.listenTo(broker2, 'multi', stub2.onCallback);
        receiver.listenTo(broker2, 'simple', stub2.onCallback);

        receiver.stopListening(broker, 'message');
        await broker.trigger('message', 'good morning');
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(stub2.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);

        receiver.stopListening(broker2);
        await broker.trigger('multi', 30, 'multi', true);
        await broker.trigger('simple', 3);
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(stub2.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);

        expect(() => receiver.stopListening(broker, 'error')).not.toThrow();
        expect(() => receiver.stopListening(broker, 'void', () => {})).not.toThrow();

        receiver.stopListening();
        done();
    });

    it('check listenToOnce(single)', async (done) => {
        const receiver = new EventRevceiver();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = receiver.listenToOnce(broker, 'message', stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await broker.trigger('message', 'good morning');
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        receiver.stopListening();
        done();
    });

    it('check listenToOnce(multi)', async (done) => {
        const receiver = new EventRevceiver();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = receiver.listenToOnce(broker, ['message', 'multi'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await broker.trigger('multi', 10, 'multi', true);
        await broker.trigger('message', 'hello');
        expect(stub.onCallback).not.toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(10, 'multi', true);

        await broker.trigger('multi', 20, 'multi', true);
        expect(stub.onCallback).not.toHaveBeenCalledWith(20, 'multi', true);
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        receiver.stopListening();
        done();
    });
});
