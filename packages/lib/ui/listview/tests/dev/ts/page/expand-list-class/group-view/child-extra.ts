import {
    type TemplateResult,
    html,
    render,
} from '@cdp/runtime';
import { type ListItemViewConstructionOptions, ListItemView } from '@cdp/ui-listview';

export interface GroupViewChildExtraConstructionOptions extends ListItemViewConstructionOptions{
    devId: string;
    devIndex: string;
}

/** リストビュー拡張子要素 */
export class GroupViewChildExtra extends ListItemView {

    private readonly _devId: string;
    private readonly _devIndex: string;

    constructor(options: GroupViewChildExtraConstructionOptions) {
        super(options);
        this._devId = options.devId;
        this._devIndex = options.devIndex;
        this.render();
    }

///////////////////////////////////////////////////////////////////////
// implements: ListItemView

    render(): this {
        if (null != this.$el) {
            render(this.template, this.$el[0]);
        }
        return this;
    }

///////////////////////////////////////////////////////////////////////
// internal:

    /** inline tagged template literal */
    private get template(): TemplateResult {
        return html`
            <div class="expandable-listitem extra" data-dev-id="${this._devId}" data-dev-index="${this._devIndex}">
                <div class="contents">
                    <figure>
                        <p class=" text-2l dev-index">${this._devIndex}</p>
                    </figure>
                </div>
            </div>
        `;
    }
}
