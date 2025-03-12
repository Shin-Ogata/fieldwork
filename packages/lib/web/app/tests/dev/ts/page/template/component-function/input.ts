import { type TemplateResult, html } from '@cdp/template';
import { t } from '@cdp/i18n';
import { i18nKey } from '../../../types';
import type { Props } from '../props';

export const Input = (props: Props): TemplateResult => {
    return html`
        <fieldset class="template-control-group">
            <p>${t(i18nKey.app.template.content.input.label)}${ props.text }</p>
            <input
                class="input-text"
                type="text"
                placeholder="${t(i18nKey.app.template.content.input.placeholder)}"
                @input=${(e: InputEvent) => props.text = (e.currentTarget as HTMLInputElement).value}
            />
        </fieldset>
    `;
};
