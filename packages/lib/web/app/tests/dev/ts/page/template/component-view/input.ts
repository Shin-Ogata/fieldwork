import { FunctionPropertyNames } from '@cdp/core-utils';
import {
    toUrl,
    loadTemplateSource,
    toTemplateElement,
} from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import { JST, TemplateEngine } from '@cdp/template';
import { ViewEventsHash } from '@cdp/view';
import { Props } from '../props';
import { ComponentViewBase } from './base';

const prepareTemplate = async (): Promise<JST> => {
    const content =  toTemplateElement(
        await loadTemplateSource('#template-component-view-input', { url: toUrl('/tpl/variations.tpl') })
    ) as HTMLTemplateElement;
    $(content).localize();
    return TemplateEngine.compile(content.innerHTML);
};

//__________________________________________________________________________________________________//

/**
 * component-view の input fieldset を担当するクラス
 */
export class InputComponentView extends ComponentViewBase {
    private _template!: JST;
    private _props!: Props;

///////////////////////////////////////////////////////////////////////
// override: ComponentViewBase

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<InputComponentView>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'input .input-text': this.onInput,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        this.$el.find('.input-label').text(this._props.text).localize();
    }

    protected async onComponentInit(props: Props): Promise<void> {
        this._template = await prepareTemplate();
        this._props = props;
        this._props.on('text', this.render.bind(this));
        this.$el.append(this._template());
    }

    protected onComponentRemoved(): void {
        // noop
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onInput(ev: UIEvent): void {
        this._props.text = (ev.target as HTMLInputElement).value;
    }
}
