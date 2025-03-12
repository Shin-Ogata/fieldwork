import {
    type TemplateResult,
    html,
    render,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import type { Route } from '@cdp/router';
import { PageView, registerPage } from '@cdp/app';
import { i18nKey } from '../../../types';
import { entry } from '../../signature';
import { Props } from '../props';
import type { ComponentElement } from './base';
import './state';
import './effect';
import './interval';
import './input';
import './list';

entry('PAGE_CONTEXT_TEMPLATE_COMPONENT_CUSTOM');

//__________________________________________________________________________________________________//

/**
 * component-custom の基底ページクラス
 * カスタムエレメントを使用した例
 */
class ComponentCustomPage extends PageView {
    private _props!: Props;

///////////////////////////////////////////////////////////////////////
// override: PageView

    render(): void {
        render(this.template(), this.el);
    }

    protected onPageInit(thisPage: Route): void {
        console.log(`${thisPage.url}: init`);
        this._props = new Props();
        this.render();
    }

    protected async onPageMounted(thisPage: Route): Promise<void> {
        console.log(`${thisPage.url}: mounted`);
        const components = this.$el.find('.dev-element');
        for (const component of components) {
            await (component as ComponentElement).componentInit(this._props);
        }
    }

    protected onPageUnmounted(thisPage: Route): void {
        console.log(`${thisPage.url}: unmounted`);
    }

    protected onPageRemoved(thisPage: Route): void {
        console.log(`${thisPage.url}: removed`);
        this._props.off();
    }

///////////////////////////////////////////////////////////////////////
// internal:

    private template(): TemplateResult {
        return html`
            <header>
                <label>👈</label>
                <button><a href="#">${t(i18nKey.app.common.back)}</a></button>
                <h1>${t(i18nKey.app.template['component-custom'].title)}</h1>
            </header>
            <section>
                <h3>${t(i18nKey.app.template['component-custom'].description)}</h3>
                <dev-state class="dev-element" name="state-component"></dev-state>
                <dev-state class="dev-element" name="state-component" val="2"></dev-state>
                <dev-effect class="dev-element" name="effect-component"></dev-effect>
                <dev-interval class="dev-element" name="interval-component"></dev-interval>
                <dev-input class="dev-element" name="input-component"></dev-input>
                <dev-list class="dev-element" name="list-component"></dev-list>
            </section>
        `;
    }
}

registerPage({
    path: '/template/component-custom',
    component: ComponentCustomPage,
    content: /*html*/`<div id="page-template-component-custom" class="router-page template-page"></div>`,
});
