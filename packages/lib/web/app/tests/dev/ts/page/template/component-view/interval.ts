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
        await loadTemplateSource('#template-component-view-interval', { url: toUrl('/tpl/variations.tpl') })
    ) as HTMLTemplateElement;
    $(content).localize();
    return TemplateEngine.compile(content.innerHTML);
};

//__________________________________________________________________________________________________//

/**
 * component-view の interval fieldset を担当するクラス
 */
export class IntervalComponentView extends ComponentViewBase {
    private _template!: JST;
    private _props!: Props;

///////////////////////////////////////////////////////////////////////
// override: ComponentViewBase

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<IntervalComponentView>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .interval-start': this.onStartInterval,
            'click .interval-stop': this.onStopInterval,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        this.$el.children().replaceWith(this._template(this._props.toJSON()));
    }

    protected async onComponentInit(props: Props): Promise<void> {
        this._template = await prepareTemplate();
        this._props = props;
        this.$el.append(this._template(this._props.toJSON()));
    }

    protected onComponentRemoved(): void {
        this.onStopInterval();
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
