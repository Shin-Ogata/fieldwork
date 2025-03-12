import {
    type PartInfo,
    type DirectiveResult,
    AsyncDirective,
    directive,
    noChange,
} from '@cdp/extension-template';
import {
    type UnknownFunction,
    noop,
    scheduler,
} from '@cdp/core-utils';
import { dom as $ } from '@cdp/dom';
import { State } from './state';

const schedule = scheduler();

interface Disconnectable {
    _$parent?: Disconnectable;
    parentNode: Element;
}

class HookDirective extends AsyncDirective {
    private readonly _state: State;
    private _renderer: UnknownFunction;
    private _args: unknown[];
    private _elObserved?: Node;
    private _disconnectedHandler?: typeof HookDirective.prototype.disconnected;

    constructor(part: PartInfo) {
        super(part);
        this._state = new State(() => this.redraw(), this);
        this._renderer = noop;
        this._args = [];
    }

    render(elRoot: Node | null, renderer: UnknownFunction, ...args: unknown[]): DirectiveResult {
        this._renderer = renderer;
        this._args = args;
        this.observe(elRoot);
        this.redraw();
        return noChange;
    }

    protected disconnected(): void {
        this._elObserved && $.utils.undetectify(this._elObserved);
        this._elObserved = undefined;
        this._state.teardown();
    }

    private redraw(): void {
        this._state.run(() => {
            const r = this._renderer(...this._args);
            this.setValue(r);
        });
        this._state.runLayoutEffects();
        schedule(() => this._state.runEffects());
    }

    private observe(elRoot: Node | null): void {
        if (this._disconnectedHandler) {
            return;
        }

        const { _$parent } = this as unknown as Disconnectable;
        this._elObserved = _$parent?.parentNode;
        if (this._elObserved) {
            $.utils.detectify(this._elObserved, elRoot!);
            this._elObserved.addEventListener('disconnected', this._disconnectedHandler = this.disconnected.bind(this));
        }
    }
}

/** @internal */
export const hooksWith = directive(HookDirective);
