/* eslint-disable no-global-assign, @typescript-eslint/no-explicit-any */

import {
    isFunction,
    verify,
    getConfig,
} from '@cdp/core-utils';
import { Subscription } from '@cdp/events';
import { CancelToken } from './cancel-token';

declare global {

    interface PromiseConstructor {
        new <T>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void, cancelToken?: CancelToken | null): Promise<T>;
        resolve<T>(value?: T | PromiseLike<T>, cancelToken?: CancelToken | null): Promise<T>;
    }

}

/** `Native Promise` constructor */
const NativePromise = Promise;
/** @internal */
const _create = Symbol('create');
/** @internal */
const _tokens = new WeakMap<Promise<unknown>, CancelToken>();

/**
 * @en Extended `Promise` class which enabled cancellation. <br>
 *     `Native Promise` constructor is overridden by framework default behaviour.
 * @ja キャンセルを可能にした `Promise` 拡張クラス <br>
 *     既定で `Native Promise` をオーバーライドする.
 */
class CancelablePromise<T> extends NativePromise<T> {

    /**
     * @en Overriding of the default constructor used for generation of an object.
     * @ja オブジェクトの生成に使われるデフォルトコンストラクタのオーバーライド
     *
     * @internal
     */
    static get [Symbol.species](): PromiseConstructor { return NativePromise; }

    /**
     * @en Creates a new resolved promise for the provided value.
     * @ja 新規に解決済み promise インスタンスを作成
     *
     * @internal
     *
     * @param value
     *  - `en` the value transmitted in promise chain.
     *  - `ja` `Promise` に伝達する値
     * @param cancelToken
     *  - `en` [[CancelToken]] instance create from [[CancelToken]].`source()`.
     *  - `ja` [[CancelToken]].`source()` より作成した [[CancelToken]] インスタンスを指定
     */
    static resolve<T>(value?: T | PromiseLike<T>, cancelToken?: CancelToken | null): CancelablePromise<T> {
        return this[_create](super.resolve(value), cancelToken);
    }

    /** @internal private construction */
    private static [_create]<T, TResult1 = T, TResult2 = never>(
        src: Promise<T>,
        token?: CancelToken | null,
        thenArgs?: [
            ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
            ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
        ] | null
    ): CancelablePromise<TResult1 | TResult2> {
        verify('instanceOf', NativePromise, src);

        let p: Promise<T | TResult1 | TResult2>;
        if (!(token instanceof CancelToken)) {
            p = src;
        } else if (thenArgs && (!isFunction(thenArgs[0]) || isFunction(thenArgs[1]))) {
            p = src;
        } else if (token.cancelable) {
            let s: Subscription;
            p = new NativePromise((resolve, reject) => {
                s = token.register(reject);
                super.prototype.then.call(src, resolve, reject);
            });
            const dispose = (): void => {
                s.unsubscribe();
                _tokens.delete(p);
            };
            p.then(dispose, dispose);
        } else if (token.requested) {
            p = super.reject(token.reason);
        } else if (token.closed) {
            p = src;
        } else {
            throw new Error('Unexpected Exception');
        }

        if (thenArgs) {
            p = super.prototype.then.apply(p, thenArgs);
        }
        if (token && token.cancelable) {
            _tokens.set(p, token);
        }

        p instanceof this || Object.setPrototypeOf(p, this.prototype);

        return p as CancelablePromise<TResult1 | TResult2>;
    }

    /**
     * constructor
     *
     * @param executor
     *  - `en` A callback used to initialize the promise. This callback is passed two arguments `resolve` and `reject`.
     *  - `ja` promise の初期化に使用するコールバックを指定. `resolve` と `reject` の2つの引数を持つ
     * @param cancelToken
     *  - `en` [[CancelToken]] instance create from [[CancelToken]].`source()`.
     *  - `ja` [[CancelToken]].`source()` より作成した [[CancelToken]] インスタンスを指定
     */
    constructor(
        executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void,
        cancelToken?: CancelToken | null
    ) {
        super(executor);
        return CancelablePromise[_create](this, cancelToken);
    }

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     *
     * @internal
     *
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return CancelablePromise[_create](this, _tokens.get(this), [onfulfilled, onrejected]);
    }

    /**
     * Attaches a callback for only the rejection of the Promise.
     *
     * @internal
     *
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult2 = never>(onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): Promise<T | TResult2> {
        return this.then(undefined, onrejected);
    }

    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). <br>
     * The resolved value cannot be modified from the callback.
     *
     * @internal
     *
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): Promise<T> {
        return CancelablePromise[_create](super.finally(onfinally), _tokens.get(this));
    }

}

/**
 * @en Switch the global `Promise` constructor `Native Promise` or [[CancelablePromise]]. <br>
 *     `Native Promise` constructor is overridden by framework default behaviour.
 * @ja グローバル `Promise` コンストラクタを `Native Promise` または [[CancelablePromise]] に切り替え <br>
 *     既定で `Native Promise` をオーバーライドする.
 *
 * @param enable
 *  - `en` `true`: use [[CancelablePromise]] /  `false`: use `Native Promise`
 *  - `ja` `true`: [[CancelablePromise]] を使用 / `false`: `Native Promise` を使用
 */
export function extendPromise(enable: boolean): PromiseConstructor {
    if (enable) {
        Promise = CancelablePromise;
    } else {
        Promise = NativePromise;
    }
    return Promise;
}

/** @internal global config options */
interface GlobalConfig {
    noAutomaticNativeExtend: boolean;
}

// default: automatic native promise override.
extendPromise(!getConfig<GlobalConfig>().noAutomaticNativeExtend);

export {
    CancelablePromise,
    CancelablePromise as Promise,
};
