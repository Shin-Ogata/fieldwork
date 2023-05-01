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

class DevEffectComponent extends ComponentElement {
    private _state = { clicked: 0 };

///////////////////////////////////////////////////////////////////////
// override: ComponentViewBase

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<DevEffectComponent>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .effect': this.onEffect,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        const $label = this.$el.find('.effect-label');
        $label.text(String(this._state.clicked)).localize();
    }

    protected onComponentInit(): void {
        console.log(`onComponentInit(${this.getAttribute('name')})`);
        this._state = { clicked: 0 };
        render(this.template(), this.el);
        this.$el.localize();
    }

    protected onComponentRemoved(): void {
        console.log(`onComponentRemoved(${this.getAttribute('name')})`);
    }

///////////////////////////////////////////////////////////////////////
// template:

    private template(): TemplateResult {
        return html`
            <fieldset class="template-control-group">
                <p class="effect-label" data-i18n="[prepend]app.template.content.effect.label">0</p>
                <button class="effect">${t(i18nKey.app.template.content.effect.button.label)}</button>
            </fieldset>
        `;
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onEffect(): void {
        this._state.clicked++;
        this.render();
    }
}

customElements.define('dev-effect', DevEffectComponent);
