import {
    type DOM,
    dom as $,
    type Route,
    PageView,
    RouterRefreshLevel,
    t,
    getLanguage,
    registerPage,
    AppContext,
} from '@cdp/runtime';
import { i18nKey } from '../types';

const nextLanguage = (): 'en' | 'ja' => {
    return 'en' === getLanguage() ? 'ja' : 'en';
};

class SettingsPageView extends PageView {
    private _$el!: DOM;
    private _refreshLv = RouterRefreshLevel.RELOAD;
    private _lastScrollPos = 0;

    onPageInit(thisPage: Route): void {

        const app = AppContext();

        this._$el = $(thisPage.el);

        // 読み込み設定
        switch (this._refreshLv) {
            case RouterRefreshLevel.RELOAD:
                (this._$el.find('#page-settings-refresh-lv1') as DOM<HTMLInputElement>).prop('checked', true);
                break;
            case RouterRefreshLevel.DOM_CLEAR:
                (this._$el.find('#page-settings-refresh-lv2') as DOM<HTMLInputElement>).prop('checked', true);
                break;
            default:
                break;
        }

        // 読み込み確認
        this._$el.find('input[name="page-settings-refresh-lv"]').on('change', () => {
            this._refreshLv = Number(this._$el.find('input[name="page-settings-refresh-lv"]:checked').val()) as RouterRefreshLevel;
        });

        this._$el.find('#page-settings-refresh').on('click', () => {
            void thisPage.router.refresh(this._refreshLv);
        });

        // トランジション設定
        const { default: transition } = app.router.transitionSettings();
        this._$el.find('#page-settings-select-transition').val(transition ?? 'none');
        this._$el.find('#page-settings-select-transition').on('change', (ev: UIEvent) => {
            app.router.transitionSettings({ default: $(ev.target as Element).val() });
        });

        // 言語設定
        this._$el.find('#page-settings-change-lng').on('click', () => {
            void app.changeLanguage(nextLanguage());
        });

        // スクロール位置の復元
        this._$el.on('scroll', () => {
            this._lastScrollPos = this._$el.scrollTop();
        });
    }

    onPageBeforeEnter(): void {
        // 言語設定
        this._$el.find('#page-settings-change-lng').text(t(`app.pageSettings.language.${nextLanguage()}`) as string); // eslint-disable-line
    }

    onPageAfterEnter(): void {
        // スクロールの復元
        this._$el.scrollTop(this._lastScrollPos, 500, 'swing');
    }

    static template = /* html */`
    <div id="page-settings" class="router-page" data-dom-cache="connect">
        <h2 data-i18n="${i18nKey.app.pageSettings.title}">🌐</h2>
        <hr/>
        <label>👈</label>
        <button><a href="#" data-i18n="${i18nKey.app.common.control.back}">🌐</a></button>
        <br/>
        <h3 data-i18n="${i18nKey.app.pageSettings.refresh.title}">🌐</h3>
        <fieldset>
            <label data-i18n="[append]${i18nKey.app.pageSettings.refresh.lv1}">
                <input type="radio" name="page-settings-refresh-lv" id="page-settings-refresh-lv1" value="1" checked="checked">
            </label>
            <label data-i18n="[append]${i18nKey.app.pageSettings.refresh.lv2}">
                <input type="radio" name="page-settings-refresh-lv" id="page-settings-refresh-lv2" value="2">
            </label>
            <button id="page-settings-refresh" data-i18n="${i18nKey.app.common.control.reload}">🌐</button>
        </fieldset>
        <br/>
        <h3 data-i18n="${i18nKey.app.pageSettings.transition.title}">🌐</h3>
        <fieldset>
            <select id="page-settings-select-transition">
                <option value="fade">Fade</option>
                <option value="float-up">Float Up</option>
                <option value="slide">Slide</option>
                <option value="slide-up">Slide Up</option>
                <option value="slide-fade">Slide Fade</option>
                <option value="bounce">Bounce</option>
                <option value="none">None</option>
            </select>
        </fieldset>
        <br/>
        <h3 data-i18n="${i18nKey.app.pageSettings.language.title}">🌐</h3>
        <fieldset>
            <button id="page-settings-change-lng">🌐</button>
        </fieldset>
    </div>
    `;
}

registerPage({
    path: '/settings',
    component: SettingsPageView,
    content: SettingsPageView.template,
});
