/* eslint-disable
    @typescript-eslint/no-non-null-assertion,
 */

import {
    TemplateResult,
    html,
    hooks,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { i18nKey } from '../../../types';

const { useState } = hooks;

export const State = ({ initVal }: { initVal?: number; } = {}): TemplateResult => {
    const [count, setCount] = useState(initVal || 0);
    return html`
        <fieldset class="template-control-group">
            <p>${t(i18nKey.app.template.content.state.label)}${ count }</p>
            <button class="state-reset" @click=${() => setCount(0)}>${t(i18nKey.app.template.content.state.button.reset)}</button>
            <button class="state-plus" @click=${() => setCount(prevCount => prevCount! + 1)}>➕</button>
            <button class="state-minus" @click=${() => setCount(prevCount => prevCount! - 1)}>➖</button>
        </fieldset>
    `;
};
