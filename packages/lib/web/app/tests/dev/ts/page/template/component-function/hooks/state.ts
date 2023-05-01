import type { IHookStateContext } from './interfaces';
import type { Hook } from './hook';
import { setCurrent, clearCurrent } from './current';
import {
    hookSymbol,
    effectsSymbol,
    layoutEffectsSymbol,
    EffectsSymbols,
} from './symbols';

export interface Callable {
    call: (state: State) => void;
}

export class State<H = unknown> implements IHookStateContext<H> {
    update: VoidFunction;
    host: H;
    virtual?: boolean;
    [hookSymbol]: Map<number, Hook>;
    [effectsSymbol]: Callable[];
    [layoutEffectsSymbol]: Callable[];

    constructor(update: VoidFunction, host: H) {
        this.update = update;
        this.host = host;
        this[hookSymbol] = new Map();
        this[effectsSymbol] = [];
        this[layoutEffectsSymbol] = [];
    }

    run<T>(cb: () => T): T {
        setCurrent(this);
        const res = cb();
        clearCurrent();
        return res;
    }

    _runEffects(phase: EffectsSymbols): void {
        const effects = this[phase];
        setCurrent(this);
        for (const effect of effects) {
            effect.call(this);
        }
        clearCurrent();
    }

    runEffects(): void {
        this._runEffects(effectsSymbol);
    }

    runLayoutEffects(): void {
        this._runEffects(layoutEffectsSymbol);
    }

    teardown(): void {
        const hooks = this[hookSymbol];
        hooks.forEach(hook => {
            if ('function' === typeof hook.teardown) {
                hook.teardown();
                delete hook.teardown;
            }
        });
    }
}
