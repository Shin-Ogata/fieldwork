import type { PlainObject, UnknownFunction } from '@cdp/core-utils';
import {
    type TemplateResult,
    html,
    render,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { i18nKey } from '../../../types';
import { ComponentElement } from './base';
import type { Props } from '../props';

class DevIntervalComponent extends ComponentElement {
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
        this._props.on('interval', this.render.bind(this));

        if (!this._handler) {
            this._handler = {
                intervalStart: this.onStartInterval.bind(this),
                intervalStop: this.onStopInterval.bind(this),
            };
        }

        this.render();
    }

    protected onComponentRemoved(): void {
        console.log(`onComponentRemoved(${this.getAttribute('name')})`);
        this.onStopInterval();
    }

///////////////////////////////////////////////////////////////////////
// template:

    private template(): TemplateResult {
        const { now } = this._props;
        return html`
            <fieldset class="template-control-group">
                <p>${t(i18nKey.app.template.content.interval.label)}${ now }</p>
                <button class="interval-start" @click=${this._handler.intervalStart}>${t(i18nKey.app.template.content.interval.button.start)}</button>
                <button class="interval-stop" @click=${this._handler.intervalStop}>${t(i18nKey.app.template.content.interval.button.stop)}</button>
            </fieldset>
        `;
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onStartInterval(): void {
        this.onStopInterval();
        this._props.interval = setInterval(this.render.bind(this), 1000);
    }

    private onStopInterval(): void {
        this._props.interval && clearInterval(this._props.interval);
        this._props.interval = 0;
    }
}

customElements.define('dev-interval', DevIntervalComponent);
