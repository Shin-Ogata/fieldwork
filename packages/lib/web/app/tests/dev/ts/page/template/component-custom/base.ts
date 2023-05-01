import { Constructor, mixins } from '@cdp/core-utils';
import { EventReceiver } from '@cdp/events';
import { ViewCore } from '@cdp/view';
import type { Props } from '../props';

/**
 * コンポーネントの基底 View クラス
 */
export abstract class ComponentElement extends mixins(HTMLElement, ViewCore as Constructor<ViewCore>, EventReceiver) {

    private readonly _root: ShadowRoot;

    constructor() {
        super();
        this.super(ViewCore as Constructor<ViewCore>);
        this.super(EventReceiver);
        this._root = this.attachShadow({ mode: 'closed' });
    }

    get root(): ShadowRoot {
        return this._root;
    }

    release(): this {
        super.release();
        this.stopListening();
        return this;
    }

///////////////////////////////////////////////////////////////////////
// override:

    /* eslint-disable @typescript-eslint/no-unused-vars */
    protected onComponentInit(props: Props): void | Promise<void> { /* overridable */ }
    protected onComponentRemoved(): void { /* overridable */ }
    /* eslint-enable @typescript-eslint/no-unused-vars */

///////////////////////////////////////////////////////////////////////
// custom-component:

    connectedCallback(): void {
        this.setElement(this._root as unknown as HTMLElement);
    }

    disconnectedCallback(): void {
        this.release();
        return this.onComponentRemoved();
    }

///////////////////////////////////////////////////////////////////////
// internal:

    async componentInit(props: Props): Promise<void> {
        return this.onComponentInit(props);
    }
}
