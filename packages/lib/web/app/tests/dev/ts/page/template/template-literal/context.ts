import type { UnknownFunction, PlainObject } from '@cdp/core-utils';
import {
    TemplateResult,
    render,
    html,
    directives,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { PageView, registerPage } from '@cdp/app';
import { i18nKey } from '../../../types';
import { entry } from '../../signature';
import { Props } from '../props';

entry('PAGE_CONTEXT_TEMPLATE_TEMPLATE_LITERAL');

const { repeat } = directives;

/**
 * Template Literal の使用例
 * クラス内に Template Literal を配置した例
 */
class TemplateLiteralView extends PageView {
    private _handler!: PlainObject<UnknownFunction>;
    private _state = { count: 0, clicked: 0 };
    private _props!: Props;

///////////////////////////////////////////////////////////////////////
// override: PageView

    render(): void {
        render(this.template(), this.el);
    }

    protected onPageInit(): void {
        this._state = { count: 0, clicked: 0 };
        this._props = new Props();
        this._props.on('@', this.render.bind(this));

        if (!this._handler) {
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
        $label.text(`${t(i18nKey.app.template.content.effect.label)}${this._state.clicked}`);
    }

///////////////////////////////////////////////////////////////////////
// template:

    private template(): TemplateResult {
        const { count } = this._state;
        const { now, text, list } = this._props;

        /*
         * VS Code extension
         *
         * lit-html
         * https://marketplace.visualstudio.com/items?itemName=bierner.lit-html
         * 
         * Comment tagged templates
         * https://marketplace.visualstudio.com/items?itemName=bierner.comment-tagged-templates
         */

        /* eslint-disable @stylistic:js/indent */
        return html`
            <header>
                <label>👈</label>
                <button><a href="#">${t(i18nKey.app.common.back)}</a></button>
                <h1>${t(i18nKey.app.template['template-literal'].title)}</h1>
            </header>
            <section>
                <h3>${t(i18nKey.app.template['template-literal'].description)}</h3>
                <fieldset class="template-control-group">
                    <p>${t(i18nKey.app.template.content.state.label)}${ count }</p>
                    <button class="state-reset" @click=${this._handler.stateReset}>${t(i18nKey.app.template.content.state.button.reset)}</button>
                    <button class="state-plus" @click=${this._handler.statePlus}>➕</button>
                    <button class="state-minus" @click=${this._handler.stateMinus}>➖</button>
                </fieldset>
                <fieldset class="template-control-group">
                    <p class="effect-label">${t(i18nKey.app.template.content.effect.label)}0</p>
                    <button class="effect" @click=${this._handler.effect}>${t(i18nKey.app.template.content.effect.button.label)}</button>
                </fieldset>
                <fieldset class="template-control-group">
                    <p>${t(i18nKey.app.template.content.interval.label)}${ now }</p>
                    <button class="interval-start" @click=${this._handler.intervalStart}>${t(i18nKey.app.template.content.interval.button.start)}</button>
                    <button class="interval-stop" @click=${this._handler.intervalStop}>${t(i18nKey.app.template.content.interval.button.stop)}</button>
                </fieldset>
                <fieldset class="template-control-group">
                    <p>${t(i18nKey.app.template.content.input.label)}${ text }</p>
                    <input class="input-text" type="text" placeholder="${t(i18nKey.app.template.content.input.placeholder)}" @input=${this._handler.inputText} />
                </fieldset>
                <fieldset class="template-control-group">
                    <p>${t(i18nKey.app.template.content.list.label)}${ list.length }</p>
                    <button class="list-reset" @click=${this._handler.listReset}>${t(i18nKey.app.template.content.list.button.clear)}</button>
                    <button class="list-plus" @click=${this._handler.listPlus}>➕</button>
                    <button class="list-minus" @click=${this._handler.listMinus}>➖</button>
                    <hr>
                    ${list.length
                        ? html`
                            <table border="1">
                                <tr>
                                    <th>${t(i18nKey.app.template.content.list.column.id)}</th><th>${t(i18nKey.app.template.content.list.column.score)}</th>
                                </tr>
                            ${repeat(list, (item) => item.id, (item) => html`
                                <tr>
                                    <td>${ item.id }</td><td>${ item.score }</td>
                                </tr>
                            `)}
                            </table>
                        `
                        : html`
                            <p>${t(i18nKey.app.template.content.list.noItem)}</p>
                        `
                    }
                </fieldset>
            </section>
        `;
        /* eslint-enable @stylistic:js/indent */
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
    path: '/template/template-literal',
    component: TemplateLiteralView,
    content: /*html*/`<div id="page-template-template-literal" class="router-page template-page"></div>`,
});
