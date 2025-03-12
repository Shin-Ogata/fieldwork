import { getConfig, sleep } from '@cdp/core-utils';
import {
    type DOM,
    dom as $,
} from '@cdp/dom';
import { type PageStack, toRouterPath } from '@cdp/router';
import { AppContext } from '@cdp/app';
import './page';

void (async () => {
    interface AppContextEx extends AppContext {
        $app: DOM;
    }

    const customInit = (context: AppContextEx): Promise<void> => {
        context.$app   = $('#app');
        context.extension = getConfig();
        return sleep(1000);
    };

    const additionalStacks = ((url: string): PageStack[] | undefined => {
        const path = toRouterPath(url);
        return ('/class' === path) ? [{ path }] : undefined;
    })(location.href);

    await AppContext({
        main: '#app > .view-main',
        /*
         * - initialPath 指定すると, `http://localhost:8080/.temp/dev/#/other` の URL を入力しても `initialPath` に強制する参考実装
         *   「戻る」に router.back() をアサインしているときなど, 都合が悪いときに採用可能.
         *   また additionalStacks を設定すれば, 例外的に initialPath を起点とした pageStack を積むことができる
         *
         * - root path を '/' にすれば initialPath は不要となるが, あらゆる page でブックマークされることを想定した実装が求められる
         */
        initialPath: '/root',
        additionalStacks,
        splash: '#splash-screen',
        waitForReady: customInit,
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

    const app = AppContext() as AppContextEx;
    console.log(app.extension);
})();
