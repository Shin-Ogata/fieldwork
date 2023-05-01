import { PlainObject, UnknownFunction } from '@cdp/core-utils';
import {
    TemplateResult,
    html,
    render,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { i18nKey } from '../../../types';
import { ComponentElement } from './base';
import { Props } from '../props';

class DevInputComponent extends ComponentElement {
    private _handler!: PlainObject<UnknownFunction>;
    private _props!: Props;

///////////////////////////////////////////////////////////////////////
// override: ComponentViewBase

    render(): void {
        render(this.template(), this.el);
    }

    protected onComponentInit(props: Props): void {
        console.log(`onComponentInit(${this.getAttribute('name')})`);
        this._props = props;
        this._props.on('text', this.render.bind(this));

        if (!this._handler) {
            this._handler = {
                inputText: this.onInput.bind(this),
            };
        }

        this.render();
    }

    protected onComponentRemoved(): void {
        console.log(`onComponentRemoved(${this.getAttribute('name')})`);
    }

///////////////////////////////////////////////////////////////////////
// template:

    private template(): TemplateResult {
        const { text } = this._props;
        return html`
            <fieldset class="template-control-group">
                <p>${t(i18nKey.app.template.content.input.label)}${ text }</p>
                <input class="input-text" type="text" placeholder="${t(i18nKey.app.template.content.input.placeholder)}" @input=${this._handler.inputText} />
            </fieldset>
        `;
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onInput(ev: UIEvent): void {
        this._props.text = (ev.target as HTMLInputElement).value;
    }
}

customElements.define('dev-input', DevInputComponent);
