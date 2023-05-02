import { FunctionPropertyNames } from '@cdp/core-utils';
import {
    toUrl,
    loadTemplateSource,
    toTemplateElement,
} from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import { JST, TemplateEngine } from '@cdp/core-template';
import { ViewEventsHash } from '@cdp/view';
import { ComponentViewBase } from './base';

const prepareTemplate = async (): Promise<JST> => {
    const content =  toTemplateElement(
        await loadTemplateSource('#template-component-view-effect', { url: toUrl('/tpl/variations.tpl') })
    ) as HTMLTemplateElement;
    $(content).localize();
    return TemplateEngine.compile(content.innerHTML);
};

//__________________________________________________________________________________________________//

/**
 * component-view の effect fieldset を担当するクラス
 */
export class EffectComponentView extends ComponentViewBase {
    private _template!: JST;
    private _state = { clicked: 0 };

///////////////////////////////////////////////////////////////////////
// override: ComponentViewBase

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<EffectComponentView>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .effect': this.onEffect,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        const $label = this.$el.find('.effect-label');
        $label.text(String(this._state.clicked)).localize();
    }

    protected async onComponentInit(): Promise<void> {
        this._template = await prepareTemplate();
        this._state = { clicked: 0 };
        this.$el.append(this._template());
    }

    protected onComponentRemoved(): void {
        // noop
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onEffect(): void {
        this._state.clicked++;
        this.render();
    }
}
