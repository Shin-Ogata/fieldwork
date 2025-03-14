import {
    type TemplateResult,
    html,
    hooks,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { i18nKey } from '../../../types';
import { useInterval } from './hooks';

const  { useState } = hooks;

export const Interval = (): TemplateResult => {
    const [now, setTime] = useState<string>();
    const { start, stop } = useInterval({
        duration: 1000,
        startImmediate: false,
        callback: (intervalState: boolean) => {
            setTime(intervalState ? new Date().toLocaleTimeString() : '');
        },
    });

    return html`
        <fieldset class="template-control-group">
            <p>${t(i18nKey.app.template.content.interval.label)}${ now }</p>
            <button class="interval-start" @click=${() => start()}>${t(i18nKey.app.template.content.interval.button.start)}</button>
            <button class="interval-stop" @click=${() => stop()}>${t(i18nKey.app.template.content.interval.button.stop)}</button>
        </fieldset>
    `;
};
