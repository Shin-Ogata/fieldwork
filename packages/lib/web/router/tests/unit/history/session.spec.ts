/*
 eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { UnknownFunction, post } from '@cdp/core-utils';
import { webRoot, waitFrame } from '@cdp/web-utils';
import {
    IHistory,
    createSessionHistory,
    resetSessionHistory,
    disposeSessionHistory,
} from '@cdp/router';
import { prepareIFrameElements, cleanupTestElements } from '../tools';

// history をリセット
const resetHistory = async (root: Window = window): Promise<void> => {
    const { history, location } = root;
    let backCount = history.length - 1;
    while (0 <= backCount--) {
        history.back();
        await waitFrame();
    }
    const { origin, pathname, search } = location;
    history.replaceState({ baseOrigin: true }, '', `${origin}${pathname}${search}`);
};

describe('router/history/session spec', () => {
    let count: number;
    const onCallback = (...args: any[]): void => { // eslint-disable-line @typescript-eslint/no-unused-vars
        count++;
//      console.log(`received: ${JSON.stringify([...args])} \n`);
    };

    const preparePackedHistory = (stub?: { onCallback: UnknownFunction; }): IHistory => {
        const instance = createSessionHistory('one', { index: 0 });
        void instance.push('two',    { index: 1 }, { silent: true });
        void instance.push('three',  { index: 2 }, { silent: true });
        void instance.push('four',   { index: 3 }, { silent: true });
        void instance.push('five',   { index: 4 }, { silent: true });

        if (stub) {
            spyOn(stub, 'onCallback').and.callThrough();
            instance.on('update', stub.onCallback);
            instance.on('change', stub.onCallback);
        }

        return instance;
    };

    beforeEach(() => {
        count = 0;
    });

    afterEach(async () => {
        cleanupTestElements();
        await resetHistory();
    });

    it('check instance', () => {
        const instance = createSessionHistory('one');
        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state['@id']).toBe('one');
        expect(instance.stack).toBeDefined();
        disposeSessionHistory(instance);
    });

    it('check no hash', async () => {
        const instance = createSessionHistory('');
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

        disposeSessionHistory(instance);
    });

    it('check other window', async () => {
        const iframe = await prepareIFrameElements();
        const instance = createSessionHistory('iframe', { from: 'iframe' }, { context: iframe.contentWindow as Window });
        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('iframe');
        expect(instance.state).toEqual({ from: 'iframe',  '@id': 'iframe', '@origin': true });
        disposeSessionHistory(instance);
        await resetHistory(iframe.contentWindow as Window);
    });

    it('check SessionHistory#push()', async () => {
        const instance = createSessionHistory('/one'); // auto remove '/'
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        instance.on('update', stub.onCallback);
        instance.on('change', stub.onCallback);

        await instance.push('two', { from: 'push' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', '@id': 'two' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', '@id': 'two' }, { '@id': 'one', '@origin': true });

        await instance.push('three');
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'three' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'three' }, { from: 'push', '@id': 'two' });

        await instance.push('three', { from: 'push(update)' }, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ from: 'push(uqpdate)', '@id': 'three' });

        expect(instance.length).toBe(4);
        expect(instance.index).toBe(3);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ from: 'push(update)', '@id': 'three' });

        expect(count).toBe(4);

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#replace()', async () => {
        const instance = createSessionHistory('#one');  // auto remove '#'
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        instance.on('update', stub.onCallback);
        instance.on('change', stub.onCallback);

        await instance.replace('two', { from: 'replace' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', '@id': 'two', '@origin': true }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', '@id': 'two', '@origin': true }, { '@id': 'one', '@origin': true });

        await instance.replace('three');
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'three', '@origin': true }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'three', '@origin': true }, { from: 'replace', '@id': 'two', '@origin': true });

        await instance.replace('three', { from: 'replace(update)' }, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ from: 'replace(update)', '@id': 'three', '@origin': true }, jasmine.any(Function));

        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ from: 'replace(update)', '@id': 'three', '@origin': true });

        expect(count).toBe(4);

        disposeSessionHistory(instance);
    });

    it('check resetSessionHistory()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        await resetSessionHistory(instance);
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, { index: 4, '@id': 'five' });
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });
        expect(instance.length).toBe(1);

        expect(async () => await resetSessionHistory(instance)).not.toThrow();
        disposeSessionHistory(instance);
        expect(async () => await resetSessionHistory(instance)).not.toThrow();
    });

    it('check resetSessionHistory(silent)', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        await resetSessionHistory(instance, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, { index: 4, '@id': 'five' });
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });
        expect(instance.length).toBe(1);

        expect(async () => await resetSessionHistory(instance)).not.toThrow();
        disposeSessionHistory(instance);
        expect(async () => await resetSessionHistory(instance)).not.toThrow();
    });

    it('check SessionHistory#at()', () => {
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

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#back()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);

        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        let index = await instance.back();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, '@id': 'four' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, '@id': 'four' }, { index: 4, '@id': 'five' });
        expect(index).toBe(3);
        expect(instance.id).toBe('four');
        expect(instance.state).toEqual({ index: 3, '@id': 'four' });

        history.back();
        await waitFrame();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, '@id': 'three' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, '@id': 'three' }, { index: 3, '@id': 'four' });
        expect(instance.index).toBe(2);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        index = await instance.back();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, '@id': 'two' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, '@id': 'two' }, { index: 2, '@id': 'three' });
        expect(index).toBe(1);
        expect(instance.id).toBe('two');
        expect(instance.state).toEqual({ index: 1, '@id': 'two' });

        history.back();
        await waitFrame();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, { index: 1, '@id': 'two' });
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });

        index = await instance.back();
        expect(index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#forward()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory();

        await instance.go(-4);

        spyOn(stub, 'onCallback').and.callThrough();
        instance.on('update', stub.onCallback);
        instance.on('change', stub.onCallback);

        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });

        let index = await instance.forward();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, '@id': 'two' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, '@id': 'two' }, { index: 0, '@id': 'one', '@origin': true });
        expect(index).toBe(1);
        expect(instance.id).toBe('two');
        expect(instance.state).toEqual({ index: 1, '@id': 'two' });

        history.forward();
        await waitFrame();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, '@id': 'three' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, '@id': 'three' }, { index: 1, '@id': 'two' });
        expect(instance.index).toBe(2);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        index = await instance.forward();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, '@id': 'four' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, '@id': 'four' }, { index: 2, '@id': 'three' });
        expect(index).toBe(3);
        expect(instance.id).toBe('four');
        expect(instance.state).toEqual({ index: 3, '@id': 'four' });

        history.forward();
        await waitFrame();
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 4, '@id': 'five' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 4, '@id': 'five' }, { index: 3, '@id': 'four' });
        expect(instance.index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        index = await instance.forward();
        await waitFrame();
        expect(index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#go(0)', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);

        const index = await instance.go();
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 4 });
        expect(index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#clearForward()', async () => {
        const instance = preparePackedHistory();
        await instance.go(-2);

        expect(instance.length).toBe(5);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        instance.clearForward();

        expect(instance.length).toBe(3);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#closest()', () => {
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

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#direct()', async () => {
        const instance = createSessionHistory('origin', { index: 0 });
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

        disposeSessionHistory(instance);
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
        instance.on('update', cancelCallback);
        instance.on('change', stub.onCallback);

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

        await resetSessionHistory(instance);
        expect(instance.id).toBe('one');

        expect(stub.onCallback).not.toHaveBeenCalled();

        disposeSessionHistory(instance);
    });

    it('check illegal hash change', async () => {
        const waitForHashChange = (): Promise<void> => {
            return new Promise(resolve => {
                addEventListener('hashchange', () => {
                    void post(resolve);
                });
            });
        };

        const stub = { onCallback };
        const instance = preparePackedHistory(stub);

        let promise = waitForHashChange();
        location.hash = 'illegal';
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'illegal' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'illegal' }, { index: 4, '@id': 'five' });
        expect(instance.id).toBe('illegal');
        expect(instance.state).toEqual({ '@id': 'illegal' });
        expect(instance.length).toBe(6);

        promise = waitForHashChange();
        const { href } = location;
        dispatchEvent(new HashChangeEvent('hashchange', { newURL: href, oldURL: href }));
        await promise;

        expect(count).toBe(2);

        disposeSessionHistory(instance);
    });

    it('check history mode', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const iframe = await prepareIFrameElements();
        const { location, history } = iframe.contentWindow as Window;
        history.replaceState(null, '', webRoot);

        const instance = createSessionHistory('', { from: 'iframe' }, { context: iframe.contentWindow as Window, mode: 'history' });
        instance.on('update', stub.onCallback);
        instance.on('change', stub.onCallback);

        expect(location.href).toBe(webRoot);

        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('');
        expect(instance.state).toEqual({ from: 'iframe',  '@id': '', '@origin': true });

        await instance.replace('', { from: 'replace' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', '@id': '', '@origin': true }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', '@id': '', '@origin': true }, { from: 'iframe',  '@id': '', '@origin': true });

        expect(location.href).toBe(webRoot);

        await instance.push('history/two', { from: 'push' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', '@id': 'history/two' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', '@id': 'history/two' }, { from: 'replace',  '@id': '', '@origin': true });

        expect(location.href).toBe(`${webRoot}history/two`);

        disposeSessionHistory(instance);
        await resetHistory(iframe.contentWindow as Window);
    });
});
