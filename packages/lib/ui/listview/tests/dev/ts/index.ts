import { AppContext, t } from '@cdp/runtime';
import './page';
import { i18nKey } from './types';

void (async () => {
    const { hash: url } = location;
    const app = AppContext({
        main: '#app > .view-main',
        initialPath: '/',
        start: false,
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
    });
    await app.ready;

    // TODO: AppContext のオプションにする
    if (!app.isCurrentPath(url)) {
        await app.router.pushPageStack([
            { url, transition: 'slide-up' },
        ]);
    }
    console.log(`"${t(i18nKey.app.name)}" ready`);
})();
