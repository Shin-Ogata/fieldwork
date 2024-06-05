import {
    type PageStack,
    toRouterPath,
    AppContext,
    t,
} from '@cdp/runtime';
import './page';
import { i18nKey } from './types';
import { Toast } from './utils';

void (async () => {
    const t0 = performance.now();

    const makeStacks = (): PageStack[] => {
        const path = toRouterPath(location.href);
        switch (path) {
            case '/settings':
                return [{ path, transition: 'slide-up' }];
            case '/simple-list-class':
            case '/expand-list-class':
                return [{ path }];
            default:
                return [];
        }
    };

    await AppContext({
        main: '#app > .view-main',
        initialPath: '/',
        additionalStacks: makeStacks(),
        i18n: {
            lng: /^[a-z]{2}/.exec(navigator.language)![0],
            fallbackLng: 'en',
            namespace: 'messages',
            resourcePath: '/res/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
        },
        transition: {
            default: 'slide',
        },
    }).ready;

    const tb = performance.now() - t0;
    void Toast.show(`"${t(i18nKey.app.name)}" ready\nBoot time: ${tb.toFixed(3)} msec.`);
    console.log(`Time spent booting: ${tb} milliseconds.`);
})();
