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
        <button class="header-button"><a href="/settings" data-transition="slide-up">⚙️${t(i18nKey.app.pageRoot.navigateTo.settings)}</a></button>
        <hr/>
        <ul>
            <li><a href="/xxx">🌐</a></li>
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
