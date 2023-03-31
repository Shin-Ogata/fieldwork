import { FunctionPropertyNames } from '@cdp/core-utils';
import {
    TemplateResult,
    html,
    render,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { ViewEventsHash } from '@cdp/view';
import { Route } from '@cdp/router';
import { PageView, registerPage } from '@cdp/app';
import { i18nKey } from '../../types';
import { entry } from '../signature';

entry('PAGE_CONTEXT_PAGE_VIEW');

class RouterPageView extends PageView {
    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<RouterPageView>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click #page-view-back': this.onBack,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): this {
        render(this.template(), this.el);
        return this;
    }

    static contentBase(): string {
        return '<div id="page-view" class="router-page"></div>';
    }

    protected onPageInit(thisPage: Route): void {
        console.log(`${thisPage.url}: init`);
        this.render();
    }

    protected onPageMounted(thisPage: Route): void {
        console.log(`${thisPage.url}: mounted`);
    }

    protected onPageBeforeEnter(thisPage: Route): void {
        console.log(`${thisPage.url}: before-enter`);
    }

    protected onPageAfterEnter(thisPage: Route): void {
        console.log(`${thisPage.url}: after-enter`);
    }

    protected onPageBeforeLeave(thisPage: Route): void {
        console.log(`${thisPage.url}: before-leave`);
    }

    protected onPageAfterLeave(thisPage: Route): void {
        console.log(`${thisPage.url}: after-leave`);
    }

    protected onPageUnmounted(thisPage: Route): void {
        console.log(`${thisPage.url}: unmounted`);
    }

    protected onPageRemoved(thisPage: Route): void {
        console.log(`${thisPage.url}: removed`);
    }

    private template(): TemplateResult {
        return html`
            <h2>${t(i18nKey.app.pageView.title)}</h2>
            <hr/>
            <label>👈</label>
            <button id="page-view-back">${t(i18nKey.app.common.back)}</button>
            <ul>
                <li><a href="/class">${t(i18nKey.app.navigateTo.class)}</a></li>
                <li><button data-navigate-to="/subflow" @click=${this.onGoToSubflow.bind(this)}>${t(i18nKey.app.pageView.toSubflow)}</button></li>
            </ul>
        `;
    }

    private onBack(/*event: UIEvent*/): void {
        this._router?.back();
    }

    private onGoToSubflow(event: UIEvent): void {
        console.log(`onGoToSubflow(${event.type})`);
        this._router?.navigate('/subflow-a');
    }
}

registerPage({
    path: '/view',
    component: RouterPageView,
    content: RouterPageView.contentBase(),
});
