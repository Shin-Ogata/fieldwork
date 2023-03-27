import type { RouteAyncProcess } from './interfaces';

/** @internal RouteAyncProcess implementation */
export class RouteAyncProcessContext implements RouteAyncProcess {
    private readonly _promises: Promise<unknown>[] = [];

///////////////////////////////////////////////////////////////////////
// implements: RouteAyncProcess

    register(promise: Promise<unknown>): void {
        this._promises.push(promise);
    }

///////////////////////////////////////////////////////////////////////
// internal methods:

    get promises(): readonly Promise<unknown>[] {
        return this._promises;
    }

    public async complete(): Promise<void> {
        await Promise.all(this._promises);
        this._promises.length = 0;
    }
}
