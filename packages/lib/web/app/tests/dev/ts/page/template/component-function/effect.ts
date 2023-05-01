import { TemplateResult, html } from '@cdp/template';
import { dom as $ } from '@cdp/dom';
import { t } from '@cdp/i18n';
import { i18nKey } from '../../../types';
import { useState, useEffect } from './hooks-prototype';

export const Effect = (): TemplateResult => {
    const [count, setCount] = useState(0);

    // Similar to componentDidMount and componentDidUpdate:
    useEffect(() => {
        // Update the element using the browser API
        const $label = $('.effect-label');
        $label.text(`${t(i18nKey.app.template.content.effect.label)}${count}`);
    });

    return html`
        <fieldset class="template-control-group">
            <p class="effect-label">${t(i18nKey.app.template.content.effect.label)}0</p>
            <button class="effect" @click=${() => setCount(count + 1)}>${t(i18nKey.app.template.content.effect.button.label)}</button>
        </fieldset>
    `;
};
