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
        config: object;
    }

    const customInit = (context: AppContextEx): Promise<void> => {
        context.$app   = $('#app');
        context.config = getConfig();
        return sleep(1000);
    };

    await AppContext({
        main: '#app > .view-main',
        initialPath: '/root',
        waitForReady: customInit,
    }).ready;

    const app = AppContext() as AppContextEx;
    console.log(app.config);
})();
