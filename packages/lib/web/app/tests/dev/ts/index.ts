import { AppContext } from '@cdp/app';
import './page';

// TODO:
import { getConfig } from '@cdp/core-utils';
const config = getConfig();
console.log(config);

void (async () => {

    await AppContext({
        initialPath: '/root',
    }).ready;

})();
