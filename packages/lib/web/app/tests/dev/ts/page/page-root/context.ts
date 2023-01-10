import { getConfig } from '@cdp/core-utils';
import type { RouteChangeInfo } from '@cdp/router';
import { registerPage } from '@cdp/app';

const config = getConfig();

const PAGE_CONTEXT_ROOT = 'PAGE_CONTEXT_ROOT';
config['PAGE_CONTEXT_ROOT'] = PAGE_CONTEXT_ROOT;

// TODO: content の template の扱いを思い出す
registerPage({
    path: '/root',
    component: {
        name: 'I was born from an object.',
        pageInit(info: RouteChangeInfo) {
            console.log(info.to.path);
        }
    },
    content: '#page-root',
});
