/*
 eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { sleep } from '@cdp/core-utils';
import { dom as $ } from '@cdp/dom';
import { prepareIFrameElements, cleanupTestElements } from './tools';

const reflect = (): Promise<void> => {
    return sleep(0);
};

// history をリセット. ただし削除はできないため length = 2 となるように初期化する
const resetHistory = async (): Promise<void> => {
    let backCount = history.length - 1;
    while (0 <= backCount--) {
        history.back();
        await reflect();
    }
    history.pushState({ baseOrigin: true }, '', '');
};

describe('router/history spec', () => {

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
