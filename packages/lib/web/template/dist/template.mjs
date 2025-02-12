/*!
 * @cdp/template 0.9.19
 *   HTML template library
 */

import { html, directives, directive, AsyncDirective, noChange } from '@cdp/extension-template';
export * from '@cdp/extension-template';
import { createStampinoTransformer, createMustacheTransformer } from '@cdp/extension-template-bridge';
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
     * @en Get {@link CompiledTemplate} from template source.
     * @ja テンプレート文字列から {@link CompiledTemplate} を取得
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

class HookContext {
    defaultValue;
    _value;
    constructor(defaultValue) {
        this.provide = this.provide.bind(this);
        this.consume = this.consume.bind(this);
        this.defaultValue = defaultValue;
        this._value = defaultValue;
    }
    provide(value, callback) {
        this._value = value;
        return isFunction(callback) ? callback(value) : noChange;
    }
    consume(callback) {
        return callback(this._value);
    }
}
/** @internal */
const createContext = (defaultValue) => {
    return new HookContext(defaultValue);
};

/** @internal */
const useContext = makeHook(class extends Hook {
    _ranEffect;
    constructor(id, state, _) {
        super(id, state);
        this._ranEffect = false;
        setEffects(state, this);
    }
    update(context) {
        let retval;
        context.consume(value => { retval = value; });
        return retval;
    }
    call() {
        if (!this._ranEffect) {
            this._ranEffect = true;
            this.state.update();
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUubWpzIiwic291cmNlcyI6WyJicmlkZ2UudHMiLCJsb2FkZXIudHMiLCJob29rcy9jdXJyZW50LnRzIiwiaG9va3Mvc3ltYm9scy50cyIsImhvb2tzL3N0YXRlLnRzIiwiaG9va3MvZGlyZWN0aXZlLnRzIiwiaG9va3MvaG9vay50cyIsImhvb2tzL3VzZS1zdGF0ZS50cyIsImhvb2tzL2NyZWF0ZS1lZmZlY3QudHMiLCJob29rcy91c2UtZWZmZWN0LnRzIiwiaG9va3MvdXNlLWxheW91dC1lZmZlY3QudHMiLCJob29rcy91c2UtbWVtby50cyIsImhvb2tzL3VzZS1yZWYudHMiLCJob29rcy91c2UtY2FsbGJhY2sudHMiLCJob29rcy91c2UtcmVkdWNlci50cyIsImhvb2tzL2NyZWF0ZS1jb250ZXh0LnRzIiwiaG9va3MvdXNlLWNvbnRleHQudHMiLCJob29rcy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIGh0bWwsXG4gICAgZGlyZWN0aXZlcyxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlJztcbmltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCBidWlsdGluIHRyYW5zZm9ybWVycyAoZGVmYXVsdDogbXVzdGFjaGUpLiAqL1xuY29uc3QgX2J1aWx0aW5zOiBSZWNvcmQ8c3RyaW5nLCBUZW1wbGF0ZVRyYW5zZm9ybWVyPiA9IHtcbiAgICBtdXN0YWNoZTogY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihodG1sLCBkaXJlY3RpdmVzLnVuc2FmZUhUTUwpLFxuICAgIHN0YW1waW5vOiBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyKCksXG59O1xuXG4vKipcbiAqIEBlbiBDb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlIGludGVyZmFjZVxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBv+ODhuODs+ODl+ODrOODvOODiOagvOe0jeOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTb3VyY2UgdGVtcGxhdGUgc3RyaW5nXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNvdXJjZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgVGVtcGxhdGVSZXN1bHR9IHRoYXQgYXBwbGllZCBnaXZlbiBwYXJhbWV0ZXIocykuXG4gICAgICogQGphIOODkeODqeODoeODvOOCv+OCkumBqeeUqOOBlyB7QGxpbmsgVGVtcGxhdGVSZXN1bHR9IOOBuOWkieaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIHZpZXdcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHBhcmFtZXRlcnMgZm9yIHNvdXJjZS5cbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0O1xufVxuXG4vKipcbiAqIEBlbiB7QGxpbmsgVGVtcGxhdGVCcmlkZ2V9IGNvbXBpbGUgb3B0aW9uc1xuICogQGphIHtAbGluayBUZW1wbGF0ZUJyaWRnZX0g44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyB7XG4gICAgdHJhbnNmb3JtZXI/OiBUZW1wbGF0ZVRyYW5zZm9ybWVyO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBicmlkZ2UgZm9yIG90aGVyIHRlbXBsYXRlIGVuZ2luZSBzb3VyY2UuXG4gKiBAamEg5LuW44Gu44OG44Oz44OX44Os44O844OI44Ko44Oz44K444Oz44Gu5YWl5Yqb44KS5aSJ5o+b44GZ44KL44OG44Oz44OX44Os44O844OI44OW44Oq44OD44K444Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUJyaWRnZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgc3RhdGljIF90cmFuc2Zvcm1lciA9IF9idWlsdGlucy5tdXN0YWNoZTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIENvbXBpbGVkVGVtcGxhdGV9IGZyb20gdGVtcGxhdGUgc291cmNlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJfjgYvjgokge0BsaW5rIENvbXBpbGVkVGVtcGxhdGV9IOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHRlbXBsYXRlXG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBzb3VyY2Ugc3RyaW5nIC8gdGVtcGxhdGUgZWxlbWVudFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXIC8g44OG44Oz44OX44Os44O844OI44Ko44Os44Oh44Oz44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbXBpbGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjb21waWxlKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyk6IENvbXBpbGVkVGVtcGxhdGUge1xuICAgICAgICBjb25zdCB7IHRyYW5zZm9ybWVyIH0gPSBPYmplY3QuYXNzaWduKHsgdHJhbnNmb3JtZXI6IFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciB9LCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgZW5naW5lID0gdHJhbnNmb3JtZXIodGVtcGxhdGUpO1xuICAgICAgICBjb25zdCBqc3QgPSAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdCA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZW5naW5lKHZpZXcpO1xuICAgICAgICB9O1xuICAgICAgICBqc3Quc291cmNlID0gdGVtcGxhdGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdGVtcGxhdGUuaW5uZXJIVE1MIDogdGVtcGxhdGU7XG4gICAgICAgIHJldHVybiBqc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBkZWZhdWx0IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg5pei5a6a44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3VHJhbnNmb3JtZXJcbiAgICAgKiAgLSBgZW5gIG5ldyB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDku6XliY3jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldFRyYW5zZm9ybWVyKG5ld1RyYW5zZm9ybWVyOiBUZW1wbGF0ZVRyYW5zZm9ybWVyKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgICAgIGNvbnN0IG9sZFRyYW5zZm9ybWVyID0gVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyO1xuICAgICAgICBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXIgPSBuZXdUcmFuc2Zvcm1lcjtcbiAgICAgICAgcmV0dXJuIG9sZFRyYW5zZm9ybWVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYnVpbHQtaW4gdHJhbnNmb3JtZXIgbmFtZSBsaXN0LlxuICAgICAqIEBqYSDntYTjgb/ovrzjgb/jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3np7DkuIDopqfjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBuYW1lIGxpc3QuXG4gICAgICogIC0gYGphYCDlkI3np7DkuIDopqfjgpLov5TljbRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IGJ1aWx0aW5zKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKF9idWlsdGlucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdCBuYW1lLlxuICAgICAqICAtIGBqYWAg5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5ZCN5YmN44KS5oyH5a6aLlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGdldEJ1aXRpblRyYW5zZm9ybWVyKG5hbWU6IHN0cmluZyk6IFRlbXBsYXRlVHJhbnNmb3JtZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX2J1aWx0aW5zW25hbWVdO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHVuZXNjYXBlSFRNTCwgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEpTVCxcbiAgICBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLFxuICAgIFRlbXBsYXRlRW5naW5lLFxufSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuaW1wb3J0IHsgTG9hZFRlbXBsYXRlT3B0aW9ucywgbG9hZFRlbXBsYXRlU291cmNlIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuZXhwb3J0IHsgY2xlYXJUZW1wbGF0ZUNhY2hlIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDb21waWxlZFRlbXBsYXRlLFxuICAgIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVCcmlkZ2UsXG59IGZyb20gJy4vYnJpZGdlJztcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBsaXN0LlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlUeXBlTGlzdCB7XG4gICAgZW5naW5lOiBKU1Q7XG4gICAgYnJpZGdlOiBDb21waWxlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGRlZmluaXRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+aMh+WumuWtkFxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSBrZXlvZiBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IG9wdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeU9wdGlvbnM8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcz4gZXh0ZW5kcyBMb2FkVGVtcGxhdGVPcHRpb25zLCBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLCBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBgZW5naW5lYCAvICdicmlkZ2UnXG4gICAgICovXG4gICAgdHlwZT86IFQ7XG4gICAgLyoqXG4gICAgICogQGVuIHRlbXBsYXRlIGxvYWQgY2FsbGJhY2suIGBicmlkZ2VgIG1vZGUgYWxsb3dzIGxvY2FsaXphdGlvbiBoZXJlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4joqq3jgb/ovrzjgb/jgrPjg7zjg6vjg5Djg4Pjgq8uIGBicmlkZ2VgIOODouODvOODieOBp+OBr+OBk+OBk+OBp+ODreODvOOCq+ODqeOCpOOCuuOBjOWPr+iDvVxuICAgICAqL1xuICAgIGNhbGxiYWNrPzogKHNyYzogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCkgPT4gc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IFByb21pc2U8c3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudD47XG59XG5cbi8qKlxuICogQGVuIEdldCBjb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlLlxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBvyBKYXZhU2NyaXB0IOODhuODs+ODl+ODrOODvOODiOWPluW+l1xuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBUaGUgc2VsZWN0b3Igc3RyaW5nIG9mIERPTS5cbiAqICAtIGBqYWAgRE9NIOOCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFRlbXBsYXRlPFQgZXh0ZW5kcyBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSAnZW5naW5lJz4oXG4gICAgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlUXVlcnlPcHRpb25zPFQ+XG4pOiBQcm9taXNlPFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXT4ge1xuICAgIGNvbnN0IHsgdHlwZSwgdXJsLCBub0NhY2hlLCBjYWxsYmFjayB9ID0gT2JqZWN0LmFzc2lnbih7IHR5cGU6ICdlbmdpbmUnLCBub0NhY2hlOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICBsZXQgc3JjID0gYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybCwgbm9DYWNoZSB9KTtcbiAgICBpZiAoIXNyYykge1xuICAgICAgICB0aHJvdyBuZXcgVVJJRXJyb3IoYGNhbm5vdCBzcGVjaWZpZWQgdGVtcGxhdGUgcmVzb3VyY2UuIHsgc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCAgdXJsOiAke3VybH0gfWApO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBzcmMgPSBhd2FpdCBjYWxsYmFjayhzcmMpO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdlbmdpbmUnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoc3JjIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHVuZXNjYXBlSFRNTChzcmMuaW5uZXJIVE1MKSA6IHNyYywgb3B0aW9ucykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBjYXNlICdicmlkZ2UnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlQnJpZGdlLmNvbXBpbGUoc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBbdHlwZTogJHt0eXBlfV0gaXMgdW5rbm93bi5gKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5sZXQgX2N1cnJlbnRJZCA9IDA7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBsZXQgY3VycmVudDogSUhvb2tTdGF0ZSB8IG51bGw7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRDdXJyZW50ID0gKHN0YXRlOiBJSG9va1N0YXRlKTogdm9pZCA9PiB7XG4gICAgY3VycmVudCA9IHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyQ3VycmVudCA9ICgpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gbnVsbDtcbiAgICBfY3VycmVudElkID0gMDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBub3RpZnkgPSAoKTogbnVtYmVyID0+IHtcbiAgICByZXR1cm4gX2N1cnJlbnRJZCsrO1xufTtcbiIsIi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rU3ltYm9sID0gU3ltYm9sKCdob29rJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnZWZmZWN0cycpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGxheW91dEVmZmVjdHNTeW1ib2wgPSBTeW1ib2woJ2xheW91dEVmZmVjdHMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRWZmZWN0c1N5bWJvbHMgPSB0eXBlb2YgZWZmZWN0c1N5bWJvbCB8IHR5cGVvZiBsYXlvdXRFZmZlY3RzU3ltYm9sO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgeyBzZXRDdXJyZW50LCBjbGVhckN1cnJlbnQgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHtcbiAgICBob29rU3ltYm9sLFxuICAgIGVmZmVjdHNTeW1ib2wsXG4gICAgbGF5b3V0RWZmZWN0c1N5bWJvbCxcbiAgICBFZmZlY3RzU3ltYm9scyxcbn0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGludGVyZmFjZSBDYWxsYWJsZSB7XG4gICAgY2FsbDogKHN0YXRlOiBTdGF0ZSkgPT4gdm9pZDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNsYXNzIFN0YXRlPEggPSB1bmtub3duPiBpbXBsZW1lbnRzIElIb29rU3RhdGU8SD4ge1xuICAgIHVwZGF0ZTogVm9pZEZ1bmN0aW9uO1xuICAgIGhvc3Q6IEg7XG4gICAgdmlydHVhbD86IGJvb2xlYW47XG4gICAgW2hvb2tTeW1ib2xdOiBNYXA8bnVtYmVyLCBIb29rPjtcbiAgICBbZWZmZWN0c1N5bWJvbF06IENhbGxhYmxlW107XG4gICAgW2xheW91dEVmZmVjdHNTeW1ib2xdOiBDYWxsYWJsZVtdO1xuXG4gICAgY29uc3RydWN0b3IodXBkYXRlOiBWb2lkRnVuY3Rpb24sIGhvc3Q6IEgpIHtcbiAgICAgICAgdGhpcy51cGRhdGUgPSB1cGRhdGU7XG4gICAgICAgIHRoaXMuaG9zdCA9IGhvc3Q7XG4gICAgICAgIHRoaXNbaG9va1N5bWJvbF0gPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXNbZWZmZWN0c1N5bWJvbF0gPSBbXTtcbiAgICAgICAgdGhpc1tsYXlvdXRFZmZlY3RzU3ltYm9sXSA9IFtdO1xuICAgIH1cblxuICAgIHJ1bjxUPihjYjogKCkgPT4gVCk6IFQge1xuICAgICAgICBzZXRDdXJyZW50KHRoaXMpO1xuICAgICAgICBjb25zdCByZXMgPSBjYigpO1xuICAgICAgICBjbGVhckN1cnJlbnQoKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBfcnVuRWZmZWN0cyhwaGFzZTogRWZmZWN0c1N5bWJvbHMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZWZmZWN0cyA9IHRoaXNbcGhhc2VdO1xuICAgICAgICBzZXRDdXJyZW50KHRoaXMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBlZmZlY3RzKSB7XG4gICAgICAgICAgICBlZmZlY3QuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBjbGVhckN1cnJlbnQoKTtcbiAgICB9XG5cbiAgICBydW5FZmZlY3RzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9ydW5FZmZlY3RzKGVmZmVjdHNTeW1ib2wpO1xuICAgIH1cblxuICAgIHJ1bkxheW91dEVmZmVjdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3J1bkVmZmVjdHMobGF5b3V0RWZmZWN0c1N5bWJvbCk7XG4gICAgfVxuXG4gICAgdGVhcmRvd24oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGhvb2tzID0gdGhpc1tob29rU3ltYm9sXTtcbiAgICAgICAgZm9yIChjb25zdCBbLCBob29rXSBvZiBob29rcykge1xuICAgICAgICAgICAgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBob29rLnRlYXJkb3duKSAmJiBob29rLnRlYXJkb3duKCk7XG4gICAgICAgICAgICBkZWxldGUgaG9vay50ZWFyZG93bjtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgUGFydEluZm8sXG4gICAgQXN5bmNEaXJlY3RpdmUsXG4gICAgRGlyZWN0aXZlUmVzdWx0LFxuICAgIGRpcmVjdGl2ZSxcbiAgICBub0NoYW5nZSxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgbm9vcCxcbiAgICBzY2hlZHVsZXIsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBkb20gYXMgJCB9IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbmNvbnN0IHNjaGVkdWxlID0gc2NoZWR1bGVyKCk7XG5cbmludGVyZmFjZSBEaXNjb25uZWN0YWJsZSB7XG4gICAgXyRwYXJlbnQ/OiBEaXNjb25uZWN0YWJsZTtcbiAgICBwYXJlbnROb2RlOiBFbGVtZW50O1xufVxuXG5jbGFzcyBIb29rRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YXRlOiBTdGF0ZTtcbiAgICBwcml2YXRlIF9yZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uO1xuICAgIHByaXZhdGUgX2FyZ3M6IHVua25vd25bXTtcbiAgICBwcml2YXRlIF9lbE9ic2VydmVkPzogTm9kZTtcbiAgICBwcml2YXRlIF9kaXNjb25uZWN0ZWRIYW5kbGVyPzogdHlwZW9mIEhvb2tEaXJlY3RpdmUucHJvdG90eXBlLmRpc2Nvbm5lY3RlZDtcblxuICAgIGNvbnN0cnVjdG9yKHBhcnQ6IFBhcnRJbmZvKSB7XG4gICAgICAgIHN1cGVyKHBhcnQpO1xuICAgICAgICB0aGlzLl9zdGF0ZSA9IG5ldyBTdGF0ZSgoKSA9PiB0aGlzLnJlZHJhdygpLCB0aGlzKTtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSBub29wO1xuICAgICAgICB0aGlzLl9hcmdzID0gW107XG4gICAgfVxuXG4gICAgcmVuZGVyKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IERpcmVjdGl2ZVJlc3VsdCB7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVyID0gcmVuZGVyZXI7XG4gICAgICAgIHRoaXMuX2FyZ3MgPSBhcmdzO1xuICAgICAgICB0aGlzLm9ic2VydmUoZWxSb290KTtcbiAgICAgICAgdGhpcy5yZWRyYXcoKTtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBkaXNjb25uZWN0ZWQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgJiYgJC51dGlscy51bmRldGVjdGlmeSh0aGlzLl9lbE9ic2VydmVkKTtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fc3RhdGUudGVhcmRvd24oKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlZHJhdygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhdGUucnVuKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLl9yZW5kZXJlciguLi50aGlzLl9hcmdzKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VmFsdWUocik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9zdGF0ZS5ydW5MYXlvdXRFZmZlY3RzKCk7XG4gICAgICAgIHNjaGVkdWxlKCgpID0+IHRoaXMuX3N0YXRlLnJ1bkVmZmVjdHMoKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvYnNlcnZlKGVsUm9vdDogTm9kZSB8IG51bGwpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2Rpc2Nvbm5lY3RlZEhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgXyRwYXJlbnQgfSA9IHRoaXMgYXMgdW5rbm93biBhcyBEaXNjb25uZWN0YWJsZTtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCA9IF8kcGFyZW50Py5wYXJlbnROb2RlO1xuICAgICAgICBpZiAodGhpcy5fZWxPYnNlcnZlZCkge1xuICAgICAgICAgICAgJC51dGlscy5kZXRlY3RpZnkodGhpcy5fZWxPYnNlcnZlZCwgZWxSb290ISk7XG4gICAgICAgICAgICB0aGlzLl9lbE9ic2VydmVkLmFkZEV2ZW50TGlzdGVuZXIoJ2Rpc2Nvbm5lY3RlZCcsIHRoaXMuX2Rpc2Nvbm5lY3RlZEhhbmRsZXIgPSB0aGlzLmRpc2Nvbm5lY3RlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGhvb2tzV2l0aCA9IGRpcmVjdGl2ZShIb29rRGlyZWN0aXZlKTtcbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjdXJyZW50LCBub3RpZnkgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHsgaG9va1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5cbi8qKlxuICogQGVuIEJhc2UgYWJzdHJhY3QgY2xhc3MgZm9yIEN1c3RvbSBIb29rIENsYXNzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+OCr+ODqeOCueOBruWfuuW6leaKveixoeOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgSG9vazxQIGV4dGVuZHMgdW5rbm93bltdID0gdW5rbm93bltdLCBSID0gdW5rbm93biwgSCA9IHVua25vd24+IHtcbiAgICBpZDogbnVtYmVyO1xuICAgIHN0YXRlOiBJSG9va1N0YXRlPEg+O1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGU8SD4pIHtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgfVxuXG4gICAgYWJzdHJhY3QgdXBkYXRlKC4uLmFyZ3M6IFApOiBSO1xuICAgIHRlYXJkb3duPygpOiB2b2lkO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgZGVmaW5pdGlvbiBmb3IgY3VzdG9tIGhvb2tzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+OBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qVxuICovXG5leHBvcnQgdHlwZSBDdXN0b21Ib29rPFAgZXh0ZW5kcyB1bmtub3duW10gPSB1bmtub3duW10sIFIgPSB1bmtub3duLCBIID0gdW5rbm93bj4gPSBuZXcgKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlPEg+LCAuLi5hcmdzOiBQKSA9PiBIb29rPFAsIFIsIEg+O1xuXG5jb25zdCB1c2UgPSA8UCBleHRlbmRzIHVua25vd25bXSwgUiwgSCA9IHVua25vd24+KEhvb2s6IEN1c3RvbUhvb2s8UCwgUiwgSD4sIC4uLmFyZ3M6IFApOiBSID0+IHtcbiAgICBjb25zdCBpZCA9IG5vdGlmeSgpO1xuICAgIGNvbnN0IGhvb2tzID0gKGN1cnJlbnQgYXMgYW55KVtob29rU3ltYm9sXSBhcyBNYXA8bnVtYmVyLCBIb29rPjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICBsZXQgaG9vayA9IGhvb2tzLmdldChpZCkgYXMgSG9vazxQLCBSLCBIPiB8IHVuZGVmaW5lZDtcbiAgICBpZiAoIWhvb2spIHtcbiAgICAgICAgaG9vayA9IG5ldyBIb29rKGlkLCBjdXJyZW50IGFzIElIb29rU3RhdGU8SD4sIC4uLmFyZ3MpO1xuICAgICAgICBob29rcy5zZXQoaWQsIGhvb2spO1xuICAgIH1cblxuICAgIHJldHVybiBob29rLnVwZGF0ZSguLi5hcmdzKTtcbn07XG5cbi8qKlxuICogQGVuIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGN1c3RvbSBob29rcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/kvZzmiJDnlKjjg5XjgqHjgq/jg4jjg6rplqLmlbBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IElIb29rU3RhdGVDb250ZXh0LCBIb29rLCBtYWtlSG9vayB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogZXhwb3J0IGNvbnN0IHVzZU1lbW8gPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAqICAgICB2YWx1ZTogVDtcbiAqICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAqXG4gKiAgICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pIHtcbiAqICAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gKiAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICogICAgIH1cbiAqXG4gKiAgICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICogICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAqICAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gKiAgICAgICAgIH1cbiAqICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gKiAgICAgfVxuICpcbiAqICAgICBoYXNDaGFuZ2VkKHZhbHVlczogdW5rbm93bltdID0gW10pOiBib29sZWFuIHtcbiAqICAgICAgICAgcmV0dXJuIHZhbHVlcy5zb21lKCh2YWx1ZSwgaSkgPT4gdGhpcy52YWx1ZXNbaV0gIT09IHZhbHVlKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbWFrZUhvb2sgPSA8UCBleHRlbmRzIHVua25vd25bXSwgUiwgSCA9IHVua25vd24+KEhvb2s6IEN1c3RvbUhvb2s8UCwgUiwgSD4pOiAoLi4uYXJnczogUCkgPT4gUiA9PiB7XG4gICAgcmV0dXJuIHVzZS5iaW5kKG51bGwsIEhvb2spO1xufTtcbiIsImltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IE5ld0hvb2tTdGF0ZSwgSG9va1N0YXRlVXBkYXRlciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VTdGF0ZSA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICAgIGFyZ3MhOiByZWFkb25seSBbVCwgSG9va1N0YXRlVXBkYXRlcjxUPl07XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGluaXRpYWxWYWx1ZTogVCkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnVwZGF0ZXIgPSB0aGlzLnVwZGF0ZXIuYmluZCh0aGlzKTtcblxuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGluaXRpYWxWYWx1ZSkge1xuICAgICAgICAgICAgaW5pdGlhbFZhbHVlID0gaW5pdGlhbFZhbHVlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKGluaXRpYWxWYWx1ZSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKCk6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFyZ3M7XG4gICAgfVxuXG4gICAgdXBkYXRlcih2YWx1ZTogTmV3SG9va1N0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IFtwcmV2aW91c1ZhbHVlXSA9IHRoaXMuYXJncztcbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlckZuID0gdmFsdWUgYXMgKHByZXZpb3VzU3RhdGU/OiBUKSA9PiBUO1xuICAgICAgICAgICAgdmFsdWUgPSB1cGRhdGVyRm4ocHJldmlvdXNWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVlcEVxdWFsKHByZXZpb3VzVmFsdWUsIHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYWtlQXJncyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgbWFrZUFyZ3ModmFsdWU6IFQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcmdzID0gT2JqZWN0LmZyZWV6ZShbdmFsdWUsIHRoaXMudXBkYXRlcl0gYXMgY29uc3QpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cbn0pIGFzIDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgVCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBSKSA/IFIgOiBULFxuICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuXTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1mdW5jdGlvbi1yZXR1cm4tdHlwZSxcbiAqL1xuXG5pbXBvcnQgeyBkZWVwRXF1YWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSwgQ2FsbGFibGUgfSBmcm9tICcuL3N0YXRlJztcblxudHlwZSBFZmZlY3QgPSAodGhpczogU3RhdGUpID0+IHZvaWQgfCBWb2lkRnVuY3Rpb24gfCBQcm9taXNlPHZvaWQ+O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY3JlYXRlRWZmZWN0ID0gKHNldEVmZmVjdHM6IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSkgPT4gdm9pZCkgPT4ge1xuICAgIHJldHVybiBtYWtlSG9vayhjbGFzcyBleHRlbmRzIEhvb2sge1xuICAgICAgICBjYWxsYmFjayE6IEVmZmVjdDtcbiAgICAgICAgbGFzdFZhbHVlcz86IHVua25vd25bXTtcbiAgICAgICAgdmFsdWVzPzogdW5rbm93bltdO1xuICAgICAgICBfdGVhcmRvd24hOiBQcm9taXNlPHZvaWQ+IHwgVm9pZEZ1bmN0aW9uIHwgdm9pZDtcblxuICAgICAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGlnbm9yZWQxOiBFZmZlY3QsIGlnbm9yZWQyPzogdW5rbm93bltdKSB7XG4gICAgICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICAgICAgc2V0RWZmZWN0cyhzdGF0ZSwgdGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGUoY2FsbGJhY2s6IEVmZmVjdCwgdmFsdWVzPzogdW5rbm93bltdKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGwoKTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudmFsdWVzIHx8IHRoaXMuaGFzQ2hhbmdlZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubGFzdFZhbHVlcyA9IHRoaXMudmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgcnVuKCk6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy50ZWFyZG93bigpO1xuICAgICAgICAgICAgdGhpcy5fdGVhcmRvd24gPSB0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5zdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5fdGVhcmRvd24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90ZWFyZG93bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaGFzQ2hhbmdlZCgpOiBib29sZWFuIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5sYXN0VmFsdWVzIHx8IHRoaXMudmFsdWVzIS5zb21lKCh2YWx1ZSwgaSkgPT4gIWRlZXBFcXVhbCh0aGlzLmxhc3RWYWx1ZXMhW2ldLCB2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBTdGF0ZSwgQ2FsbGFibGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IGVmZmVjdHNTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0IHsgY3JlYXRlRWZmZWN0IH0gZnJvbSAnLi9jcmVhdGUtZWZmZWN0JztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHNldEVmZmVjdHMgPSAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpOiB2b2lkID0+IHtcbiAgICBzdGF0ZVtlZmZlY3RzU3ltYm9sXS5wdXNoKGNiKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VFZmZlY3QgPSBjcmVhdGVFZmZlY3Qoc2V0RWZmZWN0cyk7XG4iLCJpbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgbGF5b3V0RWZmZWN0c1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQgeyBjcmVhdGVFZmZlY3QgfSBmcm9tICcuL2NyZWF0ZS1lZmZlY3QnO1xuXG5jb25zdCBzZXRMYXlvdXRFZmZlY3RzID0gKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKTogdm9pZCA9PiB7XG4gICAgc3RhdGVbbGF5b3V0RWZmZWN0c1N5bWJvbF0ucHVzaChjYik7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlTGF5b3V0RWZmZWN0ID0gY3JlYXRlRWZmZWN0KHNldExheW91dEVmZmVjdHMpO1xuIiwiaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlTWVtbyA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICAgIHZhbHVlOiBUO1xuICAgIHZhbHVlczogdW5rbm93bltdO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pIHtcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIHVwZGF0ZShmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pOiBUIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzQ2hhbmdlZCh2YWx1ZXMpKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgIH1cblxuICAgIGhhc0NoYW5nZWQodmFsdWVzOiB1bmtub3duW10gPSBbXSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbHVlLCBpKSA9PiB0aGlzLnZhbHVlc1tpXSAhPT0gdmFsdWUpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgdXNlTWVtbyB9IGZyb20gJy4vdXNlLW1lbW8nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlUmVmOiA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB7IGN1cnJlbnQ6IFQ7IH0gPSA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB1c2VNZW1vKCgpID0+ICh7XG4gICAgY3VycmVudDogaW5pdGlhbFZhbHVlXG59KSwgW10pO1xuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdXNlTWVtbyB9IGZyb20gJy4vdXNlLW1lbW8nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlQ2FsbGJhY2s6IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IFRcbiAgICA9IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IHVzZU1lbW8oKCkgPT4gZm4sIGlucHV0cyk7XG4iLCJpbXBvcnQgdHlwZSB7IEhvb2tSZWR1Y2VyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VSZWR1Y2VyID0gbWFrZUhvb2soY2xhc3MgPFMsIEksIEE+IGV4dGVuZHMgSG9vayB7XG4gICAgcmVkdWNlciE6IEhvb2tSZWR1Y2VyPFMsIEE+O1xuICAgIGN1cnJlbnRTdGF0ZTogUztcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgXzogSG9va1JlZHVjZXI8UywgQT4sIGluaXRpYWxTdGF0ZTogSSwgaW5pdD86IChfOiBJKSA9PiBTKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSB0aGlzLmRpc3BhdGNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gdW5kZWZpbmVkICE9PSBpbml0ID8gaW5pdChpbml0aWFsU3RhdGUpIDogaW5pdGlhbFN0YXRlIGFzIHVua25vd24gYXMgUztcbiAgICB9XG5cbiAgICB1cGRhdGUocmVkdWNlcjogSG9va1JlZHVjZXI8UywgQT4pOiByZWFkb25seSBbUywgKGFjdGlvbjogQSkgPT4gdm9pZF0ge1xuICAgICAgICB0aGlzLnJlZHVjZXIgPSByZWR1Y2VyO1xuICAgICAgICByZXR1cm4gW3RoaXMuY3VycmVudFN0YXRlLCB0aGlzLmRpc3BhdGNoXTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICB9XG5cbiAgICBkaXNwYXRjaChhY3Rpb246IEEpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSB0aGlzLnJlZHVjZXIodGhpcy5jdXJyZW50U3RhdGUsIGFjdGlvbik7XG4gICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgeyBEaXJlY3RpdmVSZXN1bHQsIG5vQ2hhbmdlIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElIb29rQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmNsYXNzIEhvb2tDb250ZXh0PFQ+IGltcGxlbWVudHMgSUhvb2tDb250ZXh0PFQ+IHtcbiAgICByZWFkb25seSBkZWZhdWx0VmFsdWU6IFQgfCB1bmRlZmluZWQ7XG4gICAgcHJpdmF0ZSBfdmFsdWU6IFQ7XG5cbiAgICBjb25zdHJ1Y3RvcihkZWZhdWx0VmFsdWU/OiBUKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZSA9IHRoaXMucHJvdmlkZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmNvbnN1bWUgPSB0aGlzLmNvbnN1bWUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWUgPSBkZWZhdWx0VmFsdWU7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gZGVmYXVsdFZhbHVlIGFzIFQ7XG4gICAgfVxuXG4gICAgcHJvdmlkZSh2YWx1ZTogVCwgY2FsbGJhY2s/OiAodmFsdWU6IFQpID0+IERpcmVjdGl2ZVJlc3VsdCk6IERpcmVjdGl2ZVJlc3VsdCB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKGNhbGxiYWNrKSA/IGNhbGxiYWNrKHZhbHVlKSA6IG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIGNvbnN1bWUoY2FsbGJhY2s6ICh2YWx1ZTogVCkgPT4gRGlyZWN0aXZlUmVzdWx0IHwgdm9pZCk6IERpcmVjdGl2ZVJlc3VsdCB8IHZvaWQge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sodGhpcy5fdmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUNvbnRleHQgPSA8VD4oZGVmYXVsdFZhbHVlPzogVCk6IElIb29rQ29udGV4dDxUPiA9PiB7XG4gICAgcmV0dXJuIG5ldyBIb29rQ29udGV4dChkZWZhdWx0VmFsdWUpO1xufTtcbiIsImltcG9ydCB0eXBlIHsgSUhvb2tDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IHNldEVmZmVjdHMgfSBmcm9tICcuL3VzZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlQ29udGV4dCA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2s8W0lIb29rQ29udGV4dDxUPl0sIFQsIHVua25vd24+IHtcbiAgICBwcml2YXRlIF9yYW5FZmZlY3Q6IGJvb2xlYW47XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIF86IElIb29rQ29udGV4dDxUPikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLl9yYW5FZmZlY3QgPSBmYWxzZTtcbiAgICAgICAgc2V0RWZmZWN0cyhzdGF0ZSwgdGhpcyk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGNvbnRleHQ6IElIb29rQ29udGV4dDxUPik6IFQge1xuICAgICAgICBsZXQgcmV0dmFsITogVDtcbiAgICAgICAgY29udGV4dC5jb25zdW1lKHZhbHVlID0+IHsgcmV0dmFsID0gdmFsdWU7IH0pO1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cblxuICAgIGNhbGwoKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5fcmFuRWZmZWN0KSB7XG4gICAgICAgICAgICB0aGlzLl9yYW5FZmZlY3QgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIEhvb2tTdGF0ZVVwZGF0ZXIsXG4gICAgSG9va1JlZHVjZXIsXG4gICAgSUhvb2tDb250ZXh0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaG9va3NXaXRoIH0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICcuL3VzZS1zdGF0ZSc7XG5pbXBvcnQgeyB1c2VFZmZlY3QgfSBmcm9tICcuL3VzZS1lZmZlY3QnO1xuaW1wb3J0IHsgdXNlTGF5b3V0RWZmZWN0IH0gZnJvbSAnLi91c2UtbGF5b3V0LWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5pbXBvcnQgeyB1c2VSZWYgfSBmcm9tICcuL3VzZS1yZWYnO1xuaW1wb3J0IHsgdXNlQ2FsbGJhY2sgfSBmcm9tICcuL3VzZS1jYWxsYmFjayc7XG5pbXBvcnQgeyB1c2VSZWR1Y2VyIH0gZnJvbSAnLi91c2UtcmVkdWNlcic7XG5pbXBvcnQgeyBjcmVhdGVDb250ZXh0IH0gZnJvbSAnLi9jcmVhdGUtY29udGV4dCc7XG5pbXBvcnQgeyB1c2VDb250ZXh0IH0gZnJvbSAnLi91c2UtY29udGV4dCc7XG5leHBvcnQgKiBmcm9tICcuL2ludGVyZmFjZXMnO1xuZXhwb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuXG4vKipcbiAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IHBhcml0eSB3aXRoIHRoZSBSZWFjdCBob29rcyBjb25jZXB0LlxuICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+m1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAqXG4gKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAqICAgICBjb25zdCBbY291bnQsIHNldENvdW50XSA9IHVzZVN0YXRlKDApO1xuICogICAgIHJldHVybiBodG1sYFxuICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAqICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInN0YXRlLXBsdXNcIiBAY2xpY2s9JHsoKSA9PiBzZXRDb3VudChwcmV2Q291bnQgPT4gcHJldkNvdW50ISArIDEpfT7inpU8L2J1dHRvbj5cbiAqICAgICBgO1xuICogfVxuICpcbiAqIC8vIHJlbmRlciB3aXRoIGhvb2tzXG4gKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rcyB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuIDxicj5cbiAgICAgKiAgICAgQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguXG4gICAgICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+myA8YnI+XG4gICAgICogICAgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqBcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gICAgICogY29uc3QgeyB1c2VTdGF0ZSB9ID0gaG9va3M7XG4gICAgICpcbiAgICAgKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAgICAgKiBmdW5jdGlvbiBBcHAoKSB7XG4gICAgICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gICAgICogICAgIHJldHVybiBodG1sYFxuICAgICAqICAgICAgICAgPHA+Q291bnQ6ICR7IGNvdW50IH08L3A+XG4gICAgICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICAgICAqICAgICBgO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzXG4gICAgICogcmVuZGVyKGhvb2tzKEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlbmRlcmVyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHJldHVybnMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44KS6L+U5Y2044GZ44KL6Zai5pWw44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIEFyZ3VtZW50cyBwYXNzZWQgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBq+OCj+OBn+OCi+W8leaVsFxuICAgICAqL1xuICAgIChyZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBIb29rcyBmZWF0dXJlIHRvIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4LiAoc3BlY2lmeSBhIERPTSBkaXNjb25uZWN0IGRldGVjdGlvbiBlbGVtZW50KVxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgasgSG9va3Mg5qmf6IO944KS5LuY5YqgIChET00g5YiH5pat5qSc55+l6KaB57Sg44KS5oyH5a6aKVxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzb21lLXBhZ2UnKTtcbiAgICAgKiAvLyBlbmFibGluZyBob29rcyB3aXRoIHJvb3QgZWxlbWVudFxuICAgICAqIHJlbmRlcihob29rcy53aXRoKGVsLCBBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFJvb3RcbiAgICAgKiAgLSBgZW5gIFJvb3QgZWxlbWVudCB1c2VkIGZvciBET00gZGlzY29ubmVjdGlvbiBkZXRlY3Rpb24uIElmIGBudWxsYCBwYXNzZWQsIGBkb2N1bWVudGAgaXMgc3BlY2lmaWVkXG4gICAgICogIC0gYGphYCBET00g5YiH5pat5qSc55+l44Gr5L2/55So44GZ44KL44Or44O844OI6KaB57SgLiBgbnVsbGAg44GM5rih44KL44GoIGBkb2N1bWVudGAg44GM5oyH5a6a44GV44KM44KLXG4gICAgICogQHBhcmFtIHJlbmRlcmVyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHJldHVybnMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44KS6L+U5Y2044GZ44KL6Zai5pWw44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIEFyZ3VtZW50cyBwYXNzZWQgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBq+OCj+OBn+OCi+W8leaVsFxuICAgICAqL1xuICAgIHdpdGg6IChlbFJvb3Q6IE5vZGUgfCBudWxsLCByZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgc3RhdGVmdWwgdmFsdWUgYW5kIGEgZnVuY3Rpb24gdG8gdXBkYXRlIGl0LlxuICAgICAqIEBqYSDjgrnjg4bjg7zjg4jjg5Xjg6vjgarlgKTjgajjgIHjgZ3jgozjgpLmm7TmlrDjgZnjgovjgZ/jgoHjga7plqLmlbDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbml0aWFsU3RhdGVcbiAgICAgKiAgLSBgZW5gIFRoZSB2YWx1ZSB5b3Ugd2FudCB0aGUgc3RhdGUgdG8gYmUgaW5pdGlhbGx5LlxuICAgICAqICAtIGBqYWAg54q25oWL44Gu5Yid5pyf5YyW5YCkXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHVybnMgYW4gYXJyYXkgd2l0aCBleGFjdGx5IHR3byB2YWx1ZXMuIFtgY3VycmVudFN0YXRlYCwgYHVwZGF0ZUZ1bmN0aW9uYF1cbiAgICAgKiAgLSBgamFgIDLjgaTjga7lgKTjgpLmjIHjgaTphY3liJfjgpLov5TljbQgW2BjdXJyZW50U3RhdGVgLCBgdXBkYXRlRnVuY3Rpb25gXVxuICAgICAqL1xuICAgIHVzZVN0YXRlOiA8VD4oaW5pdGlhbFN0YXRlPzogVCkgPT4gcmVhZG9ubHkgW1xuICAgICAgICBUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFIpID8gUiA6IFQsXG4gICAgICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuICAgIF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXB0cyBhIGZ1bmN0aW9uIHRoYXQgY29udGFpbnMgaW1wZXJhdGl2ZSwgcG9zc2libHkgZWZmZWN0ZnVsIGNvZGUuXG4gICAgICogQGphIOWJr+S9nOeUqOOCkuacieOBmeOCi+WPr+iDveaAp+OBruOBguOCi+WRveS7pOWei+OBruOCs+ODvOODieOBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIGVmZmVjdFxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBydW5zIGVhY2ggdGltZSBkZXBlbmRlbmNpZXMgY2hhbmdlXG4gICAgICogIC0gYGphYCDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgovjgZ/jgbPjgavlrp/ooYzjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzXG4gICAgICogIC0gYGVuYCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byB0aGUgZWZmZWN0XG4gICAgICogIC0gYGphYCDlia/kvZznlKjnmbrngavjga7jg4jjg6rjgqzjg7zjgajjgarjgovkvp3lrZjplqLkv4Ljga7jg6rjgrnjg4hcbiAgICAgKi9cbiAgICB1c2VFZmZlY3Q6IChlZmZlY3Q6ICgpID0+IHZvaWQsIGRlcGVuZGVuY2llcz86IHVua25vd25bXSkgPT4gdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBjb250YWlucyBpbXBlcmF0aXZlLCBwb3NzaWJseSBlZmZlY3RmdWwgY29kZS4gPGJyPlxuICAgICAqICAgICBVbmxpa2Uge0BsaW5rIEhvb2tzLnVzZUVmZmVjdH0gLCBpdCBpcyBleGVjdXRlZCBiZWZvcmUgdGhlIGNvbXBvbmVudCBpcyByZW5kZXJlZCBhbmQgdGhlIG5ldyBlbGVtZW50IGlzIGRpc3BsYXllZCBvbiB0aGUgc2NyZWVuLlxuICAgICAqIEBqYSDlia/kvZznlKjjgpLmnInjgZnjgovlj6/og73mgKfjga7jgYLjgovlkb3ku6Tlnovjga7jgrPjg7zjg4njga7pgannlKggPGJyPlxuICAgICAqICAgICB7QGxpbmsgSG9va3MudXNlRWZmZWN0fSDjgajnlbDjgarjgoosIOOCs+ODs+ODneODvOODjeODs+ODiOOBjOODrOODs+ODgOODquODs+OCsOOBleOCjOOBpuaWsOOBl+OBhOimgee0oOOBjOeUu+mdouOBq+ihqOekuuOBleOCjOOCi+WJjeOBq+Wun+ihjOOBleOCjOOCi+OAglxuICAgICAqXG4gICAgICogQHBhcmFtIGVmZmVjdFxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBydW5zIGVhY2ggdGltZSBkZXBlbmRlbmNpZXMgY2hhbmdlXG4gICAgICogIC0gYGphYCDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgovjgZ/jgbPjgavlrp/ooYzjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzXG4gICAgICogIC0gYGVuYCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byB0aGUgZWZmZWN0XG4gICAgICogIC0gYGphYCDlia/kvZznlKjnmbrngavjga7jg4jjg6rjgqzjg7zjgajjgarjgovkvp3lrZjplqLkv4Ljga7jg6rjgrnjg4hcbiAgICAgKi9cbiAgICB1c2VMYXlvdXRFZmZlY3Q6IChlZmZlY3Q6ICgpID0+IHZvaWQsIGRlcGVuZGVuY2llcz86IHVua25vd25bXSkgPT4gdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVc2VkIHRvIHJlZHVjZSBjb21wb25lbnQgcmUtcmVuZGVyaW5nLiA8YnI+XG4gICAgICogICAgIENhY2hlIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gdGhlIGNhY2hlZCB2YWx1ZSB3aGVuIGNhbGxlZCB3aXRoIHRoZSBzYW1lIGFyZ3VtZW50cy5cbiAgICAgKiBAamEg44Kz44Oz44Od44O844ON44Oz44OI44Gu5YaN44Os44Oz44OA44Oq44Oz44Kw44KS5oqR44GI44KL44Gf44KB44Gr5L2/55SoIDxicj5cbiAgICAgKiAgICAg6Zai5pWw44Gu5oi744KK5YCk44KS44Kt44Oj44OD44K344Ol44GX44CB5ZCM44GY5byV5pWw44Gn5ZG844Gz5Ye644GV44KM44Gf5aC05ZCI44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gf5YCk44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWApOOCkui/lOOBmemWouaVsFxuICAgICAqIEBwYXJhbSB2YWx1ZXNcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5IG9mIHZhbHVlcyB0aGF0IGFyZSB1c2VkIGFzIGFyZ3VtZW50cyBmb3IgYGZuYFxuICAgICAqICAtIGBqYWAgYGZuYCDjga7lvJXmlbDjgajjgZfjgabkvb/nlKjjgZXjgozjgovlgKTjga7phY3liJdcbiAgICAgKi9cbiAgICB1c2VNZW1vOiA8VD4oZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKSA9PiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIExldHMgeW91IHJlZmVyZW5jZSBhIHZhbHVlIHRoYXTigJlzIG5vdCBuZWVkZWQgZm9yIHJlbmRlcmluZy4gPGJyPlxuICAgICAqICAgICBNYWlubHkgYXZhaWxhYmxlIGZvciBhY2Nlc3NpbmcgRE9NIG5vZGVzLlxuICAgICAqIEBqYSDjg6zjg7Pjg4Djg6rjg7PjgrDjgavkuI3opoHjgarlgKTjgpLlj4Lnhaflj6/og73jgavjgZnjgos8YnI+XG4gICAgICogICAgIOS4u+OBqyBET00g44OO44O844OJ44G444Gu44Ki44Kv44K744K544Gr5Yip55So5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFZhbHVlXG4gICAgICogIC0gYGVuYCBUaGUgaW5pdGlhbCB2YWx1ZSBvZiB0aGUgcmVmZXJlbmNlXG4gICAgICogIC0gYGphYCDlj4Lnhafjga7liJ3mnJ/lgKRcbiAgICAgKi9cbiAgICB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGEgbWVtb2l6ZWQgdmVyc2lvbiBvZiB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBvbmx5IGNoYW5nZXMgaWYgdGhlIGRlcGVuZGVuY2llcyBjaGFuZ2UuIDxicj5cbiAgICAgKiAgICAgVXNlZnVsIGZvciBwYXNzaW5nIGNhbGxiYWNrcyB0byBvcHRpbWl6ZWQgY2hpbGQgY29tcG9uZW50cyB0aGF0IHJlbHkgb24gcmVmZXJlbnRpYWwgZXF1YWxpdHkuXG4gICAgICogQGphIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOBn+WgtOWQiOOBq+OBruOBv+WkieabtOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBruODoeODouWMluODkOODvOOCuOODp+ODs+OCkui/lOWNtCA8YnI+XG4gICAgICogICAgIOWPgueFp+etieS+oeaAp+OBq+S+neWtmOOBmeOCi+acgOmBqeWMluOBleOCjOOBn+WtkOOCs+ODs+ODneODvOODjeODs+ODiOOBq+OCs+ODvOODq+ODkOODg+OCr+OCkua4oeOBmeWgtOWQiOOBq+W9ueeri+OBpFxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogIC0gYGVuYCBUaGUgZnVuY3Rpb24gdG8gbWVtb2l6ZVxuICAgICAqICAtIGBqYWAg44Oh44Oi5YyW44GZ44KL6Zai5pWwXG4gICAgICogQHBhcmFtIGlucHV0c1xuICAgICAqICAtIGBlbmAgQW4gYXJyYXkgb2YgaW5wdXRzIHRvIHdhdGNoIGZvciBjaGFuZ2VzXG4gICAgICogIC0gYGphYCDlpInmm7TjgpLnm6PoppbjgZnjgovlhaXlipvjga7phY3liJdcbiAgICAgKi9cbiAgICB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBIb29rIEFQSSBmb3IgbWFuYWdpbmcgc3RhdGUgaW4gZnVuY3Rpb24gY29tcG9uZW50cy5cbiAgICAgKiBAamEg6Zai5pWw44Kz44Oz44Od44O844ON44Oz44OI44Gn54q25oWL44KS566h55CG44GZ44KL44Gf44KB44GuIEhvb2sgQVBJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVkdWNlclxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZCBhbiBhY3Rpb24gYW5kIHJldHVybnMgYSBuZXcgc3RhdGVcbiAgICAgKiAgLSBgamFgIOePvuWcqOOBrueKtuaFi+OBqOOCouOCr+OCt+ODp+ODs+OCkuWPl+OBkeWPluOCiuOAgeaWsOOBl+OBhOeKtuaFi+OCkui/lOOBmemWouaVsFxuICAgICAqIEBwYXJhbSBpbml0aWFsU3RhdGVcbiAgICAgKiAgLSBgZW5gIFRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y2VyXG4gICAgICogIC0gYGphYCDjg6rjg4fjg6Xjg7zjgrXjg7zjga7liJ3mnJ/nirbmhYvjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gaW5pdFxuICAgICAqICAtIGBlbmAgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y2VyXG4gICAgICogIC0gYGphYCDjg6rjg4fjg6Xjg7zjgrXjg7zjga7liJ3mnJ/nirbmhYvjgpLov5TjgZnjgqrjg5fjgrfjg6fjg7Pjga7plqLmlbBcbiAgICAgKi9cbiAgICB1c2VSZWR1Y2VyOiA8UywgSSwgQT4ocmVkdWNlcjogSG9va1JlZHVjZXI8UywgQT4sIGluaXRpYWxTdGF0ZTogSSwgaW5pdD86ICgoXzogSSkgPT4gUykpID0+IHJlYWRvbmx5IFtTLCAoYWN0aW9uOiBBKSA9PiB2b2lkXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgY29udGV4dCBvYmplY3QuIENvbnRleHQgb2JqZWN0cyBhcmUgdXNlZCB0byBzaGFyZSBkYXRhIHRoYXQgaXMgY29uc2lkZXJlZCBcImdsb2JhbFwiLlxuICAgICAqIEBqYSDmlrDjgZfjgYTjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjgpLkvZzmiJDjgZnjgovjgILjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjga8s44CM44Kw44Ot44O844OQ44Or44CN44Go6ICD44GI44KJ44KM44KL44OH44O844K/44KS5YWx5pyJ44GZ44KL44Gf44KB44Gr5L2/55So44GV44KM44KL44CCXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVmYXVsdFZhbHVlXG4gICAgICogIC0gYGVuYDogVGhlIGRlZmF1bHQgdmFsdWUgZm9yIHRoZSBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWA6IOOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBruODh+ODleOCqeODq+ODiOWApFxuICAgICAqL1xuICAgIGNyZWF0ZUNvbnRleHQ6IDxUPihkZWZhdWx0VmFsdWU/OiBUKSA9PiBJSG9va0NvbnRleHQ8VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCBjb250ZXh0IHZhbHVlIGZvciB0aGUgc3BlY2lmaWVkIGNvbnRleHQgb2JqZWN0LlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjgavlr77jgZnjgovnj77lnKjjga7jgrPjg7Pjg4bjgq3jgrnjg4jlgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYDogdGhlIGNvbnRleHQgb2JqZWN0IHJldHVybmVkIGZyb20ge0BsaW5rIEhvb2tzLmNyZWF0ZUNvbnRleHR9XG4gICAgICogIC0gYGphYDoge0BsaW5rIEhvb2tzLmNyZWF0ZUNvbnRleHR9IOOBi+OCiei/lOOBleOCjOOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHVzZUNvbnRleHQ6IDxUPihjb250ZXh0OiBJSG9va0NvbnRleHQ8VD4pID0+IFQ7XG59XG5cbmNvbnN0IGhvb2tzOiBIb29rcyA9IGhvb2tzV2l0aC5iaW5kKG51bGwsIG51bGwpO1xuaG9va3Mud2l0aCAgICAgICAgICAgID0gaG9va3NXaXRoO1xuaG9va3MudXNlU3RhdGUgICAgICAgID0gdXNlU3RhdGU7XG5ob29rcy51c2VFZmZlY3QgICAgICAgPSB1c2VFZmZlY3Q7XG5ob29rcy51c2VMYXlvdXRFZmZlY3QgPSB1c2VMYXlvdXRFZmZlY3Q7XG5ob29rcy51c2VNZW1vICAgICAgICAgPSB1c2VNZW1vO1xuaG9va3MudXNlUmVmICAgICAgICAgID0gdXNlUmVmO1xuaG9va3MudXNlQ2FsbGJhY2sgICAgID0gdXNlQ2FsbGJhY2s7XG5ob29rcy51c2VSZWR1Y2VyICAgICAgPSB1c2VSZWR1Y2VyO1xuaG9va3MuY3JlYXRlQ29udGV4dCAgID0gY3JlYXRlQ29udGV4dDtcbmhvb2tzLnVzZUNvbnRleHQgICAgICA9IHVzZUNvbnRleHQ7XG5cbmV4cG9ydCB7IGhvb2tzIH07XG4iXSwibmFtZXMiOlsiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBYUE7QUFDQSxNQUFNLFNBQVMsR0FBd0M7SUFDbkQsUUFBUSxFQUFFLHlCQUF5QixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFD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