/*!
 * @cdp/template 0.9.17
 *   HTML template library
 */

import { html, directives, directive, AsyncDirective, noChange } from '@cdp/extension-template';
export * from '@cdp/extension-template';
import { createMustacheTransformer, createStampinoTransformer } from '@cdp/extension-template-bridge';
export * from '@cdp/extension-template-bridge';
import { isFunction, unescapeHTML, scheduler, noop, deepEqual } from '@cdp/core-utils';
import { TemplateEngine } from '@cdp/core-template';
import { loadTemplateSource } from '@cdp/web-utils';
export { clearTemplateCache } from '@cdp/web-utils';
import { dom } from '@cdp/dom';

/** @internal builtin transformers (default: mustache). */
const _builtins = {
    mustache: createMustacheTransformer(html, directives.unsafeHTML),
    stampino: createStampinoTransformer(),
};
/**
 * @en Template bridge for other template engine source.
 * @ja 他のテンプレートエンジンの入力を変換するテンプレートブリッジクラス
 */
class TemplateBridge {
    /** @internal */
    static _transformer = _builtins.mustache;
    ///////////////////////////////////////////////////////////////////////
    // public static methods:
    /**
     * @en Get [[CompiledTemplate]] from template source.
     * @ja テンプレート文字列から [[CompiledTemplate]] を取得
     *
     * @param template
     *  - `en` template source string / template element
     *  - `ja` テンプレート文字列 / テンプレートエレメント
     * @param options
     *  - `en` compile options
     *  - `ja` コンパイルオプション
     */
    static compile(template, options) {
        const { transformer } = Object.assign({ transformer: TemplateBridge._transformer }, options);
        const engine = transformer(template);
        const jst = (view) => {
            return engine(view);
        };
        jst.source = template instanceof HTMLTemplateElement ? template.innerHTML : template;
        return jst;
    }
    /**
     * @en Update default transformer object.
     * @ja 既定の変換オブジェクトの更新
     *
     * @param newTransformer
     *  - `en` new transformer object.
     *  - `ja` 新しい変換オブジェクトを指定.
     * @returns
     *  - `en` old transformer object.
     *  - `ja` 以前の変換オブジェクトを返却
     */
    static setTransformer(newTransformer) {
        const oldTransformer = TemplateBridge._transformer;
        TemplateBridge._transformer = newTransformer;
        return oldTransformer;
    }
    /**
     * @en Get built-in transformer name list.
     * @ja 組み込みの変換オブジェクトの名称一覧を取得
     *
     * @returns
     *  - `en` name list.
     *  - `ja` 名称一覧を返却
     */
    static get builtins() {
        return Object.keys(_builtins);
    }
    /**
     * @en Get built-in transformer object.
     * @ja 組み込みの変換オブジェクトを取得
     *
     * @param name
     *  - `en` transformer object name.
     *  - `ja` 変換オブジェクトの名前を指定.
     * @returns
     *  - `en` transformer object.
     *  - `ja` 変換オブジェクトを返却
     */
    static getBuitinTransformer(name) {
        return _builtins[name];
    }
}

/**
 * @en Get compiled JavaScript template.
 * @ja コンパイル済み JavaScript テンプレート取得
 *
 * @param selector
 *  - `en` The selector string of DOM.
 *  - `ja` DOM セレクタ文字列
 * @param options
 *  - `en` query options
 *  - `ja` クエリオプション
 */
async function getTemplate(selector, options) {
    const { type, url, noCache, callback } = Object.assign({ type: 'engine', noCache: false }, options);
    let src = await loadTemplateSource(selector, { url, noCache });
    if (!src) {
        throw new URIError(`cannot specified template resource. { selector: ${selector},  url: ${url} }`);
    }
    if (isFunction(callback)) {
        src = await callback(src);
    }
    switch (type) {
        case 'engine':
            return TemplateEngine.compile(src instanceof HTMLTemplateElement ? unescapeHTML(src.innerHTML) : src, options);
        case 'bridge':
            return TemplateBridge.compile(src, options);
        default:
            throw new TypeError(`[type: ${type}] is unknown.`);
    }
}

let _currentId = 0;
/** @internal */
let current;
/** @internal */
const setCurrent = (state) => {
    current = state;
};
/** @internal */
const clearCurrent = () => {
    current = null;
    _currentId = 0;
};
/** @internal */
const notify = () => {
    return _currentId++;
};

/** @internal */ const hookSymbol = Symbol('hook');
/** @internal */ const effectsSymbol = Symbol('effects');
/** @internal */ const layoutEffectsSymbol = Symbol('layoutEffects');

/** @internal */
class State {
    update;
    host;
    virtual;
    [hookSymbol];
    [effectsSymbol];
    [layoutEffectsSymbol];
    constructor(update, host) {
        this.update = update;
        this.host = host;
        this[hookSymbol] = new Map();
        this[effectsSymbol] = [];
        this[layoutEffectsSymbol] = [];
    }
    run(cb) {
        setCurrent(this);
        const res = cb();
        clearCurrent();
        return res;
    }
    _runEffects(phase) {
        const effects = this[phase];
        setCurrent(this);
        for (const effect of effects) {
            effect.call(this);
        }
        clearCurrent();
    }
    runEffects() {
        this._runEffects(effectsSymbol);
    }
    runLayoutEffects() {
        this._runEffects(layoutEffectsSymbol);
    }
    teardown() {
        const hooks = this[hookSymbol];
        for (const [, hook] of hooks) {
            ('function' === typeof hook.teardown) && hook.teardown();
            delete hook.teardown;
        }
    }
}

const schedule = scheduler();
class HookDirective extends AsyncDirective {
    _state;
    _renderer;
    _args;
    _elObserved;
    _disconnectedHandler;
    constructor(part) {
        super(part);
        this._state = new State(() => this.redraw(), this);
        this._renderer = noop;
        this._args = [];
    }
    render(elRoot, renderer, ...args) {
        this._renderer = renderer;
        this._args = args;
        this.observe(elRoot);
        this.redraw();
        return noChange;
    }
    disconnected() {
        this._elObserved && dom.utils.undetectify(this._elObserved);
        this._elObserved = undefined;
        this._state.teardown();
    }
    redraw() {
        this._state.run(() => {
            const r = this._renderer(...this._args);
            this.setValue(r);
        });
        this._state.runLayoutEffects();
        schedule(() => this._state.runEffects());
    }
    observe(elRoot) {
        if (this._disconnectedHandler) {
            return;
        }
        const { _$parent } = this;
        this._elObserved = _$parent?.parentNode;
        if (this._elObserved) {
            dom.utils.detectify(this._elObserved, elRoot);
            this._elObserved.addEventListener('disconnected', this._disconnectedHandler = this.disconnected.bind(this));
        }
    }
}
/** @internal */
const hooksWith = directive(HookDirective);

/**
 * @en Base abstract class for Custom Hook Class.
 * @ja カスタムフッククラスの基底抽象クラス
 */
class Hook {
    id;
    state;
    constructor(id, state) {
        this.id = id;
        this.state = state;
    }
}
const use = (Hook, ...args) => {
    const id = notify();
    const hooks = current[hookSymbol]; // eslint-disable-line @typescript-eslint/no-explicit-any
    let hook = hooks.get(id);
    if (!hook) {
        hook = new Hook(id, current, ...args);
        hooks.set(id, hook);
    }
    return hook.update(...args);
};
/**
 * @en Factory function for creating custom hooks.
 * @ja カスタムフック作成用ファクトリ関数
 *
 * @example <br>
 *
 * ```ts
 * import { IHookStateContext, Hook, makeHook } from '@cdp/runtime';
 *
 * export const useMemo = makeHook(class <T> extends Hook {
 *     value: T;
 *     values: unknown[];
 *
 *     constructor(id: number, state: State, fn: () => T, values: unknown[]) {
 *         super(id, state);
 *         this.value = fn();
 *         this.values = values;
 *     }
 *
 *     update(fn: () => T, values: unknown[]): T {
 *         if (this.hasChanged(values)) {
 *             this.values = values;
 *             this.value = fn();
 *         }
 *         return this.value;
 *     }
 *
 *     hasChanged(values: unknown[] = []): boolean {
 *         return values.some((value, i) => this.values[i] !== value);
 *     }
 * });
 * ```
 */
const makeHook = (Hook) => {
    return use.bind(null, Hook);
};

/** @internal */
const useState = makeHook(class extends Hook {
    args;
    constructor(id, state, initialValue) {
        super(id, state);
        this.updater = this.updater.bind(this);
        if ('function' === typeof initialValue) {
            initialValue = initialValue();
        }
        this.makeArgs(initialValue);
    }
    update() {
        return this.args;
    }
    updater(value) {
        const [previousValue] = this.args;
        if ('function' === typeof value) {
            const updaterFn = value;
            value = updaterFn(previousValue);
        }
        if (deepEqual(previousValue, value)) {
            return;
        }
        this.makeArgs(value);
        this.state.update();
    }
    makeArgs(value) {
        this.args = Object.freeze([value, this.updater]); // eslint-disable-line @typescript-eslint/unbound-method
    }
});

/* eslint-disable
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/no-non-null-assertion,
    @typescript-eslint/explicit-function-return-type,
 */
/** @internal */
const createEffect = (setEffects) => {
    return makeHook(class extends Hook {
        callback;
        lastValues;
        values;
        _teardown;
        constructor(id, state, ignored1, ignored2) {
            super(id, state);
            setEffects(state, this);
        }
        update(callback, values) {
            this.callback = callback;
            this.values = values;
        }
        call() {
            if (!this.values || this.hasChanged()) {
                this.run();
            }
            this.lastValues = this.values;
        }
        run() {
            this.teardown();
            this._teardown = this.callback.call(this.state);
        }
        teardown() {
            if ('function' === typeof this._teardown) {
                this._teardown();
            }
        }
        hasChanged() {
            return !this.lastValues || this.values.some((value, i) => !deepEqual(this.lastValues[i], value));
        }
    });
};

/** @internal */
const setEffects = (state, cb) => {
    state[effectsSymbol].push(cb);
};
/** @internal */
const useEffect = createEffect(setEffects);

const setLayoutEffects = (state, cb) => {
    state[layoutEffectsSymbol].push(cb);
};
/** @internal */
const useLayoutEffect = createEffect(setLayoutEffects);

/** @internal */
const useMemo = makeHook(class extends Hook {
    value;
    values;
    constructor(id, state, fn, values) {
        super(id, state);
        this.value = fn();
        this.values = values;
    }
    update(fn, values) {
        if (this.hasChanged(values)) {
            this.values = values;
            this.value = fn();
        }
        return this.value;
    }
    hasChanged(values = []) {
        return values.some((value, i) => this.values[i] !== value);
    }
});

/** @internal */
const useRef = (initialValue) => useMemo(() => ({
    current: initialValue
}), []);

/** @internal */
const useCallback = (fn, inputs) => useMemo(() => fn, inputs);

/** @internal */
const useReducer = makeHook(class extends Hook {
    reducer;
    currentState;
    constructor(id, state, _, initialState, init) {
        super(id, state);
        this.dispatch = this.dispatch.bind(this);
        this.currentState = undefined !== init ? init(initialState) : initialState;
    }
    update(reducer) {
        this.reducer = reducer;
        return [this.currentState, this.dispatch]; // eslint-disable-line @typescript-eslint/unbound-method
    }
    dispatch(action) {
        this.currentState = this.reducer(this.currentState, action);
        this.state.update();
    }
});

const hooks = hooksWith.bind(null, null);
hooks.with = hooksWith;
hooks.useState = useState;
hooks.useEffect = useEffect;
hooks.useLayoutEffect = useLayoutEffect;
hooks.useMemo = useMemo;
hooks.useRef = useRef;
hooks.useCallback = useCallback;
hooks.useReducer = useReducer;

export { Hook, TemplateBridge, getTemplate, hooks, makeHook };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUubWpzIiwic291cmNlcyI6WyJicmlkZ2UudHMiLCJsb2FkZXIudHMiLCJob29rcy9jdXJyZW50LnRzIiwiaG9va3Mvc3ltYm9scy50cyIsImhvb2tzL3N0YXRlLnRzIiwiaG9va3MvZGlyZWN0aXZlLnRzIiwiaG9va3MvaG9vay50cyIsImhvb2tzL3VzZS1zdGF0ZS50cyIsImhvb2tzL2NyZWF0ZS1lZmZlY3QudHMiLCJob29rcy91c2UtZWZmZWN0LnRzIiwiaG9va3MvdXNlLWxheW91dC1lZmZlY3QudHMiLCJob29rcy91c2UtbWVtby50cyIsImhvb2tzL3VzZS1yZWYudHMiLCJob29rcy91c2UtY2FsbGJhY2sudHMiLCJob29rcy91c2UtcmVkdWNlci50cyIsImhvb2tzL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgVGVtcGxhdGVSZXN1bHQsXG4gICAgU1ZHVGVtcGxhdGVSZXN1bHQsXG4gICAgaHRtbCxcbiAgICBkaXJlY3RpdmVzLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQge1xuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS1icmlkZ2UnO1xuaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsIGJ1aWx0aW4gdHJhbnNmb3JtZXJzIChkZWZhdWx0OiBtdXN0YWNoZSkuICovXG5jb25zdCBfYnVpbHRpbnM6IFJlY29yZDxzdHJpbmcsIFRlbXBsYXRlVHJhbnNmb3JtZXI+ID0ge1xuICAgIG11c3RhY2hlOiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWwsIGRpcmVjdGl2ZXMudW5zYWZlSFRNTCksXG4gICAgc3RhbXBpbm86IGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIoKSxcbn07XG5cbi8qKlxuICogQGVuIENvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUgaW50ZXJmYWNlXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/44OG44Oz44OX44Os44O844OI5qC857SN44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFNvdXJjZSB0ZW1wbGF0ZSBzdHJpbmdcbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICovXG4gICAgc291cmNlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbVGVtcGxhdGVSZXN1bHRdXSB0aGF0IGFwcGxpZWQgZ2l2ZW4gcGFyYW1ldGVyKHMpLlxuICAgICAqIEBqYSDjg5Hjg6njg6Hjg7zjgr/jgpLpgannlKjjgZcgW1tUZW1wbGF0ZVJlc3VsdF1dIOOBuOWkieaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIHZpZXdcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHBhcmFtZXRlcnMgZm9yIHNvdXJjZS5cbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0O1xufVxuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlQnJpZGdlXV0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEgW1tUZW1wbGF0ZUJyaWRnZV1dIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRyYW5zZm9ybWVyPzogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbn1cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgYnJpZGdlIGZvciBvdGhlciB0ZW1wbGF0ZSBlbmdpbmUgc291cmNlLlxuICogQGphIOS7luOBruODhuODs+ODl+ODrOODvOODiOOCqOODs+OCuOODs+OBruWFpeWKm+OCkuWkieaPm+OBmeOCi+ODhuODs+ODl+ODrOODvOODiOODluODquODg+OCuOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVCcmlkZ2Uge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHN0YXRpYyBfdHJhbnNmb3JtZXIgPSBfYnVpbHRpbnMubXVzdGFjaGU7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbQ29tcGlsZWRUZW1wbGF0ZV1dIGZyb20gdGVtcGxhdGUgc291cmNlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJfjgYvjgokgW1tDb21waWxlZFRlbXBsYXRlXV0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmcgLyB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJcgLyDjg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg6zjg6Hjg7Pjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zKTogQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNmb3JtZXIgfSA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2Zvcm1lcjogVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyIH0sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBlbmdpbmUgPSB0cmFuc2Zvcm1lcih0ZW1wbGF0ZSk7XG4gICAgICAgIGNvbnN0IGpzdCA9ICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBlbmdpbmUodmlldyk7XG4gICAgICAgIH07XG4gICAgICAgIGpzdC5zb3VyY2UgPSB0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGRlZmF1bHQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDml6Llrprjga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdUcmFuc2Zvcm1lclxuICAgICAqICAtIGBlbmAgbmV3IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOS7peWJjeOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2V0VHJhbnNmb3JtZXIobmV3VHJhbnNmb3JtZXI6IFRlbXBsYXRlVHJhbnNmb3JtZXIpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICAgICAgY29uc3Qgb2xkVHJhbnNmb3JtZXIgPSBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXI7XG4gICAgICAgIFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciA9IG5ld1RyYW5zZm9ybWVyO1xuICAgICAgICByZXR1cm4gb2xkVHJhbnNmb3JtZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBuYW1lIGxpc3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeensOS4gOimp+OCkuWPluW+l1xuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG5hbWUgbGlzdC5cbiAgICAgKiAgLSBgamFgIOWQjeensOS4gOimp+OCkui/lOWNtFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgYnVpbHRpbnMoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoX2J1aWx0aW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0IG5hbWUuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY3jgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0QnVpdGluVHJhbnNmb3JtZXIobmFtZTogc3RyaW5nKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfYnVpbHRpbnNbbmFtZV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5lc2NhcGVIVE1MLCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgSlNULFxuICAgIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVFbmdpbmUsXG59IGZyb20gJ0BjZHAvY29yZS10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBMb2FkVGVtcGxhdGVPcHRpb25zLCBsb2FkVGVtcGxhdGVTb3VyY2UgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5leHBvcnQgeyBjbGVhclRlbXBsYXRlQ2FjaGUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIENvbXBpbGVkVGVtcGxhdGUsXG4gICAgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyxcbiAgICBUZW1wbGF0ZUJyaWRnZSxcbn0gZnJvbSAnLi9icmlkZ2UnO1xuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGxpc3QuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeVR5cGVMaXN0IHtcbiAgICBlbmdpbmU6IEpTVDtcbiAgICBicmlkZ2U6IENvbXBpbGVkVGVtcGxhdGU7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IHR5cGUgZGVmaW5pdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5oyH5a6a5a2QXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUXVlcnlUeXBlcyA9IGtleW9mIFRlbXBsYXRlUXVlcnlUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgb3B0aW9ucy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpfjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVF1ZXJ5T3B0aW9uczxUIGV4dGVuZHMgVGVtcGxhdGVRdWVyeVR5cGVzPiBleHRlbmRzIExvYWRUZW1wbGF0ZU9wdGlvbnMsIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIGBlbmdpbmVgIC8gJ2JyaWRnZSdcbiAgICAgKi9cbiAgICB0eXBlPzogVDtcbiAgICAvKipcbiAgICAgKiBAZW4gdGVtcGxhdGUgbG9hZCBjYWxsYmFjay4gYGJyaWRnZWAgbW9kZSBhbGxvd3MgbG9jYWxpemF0aW9uIGhlcmUuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOiqreOBv+i+vOOBv+OCs+ODvOODq+ODkOODg+OCry4gYGJyaWRnZWAg44Oi44O844OJ44Gn44Gv44GT44GT44Gn44Ot44O844Kr44Op44Kk44K644GM5Y+v6IO9XG4gICAgICovXG4gICAgY2FsbGJhY2s/OiAoc3JjOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50KSA9PiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgUHJvbWlzZTxzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50Pjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGNvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUuXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/IEphdmFTY3JpcHQg44OG44Oz44OX44Os44O844OI5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGU8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcyA9ICdlbmdpbmUnPihcbiAgICBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVRdWVyeU9wdGlvbnM8VD5cbik6IFByb21pc2U8VGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdPiB7XG4gICAgY29uc3QgeyB0eXBlLCB1cmwsIG5vQ2FjaGUsIGNhbGxiYWNrIH0gPSBPYmplY3QuYXNzaWduKHsgdHlwZTogJ2VuZ2luZScsIG5vQ2FjaGU6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgIGxldCBzcmMgPSBhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsLCBub0NhY2hlIH0pO1xuICAgIGlmICghc3JjKSB7XG4gICAgICAgIHRocm93IG5ldyBVUklFcnJvcihgY2Fubm90IHNwZWNpZmllZCB0ZW1wbGF0ZSByZXNvdXJjZS4geyBzZWxlY3RvcjogJHtzZWxlY3Rvcn0sICB1cmw6ICR7dXJsfSB9YCk7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIHNyYyA9IGF3YWl0IGNhbGxiYWNrKHNyYyk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2VuZ2luZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVFbmdpbmUuY29tcGlsZShzcmMgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdW5lc2NhcGVIVE1MKHNyYy5pbm5lckhUTUwpIDogc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGNhc2UgJ2JyaWRnZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVCcmlkZ2UuY29tcGlsZShzcmMsIG9wdGlvbnMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFt0eXBlOiAke3R5cGV9XSBpcyB1bmtub3duLmApO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZUNvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5sZXQgX2N1cnJlbnRJZCA9IDA7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBsZXQgY3VycmVudDogSUhvb2tTdGF0ZUNvbnRleHQgfCBudWxsO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3Qgc2V0Q3VycmVudCA9IChzdGF0ZTogSUhvb2tTdGF0ZUNvbnRleHQpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY2xlYXJDdXJyZW50ID0gKCk6IHZvaWQgPT4ge1xuICAgIGN1cnJlbnQgPSBudWxsO1xuICAgIF9jdXJyZW50SWQgPSAwO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmeSA9ICgpOiBudW1iZXIgPT4ge1xuICAgIHJldHVybiBfY3VycmVudElkKys7XG59O1xuIiwiLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgcGhhc2VTeW1ib2wgPSBTeW1ib2woJ3BoYXNlJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBob29rU3ltYm9sID0gU3ltYm9sKCdob29rJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IHVwZGF0ZVN5bWJvbCA9IFN5bWJvbCgndXBkYXRlJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBjb21taXRTeW1ib2wgPSBTeW1ib2woJ2NvbW1pdCcpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnZWZmZWN0cycpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgbGF5b3V0RWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnbGF5b3V0RWZmZWN0cycpO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCB0eXBlIEVmZmVjdHNTeW1ib2xzID0gdHlwZW9mIGVmZmVjdHNTeW1ib2wgfCB0eXBlb2YgbGF5b3V0RWZmZWN0c1N5bWJvbDtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgUGhhc2UgPSB0eXBlb2YgdXBkYXRlU3ltYm9sIHwgdHlwZW9mIGNvbW1pdFN5bWJvbCB8IHR5cGVvZiBlZmZlY3RzU3ltYm9sO1xuXG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBjb250ZXh0RXZlbnQgPSAnaG9va3MuY29udGV4dCc7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGVDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgeyBzZXRDdXJyZW50LCBjbGVhckN1cnJlbnQgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHtcbiAgICBob29rU3ltYm9sLFxuICAgIGVmZmVjdHNTeW1ib2wsXG4gICAgbGF5b3V0RWZmZWN0c1N5bWJvbCxcbiAgICBFZmZlY3RzU3ltYm9scyxcbn0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGludGVyZmFjZSBDYWxsYWJsZSB7XG4gICAgY2FsbDogKHN0YXRlOiBTdGF0ZSkgPT4gdm9pZDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNsYXNzIFN0YXRlPEggPSB1bmtub3duPiBpbXBsZW1lbnRzIElIb29rU3RhdGVDb250ZXh0PEg+IHtcbiAgICB1cGRhdGU6IFZvaWRGdW5jdGlvbjtcbiAgICBob3N0OiBIO1xuICAgIHZpcnR1YWw/OiBib29sZWFuO1xuICAgIFtob29rU3ltYm9sXTogTWFwPG51bWJlciwgSG9vaz47XG4gICAgW2VmZmVjdHNTeW1ib2xdOiBDYWxsYWJsZVtdO1xuICAgIFtsYXlvdXRFZmZlY3RzU3ltYm9sXTogQ2FsbGFibGVbXTtcblxuICAgIGNvbnN0cnVjdG9yKHVwZGF0ZTogVm9pZEZ1bmN0aW9uLCBob3N0OiBIKSB7XG4gICAgICAgIHRoaXMudXBkYXRlID0gdXBkYXRlO1xuICAgICAgICB0aGlzLmhvc3QgPSBob3N0O1xuICAgICAgICB0aGlzW2hvb2tTeW1ib2xdID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzW2VmZmVjdHNTeW1ib2xdID0gW107XG4gICAgICAgIHRoaXNbbGF5b3V0RWZmZWN0c1N5bWJvbF0gPSBbXTtcbiAgICB9XG5cbiAgICBydW48VD4oY2I6ICgpID0+IFQpOiBUIHtcbiAgICAgICAgc2V0Q3VycmVudCh0aGlzKTtcbiAgICAgICAgY29uc3QgcmVzID0gY2IoKTtcbiAgICAgICAgY2xlYXJDdXJyZW50KCk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgX3J1bkVmZmVjdHMocGhhc2U6IEVmZmVjdHNTeW1ib2xzKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzW3BoYXNlXTtcbiAgICAgICAgc2V0Q3VycmVudCh0aGlzKTtcbiAgICAgICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY2xlYXJDdXJyZW50KCk7XG4gICAgfVxuXG4gICAgcnVuRWZmZWN0cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcnVuRWZmZWN0cyhlZmZlY3RzU3ltYm9sKTtcbiAgICB9XG5cbiAgICBydW5MYXlvdXRFZmZlY3RzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9ydW5FZmZlY3RzKGxheW91dEVmZmVjdHNTeW1ib2wpO1xuICAgIH1cblxuICAgIHRlYXJkb3duKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBob29rcyA9IHRoaXNbaG9va1N5bWJvbF07XG4gICAgICAgIGZvciAoY29uc3QgWywgaG9va10gb2YgaG9va3MpIHtcbiAgICAgICAgICAgICgnZnVuY3Rpb24nID09PSB0eXBlb2YgaG9vay50ZWFyZG93bikgJiYgaG9vay50ZWFyZG93bigpO1xuICAgICAgICAgICAgZGVsZXRlIGhvb2sudGVhcmRvd247XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIFBhcnRJbmZvLFxuICAgIEFzeW5jRGlyZWN0aXZlLFxuICAgIERpcmVjdGl2ZVJlc3VsdCxcbiAgICBkaXJlY3RpdmUsXG4gICAgbm9DaGFuZ2UsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB7XG4gICAgVW5rbm93bkZ1bmN0aW9uLFxuICAgIG5vb3AsXG4gICAgc2NoZWR1bGVyLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgZG9tIGFzICQgfSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuXG5jb25zdCBzY2hlZHVsZSA9IHNjaGVkdWxlcigpO1xuXG5pbnRlcmZhY2UgRGlzY29ubmVjdGFibGUge1xuICAgIF8kcGFyZW50PzogRGlzY29ubmVjdGFibGU7XG4gICAgcGFyZW50Tm9kZTogRWxlbWVudDtcbn1cblxuY2xhc3MgSG9va0RpcmVjdGl2ZSBleHRlbmRzIEFzeW5jRGlyZWN0aXZlIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGF0ZTogU3RhdGU7XG4gICAgcHJpdmF0ZSBfcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbjtcbiAgICBwcml2YXRlIF9hcmdzOiB1bmtub3duW107XG4gICAgcHJpdmF0ZSBfZWxPYnNlcnZlZD86IE5vZGU7XG4gICAgcHJpdmF0ZSBfZGlzY29ubmVjdGVkSGFuZGxlcj86IHR5cGVvZiBIb29rRGlyZWN0aXZlLnByb3RvdHlwZS5kaXNjb25uZWN0ZWQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJ0OiBQYXJ0SW5mbykge1xuICAgICAgICBzdXBlcihwYXJ0KTtcbiAgICAgICAgdGhpcy5fc3RhdGUgPSBuZXcgU3RhdGUoKCkgPT4gdGhpcy5yZWRyYXcoKSwgdGhpcyk7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVyID0gbm9vcDtcbiAgICAgICAgdGhpcy5fYXJncyA9IFtdO1xuICAgIH1cblxuICAgIHJlbmRlcihlbFJvb3Q6IE5vZGUgfCBudWxsLCByZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pOiBEaXJlY3RpdmVSZXN1bHQge1xuICAgICAgICB0aGlzLl9yZW5kZXJlciA9IHJlbmRlcmVyO1xuICAgICAgICB0aGlzLl9hcmdzID0gYXJncztcbiAgICAgICAgdGhpcy5vYnNlcnZlKGVsUm9vdCk7XG4gICAgICAgIHRoaXMucmVkcmF3KCk7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgZGlzY29ubmVjdGVkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkICYmICQudXRpbHMudW5kZXRlY3RpZnkodGhpcy5fZWxPYnNlcnZlZCk7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX3N0YXRlLnRlYXJkb3duKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZWRyYXcoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YXRlLnJ1bigoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByID0gdGhpcy5fcmVuZGVyZXIoLi4udGhpcy5fYXJncyk7XG4gICAgICAgICAgICB0aGlzLnNldFZhbHVlKHIpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fc3RhdGUucnVuTGF5b3V0RWZmZWN0cygpO1xuICAgICAgICBzY2hlZHVsZSgoKSA9PiB0aGlzLl9zdGF0ZS5ydW5FZmZlY3RzKCkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgb2JzZXJ2ZShlbFJvb3Q6IE5vZGUgfCBudWxsKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9kaXNjb25uZWN0ZWRIYW5kbGVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IF8kcGFyZW50IH0gPSB0aGlzIGFzIHVua25vd24gYXMgRGlzY29ubmVjdGFibGU7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgPSBfJHBhcmVudD8ucGFyZW50Tm9kZTtcbiAgICAgICAgaWYgKHRoaXMuX2VsT2JzZXJ2ZWQpIHtcbiAgICAgICAgICAgICQudXRpbHMuZGV0ZWN0aWZ5KHRoaXMuX2VsT2JzZXJ2ZWQsIGVsUm9vdCBhcyBOb2RlKTtcbiAgICAgICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQuYWRkRXZlbnRMaXN0ZW5lcignZGlzY29ubmVjdGVkJywgdGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlciA9IHRoaXMuZGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgaG9va3NXaXRoID0gZGlyZWN0aXZlKEhvb2tEaXJlY3RpdmUpO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjdXJyZW50LCBub3RpZnkgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHsgaG9va1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5cbi8qKlxuICogQGVuIEJhc2UgYWJzdHJhY3QgY2xhc3MgZm9yIEN1c3RvbSBIb29rIENsYXNzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+OCr+ODqeOCueOBruWfuuW6leaKveixoeOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgSG9vazxQIGV4dGVuZHMgdW5rbm93bltdID0gdW5rbm93bltdLCBSID0gdW5rbm93biwgSCA9IHVua25vd24+IHtcbiAgICBpZDogbnVtYmVyO1xuICAgIHN0YXRlOiBJSG9va1N0YXRlQ29udGV4dDxIPjtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlQ29udGV4dDxIPikge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICB9XG5cbiAgICBhYnN0cmFjdCB1cGRhdGUoLi4uYXJnczogUCk6IFI7XG4gICAgdGVhcmRvd24/KCk6IHZvaWQ7XG59XG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBkZWZpbml0aW9uIGZvciBjdXN0b20gaG9va3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ3VzdG9tSG9vazxQIGV4dGVuZHMgdW5rbm93bltdID0gdW5rbm93bltdLCBSID0gdW5rbm93biwgSCA9IHVua25vd24+IHtcbiAgICBuZXcgKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlQ29udGV4dDxIPiwgLi4uYXJnczogUCk6IEhvb2s8UCwgUiwgSD47XG59XG5cbmNvbnN0IHVzZSA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPiwgLi4uYXJnczogUCk6IFIgPT4ge1xuICAgIGNvbnN0IGlkID0gbm90aWZ5KCk7XG4gICAgY29uc3QgaG9va3MgPSAoY3VycmVudCBhcyBhbnkpW2hvb2tTeW1ib2xdIGFzIE1hcDxudW1iZXIsIEhvb2s+OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIGxldCBob29rID0gaG9va3MuZ2V0KGlkKSBhcyBIb29rPFAsIFIsIEg+IHwgdW5kZWZpbmVkO1xuICAgIGlmICghaG9vaykge1xuICAgICAgICBob29rID0gbmV3IEhvb2soaWQsIGN1cnJlbnQgYXMgSUhvb2tTdGF0ZUNvbnRleHQ8SD4sIC4uLmFyZ3MpO1xuICAgICAgICBob29rcy5zZXQoaWQsIGhvb2spO1xuICAgIH1cblxuICAgIHJldHVybiBob29rLnVwZGF0ZSguLi5hcmdzKTtcbn07XG5cbi8qKlxuICogQGVuIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGN1c3RvbSBob29rcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/kvZzmiJDnlKjjg5XjgqHjgq/jg4jjg6rplqLmlbBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IElIb29rU3RhdGVDb250ZXh0LCBIb29rLCBtYWtlSG9vayB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogZXhwb3J0IGNvbnN0IHVzZU1lbW8gPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAqICAgICB2YWx1ZTogVDtcbiAqICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAqXG4gKiAgICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pIHtcbiAqICAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gKiAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICogICAgIH1cbiAqXG4gKiAgICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICogICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAqICAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gKiAgICAgICAgIH1cbiAqICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gKiAgICAgfVxuICpcbiAqICAgICBoYXNDaGFuZ2VkKHZhbHVlczogdW5rbm93bltdID0gW10pOiBib29sZWFuIHtcbiAqICAgICAgICAgcmV0dXJuIHZhbHVlcy5zb21lKCh2YWx1ZSwgaSkgPT4gdGhpcy52YWx1ZXNbaV0gIT09IHZhbHVlKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbWFrZUhvb2sgPSA8UCBleHRlbmRzIHVua25vd25bXSwgUiwgSCA9IHVua25vd24+KEhvb2s6IEN1c3RvbUhvb2s8UCwgUiwgSD4pOiAoLi4uYXJnczogUCkgPT4gUiA9PiB7XG4gICAgcmV0dXJuIHVzZS5iaW5kKG51bGwsIEhvb2spO1xufTtcbiIsImltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IE5ld0hvb2tTdGF0ZSwgSG9va1N0YXRlVXBkYXRlciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VTdGF0ZSA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICAgIGFyZ3MhOiByZWFkb25seSBbVCwgSG9va1N0YXRlVXBkYXRlcjxUPl07XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGluaXRpYWxWYWx1ZTogVCkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnVwZGF0ZXIgPSB0aGlzLnVwZGF0ZXIuYmluZCh0aGlzKTtcblxuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGluaXRpYWxWYWx1ZSkge1xuICAgICAgICAgICAgaW5pdGlhbFZhbHVlID0gaW5pdGlhbFZhbHVlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKGluaXRpYWxWYWx1ZSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKCk6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFyZ3M7XG4gICAgfVxuXG4gICAgdXBkYXRlcih2YWx1ZTogTmV3SG9va1N0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IFtwcmV2aW91c1ZhbHVlXSA9IHRoaXMuYXJncztcbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlckZuID0gdmFsdWUgYXMgKHByZXZpb3VzU3RhdGU/OiBUKSA9PiBUO1xuICAgICAgICAgICAgdmFsdWUgPSB1cGRhdGVyRm4ocHJldmlvdXNWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVlcEVxdWFsKHByZXZpb3VzVmFsdWUsIHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYWtlQXJncyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgbWFrZUFyZ3ModmFsdWU6IFQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcmdzID0gT2JqZWN0LmZyZWV6ZShbdmFsdWUsIHRoaXMudXBkYXRlcl0gYXMgY29uc3QpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cbn0pIGFzIDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgVCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBSKSA/IFIgOiBULFxuICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuXTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LWZ1bmN0aW9uLXJldHVybi10eXBlLFxuICovXG5cbmltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuXG50eXBlIEVmZmVjdCA9ICh0aGlzOiBTdGF0ZSkgPT4gdm9pZCB8IFZvaWRGdW5jdGlvbiB8IFByb21pc2U8dm9pZD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVFZmZlY3QgPSAoc2V0RWZmZWN0czogKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKSA9PiB2b2lkKSA9PiB7XG4gICAgcmV0dXJuIG1ha2VIb29rKGNsYXNzIGV4dGVuZHMgSG9vayB7XG4gICAgICAgIGNhbGxiYWNrITogRWZmZWN0O1xuICAgICAgICBsYXN0VmFsdWVzPzogdW5rbm93bltdO1xuICAgICAgICB2YWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIF90ZWFyZG93biE6IFByb21pc2U8dm9pZD4gfCBWb2lkRnVuY3Rpb24gfCB2b2lkO1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgaWdub3JlZDE6IEVmZmVjdCwgaWdub3JlZDI/OiB1bmtub3duW10pIHtcbiAgICAgICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgICAgICBzZXRFZmZlY3RzKHN0YXRlLCB0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZShjYWxsYmFjazogRWZmZWN0LCB2YWx1ZXM/OiB1bmtub3duW10pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICghdGhpcy52YWx1ZXMgfHwgdGhpcy5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sYXN0VmFsdWVzID0gdGhpcy52YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBydW4oKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnRlYXJkb3duKCk7XG4gICAgICAgICAgICB0aGlzLl90ZWFyZG93biA9IHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLnN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRlYXJkb3duKCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLl90ZWFyZG93bikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RlYXJkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBoYXNDaGFuZ2VkKCk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmxhc3RWYWx1ZXMgfHwgdGhpcy52YWx1ZXMhLnNvbWUoKHZhbHVlLCBpKSA9PiAhZGVlcEVxdWFsKHRoaXMubGFzdFZhbHVlcyFbaV0sIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgZWZmZWN0c1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQgeyBjcmVhdGVFZmZlY3QgfSBmcm9tICcuL2NyZWF0ZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3Qgc2V0RWZmZWN0cyA9IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSk6IHZvaWQgPT4ge1xuICAgIHN0YXRlW2VmZmVjdHNTeW1ib2xdLnB1c2goY2IpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUVmZmVjdCA9IGNyZWF0ZUVmZmVjdChzZXRFZmZlY3RzKTtcbiIsImltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBsYXlvdXRFZmZlY3RzU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCB7IGNyZWF0ZUVmZmVjdCB9IGZyb20gJy4vY3JlYXRlLWVmZmVjdCc7XG5cbmNvbnN0IHNldExheW91dEVmZmVjdHMgPSAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpOiB2b2lkID0+IHtcbiAgICBzdGF0ZVtsYXlvdXRFZmZlY3RzU3ltYm9sXS5wdXNoKGNiKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VMYXlvdXRFZmZlY3QgPSBjcmVhdGVFZmZlY3Qoc2V0TGF5b3V0RWZmZWN0cyk7XG4iLCJpbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VNZW1vID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gICAgdmFsdWU6IFQ7XG4gICAgdmFsdWVzOiB1bmtub3duW107XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgfVxuXG4gICAgaGFzQ2hhbmdlZCh2YWx1ZXM6IHVua25vd25bXSA9IFtdKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2YWx1ZXMuc29tZSgodmFsdWUsIGkpID0+IHRoaXMudmFsdWVzW2ldICE9PSB2YWx1ZSk7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfSA9IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHVzZU1lbW8oKCkgPT4gKHtcbiAgICBjdXJyZW50OiBpbml0aWFsVmFsdWVcbn0pLCBbXSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVFxuICAgID0gPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gdXNlTWVtbygoKSA9PiBmbiwgaW5wdXRzKTtcbiIsImltcG9ydCB0eXBlIHsgSG9va1JlZHVjZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVJlZHVjZXIgPSBtYWtlSG9vayhjbGFzcyA8UywgSSwgQT4gZXh0ZW5kcyBIb29rIHtcbiAgICByZWR1Y2VyITogSG9va1JlZHVjZXI8UywgQT47XG4gICAgY3VycmVudFN0YXRlOiBTO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBfOiBIb29rUmVkdWNlcjxTLCBBPiwgaW5pdGlhbFN0YXRlOiBJLCBpbml0PzogKF86IEkpID0+IFMpIHtcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IHRoaXMuZGlzcGF0Y2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSB1bmRlZmluZWQgIT09IGluaXQgPyBpbml0KGluaXRpYWxTdGF0ZSkgOiBpbml0aWFsU3RhdGUgYXMgdW5rbm93biBhcyBTO1xuICAgIH1cblxuICAgIHVwZGF0ZShyZWR1Y2VyOiBIb29rUmVkdWNlcjxTLCBBPik6IHJlYWRvbmx5IFtTLCAoYWN0aW9uOiBBKSA9PiB2b2lkXSB7XG4gICAgICAgIHRoaXMucmVkdWNlciA9IHJlZHVjZXI7XG4gICAgICAgIHJldHVybiBbdGhpcy5jdXJyZW50U3RhdGUsIHRoaXMuZGlzcGF0Y2hdOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cblxuICAgIGRpc3BhdGNoKGFjdGlvbjogQSk6IHZvaWQge1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHRoaXMucmVkdWNlcih0aGlzLmN1cnJlbnRTdGF0ZSwgYWN0aW9uKTtcbiAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICB9XG59KTtcbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bkZ1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgSG9va1N0YXRlVXBkYXRlciwgSG9va1JlZHVjZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaG9va3NXaXRoIH0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICcuL3VzZS1zdGF0ZSc7XG5pbXBvcnQgeyB1c2VFZmZlY3QgfSBmcm9tICcuL3VzZS1lZmZlY3QnO1xuaW1wb3J0IHsgdXNlTGF5b3V0RWZmZWN0IH0gZnJvbSAnLi91c2UtbGF5b3V0LWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5pbXBvcnQgeyB1c2VSZWYgfSBmcm9tICcuL3VzZS1yZWYnO1xuaW1wb3J0IHsgdXNlQ2FsbGJhY2sgfSBmcm9tICcuL3VzZS1jYWxsYmFjayc7XG5pbXBvcnQgeyB1c2VSZWR1Y2VyIH0gZnJvbSAnLi91c2UtcmVkdWNlcic7XG5leHBvcnQgKiBmcm9tICcuL2ludGVyZmFjZXMnO1xuZXhwb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuXG4vKipcbiAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IHBhcml0eSB3aXRoIHRoZSBSZWFjdCBob29rcyBjb25jZXB0LlxuICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+m1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAqXG4gKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAqICAgICBjb25zdCBbY291bnQsIHNldENvdW50XSA9IHVzZVN0YXRlKDApO1xuICogICAgIHJldHVybiBodG1sYFxuICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAqICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInN0YXRlLXBsdXNcIiBAY2xpY2s9JHsoKSA9PiBzZXRDb3VudChwcmV2Q291bnQgPT4gcHJldkNvdW50ISArIDEpfT7inpU8L2J1dHRvbj5cbiAqICAgICBgO1xuICogfVxuICpcbiAqIC8vIHJlbmRlciB3aXRoIGhvb2tzXG4gKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rcyB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuIDxicj5cbiAgICAgKiAgICAgQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguXG4gICAgICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+myA8YnI+XG4gICAgICogICAgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqBcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gICAgICogY29uc3QgeyB1c2VTdGF0ZSB9ID0gaG9va3M7XG4gICAgICpcbiAgICAgKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAgICAgKiBmdW5jdGlvbiBBcHAoKSB7XG4gICAgICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gICAgICogICAgIHJldHVybiBodG1sYFxuICAgICAqICAgICAgICAgPHA+Q291bnQ6ICR7IGNvdW50IH08L3A+XG4gICAgICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICAgICAqICAgICBgO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzXG4gICAgICogcmVuZGVyKGhvb2tzKEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlbmRlcmVyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHJldHVybnMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44KS6L+U5Y2044GZ44KL6Zai5pWw44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIEFyZ3VtZW50cyBwYXNzZWQgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBq+OCj+OBn+OCi+W8leaVsFxuICAgICAqL1xuICAgIChyZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBIb29rcyBmZWF0dXJlIHRvIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4LiAoc3BlY2lmeSBhIERPTSBkaXNjb25uZWN0IGRldGVjdGlvbiBlbGVtZW50KVxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgasgSG9va3Mg5qmf6IO944KS5LuY5YqgIChET00g5YiH5pat5qSc55+l6KaB57Sg44KS5oyH5a6aKVxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzb21lLXBhZ2UnKTtcbiAgICAgKiAvLyBlbmFibGluZyBob29rcyB3aXRoIHJvb3QgZWxlbWVudFxuICAgICAqIHJlbmRlcihob29rcy53aXRoKGVsLCBBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFJvb3RcbiAgICAgKiAgLSBgZW5gIFJvb3QgZWxlbWVudCB1c2VkIGZvciBET00gZGlzY29ubmVjdGlvbiBkZXRlY3Rpb24uIElmIGBudWxsYCBwYXNzZWQsIGBkb2N1bWVudGAgaXMgc3BlY2lmaWVkXG4gICAgICogIC0gYGphYCBET00g5YiH5pat5qSc55+l44Gr5L2/55So44GZ44KL44Or44O844OI6KaB57SgLiBgbnVsbGAg44GM5rih44KL44GoIGBkb2N1bWVudGAg44GM5oyH5a6a44GV44KM44KLXG4gICAgICogQHBhcmFtIHJlbmRlcmVyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHJldHVybnMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44KS6L+U5Y2044GZ44KL6Zai5pWw44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIEFyZ3VtZW50cyBwYXNzZWQgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBq+OCj+OBn+OCi+W8leaVsFxuICAgICAqL1xuICAgIHdpdGg6IChlbFJvb3Q6IE5vZGUgfCBudWxsLCByZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgc3RhdGVmdWwgdmFsdWUgYW5kIGEgZnVuY3Rpb24gdG8gdXBkYXRlIGl0LlxuICAgICAqIEBqYSDjgrnjg4bjg7zjg4jjg5Xjg6vjgarlgKTjgajjgIHjgZ3jgozjgpLmm7TmlrDjgZnjgovjgZ/jgoHjga7plqLmlbDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbml0aWFsU3RhdGVcbiAgICAgKiAgLSBgZW5gIFRoZSB2YWx1ZSB5b3Ugd2FudCB0aGUgc3RhdGUgdG8gYmUgaW5pdGlhbGx5LlxuICAgICAqICAtIGBqYWAg54q25oWL44Gu5Yid5pyf5YyW5YCkXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHVybnMgYW4gYXJyYXkgd2l0aCBleGFjdGx5IHR3byB2YWx1ZXMuIFtgY3VycmVudFN0YXRlYCwgYHVwZGF0ZUZ1bmN0aW9uYF1cbiAgICAgKiAgLSBgamFgIDLjgaTjga7lgKTjgpLmjIHjgaTphY3liJfjgpLov5TljbQgW2BjdXJyZW50U3RhdGVgLCBgdXBkYXRlRnVuY3Rpb25gXVxuICAgICAqL1xuICAgIHVzZVN0YXRlOiA8VD4oaW5pdGlhbFN0YXRlPzogVCkgPT4gcmVhZG9ubHkgW1xuICAgICAgICBUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFIpID8gUiA6IFQsXG4gICAgICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuICAgIF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXB0cyBhIGZ1bmN0aW9uIHRoYXQgY29udGFpbnMgaW1wZXJhdGl2ZSwgcG9zc2libHkgZWZmZWN0ZnVsIGNvZGUuXG4gICAgICogQGphIOWJr+S9nOeUqOOCkuacieOBmeOCi+WPr+iDveaAp+OBruOBguOCi+WRveS7pOWei+OBruOCs+ODvOODieOBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIGVmZmVjdFxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBydW5zIGVhY2ggdGltZSBkZXBlbmRlbmNpZXMgY2hhbmdlXG4gICAgICogIC0gYGphYCDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgovjgZ/jgbPjgavlrp/ooYzjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzXG4gICAgICogIC0gYGVuYCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byB0aGUgZWZmZWN0XG4gICAgICogIC0gYGphYCDlia/kvZznlKjnmbrngavjga7jg4jjg6rjgqzjg7zjgajjgarjgovkvp3lrZjplqLkv4Ljga7jg6rjgrnjg4hcbiAgICAgKi9cbiAgICB1c2VFZmZlY3Q6IChlZmZlY3Q6ICgpID0+IHZvaWQsIGRlcGVuZGVuY2llcz86IHVua25vd25bXSkgPT4gdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBjb250YWlucyBpbXBlcmF0aXZlLCBwb3NzaWJseSBlZmZlY3RmdWwgY29kZS4gPGJyPlxuICAgICAqICAgICBVbmxpa2UgW1t1c2VFZmZlY3RdXSAsIGl0IGlzIGV4ZWN1dGVkIGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHJlbmRlcmVkIGFuZCB0aGUgbmV3IGVsZW1lbnQgaXMgZGlzcGxheWVkIG9uIHRoZSBzY3JlZW4uXG4gICAgICogQGphIOWJr+S9nOeUqOOCkuacieOBmeOCi+WPr+iDveaAp+OBruOBguOCi+WRveS7pOWei+OBruOCs+ODvOODieOBrumBqeeUqCA8YnI+XG4gICAgICogICAgIFtbdXNlRWZmZWN0XV0g44Go55Ww44Gq44KKLCDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgYzjg6zjg7Pjg4Djg6rjg7PjgrDjgZXjgozjgabmlrDjgZfjgYTopoHntKDjgYznlLvpnaLjgavooajnpLrjgZXjgozjgovliY3jgavlrp/ooYzjgZXjgozjgovjgIJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlZmZlY3RcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcnVucyBlYWNoIHRpbWUgZGVwZW5kZW5jaWVzIGNoYW5nZVxuICAgICAqICAtIGBqYWAg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44KL44Gf44Gz44Gr5a6f6KGM44GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIGRlcGVuZGVuY2llc1xuICAgICAqICAtIGBlbmAgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gdGhlIGVmZmVjdFxuICAgICAqICAtIGBqYWAg5Ymv5L2c55So55m654Gr44Gu44OI44Oq44Ks44O844Go44Gq44KL5L6d5a2Y6Zai5L+C44Gu44Oq44K544OIXG4gICAgICovXG4gICAgdXNlTGF5b3V0RWZmZWN0OiAoZWZmZWN0OiAoKSA9PiB2b2lkLCBkZXBlbmRlbmNpZXM/OiB1bmtub3duW10pID0+IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXNlZCB0byByZWR1Y2UgY29tcG9uZW50IHJlLXJlbmRlcmluZy4gPGJyPlxuICAgICAqICAgICBDYWNoZSB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIHRoZSBjYWNoZWQgdmFsdWUgd2hlbiBjYWxsZWQgd2l0aCB0aGUgc2FtZSBhcmd1bWVudHMuXG4gICAgICogQGphIOOCs+ODs+ODneODvOODjeODs+ODiOOBruWGjeODrOODs+ODgOODquODs+OCsOOCkuaKkeOBiOOCi+OBn+OCgeOBq+S9v+eUqCA8YnI+XG4gICAgICogICAgIOmWouaVsOOBruaIu+OCiuWApOOCkuOCreODo+ODg+OCt+ODpeOBl+OAgeWQjOOBmOW8leaVsOOBp+WRvOOBs+WHuuOBleOCjOOBn+WgtOWQiOOBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBn+WApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHZhbHVlXG4gICAgICogIC0gYGphYCDlgKTjgpLov5TjgZnplqLmlbBcbiAgICAgKiBAcGFyYW0gdmFsdWVzXG4gICAgICogIC0gYGVuYCBBbiBhcnJheSBvZiB2YWx1ZXMgdGhhdCBhcmUgdXNlZCBhcyBhcmd1bWVudHMgZm9yIGBmbmBcbiAgICAgKiAgLSBgamFgIGBmbmAg44Gu5byV5pWw44Go44GX44Gm5L2/55So44GV44KM44KL5YCk44Gu6YWN5YiXXG4gICAgICovXG4gICAgdXNlTWVtbzogPFQ+KGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkgPT4gVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBMZXRzIHlvdSByZWZlcmVuY2UgYSB2YWx1ZSB0aGF04oCZcyBub3QgbmVlZGVkIGZvciByZW5kZXJpbmcuIDxicj5cbiAgICAgKiAgICAgTWFpbmx5IGF2YWlsYWJsZSBmb3IgYWNjZXNzaW5nIERPTSBub2Rlcy5cbiAgICAgKiBAamEg44Os44Oz44OA44Oq44Oz44Kw44Gr5LiN6KaB44Gq5YCk44KS5Y+C54Wn5Y+v6IO944Gr44GZ44KLPGJyPlxuICAgICAqICAgICDkuLvjgasgRE9NIOODjuODvOODieOBuOOBruOCouOCr+OCu+OCueOBq+WIqeeUqOWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWxWYWx1ZVxuICAgICAqICAtIGBlbmAgVGhlIGluaXRpYWwgdmFsdWUgb2YgdGhlIHJlZmVyZW5jZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Gu5Yid5pyf5YCkXG4gICAgICovXG4gICAgdXNlUmVmOiA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB7IGN1cnJlbnQ6IFQ7IH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhIG1lbW9pemVkIHZlcnNpb24gb2YgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgb25seSBjaGFuZ2VzIGlmIHRoZSBkZXBlbmRlbmNpZXMgY2hhbmdlLiA8YnI+XG4gICAgICogICAgIFVzZWZ1bCBmb3IgcGFzc2luZyBjYWxsYmFja3MgdG8gb3B0aW1pemVkIGNoaWxkIGNvbXBvbmVudHMgdGhhdCByZWx5IG9uIHJlZmVyZW50aWFsIGVxdWFsaXR5LlxuICAgICAqIEBqYSDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgZ/loLTlkIjjgavjga7jgb/lpInmm7TjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjga7jg6Hjg6LljJbjg5Djg7zjgrjjg6fjg7PjgpLov5TljbQgPGJyPlxuICAgICAqICAgICDlj4LnhafnrYnkvqHmgKfjgavkvp3lrZjjgZnjgovmnIDpganljJbjgZXjgozjgZ/lrZDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgavjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmuKHjgZnloLTlkIjjgavlvbnnq4vjgaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqICAtIGBlbmAgVGhlIGZ1bmN0aW9uIHRvIG1lbW9pemVcbiAgICAgKiAgLSBgamFgIOODoeODouWMluOBmeOCi+mWouaVsFxuICAgICAqIEBwYXJhbSBpbnB1dHNcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5IG9mIGlucHV0cyB0byB3YXRjaCBmb3IgY2hhbmdlc1xuICAgICAqICAtIGBqYWAg5aSJ5pu044KS55uj6KaW44GZ44KL5YWl5Yqb44Gu6YWN5YiXXG4gICAgICovXG4gICAgdXNlQ2FsbGJhY2s6IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSG9vayBBUEkgZm9yIG1hbmFnaW5nIHN0YXRlIGluIGZ1bmN0aW9uIGNvbXBvbmVudHMuXG4gICAgICogQGphIOmWouaVsOOCs+ODs+ODneODvOODjeODs+ODiOOBp+eKtuaFi+OCkueuoeeQhuOBmeOCi+OBn+OCgeOBriBIb29rIEFQSVxuICAgICAqXG4gICAgICogQHBhcmFtIHJlZHVjZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmQgYW4gYWN0aW9uIGFuZCByZXR1cm5zIGEgbmV3IHN0YXRlXG4gICAgICogIC0gYGphYCDnj77lnKjjga7nirbmhYvjgajjgqLjgq/jgrfjg6fjg7PjgpLlj5fjgZHlj5bjgorjgIHmlrDjgZfjgYTnirbmhYvjgpLov5TjgZnplqLmlbBcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFN0YXRlXG4gICAgICogIC0gYGVuYCBUaGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWNlclxuICAgICAqICAtIGBqYWAg44Oq44OH44Ol44O844K144O844Gu5Yid5pyf54q25oWL44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRcbiAgICAgKiAgLSBgZW5gIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWNlclxuICAgICAqICAtIGBqYWAg44Oq44OH44Ol44O844K144O844Gu5Yid5pyf54q25oWL44KS6L+U44GZ44Kq44OX44K344On44Oz44Gu6Zai5pWwXG4gICAgICovXG4gICAgdXNlUmVkdWNlcjogPFMsIEksIEE+KHJlZHVjZXI6IEhvb2tSZWR1Y2VyPFMsIEE+LCBpbml0aWFsU3RhdGU6IEksIGluaXQ/OiAoKF86IEkpID0+IFMpIHwgdW5kZWZpbmVkKSA9PiByZWFkb25seSBbUywgKGFjdGlvbjogQSkgPT4gdm9pZF07XG59XG5cbmNvbnN0IGhvb2tzOiBIb29rcyA9IGhvb2tzV2l0aC5iaW5kKG51bGwsIG51bGwpO1xuaG9va3Mud2l0aCAgICAgICAgICAgID0gaG9va3NXaXRoO1xuaG9va3MudXNlU3RhdGUgICAgICAgID0gdXNlU3RhdGU7XG5ob29rcy51c2VFZmZlY3QgICAgICAgPSB1c2VFZmZlY3Q7XG5ob29rcy51c2VMYXlvdXRFZmZlY3QgPSB1c2VMYXlvdXRFZmZlY3Q7XG5ob29rcy51c2VNZW1vICAgICAgICAgPSB1c2VNZW1vO1xuaG9va3MudXNlUmVmICAgICAgICAgID0gdXNlUmVmO1xuaG9va3MudXNlQ2FsbGJhY2sgICAgID0gdXNlQ2FsbGJhY2s7XG5ob29rcy51c2VSZWR1Y2VyICAgICAgPSB1c2VSZWR1Y2VyO1xuXG5leHBvcnQgeyBob29rcyB9O1xuIl0sIm5hbWVzIjpbIiQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQWFBO0FBQ0EsTUFBTSxTQUFTLEdBQXdDO0lBQ25ELFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsVUFB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SSxZQUFlLEtBQUssT0FBTyxDQUFDLE9BQU87QUFDbEcsSUFBQSxPQUFPLEVBQUUsWUFBWTtDQUN4QixDQUFDLEVBQUUsRUFBRSxDQUFDOztBQ0ZQO0FBQ08sTUFBTSxXQUFXLEdBQ2xCLENBQTRCLEVBQUssRUFBRSxNQUFpQixLQUFLLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUM7O0FDRHhGO0FBQ08sTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQXdCLElBQUksQ0FBQTtBQUMzRCxJQUFBLE9BQU8sQ0FBcUI7QUFDNUIsSUFBQSxZQUFZLENBQUk7SUFFaEIsV0FBWSxDQUFBLEVBQVUsRUFBRSxLQUFZLEVBQUUsQ0FBb0IsRUFBRSxZQUFlLEVBQUUsSUFBa0IsRUFBQTtBQUMzRixRQUFBLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6QyxRQUFBLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxLQUFLLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsWUFBNEIsQ0FBQztLQUM5RjtBQUVELElBQUEsTUFBTSxDQUFDLE9BQTBCLEVBQUE7QUFDN0IsUUFBQSxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDN0M7QUFFRCxJQUFBLFFBQVEsQ0FBQyxNQUFTLEVBQUE7QUFDZCxRQUFBLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzVELFFBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztLQUN2QjtBQUNKLENBQUEsQ0FBQzs7QUM4S0ksTUFBQSxLQUFLLEdBQVUsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFO0FBQ2hELEtBQUssQ0FBQyxJQUFJLEdBQWMsU0FBUyxDQUFDO0FBQ2xDLEtBQUssQ0FBQyxRQUFRLEdBQVUsUUFBUSxDQUFDO0FBQ2pDLEtBQUssQ0FBQyxTQUFTLEdBQVMsU0FBUyxDQUFDO0FBQ2xDLEtBQUssQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0FBQ3hDLEtBQUssQ0FBQyxPQUFPLEdBQVcsT0FBTyxDQUFDO0FBQ2hDLEtBQUssQ0FBQyxNQUFNLEdBQVksTUFBTSxDQUFDO0FBQy9CLEtBQUssQ0FBQyxXQUFXLEdBQU8sV0FBVyxDQUFDO0FBQ3BDLEtBQUssQ0FBQyxVQUFVLEdBQVEsVUFBVTs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdGVtcGxhdGUvIn0=