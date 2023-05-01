import type { State, Callable } from './state';
import { effectsSymbol } from './symbols';
import { createEffect } from './create-effect';

/** @internal */
export const setEffects = (state: State, cb: Callable): void => {
    state[effectsSymbol].push(cb);
};

/**
 * @en Accepts a function that contains imperative, possibly effectful code.
 * @ja 副作用を有する可能性のある命令型のコードの適用
 *
 * @param effect
 *  - `en` callback function that runs each time dependencies change
 *  - `ja` 依存関係が変更されるたびに実行されるコールバック関数
 * @param dependencies
 *  - `en` list of dependencies to the effect
 *  - `ja` 副作用発火のトリガーとなる依存関係のリスト
 */
export const useEffect: (effect: () => void, dependencies?: unknown[]) => void = createEffect(setEffects);
