import { FunctionPropertyNames } from '@cdp/core-utils';
import {
    toUrl,
    loadTemplateSource,
    toTemplateElement,
} from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import { JST, TemplateEngine } from '@cdp/template';
import { ViewEventsHash } from '@cdp/view';
import { ComponentViewBase } from './base';

const prepareTemplate = async (): Promise<JST> => {
    const content =  toTemplateElement(
        await loadTemplateSource('#template-component-view-state', { url: toUrl('/tpl/variations.tpl') })
    ) as HTMLTemplateElement;
    $(content).localize();
    return TemplateEngine.compile(content.innerHTML);
};

//__________________________________________________________________________________________________//

/**
 * component-view の state fieldset を担当するクラス
 */
export class StateComponentView extends ComponentViewBase {
    private _template!: JST;
    private _state = { count: 0 };
    private readonly _initVal: number;

    constructor({ initVal }: { initVal?: number; } = {}) {
        super();
        this._initVal = initVal || 0;
    }

///////////////////////////////////////////////////////////////////////
// override: ComponentViewBase

    events(): ViewEventsHash<HTMLElement, FunctionPropertyNames<StateComponentView>> {
        /* eslint-disable @typescript-eslint/unbound-method */
        return {
            'click .state-reset': this.onStateReset,
            'click .state-plus': this.onStatePlus,
            'click .state-minus': this.onStateMinus,
        };
        /* eslint-enable @typescript-eslint/unbound-method */
    }

    render(): void {
        this.$el.children().replaceWith(this._template(this._state));
    }

    protected async onComponentInit(): Promise<void> {
        this._template = await prepareTemplate();
        this._state = { count: this._initVal };
        this.$el.append(this._template(this._state));
    }

    protected onComponentRemoved(): void {
        // noop
    }

///////////////////////////////////////////////////////////////////////
// event handlers:

    private onStateReset(): void {
        this._state.count = 0;
        this.render();
    }

    private onStatePlus(): void {
        this._state.count++;
        this.render();
    }

    private onStateMinus(): void {
        this._state.count--;
        this.render();
    }
}
