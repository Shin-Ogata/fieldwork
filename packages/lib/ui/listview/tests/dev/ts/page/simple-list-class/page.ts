import {
    type Route,
    PageView,
    registerPage,
    dom as $,
} from '@cdp/runtime';
import { i18nKey } from '../../types';
import { SimpleListView } from './list-view';

class SimpleListPageView extends PageView {
    private _listview?: SimpleListView;

    static get content(): string {
        return /*html*/`
            <div id="page-simple-list" class="router-page list-class">
                <h2 data-i18n="${i18nKey.app.pageSimpleListClass.title}">🌐</h2>
                <button class="header-button"><a href="/settings" data-transition="slide-up" data-i18n="[append]${i18nKey.app.common.navigateTo.settings}">⚙️</a></button>
                <hr/>
                <label>👈</label>
                <button><a href="#" data-i18n="${i18nKey.app.common.control.back}">🌐</a></button>
                <br/>
                <p class="description text-2l" data-i18n="${i18nKey.app.pageSimpleListClass.description}">🌐</p>
                <div id="simple-listview-area" class="dev-listview">
                    <ul class="cdp-ui-listview-scroll-map"></ul>
                </div>
            </div>
        `;
    }

///////////////////////////////////////////////////////////////////////
// override: ListView

    protected override onPageMounted(thisPage: Route): void {
        this._listview = new SimpleListView({
            el:  $(thisPage.el).find('#simple-listview-area')[0],
            itemTagName: 'li',
        });
    }

    protected override onPageRemoved(): void {
        this._listview?.remove();
        this._listview = undefined;
    }
}

registerPage({
    path: '/simple-list-class',
    component: SimpleListPageView,
    content: SimpleListPageView.content,
});
