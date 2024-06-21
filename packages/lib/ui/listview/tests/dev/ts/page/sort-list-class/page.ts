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
import { SortListView } from './list-view';

class SortListPageView extends PageView {
    private _listview?: SortListView;
    private readonly _sortHandler: typeof SortListPageView.prototype.onSort;
    private readonly _fetchHandler: typeof SortListPageView.prototype.onFetch;
    private readonly _resetHandler: typeof SortListPageView.prototype.onReset;
    private readonly _requeryHandler: typeof SortListPageView.prototype.onRequery;

    constructor(route?: Route, options?: ViewConstructionOptions) {
        super(route, options);
        this._sortHandler = this.onSort.bind(this);
        this._fetchHandler = this.onFetch.bind(this);
        this._resetHandler = this.onReset.bind(this);
        this._requeryHandler = this.onRequery.bind(this);
    }

    static get content(): string {
        return /*html*/`<div id="page-sort-list" class="router-page list-class"></div>`;
    }

    /** inline tagged template literal */
    private get template(): TemplateResult {
        return html`
            <h2>${t(`${i18nKey.app.pageSortListClass.title}`)}</h2>
            <button class="header-button"><a href="/settings" data-transition="slide-up">⚙️${t(`${i18nKey.app.common.navigateTo.settings}`)}</a></button>
            <hr/>
            <label>👈</label>
            <button><a href="#">${t(`${i18nKey.app.common.control.back}`)}</a></button>
            <section class="list-control-area">
                <button @click=${this._sortHandler}>${t(`${i18nKey.app.pageSortListClass.control.sort}`)}</button>
                <button @click=${this._fetchHandler}>${t(`${i18nKey.app.pageSortListClass.control.fetch}`)}</button>
                <button @click=${this._resetHandler}>${t(`${i18nKey.app.pageSortListClass.control.reset}`)}</button>
                <button @click=${this._requeryHandler}>${t(`${i18nKey.app.pageSortListClass.control.requery}`)}</button>
            </section>
            <br/>
            <p class="description text-2l">${t(`${i18nKey.app.pageSortListClass.description}`)}</p>
            <div id="sort-listview-area" class="dev-listview">
                <ul class="cdp-ui-listview-scroll-map sort-listview"></ul>
            </div>
        `;
    }

///////////////////////////////////////////////////////////////////////
// override: ListView

    protected override onPageMounted(thisPage: Route): void {
        render(this.template, thisPage.el);
        this._listview = new SortListView({
            el: thisPage.el.querySelector<HTMLElement>('#sort-listview-area')!,
            itemTagName: 'li',
        });
    }

    protected override onPageRemoved(): void {
        this._listview?.remove();
        this._listview = undefined;
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onSort(): void {
        // TODO:
    }

    private onFetch(): void {
        // TODO:
    }

    private onReset(): void {
        // TODO:
    }

    private onRequery(): void {
        // TODO:
    }
}

registerPage({
    path: '/sort-list-class',
    component: SortListPageView,
    content: SortListPageView.content,
});
