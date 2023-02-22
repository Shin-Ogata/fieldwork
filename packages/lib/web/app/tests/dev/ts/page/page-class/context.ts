import {
    Route,
    RouteChangeInfo,
    Page,
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
        console.log(`pageInit(${info.to.path})`);
    }

    pageMounted(info: RouteChangeInfo): void {
        console.log(`pageMounted(${info.to.path})`);
    }

    pageBeforeEnter(info: RouteChangeInfo): void {
        console.log(`pageBeforeEnter(${info.to.path})`);
    }

    pageAfterEnter(info: RouteChangeInfo): void {
        console.log(`pageAfterEnter(${info.to.path})`);
    }

    pageBeforeLeave(info: RouteChangeInfo): void {
        console.log(`pageBeforeLeave(${info.to.path})`);
    }

    pageAfterLeave(info: RouteChangeInfo): void {
        console.log(`pageAfterLeave(${info.to.path})`);
    }

    pageUnmounted(info: Route): void {
        console.log(`pageUnmounted(${info.path})`);
    }

    pageRemoved(info: Route): void {
        console.log(`pageRemoved(${info.path})`);
    }

    static template = `
<div id="page-class" class="router-page">
    Class Page
    <hr/>
    <button><a href="#" data-transition="fade">Back</a></button>
</div>
`;
}

registerPage({
    path: '/class',
    component: RouterPage,
    content: RouterPage.template,
});
