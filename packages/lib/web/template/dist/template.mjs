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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUubWpzIiwic291cmNlcyI6WyJicmlkZ2UudHMiLCJsb2FkZXIudHMiLCJob29rcy9jdXJyZW50LnRzIiwiaG9va3Mvc3ltYm9scy50cyIsImhvb2tzL3N0YXRlLnRzIiwiaG9va3MvZGlyZWN0aXZlLnRzIiwiaG9va3MvaG9vay50cyIsImhvb2tzL3VzZS1zdGF0ZS50cyIsImhvb2tzL2NyZWF0ZS1lZmZlY3QudHMiLCJob29rcy91c2UtZWZmZWN0LnRzIiwiaG9va3MvdXNlLWxheW91dC1lZmZlY3QudHMiLCJob29rcy91c2UtbWVtby50cyIsImhvb2tzL3VzZS1yZWYudHMiLCJob29rcy91c2UtY2FsbGJhY2sudHMiLCJob29rcy91c2UtcmVkdWNlci50cyIsImhvb2tzL2NyZWF0ZS1jb250ZXh0LnRzIiwiaG9va3MvdXNlLWNvbnRleHQudHMiLCJob29rcy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIGh0bWwsXG4gICAgZGlyZWN0aXZlcyxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlJztcbmltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCBidWlsdGluIHRyYW5zZm9ybWVycyAoZGVmYXVsdDogbXVzdGFjaGUpLiAqL1xuY29uc3QgX2J1aWx0aW5zOiBSZWNvcmQ8c3RyaW5nLCBUZW1wbGF0ZVRyYW5zZm9ybWVyPiA9IHtcbiAgICBtdXN0YWNoZTogY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihodG1sLCBkaXJlY3RpdmVzLnVuc2FmZUhUTUwpLFxuICAgIHN0YW1waW5vOiBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyKCksXG59O1xuXG4vKipcbiAqIEBlbiBDb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlIGludGVyZmFjZVxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBv+ODhuODs+ODl+ODrOODvOODiOagvOe0jeOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTb3VyY2UgdGVtcGxhdGUgc3RyaW5nXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNvdXJjZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW1RlbXBsYXRlUmVzdWx0XV0gdGhhdCBhcHBsaWVkIGdpdmVuIHBhcmFtZXRlcihzKS5cbiAgICAgKiBAamEg44OR44Op44Oh44O844K/44KS6YGp55So44GXIFtbVGVtcGxhdGVSZXN1bHRdXSDjgbjlpInmj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWV3XG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBwYXJhbWV0ZXJzIGZvciBzb3VyY2UuXG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdDtcbn1cblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUJyaWRnZV1dIGNvbXBpbGUgb3B0aW9uc1xuICogQGphIFtbVGVtcGxhdGVCcmlkZ2VdXSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0cmFuc2Zvcm1lcj86IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIGJyaWRnZSBmb3Igb3RoZXIgdGVtcGxhdGUgZW5naW5lIHNvdXJjZS5cbiAqIEBqYSDku5bjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg7Pjgrjjg7Pjga7lhaXlipvjgpLlpInmj5vjgZnjgovjg4bjg7Pjg5fjg6zjg7zjg4jjg5bjg6rjg4Pjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlQnJpZGdlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgX3RyYW5zZm9ybWVyID0gX2J1aWx0aW5zLm11c3RhY2hlO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW0NvbXBpbGVkVGVtcGxhdGVdXSBmcm9tIHRlbXBsYXRlIHNvdXJjZS5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiX44GL44KJIFtbQ29tcGlsZWRUZW1wbGF0ZV1dIOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHRlbXBsYXRlXG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBzb3VyY2Ugc3RyaW5nIC8gdGVtcGxhdGUgZWxlbWVudFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXIC8g44OG44Oz44OX44Os44O844OI44Ko44Os44Oh44Oz44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbXBpbGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjb21waWxlKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyk6IENvbXBpbGVkVGVtcGxhdGUge1xuICAgICAgICBjb25zdCB7IHRyYW5zZm9ybWVyIH0gPSBPYmplY3QuYXNzaWduKHsgdHJhbnNmb3JtZXI6IFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciB9LCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgZW5naW5lID0gdHJhbnNmb3JtZXIodGVtcGxhdGUpO1xuICAgICAgICBjb25zdCBqc3QgPSAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdCA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZW5naW5lKHZpZXcpO1xuICAgICAgICB9O1xuICAgICAgICBqc3Quc291cmNlID0gdGVtcGxhdGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdGVtcGxhdGUuaW5uZXJIVE1MIDogdGVtcGxhdGU7XG4gICAgICAgIHJldHVybiBqc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBkZWZhdWx0IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg5pei5a6a44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3VHJhbnNmb3JtZXJcbiAgICAgKiAgLSBgZW5gIG5ldyB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDku6XliY3jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldFRyYW5zZm9ybWVyKG5ld1RyYW5zZm9ybWVyOiBUZW1wbGF0ZVRyYW5zZm9ybWVyKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgICAgIGNvbnN0IG9sZFRyYW5zZm9ybWVyID0gVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyO1xuICAgICAgICBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXIgPSBuZXdUcmFuc2Zvcm1lcjtcbiAgICAgICAgcmV0dXJuIG9sZFRyYW5zZm9ybWVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYnVpbHQtaW4gdHJhbnNmb3JtZXIgbmFtZSBsaXN0LlxuICAgICAqIEBqYSDntYTjgb/ovrzjgb/jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3np7DkuIDopqfjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBuYW1lIGxpc3QuXG4gICAgICogIC0gYGphYCDlkI3np7DkuIDopqfjgpLov5TljbRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IGJ1aWx0aW5zKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKF9idWlsdGlucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdCBuYW1lLlxuICAgICAqICAtIGBqYWAg5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5ZCN5YmN44KS5oyH5a6aLlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGdldEJ1aXRpblRyYW5zZm9ybWVyKG5hbWU6IHN0cmluZyk6IFRlbXBsYXRlVHJhbnNmb3JtZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX2J1aWx0aW5zW25hbWVdO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHVuZXNjYXBlSFRNTCwgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEpTVCxcbiAgICBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLFxuICAgIFRlbXBsYXRlRW5naW5lLFxufSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuaW1wb3J0IHsgTG9hZFRlbXBsYXRlT3B0aW9ucywgbG9hZFRlbXBsYXRlU291cmNlIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuZXhwb3J0IHsgY2xlYXJUZW1wbGF0ZUNhY2hlIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDb21waWxlZFRlbXBsYXRlLFxuICAgIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVCcmlkZ2UsXG59IGZyb20gJy4vYnJpZGdlJztcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBsaXN0LlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlUeXBlTGlzdCB7XG4gICAgZW5naW5lOiBKU1Q7XG4gICAgYnJpZGdlOiBDb21waWxlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGRlZmluaXRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+aMh+WumuWtkFxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSBrZXlvZiBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IG9wdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeU9wdGlvbnM8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcz4gZXh0ZW5kcyBMb2FkVGVtcGxhdGVPcHRpb25zLCBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLCBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBgZW5naW5lYCAvICdicmlkZ2UnXG4gICAgICovXG4gICAgdHlwZT86IFQ7XG4gICAgLyoqXG4gICAgICogQGVuIHRlbXBsYXRlIGxvYWQgY2FsbGJhY2suIGBicmlkZ2VgIG1vZGUgYWxsb3dzIGxvY2FsaXphdGlvbiBoZXJlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4joqq3jgb/ovrzjgb/jgrPjg7zjg6vjg5Djg4Pjgq8uIGBicmlkZ2VgIOODouODvOODieOBp+OBr+OBk+OBk+OBp+ODreODvOOCq+ODqeOCpOOCuuOBjOWPr+iDvVxuICAgICAqL1xuICAgIGNhbGxiYWNrPzogKHNyYzogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCkgPT4gc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IFByb21pc2U8c3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudD47XG59XG5cbi8qKlxuICogQGVuIEdldCBjb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlLlxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBvyBKYXZhU2NyaXB0IOODhuODs+ODl+ODrOODvOODiOWPluW+l1xuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBUaGUgc2VsZWN0b3Igc3RyaW5nIG9mIERPTS5cbiAqICAtIGBqYWAgRE9NIOOCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFRlbXBsYXRlPFQgZXh0ZW5kcyBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSAnZW5naW5lJz4oXG4gICAgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlUXVlcnlPcHRpb25zPFQ+XG4pOiBQcm9taXNlPFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXT4ge1xuICAgIGNvbnN0IHsgdHlwZSwgdXJsLCBub0NhY2hlLCBjYWxsYmFjayB9ID0gT2JqZWN0LmFzc2lnbih7IHR5cGU6ICdlbmdpbmUnLCBub0NhY2hlOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICBsZXQgc3JjID0gYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybCwgbm9DYWNoZSB9KTtcbiAgICBpZiAoIXNyYykge1xuICAgICAgICB0aHJvdyBuZXcgVVJJRXJyb3IoYGNhbm5vdCBzcGVjaWZpZWQgdGVtcGxhdGUgcmVzb3VyY2UuIHsgc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCAgdXJsOiAke3VybH0gfWApO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBzcmMgPSBhd2FpdCBjYWxsYmFjayhzcmMpO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdlbmdpbmUnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoc3JjIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHVuZXNjYXBlSFRNTChzcmMuaW5uZXJIVE1MKSA6IHNyYywgb3B0aW9ucykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBjYXNlICdicmlkZ2UnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlQnJpZGdlLmNvbXBpbGUoc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBbdHlwZTogJHt0eXBlfV0gaXMgdW5rbm93bi5gKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5sZXQgX2N1cnJlbnRJZCA9IDA7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBsZXQgY3VycmVudDogSUhvb2tTdGF0ZSB8IG51bGw7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRDdXJyZW50ID0gKHN0YXRlOiBJSG9va1N0YXRlKTogdm9pZCA9PiB7XG4gICAgY3VycmVudCA9IHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyQ3VycmVudCA9ICgpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gbnVsbDtcbiAgICBfY3VycmVudElkID0gMDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBub3RpZnkgPSAoKTogbnVtYmVyID0+IHtcbiAgICByZXR1cm4gX2N1cnJlbnRJZCsrO1xufTtcbiIsIi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rU3ltYm9sID0gU3ltYm9sKCdob29rJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnZWZmZWN0cycpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGxheW91dEVmZmVjdHNTeW1ib2wgPSBTeW1ib2woJ2xheW91dEVmZmVjdHMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRWZmZWN0c1N5bWJvbHMgPSB0eXBlb2YgZWZmZWN0c1N5bWJvbCB8IHR5cGVvZiBsYXlvdXRFZmZlY3RzU3ltYm9sO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgeyBzZXRDdXJyZW50LCBjbGVhckN1cnJlbnQgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHtcbiAgICBob29rU3ltYm9sLFxuICAgIGVmZmVjdHNTeW1ib2wsXG4gICAgbGF5b3V0RWZmZWN0c1N5bWJvbCxcbiAgICBFZmZlY3RzU3ltYm9scyxcbn0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGludGVyZmFjZSBDYWxsYWJsZSB7XG4gICAgY2FsbDogKHN0YXRlOiBTdGF0ZSkgPT4gdm9pZDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNsYXNzIFN0YXRlPEggPSB1bmtub3duPiBpbXBsZW1lbnRzIElIb29rU3RhdGU8SD4ge1xuICAgIHVwZGF0ZTogVm9pZEZ1bmN0aW9uO1xuICAgIGhvc3Q6IEg7XG4gICAgdmlydHVhbD86IGJvb2xlYW47XG4gICAgW2hvb2tTeW1ib2xdOiBNYXA8bnVtYmVyLCBIb29rPjtcbiAgICBbZWZmZWN0c1N5bWJvbF06IENhbGxhYmxlW107XG4gICAgW2xheW91dEVmZmVjdHNTeW1ib2xdOiBDYWxsYWJsZVtdO1xuXG4gICAgY29uc3RydWN0b3IodXBkYXRlOiBWb2lkRnVuY3Rpb24sIGhvc3Q6IEgpIHtcbiAgICAgICAgdGhpcy51cGRhdGUgPSB1cGRhdGU7XG4gICAgICAgIHRoaXMuaG9zdCA9IGhvc3Q7XG4gICAgICAgIHRoaXNbaG9va1N5bWJvbF0gPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXNbZWZmZWN0c1N5bWJvbF0gPSBbXTtcbiAgICAgICAgdGhpc1tsYXlvdXRFZmZlY3RzU3ltYm9sXSA9IFtdO1xuICAgIH1cblxuICAgIHJ1bjxUPihjYjogKCkgPT4gVCk6IFQge1xuICAgICAgICBzZXRDdXJyZW50KHRoaXMpO1xuICAgICAgICBjb25zdCByZXMgPSBjYigpO1xuICAgICAgICBjbGVhckN1cnJlbnQoKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBfcnVuRWZmZWN0cyhwaGFzZTogRWZmZWN0c1N5bWJvbHMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZWZmZWN0cyA9IHRoaXNbcGhhc2VdO1xuICAgICAgICBzZXRDdXJyZW50KHRoaXMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBlZmZlY3RzKSB7XG4gICAgICAgICAgICBlZmZlY3QuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBjbGVhckN1cnJlbnQoKTtcbiAgICB9XG5cbiAgICBydW5FZmZlY3RzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9ydW5FZmZlY3RzKGVmZmVjdHNTeW1ib2wpO1xuICAgIH1cblxuICAgIHJ1bkxheW91dEVmZmVjdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3J1bkVmZmVjdHMobGF5b3V0RWZmZWN0c1N5bWJvbCk7XG4gICAgfVxuXG4gICAgdGVhcmRvd24oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGhvb2tzID0gdGhpc1tob29rU3ltYm9sXTtcbiAgICAgICAgZm9yIChjb25zdCBbLCBob29rXSBvZiBob29rcykge1xuICAgICAgICAgICAgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBob29rLnRlYXJkb3duKSAmJiBob29rLnRlYXJkb3duKCk7XG4gICAgICAgICAgICBkZWxldGUgaG9vay50ZWFyZG93bjtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgUGFydEluZm8sXG4gICAgQXN5bmNEaXJlY3RpdmUsXG4gICAgRGlyZWN0aXZlUmVzdWx0LFxuICAgIGRpcmVjdGl2ZSxcbiAgICBub0NoYW5nZSxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgbm9vcCxcbiAgICBzY2hlZHVsZXIsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBkb20gYXMgJCB9IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbmNvbnN0IHNjaGVkdWxlID0gc2NoZWR1bGVyKCk7XG5cbmludGVyZmFjZSBEaXNjb25uZWN0YWJsZSB7XG4gICAgXyRwYXJlbnQ/OiBEaXNjb25uZWN0YWJsZTtcbiAgICBwYXJlbnROb2RlOiBFbGVtZW50O1xufVxuXG5jbGFzcyBIb29rRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YXRlOiBTdGF0ZTtcbiAgICBwcml2YXRlIF9yZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uO1xuICAgIHByaXZhdGUgX2FyZ3M6IHVua25vd25bXTtcbiAgICBwcml2YXRlIF9lbE9ic2VydmVkPzogTm9kZTtcbiAgICBwcml2YXRlIF9kaXNjb25uZWN0ZWRIYW5kbGVyPzogdHlwZW9mIEhvb2tEaXJlY3RpdmUucHJvdG90eXBlLmRpc2Nvbm5lY3RlZDtcblxuICAgIGNvbnN0cnVjdG9yKHBhcnQ6IFBhcnRJbmZvKSB7XG4gICAgICAgIHN1cGVyKHBhcnQpO1xuICAgICAgICB0aGlzLl9zdGF0ZSA9IG5ldyBTdGF0ZSgoKSA9PiB0aGlzLnJlZHJhdygpLCB0aGlzKTtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSBub29wO1xuICAgICAgICB0aGlzLl9hcmdzID0gW107XG4gICAgfVxuXG4gICAgcmVuZGVyKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IERpcmVjdGl2ZVJlc3VsdCB7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVyID0gcmVuZGVyZXI7XG4gICAgICAgIHRoaXMuX2FyZ3MgPSBhcmdzO1xuICAgICAgICB0aGlzLm9ic2VydmUoZWxSb290KTtcbiAgICAgICAgdGhpcy5yZWRyYXcoKTtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBkaXNjb25uZWN0ZWQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgJiYgJC51dGlscy51bmRldGVjdGlmeSh0aGlzLl9lbE9ic2VydmVkKTtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fc3RhdGUudGVhcmRvd24oKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlZHJhdygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhdGUucnVuKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLl9yZW5kZXJlciguLi50aGlzLl9hcmdzKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VmFsdWUocik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9zdGF0ZS5ydW5MYXlvdXRFZmZlY3RzKCk7XG4gICAgICAgIHNjaGVkdWxlKCgpID0+IHRoaXMuX3N0YXRlLnJ1bkVmZmVjdHMoKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvYnNlcnZlKGVsUm9vdDogTm9kZSB8IG51bGwpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2Rpc2Nvbm5lY3RlZEhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgXyRwYXJlbnQgfSA9IHRoaXMgYXMgdW5rbm93biBhcyBEaXNjb25uZWN0YWJsZTtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCA9IF8kcGFyZW50Py5wYXJlbnROb2RlO1xuICAgICAgICBpZiAodGhpcy5fZWxPYnNlcnZlZCkge1xuICAgICAgICAgICAgJC51dGlscy5kZXRlY3RpZnkodGhpcy5fZWxPYnNlcnZlZCwgZWxSb290IGFzIE5vZGUpO1xuICAgICAgICAgICAgdGhpcy5fZWxPYnNlcnZlZC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCB0aGlzLl9kaXNjb25uZWN0ZWRIYW5kbGVyID0gdGhpcy5kaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rc1dpdGggPSBkaXJlY3RpdmUoSG9va0RpcmVjdGl2ZSk7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY3VycmVudCwgbm90aWZ5IH0gZnJvbSAnLi9jdXJyZW50JztcbmltcG9ydCB7IGhvb2tTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKipcbiAqIEBlbiBCYXNlIGFic3RyYWN0IGNsYXNzIGZvciBDdXN0b20gSG9vayBDbGFzcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/jgq/jg6njgrnjga7ln7rlupXmir3osaHjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEhvb2s8UCBleHRlbmRzIHVua25vd25bXSA9IHVua25vd25bXSwgUiA9IHVua25vd24sIEggPSB1bmtub3duPiB7XG4gICAgaWQ6IG51bWJlcjtcbiAgICBzdGF0ZTogSUhvb2tTdGF0ZTxIPjtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlPEg+KSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgIH1cblxuICAgIGFic3RyYWN0IHVwZGF0ZSguLi5hcmdzOiBQKTogUjtcbiAgICB0ZWFyZG93bj8oKTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGRlZmluaXRpb24gZm9yIGN1c3RvbSBob29rcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/jga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDdXN0b21Ib29rPFAgZXh0ZW5kcyB1bmtub3duW10gPSB1bmtub3duW10sIFIgPSB1bmtub3duLCBIID0gdW5rbm93bj4ge1xuICAgIG5ldyAoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGU8SD4sIC4uLmFyZ3M6IFApOiBIb29rPFAsIFIsIEg+O1xufVxuXG5jb25zdCB1c2UgPSA8UCBleHRlbmRzIHVua25vd25bXSwgUiwgSCA9IHVua25vd24+KEhvb2s6IEN1c3RvbUhvb2s8UCwgUiwgSD4sIC4uLmFyZ3M6IFApOiBSID0+IHtcbiAgICBjb25zdCBpZCA9IG5vdGlmeSgpO1xuICAgIGNvbnN0IGhvb2tzID0gKGN1cnJlbnQgYXMgYW55KVtob29rU3ltYm9sXSBhcyBNYXA8bnVtYmVyLCBIb29rPjsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG5cbiAgICBsZXQgaG9vayA9IGhvb2tzLmdldChpZCkgYXMgSG9vazxQLCBSLCBIPiB8IHVuZGVmaW5lZDtcbiAgICBpZiAoIWhvb2spIHtcbiAgICAgICAgaG9vayA9IG5ldyBIb29rKGlkLCBjdXJyZW50IGFzIElIb29rU3RhdGU8SD4sIC4uLmFyZ3MpO1xuICAgICAgICBob29rcy5zZXQoaWQsIGhvb2spO1xuICAgIH1cblxuICAgIHJldHVybiBob29rLnVwZGF0ZSguLi5hcmdzKTtcbn07XG5cbi8qKlxuICogQGVuIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGN1c3RvbSBob29rcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/kvZzmiJDnlKjjg5XjgqHjgq/jg4jjg6rplqLmlbBcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IElIb29rU3RhdGVDb250ZXh0LCBIb29rLCBtYWtlSG9vayB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKlxuICogZXhwb3J0IGNvbnN0IHVzZU1lbW8gPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAqICAgICB2YWx1ZTogVDtcbiAqICAgICB2YWx1ZXM6IHVua25vd25bXTtcbiAqXG4gKiAgICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pIHtcbiAqICAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gKiAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICogICAgIH1cbiAqXG4gKiAgICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICogICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAqICAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gKiAgICAgICAgIH1cbiAqICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gKiAgICAgfVxuICpcbiAqICAgICBoYXNDaGFuZ2VkKHZhbHVlczogdW5rbm93bltdID0gW10pOiBib29sZWFuIHtcbiAqICAgICAgICAgcmV0dXJuIHZhbHVlcy5zb21lKCh2YWx1ZSwgaSkgPT4gdGhpcy52YWx1ZXNbaV0gIT09IHZhbHVlKTtcbiAqICAgICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbWFrZUhvb2sgPSA8UCBleHRlbmRzIHVua25vd25bXSwgUiwgSCA9IHVua25vd24+KEhvb2s6IEN1c3RvbUhvb2s8UCwgUiwgSD4pOiAoLi4uYXJnczogUCkgPT4gUiA9PiB7XG4gICAgcmV0dXJuIHVzZS5iaW5kKG51bGwsIEhvb2spO1xufTtcbiIsImltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IE5ld0hvb2tTdGF0ZSwgSG9va1N0YXRlVXBkYXRlciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VTdGF0ZSA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICAgIGFyZ3MhOiByZWFkb25seSBbVCwgSG9va1N0YXRlVXBkYXRlcjxUPl07XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGluaXRpYWxWYWx1ZTogVCkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnVwZGF0ZXIgPSB0aGlzLnVwZGF0ZXIuYmluZCh0aGlzKTtcblxuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGluaXRpYWxWYWx1ZSkge1xuICAgICAgICAgICAgaW5pdGlhbFZhbHVlID0gaW5pdGlhbFZhbHVlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKGluaXRpYWxWYWx1ZSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKCk6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFyZ3M7XG4gICAgfVxuXG4gICAgdXBkYXRlcih2YWx1ZTogTmV3SG9va1N0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IFtwcmV2aW91c1ZhbHVlXSA9IHRoaXMuYXJncztcbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlckZuID0gdmFsdWUgYXMgKHByZXZpb3VzU3RhdGU/OiBUKSA9PiBUO1xuICAgICAgICAgICAgdmFsdWUgPSB1cGRhdGVyRm4ocHJldmlvdXNWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVlcEVxdWFsKHByZXZpb3VzVmFsdWUsIHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYWtlQXJncyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgbWFrZUFyZ3ModmFsdWU6IFQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcmdzID0gT2JqZWN0LmZyZWV6ZShbdmFsdWUsIHRoaXMudXBkYXRlcl0gYXMgY29uc3QpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cbn0pIGFzIDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgVCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBSKSA/IFIgOiBULFxuICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuXTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb24sXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LWZ1bmN0aW9uLXJldHVybi10eXBlLFxuICovXG5cbmltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuXG50eXBlIEVmZmVjdCA9ICh0aGlzOiBTdGF0ZSkgPT4gdm9pZCB8IFZvaWRGdW5jdGlvbiB8IFByb21pc2U8dm9pZD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVFZmZlY3QgPSAoc2V0RWZmZWN0czogKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKSA9PiB2b2lkKSA9PiB7XG4gICAgcmV0dXJuIG1ha2VIb29rKGNsYXNzIGV4dGVuZHMgSG9vayB7XG4gICAgICAgIGNhbGxiYWNrITogRWZmZWN0O1xuICAgICAgICBsYXN0VmFsdWVzPzogdW5rbm93bltdO1xuICAgICAgICB2YWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIF90ZWFyZG93biE6IFByb21pc2U8dm9pZD4gfCBWb2lkRnVuY3Rpb24gfCB2b2lkO1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgaWdub3JlZDE6IEVmZmVjdCwgaWdub3JlZDI/OiB1bmtub3duW10pIHtcbiAgICAgICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgICAgICBzZXRFZmZlY3RzKHN0YXRlLCB0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZShjYWxsYmFjazogRWZmZWN0LCB2YWx1ZXM/OiB1bmtub3duW10pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICghdGhpcy52YWx1ZXMgfHwgdGhpcy5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sYXN0VmFsdWVzID0gdGhpcy52YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBydW4oKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnRlYXJkb3duKCk7XG4gICAgICAgICAgICB0aGlzLl90ZWFyZG93biA9IHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLnN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRlYXJkb3duKCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLl90ZWFyZG93bikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RlYXJkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBoYXNDaGFuZ2VkKCk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmxhc3RWYWx1ZXMgfHwgdGhpcy52YWx1ZXMhLnNvbWUoKHZhbHVlLCBpKSA9PiAhZGVlcEVxdWFsKHRoaXMubGFzdFZhbHVlcyFbaV0sIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgZWZmZWN0c1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQgeyBjcmVhdGVFZmZlY3QgfSBmcm9tICcuL2NyZWF0ZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3Qgc2V0RWZmZWN0cyA9IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSk6IHZvaWQgPT4ge1xuICAgIHN0YXRlW2VmZmVjdHNTeW1ib2xdLnB1c2goY2IpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUVmZmVjdCA9IGNyZWF0ZUVmZmVjdChzZXRFZmZlY3RzKTtcbiIsImltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBsYXlvdXRFZmZlY3RzU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCB7IGNyZWF0ZUVmZmVjdCB9IGZyb20gJy4vY3JlYXRlLWVmZmVjdCc7XG5cbmNvbnN0IHNldExheW91dEVmZmVjdHMgPSAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpOiB2b2lkID0+IHtcbiAgICBzdGF0ZVtsYXlvdXRFZmZlY3RzU3ltYm9sXS5wdXNoKGNiKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VMYXlvdXRFZmZlY3QgPSBjcmVhdGVFZmZlY3Qoc2V0TGF5b3V0RWZmZWN0cyk7XG4iLCJpbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VNZW1vID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gICAgdmFsdWU6IFQ7XG4gICAgdmFsdWVzOiB1bmtub3duW107XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgfVxuXG4gICAgaGFzQ2hhbmdlZCh2YWx1ZXM6IHVua25vd25bXSA9IFtdKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2YWx1ZXMuc29tZSgodmFsdWUsIGkpID0+IHRoaXMudmFsdWVzW2ldICE9PSB2YWx1ZSk7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfSA9IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHVzZU1lbW8oKCkgPT4gKHtcbiAgICBjdXJyZW50OiBpbml0aWFsVmFsdWVcbn0pLCBbXSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVFxuICAgID0gPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gdXNlTWVtbygoKSA9PiBmbiwgaW5wdXRzKTtcbiIsImltcG9ydCB0eXBlIHsgSG9va1JlZHVjZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVJlZHVjZXIgPSBtYWtlSG9vayhjbGFzcyA8UywgSSwgQT4gZXh0ZW5kcyBIb29rIHtcbiAgICByZWR1Y2VyITogSG9va1JlZHVjZXI8UywgQT47XG4gICAgY3VycmVudFN0YXRlOiBTO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBfOiBIb29rUmVkdWNlcjxTLCBBPiwgaW5pdGlhbFN0YXRlOiBJLCBpbml0PzogKF86IEkpID0+IFMpIHtcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IHRoaXMuZGlzcGF0Y2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSB1bmRlZmluZWQgIT09IGluaXQgPyBpbml0KGluaXRpYWxTdGF0ZSkgOiBpbml0aWFsU3RhdGUgYXMgdW5rbm93biBhcyBTO1xuICAgIH1cblxuICAgIHVwZGF0ZShyZWR1Y2VyOiBIb29rUmVkdWNlcjxTLCBBPik6IHJlYWRvbmx5IFtTLCAoYWN0aW9uOiBBKSA9PiB2b2lkXSB7XG4gICAgICAgIHRoaXMucmVkdWNlciA9IHJlZHVjZXI7XG4gICAgICAgIHJldHVybiBbdGhpcy5jdXJyZW50U3RhdGUsIHRoaXMuZGlzcGF0Y2hdOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cblxuICAgIGRpc3BhdGNoKGFjdGlvbjogQSk6IHZvaWQge1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHRoaXMucmVkdWNlcih0aGlzLmN1cnJlbnRTdGF0ZSwgYWN0aW9uKTtcbiAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICB9XG59KTtcbiIsImltcG9ydCB7IERpcmVjdGl2ZVJlc3VsdCwgbm9DaGFuZ2UgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgSUhvb2tDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuY2xhc3MgSG9va0NvbnRleHQ8VD4gaW1wbGVtZW50cyBJSG9va0NvbnRleHQ8VD4ge1xuICAgIHJlYWRvbmx5IGRlZmF1bHRWYWx1ZTogVCB8IHVuZGVmaW5lZDtcbiAgICBwcml2YXRlIF92YWx1ZTogVDtcblxuICAgIGNvbnN0cnVjdG9yKGRlZmF1bHRWYWx1ZT86IFQpIHtcbiAgICAgICAgdGhpcy5wcm92aWRlID0gdGhpcy5wcm92aWRlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY29uc3VtZSA9IHRoaXMuY29uc3VtZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSBkZWZhdWx0VmFsdWUgYXMgVDtcbiAgICB9XG5cbiAgICBwcm92aWRlKHZhbHVlOiBULCBjYWxsYmFjaz86ICh2YWx1ZTogVCkgPT4gRGlyZWN0aXZlUmVzdWx0KTogRGlyZWN0aXZlUmVzdWx0IHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIGlzRnVuY3Rpb24oY2FsbGJhY2spID8gY2FsbGJhY2sodmFsdWUpIDogbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgY29uc3VtZShjYWxsYmFjazogKHZhbHVlOiBUKSA9PiBEaXJlY3RpdmVSZXN1bHQgfCB2b2lkKTogRGlyZWN0aXZlUmVzdWx0IHwgdm9pZCB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayh0aGlzLl92YWx1ZSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY3JlYXRlQ29udGV4dCA9IDxUPihkZWZhdWx0VmFsdWU/OiBUKTogSUhvb2tDb250ZXh0PFQ+ID0+IHtcbiAgICByZXR1cm4gbmV3IEhvb2tDb250ZXh0KGRlZmF1bHRWYWx1ZSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgc2V0RWZmZWN0cyB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDb250ZXh0ID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vazxbSUhvb2tDb250ZXh0PFQ+XSwgVCwgdW5rbm93bj4ge1xuICAgIHByaXZhdGUgX3JhbkVmZmVjdDogYm9vbGVhbjtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgXzogSUhvb2tDb250ZXh0PFQ+KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IGZhbHNlO1xuICAgICAgICBzZXRFZmZlY3RzKHN0YXRlLCB0aGlzKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoY29udGV4dDogSUhvb2tDb250ZXh0PFQ+KTogVCB7XG4gICAgICAgIGxldCByZXR2YWwhOiBUO1xuICAgICAgICBjb250ZXh0LmNvbnN1bWUodmFsdWUgPT4geyByZXR2YWwgPSB2YWx1ZTsgfSk7XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxuXG4gICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLl9yYW5FZmZlY3QpIHtcbiAgICAgICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSG9va1N0YXRlVXBkYXRlcixcbiAgICBIb29rUmVkdWNlcixcbiAgICBJSG9va0NvbnRleHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBob29rc1dpdGggfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gJy4vdXNlLXN0YXRlJztcbmltcG9ydCB7IHVzZUVmZmVjdCB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VMYXlvdXRFZmZlY3QgfSBmcm9tICcuL3VzZS1sYXlvdXQtZWZmZWN0JztcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcbmltcG9ydCB7IHVzZVJlZiB9IGZyb20gJy4vdXNlLXJlZic7XG5pbXBvcnQgeyB1c2VDYWxsYmFjayB9IGZyb20gJy4vdXNlLWNhbGxiYWNrJztcbmltcG9ydCB7IHVzZVJlZHVjZXIgfSBmcm9tICcuL3VzZS1yZWR1Y2VyJztcbmltcG9ydCB7IGNyZWF0ZUNvbnRleHQgfSBmcm9tICcuL2NyZWF0ZS1jb250ZXh0JztcbmltcG9ydCB7IHVzZUNvbnRleHQgfSBmcm9tICcuL3VzZS1jb250ZXh0JztcbmV4cG9ydCAqIGZyb20gJy4vaW50ZXJmYWNlcyc7XG5leHBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5cbi8qKlxuICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuXG4gKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGNvbnN0IHsgdXNlU3RhdGUgfSA9IGhvb2tzO1xuICpcbiAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICogZnVuY3Rpb24gQXBwKCkge1xuICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gKiAgICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgICAgIDxwPkNvdW50OiAkeyBjb3VudCB9PC9wPlxuICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICogICAgIGA7XG4gKiB9XG4gKlxuICogLy8gcmVuZGVyIHdpdGggaG9va3NcbiAqIHJlbmRlcihob29rcyhBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tzIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBwYXJpdHkgd2l0aCB0aGUgUmVhY3QgaG9va3MgY29uY2VwdC4gPGJyPlxuICAgICAqICAgICBBZGQgSG9va3MgZmVhdHVyZSB0byB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheC5cbiAgICAgKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bIDxicj5cbiAgICAgKiAgICAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44GrIEhvb2tzIOapn+iDveOCkuS7mOWKoFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAgICAgKlxuICAgICAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICAgICAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAgICAgKiAgICAgY29uc3QgW2NvdW50LCBzZXRDb3VudF0gPSB1c2VTdGF0ZSgwKTtcbiAgICAgKiAgICAgcmV0dXJuIGh0bWxgXG4gICAgICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAgICAgKiAgICAgICAgIDxidXR0b24gY2xhc3M9XCJzdGF0ZS1wbHVzXCIgQGNsaWNrPSR7KCkgPT4gc2V0Q291bnQocHJldkNvdW50ID0+IHByZXZDb3VudCEgKyAxKX0+4p6VPC9idXR0b24+XG4gICAgICogICAgIGA7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gZW5hYmxpbmcgaG9va3NcbiAgICAgKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgKHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguIChzcGVjaWZ5IGEgRE9NIGRpc2Nvbm5lY3QgZGV0ZWN0aW9uIGVsZW1lbnQpXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqAgKERPTSDliIfmlq3mpJznn6XopoHntKDjgpLmjIflrpopXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NvbWUtcGFnZScpO1xuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzIHdpdGggcm9vdCBlbGVtZW50XG4gICAgICogcmVuZGVyKGhvb2tzLndpdGgoZWwsIEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsUm9vdFxuICAgICAqICAtIGBlbmAgUm9vdCBlbGVtZW50IHVzZWQgZm9yIERPTSBkaXNjb25uZWN0aW9uIGRldGVjdGlvbi4gSWYgYG51bGxgIHBhc3NlZCwgYGRvY3VtZW50YCBpcyBzcGVjaWZpZWRcbiAgICAgKiAgLSBgamFgIERPTSDliIfmlq3mpJznn6Xjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jopoHntKAuIGBudWxsYCDjgYzmuKHjgovjgaggYGRvY3VtZW50YCDjgYzmjIflrprjgZXjgozjgotcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgd2l0aDogKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBzdGF0ZWZ1bCB2YWx1ZSBhbmQgYSBmdW5jdGlvbiB0byB1cGRhdGUgaXQuXG4gICAgICogQGphIOOCueODhuODvOODiOODleODq+OBquWApOOBqOOAgeOBneOCjOOCkuabtOaWsOOBmeOCi+OBn+OCgeOBrumWouaVsOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWxTdGF0ZVxuICAgICAqICAtIGBlbmAgVGhlIHZhbHVlIHlvdSB3YW50IHRoZSBzdGF0ZSB0byBiZSBpbml0aWFsbHkuXG4gICAgICogIC0gYGphYCDnirbmhYvjga7liJ3mnJ/ljJblgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dXJucyBhbiBhcnJheSB3aXRoIGV4YWN0bHkgdHdvIHZhbHVlcy4gW2BjdXJyZW50U3RhdGVgLCBgdXBkYXRlRnVuY3Rpb25gXVxuICAgICAqICAtIGBqYWAgMuOBpOOBruWApOOCkuaMgeOBpOmFjeWIl+OCkui/lOWNtCBbYGN1cnJlbnRTdGF0ZWAsIGB1cGRhdGVGdW5jdGlvbmBdXG4gICAgICovXG4gICAgdXNlU3RhdGU6IDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgICAgIFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUikgPyBSIDogVCxcbiAgICAgICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG4gICAgXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBjb250YWlucyBpbXBlcmF0aXZlLCBwb3NzaWJseSBlZmZlY3RmdWwgY29kZS5cbiAgICAgKiBAamEg5Ymv5L2c55So44KS5pyJ44GZ44KL5Y+v6IO95oCn44Gu44GC44KL5ZG95Luk5Z6L44Gu44Kz44O844OJ44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWZmZWN0XG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCB0aW1lIGRlcGVuZGVuY2llcyBjaGFuZ2VcbiAgICAgKiAgLSBgamFgIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOCi+OBn+OBs+OBq+Wun+ihjOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBkZXBlbmRlbmNpZXNcbiAgICAgKiAgLSBgZW5gIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIHRoZSBlZmZlY3RcbiAgICAgKiAgLSBgamFgIOWJr+S9nOeUqOeZuueBq+OBruODiOODquOCrOODvOOBqOOBquOCi+S+neWtmOmWouS/guOBruODquOCueODiFxuICAgICAqL1xuICAgIHVzZUVmZmVjdDogKGVmZmVjdDogKCkgPT4gdm9pZCwgZGVwZW5kZW5jaWVzPzogdW5rbm93bltdKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGNvbnRhaW5zIGltcGVyYXRpdmUsIHBvc3NpYmx5IGVmZmVjdGZ1bCBjb2RlLiA8YnI+XG4gICAgICogICAgIFVubGlrZSBbW3VzZUVmZmVjdF1dICwgaXQgaXMgZXhlY3V0ZWQgYmVmb3JlIHRoZSBjb21wb25lbnQgaXMgcmVuZGVyZWQgYW5kIHRoZSBuZXcgZWxlbWVudCBpcyBkaXNwbGF5ZWQgb24gdGhlIHNjcmVlbi5cbiAgICAgKiBAamEg5Ymv5L2c55So44KS5pyJ44GZ44KL5Y+v6IO95oCn44Gu44GC44KL5ZG95Luk5Z6L44Gu44Kz44O844OJ44Gu6YGp55SoIDxicj5cbiAgICAgKiAgICAgW1t1c2VFZmZlY3RdXSDjgajnlbDjgarjgoosIOOCs+ODs+ODneODvOODjeODs+ODiOOBjOODrOODs+ODgOODquODs+OCsOOBleOCjOOBpuaWsOOBl+OBhOimgee0oOOBjOeUu+mdouOBq+ihqOekuuOBleOCjOOCi+WJjeOBq+Wun+ihjOOBleOCjOOCi+OAglxuICAgICAqXG4gICAgICogQHBhcmFtIGVmZmVjdFxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBydW5zIGVhY2ggdGltZSBkZXBlbmRlbmNpZXMgY2hhbmdlXG4gICAgICogIC0gYGphYCDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgovjgZ/jgbPjgavlrp/ooYzjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzXG4gICAgICogIC0gYGVuYCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byB0aGUgZWZmZWN0XG4gICAgICogIC0gYGphYCDlia/kvZznlKjnmbrngavjga7jg4jjg6rjgqzjg7zjgajjgarjgovkvp3lrZjplqLkv4Ljga7jg6rjgrnjg4hcbiAgICAgKi9cbiAgICB1c2VMYXlvdXRFZmZlY3Q6IChlZmZlY3Q6ICgpID0+IHZvaWQsIGRlcGVuZGVuY2llcz86IHVua25vd25bXSkgPT4gdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVc2VkIHRvIHJlZHVjZSBjb21wb25lbnQgcmUtcmVuZGVyaW5nLiA8YnI+XG4gICAgICogICAgIENhY2hlIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gdGhlIGNhY2hlZCB2YWx1ZSB3aGVuIGNhbGxlZCB3aXRoIHRoZSBzYW1lIGFyZ3VtZW50cy5cbiAgICAgKiBAamEg44Kz44Oz44Od44O844ON44Oz44OI44Gu5YaN44Os44Oz44OA44Oq44Oz44Kw44KS5oqR44GI44KL44Gf44KB44Gr5L2/55SoIDxicj5cbiAgICAgKiAgICAg6Zai5pWw44Gu5oi744KK5YCk44KS44Kt44Oj44OD44K344Ol44GX44CB5ZCM44GY5byV5pWw44Gn5ZG844Gz5Ye644GV44KM44Gf5aC05ZCI44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gf5YCk44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWApOOCkui/lOOBmemWouaVsFxuICAgICAqIEBwYXJhbSB2YWx1ZXNcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5IG9mIHZhbHVlcyB0aGF0IGFyZSB1c2VkIGFzIGFyZ3VtZW50cyBmb3IgYGZuYFxuICAgICAqICAtIGBqYWAgYGZuYCDjga7lvJXmlbDjgajjgZfjgabkvb/nlKjjgZXjgozjgovlgKTjga7phY3liJdcbiAgICAgKi9cbiAgICB1c2VNZW1vOiA8VD4oZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKSA9PiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIExldHMgeW91IHJlZmVyZW5jZSBhIHZhbHVlIHRoYXTigJlzIG5vdCBuZWVkZWQgZm9yIHJlbmRlcmluZy4gPGJyPlxuICAgICAqICAgICBNYWlubHkgYXZhaWxhYmxlIGZvciBhY2Nlc3NpbmcgRE9NIG5vZGVzLlxuICAgICAqIEBqYSDjg6zjg7Pjg4Djg6rjg7PjgrDjgavkuI3opoHjgarlgKTjgpLlj4Lnhaflj6/og73jgavjgZnjgos8YnI+XG4gICAgICogICAgIOS4u+OBqyBET00g44OO44O844OJ44G444Gu44Ki44Kv44K744K544Gr5Yip55So5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFZhbHVlXG4gICAgICogIC0gYGVuYCBUaGUgaW5pdGlhbCB2YWx1ZSBvZiB0aGUgcmVmZXJlbmNlXG4gICAgICogIC0gYGphYCDlj4Lnhafjga7liJ3mnJ/lgKRcbiAgICAgKi9cbiAgICB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGEgbWVtb2l6ZWQgdmVyc2lvbiBvZiB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBvbmx5IGNoYW5nZXMgaWYgdGhlIGRlcGVuZGVuY2llcyBjaGFuZ2UuIDxicj5cbiAgICAgKiAgICAgVXNlZnVsIGZvciBwYXNzaW5nIGNhbGxiYWNrcyB0byBvcHRpbWl6ZWQgY2hpbGQgY29tcG9uZW50cyB0aGF0IHJlbHkgb24gcmVmZXJlbnRpYWwgZXF1YWxpdHkuXG4gICAgICogQGphIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOBn+WgtOWQiOOBq+OBruOBv+WkieabtOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBruODoeODouWMluODkOODvOOCuOODp+ODs+OCkui/lOWNtCA8YnI+XG4gICAgICogICAgIOWPgueFp+etieS+oeaAp+OBq+S+neWtmOOBmeOCi+acgOmBqeWMluOBleOCjOOBn+WtkOOCs+ODs+ODneODvOODjeODs+ODiOOBq+OCs+ODvOODq+ODkOODg+OCr+OCkua4oeOBmeWgtOWQiOOBq+W9ueeri+OBpFxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogIC0gYGVuYCBUaGUgZnVuY3Rpb24gdG8gbWVtb2l6ZVxuICAgICAqICAtIGBqYWAg44Oh44Oi5YyW44GZ44KL6Zai5pWwXG4gICAgICogQHBhcmFtIGlucHV0c1xuICAgICAqICAtIGBlbmAgQW4gYXJyYXkgb2YgaW5wdXRzIHRvIHdhdGNoIGZvciBjaGFuZ2VzXG4gICAgICogIC0gYGphYCDlpInmm7TjgpLnm6PoppbjgZnjgovlhaXlipvjga7phY3liJdcbiAgICAgKi9cbiAgICB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBIb29rIEFQSSBmb3IgbWFuYWdpbmcgc3RhdGUgaW4gZnVuY3Rpb24gY29tcG9uZW50cy5cbiAgICAgKiBAamEg6Zai5pWw44Kz44Oz44Od44O844ON44Oz44OI44Gn54q25oWL44KS566h55CG44GZ44KL44Gf44KB44GuIEhvb2sgQVBJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVkdWNlclxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZCBhbiBhY3Rpb24gYW5kIHJldHVybnMgYSBuZXcgc3RhdGVcbiAgICAgKiAgLSBgamFgIOePvuWcqOOBrueKtuaFi+OBqOOCouOCr+OCt+ODp+ODs+OCkuWPl+OBkeWPluOCiuOAgeaWsOOBl+OBhOeKtuaFi+OCkui/lOOBmemWouaVsFxuICAgICAqIEBwYXJhbSBpbml0aWFsU3RhdGVcbiAgICAgKiAgLSBgZW5gIFRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y2VyXG4gICAgICogIC0gYGphYCDjg6rjg4fjg6Xjg7zjgrXjg7zjga7liJ3mnJ/nirbmhYvjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gaW5pdFxuICAgICAqICAtIGBlbmAgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y2VyXG4gICAgICogIC0gYGphYCDjg6rjg4fjg6Xjg7zjgrXjg7zjga7liJ3mnJ/nirbmhYvjgpLov5TjgZnjgqrjg5fjgrfjg6fjg7Pjga7plqLmlbBcbiAgICAgKi9cbiAgICB1c2VSZWR1Y2VyOiA8UywgSSwgQT4ocmVkdWNlcjogSG9va1JlZHVjZXI8UywgQT4sIGluaXRpYWxTdGF0ZTogSSwgaW5pdD86ICgoXzogSSkgPT4gUykgfCB1bmRlZmluZWQpID0+IHJlYWRvbmx5IFtTLCAoYWN0aW9uOiBBKSA9PiB2b2lkXTtcblxuICAgIC8qKlxuICAgICAqIEBlblxuICAgICAqIGNyZWF0ZUNvbnRleHQgaXMgYSBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgYSBuZXcgY29udGV4dCBvYmplY3QuIEEgY29udGV4dCBvYmplY3QgaXMgdXNlZCB0byBzaGFyZSBkYXRhIHRoYXQgY2FuIGJlIGNvbnNpZGVyZWQg4oCcZ2xvYmFs4oCdIGZvciBhIHRyZWUgb2YgUmVhY3QgY29tcG9uZW50cy5cbiAgICAgKlxuICAgICAqIEBqYVxuICAgICAqIGNyZWF0ZUNvbnRleHQg44Gv5paw44GX44GE44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44KS5L2c5oiQ44GZ44KL6Zai5pWw44Gn44GZ44CC44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44Gv44CBUmVhY3Qg44Kz44Oz44Od44O844ON44Oz44OI44Gu44OE44Oq44O844Gr5a++44GX44Gm44CM44Kw44Ot44O844OQ44Or44CN44Go6ICD44GI44KJ44KM44KL44OH44O844K/44KS5YWx5pyJ44GZ44KL44Gf44KB44Gr5L2/55So44GV44KM44G+44GZ44CCXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVmYXVsdFZhbHVlXG4gICAgICogIC0gYGVuYDogVGhlIGRlZmF1bHQgdmFsdWUgZm9yIHRoZSBjb250ZXh0IG9iamVjdC5cbiAgICAgKiAgLSBgamFgOiDjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjga7jg4fjg5Xjgqnjg6vjg4jlgKTjgIJcbiAgICAgKi9cbiAgICBjcmVhdGVDb250ZXh0OiA8VD4oZGVmYXVsdFZhbHVlPzogVCkgPT4gSUhvb2tDb250ZXh0PFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuXG4gICAgICogdXNlQ29udGV4dCBpcyBhIGhvb2sgdGhhdCByZXR1cm5zIHRoZSBjdXJyZW50IGNvbnRleHQgdmFsdWUgZm9yIHRoZSBnaXZlbiBjb250ZXh0IG9iamVjdC4gV2hlbiB0aGUgbmVhcmVzdCA8TXlDb250ZXh0LlByb3ZpZGVyPiBhYm92ZSB0aGUgY29tcG9uZW50IHVwZGF0ZXMsIHRoaXMgaG9vayB3aWxsIHRyaWdnZXIgYSByZXJlbmRlciB3aXRoIHRoZSBsYXRlc3QgY29udGV4dCB2YWx1ZSBwYXNzZWQgdG8gdGhhdCBNeUNvbnRleHQgcHJvdmlkZXIuXG4gICAgICpcbiAgICAgKiBAamFcbiAgICAgKiB1c2VDb250ZXh0IOOBr+OAgeaMh+WumuOBleOCjOOBn+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBq+WvvuOBmeOCi+ePvuWcqOOBruOCs+ODs+ODhuOCreOCueODiOWApOOCkui/lOOBmeODleODg+OCr+OBp+OBmeOAguOBk+OBruODleODg+OCr+OBr+OAgeOCs+ODs+ODneODvOODjeODs+ODiOOBruS4iuOBq+OBguOCi+acgOOCgui/keOBhCA8TXlDb250ZXh0LlByb3ZpZGVyPiDjgYzmm7TmlrDjgZXjgozjgovjgajjgIHjgZ3jga4gTXlDb250ZXh0IOODl+ODreODkOOCpOODgOODvOOBq+a4oeOBleOCjOOBn+acgOaWsOOBruOCs+ODs+ODhuOCreOCueODiOWApOOBp+WGjeODrOODs+ODgOODquODs+OCsOOBjOODiOODquOCrOODvOOBleOCjOOBvuOBmeOAglxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gOiBUaGUgY29udGV4dCBvYmplY3QgcmV0dXJuZWQgZnJvbSBSZWFjdC5jcmVhdGVDb250ZXh0LlxuICAgICAqICAtIGBqYWA6IFJlYWN0LmNyZWF0ZUNvbnRleHQg44GL44KJ6L+U44GV44KM44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44CCXG4gICAgICovXG4gICAgdXNlQ29udGV4dDogPFQ+KGNvbnRleHQ6IElIb29rQ29udGV4dDxUPikgPT4gVDtcbn1cblxuY29uc3QgaG9va3M6IEhvb2tzID0gaG9va3NXaXRoLmJpbmQobnVsbCwgbnVsbCk7XG5ob29rcy53aXRoICAgICAgICAgICAgPSBob29rc1dpdGg7XG5ob29rcy51c2VTdGF0ZSAgICAgICAgPSB1c2VTdGF0ZTtcbmhvb2tzLnVzZUVmZmVjdCAgICAgICA9IHVzZUVmZmVjdDtcbmhvb2tzLnVzZUxheW91dEVmZmVjdCA9IHVzZUxheW91dEVmZmVjdDtcbmhvb2tzLnVzZU1lbW8gICAgICAgICA9IHVzZU1lbW87XG5ob29rcy51c2VSZWYgICAgICAgICAgPSB1c2VSZWY7XG5ob29rcy51c2VDYWxsYmFjayAgICAgPSB1c2VDYWxsYmFjaztcbmhvb2tzLnVzZVJlZHVjZXIgICAgICA9IHVzZVJlZHVjZXI7XG5ob29rcy5jcmVhdGVDb250ZXh0ICAgPSBjcmVhdGVDb250ZXh0O1xuaG9va3MudXNlQ29udGV4dCAgICAgID0gdXNlQ29udGV4dDtcblxuZXhwb3J0IHsgaG9va3MgfTtcbiJdLCJuYW1lcyI6WyIkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFhQTtBQUNBLE1BQU0sU0FBUyxHQUF3QztJQUNuRCxRQUFRLEVBQUUseUJBQXlCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDaEUsUUFBUSxFQUFFLHlCQUF5QixFQUFFO0NBQ3hDLENBQUM7QUFnQ0Y7OztBQUdHO0FBQ0gsTUFBYSxjQUFjLENBQUE7O0FBRWYsSUFBQSxPQUFPLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDOzs7QUFLakQ7Ozs7Ozs7Ozs7QUFVRztBQUNJLElBQUEsT0FBTyxPQUFPLENBQUMsUUFBc0MsRUFBRSxPQUFzQyxFQUFBO0FBQ2hHLFFBQUEs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