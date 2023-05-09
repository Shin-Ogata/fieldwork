import type { IHookContext } from './interfaces';
import { HookContextListener, /*getContextStack*/ } from './create-context';
import { Hook, makeHook } from './hook';
import type { State } from './state';
import { setEffects } from './use-effect';

/** @internal */
export const useContext = makeHook(class <T> extends Hook<[IHookContext<T>], T, unknown> implements HookContextListener {
    context!: IHookContext<T>;
    value!: T;
    _ranEffect: boolean;

    constructor(id: number, state: State, _: IHookContext<T>) { // eslint-disable-line @typescript-eslint/no-unused-vars
        super(id, state);
        this._ranEffect = false;
        setEffects(state, this);
    }

    update(context: IHookContext<T>): T {
        if (this.context !== context) {
            this.unsubscribe(this.context);
            this.context = context;
            context.consume(value => { this.value = value; });
            this.subscribe(context);
        }
        return this.value;
    }

    call(): void {
        if (!this._ranEffect) {
            this._ranEffect = true;
            this.state.update();
        }
    }

    teardown(): void {
        this.unsubscribe(this.context);
    }

///////////////////////////////////////////////////////////////////////
// implements: HookContextListener

    onUpdateContext(value: T): void {
        // this.value = value;
        // this.state.update();
    }

///////////////////////////////////////////////////////////////////////
// internal: listener

    private subscribe(context: IHookContext<T>): void {
        // const stack = getContextStack(context);
        // stack.add(this);
    }

    private unsubscribe(context: IHookContext<T>): void {
        // const stack = getContextStack(context);
        // stack.delete(this);
    }
});
