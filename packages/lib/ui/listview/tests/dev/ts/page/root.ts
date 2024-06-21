import {
    type TemplateResult,
    html,
    render,
    type RouteChangeInfo,
    registerPage,
    t,
} from '@cdp/runtime';
import { i18nKey } from '../types';

const template = (): TemplateResult => {
    return html`
        <h2>${t(i18nKey.app.pageRoot.title)}</h2>
        <button class="header-button"><a href="/settings" data-transition="slide-up">⚙️${t(i18nKey.app.common.navigateTo.settings)}</a></button>
        <hr/>
        <h3>${t(i18nKey.app.pageRoot.category.class)}</h3>
        <ul>
            <li><a href="/simple-list-class">${t(i18nKey.app.pageRoot.navigateTo.simpleListClass)}</a></li>
            <li><a href="/expand-list-class">${t(i18nKey.app.pageRoot.navigateTo.expandListClass)}</a></li>
            <li><a href="/sort-list-class">${t(i18nKey.app.pageRoot.navigateTo.sortListClass)}</a></li>
        </ul>
    `;
};

registerPage({
    path: '',
    component: {
        pageInit(info: RouteChangeInfo) {
            render(template(), info.to.el);
        },
    },
    content: /* html */`<div id="page-root" class="router-page" data-dom-cache="connect" aria-hidden="true"></div>`,
});
