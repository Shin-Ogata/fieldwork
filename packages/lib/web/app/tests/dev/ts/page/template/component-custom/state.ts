import { FunctionPropertyNames } from '@cdp/core-utils';
import { ViewEventsHash } from '@cdp/view';
import {
    TemplateResult,
    html,
    render,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { i18nKey } from '../../../types';
import { ComponentElement } from './base';

class DevStateComponent extends ComponentElement {
    private _state = { count: 0 };

///////////////////////////////////////////////////////////////////////
// override: ComponentViewBase

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<DevStateComponent>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .state-reset': this.onStateReset,
            'click .state-plus': this.onStatePlus,
            'click .state-minus': this.onStateMinus,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        render(this.template(), this.el);
    }

    protected onComponentInit(): void {
        console.log(`onComponentInit(${this.getAttribute('name')})`);
        this._state = { count: Number(this.getAttribute('val') ?? 0) };
        this.render();
    }

    protected onComponentRemoved(): void {
        console.log(`onComponentRemoved(${this.getAttribute('name')})`);
    }

///////////////////////////////////////////////////////////////////////
// template:

    private template(): TemplateResult {
        return html`
            <fieldset class="template-control-group">
                <p>${t(i18nKey.app.template.content.state.label)}${ this._state.count }</p>
                <button class="state-reset">${t(i18nKey.app.template.content.state.button.reset)}</button>
                <button class="state-plus">➕</button>
                <button class="state-minus">➖</button>
            </fieldset>
        `;
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
}

customElements.define('dev-state', DevStateComponent);
