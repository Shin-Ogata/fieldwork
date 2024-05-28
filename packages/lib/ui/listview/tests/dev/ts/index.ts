import { AppContext } from '@cdp/runtime';
import './page';

void (async () => {
    await AppContext({
        main: '#app > .view-main',
        /*
         * initialPath 指定すると, `http://localhost:8080/.temp/dev/#/other` の URL を入力しても `initialPath` に強制する参考実装
         * 「戻る」に router.back() をアサインしているときなど, 都合が悪いときに採用可能
         * root path を '/' にすれば initialPath は不要となり, あらゆる root でブックマークされることを想定した実装が求められる
         */
        initialPath: '/root',
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
    console.log(`app ready`);
})();
