import { UnknownFunction, noop } from '@cdp/core-utils';
import {
    PartInfo,
    AsyncDirective,
    DirectiveResult,
    directive,
    noChange,
} from '@cdp/template';
import { dom as $ } from '@cdp/dom';
import { State } from './state';

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
        this._state.runEffects();
    }

    private observe(elRoot: Node | null): void {
        if (this._disconnectedHandler) {
            return;
        }

        const { _$parent } = this as unknown as Disconnectable;
        this._elObserved = _$parent?.parentNode;
        if (this._elObserved) {
            $.utils.detectify(this._elObserved, elRoot as Node);
            this._elObserved.addEventListener('disconnected', this._disconnectedHandler = this.disconnected.bind(this));
        }
    }
}

export const hooksWith: (elRoot: Node | null, renderer: UnknownFunction, ...args: unknown[]) => unknown = directive(HookDirective);

export const hooks: (renderer: UnknownFunction, ...args: unknown[]) => unknown = hooksWith.bind(null, null);
