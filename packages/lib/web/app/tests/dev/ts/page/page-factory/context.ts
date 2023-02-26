/* eslint-disable
    @typescript-eslint/require-await,
 */

import {
    Route,
    RouteChangeInfo,
    Page,
} from '@cdp/router';
import { registerPage } from '@cdp/app';
import {
    Todos,
    setRenderContext,
    renderTodos,
} from './todos';

import { entry } from '../signature';

entry('PAGE_CONTEXT_FACTORY');

const asyncFactory = async (route: Route, options?: unknown): Promise<Page> => {
    return {
        name: 'I was born from an async-factory.',
        '@route': route,
        '@options': options,
        async pageInit(info: RouteChangeInfo) {
            setRenderContext(Todos, info.to.el);
            renderTodos();
        },
    } as Page;
};

registerPage({
    path: '/factory',
    component: asyncFactory,
    content: '<div id="page-factory" class="router-page"></div>',
});
