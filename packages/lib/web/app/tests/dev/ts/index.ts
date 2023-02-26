import { getConfig, sleep } from '@cdp/core-utils';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
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

    await AppContext({
        main: '#app > .view-main',
        initialPath: '/root',   // `http://localhost:8080/.temp/dev/#/other` の URL を入力しても `initialPath` に強制できる
        splash: '#splash-screen',
        waitForReady: customInit,
        i18n: {
            lng: 'ja',
            fallbackLng: 'en',
            namespace: 'messages',
            resourcePath: '/res/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
        },
    }).ready;

    const app = AppContext() as AppContextEx;
    console.log(app.extension);
})();
