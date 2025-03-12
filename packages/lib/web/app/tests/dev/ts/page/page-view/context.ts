import type { FunctionPropertyNames } from '@cdp/core-utils';
import { dom as $ } from '@cdp/dom';
import {
    type TemplateResult,
    html,
    render,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import type { ViewConstructionOptions, ViewEventsHash } from '@cdp/view';
import type { Route } from '@cdp/router';
import { PageView, registerPage } from '@cdp/app';
import { i18nKey } from '../../types';
import { entry } from '../signature';

entry('PAGE_CONTEXT_PAGE_VIEW');

class RouterPageView extends PageView {
    private readonly _onNavigate: typeof RouterPageView.prototype.onNavigateTo;

    constructor(route?: Route, options?: ViewConstructionOptions<HTMLElement>) {
        super(route, options);
        this._onNavigate = this.onNavigateTo.bind(this);
    }

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
                <li><a href="/class">⚙️${t(i18nKey.app.navigateTo.settings)}</a></li>
            </ul>
            <h3>${t(i18nKey.app.pageView.functions.description)}</h3>
            <fieldset class="control-group">
                <button data-navigate-to="/subflow-a" @click=${this._onNavigate}>${t(i18nKey.app.pageView.functions.to.subflow)}</button>
                <button data-navigate-to="/template" @click=${this._onNavigate}>${t(i18nKey.app.pageView.functions.to.template)}</button>
                <button data-navigate-to="/prefetch" @click=${this._onNavigate}>${t(i18nKey.app.pageView.functions.to.prefetch)}</button>
           </fieldset>
        `;
    }

    private onBack(event: UIEvent): void {
        console.log(`onBack(${event.type})`);
        void this._router?.back();
    }

    private onNavigateTo(event: UIEvent): void {
        const to = $(event.currentTarget as HTMLElement).data('navigate-to') as string;
        console.log(`onNavigateTo('${to}')`);
        void this._router?.navigate(to);
    }
}

registerPage({
    path: '/view',
    component: RouterPageView,
    content: RouterPageView.contentBase(),
});
