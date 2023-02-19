/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { UnknownFunction } from '@cdp/core-utils';
import { Deferred } from '@cdp/promise';
import {
    IHistory,
    createMemoryHistory,
    resetMemoryHistory,
    disposeMemoryHistory,
} from '@cdp/router';

describe('router/history/memory spec', () => {
    let count: number;
    const onCallback = (...args: any[]): void => { // eslint-disable-line @typescript-eslint/no-unused-vars
        count++;
//      console.log(`received: ${JSON.stringify([...args])} \n`);
    };

    const preparePackedHistory = (stub?: { onCallback: UnknownFunction; }): IHistory => {
        const instance = createMemoryHistory('one', { index: 0 });
        void instance.push('two',    { index: 1 }, { silent: true });
        void instance.push('three',  { index: 2 }, { silent: true });
        void instance.push('four',   { index: 3 }, { silent: true });
        void instance.push('five',   { index: 4 }, { silent: true });

        if (stub) {
            spyOn(stub, 'onCallback').and.callThrough();
            instance.on('changing', stub.onCallback);
            instance.on('refresh', stub.onCallback);
        }

        return instance;
    };

    beforeEach(() => {
        count = 0;
    });

    it('check instance', () => {
        const instance = createMemoryHistory('one');
        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state['@id']).toBe('one');
        expect(instance.stack).toBeDefined();
        disposeMemoryHistory(instance);
    });

    it('check empty string', async () => {
        const instance = createMemoryHistory('');
        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('');
        expect(instance.state).toEqual({ '@id': '', '@origin': true });

        await instance.replace('', { from: 'replace' });
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('');
        expect(instance.state).toEqual({ from: 'replace', '@id': '', '@origin': true });

        disposeMemoryHistory(instance);
    });

    it('check MemoryHistory#push()', async () => {
        const instance = createMemoryHistory('/one'); // auto remove '/'
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        instance.on('changing', stub.onCallback);
        instance.on('refresh', stub.onCallback);

        await instance.push('two', { from: 'push' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', '@id': 'two' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', '@id': 'two' }, { '@id': 'one', '@origin': true }, []);

        await instance.push('three');
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'three' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'three' }, { from: 'push', '@id': 'two' }, []);

        await instance.push('three', { from: 'push(update)' }, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ from: 'push(uqpdate)', '@id': 'three' });

        expect(instance.length).toBe(4);
        expect(instance.index).toBe(3);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ from: 'push(update)', '@id': 'three' });

        expect(count).toBe(4);

        disposeMemoryHistory(instance);
    });

    it('check MemoryHistory#replace()', async () => {
        const instance = createMemoryHistory('#one');  // auto remove '#'
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        instance.on('changing', stub.onCallback);
        instance.on('refresh', stub.onCallback);

        await instance.replace('two', { from: 'replace' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', '@id': 'two', '@origin': true }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', '@id': 'two', '@origin': true }, { '@id': 'one', '@origin': true }, []);

        await instance.replace('three');
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'three', '@origin': true }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'three', '@origin': true }, { from: 'replace', '@id': 'two', '@origin': true }, []);

        await instance.replace('three', { from: 'replace(update)' }, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ from: 'replace(update)', '@id': 'three', '@origin': true }, jasmine.any(Function));

        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ from: 'replace(update)', '@id': 'three', '@origin': true });

        expect(count).toBe(4);

        disposeMemoryHistory(instance);
    });

    it('check resetMemoryHistory()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        await resetMemoryHistory(instance);
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, { index: 4, '@id': 'five' }, []);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });
        expect(instance.length).toBe(1);

        expect(async () => await resetMemoryHistory(instance)).not.toThrow();
        disposeMemoryHistory(instance);
        expect(async () => await resetMemoryHistory(instance)).not.toThrow();
    });

    it('check resetMemoryHistory(silent)', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        await resetMemoryHistory(instance, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, { index: 4, '@id': 'five' }, []);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });
        expect(instance.length).toBe(1);

        expect(async () => await resetMemoryHistory(instance)).not.toThrow();
        disposeMemoryHistory(instance);
        expect(async () => await resetMemoryHistory(instance)).not.toThrow();
    });

    it('check MemoryHistory#at()', () => {
        const instance = preparePackedHistory();

        expect(instance.at(4)).toEqual({ index: 4, '@id': 'five' });
        expect(instance.at(3)).toEqual({ index: 3, '@id': 'four' });
        expect(instance.at(2)).toEqual({ index: 2, '@id': 'three' });
        expect(instance.at(1)).toEqual({ index: 1, '@id': 'two' });
        expect(instance.at(0)).toEqual({ index: 0, '@id': 'one', '@origin': true });
        // reverse access
        expect(instance.at(-1)).toEqual({ index: 4, '@id': 'five' });
        // range-error
        expect(() => instance.at(5)).toThrow(new RangeError('invalid array index. [length: 5, given: 5]'));

        disposeMemoryHistory(instance);
    });

    it('check MemoryHistory#back()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);

        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        expect(instance.canBack).toBe(true);
        let index = await instance.back();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, '@id': 'four' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, '@id': 'four' }, { index: 4, '@id': 'five' }, []);
        expect(index).toBe(3);
        expect(instance.id).toBe('four');
        expect(instance.state).toEqual({ index: 3, '@id': 'four' });

        expect(instance.canBack).toBe(true);
        await instance.back();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, '@id': 'three' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, '@id': 'three' }, { index: 3, '@id': 'four' }, []);
        expect(instance.index).toBe(2);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        expect(instance.canBack).toBe(true);
        index = await instance.back();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, '@id': 'two' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, '@id': 'two' }, { index: 2, '@id': 'three' }, []);
        expect(index).toBe(1);
        expect(instance.id).toBe('two');
        expect(instance.state).toEqual({ index: 1, '@id': 'two' });

        expect(instance.canBack).toBe(true);
        await instance.back();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, { index: 1, '@id': 'two' }, []);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });

        expect(instance.canBack).toBe(false);
        index = await instance.back();
        expect(index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });

        disposeMemoryHistory(instance);
    });

    it('check MemoryHistory#forward()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory();

        await instance.go(-4);

        spyOn(stub, 'onCallback').and.callThrough();
        instance.on('changing', stub.onCallback);
        instance.on('refresh', stub.onCallback);

        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });

        expect(instance.canForward).toBe(true);
        let index = await instance.forward();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, '@id': 'two' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, '@id': 'two' }, { index: 0, '@id': 'one', '@origin': true }, []);
        expect(index).toBe(1);
        expect(instance.id).toBe('two');
        expect(instance.state).toEqual({ index: 1, '@id': 'two' });

        expect(instance.canForward).toBe(true);
        await instance.forward();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, '@id': 'three' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, '@id': 'three' }, { index: 1, '@id': 'two' }, []);
        expect(instance.index).toBe(2);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        expect(instance.canForward).toBe(true);
        index = await instance.forward();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, '@id': 'four' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, '@id': 'four' }, { index: 2, '@id': 'three' }, []);
        expect(index).toBe(3);
        expect(instance.id).toBe('four');
        expect(instance.state).toEqual({ index: 3, '@id': 'four' });

        expect(instance.canForward).toBe(true);
        await instance.forward();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 4, '@id': 'five' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 4, '@id': 'five' }, { index: 3, '@id': 'four' }, []);
        expect(instance.index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        expect(instance.canForward).toBe(false);
        await instance.forward();
        expect(instance.index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        disposeMemoryHistory(instance);
    });

    it('check MemoryHistory#go(0)', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);

        const index = await instance.go();
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 4 });
        expect(index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        disposeMemoryHistory(instance);
    });

    it('check MemoryHistory#traverseTo()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);

        let index = await instance.traverseTo('three');
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 2 });
        expect(index).toBe(2);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        index = await instance.traverseTo('zero');
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 2 });
        expect(index).toBe(2);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        disposeMemoryHistory(instance);
    });

    it('check MemoryHistory#clearForward()', async () => {
        const instance = preparePackedHistory();
        await instance.go(-2);

        expect(instance.length).toBe(5);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        instance.clearForward();

        expect(instance.length).toBe(3);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        disposeMemoryHistory(instance);
    });

    it('check MemoryHistory#closest()', () => {
        const instance = preparePackedHistory();

        let index = instance.closest('one');
        expect(index).toBe(0);
        index = instance.closest('two');
        expect(index).toBe(1);
        index = instance.closest('three');
        expect(index).toBe(2);
        index = instance.closest('four');
        expect(index).toBe(3);
        index = instance.closest('five');
        expect(index).toBe(4);

        index = instance.closest('zero');
        expect(index).toBeUndefined();

        disposeMemoryHistory(instance);
    });

    it('check MemoryHistory#direct()', async () => {
        const instance = createMemoryHistory('origin', { index: 0 });
        void instance.push('target', { index: 1 }, { silent: true });
        void instance.push('base1',  { index: 2 }, { silent: true });
        void instance.push('base2',  { index: 3 }, { silent: true });
        void instance.push('target', { index: 4 }, { silent: true });
        void instance.push('temp',   { index: 5 }, { silent: true });
        void instance.push('origin', { index: 6 }, { silent: true });

        await instance.go(-4);
        expect(instance.id).toBe('base1');

        let result = instance.direct('origin');
        expect(result.index).toBe(0);
        expect(result.direction).toBe('back');
        expect(result.state?.['@id']).toBe('origin');
        expect(result.state?.index).toBe(0);

        result = instance.direct('target');
        expect(result.index).toBe(1);
        expect(result.direction).toBe('back');
        expect(result.state?.['@id']).toBe('target');
        expect(result.state?.index).toBe(1);

        result = instance.direct('base1');
        expect(result.index).toBe(2);
        expect(result.direction).toBe('none');
        expect(result.state?.['@id']).toBe('base1');
        expect(result.state?.index).toBe(2);

        await instance.forward();
        expect(instance.id).toBe('base2');

        result = instance.direct('target');
        expect(result.index).toBe(4);
        expect(result.direction).toBe('forward');
        expect(result.state?.['@id']).toBe('target');
        expect(result.state?.index).toBe(4);

        result = instance.direct('origin');
        expect(result.index).toBe(0);
        expect(result.direction).toBe('back'); // back 優先
        expect(result.state?.['@id']).toBe('origin');
        expect(result.state?.index).toBe(0);

        result = instance.direct('invalid');
        expect(result.index).toBeUndefined();
        expect(result.direction).toBe('missing');
        expect(result.state).toBeUndefined();

        disposeMemoryHistory(instance);
    });

    it('check cancellation', async () => {
        const cancelCallback = (nextState: any, cancel: (reason?: unknown) => void): boolean => {
            cancel('[test] changing not allowed');
            return true;
        };

        const stub = { onCallback };

        const instance = preparePackedHistory();
        await instance.go(-2);
        expect(instance.id).toBe('three');

        spyOn(stub, 'onCallback').and.callThrough();
        instance.on('changing', cancelCallback);
        instance.on('refresh', stub.onCallback);

        await instance.back();
        expect(instance.id).toBe('three');

        await instance.forward();
        expect(instance.id).toBe('three');

        try {
            await instance.push('push/cancel', { from: 'push' });
        } catch (e) {
            expect(e).toBe('[test] changing not allowed');
            expect(instance.id).toBe('three');
        }

        try {
            await instance.replace('replace/cancel', { from: 'replace' });
        } catch (e) {
            expect(e).toBe('[test] changing not allowed');
            expect(instance.id).toBe('three');
            expect(instance.state).toEqual({ index: 2, '@id': 'three' });
        }

        await resetMemoryHistory(instance);
        expect(instance.id).toBe('one');

        expect(stub.onCallback).not.toHaveBeenCalled();

        disposeMemoryHistory(instance);
    });

    it('check wait for client in refresh event', async () => {
        const df = new Deferred();
        const refreshCallback = (nextState: any, oldState: any, promises: Promise<unknown>[]): void => {
            promises.push(df);
        };

        const instance = await preparePackedHistory();
        await instance.go(-2);
        expect(instance.id).toBe('three');

        instance.on('refresh', refreshCallback);

        const promise = instance.back();
        expect(instance.id).toBe('three');

        df.resolve();
        await promise;

        expect(instance.id).toBe('two');

        disposeMemoryHistory(instance);
    });
});
