import { FunctionPropertyNames, debounce } from '@cdp/core-utils';
import {
    toUrl,
    loadTemplateSource,
    toTemplateElement,
} from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import { JST, TemplateEngine } from '@cdp/core-template';
import { ViewEventsHash } from '@cdp/view';
import { PageView, registerPage } from '@cdp/app';
import { entry } from '../../signature';
import { Props } from '../props';

entry('PAGE_CONTEXT_TEMPLATE_MUSTACHE_TRADITIONAL');

const prepareTemplate = async (): Promise<JST> => {
    const content = toTemplateElement(
        await loadTemplateSource('#template-mustache-traditional-content', { url: toUrl('/tpl/variations.tpl') })
    )!;
    $(content).localize();
    return TemplateEngine.compile(content.innerHTML);
};

//__________________________________________________________________________________________________//

/**
 * backbone.js like な使用例
 * 伝統的な template 使用方法のため, 全更新が発生する
 */
class MustacheTraditionalView extends PageView {
    private _template!: JST;
    private _state = { count: 0, clicked: 0 };
    private _props!: Props;
    private _updateText!: typeof MustacheTraditionalView.prototype.onInput;

///////////////////////////////////////////////////////////////////////
// override: PageView

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<MustacheTraditionalView>> {
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
        this.$el.children().replaceWith(this._template({ ...this._state, ...this._props.toJSON() }));
        // テンプレートを全更新するため, effect 更新は別途呼び出す必要がある
        this.effect();
    }

    protected async onPageInit(): Promise<void> {
        this._template = await prepareTemplate();
        this._state = { count: 0, clicked: 0 };
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
// draw:

    private effect(): void {
        const $label = this.$el.find('.effect-label');
        $label.text(String(this._state.clicked)).localize();
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onStateReset(): void {
        this._state.count = 0;
        this.render();
    }

    private onStatePlus(): void {
        this._state.count++;
        this.render();
    }

    private onStateMinus(): void {
        this._state.count--;
        this.render();
    }

    private onEffect(): void {
        this._state.clicked++;
        this.effect();
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
    component: MustacheTraditionalView,
    content: /*html*/`<div id="page-template-mustache" class="router-page template-page"><div>contents</div></div>`,
});
