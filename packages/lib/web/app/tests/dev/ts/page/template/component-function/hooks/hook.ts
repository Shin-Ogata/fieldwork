import type { IHookStateContext } from './interfaces';
import { current, notify } from './current';
import { hookSymbol } from './symbols';

export abstract class Hook<P extends unknown[] = unknown[], R = unknown, H = unknown> {
    id: number;
    state: IHookStateContext<H>;

    constructor(id: number, state: IHookStateContext<H>) {
        this.id = id;
        this.state = state;
    }

    abstract update(...args: P): R;
    teardown?(): void;
}

export interface CustomHook<P extends unknown[] = unknown[], R = unknown, H = unknown> {
    new (id: number, state: IHookStateContext<H>, ...args: P): Hook<P, R, H>;
}

const use = <P extends unknown[], R, H = unknown>(Hook: CustomHook<P, R, H>, ...args: P): R => {
    const id = notify();
    const hooks = (current as any)[hookSymbol] as Map<number, Hook>; // eslint-disable-line @typescript-eslint/no-explicit-any

    let hook = hooks.get(id) as Hook<P, R, H> | undefined;
    if (!hook) {
        hook = new Hook(id, current as IHookStateContext<H>, ...args);
        hooks.set(id, hook);
    }

    return hook.update(...args);
};

export const makeHook = <P extends unknown[], R, H = unknown>(Hook: CustomHook<P, R, H>): (...args: P) => R => {
    return use.bind(null, Hook);
};

