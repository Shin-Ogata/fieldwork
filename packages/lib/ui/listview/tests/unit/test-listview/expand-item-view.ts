import {
    type PlainObject,
    type CompiledTemplate,
    toTemplateElement,
    TemplateBridge,
    render,
} from '@cdp/runtime';
import { type ExpandableListItemViewConstructionOptions, ExpandableListItemView } from '@cdp/ui-listview';

export interface TestExpandItemViewConstructionOptions extends ExpandableListItemViewConstructionOptions {
    devId: string;
    devIndex: string;
}

export class TestExpandItemView extends ExpandableListItemView {

    private _template: CompiledTemplate;
    private _devId: string;
    private _devIndex: string;

    constructor(options: TestExpandItemViewConstructionOptions) {
        super(options);
        this._template = TemplateBridge.compile(this.template);
        this._devId = options.devId;
        this._devIndex = options.devIndex;
        this.render();
    }

///////////////////////////////////////////////////////////////////////
// test method

    is(method: 'Expanded' | 'Expanding' | 'Collapsing' | 'Switching'): boolean {
        return this[`is${method}`];
    }

///////////////////////////////////////////////////////////////////////
// implements: ExpandableListItemView

    render(): this {
        if (null != this.$el) {
            render(this._template(this.makeTemplateParam()), this.el);
        }
        return this;
    }

///////////////////////////////////////////////////////////////////////
// internal:

    /** inline mustache traditional template */
    private get template(): HTMLTemplateElement {
        return toTemplateElement(/*html*/`
            <div class="expandable-listitem preview" data-dev-id="{{devId}}" data-dev-index="{{index}}">
                <nav class="expand-button {{operation}} {{state}}" data-dev-id="{{devId}}">&nbsp;</nav>
                <div class="contents">
                    <figure>
                        <p class=" text-2l dev-index">{{index}}</p>
                    </figure>
                </div>
            </div>
        `)!;
    }

    private makeTemplateParam(): PlainObject {
        return {
            devId: this._devId,
            index: this._devIndex,
            operation: this.isExpanded ? 'to-collapse' : 'to-expand',
            state: this.hasChildren ? 'enable' : 'disable',
        };
    }
}
