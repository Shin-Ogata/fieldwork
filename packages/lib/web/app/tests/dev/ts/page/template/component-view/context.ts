import {
    toUrl,
    loadTemplateSource,
    toTemplateElement,
} from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import { JST, TemplateEngine } from '@cdp/core-template';
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
            { ctor: StateComponentView, args: undefined },
            { ctor: StateComponentView, args: { initVal: 2 } },
            { ctor: EffectComponentView, args: undefined },
            { ctor: IntervalComponentView, args: undefined },
            { ctor: InputComponentView, args: undefined },
            { ctor: ListComponentView, args: undefined },
        ];

        const $section = this.$el.find('section');
        contexts.forEach((ctx, index) => {
            let view = this._views[index];
            if (!view) {
                view = new ctx.ctor(ctx.args as any);   // eslint-disable-line @typescript-eslint/no-explicit-any
                this._views[index] = view;
            }
            const div = document.createElement('div');
            $section.append(div);
            promises.push(view.componentInit(div, this._props));
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
