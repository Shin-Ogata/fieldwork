/*
 eslint-disable
    @typescript-eslint/no-explicit-any
 */

import {
    UnknownFunction,
    post,
    $cdp,
} from '@cdp/core-utils';
import { dom as $ } from '@cdp/dom';
import { prepareIFrameElements, cleanupTestElements } from './tools';
import {
    IHistory,
    createSessionHistory,
    resetSessionHistory,
    disposeSessionHistory,
} from '@cdp/router';

const reflect = (): Promise<void> => {
    return new Promise<void>(requestAnimationFrame as UnknownFunction);
};

// history をリセット. ただし削除はできないため length = 2 となるように初期化する
const resetHistory = async (target = history): Promise<void> => {
    let backCount = target.length - 1;
    while (0 <= backCount--) {
        target.back();
        await reflect();
    }
    target.pushState({ baseOrigin: true }, '', '');
};

describe('router/history spec', () => {
    let count: number;
    const onCallback = (...args: any[]): void => { // eslint-disable-line @typescript-eslint/no-unused-vars
        count++;
//      console.log(`received: ${JSON.stringify([...args])} \n`);
    };

    beforeEach(() => {
        count = 0;
    });

    afterEach(async () => {
        await resetHistory();
    });

    it('check instance', () => {
        const instance = createSessionHistory('one');
        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ [$cdp]: 'one' });
        expect(instance.stack).toBeDefined();
        disposeSessionHistory(instance);
    });

    it('check no hash', () => {
        const instance = createSessionHistory('');
        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('');
        disposeSessionHistory(instance);
    });

    it('check other window', async () => {
        const iframe = await prepareIFrameElements();
        const instance = createSessionHistory('iframe', { from: 'iframe' }, iframe.contentWindow as Window);
        expect(instance).toBeDefined();
        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('iframe');
        expect(instance.state).toEqual({ from: 'iframe',  [$cdp]: 'iframe' });
        disposeSessionHistory(instance);
        await resetHistory(iframe.contentWindow?.history);
    });

    it('check SessionHistory#push()', () => {
        const instance = createSessionHistory('one');
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        instance.on('update', stub.onCallback);
        instance.on('change', stub.onCallback);

        instance.push('two', { from: 'push' });

        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', [$cdp]: 'two' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'push', [$cdp]: 'two' }, { [$cdp]: 'one'  });

        instance.push('three');
        expect(stub.onCallback).toHaveBeenCalledWith({ [$cdp]: 'three' });
        expect(stub.onCallback).toHaveBeenCalledWith({ [$cdp]: 'three' }, { from: 'push', [$cdp]: 'two' });

        instance.push('three', { from: 'push(update)' }, { title: 'ignored', silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ from: 'push(uqpdate)', [$cdp]: 'three' });

        expect(instance.length).toBe(4);
        expect(instance.index).toBe(3);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ from: 'push(update)', [$cdp]: 'three' });

        expect(count).toBe(4);

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#replace()', () => {
        const instance = createSessionHistory('one');
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        instance.on('update', stub.onCallback);
        instance.on('change', stub.onCallback);

        instance.replace('two', { from: 'replace' });

        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', [$cdp]: 'two' });
        expect(stub.onCallback).toHaveBeenCalledWith({ from: 'replace', [$cdp]: 'two' }, { [$cdp]: 'one' });

        instance.replace('three');
        expect(stub.onCallback).toHaveBeenCalledWith({ [$cdp]: 'three' });
        expect(stub.onCallback).toHaveBeenCalledWith({ [$cdp]: 'three' }, { from: 'replace', [$cdp]: 'two' });

        instance.replace('three', { from: 'replace(update)' }, { title: 'ignored', silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ from: 'replace(update)', [$cdp]: 'three' });

        expect(instance.length).toBe(1);
        expect(instance.index).toBe(0);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ from: 'replace(update)', [$cdp]: 'three' });

        expect(count).toBe(4);

        disposeSessionHistory(instance);
    });

    const preparePackedHistory = (stub?: { onCallback: UnknownFunction; }): IHistory => {
        const instance = createSessionHistory('one', { index: 0 });
        instance.push('two',    { index: 1 });
        instance.push('three',  { index: 2 });
        instance.push('four',   { index: 3 });
        instance.push('five',   { index: 4 });

        if (stub) {
            spyOn(stub, 'onCallback').and.callThrough();
            instance.on('update', stub.onCallback);
            instance.on('change', stub.onCallback);
        }

        return instance;
    };

    const waitFor = (event: 'popstate' | 'hashchange'): Promise<void> => {
        return new Promise(resolve => {
            addEventListener(event, () => {
                void post(resolve);
            });
        });
    };

    it('check resetSessionHistory()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, [$cdp]: 'five' });

        await resetSessionHistory(instance);
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, [$cdp]: 'one' }, { index: 4, [$cdp]: 'five' });
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, [$cdp]: 'one' });
        expect(instance.length).toBe(1);

        expect(async () => await resetSessionHistory(instance)).not.toThrow();
        disposeSessionHistory(instance);
        expect(async () => await resetSessionHistory(instance)).not.toThrow();
    });

    it('check resetSessionHistory(silent)', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, [$cdp]: 'five' });

        await resetSessionHistory(instance, { silent: true });
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 0, [$cdp]: 'one' }, { index: 4, [$cdp]: 'five' });
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, [$cdp]: 'one' });
        expect(instance.length).toBe(1);

        expect(async () => await resetSessionHistory(instance)).not.toThrow();
        disposeSessionHistory(instance);
        expect(async () => await resetSessionHistory(instance)).not.toThrow();
    });

    it('check SessionHistory#at()', () => {
        const instance = preparePackedHistory();

        expect(instance.at(4)).toEqual({ index: 4, [$cdp]: 'five' });
        expect(instance.at(3)).toEqual({ index: 3, [$cdp]: 'four' });
        expect(instance.at(2)).toEqual({ index: 2, [$cdp]: 'three' });
        expect(instance.at(1)).toEqual({ index: 1, [$cdp]: 'two' });
        expect(instance.at(0)).toEqual({ index: 0, [$cdp]: 'one' });
        // reverse access
        expect(instance.at(-1)).toEqual({ index: 4, [$cdp]: 'five' });
        // range-error
        expect(() => instance.at(5)).toThrow(new RangeError('invalid array index. [length: 5, given: 5]'));

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#back()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);

        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, [$cdp]: 'five' });

        let promise = waitFor('hashchange');
        let index = instance.back();
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, [$cdp]: 'four' });
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, [$cdp]: 'four' }, { index: 4, [$cdp]: 'five' });
        expect(index).toBe(3);
        expect(instance.id).toBe('four');
        expect(instance.state).toEqual({ index: 3, [$cdp]: 'four' });

        promise = waitFor('hashchange');
        index = instance.back();
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, [$cdp]: 'three' });
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, [$cdp]: 'three' }, { index: 3, [$cdp]: 'four' });
        expect(index).toBe(2);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, [$cdp]: 'three' });

        promise = waitFor('hashchange');
        index = instance.back();
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, [$cdp]: 'two' });
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, [$cdp]: 'two' }, { index: 2, [$cdp]: 'three' });
        expect(index).toBe(1);
        expect(instance.id).toBe('two');
        expect(instance.state).toEqual({ index: 1, [$cdp]: 'two' });

        promise = waitFor('hashchange');
        index = instance.back();
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, [$cdp]: 'one' });
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 0, [$cdp]: 'one' }, { index: 1, [$cdp]: 'two' });
        expect(index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, [$cdp]: 'one' });

        index = instance.back();
        await reflect();
        expect(index).toBe(0);
        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, [$cdp]: 'one' });

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#forward()', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory();

        let promise = waitFor('hashchange');
        instance.go(-4);
        await promise;

        spyOn(stub, 'onCallback').and.callThrough();
        instance.on('update', stub.onCallback);
        instance.on('change', stub.onCallback);

        expect(instance.id).toBe('one');
        expect(instance.state).toEqual({ index: 0, [$cdp]: 'one' });

        promise = waitFor('hashchange');
        let index = instance.forward();
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, [$cdp]: 'two' });
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 1, [$cdp]: 'two' }, { index: 0, [$cdp]: 'one' });
        expect(index).toBe(1);
        expect(instance.id).toBe('two');
        expect(instance.state).toEqual({ index: 1, [$cdp]: 'two' });

        promise = waitFor('hashchange');
        index = instance.forward();
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, [$cdp]: 'three' });
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 2, [$cdp]: 'three' }, { index: 1, [$cdp]: 'two' });
        expect(index).toBe(2);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, [$cdp]: 'three' });

        promise = waitFor('hashchange');
        index = instance.forward();
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, [$cdp]: 'four' });
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 3, [$cdp]: 'four' }, { index: 2, [$cdp]: 'three' });
        expect(index).toBe(3);
        expect(instance.id).toBe('four');
        expect(instance.state).toEqual({ index: 3, [$cdp]: 'four' });

        promise = waitFor('hashchange');
        index = instance.forward();
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith({ index: 4, [$cdp]: 'five' });
        expect(stub.onCallback).toHaveBeenCalledWith({ index: 4, [$cdp]: 'five' }, { index: 3, [$cdp]: 'four' });
        expect(index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, [$cdp]: 'five' });

        index = instance.forward();
        await reflect();
        expect(index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, [$cdp]: 'five' });

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#go(0)', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);

        const index = instance.go();
        await reflect();
        expect(stub.onCallback).not.toHaveBeenCalledWith({ index: 4 });
        expect(index).toBe(4);
        expect(instance.id).toBe('five');
        expect(instance.state).toEqual({ index: 4, [$cdp]: 'five' });

        disposeSessionHistory(instance);
    });

    it('check SessionHistory#clearForward()', async () => {
        const instance = preparePackedHistory();
        const promise = waitFor('hashchange');
        instance.go(-2);
        await promise;

        expect(instance.length).toBe(5);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, [$cdp]: 'three' });

        instance.clearForward();

        expect(instance.length).toBe(3);
        expect(instance.id).toBe('three');
        expect(instance.state).toEqual({ index: 2, [$cdp]: 'three' });

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
        instance.push('target', { index: 1 });
        instance.push('base1',  { index: 2 });
        instance.push('base2',  { index: 3 });
        instance.push('target', { index: 4 });
        instance.push('temp',   { index: 5 });
        instance.push('origin', { index: 6 });

        let promise = waitFor('hashchange');
        instance.go(-4);
        await promise;
        expect(instance.id).toBe('base1');

        let result = instance.direct('origin');
        expect(result.index).toBe(0);
        expect(result.direction).toBe('back');
        expect(result.state?.[$cdp]).toBe('origin');
        expect(result.state).toEqual({ index: 0 } as any);

        result = instance.direct('target');
        expect(result.index).toBe(1);
        expect(result.direction).toBe('back');
        expect(result.state?.[$cdp]).toBe('target');
        expect(result.state).toEqual({ index: 1 } as any);

        result = instance.direct('base1');
        expect(result.index).toBe(2);
        expect(result.direction).toBe('none');
        expect(result.state?.[$cdp]).toBe('base1');
        expect(result.state).toEqual({ index: 2 } as any);

        promise = waitFor('hashchange');
        instance.forward();
        await promise;
        expect(instance.id).toBe('base2');

        result = instance.direct('target');
        expect(result.index).toBe(4);
        expect(result.direction).toBe('forward');
        expect(result.state?.[$cdp]).toBe('target');
        expect(result.state).toEqual({ index: 4 } as any);

        result = instance.direct('origin');
        expect(result.index).toBe(0);
        expect(result.direction).toBe('back'); // back 優先
        expect(result.state?.[$cdp]).toBe('origin');
        expect(result.state).toEqual({ index: 0 } as any);

        result = instance.direct('invalid');
        expect(result.index).toBeUndefined();
        expect(result.direction).toBe('missing');
        expect(result.state).toBeUndefined();

        disposeSessionHistory(instance);
    });

    it('check illegal hash change', async () => {
        const stub = { onCallback };
        const instance = preparePackedHistory(stub);

        let promise = waitFor('hashchange');
        location.hash = 'illegal';
        await promise;

        expect(stub.onCallback).toHaveBeenCalledWith(null);
        expect(stub.onCallback).toHaveBeenCalledWith({ [$cdp]: 'illegal' }, { index: 4, [$cdp]: 'five' });
        expect(instance.id).toBe('illegal');
        expect(instance.state).toEqual({ [$cdp]: 'illegal' });
        expect(instance.length).toBe(6);

        promise = waitFor('hashchange');
        const { href } = location;
        dispatchEvent(new HashChangeEvent('hashchange', { newURL: href, oldURL: href }));
        await promise;

        expect(count).toBe(2);

        disposeSessionHistory(instance);
    });
});

xdescribe('window.history check', () => {
    beforeEach(async () => {
        // noop
    });

    afterEach(async () => {
        cleanupTestElements();
        await resetHistory();
    });

    const getIFrame = (): HTMLIFrameElement => {
        return $('#test-frame')[0] as HTMLIFrameElement;
    };

    const getIFrameWindow = (): Window => {
        return getIFrame().contentWindow as Window;
    };

    const getIFrameHistory = (): History => {
        return getIFrameWindow().history;
    };

    it('check history behaviour', async () => {
        expect(history).toBeDefined();

        const onPopState = (ev: PopStateEvent): void => {
            console.log(`window::onPopState: ${JSON.stringify(ev.state || {})}`);
        };

        const onHashChange = (ev: HashChangeEvent): void => {
            console.log(`window::onHashChange: [new: ${ev.newURL}, old: ${ev.oldURL}`);
        };

        addEventListener('popstate', onPopState);
        addEventListener('hashchange', onHashChange);

        // `pushState()`, `replaceState()` は `popstate`, `hashchange` イベントを発生させないことに注意
        history.pushState({ status: 'one' }, '', '#one');
        history.pushState({ status: 'two' }, '', '#two');
        history.replaceState({ status: 'three' }, '', '#three');
        history.replaceState({ status: 'four' }, '', '#three');

        history.back();
        await reflect();
        history.forward();
        await reflect();
    });

    it('check iframe history behaviour', async () => {
        const iframe = await prepareIFrameElements();
        expect(iframe).toBeDefined();
        const iframeWnd = getIFrameWindow();
        expect(iframeWnd).toBeDefined();
        const iframeHistory = getIFrameHistory();
        expect(iframeHistory).toBeDefined();

        const onPopState = (ev: PopStateEvent): void => {
            console.log(`iframe::onPopState: ${JSON.stringify(ev.state || {})}`);
        };

        const onHashChange = (ev: HashChangeEvent): void => {
            console.log(`iframe::onHashChange: [new: ${ev.newURL}, old: ${ev.oldURL}`);
        };

        iframeWnd.addEventListener('popstate', onPopState);
        iframeWnd.addEventListener('hashchange', onHashChange);

        iframeHistory.pushState({ status: 'one' }, '', '#one');
        iframeHistory.pushState({ status: 'two' }, '', '#two');
        iframeHistory.replaceState({ status: 'three' }, '', '#three');
        iframeHistory.replaceState({ status: 'four' }, '', '#three');

        iframeHistory.back();
        await reflect();
        iframeHistory.forward();
        await reflect();
    });
});
