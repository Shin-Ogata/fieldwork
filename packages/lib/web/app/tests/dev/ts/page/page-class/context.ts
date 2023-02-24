import { dom as $ } from '@cdp/dom';
import {
    Route,
    RouteChangeInfo,
    Page,
    RouterRefreshLevel,
} from '@cdp/router';
import { registerPage } from '@cdp/app';
import { entry } from '../signature';

entry('PAGE_CONTEXT_PAGE_CLASS');

class RouterPage implements Page {
    '@route': Route;
    '@options'?: unknown;

    constructor(route: Route) {
        this['@route'] = route;
    }

    get name(): string { return 'I was born from an class.'; }

    pageInit(info: RouteChangeInfo): void {
        console.log(`pageInit("${info.to.path}")`);
        $(info.to.el).find('#debug').on('click', () => {
            void info.to.router.refresh(RouterRefreshLevel.DOM_CLEAR);
        });
    }

    pageMounted(info: RouteChangeInfo): void {
        console.log(`pageMounted("${info.to.path}")`);
    }

    pageBeforeEnter(info: RouteChangeInfo): void {
        console.log(`pageBeforeEnter("${info.from?.path} → ${info.to.path}")`);
    }

    pageAfterEnter(info: RouteChangeInfo): void {
        console.log(`pageAfterEnter("${info.from?.path} → ${info.to.path}")`);
    }

    pageBeforeLeave(info: RouteChangeInfo): void {
        console.log(`pageBeforeLeave("${info.from?.path} → ${info.to.path}")`);
    }

    pageAfterLeave(info: RouteChangeInfo): void {
        console.log(`pageAfterLeave("${info.from?.path} → ${info.to.path}")`);
    }

    pageUnmounted(info: Route): void {
        console.log(`pageUnmounted("${info.path}")`);
    }

    pageRemoved(info: Route): void {
        console.log(`pageRemoved("${info.path}")`);
    }

    static template = `
<div id="page-class" class="router-page">
    Class Page
    <hr/>
    <button><a href="#" data-transition="fade">Back</a></button>
    <button id="debug">Reload</button>
</div>
`;
}

registerPage({
    path: '/class',
    component: RouterPage,
    content: RouterPage.template,
});
