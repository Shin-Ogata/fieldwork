import {
    TemplateResult,
    html,
    directives,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { i18nKey } from '../../../types';
import type { Props } from '../props';

const { repeat } = directives;

export const List = (props: Props): TemplateResult => {
    const { list } = props;
    /* eslint-disable @typescript-eslint/indent */
    return html`
        <fieldset class="template-control-group">
            <p>${t(i18nKey.app.template.content.list.label)}${ list.length }</p>
            <button class="list-reset" @click=${() => props.resetListItem()}>${t(i18nKey.app.template.content.list.button.clear)}</button>
            <button class="list-plus" @click=${() => props.addListItem()}>➕</button>
            <button class="list-minus" @click=${() => props.removeListItem()}>➖</button>
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
    /* eslint-enable @typescript-eslint/indent */
};
