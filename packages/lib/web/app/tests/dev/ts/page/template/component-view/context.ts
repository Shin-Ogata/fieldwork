import {
    toUrl,
    loadTemplateSource,
    toTemplateElement,
} from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import { JST, TemplateEngine } from '@cdp/template';
import { PageView, registerPage } from '@cdp/app';
import { entry } from '../../signature';
import { Props } from '../props';
import { ComponentViewBase } from './base';
import { StateComponentView } from './state';
import { EffectComponentView } from './effect';
import { IntervalComponentView } from './interval';
import { InputComponentView } from './input';
import { ListComponentView } from './list';

entry('PAGE_CONTEXT_TEMPLATE_COMPONENT_VIEW');

const prepareTemplate = async (): Promise<JST> => {
    const content =  toTemplateElement(
        await loadTemplateSource('#template-component-view-page-body', { url: toUrl('/tpl/variations.tpl') })
    ) as HTMLTemplateElement;
    $(content).localize();
    return TemplateEngine.compile(content.innerHTML);
};

//__________________________________________________________________________________________________//

/**
 * component-view の基底ページクラス
 * 伝統的な template 使用するが, 設計で効率的な描画をサポートする
 */
class ComponentViewPage extends PageView {
    private _props!: Props;
    private _views: ComponentViewBase[] = [];

///////////////////////////////////////////////////////////////////////
// override: PageView

    render(): void {
        this._views.forEach(view => view.render());
    }

    protected async onPageInit(): Promise<void> {
        const template = await prepareTemplate();
        this._props = new Props();

        this.$el.children().replaceWith(template());

        const promises: (Promise<void> | void)[] = [];
        const contexts = [
            { ctor: StateComponentView, selector: '.state-base' },
            { ctor: EffectComponentView, selector: '.effect-base' },
            { ctor: IntervalComponentView, selector: '.interval-base' },
            { ctor: InputComponentView, selector: '.input-base' },
            { ctor: ListComponentView, selector: '.list-base' },
        ];

        contexts.forEach(({ ctor, selector }, index) => {
            let view = this._views[index];
            if (!view) {
                view = new ctor();
                this._views[index] = view;
            }
            const el = this.$el.find(selector)[0] as HTMLElement;
            promises.push(view.componentInit(el, this._props));
        });
        await Promise.all(promises);

        this.render();
    }

    protected onPageRemoved(): void {
        this._props.off();
        this._views.forEach(view => view.componentRemoved());
    }
}

registerPage({
    path: '/template/component-view',
    component: ComponentViewPage,
    content: /*html*/`<div id="page-template-component-view" class="router-page template-page"><div>contents</div></div>`,
});
