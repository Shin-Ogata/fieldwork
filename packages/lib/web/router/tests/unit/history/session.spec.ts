/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import {
    PlainObject,
    UnknownFunction,
    post,
} from '@cdp/core-utils';
import { Deferred } from '@cdp/promise';
import { webRoot } from '@cdp/web-utils';
import {
    IHistory,
    createSessionHistory,
    resetSessionHistory,
    disposeSessionHistory,
} from '@cdp/router';
import { prepareIFrameElements, cleanupTestElements } from '../tools';

// window 取得
const getWindow = (instance: IHistory): Window => {
    return (instance as any)._window as Window;
};

const waitFrame = async (instance: IHistory, frameCount = 1): Promise<void> => {
    const { requestAnimationFrame } = getWindow(instance); // eslint-disable-line @typescript-eslint/unbound-method
    while (frameCount-- > 0) {
        await new Promise<void>(requestAnimationFrame as UnknownFunction);
    }
};

const WAIT_FRAME_MARGINE = 5;

// history をリセット
const resetHistory = async (instance: IHistory): Promise<void> => {
    const { history, location } = getWindow(instance);
    let backCount = history.length - 1;
    while (0 <= backCount--) {
        history.back();
        await waitFrame(instance);
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

    const preparePackedHistory = async (stub?: { onCallback: UnknownFunction; }, type: 'iframe' | 'window' = 'iframe'): Promise<IHistory> => {
        let context: Window = window;
        if ('iframe' === type) {
            const iframe = await prepareIFrameElements();
            const { history } = iframe.contentWindow as Window;
            history.replaceState(null, '', webRoot);
            context = iframe.contentWindow as Window;
        }

        const instance = createSessionHistory('one', { index: 0 }, { context });
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

    afterEach(() => {
        cleanupTestElements();
    });

    it('check instance', async () => {
        const instance = createSessionHistory('one');
        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state['@id']).toBe('one');
        expect(instance.stack).toBeDefined();
        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check no hash', async () => {
        const iframe = await prepareIFrameElements();
        const { history } = iframe.contentWindow as Window;
        history.replaceState(null, '', webRoot);
        const instance = createSessionHistory<PlainObject>('', undefined, { context: iframe.contentWindow as Window });

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
        await resetHistory(instance);
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
        await resetHistory(instance);
    });

    it('check SessionHistory#push()', async () => {
        const iframe = await prepareIFrameElements();
        const { history } = iframe.contentWindow as Window;
        history.replaceState(null, '', webRoot);
        // auto remove '/'
        const instance = createSessionHistory<PlainObject>('/one/', undefined, { context: iframe.contentWindow as Window });

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
        expect(stub.onCallback).not.toHaveBeenCalledWith({ from: 'push(uqpdate)', '@id': 'three' }, jasmine.any(Function));
        expect(stub.onCallback).not.toHaveBeenCalledWith({ from: 'push(uqpdate)', '@id': 'three' }, { '@id': 'two' }, []);

        expect(instance.length).toBe(4);
        expect(instance.index).toBe(3);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ from: 'push(update)', '@id': 'three' });

        expect(count).toBe(4);

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check SessionHistory#replace()', async () => {
        const iframe = await prepareIFrameElements();
        const { history } = iframe.contentWindow as Window;
        history.replaceState(null, '', webRoot);
        // auto remove '#'
        const instance = createSessionHistory<PlainObject>('#one', undefined, { context: iframe.contentWindow as Window });

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
        expect(stub.onCallback).not.toHaveBeenCalledWith({ from: 'replace(update)', '@id': 'three', '@origin': true }, jasmine.any(Function), []);

        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ from: 'replace(update)', '@id': 'three', '@origin': true });

        expect(count).toBe(4);

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check resetSessionHistory()', async () => {
        const stub = { onCallback };

        const instance = await preparePackedHistory(stub);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        await resetSessionHistory(instance);
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, { index: 4, '@id': 'five' }, []);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });
        expect(instance.length).toBe(1);

        expect(async () => await resetSessionHistory(instance)).not.toThrow();
        disposeSessionHistory(instance);
        expect(async () => await resetSessionHistory(instance)).not.toThrow();
        await resetHistory(instance);
    });

    it('check resetSessionHistory(silent)', async () => {
        const stub = { onCallback };
        const instance = await preparePackedHistory(stub);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        await resetSessionHistory(instance, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 0, '@id': 'one', '@origin': true }, { index: 4, '@id': 'five' }, []);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, '@id': 'one', '@origin': true });
        expect(instance.length).toBe(1);

        expect(async () => await resetSessionHistory(instance)).not.toThrow();
        disposeSessionHistory(instance);
        expect(async () => await resetSessionHistory(instance)).not.toThrow();
        await resetHistory(instance);
    });

    it('check SessionHistory#at()', async () => {
        const instance = await preparePackedHistory();

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
        await resetHistory(instance);
    });

    it('check SessionHistory#back()', async () => {
        const stub = { onCallback };
        const instance = await preparePackedHistory(stub);
        const { history } = getWindow(instance);

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
        history.back();
        await waitFrame(instance, WAIT_FRAME_MARGINE);
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
        history.back();
        await waitFrame(instance, WAIT_FRAME_MARGINE);
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

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check SessionHistory#forward()', async () => {
        const stub = { onCallback };
        const instance = await preparePackedHistory();
        const { history } = getWindow(instance);

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
        history.forward();
        await waitFrame(instance, WAIT_FRAME_MARGINE);
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
        history.forward();
        await waitFrame(instance, WAIT_FRAME_MARGINE);
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 4, '@id': 'five' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 4, '@id': 'five' }, { index: 3, '@id': 'four' }, []);
        expect(instance.index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        expect(instance.canForward).toBe(false);
        index = await instance.forward();
        await waitFrame(instance, WAIT_FRAME_MARGINE);
        expect(index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check SessionHistory#go(0)', async () => {
        const stub = { onCallback };
        const instance = await preparePackedHistory(stub);

        const index = await instance.go();
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 4 });
        expect(index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, '@id': 'five' });

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check SessionHistory#go() continuous operation guard', async () => {
        const stub = { onCallback };
        const instance = await preparePackedHistory(stub);

        instance.back();
        instance.back();
        instance.back();

        await waitFrame(instance, WAIT_FRAME_MARGINE);
        expect(instance.id).toBe('four');
        expect(instance.state).toEqual({ index: 3, '@id': 'four' });
    });

    it('check SessionHistory#traverseTo()', async () => {
        const stub = { onCallback };
        const instance = await preparePackedHistory(stub);

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

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check SessionHistory#clearForward()', async () => {
        const instance = await preparePackedHistory();
        await instance.go(-2);

        expect(instance.length).toBe(5);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        instance.clearForward();

        expect(instance.length).toBe(3);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, '@id': 'three' });

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check SessionHistory#closest()', async () => {
        const instance = await preparePackedHistory();

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
        await resetHistory(instance);
    });

    it('check SessionHistory#direct()', async () => {
        const iframe = await prepareIFrameElements();
        const { history } = iframe.contentWindow as Window;
        history.replaceState(null, '', webRoot);

        const instance = createSessionHistory<PlainObject>('origin', { index: 0 }, { context: iframe.contentWindow as Window });
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
        await resetHistory(instance);
    });

    it('check cancellation', async () => {
        const cancelCallback = (nextState: any, cancel: (reason?: unknown) => void): boolean => {
            cancel('[test] changing not allowed');
            return true;
        };

        const stub = { onCallback };

        const instance = await preparePackedHistory();
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

        await resetSessionHistory(instance);
        expect(instance.id).toBe('one');

        expect(stub.onCallback).not.toHaveBeenCalled();

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check illegal hash change', async () => {
        const stub = { onCallback };
        const instance = await preparePackedHistory(stub, 'window');
        const wnd = getWindow(instance);

        const waitForHashChange = (): Promise<void> => {
            return new Promise(resolve => {
                wnd.addEventListener('hashchange', () => {
                    void post(resolve);
                });
            });
        };

        let promise = waitForHashChange();
        wnd.location.hash = 'illegal';
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'illegal' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ '@id': 'illegal' }, { index: 4, '@id': 'five' }, []);
        expect(instance.id).toBe('illegal');
        expect(instance.state).toEqual({ '@id': 'illegal' });
        expect(instance.length).toBe(6);

        promise = waitForHashChange();
        const { href } = wnd.location;
        dispatchEvent(new HashChangeEvent('hashchange', { newURL: href, oldURL: href }));
        await promise;

        expect(count).toBe(2);

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });

    it('check history mode', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const iframe = await prepareIFrameElements();
        const { location, history } = iframe.contentWindow as Window;
        history.replaceState(null, '', webRoot);

        const instance = createSessionHistory('', { from: 'iframe' }, { context: iframe.contentWindow as Window, mode: 'history' });
        instance.on('changing', stub.onCallback);
        instance.on('refresh', stub.onCallback);

        expect(location.href).toBe(webRoot);

        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('');
        expect(instance.state).toEqual({ from: 'iframe',  '@id': '', '@origin': true });

        await instance.replace('', { from: 'replace' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', '@id': '', '@origin': true }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', '@id': '', '@origin': true }, { from: 'iframe',  '@id': '', '@origin': true }, []);

        expect(location.href).toBe(webRoot);

        await instance.push('history/two', { from: 'push' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', '@id': 'history/two' }, jasmine.any(Function));
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', '@id': 'history/two' }, { from: 'replace',  '@id': '', '@origin': true }, []);

        expect(location.href).toBe(`${webRoot}history/two`);

        disposeSessionHistory(instance);
        await resetHistory(instance);
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

        disposeSessionHistory(instance);
        await resetHistory(instance);
    });
});
