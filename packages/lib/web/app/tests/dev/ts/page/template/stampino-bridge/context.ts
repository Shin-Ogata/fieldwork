import type { UnknownFunction, PlainObject } from '@cdp/core-utils';
import {
    toUrl,
    loadTemplateSource,
    toTemplateElement,
} from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import {
    type CompiledTemplate,
    TemplateBridge,
    render,
} from '@cdp/template';
import { PageView, registerPage } from '@cdp/app';
import { entry } from '../../signature';
import { Props } from '../props';

entry('PAGE_CONTEXT_TEMPLATE_STAMPINO_BRIDGE');

const prepareTemplate = async (): Promise<CompiledTemplate> => {
    const stampino = TemplateBridge.getBuitinTransformer('stampino');
    const content = toTemplateElement(
        await loadTemplateSource('#template-stampino-bridge-content', { url: toUrl('/tpl/variations.tpl') })
    )!;
    $(content).localize();
    return TemplateBridge.compile(content.innerHTML, { transformer: stampino });
};

//__________________________________________________________________________________________________//

/**
 * stampino エンジンの使用例
 * lit-html 連携により差分更新が行われ, より宣言的に記述できる
 */
class StampinoBridgeView extends PageView {
    private _template!: CompiledTemplate;
    private _handler!: PlainObject<UnknownFunction>;
    private _state = { count: 0, clicked: 0 };
    private _props!: Props;

///////////////////////////////////////////////////////////////////////
// override: PageView

    render(): void {
        render(this._template({ ...this._state, ...this._props.toJSON(), handler: this._handler }), this.el);
    }

    protected async onPageInit(): Promise<void> {
        this._template = await prepareTemplate();
        this._state = { count: 0, clicked: 0 };
        this._props = new Props();
        this._props.on('@', this.render.bind(this));

        if (!this._handler) {
            // PageView#events() でもイベントハンドリングは可能. ここでは template 引数に渡せる例を記載
            this._handler = {
                stateReset: this.onStateReset.bind(this),
                statePlus: this.onStatePlus.bind(this),
                stateMinus: this.onStateMinus.bind(this),
                effect: this.onEffect.bind(this),
                intervalStart: this.onStartInterval.bind(this),
                intervalStop: this.onStopInterval.bind(this),
                inputText: this.onInput.bind(this),
                listReset: this.onListReset.bind(this),
                listPlus: this.onListPlus.bind(this),
                listMinus: this.onListMinus.bind(this),
            };
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
        this._props.text = (ev.target as HTMLInputElement).value;
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
    path: '/template/stampino-bridge',
    component: StampinoBridgeView,
    content: /*html*/`<div id="page-template-stampino-bridge" class="router-page template-page"></div>`,
});
