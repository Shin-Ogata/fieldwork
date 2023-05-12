import type { UnknownFunction } from '@cdp/core-utils';
import type { HookStateUpdater, HookReducer, IHookContext } from './interfaces';
export * from './interfaces';
export { Hook, makeHook } from './hook';
/**
 * @en Provides functionality parity with the React hooks concept.
 * @ja React hooks コンセプトと同等の機能を提供
 *
 * @example <br>
 *
 * ```ts
 * import { html, render, hooks } from '@cdp/runtime';
 * const { useState } = hooks;
 *
 * // function component
 * function App() {
 *     const [count, setCount] = useState(0);
 *     return html`
 *         <p>Count: ${ count }</p>
 *         <button class="state-plus" @click=${() => setCount(prevCount => prevCount! + 1)}>➕</button>
 *     `;
 * }
 *
 * // render with hooks
 * render(hooks(App), document.body);
 * ```
 */
export interface Hooks {
    /**
     * @en Provides functionality parity with the React hooks concept. <br>
     *     Add Hooks feature to template literal syntax.
     * @ja React hooks コンセプトと同等の機能を提供 <br>
     *     テンプレートリテラル構文に Hooks 機能を付加
     *
     * @example <br>
     *
     * ```ts
     * import { html, render, hooks } from '@cdp/runtime';
     * const { useState } = hooks;
     *
     * // function component
     * function App() {
     *     const [count, setCount] = useState(0);
     *     return html`
     *         <p>Count: ${ count }</p>
     *         <button class="state-plus" @click=${() => setCount(prevCount => prevCount! + 1)}>➕</button>
     *     `;
     * }
     *
     * // enabling hooks
     * render(hooks(App), document.body);
     * ```
     *
     * @param renderer
     *  - `en` A function object that returns a template literal syntax
     *  - `ja` テンプレートリテラル構文を返却する関数オブジェクト
     * @param args
     *  - `en` Arguments passed template literal syntax
     *  - `ja` テンプレートリテラル構文にわたる引数
     */
    (renderer: UnknownFunction, ...args: unknown[]): unknown;
    /**
     * @en Add Hooks feature to template literal syntax. (specify a DOM disconnect detection element)
     * @ja テンプレートリテラル構文に Hooks 機能を付加 (DOM 切断検知要素を指定)
     *
     * @example <br>
     *
     * ```ts
     * const el = document.getElementById('some-page');
     * // enabling hooks with root element
     * render(hooks.with(el, App), document.body);
     * ```
     *
     * @param elRoot
     *  - `en` Root element used for DOM disconnection detection. If `null` passed, `document` is specified
     *  - `ja` DOM 切断検知に使用するルート要素. `null` が渡ると `document` が指定される
     * @param renderer
     *  - `en` A function object that returns a template literal syntax
     *  - `ja` テンプレートリテラル構文を返却する関数オブジェクト
     * @param args
     *  - `en` Arguments passed template literal syntax
     *  - `ja` テンプレートリテラル構文にわたる引数
     */
    with: (elRoot: Node | null, renderer: UnknownFunction, ...args: unknown[]) => unknown;
    /**
     * @en Return a stateful value and a function to update it.
     * @ja ステートフルな値と、それを更新するための関数を返却
     *
     * @param initialState
     *  - `en` The value you want the state to be initially.
     *  - `ja` 状態の初期化値
     * @returns
     *  - `en` returns an array with exactly two values. [`currentState`, `updateFunction`]
     *  - `ja` 2つの値を持つ配列を返却 [`currentState`, `updateFunction`]
     */
    useState: <T>(initialState?: T) => readonly [
        T extends ((...args: unknown[]) => infer R) ? R : T,
        HookStateUpdater<T extends ((...args: unknown[]) => infer S) ? S : T>
    ];
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
    useEffect: (effect: () => void, dependencies?: unknown[]) => void;
    /**
     * @en Accepts a function that contains imperative, possibly effectful code. <br>
     *     Unlike {@link Hooks.useEffect} , it is executed before the component is rendered and the new element is displayed on the screen.
     * @ja 副作用を有する可能性のある命令型のコードの適用 <br>
     *     {@link Hooks.useEffect} と異なり, コンポーネントがレンダリングされて新しい要素が画面に表示される前に実行される。
     *
     * @param effect
     *  - `en` callback function that runs each time dependencies change
     *  - `ja` 依存関係が変更されるたびに実行されるコールバック関数
     * @param dependencies
     *  - `en` list of dependencies to the effect
     *  - `ja` 副作用発火のトリガーとなる依存関係のリスト
     */
    useLayoutEffect: (effect: () => void, dependencies?: unknown[]) => void;
    /**
     * @en Used to reduce component re-rendering. <br>
     *     Cache the return value of the function and return the cached value when called with the same arguments.
     * @ja コンポーネントの再レンダリングを抑えるために使用 <br>
     *     関数の戻り値をキャッシュし、同じ引数で呼び出された場合にキャッシュされた値を返却
     *
     * @param fn
     *  - `en` A function that returns a value
     *  - `ja` 値を返す関数
     * @param values
     *  - `en` An array of values that are used as arguments for `fn`
     *  - `ja` `fn` の引数として使用される値の配列
     */
    useMemo: <T>(fn: () => T, values: unknown[]) => T;
    /**
     * @en Lets you reference a value that’s not needed for rendering. <br>
     *     Mainly available for accessing DOM nodes.
     * @ja レンダリングに不要な値を参照可能にする<br>
     *     主に DOM ノードへのアクセスに利用可能
     *
     * @param initialValue
     *  - `en` The initial value of the reference
     *  - `ja` 参照の初期値
     */
    useRef: <T>(initialValue: T) => {
        current: T;
    };
    /**
     * @en Returns a memoized version of the callback function that only changes if the dependencies change. <br>
     *     Useful for passing callbacks to optimized child components that rely on referential equality.
     * @ja 依存関係が変更された場合にのみ変更されるコールバック関数のメモ化バージョンを返却 <br>
     *     参照等価性に依存する最適化された子コンポーネントにコールバックを渡す場合に役立つ
     *
     * @param fn
     *  - `en` The function to memoize
     *  - `ja` メモ化する関数
     * @param inputs
     *  - `en` An array of inputs to watch for changes
     *  - `ja` 変更を監視する入力の配列
     */
    useCallback: <T extends UnknownFunction>(fn: T, inputs: unknown[]) => T;
    /**
     * @en Hook API for managing state in function components.
     * @ja 関数コンポーネントで状態を管理するための Hook API
     *
     * @param reducer
     *  - `en` A function that takes the current state and an action and returns a new state
     *  - `ja` 現在の状態とアクションを受け取り、新しい状態を返す関数
     * @param initialState
     *  - `en` The initial state of the reducer
     *  - `ja` リデューサーの初期状態を指定
     * @param init
     *  - `en` An optional function that returns the initial state of the reducer
     *  - `ja` リデューサーの初期状態を返すオプションの関数
     */
    useReducer: <S, I, A>(reducer: HookReducer<S, A>, initialState: I, init?: ((_: I) => S) | undefined) => readonly [S, (action: A) => void];
    /**
     * @en Create a new context object. Context objects are used to share data that is considered "global".
     * @ja 新しいコンテキストオブジェクトを作成する。コンテキストオブジェクトは,「グローバル」と考えられるデータを共有するために使用される。
     *
     * @param defaultValue
     *  - `en`: The default value for the context object
     *  - `ja`: コンテキストオブジェクトのデフォルト値
     */
    createContext: <T>(defaultValue?: T) => IHookContext<T>;
    /**
     * @en Returns the current context value for the specified context object.
     * @ja 指定されたコンテキストオブジェクトに対する現在のコンテキスト値を返却
     *
     * @param context
     *  - `en`: the context object returned from {@link Hooks.createContext}
     *  - `ja`: {@link Hooks.createContext} から返されるコンテキストオブジェクト
     */
    useContext: <T>(context: IHookContext<T>) => T;
}
declare const hooks: Hooks;
export { hooks };
