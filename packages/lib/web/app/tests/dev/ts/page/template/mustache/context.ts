import { FunctionPropertyNames, debounce } from '@cdp/core-utils';
import {
    toUrl,
    loadTemplateSource,
    toTemplateElement,
} from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import { JST, TemplateEngine } from '@cdp/template';
import { ViewEventsHash } from '@cdp/view';
import { PageView, registerPage } from '@cdp/app';
import { entry } from '../../signature';
import { Props } from '../props';

entry('PAGE_CONTEXT_TEMPLATE_MUSTACHE');

const prepareTemplate = async (): Promise<JST> => {
    const content =  toTemplateElement(
        await loadTemplateSource('#template-mustache-content', { url: toUrl('/tpl/templates.tpl') })
    ) as HTMLTemplateElement;
    $(content).localize();
    return TemplateEngine.compile(content.innerHTML);
};

//__________________________________________________________________________________________________//

/**
 * backbone.js like な使用方法
 */
class TemplateMustacheView extends PageView {
    private _template!: JST;
    private _props!: Props;
    private _updateText!: typeof TemplateMustacheView.prototype.onInput;

///////////////////////////////////////////////////////////////////////
// override: PageView

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<TemplateMustacheView>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .state-reset': this.onStateReset,
            'click .state-plus': this.onStatePlus,
            'click .state-minus': this.onStateMinus,
            'click .effect': this.onEffect,
            'click .interval-start': this.onStartInterval,
            'click .interval-stop': this.onStopInterval,
            'input .input-text': this.onInput,
            'click .list-reset': this.onListReset,
            'click .list-plus': this.onListPlus,
            'click .list-minus': this.onListMinus,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        this.$el.children().replaceWith(this._template(this._props.toJSON()));
    }

    protected async onPageInit(): Promise<void> {
        this._template = await prepareTemplate();
        this._props = new Props();
        this._props.on('@', this.render.bind(this));
        if (!this._updateText) {
            this._updateText = debounce((ev: UIEvent) => {
                // テンプレートを全更新するため, `input` は宣言的実装に向かない
                this._props.text = (ev.target as HTMLInputElement).value;
            }, 300);
        }
        this.render();
    }

    protected onPageRemoved(): void {
        this._props.off();
        this.onStopInterval();
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onStateReset(): void {
        this._props.count = 0;
    }

    private onStatePlus(): void {
        this._props.count++;
    }

    private onStateMinus(): void {
        this._props.count--;
    }

    private onEffect(): void {
        this._props.clicked++;
    }

    private onStartInterval(): void {
        this.onStopInterval();
        this._props.interval = setInterval(this.render.bind(this), 1000);
    }

    private onStopInterval(): void {
        this._props.interval && clearInterval(this._props.interval);
        this._props.interval = 0;
    }

    private onInput(ev: UIEvent): void {
        this._updateText(ev);
    }

    private onListReset(): void {
        this._props.resetListItem();
    }

    private onListPlus(): void {
        this._props.addListItem();
    }

    private onListMinus(): void {
        this._props.removeListItem();
    }
}

registerPage({
    path: '/template/mustache',
    component: TemplateMustacheView,
    content: '<div id="page-template-mustache" class="router-page template-page"><div>contents</div></div>',
});
