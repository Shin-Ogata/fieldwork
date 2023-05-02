import { FunctionPropertyNames } from '@cdp/core-utils';
import {
    toUrl,
    loadTemplateSource,
    toTemplateElement,
} from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import { JST, TemplateEngine } from '@cdp/core-template';
import { ViewEventsHash } from '@cdp/view';
import { Props } from '../props';
import { ComponentViewBase } from './base';

const prepareTemplate = async (): Promise<JST> => {
    const content =  toTemplateElement(
        await loadTemplateSource('#template-component-view-list', { url: toUrl('/tpl/variations.tpl') })
    ) as HTMLTemplateElement;
    $(content).localize();
    return TemplateEngine.compile(content.innerHTML);
};

//__________________________________________________________________________________________________//

/**
 * component-view の list fieldset を担当するクラス
 */
export class ListComponentView extends ComponentViewBase {
    private _template!: JST;
    private _props!: Props;

///////////////////////////////////////////////////////////////////////
// override: ComponentViewBase

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<ListComponentView>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .list-reset': this.onListReset,
            'click .list-plus': this.onListPlus,
            'click .list-minus': this.onListMinus,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        this.$el.children().replaceWith(this._template(this._props.toJSON()));
    }

    protected async onComponentInit(props: Props): Promise<void> {
        this._template = await prepareTemplate();
        this._props = props;
        this._props.on('list', this.render.bind(this));
        this.$el.append(this._template(this._props.toJSON()));
    }

    protected onComponentRemoved(): void {
        // noop
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
