import {
    type JST,
    toTemplateElement,
    TemplateEngine,
    dom as $,
} from '@cdp/runtime';
import { type ListItemViewConstructionOptions, ListItemView } from '@cdp/ui-listview';

export interface SimpleListItemViewConstructionOptions extends ListItemViewConstructionOptions{
    devId: string;
    devIndex?: number;
}

export class SimpleListItemView extends ListItemView {

    private readonly _template: JST;
    private readonly _devId: string;
    private readonly _index?: number;

    constructor(options: SimpleListItemViewConstructionOptions) {
        super(options);
        this._template = TemplateEngine.compile(this.template.innerHTML);
        this._devId = options.devId;
        this._index = options.devIndex;
        this.render();
    }

///////////////////////////////////////////////////////////////////////
// implements: ListItemView

    render(): this {
        if (null != this.$el && !this.hasChildNode) {
            const $item = $(this._template(this.makeTemplateParam()));
            $item.height(this.$el.height());
            this.$el.append($item);
        }
        return this;
    }

///////////////////////////////////////////////////////////////////////
// internal:

    /** inline mustache traditional template */
    private get template(): HTMLTemplateElement {
        return toTemplateElement(/*html*/`
            <div class="simple-listitem {{type}}" data-dev-id="{{devId}}" data-dev-index="{{index}}">
                <figure>
                    <p class=" text-2l dev-index">{{index}}</p>
                </figure>
                <div class="spinner large">&nbsp;</div>
            </div>
        `)!;
    }

    /** template に設定する JSON オブジェクトを作成 */
    private makeTemplateParam(): object {
        const index = this._index ?? this.index;
        return {
            devId: this._devId,
            index: String(index).padStart(3, '0'),
            type: (0 === index % 2) ? 'even' : 'odd',
        };
    }
}
