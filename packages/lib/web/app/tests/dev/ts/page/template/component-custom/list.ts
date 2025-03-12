import type {
    PlainObject,
    UnknownFunction,
    FunctionPropertyNames,
} from '@cdp/core-utils';
import type { Subscribable } from '@cdp/events';
import type { ViewEventsHash } from '@cdp/view';
import {
    type TemplateResult,
    html,
    render,
    directives,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { i18nKey } from '../../../types';
import { ComponentElement } from './base';
import type { Props } from '../props';

const { repeat } = directives;

class DevListComponent extends ComponentElement {
    private _handler!: PlainObject<UnknownFunction>;
    private _props!: Props;

///////////////////////////////////////////////////////////////////////
// override: ComponentViewBase

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<DevListComponent>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .list-reset': this.onListReset,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        render(this.template(), this.el);
    }

    protected onComponentInit(props: Props): void {
        console.log(`onComponentInit(${this.getAttribute('name')})`);
        this._props = props;
        this.listenTo(this._props as unknown as Subscribable<Props>, 'list', this.render.bind(this));

        if (!this._handler) {
            this._handler = {
                listPlus: this.onListPlus.bind(this),
                listMinus: this.onListMinus.bind(this),
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
        const { list } = this._props;
        /* eslint-disable @stylistic/indent */
        return html`
            <fieldset class="template-control-group">
                <p>${t(i18nKey.app.template.content.list.label)}${ list.length }</p>
                <button class="list-reset">${t(i18nKey.app.template.content.list.button.clear)}</button>
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
        `;
        /* eslint-enable @stylistic/indent */
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

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

customElements.define('dev-list', DevListComponent);
