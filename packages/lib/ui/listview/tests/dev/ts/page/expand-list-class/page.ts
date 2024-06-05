import {
    type TemplateResult,
    html,
    render,
    type Route,
    type ViewConstructionOptions,
    PageView,
    registerPage,
    t,
} from '@cdp/runtime';
import { i18nKey } from '../../types';
import { ExpandListView } from './list-view';

class ExpandListPageView extends PageView {
    private _listview?: ExpandListView;
    private readonly _expandAllHandler: typeof ExpandListPageView.prototype.onExpandAll;
    private readonly _collapseAllHandler: typeof ExpandListPageView.prototype.onCollapseAll;

    constructor(route?: Route, options?: ViewConstructionOptions) {
        super(route, options);
        this._expandAllHandler = this.onExpandAll.bind(this);
        this._collapseAllHandler = this.onCollapseAll.bind(this);
    }

    static get content(): string {
        return /*html*/`<div id="page-expand-list" class="router-page list-class"></div>`;
    }

    /** inline tagged template literal */
    private get template(): TemplateResult {
        return html`
            <h2>${t(`${i18nKey.app.pageExpandListClass.title}`)}</h2>
            <button class="header-button"><a href="/settings" data-transition="slide-up">⚙️${t(`${i18nKey.app.common.navigateTo.settings}`)}</a></button>
            <hr/>
            <label>👈</label>
            <button><a href="#">${t(`${i18nKey.app.common.control.back}`)}</a></button>
            <br/>
            <p class="description text-2l">${t(`${i18nKey.app.pageExpandListClass.description}`)}</p>
            <section class="list-control-area">
                <button class="to-expand-all" @click=${this._expandAllHandler}>${t(`${i18nKey.app.pageExpandListClass.control.expandAll}`)}</button>
                <button class="to-collapse-all" @click=${this._collapseAllHandler}>${t(`${i18nKey.app.pageExpandListClass.control.collapseAll}`)}</button>
            </section>
            <div id="expand-listview-area" class="dev-listview">
                <ul class="cdp-ui-listview-scroll-map expandable-listview"></ul>
            </div>
        `;
    }

///////////////////////////////////////////////////////////////////////
// override: ListView

    protected override onPageMounted(thisPage: Route): void {
        render(this.template, thisPage.el);
        this._listview = new ExpandListView({
            el: thisPage.el.querySelector<HTMLElement>('#expand-listview-area')!,
            itemTagName: 'li',
            animationDuration: 400,
            baseDepth: '0',
        });
    }

    protected override onPageRemoved(): void {
        this._listview?.remove();
        this._listview = undefined;
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onExpandAll(): void {
        if (this._listview) {
            void this._listview.expandAll();
        }
    }

    private onCollapseAll(): void {
        if (this._listview) {
            void this._listview.collapseAll();
        }
    }
}

registerPage({
    path: '/expand-list-class',
    component: ExpandListPageView,
    content: ExpandListPageView.content,
});
