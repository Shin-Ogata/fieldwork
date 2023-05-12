import type { IHookContext } from './interfaces';
import { Hook, makeHook } from './hook';
import type { State } from './state';
import { setEffects } from './use-effect';

/** @internal */
export const useContext = makeHook(class <T> extends Hook<[IHookContext<T>], T, unknown> {
    private _ranEffect: boolean;

    constructor(id: number, state: State, _: IHookContext<T>) { // eslint-disable-line @typescript-eslint/no-unused-vars
        super(id, state);
        this._ranEffect = false;
        setEffects(state, this);
    }

    update(context: IHookContext<T>): T {
        let retval!: T;
        context.consume(value => { retval = value; });
        return retval;
    }

    call(): void {
        if (!this._ranEffect) {
            this._ranEffect = true;
            this.state.update();
        }
    }
});
