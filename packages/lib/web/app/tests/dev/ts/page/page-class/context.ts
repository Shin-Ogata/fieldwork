import {
    DOM,
    dom as $,
} from '@cdp/dom';
import {
    Route,
    RouteChangeInfo,
    Page,
    RouterRefreshLevel,
} from '@cdp/router';
import { t, getLanguage } from '@cdp/i18n';
import { registerPage, AppContext } from '@cdp/app';
import { entry } from '../signature';

entry('PAGE_CONTEXT_PAGE_CLASS');

const nextLanguage = (): 'en' | 'ja' => {
    return 'en' === getLanguage() ? 'ja' : 'en';
};

class RouterPage implements Page {
    '@route': Route;
    '@options'?: unknown;

    private _$el!: DOM;
    private _refreshLv = RouterRefreshLevel.RELOAD;
    private _lastScrollPos = 0;

    constructor(route: Route) {
        this['@route'] = route;
    }

    get name(): string { return 'I was born from an class.'; }

    pageInit(info: RouteChangeInfo): void {
        console.log(`pageInit("${info.to.path}")`);

        this._$el = $(info.to.el);

        // 読み込み設定
        switch (this._refreshLv) {
            case RouterRefreshLevel.RELOAD:
                (this._$el.find('#page-class-refresh-lv1') as DOM<HTMLInputElement>).prop('checked', true);
                break;
            case RouterRefreshLevel.DOM_CLEAR:
                (this._$el.find('#page-class-refresh-lv2') as DOM<HTMLInputElement>).prop('checked', true);
                break;
            default:
                break;
        }

        this._$el.find('input[name="page-class-refresh-lv"]').on('change', () => {
            this._refreshLv = Number(this._$el.find('input[name="page-class-refresh-lv"]:checked').val()) as RouterRefreshLevel;
        });

        this._$el.find('#page-class-refresh').on('click', () => {
            void info.to.router.refresh(this._refreshLv);
        });

        // 言語設定
        this._$el.find('#page-class-change-lng').on('click', () => {
            void AppContext().changeLanguage(nextLanguage());
        });

        // スクロール位置の復元
        this._$el.on('scroll', () => {
            this._lastScrollPos = this._$el.scrollTop();
        });
    }

    pageMounted(info: RouteChangeInfo): void {
        console.log(`pageMounted("${info.to.path}")`);
    }

    pageBeforeEnter(info: RouteChangeInfo): void {
        console.log(`pageBeforeEnter("${info.from?.path} → ${info.to.path}")`);
        // 言語設定
        this._$el.find('#page-class-change-lng').text(t(`app.pageClass.language.${nextLanguage()}`) as string); // eslint-disable-line
    }

    pageAfterEnter(info: RouteChangeInfo): void {
        console.log(`pageAfterEnter("${info.from?.path} → ${info.to.path}")`);
        // スクロールの復元
        this._$el.scrollTop(this._lastScrollPos, 500, 'swing');
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
    <h2 data-i18n="app.pageClass.title">🌐</h2>
    <hr/>
    <label>👈</label>
    <button><a href="#" data-transition="fade" data-i18n="app.common.back">🌐</a></button>
    <br/><br/>
    <h3 data-i18n="app.pageClass.refresh.title">🌐</h3>
    <fieldset>
        <label data-i18n="[append]app.pageClass.refresh.lv1">
            <input type="radio" name="page-class-refresh-lv" id="page-class-refresh-lv1" value="1" checked="checked">
        </label>
        <label data-i18n="[append]app.pageClass.refresh.lv2">
            <input type="radio" name="page-class-refresh-lv" id="page-class-refresh-lv2" value="2">
        </label>
        <button id="page-class-refresh" data-i18n="app.common.reload">🌐</button>
    </fieldset>
    <br/><br/>
    <h3 data-i18n="app.pageClass.language.title">🌐</h3>
    <fieldset>
        <button id="page-class-change-lng">🌐</button>
    </fieldset>
</div>
`;
}

registerPage({
    path: '/class',
    component: RouterPage,
    content: RouterPage.template,
});
