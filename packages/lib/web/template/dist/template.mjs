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

/** @internal */
const hookSymbol = Symbol('hook');
/** @internal */
const effectsSymbol = Symbol('effects');
/** @internal */
const layoutEffectsSymbol = Symbol('layoutEffects');

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

// const _mapHooks = new WeakMap<IHookContext, Set<HookContextListener>>();
class HookContext {
    defaultValue;
    _value;
    constructor(defaultValue) {
        this.provide = this.provide.bind(this);
        this.consume = this.consume.bind(this);
        this.defaultValue = defaultValue;
        this._value = defaultValue;
        // _mapHooks.set(this, new Set());
    }
    provide(value, template) {
        if (this._value === value) {
            return noChange;
        }
        this._value = value;
        // const listeners = _mapHooks.get(this) as Set<HookContextListener>;
        // for (const listener of listeners) {
        //     listener.onUpdateContext(this._value);
        // }
        return template || noChange;
    }
    consume(callback) {
        return callback(this._value);
    }
}
/** @internal */
// export const getContextStack = (context: IHookContext): Set<HookContextListener> => {
//     return _mapHooks.get(context) || new Set();
// };
/** @internal */
const createContext = (defaultValue) => {
    return new HookContext(defaultValue);
};

/** @internal */
const useContext = makeHook(class extends Hook {
    context;
    value;
    _ranEffect;
    constructor(id, state, _) {
        super(id, state);
        this._ranEffect = false;
        setEffects(state, this);
    }
    update(context) {
        if (this.context !== context) {
            this.unsubscribe(this.context);
            this.context = context;
            context.consume(value => { this.value = value; });
            this.subscribe(context);
        }
        return this.value;
    }
    call() {
        if (!this._ranEffect) {
            this._ranEffect = true;
            this.state.update();
        }
    }
    teardown() {
        this.unsubscribe(this.context);
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: HookContextListener
    onUpdateContext(value) {
        // this.value = value;
        // this.state.update();
    }
    ///////////////////////////////////////////////////////////////////////
    // internal: listener
    subscribe(context) {
        // const stack = getContextStack(context);
        // stack.add(this);
    }
    unsubscribe(context) {
        // const stack = getContextStack(context);
        // stack.delete(this);
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
hooks.createContext = createContext;
hooks.useContext = useContext;

export { Hook, TemplateBridge, getTemplate, hooks, makeHook };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUubWpzIiwic291cmNlcyI6WyJicmlkZ2UudHMiLCJsb2FkZXIudHMiLCJob29rcy9jdXJyZW50LnRzIiwiaG9va3Mvc3ltYm9scy50cyIsImhvb2tzL3N0YXRlLnRzIiwiaG9va3MvZGlyZWN0aXZlLnRzIiwiaG9va3MvaG9vay50cyIsImhvb2tzL3VzZS1zdGF0ZS50cyIsImhvb2tzL2NyZWF0ZS1lZmZlY3QudHMiLCJob29rcy91c2UtZWZmZWN0LnRzIiwiaG9va3MvdXNlLWxheW91dC1lZmZlY3QudHMiLCJob29rcy91c2UtbWVtby50cyIsImhvb2tzL3VzZS1yZWYudHMiLCJob29rcy91c2UtY2FsbGJhY2sudHMiLCJob29rcy91c2UtcmVkdWNlci50cyIsImhvb2tzL2NyZWF0ZS1jb250ZXh0LnRzIiwiaG9va3MvdXNlLWNvbnRleHQudHMiLCJob29rcy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIGh0bWwsXG4gICAgZGlyZWN0aXZlcyxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlJztcbmltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCBidWlsdGluIHRyYW5zZm9ybWVycyAoZGVmYXVsdDogbXVzdGFjaGUpLiAqL1xuY29uc3QgX2J1aWx0aW5zOiBSZWNvcmQ8c3RyaW5nLCBUZW1wbGF0ZVRyYW5zZm9ybWVyPiA9IHtcbiAgICBtdXN0YWNoZTogY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihodG1sLCBkaXJlY3RpdmVzLnVuc2FmZUhUTUwpLFxuICAgIHN0YW1waW5vOiBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyKCksXG59O1xuXG4vKipcbiAqIEBlbiBDb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlIGludGVyZmFjZVxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBv+ODhuODs+ODl+ODrOODvOODiOagvOe0jeOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTb3VyY2UgdGVtcGxhdGUgc3RyaW5nXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNvdXJjZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW1RlbXBsYXRlUmVzdWx0XV0gdGhhdCBhcHBsaWVkIGdpdmVuIHBhcmFtZXRlcihzKS5cbiAgICAgKiBAamEg44OR44Op44Oh44O844K/44KS6YGp55So44GXIFtbVGVtcGxhdGVSZXN1bHRdXSDjgbjlpInmj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWV3XG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBwYXJhbWV0ZXJzIGZvciBzb3VyY2UuXG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdDtcbn1cblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUJyaWRnZV1dIGNvbXBpbGUgb3B0aW9uc1xuICogQGphIFtbVGVtcGxhdGVCcmlkZ2VdXSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0cmFuc2Zvcm1lcj86IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIGJyaWRnZSBmb3Igb3RoZXIgdGVtcGxhdGUgZW5naW5lIHNvdXJjZS5cbiAqIEBqYSDku5bjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg7Pjgrjjg7Pjga7lhaXlipvjgpLlpInmj5vjgZnjgovjg4bjg7Pjg5fjg6zjg7zjg4jjg5bjg6rjg4Pjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlQnJpZGdlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgX3RyYW5zZm9ybWVyID0gX2J1aWx0aW5zLm11c3RhY2hlO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW0NvbXBpbGVkVGVtcGxhdGVdXSBmcm9tIHRlbXBsYXRlIHNvdXJjZS5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiX44GL44KJIFtbQ29tcGlsZWRUZW1wbGF0ZV1dIOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHRlbXBsYXRlXG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBzb3VyY2Ugc3RyaW5nIC8gdGVtcGxhdGUgZWxlbWVudFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXIC8g44OG44Oz44OX44Os44O844OI44Ko44Os44Oh44Oz44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbXBpbGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjb21waWxlKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyk6IENvbXBpbGVkVGVtcGxhdGUge1xuICAgICAgICBjb25zdCB7IHRyYW5zZm9ybWVyIH0gPSBPYmplY3QuYXNzaWduKHsgdHJhbnNmb3JtZXI6IFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciB9LCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgZW5naW5lID0gdHJhbnNmb3JtZXIodGVtcGxhdGUpO1xuICAgICAgICBjb25zdCBqc3QgPSAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdCA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZW5naW5lKHZpZXcpO1xuICAgICAgICB9O1xuICAgICAgICBqc3Quc291cmNlID0gdGVtcGxhdGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdGVtcGxhdGUuaW5uZXJIVE1MIDogdGVtcGxhdGU7XG4gICAgICAgIHJldHVybiBqc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBkZWZhdWx0IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg5pei5a6a44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3VHJhbnNmb3JtZXJcbiAgICAgKiAgLSBgZW5gIG5ldyB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDku6XliY3jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldFRyYW5zZm9ybWVyKG5ld1RyYW5zZm9ybWVyOiBUZW1wbGF0ZVRyYW5zZm9ybWVyKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgICAgIGNvbnN0IG9sZFRyYW5zZm9ybWVyID0gVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyO1xuICAgICAgICBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXIgPSBuZXdUcmFuc2Zvcm1lcjtcbiAgICAgICAgcmV0dXJuIG9sZFRyYW5zZm9ybWVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYnVpbHQtaW4gdHJhbnNmb3JtZXIgbmFtZSBsaXN0LlxuICAgICAqIEBqYSDntYTjgb/ovrzjgb/jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3np7DkuIDopqfjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBuYW1lIGxpc3QuXG4gICAgICogIC0gYGphYCDlkI3np7DkuIDopqfjgpLov5TljbRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IGJ1aWx0aW5zKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKF9idWlsdGlucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdCBuYW1lLlxuICAgICAqICAtIGBqYWAg5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5ZCN5YmN44KS5oyH5a6aLlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGdldEJ1aXRpblRyYW5zZm9ybWVyKG5hbWU6IHN0cmluZyk6IFRlbXBsYXRlVHJhbnNmb3JtZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX2J1aWx0aW5zW25hbWVdO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHVuZXNjYXBlSFRNTCwgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEpTVCxcbiAgICBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLFxuICAgIFRlbXBsYXRlRW5naW5lLFxufSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuaW1wb3J0IHsgTG9hZFRlbXBsYXRlT3B0aW9ucywgbG9hZFRlbXBsYXRlU291cmNlIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuZXhwb3J0IHsgY2xlYXJUZW1wbGF0ZUNhY2hlIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDb21waWxlZFRlbXBsYXRlLFxuICAgIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVCcmlkZ2UsXG59IGZyb20gJy4vYnJpZGdlJztcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBsaXN0LlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlUeXBlTGlzdCB7XG4gICAgZW5naW5lOiBKU1Q7XG4gICAgYnJpZGdlOiBDb21waWxlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGRlZmluaXRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+aMh+WumuWtkFxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSBrZXlvZiBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IG9wdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeU9wdGlvbnM8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcz4gZXh0ZW5kcyBMb2FkVGVtcGxhdGVPcHRpb25zLCBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLCBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBgZW5naW5lYCAvICdicmlkZ2UnXG4gICAgICovXG4gICAgdHlwZT86IFQ7XG4gICAgLyoqXG4gICAgICogQGVuIHRlbXBsYXRlIGxvYWQgY2FsbGJhY2suIGBicmlkZ2VgIG1vZGUgYWxsb3dzIGxvY2FsaXphdGlvbiBoZXJlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4joqq3jgb/ovrzjgb/jgrPjg7zjg6vjg5Djg4Pjgq8uIGBicmlkZ2VgIOODouODvOODieOBp+OBr+OBk+OBk+OBp+ODreODvOOCq+ODqeOCpOOCuuOBjOWPr+iDvVxuICAgICAqL1xuICAgIGNhbGxiYWNrPzogKHNyYzogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCkgPT4gc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IFByb21pc2U8c3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudD47XG59XG5cbi8qKlxuICogQGVuIEdldCBjb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlLlxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBvyBKYXZhU2NyaXB0IOODhuODs+ODl+ODrOODvOODiOWPluW+l1xuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBUaGUgc2VsZWN0b3Igc3RyaW5nIG9mIERPTS5cbiAqICAtIGBqYWAgRE9NIOOCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFRlbXBsYXRlPFQgZXh0ZW5kcyBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSAnZW5naW5lJz4oXG4gICAgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlUXVlcnlPcHRpb25zPFQ+XG4pOiBQcm9taXNlPFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXT4ge1xuICAgIGNvbnN0IHsgdHlwZSwgdXJsLCBub0NhY2hlLCBjYWxsYmFjayB9ID0gT2JqZWN0LmFzc2lnbih7IHR5cGU6ICdlbmdpbmUnLCBub0NhY2hlOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICBsZXQgc3JjID0gYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybCwgbm9DYWNoZSB9KTtcbiAgICBpZiAoIXNyYykge1xuICAgICAgICB0aHJvdyBuZXcgVVJJRXJyb3IoYGNhbm5vdCBzcGVjaWZpZWQgdGVtcGxhdGUgcmVzb3VyY2UuIHsgc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCAgdXJsOiAke3VybH0gfWApO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBzcmMgPSBhd2FpdCBjYWxsYmFjayhzcmMpO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdlbmdpbmUnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoc3JjIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHVuZXNjYXBlSFRNTChzcmMuaW5uZXJIVE1MKSA6IHNyYywgb3B0aW9ucykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBjYXNlICdicmlkZ2UnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlQnJpZGdlLmNvbXBpbGUoc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBbdHlwZTogJHt0eXBlfV0gaXMgdW5rbm93bi5gKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5sZXQgX2N1cnJlbnRJZCA9IDA7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBsZXQgY3VycmVudDogSUhvb2tTdGF0ZSB8IG51bGw7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRDdXJyZW50ID0gKHN0YXRlOiBJSG9va1N0YXRlKTogdm9pZCA9PiB7XG4gICAgY3VycmVudCA9IHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyQ3VycmVudCA9ICgpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gbnVsbDtcbiAgICBfY3VycmVudElkID0gMDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBub3RpZnkgPSAoKTogbnVtYmVyID0+IHtcbiAgICByZXR1cm4gX2N1cnJlbnRJZCsrO1xufTtcbiIsIi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rU3ltYm9sID0gU3ltYm9sKCdob29rJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnZWZmZWN0cycpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGxheW91dEVmZmVjdHNTeW1ib2wgPSBTeW1ib2woJ2xheW91dEVmZmVjdHMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRWZmZWN0c1N5bWJvbHMgPSB0eXBlb2YgZWZmZWN0c1N5bWJvbCB8IHR5cGVvZiBsYXlvdXRFZmZlY3RzU3ltYm9sO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgeyBzZXRDdXJyZW50LCBjbGVhckN1cnJlbnQgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHtcbiAgICBob29rU3ltYm9sLFxuICAgIGVmZmVjdHNTeW1ib2wsXG4gICAgbGF5b3V0RWZmZWN0c1N5bWJvbCxcbiAgICBFZmZlY3RzU3ltYm9scyxcbn0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGludGVyZmFjZSBDYWxsYWJsZSB7XG4gICAgY2FsbDogKHN0YXRlOiBTdGF0ZSkgPT4gdm9pZDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNsYXNzIFN0YXRlPEggPSB1bmtub3duPiBpbXBsZW1lbnRzIElIb29rU3RhdGU8SD4ge1xuICAgIHVwZGF0ZTogVm9pZEZ1bmN0aW9uO1xuICAgIGhvc3Q6IEg7XG4gICAgdmlydHVhbD86IGJvb2xlYW47XG4gICAgW2hvb2tTeW1ib2xdOiBNYXA8bnVtYmVyLCBIb29rPjtcbiAgICBbZWZmZWN0c1N5bWJvbF06IENhbGxhYmxlW107XG4gICAgW2xheW91dEVmZmVjdHNTeW1ib2xdOiBDYWxsYWJsZVtdO1xuXG4gICAgY29uc3RydWN0b3IodXBkYXRlOiBWb2lkRnVuY3Rpb24sIGhvc3Q6IEgpIHtcbiAgICAgICAgdGhpcy51cGRhdGUgPSB1cGRhdGU7XG4gICAgICAgIHRoaXMuaG9zdCA9IGhvc3Q7XG4gICAgICAgIHRoaXNbaG9va1N5bWJvbF0gPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXNbZWZmZWN0c1N5bWJvbF0gPSBbXTtcbiAgICAgICAgdGhpc1tsYXlvdXRFZmZlY3RzU3ltYm9sXSA9IFtdO1xuICAgIH1cblxuICAgIHJ1bjxUPihjYjogKCkgPT4gVCk6IFQge1xuICAgICAgICBzZXRDdXJyZW50KHRoaXMpO1xuICAgICAgICBjb25zdCByZXMgPSBjYigpO1xuICAgICAgICBjbGVhckN1cnJlbnQoKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBfcnVuRWZmZWN0cyhwaGFzZTogRWZmZWN0c1N5bWJvbHMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZWZmZWN0cyA9IHRoaXNbcGhhc2VdO1xuICAgICAgICBzZXRDdXJyZW50KHRoaXMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBlZmZlY3RzKSB7XG4gICAgICAgICAgICBlZmZlY3QuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBjbGVhckN1cnJlbnQoKTtcbiAgICB9XG5cbiAgICBydW5FZmZlY3RzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9ydW5FZmZlY3RzKGVmZmVjdHNTeW1ib2wpO1xuICAgIH1cblxuICAgIHJ1bkxheW91dEVmZmVjdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3J1bkVmZmVjdHMobGF5b3V0RWZmZWN0c1N5bWJvbCk7XG4gICAgfVxuXG4gICAgdGVhcmRvd24oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGhvb2tzID0gdGhpc1tob29rU3ltYm9sXTtcbiAgICAgICAgZm9yIChjb25zdCBbLCBob29rXSBvZiBob29rcykge1xuICAgICAgICAgICAgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBob29rLnRlYXJkb3duKSAmJiBob29rLnRlYXJkb3duKCk7XG4gICAgICAgICAgICBkZWxldGUgaG9vay50ZWFyZG93bjtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgUGFydEluZm8sXG4gICAgQXN5bmNEaXJlY3RpdmUsXG4gICAgRGlyZWN0aXZlUmVzdWx0LFxuICAgIGRpcmVjdGl2ZSxcbiAgICBub0NoYW5nZSxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgbm9vcCxcbiAgICBzY2hlZHVsZXIsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBkb20gYXMgJCB9IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbmNvbnN0IHNjaGVkdWxlID0gc2NoZWR1bGVyKCk7XG5cbmludGVyZmFjZSBEaXNjb25uZWN0YWJsZSB7XG4gICAgXyRwYXJlbnQ/OiBEaXNjb25uZWN0YWJsZTtcbiAgICBwYXJlbnROb2RlOiBFbGVtZW50O1xufVxuXG5jbGFzcyBIb29rRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YXRlOiBTdGF0ZTtcbiAgICBwcml2YXRlIF9yZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uO1xuICAgIHByaXZhdGUgX2FyZ3M6IHVua25vd25bXTtcbiAgICBwcml2YXRlIF9lbE9ic2VydmVkPzogTm9kZTtcbiAgICBwcml2YXRlIF9kaXNjb25uZWN0ZWRIYW5kbGVyPzogdHlwZW9mIEhvb2tEaXJlY3RpdmUucHJvdG90eXBlLmRpc2Nvbm5lY3RlZDtcblxuICAgIGNvbnN0cnVjdG9yKHBhcnQ6IFBhcnRJbmZvKSB7XG4gICAgICAgIHN1cGVyKHBhcnQpO1xuICAgICAgICB0aGlzLl9zdGF0ZSA9IG5ldyBTdGF0ZSgoKSA9PiB0aGlzLnJlZHJhdygpLCB0aGlzKTtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSBub29wO1xuICAgICAgICB0aGlzLl9hcmdzID0gW107XG4gICAgfVxuXG4gICAgcmVuZGVyKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IERpcmVjdGl2ZVJlc3VsdCB7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVyID0gcmVuZGVyZXI7XG4gICAgICAgIHRoaXMuX2FyZ3MgPSBhcmdzO1xuICAgICAgICB0aGlzLm9ic2VydmUoZWxSb290KTtcbiAgICAgICAgdGhpcy5yZWRyYXcoKTtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBkaXNjb25uZWN0ZWQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgJiYgJC51dGlscy51bmRldGVjdGlmeSh0aGlzLl9lbE9ic2VydmVkKTtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fc3RhdGUudGVhcmRvd24oKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlZHJhdygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhdGUucnVuKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLl9yZW5kZXJlciguLi50aGlzLl9hcmdzKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VmFsdWUocik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9zdGF0ZS5ydW5MYXlvdXRFZmZlY3RzKCk7XG4gICAgICAgIHNjaGVkdWxlKCgpID0+IHRoaXMuX3N0YXRlLnJ1bkVmZmVjdHMoKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvYnNlcnZlKGVsUm9vdDogTm9kZSB8IG51bGwpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2Rpc2Nvbm5lY3RlZEhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgXyRwYXJlbnQgfSA9IHRoaXMgYXMgdW5rbm93biBhcyBEaXNjb25uZWN0YWJsZTtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCA9IF8kcGFyZW50Py5wYXJlbnROb2RlO1xuICAgICAgICBpZiAodGhpcy5fZWxPYnNlcnZlZCkge1xuICAgICAgICAgICAgJC51dGlscy5kZXRlY3RpZnkodGhpcy5fZWxPYnNlcnZlZCwgZWxSb290IGFzIE5vZGUpO1xuICAgICAgICAgICAgdGhpcy5fZWxPYnNlcnZlZC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCB0aGlzLl9kaXNjb25uZWN0ZWRIYW5kbGVyID0gdGhpcy5kaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rc1dpdGggPSBkaXJlY3RpdmUoSG9va0RpcmVjdGl2ZSk7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY3VycmVudCwgbm90aWZ5IH0gZnJvbSAnLi9jdXJyZW50JztcbmltcG9ydCB7IGhvb2tTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKipcbiAqIEBlbiBCYXNlIGFic3RyYWN0IGNsYXNzIGZvciBDdXN0b20gSG9vayBDbGFzcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/jgq/jg6njgrnjga7ln7rlupXmir3osaHjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEhvb2s8UCBleHRlbmRzIHVua25vd25bXSA9IHVua25vd25bXSwgUiA9IHVua25vd24sIEggPSB1bmtub3duPiB7XG4gICAgaWQ6IG51bWJlcjtcbiAgICBzdGF0ZTogSUhvb2tTdGF0ZTxIPjtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlPEg+KSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgIH1cblxuICAgIGFic3RyYWN0IHVwZGF0ZSguLi5hcmdzOiBQKTogUjtcbiAgICB0ZWFyZG93bj8oKTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGRlZmluaXRpb24gZm9yIGN1c3RvbSBob29rcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/jga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDdXN0b21Ib29rPFAgZXh0ZW5kcyB1bmtub3duW10gPSB1bmtub3duW10sIFIgPSB1bmtub3duLCBIID0gdW5rbm93bj4ge1xuICAgIG5ldyAoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGU8SD4sIC4uLmFyZ3M6IFApOiBIb29rPFAsIFIsIEg+O1xufVxuXG5jb25zdCB1c2UgPSA8UCBleHRlbmRzIHVua25vd25bXSwgUiwgSCA9IHVua25vd24+KEhvb2s6IEN1c3RvbUhvb2s8UCwgUiwgSD4sIC4uLmFyZ3M6IFApOiBSID0+IHtcbiAgICBjb25zdCBpZCA9IG5vdGlmeSgpO1xuICAgIGNvbnN0IGhvb2tzID0gKGN1cnJlbnQgYXMgYW55KVtob29rU3ltYm9sXSBhcyBNYXA8bnVtYmVyLCBIb29rPjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICBsZXQgaG9vayA9IGhvb2tzLmdldChpZCkgYXMgSG9vazxQLCBSLCBIPiB8IHVuZGVmaW5lZDtcbiAgICBpZiAoIWhvb2spIHtcbiAgICAgICAgaG9vayA9IG5ldyBIb29rKGlkLCBjdXJyZW50IGFzIElIb29rU3RhdGU8SD4sIC4uLmFyZ3MpO1xuICAgICAgICBob29rcy5zZXQoaWQsIGhvb2spO1xuICAgIH1cblxuICAgIHJldHVybiBob29rLnVwZGF0ZSguLi5hcmdzKTtcbn07XG5cbi8qKlxuICogQGVuIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGN1c3RvbSBob29rcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/kvZzmiJDnlKjjg5XjgqHjgq/jg4jjg6rplqLmlbBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IElIb29rU3RhdGVDb250ZXh0LCBIb29rLCBtYWtlSG9vayB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogZXhwb3J0IGNvbnN0IHVzZU1lbW8gPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAqICAgICB2YWx1ZTogVDtcbiAqICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAqXG4gKiAgICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pIHtcbiAqICAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gKiAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICogICAgIH1cbiAqXG4gKiAgICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICogICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAqICAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gKiAgICAgICAgIH1cbiAqICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gKiAgICAgfVxuICpcbiAqICAgICBoYXNDaGFuZ2VkKHZhbHVlczogdW5rbm93bltdID0gW10pOiBib29sZWFuIHtcbiAqICAgICAgICAgcmV0dXJuIHZhbHVlcy5zb21lKCh2YWx1ZSwgaSkgPT4gdGhpcy52YWx1ZXNbaV0gIT09IHZhbHVlKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbWFrZUhvb2sgPSA8UCBleHRlbmRzIHVua25vd25bXSwgUiwgSCA9IHVua25vd24+KEhvb2s6IEN1c3RvbUhvb2s8UCwgUiwgSD4pOiAoLi4uYXJnczogUCkgPT4gUiA9PiB7XG4gICAgcmV0dXJuIHVzZS5iaW5kKG51bGwsIEhvb2spO1xufTtcbiIsImltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IE5ld0hvb2tTdGF0ZSwgSG9va1N0YXRlVXBkYXRlciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VTdGF0ZSA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICAgIGFyZ3MhOiByZWFkb25seSBbVCwgSG9va1N0YXRlVXBkYXRlcjxUPl07XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGluaXRpYWxWYWx1ZTogVCkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnVwZGF0ZXIgPSB0aGlzLnVwZGF0ZXIuYmluZCh0aGlzKTtcblxuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGluaXRpYWxWYWx1ZSkge1xuICAgICAgICAgICAgaW5pdGlhbFZhbHVlID0gaW5pdGlhbFZhbHVlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKGluaXRpYWxWYWx1ZSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKCk6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFyZ3M7XG4gICAgfVxuXG4gICAgdXBkYXRlcih2YWx1ZTogTmV3SG9va1N0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IFtwcmV2aW91c1ZhbHVlXSA9IHRoaXMuYXJncztcbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlckZuID0gdmFsdWUgYXMgKHByZXZpb3VzU3RhdGU/OiBUKSA9PiBUO1xuICAgICAgICAgICAgdmFsdWUgPSB1cGRhdGVyRm4ocHJldmlvdXNWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVlcEVxdWFsKHByZXZpb3VzVmFsdWUsIHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYWtlQXJncyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgbWFrZUFyZ3ModmFsdWU6IFQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcmdzID0gT2JqZWN0LmZyZWV6ZShbdmFsdWUsIHRoaXMudXBkYXRlcl0gYXMgY29uc3QpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cbn0pIGFzIDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgVCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBSKSA/IFIgOiBULFxuICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuXTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LWZ1bmN0aW9uLXJldHVybi10eXBlLFxuICovXG5cbmltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuXG50eXBlIEVmZmVjdCA9ICh0aGlzOiBTdGF0ZSkgPT4gdm9pZCB8IFZvaWRGdW5jdGlvbiB8IFByb21pc2U8dm9pZD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVFZmZlY3QgPSAoc2V0RWZmZWN0czogKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKSA9PiB2b2lkKSA9PiB7XG4gICAgcmV0dXJuIG1ha2VIb29rKGNsYXNzIGV4dGVuZHMgSG9vayB7XG4gICAgICAgIGNhbGxiYWNrITogRWZmZWN0O1xuICAgICAgICBsYXN0VmFsdWVzPzogdW5rbm93bltdO1xuICAgICAgICB2YWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIF90ZWFyZG93biE6IFByb21pc2U8dm9pZD4gfCBWb2lkRnVuY3Rpb24gfCB2b2lkO1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgaWdub3JlZDE6IEVmZmVjdCwgaWdub3JlZDI/OiB1bmtub3duW10pIHtcbiAgICAgICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgICAgICBzZXRFZmZlY3RzKHN0YXRlLCB0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZShjYWxsYmFjazogRWZmZWN0LCB2YWx1ZXM/OiB1bmtub3duW10pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICghdGhpcy52YWx1ZXMgfHwgdGhpcy5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sYXN0VmFsdWVzID0gdGhpcy52YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBydW4oKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnRlYXJkb3duKCk7XG4gICAgICAgICAgICB0aGlzLl90ZWFyZG93biA9IHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLnN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRlYXJkb3duKCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLl90ZWFyZG93bikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RlYXJkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBoYXNDaGFuZ2VkKCk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmxhc3RWYWx1ZXMgfHwgdGhpcy52YWx1ZXMhLnNvbWUoKHZhbHVlLCBpKSA9PiAhZGVlcEVxdWFsKHRoaXMubGFzdFZhbHVlcyFbaV0sIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgZWZmZWN0c1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQgeyBjcmVhdGVFZmZlY3QgfSBmcm9tICcuL2NyZWF0ZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3Qgc2V0RWZmZWN0cyA9IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSk6IHZvaWQgPT4ge1xuICAgIHN0YXRlW2VmZmVjdHNTeW1ib2xdLnB1c2goY2IpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUVmZmVjdCA9IGNyZWF0ZUVmZmVjdChzZXRFZmZlY3RzKTtcbiIsImltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBsYXlvdXRFZmZlY3RzU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCB7IGNyZWF0ZUVmZmVjdCB9IGZyb20gJy4vY3JlYXRlLWVmZmVjdCc7XG5cbmNvbnN0IHNldExheW91dEVmZmVjdHMgPSAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpOiB2b2lkID0+IHtcbiAgICBzdGF0ZVtsYXlvdXRFZmZlY3RzU3ltYm9sXS5wdXNoKGNiKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VMYXlvdXRFZmZlY3QgPSBjcmVhdGVFZmZlY3Qoc2V0TGF5b3V0RWZmZWN0cyk7XG4iLCJpbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VNZW1vID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gICAgdmFsdWU6IFQ7XG4gICAgdmFsdWVzOiB1bmtub3duW107XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgfVxuXG4gICAgaGFzQ2hhbmdlZCh2YWx1ZXM6IHVua25vd25bXSA9IFtdKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2YWx1ZXMuc29tZSgodmFsdWUsIGkpID0+IHRoaXMudmFsdWVzW2ldICE9PSB2YWx1ZSk7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfSA9IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHVzZU1lbW8oKCkgPT4gKHtcbiAgICBjdXJyZW50OiBpbml0aWFsVmFsdWVcbn0pLCBbXSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVFxuICAgID0gPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gdXNlTWVtbygoKSA9PiBmbiwgaW5wdXRzKTtcbiIsImltcG9ydCB0eXBlIHsgSG9va1JlZHVjZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVJlZHVjZXIgPSBtYWtlSG9vayhjbGFzcyA8UywgSSwgQT4gZXh0ZW5kcyBIb29rIHtcbiAgICByZWR1Y2VyITogSG9va1JlZHVjZXI8UywgQT47XG4gICAgY3VycmVudFN0YXRlOiBTO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBfOiBIb29rUmVkdWNlcjxTLCBBPiwgaW5pdGlhbFN0YXRlOiBJLCBpbml0PzogKF86IEkpID0+IFMpIHtcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IHRoaXMuZGlzcGF0Y2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSB1bmRlZmluZWQgIT09IGluaXQgPyBpbml0KGluaXRpYWxTdGF0ZSkgOiBpbml0aWFsU3RhdGUgYXMgdW5rbm93biBhcyBTO1xuICAgIH1cblxuICAgIHVwZGF0ZShyZWR1Y2VyOiBIb29rUmVkdWNlcjxTLCBBPik6IHJlYWRvbmx5IFtTLCAoYWN0aW9uOiBBKSA9PiB2b2lkXSB7XG4gICAgICAgIHRoaXMucmVkdWNlciA9IHJlZHVjZXI7XG4gICAgICAgIHJldHVybiBbdGhpcy5jdXJyZW50U3RhdGUsIHRoaXMuZGlzcGF0Y2hdOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cblxuICAgIGRpc3BhdGNoKGFjdGlvbjogQSk6IHZvaWQge1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHRoaXMucmVkdWNlcih0aGlzLmN1cnJlbnRTdGF0ZSwgYWN0aW9uKTtcbiAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICB9XG59KTtcbiIsImltcG9ydCB7IERpcmVjdGl2ZVJlc3VsdCwgbm9DaGFuZ2UgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQgdHlwZSB7IElIb29rQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBpbnRlcmZhY2UgSG9va0NvbnRleHRMaXN0ZW5lciB7XG4gICAgb25VcGRhdGVDb250ZXh0OiAodmFsdWU6IHVua25vd24pID0+IHZvaWQ7XG59XG5cbi8vIGNvbnN0IF9tYXBIb29rcyA9IG5ldyBXZWFrTWFwPElIb29rQ29udGV4dCwgU2V0PEhvb2tDb250ZXh0TGlzdGVuZXI+PigpO1xuXG5jbGFzcyBIb29rQ29udGV4dDxUPiBpbXBsZW1lbnRzIElIb29rQ29udGV4dDxUPiB7XG4gICAgcmVhZG9ubHkgZGVmYXVsdFZhbHVlOiBUIHwgdW5kZWZpbmVkO1xuICAgIHByaXZhdGUgX3ZhbHVlOiBUO1xuXG4gICAgY29uc3RydWN0b3IoZGVmYXVsdFZhbHVlPzogVCkge1xuICAgICAgICB0aGlzLnByb3ZpZGUgPSB0aGlzLnByb3ZpZGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5jb25zdW1lID0gdGhpcy5jb25zdW1lLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gZGVmYXVsdFZhbHVlO1xuICAgICAgICB0aGlzLl92YWx1ZSA9IGRlZmF1bHRWYWx1ZSBhcyBUO1xuICAgICAgICAvLyBfbWFwSG9va3Muc2V0KHRoaXMsIG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgcHJvdmlkZSh2YWx1ZTogVCwgdGVtcGxhdGU/OiBEaXJlY3RpdmVSZXN1bHQpOiBEaXJlY3RpdmVSZXN1bHQge1xuICAgICAgICBpZiAodGhpcy5fdmFsdWUgPT09IHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgLy8gY29uc3QgbGlzdGVuZXJzID0gX21hcEhvb2tzLmdldCh0aGlzKSBhcyBTZXQ8SG9va0NvbnRleHRMaXN0ZW5lcj47XG4gICAgICAgIC8vIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vICAgICBsaXN0ZW5lci5vblVwZGF0ZUNvbnRleHQodGhpcy5fdmFsdWUpO1xuICAgICAgICAvLyB9XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZSB8fCBub0NoYW5nZTtcbiAgICB9XG5cbiAgICBjb25zdW1lKGNhbGxiYWNrOiAodmFsdWU6IFQpID0+IERpcmVjdGl2ZVJlc3VsdCB8IHZvaWQpOiBEaXJlY3RpdmVSZXN1bHQgfCB2b2lkIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHRoaXMuX3ZhbHVlKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbi8vIGV4cG9ydCBjb25zdCBnZXRDb250ZXh0U3RhY2sgPSAoY29udGV4dDogSUhvb2tDb250ZXh0KTogU2V0PEhvb2tDb250ZXh0TGlzdGVuZXI+ID0+IHtcbi8vICAgICByZXR1cm4gX21hcEhvb2tzLmdldChjb250ZXh0KSB8fCBuZXcgU2V0KCk7XG4vLyB9O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY3JlYXRlQ29udGV4dCA9IDxUPihkZWZhdWx0VmFsdWU/OiBUKTogSUhvb2tDb250ZXh0PFQ+ID0+IHtcbiAgICByZXR1cm4gbmV3IEhvb2tDb250ZXh0KGRlZmF1bHRWYWx1ZSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9va0NvbnRleHRMaXN0ZW5lciwgLypnZXRDb250ZXh0U3RhY2sqLyB9IGZyb20gJy4vY3JlYXRlLWNvbnRleHQnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgc2V0RWZmZWN0cyB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDb250ZXh0ID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vazxbSUhvb2tDb250ZXh0PFQ+XSwgVCwgdW5rbm93bj4gaW1wbGVtZW50cyBIb29rQ29udGV4dExpc3RlbmVyIHtcbiAgICBjb250ZXh0ITogSUhvb2tDb250ZXh0PFQ+O1xuICAgIHZhbHVlITogVDtcbiAgICBfcmFuRWZmZWN0OiBib29sZWFuO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBfOiBJSG9va0NvbnRleHQ8VD4pIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy5fcmFuRWZmZWN0ID0gZmFsc2U7XG4gICAgICAgIHNldEVmZmVjdHMoc3RhdGUsIHRoaXMpO1xuICAgIH1cblxuICAgIHVwZGF0ZShjb250ZXh0OiBJSG9va0NvbnRleHQ8VD4pOiBUIHtcbiAgICAgICAgaWYgKHRoaXMuY29udGV4dCAhPT0gY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy51bnN1YnNjcmliZSh0aGlzLmNvbnRleHQpO1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgIGNvbnRleHQuY29uc3VtZSh2YWx1ZSA9PiB7IHRoaXMudmFsdWUgPSB2YWx1ZTsgfSk7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmliZShjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgICB9XG5cbiAgICBjYWxsKCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuX3JhbkVmZmVjdCkge1xuICAgICAgICAgICAgdGhpcy5fcmFuRWZmZWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZSh0aGlzLmNvbnRleHQpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IEhvb2tDb250ZXh0TGlzdGVuZXJcblxuICAgIG9uVXBkYXRlQ29udGV4dCh2YWx1ZTogVCk6IHZvaWQge1xuICAgICAgICAvLyB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIC8vIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWw6IGxpc3RlbmVyXG5cbiAgICBwcml2YXRlIHN1YnNjcmliZShjb250ZXh0OiBJSG9va0NvbnRleHQ8VD4pOiB2b2lkIHtcbiAgICAgICAgLy8gY29uc3Qgc3RhY2sgPSBnZXRDb250ZXh0U3RhY2soY29udGV4dCk7XG4gICAgICAgIC8vIHN0YWNrLmFkZCh0aGlzKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHVuc3Vic2NyaWJlKGNvbnRleHQ6IElIb29rQ29udGV4dDxUPik6IHZvaWQge1xuICAgICAgICAvLyBjb25zdCBzdGFjayA9IGdldENvbnRleHRTdGFjayhjb250ZXh0KTtcbiAgICAgICAgLy8gc3RhY2suZGVsZXRlKHRoaXMpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIEhvb2tTdGF0ZVVwZGF0ZXIsXG4gICAgSG9va1JlZHVjZXIsXG4gICAgSUhvb2tDb250ZXh0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaG9va3NXaXRoIH0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICcuL3VzZS1zdGF0ZSc7XG5pbXBvcnQgeyB1c2VFZmZlY3QgfSBmcm9tICcuL3VzZS1lZmZlY3QnO1xuaW1wb3J0IHsgdXNlTGF5b3V0RWZmZWN0IH0gZnJvbSAnLi91c2UtbGF5b3V0LWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5pbXBvcnQgeyB1c2VSZWYgfSBmcm9tICcuL3VzZS1yZWYnO1xuaW1wb3J0IHsgdXNlQ2FsbGJhY2sgfSBmcm9tICcuL3VzZS1jYWxsYmFjayc7XG5pbXBvcnQgeyB1c2VSZWR1Y2VyIH0gZnJvbSAnLi91c2UtcmVkdWNlcic7XG5pbXBvcnQgeyBjcmVhdGVDb250ZXh0IH0gZnJvbSAnLi9jcmVhdGUtY29udGV4dCc7XG5pbXBvcnQgeyB1c2VDb250ZXh0IH0gZnJvbSAnLi91c2UtY29udGV4dCc7XG5leHBvcnQgKiBmcm9tICcuL2ludGVyZmFjZXMnO1xuZXhwb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuXG4vKipcbiAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IHBhcml0eSB3aXRoIHRoZSBSZWFjdCBob29rcyBjb25jZXB0LlxuICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+m1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAqXG4gKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAqICAgICBjb25zdCBbY291bnQsIHNldENvdW50XSA9IHVzZVN0YXRlKDApO1xuICogICAgIHJldHVybiBodG1sYFxuICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAqICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInN0YXRlLXBsdXNcIiBAY2xpY2s9JHsoKSA9PiBzZXRDb3VudChwcmV2Q291bnQgPT4gcHJldkNvdW50ISArIDEpfT7inpU8L2J1dHRvbj5cbiAqICAgICBgO1xuICogfVxuICpcbiAqIC8vIHJlbmRlciB3aXRoIGhvb2tzXG4gKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rcyB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuIDxicj5cbiAgICAgKiAgICAgQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguXG4gICAgICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+myA8YnI+XG4gICAgICogICAgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqBcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gICAgICogY29uc3QgeyB1c2VTdGF0ZSB9ID0gaG9va3M7XG4gICAgICpcbiAgICAgKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAgICAgKiBmdW5jdGlvbiBBcHAoKSB7XG4gICAgICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gICAgICogICAgIHJldHVybiBodG1sYFxuICAgICAqICAgICAgICAgPHA+Q291bnQ6ICR7IGNvdW50IH08L3A+XG4gICAgICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICAgICAqICAgICBgO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzXG4gICAgICogcmVuZGVyKGhvb2tzKEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlbmRlcmVyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHJldHVybnMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44KS6L+U5Y2044GZ44KL6Zai5pWw44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIEFyZ3VtZW50cyBwYXNzZWQgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBq+OCj+OBn+OCi+W8leaVsFxuICAgICAqL1xuICAgIChyZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBIb29rcyBmZWF0dXJlIHRvIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4LiAoc3BlY2lmeSBhIERPTSBkaXNjb25uZWN0IGRldGVjdGlvbiBlbGVtZW50KVxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgasgSG9va3Mg5qmf6IO944KS5LuY5YqgIChET00g5YiH5pat5qSc55+l6KaB57Sg44KS5oyH5a6aKVxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzb21lLXBhZ2UnKTtcbiAgICAgKiAvLyBlbmFibGluZyBob29rcyB3aXRoIHJvb3QgZWxlbWVudFxuICAgICAqIHJlbmRlcihob29rcy53aXRoKGVsLCBBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFJvb3RcbiAgICAgKiAgLSBgZW5gIFJvb3QgZWxlbWVudCB1c2VkIGZvciBET00gZGlzY29ubmVjdGlvbiBkZXRlY3Rpb24uIElmIGBudWxsYCBwYXNzZWQsIGBkb2N1bWVudGAgaXMgc3BlY2lmaWVkXG4gICAgICogIC0gYGphYCBET00g5YiH5pat5qSc55+l44Gr5L2/55So44GZ44KL44Or44O844OI6KaB57SgLiBgbnVsbGAg44GM5rih44KL44GoIGBkb2N1bWVudGAg44GM5oyH5a6a44GV44KM44KLXG4gICAgICogQHBhcmFtIHJlbmRlcmVyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHJldHVybnMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44KS6L+U5Y2044GZ44KL6Zai5pWw44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIEFyZ3VtZW50cyBwYXNzZWQgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBq+OCj+OBn+OCi+W8leaVsFxuICAgICAqL1xuICAgIHdpdGg6IChlbFJvb3Q6IE5vZGUgfCBudWxsLCByZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgc3RhdGVmdWwgdmFsdWUgYW5kIGEgZnVuY3Rpb24gdG8gdXBkYXRlIGl0LlxuICAgICAqIEBqYSDjgrnjg4bjg7zjg4jjg5Xjg6vjgarlgKTjgajjgIHjgZ3jgozjgpLmm7TmlrDjgZnjgovjgZ/jgoHjga7plqLmlbDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbml0aWFsU3RhdGVcbiAgICAgKiAgLSBgZW5gIFRoZSB2YWx1ZSB5b3Ugd2FudCB0aGUgc3RhdGUgdG8gYmUgaW5pdGlhbGx5LlxuICAgICAqICAtIGBqYWAg54q25oWL44Gu5Yid5pyf5YyW5YCkXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHVybnMgYW4gYXJyYXkgd2l0aCBleGFjdGx5IHR3byB2YWx1ZXMuIFtgY3VycmVudFN0YXRlYCwgYHVwZGF0ZUZ1bmN0aW9uYF1cbiAgICAgKiAgLSBgamFgIDLjgaTjga7lgKTjgpLmjIHjgaTphY3liJfjgpLov5TljbQgW2BjdXJyZW50U3RhdGVgLCBgdXBkYXRlRnVuY3Rpb25gXVxuICAgICAqL1xuICAgIHVzZVN0YXRlOiA8VD4oaW5pdGlhbFN0YXRlPzogVCkgPT4gcmVhZG9ubHkgW1xuICAgICAgICBUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFIpID8gUiA6IFQsXG4gICAgICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuICAgIF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXB0cyBhIGZ1bmN0aW9uIHRoYXQgY29udGFpbnMgaW1wZXJhdGl2ZSwgcG9zc2libHkgZWZmZWN0ZnVsIGNvZGUuXG4gICAgICogQGphIOWJr+S9nOeUqOOCkuacieOBmeOCi+WPr+iDveaAp+OBruOBguOCi+WRveS7pOWei+OBruOCs+ODvOODieOBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIGVmZmVjdFxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBydW5zIGVhY2ggdGltZSBkZXBlbmRlbmNpZXMgY2hhbmdlXG4gICAgICogIC0gYGphYCDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgovjgZ/jgbPjgavlrp/ooYzjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzXG4gICAgICogIC0gYGVuYCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byB0aGUgZWZmZWN0XG4gICAgICogIC0gYGphYCDlia/kvZznlKjnmbrngavjga7jg4jjg6rjgqzjg7zjgajjgarjgovkvp3lrZjplqLkv4Ljga7jg6rjgrnjg4hcbiAgICAgKi9cbiAgICB1c2VFZmZlY3Q6IChlZmZlY3Q6ICgpID0+IHZvaWQsIGRlcGVuZGVuY2llcz86IHVua25vd25bXSkgPT4gdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBjb250YWlucyBpbXBlcmF0aXZlLCBwb3NzaWJseSBlZmZlY3RmdWwgY29kZS4gPGJyPlxuICAgICAqICAgICBVbmxpa2UgW1t1c2VFZmZlY3RdXSAsIGl0IGlzIGV4ZWN1dGVkIGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHJlbmRlcmVkIGFuZCB0aGUgbmV3IGVsZW1lbnQgaXMgZGlzcGxheWVkIG9uIHRoZSBzY3JlZW4uXG4gICAgICogQGphIOWJr+S9nOeUqOOCkuacieOBmeOCi+WPr+iDveaAp+OBruOBguOCi+WRveS7pOWei+OBruOCs+ODvOODieOBrumBqeeUqCA8YnI+XG4gICAgICogICAgIFtbdXNlRWZmZWN0XV0g44Go55Ww44Gq44KKLCDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgYzjg6zjg7Pjg4Djg6rjg7PjgrDjgZXjgozjgabmlrDjgZfjgYTopoHntKDjgYznlLvpnaLjgavooajnpLrjgZXjgozjgovliY3jgavlrp/ooYzjgZXjgozjgovjgIJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlZmZlY3RcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcnVucyBlYWNoIHRpbWUgZGVwZW5kZW5jaWVzIGNoYW5nZVxuICAgICAqICAtIGBqYWAg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44KL44Gf44Gz44Gr5a6f6KGM44GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIGRlcGVuZGVuY2llc1xuICAgICAqICAtIGBlbmAgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gdGhlIGVmZmVjdFxuICAgICAqICAtIGBqYWAg5Ymv5L2c55So55m654Gr44Gu44OI44Oq44Ks44O844Go44Gq44KL5L6d5a2Y6Zai5L+C44Gu44Oq44K544OIXG4gICAgICovXG4gICAgdXNlTGF5b3V0RWZmZWN0OiAoZWZmZWN0OiAoKSA9PiB2b2lkLCBkZXBlbmRlbmNpZXM/OiB1bmtub3duW10pID0+IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXNlZCB0byByZWR1Y2UgY29tcG9uZW50IHJlLXJlbmRlcmluZy4gPGJyPlxuICAgICAqICAgICBDYWNoZSB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIHRoZSBjYWNoZWQgdmFsdWUgd2hlbiBjYWxsZWQgd2l0aCB0aGUgc2FtZSBhcmd1bWVudHMuXG4gICAgICogQGphIOOCs+ODs+ODneODvOODjeODs+ODiOOBruWGjeODrOODs+ODgOODquODs+OCsOOCkuaKkeOBiOOCi+OBn+OCgeOBq+S9v+eUqCA8YnI+XG4gICAgICogICAgIOmWouaVsOOBruaIu+OCiuWApOOCkuOCreODo+ODg+OCt+ODpeOBl+OAgeWQjOOBmOW8leaVsOOBp+WRvOOBs+WHuuOBleOCjOOBn+WgtOWQiOOBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBn+WApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHZhbHVlXG4gICAgICogIC0gYGphYCDlgKTjgpLov5TjgZnplqLmlbBcbiAgICAgKiBAcGFyYW0gdmFsdWVzXG4gICAgICogIC0gYGVuYCBBbiBhcnJheSBvZiB2YWx1ZXMgdGhhdCBhcmUgdXNlZCBhcyBhcmd1bWVudHMgZm9yIGBmbmBcbiAgICAgKiAgLSBgamFgIGBmbmAg44Gu5byV5pWw44Go44GX44Gm5L2/55So44GV44KM44KL5YCk44Gu6YWN5YiXXG4gICAgICovXG4gICAgdXNlTWVtbzogPFQ+KGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkgPT4gVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBMZXRzIHlvdSByZWZlcmVuY2UgYSB2YWx1ZSB0aGF04oCZcyBub3QgbmVlZGVkIGZvciByZW5kZXJpbmcuIDxicj5cbiAgICAgKiAgICAgTWFpbmx5IGF2YWlsYWJsZSBmb3IgYWNjZXNzaW5nIERPTSBub2Rlcy5cbiAgICAgKiBAamEg44Os44Oz44OA44Oq44Oz44Kw44Gr5LiN6KaB44Gq5YCk44KS5Y+C54Wn5Y+v6IO944Gr44GZ44KLPGJyPlxuICAgICAqICAgICDkuLvjgasgRE9NIOODjuODvOODieOBuOOBruOCouOCr+OCu+OCueOBq+WIqeeUqOWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWxWYWx1ZVxuICAgICAqICAtIGBlbmAgVGhlIGluaXRpYWwgdmFsdWUgb2YgdGhlIHJlZmVyZW5jZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Gu5Yid5pyf5YCkXG4gICAgICovXG4gICAgdXNlUmVmOiA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB7IGN1cnJlbnQ6IFQ7IH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhIG1lbW9pemVkIHZlcnNpb24gb2YgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgb25seSBjaGFuZ2VzIGlmIHRoZSBkZXBlbmRlbmNpZXMgY2hhbmdlLiA8YnI+XG4gICAgICogICAgIFVzZWZ1bCBmb3IgcGFzc2luZyBjYWxsYmFja3MgdG8gb3B0aW1pemVkIGNoaWxkIGNvbXBvbmVudHMgdGhhdCByZWx5IG9uIHJlZmVyZW50aWFsIGVxdWFsaXR5LlxuICAgICAqIEBqYSDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgZ/loLTlkIjjgavjga7jgb/lpInmm7TjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjga7jg6Hjg6LljJbjg5Djg7zjgrjjg6fjg7PjgpLov5TljbQgPGJyPlxuICAgICAqICAgICDlj4LnhafnrYnkvqHmgKfjgavkvp3lrZjjgZnjgovmnIDpganljJbjgZXjgozjgZ/lrZDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgavjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmuKHjgZnloLTlkIjjgavlvbnnq4vjgaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqICAtIGBlbmAgVGhlIGZ1bmN0aW9uIHRvIG1lbW9pemVcbiAgICAgKiAgLSBgamFgIOODoeODouWMluOBmeOCi+mWouaVsFxuICAgICAqIEBwYXJhbSBpbnB1dHNcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5IG9mIGlucHV0cyB0byB3YXRjaCBmb3IgY2hhbmdlc1xuICAgICAqICAtIGBqYWAg5aSJ5pu044KS55uj6KaW44GZ44KL5YWl5Yqb44Gu6YWN5YiXXG4gICAgICovXG4gICAgdXNlQ2FsbGJhY2s6IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSG9vayBBUEkgZm9yIG1hbmFnaW5nIHN0YXRlIGluIGZ1bmN0aW9uIGNvbXBvbmVudHMuXG4gICAgICogQGphIOmWouaVsOOCs+ODs+ODneODvOODjeODs+ODiOOBp+eKtuaFi+OCkueuoeeQhuOBmeOCi+OBn+OCgeOBriBIb29rIEFQSVxuICAgICAqXG4gICAgICogQHBhcmFtIHJlZHVjZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmQgYW4gYWN0aW9uIGFuZCByZXR1cm5zIGEgbmV3IHN0YXRlXG4gICAgICogIC0gYGphYCDnj77lnKjjga7nirbmhYvjgajjgqLjgq/jgrfjg6fjg7PjgpLlj5fjgZHlj5bjgorjgIHmlrDjgZfjgYTnirbmhYvjgpLov5TjgZnplqLmlbBcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFN0YXRlXG4gICAgICogIC0gYGVuYCBUaGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWNlclxuICAgICAqICAtIGBqYWAg44Oq44OH44Ol44O844K144O844Gu5Yid5pyf54q25oWL44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRcbiAgICAgKiAgLSBgZW5gIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWNlclxuICAgICAqICAtIGBqYWAg44Oq44OH44Ol44O844K144O844Gu5Yid5pyf54q25oWL44KS6L+U44GZ44Kq44OX44K344On44Oz44Gu6Zai5pWwXG4gICAgICovXG4gICAgdXNlUmVkdWNlcjogPFMsIEksIEE+KHJlZHVjZXI6IEhvb2tSZWR1Y2VyPFMsIEE+LCBpbml0aWFsU3RhdGU6IEksIGluaXQ/OiAoKF86IEkpID0+IFMpIHwgdW5kZWZpbmVkKSA9PiByZWFkb25seSBbUywgKGFjdGlvbjogQSkgPT4gdm9pZF07XG5cbiAgICAvKipcbiAgICAgKiBAZW5cbiAgICAgKiBjcmVhdGVDb250ZXh0IGlzIGEgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIGEgbmV3IGNvbnRleHQgb2JqZWN0LiBBIGNvbnRleHQgb2JqZWN0IGlzIHVzZWQgdG8gc2hhcmUgZGF0YSB0aGF0IGNhbiBiZSBjb25zaWRlcmVkIOKAnGdsb2JhbOKAnSBmb3IgYSB0cmVlIG9mIFJlYWN0IGNvbXBvbmVudHMuXG4gICAgICpcbiAgICAgKiBAamFcbiAgICAgKiBjcmVhdGVDb250ZXh0IOOBr+aWsOOBl+OBhOOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOCkuS9nOaIkOOBmeOCi+mWouaVsOOBp+OBmeOAguOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBr+OAgVJlYWN0IOOCs+ODs+ODneODvOODjeODs+ODiOOBruODhOODquODvOOBq+WvvuOBl+OBpuOAjOOCsOODreODvOODkOODq+OAjeOBqOiAg+OBiOOCieOCjOOCi+ODh+ODvOOCv+OCkuWFseacieOBmeOCi+OBn+OCgeOBq+S9v+eUqOOBleOCjOOBvuOBmeOAglxuICAgICAqXG4gICAgICogQHBhcmFtIGRlZmF1bHRWYWx1ZVxuICAgICAqICAtIGBlbmA6IFRoZSBkZWZhdWx0IHZhbHVlIGZvciB0aGUgY29udGV4dCBvYmplY3QuXG4gICAgICogIC0gYGphYDog44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44Gu44OH44OV44Kp44Or44OI5YCk44CCXG4gICAgICovXG4gICAgY3JlYXRlQ29udGV4dDogPFQ+KGRlZmF1bHRWYWx1ZT86IFQpID0+IElIb29rQ29udGV4dDxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlblxuICAgICAqIHVzZUNvbnRleHQgaXMgYSBob29rIHRoYXQgcmV0dXJucyB0aGUgY3VycmVudCBjb250ZXh0IHZhbHVlIGZvciB0aGUgZ2l2ZW4gY29udGV4dCBvYmplY3QuIFdoZW4gdGhlIG5lYXJlc3QgPE15Q29udGV4dC5Qcm92aWRlcj4gYWJvdmUgdGhlIGNvbXBvbmVudCB1cGRhdGVzLCB0aGlzIGhvb2sgd2lsbCB0cmlnZ2VyIGEgcmVyZW5kZXIgd2l0aCB0aGUgbGF0ZXN0IGNvbnRleHQgdmFsdWUgcGFzc2VkIHRvIHRoYXQgTXlDb250ZXh0IHByb3ZpZGVyLlxuICAgICAqXG4gICAgICogQGphXG4gICAgICogdXNlQ29udGV4dCDjga/jgIHmjIflrprjgZXjgozjgZ/jgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjgavlr77jgZnjgovnj77lnKjjga7jgrPjg7Pjg4bjgq3jgrnjg4jlgKTjgpLov5TjgZnjg5Xjg4Pjgq/jgafjgZnjgILjgZPjga7jg5Xjg4Pjgq/jga/jgIHjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7kuIrjgavjgYLjgovmnIDjgoLov5HjgYQgPE15Q29udGV4dC5Qcm92aWRlcj4g44GM5pu05paw44GV44KM44KL44Go44CB44Gd44GuIE15Q29udGV4dCDjg5fjg63jg5DjgqTjg4Djg7zjgavmuKHjgZXjgozjgZ/mnIDmlrDjga7jgrPjg7Pjg4bjgq3jgrnjg4jlgKTjgaflho3jg6zjg7Pjg4Djg6rjg7PjgrDjgYzjg4jjg6rjgqzjg7zjgZXjgozjgb7jgZnjgIJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYDogVGhlIGNvbnRleHQgb2JqZWN0IHJldHVybmVkIGZyb20gUmVhY3QuY3JlYXRlQ29udGV4dC5cbiAgICAgKiAgLSBgamFgOiBSZWFjdC5jcmVhdGVDb250ZXh0IOOBi+OCiei/lOOBleOCjOOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOAglxuICAgICAqL1xuICAgIHVzZUNvbnRleHQ6IDxUPihjb250ZXh0OiBJSG9va0NvbnRleHQ8VD4pID0+IFQ7XG59XG5cbmNvbnN0IGhvb2tzOiBIb29rcyA9IGhvb2tzV2l0aC5iaW5kKG51bGwsIG51bGwpO1xuaG9va3Mud2l0aCAgICAgICAgICAgID0gaG9va3NXaXRoO1xuaG9va3MudXNlU3RhdGUgICAgICAgID0gdXNlU3RhdGU7XG5ob29rcy51c2VFZmZlY3QgICAgICAgPSB1c2VFZmZlY3Q7XG5ob29rcy51c2VMYXlvdXRFZmZlY3QgPSB1c2VMYXlvdXRFZmZlY3Q7XG5ob29rcy51c2VNZW1vICAgICAgICAgPSB1c2VNZW1vO1xuaG9va3MudXNlUmVmICAgICAgICAgID0gdXNlUmVmO1xuaG9va3MudXNlQ2FsbGJhY2sgICAgID0gdXNlQ2FsbGJhY2s7XG5ob29rcy51c2VSZWR1Y2VyICAgICAgPSB1c2VSZWR1Y2VyO1xuaG9va3MuY3JlYXRlQ29udGV4dCAgID0gY3JlYXRlQ29udGV4dDtcbmhvb2tzLnVzZUNvbnRleHQgICAgICA9IHVzZUNvbnRleHQ7XG5cbmV4cG9ydCB7IGhvb2tzIH07XG4iXSwibmFtZXMiOlsiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBYUE7QUFDQSxNQUFNLFNBQVMsR0FBd0M7SUFDbkQsUUFBUSxFQUFFLHlCQUF5QixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFDO0lBQ2hFLFFBQVEsRUFBRSx5QkFBeUIsRUFBRTtDQUN4QyxDQUFDO0FBZ0NGOzs7QUFHRztBQUNILE1BQWEsY0FBYyxDQUFBOztBQUVmLElBQUEsT0FBTyxZQUFZLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQzs7O0FBS2pEOzs7Ozs7Ozs7O0FBVUc7QUFDSSxJQUFBLE9BQU8sT0FBTyxDQUFDLFFBQXNDLEVBQUUsT0FBc0MsRUFBQTtBQUNoRyxRQUFBLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM3RixRQUFBLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNyQyxRQUFBLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBa0IsS0FBd0M7QUFDbkUsWUFBQSxPQUFP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