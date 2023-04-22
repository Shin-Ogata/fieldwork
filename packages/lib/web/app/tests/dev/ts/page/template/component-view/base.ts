import { View } from '@cdp/view';
import type { Props } from '../props';

/**
 * コンポーネントの基底 View クラス
 */
export abstract class ComponentViewBase extends View {

///////////////////////////////////////////////////////////////////////
// draw:
    abstract render(): void;

///////////////////////////////////////////////////////////////////////
// override:

    /* eslint-disable @typescript-eslint/no-unused-vars */
    protected onComponentInit(props: Props): void | Promise<void> { /* overridable */ }
    protected onComponentRemoved(): void { /* overridable */ }
    /* eslint-enable @typescript-eslint/no-unused-vars */

///////////////////////////////////////////////////////////////////////
// internal:

    componentInit(el: HTMLElement, props: Props): void | Promise<void> {
        this.setElement(el);
        return this.onComponentInit(props);
    }

    componentRemoved(): void {
        this.release();
        return this.onComponentRemoved();
    }
}
