/*!
 * @cdp/template 0.9.21
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUubWpzIiwic291cmNlcyI6WyJicmlkZ2UudHMiLCJsb2FkZXIudHMiLCJob29rcy9jdXJyZW50LnRzIiwiaG9va3Mvc3ltYm9scy50cyIsImhvb2tzL3N0YXRlLnRzIiwiaG9va3MvZGlyZWN0aXZlLnRzIiwiaG9va3MvaG9vay50cyIsImhvb2tzL3VzZS1zdGF0ZS50cyIsImhvb2tzL2NyZWF0ZS1lZmZlY3QudHMiLCJob29rcy91c2UtZWZmZWN0LnRzIiwiaG9va3MvdXNlLWxheW91dC1lZmZlY3QudHMiLCJob29rcy91c2UtbWVtby50cyIsImhvb2tzL3VzZS1yZWYudHMiLCJob29rcy91c2UtY2FsbGJhY2sudHMiLCJob29rcy91c2UtcmVkdWNlci50cyIsImhvb2tzL2NyZWF0ZS1jb250ZXh0LnRzIiwiaG9va3MvdXNlLWNvbnRleHQudHMiLCJob29rcy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIHR5cGUgVGVtcGxhdGVSZXN1bHQsXG4gICAgdHlwZSBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBodG1sLFxuICAgIGRpcmVjdGl2ZXMsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB7XG4gICAgdHlwZSBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlJztcbmltcG9ydCB0eXBlIHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsIGJ1aWx0aW4gdHJhbnNmb3JtZXJzIChkZWZhdWx0OiBtdXN0YWNoZSkuICovXG5jb25zdCBfYnVpbHRpbnM6IFJlY29yZDxzdHJpbmcsIFRlbXBsYXRlVHJhbnNmb3JtZXI+ID0ge1xuICAgIG11c3RhY2hlOiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWwsIGRpcmVjdGl2ZXMudW5zYWZlSFRNTCksXG4gICAgc3RhbXBpbm86IGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIoKSxcbn07XG5cbi8qKlxuICogQGVuIENvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUgaW50ZXJmYWNlXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/44OG44Oz44OX44Os44O844OI5qC857SN44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFNvdXJjZSB0ZW1wbGF0ZSBzdHJpbmdcbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICovXG4gICAgc291cmNlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBUZW1wbGF0ZVJlc3VsdH0gdGhhdCBhcHBsaWVkIGdpdmVuIHBhcmFtZXRlcihzKS5cbiAgICAgKiBAamEg44OR44Op44Oh44O844K/44KS6YGp55So44GXIHtAbGluayBUZW1wbGF0ZVJlc3VsdH0g44G45aSJ5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlld1xuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgcGFyYW1ldGVycyBmb3Igc291cmNlLlxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQ7XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBUZW1wbGF0ZUJyaWRnZX0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEge0BsaW5rIFRlbXBsYXRlQnJpZGdlfSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0cmFuc2Zvcm1lcj86IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIGJyaWRnZSBmb3Igb3RoZXIgdGVtcGxhdGUgZW5naW5lIHNvdXJjZS5cbiAqIEBqYSDku5bjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg7Pjgrjjg7Pjga7lhaXlipvjgpLlpInmj5vjgZnjgovjg4bjg7Pjg5fjg6zjg7zjg4jjg5bjg6rjg4Pjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlQnJpZGdlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgX3RyYW5zZm9ybWVyID0gX2J1aWx0aW5zLm11c3RhY2hlO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgQ29tcGlsZWRUZW1wbGF0ZX0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSB7QGxpbmsgQ29tcGlsZWRUZW1wbGF0ZX0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmcgLyB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJcgLyDjg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg6zjg6Hjg7Pjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zKTogQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNmb3JtZXIgfSA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2Zvcm1lcjogVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyIH0sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBlbmdpbmUgPSB0cmFuc2Zvcm1lcih0ZW1wbGF0ZSk7XG4gICAgICAgIGNvbnN0IGpzdCA9ICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBlbmdpbmUodmlldyk7XG4gICAgICAgIH07XG4gICAgICAgIGpzdC5zb3VyY2UgPSB0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGRlZmF1bHQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDml6Llrprjga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdUcmFuc2Zvcm1lclxuICAgICAqICAtIGBlbmAgbmV3IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOS7peWJjeOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2V0VHJhbnNmb3JtZXIobmV3VHJhbnNmb3JtZXI6IFRlbXBsYXRlVHJhbnNmb3JtZXIpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICAgICAgY29uc3Qgb2xkVHJhbnNmb3JtZXIgPSBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXI7XG4gICAgICAgIFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciA9IG5ld1RyYW5zZm9ybWVyO1xuICAgICAgICByZXR1cm4gb2xkVHJhbnNmb3JtZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBuYW1lIGxpc3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeensOS4gOimp+OCkuWPluW+l1xuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG5hbWUgbGlzdC5cbiAgICAgKiAgLSBgamFgIOWQjeensOS4gOimp+OCkui/lOWNtFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgYnVpbHRpbnMoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoX2J1aWx0aW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0IG5hbWUuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY3jgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0QnVpdGluVHJhbnNmb3JtZXIobmFtZTogc3RyaW5nKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfYnVpbHRpbnNbbmFtZV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5lc2NhcGVIVE1MLCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBKU1QsXG4gICAgdHlwZSBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLFxuICAgIFRlbXBsYXRlRW5naW5lLFxufSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuaW1wb3J0IHsgdHlwZSBMb2FkVGVtcGxhdGVPcHRpb25zLCBsb2FkVGVtcGxhdGVTb3VyY2UgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5leHBvcnQgeyBjbGVhclRlbXBsYXRlQ2FjaGUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgQ29tcGlsZWRUZW1wbGF0ZSxcbiAgICB0eXBlIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVCcmlkZ2UsXG59IGZyb20gJy4vYnJpZGdlJztcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBsaXN0LlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlUeXBlTGlzdCB7XG4gICAgZW5naW5lOiBKU1Q7XG4gICAgYnJpZGdlOiBDb21waWxlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGRlZmluaXRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+aMh+WumuWtkFxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSBrZXlvZiBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IG9wdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeU9wdGlvbnM8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcz4gZXh0ZW5kcyBMb2FkVGVtcGxhdGVPcHRpb25zLCBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLCBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBgZW5naW5lYCAvICdicmlkZ2UnXG4gICAgICovXG4gICAgdHlwZT86IFQ7XG4gICAgLyoqXG4gICAgICogQGVuIHRlbXBsYXRlIGxvYWQgY2FsbGJhY2suIGBicmlkZ2VgIG1vZGUgYWxsb3dzIGxvY2FsaXphdGlvbiBoZXJlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4joqq3jgb/ovrzjgb/jgrPjg7zjg6vjg5Djg4Pjgq8uIGBicmlkZ2VgIOODouODvOODieOBp+OBr+OBk+OBk+OBp+ODreODvOOCq+ODqeOCpOOCuuOBjOWPr+iDvVxuICAgICAqL1xuICAgIGNhbGxiYWNrPzogKHNyYzogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCkgPT4gc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IFByb21pc2U8c3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudD47XG59XG5cbi8qKlxuICogQGVuIEdldCBjb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlLlxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBvyBKYXZhU2NyaXB0IOODhuODs+ODl+ODrOODvOODiOWPluW+l1xuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBUaGUgc2VsZWN0b3Igc3RyaW5nIG9mIERPTS5cbiAqICAtIGBqYWAgRE9NIOOCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFRlbXBsYXRlPFQgZXh0ZW5kcyBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSAnZW5naW5lJz4oXG4gICAgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlUXVlcnlPcHRpb25zPFQ+XG4pOiBQcm9taXNlPFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXT4ge1xuICAgIGNvbnN0IHsgdHlwZSwgdXJsLCBub0NhY2hlLCBjYWxsYmFjayB9ID0gT2JqZWN0LmFzc2lnbih7IHR5cGU6ICdlbmdpbmUnLCBub0NhY2hlOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICBsZXQgc3JjID0gYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybCwgbm9DYWNoZSB9KTtcbiAgICBpZiAoIXNyYykge1xuICAgICAgICB0aHJvdyBuZXcgVVJJRXJyb3IoYGNhbm5vdCBzcGVjaWZpZWQgdGVtcGxhdGUgcmVzb3VyY2UuIHsgc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCAgdXJsOiAke3VybH0gfWApO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBzcmMgPSBhd2FpdCBjYWxsYmFjayhzcmMpO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdlbmdpbmUnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoc3JjIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHVuZXNjYXBlSFRNTChzcmMuaW5uZXJIVE1MKSA6IHNyYywgb3B0aW9ucykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBjYXNlICdicmlkZ2UnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlQnJpZGdlLmNvbXBpbGUoc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBbdHlwZTogJHt0eXBlfV0gaXMgdW5rbm93bi5gKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5sZXQgX2N1cnJlbnRJZCA9IDA7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBsZXQgY3VycmVudDogSUhvb2tTdGF0ZSB8IG51bGw7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRDdXJyZW50ID0gKHN0YXRlOiBJSG9va1N0YXRlKTogdm9pZCA9PiB7XG4gICAgY3VycmVudCA9IHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyQ3VycmVudCA9ICgpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gbnVsbDtcbiAgICBfY3VycmVudElkID0gMDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBub3RpZnkgPSAoKTogbnVtYmVyID0+IHtcbiAgICByZXR1cm4gX2N1cnJlbnRJZCsrO1xufTtcbiIsIi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rU3ltYm9sID0gU3ltYm9sKCdob29rJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnZWZmZWN0cycpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGxheW91dEVmZmVjdHNTeW1ib2wgPSBTeW1ib2woJ2xheW91dEVmZmVjdHMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRWZmZWN0c1N5bWJvbHMgPSB0eXBlb2YgZWZmZWN0c1N5bWJvbCB8IHR5cGVvZiBsYXlvdXRFZmZlY3RzU3ltYm9sO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgeyBzZXRDdXJyZW50LCBjbGVhckN1cnJlbnQgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEVmZmVjdHNTeW1ib2xzLFxuICAgIGhvb2tTeW1ib2wsXG4gICAgZWZmZWN0c1N5bWJvbCxcbiAgICBsYXlvdXRFZmZlY3RzU3ltYm9sLFxufSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgaW50ZXJmYWNlIENhbGxhYmxlIHtcbiAgICBjYWxsOiAoc3RhdGU6IFN0YXRlKSA9PiB2b2lkO1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY2xhc3MgU3RhdGU8SCA9IHVua25vd24+IGltcGxlbWVudHMgSUhvb2tTdGF0ZTxIPiB7XG4gICAgdXBkYXRlOiBWb2lkRnVuY3Rpb247XG4gICAgaG9zdDogSDtcbiAgICB2aXJ0dWFsPzogYm9vbGVhbjtcbiAgICBbaG9va1N5bWJvbF06IE1hcDxudW1iZXIsIEhvb2s+O1xuICAgIFtlZmZlY3RzU3ltYm9sXTogQ2FsbGFibGVbXTtcbiAgICBbbGF5b3V0RWZmZWN0c1N5bWJvbF06IENhbGxhYmxlW107XG5cbiAgICBjb25zdHJ1Y3Rvcih1cGRhdGU6IFZvaWRGdW5jdGlvbiwgaG9zdDogSCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSA9IHVwZGF0ZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gaG9zdDtcbiAgICAgICAgdGhpc1tob29rU3ltYm9sXSA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpc1tlZmZlY3RzU3ltYm9sXSA9IFtdO1xuICAgICAgICB0aGlzW2xheW91dEVmZmVjdHNTeW1ib2xdID0gW107XG4gICAgfVxuXG4gICAgcnVuPFQ+KGNiOiAoKSA9PiBUKTogVCB7XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGNvbnN0IHJlcyA9IGNiKCk7XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIF9ydW5FZmZlY3RzKHBoYXNlOiBFZmZlY3RzU3ltYm9scyk6IHZvaWQge1xuICAgICAgICBjb25zdCBlZmZlY3RzID0gdGhpc1twaGFzZV07XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIGVmZmVjdHMpIHtcbiAgICAgICAgICAgIGVmZmVjdC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgIH1cblxuICAgIHJ1bkVmZmVjdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3J1bkVmZmVjdHMoZWZmZWN0c1N5bWJvbCk7XG4gICAgfVxuXG4gICAgcnVuTGF5b3V0RWZmZWN0cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcnVuRWZmZWN0cyhsYXlvdXRFZmZlY3RzU3ltYm9sKTtcbiAgICB9XG5cbiAgICB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaG9va3MgPSB0aGlzW2hvb2tTeW1ib2xdO1xuICAgICAgICBmb3IgKGNvbnN0IFssIGhvb2tdIG9mIGhvb2tzKSB7XG4gICAgICAgICAgICAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGhvb2sudGVhcmRvd24pICYmIGhvb2sudGVhcmRvd24oKTtcbiAgICAgICAgICAgIGRlbGV0ZSBob29rLnRlYXJkb3duO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFBhcnRJbmZvLFxuICAgIHR5cGUgRGlyZWN0aXZlUmVzdWx0LFxuICAgIEFzeW5jRGlyZWN0aXZlLFxuICAgIGRpcmVjdGl2ZSxcbiAgICBub0NoYW5nZSxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICBub29wLFxuICAgIHNjaGVkdWxlcixcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvbSBhcyAkIH0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuY29uc3Qgc2NoZWR1bGUgPSBzY2hlZHVsZXIoKTtcblxuaW50ZXJmYWNlIERpc2Nvbm5lY3RhYmxlIHtcbiAgICBfJHBhcmVudD86IERpc2Nvbm5lY3RhYmxlO1xuICAgIHBhcmVudE5vZGU6IEVsZW1lbnQ7XG59XG5cbmNsYXNzIEhvb2tEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhdGU6IFN0YXRlO1xuICAgIHByaXZhdGUgX3JlbmRlcmVyOiBVbmtub3duRnVuY3Rpb247XG4gICAgcHJpdmF0ZSBfYXJnczogdW5rbm93bltdO1xuICAgIHByaXZhdGUgX2VsT2JzZXJ2ZWQ/OiBOb2RlO1xuICAgIHByaXZhdGUgX2Rpc2Nvbm5lY3RlZEhhbmRsZXI/OiB0eXBlb2YgSG9va0RpcmVjdGl2ZS5wcm90b3R5cGUuZGlzY29ubmVjdGVkO1xuXG4gICAgY29uc3RydWN0b3IocGFydDogUGFydEluZm8pIHtcbiAgICAgICAgc3VwZXIocGFydCk7XG4gICAgICAgIHRoaXMuX3N0YXRlID0gbmV3IFN0YXRlKCgpID0+IHRoaXMucmVkcmF3KCksIHRoaXMpO1xuICAgICAgICB0aGlzLl9yZW5kZXJlciA9IG5vb3A7XG4gICAgICAgIHRoaXMuX2FyZ3MgPSBbXTtcbiAgICB9XG5cbiAgICByZW5kZXIoZWxSb290OiBOb2RlIHwgbnVsbCwgcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKTogRGlyZWN0aXZlUmVzdWx0IHtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSByZW5kZXJlcjtcbiAgICAgICAgdGhpcy5fYXJncyA9IGFyZ3M7XG4gICAgICAgIHRoaXMub2JzZXJ2ZShlbFJvb3QpO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGRpc2Nvbm5lY3RlZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCAmJiAkLnV0aWxzLnVuZGV0ZWN0aWZ5KHRoaXMuX2VsT2JzZXJ2ZWQpO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9zdGF0ZS50ZWFyZG93bigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVkcmF3KCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGF0ZS5ydW4oKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMuX3JlbmRlcmVyKC4uLnRoaXMuX2FyZ3MpO1xuICAgICAgICAgICAgdGhpcy5zZXRWYWx1ZShyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlLnJ1bkxheW91dEVmZmVjdHMoKTtcbiAgICAgICAgc2NoZWR1bGUoKCkgPT4gdGhpcy5fc3RhdGUucnVuRWZmZWN0cygpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9ic2VydmUoZWxSb290OiBOb2RlIHwgbnVsbCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBfJHBhcmVudCB9ID0gdGhpcyBhcyB1bmtub3duIGFzIERpc2Nvbm5lY3RhYmxlO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gXyRwYXJlbnQ/LnBhcmVudE5vZGU7XG4gICAgICAgIGlmICh0aGlzLl9lbE9ic2VydmVkKSB7XG4gICAgICAgICAgICAkLnV0aWxzLmRldGVjdGlmeSh0aGlzLl9lbE9ic2VydmVkLCBlbFJvb3QhKTtcbiAgICAgICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQuYWRkRXZlbnRMaXN0ZW5lcignZGlzY29ubmVjdGVkJywgdGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlciA9IHRoaXMuZGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgaG9va3NXaXRoID0gZGlyZWN0aXZlKEhvb2tEaXJlY3RpdmUpO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGN1cnJlbnQsIG5vdGlmeSB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQgeyBob29rU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdCBjbGFzcyBmb3IgQ3VzdG9tIEhvb2sgQ2xhc3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Kv44Op44K544Gu5Z+65bqV5oq96LGh44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBIb29rPFAgZXh0ZW5kcyB1bmtub3duW10gPSB1bmtub3duW10sIFIgPSB1bmtub3duLCBIID0gdW5rbm93bj4ge1xuICAgIGlkOiBudW1iZXI7XG4gICAgc3RhdGU6IElIb29rU3RhdGU8SD47XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZTxIPikge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICB9XG5cbiAgICBhYnN0cmFjdCB1cGRhdGUoLi4uYXJnczogUCk6IFI7XG4gICAgdGVhcmRvd24/KCk6IHZvaWQ7XG59XG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBkZWZpbml0aW9uIGZvciBjdXN0b20gaG9va3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIEN1c3RvbUhvb2s8UCBleHRlbmRzIHVua25vd25bXSA9IHVua25vd25bXSwgUiA9IHVua25vd24sIEggPSB1bmtub3duPiA9IG5ldyAoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGU8SD4sIC4uLmFyZ3M6IFApID0+IEhvb2s8UCwgUiwgSD47XG5cbmNvbnN0IHVzZSA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPiwgLi4uYXJnczogUCk6IFIgPT4ge1xuICAgIGNvbnN0IGlkID0gbm90aWZ5KCk7XG4gICAgY29uc3QgaG9va3MgPSAoY3VycmVudCBhcyBhbnkpW2hvb2tTeW1ib2xdIGFzIE1hcDxudW1iZXIsIEhvb2s+OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIGxldCBob29rID0gaG9va3MuZ2V0KGlkKSBhcyBIb29rPFAsIFIsIEg+IHwgdW5kZWZpbmVkO1xuICAgIGlmICghaG9vaykge1xuICAgICAgICBob29rID0gbmV3IEhvb2soaWQsIGN1cnJlbnQgYXMgSUhvb2tTdGF0ZTxIPiwgLi4uYXJncyk7XG4gICAgICAgIGhvb2tzLnNldChpZCwgaG9vayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvb2sudXBkYXRlKC4uLmFyZ3MpO1xufTtcblxuLyoqXG4gKiBAZW4gRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgY3VzdG9tIGhvb2tzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+S9nOaIkOeUqOODleOCoeOCr+ODiOODqumWouaVsFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgSUhvb2tTdGF0ZUNvbnRleHQsIEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBleHBvcnQgY29uc3QgdXNlTWVtbyA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICogICAgIHZhbHVlOiBUO1xuICogICAgIHZhbHVlczogdW5rbm93bltdO1xuICpcbiAqICAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICogICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICogICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgfVxuICpcbiAqICAgICB1cGRhdGUoZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKTogVCB7XG4gKiAgICAgICAgIGlmICh0aGlzLmhhc0NoYW5nZWQodmFsdWVzKSkge1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgfVxuICogICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAqICAgICB9XG4gKlxuICogICAgIGhhc0NoYW5nZWQodmFsdWVzOiB1bmtub3duW10gPSBbXSk6IGJvb2xlYW4ge1xuICogICAgICAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbHVlLCBpKSA9PiB0aGlzLnZhbHVlc1tpXSAhPT0gdmFsdWUpO1xuICogICAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBtYWtlSG9vayA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPik6ICguLi5hcmdzOiBQKSA9PiBSID0+IHtcbiAgICByZXR1cm4gdXNlLmJpbmQobnVsbCwgSG9vayk7XG59O1xuIiwiaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgTmV3SG9va1N0YXRlLCBIb29rU3RhdGVVcGRhdGVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVN0YXRlID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gICAgYXJncyE6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XTtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgaW5pdGlhbFZhbHVlOiBUKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMudXBkYXRlciA9IHRoaXMudXBkYXRlci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgICAgICBpbml0aWFsVmFsdWUgPSBpbml0aWFsVmFsdWUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWFrZUFyZ3MoaW5pdGlhbFZhbHVlKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKTogcmVhZG9ubHkgW1QsIEhvb2tTdGF0ZVVwZGF0ZXI8VD5dIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJncztcbiAgICB9XG5cbiAgICB1cGRhdGVyKHZhbHVlOiBOZXdIb29rU3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgW3ByZXZpb3VzVmFsdWVdID0gdGhpcy5hcmdzO1xuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB1cGRhdGVyRm4gPSB2YWx1ZSBhcyAocHJldmlvdXNTdGF0ZT86IFQpID0+IFQ7XG4gICAgICAgICAgICB2YWx1ZSA9IHVwZGF0ZXJGbihwcmV2aW91c1ZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWVwRXF1YWwocHJldmlvdXNWYWx1ZSwgdmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICB9XG5cbiAgICBtYWtlQXJncyh2YWx1ZTogVCk6IHZvaWQge1xuICAgICAgICB0aGlzLmFyZ3MgPSBPYmplY3QuZnJlZXplKFt2YWx1ZSwgdGhpcy51cGRhdGVyXSBhcyBjb25zdCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxufSkgYXMgPFQ+KGluaXRpYWxTdGF0ZT86IFQpID0+IHJlYWRvbmx5IFtcbiAgICBUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFIpID8gUiA6IFQsXG4gICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG5dO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LWZ1bmN0aW9uLXJldHVybi10eXBlLFxuICovXG5cbmltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuXG50eXBlIEVmZmVjdCA9ICh0aGlzOiBTdGF0ZSkgPT4gdm9pZCB8IFZvaWRGdW5jdGlvbiB8IFByb21pc2U8dm9pZD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVFZmZlY3QgPSAoc2V0RWZmZWN0czogKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKSA9PiB2b2lkKSA9PiB7XG4gICAgcmV0dXJuIG1ha2VIb29rKGNsYXNzIGV4dGVuZHMgSG9vayB7XG4gICAgICAgIGNhbGxiYWNrITogRWZmZWN0O1xuICAgICAgICBsYXN0VmFsdWVzPzogdW5rbm93bltdO1xuICAgICAgICB2YWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIF90ZWFyZG93biE6IFByb21pc2U8dm9pZD4gfCBWb2lkRnVuY3Rpb24gfCB2b2lkO1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgaWdub3JlZDE6IEVmZmVjdCwgaWdub3JlZDI/OiB1bmtub3duW10pIHtcbiAgICAgICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgICAgICBzZXRFZmZlY3RzKHN0YXRlLCB0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZShjYWxsYmFjazogRWZmZWN0LCB2YWx1ZXM/OiB1bmtub3duW10pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICghdGhpcy52YWx1ZXMgfHwgdGhpcy5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sYXN0VmFsdWVzID0gdGhpcy52YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBydW4oKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnRlYXJkb3duKCk7XG4gICAgICAgICAgICB0aGlzLl90ZWFyZG93biA9IHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLnN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRlYXJkb3duKCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLl90ZWFyZG93bikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RlYXJkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBoYXNDaGFuZ2VkKCk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmxhc3RWYWx1ZXMgfHwgdGhpcy52YWx1ZXMhLnNvbWUoKHZhbHVlLCBpKSA9PiAhZGVlcEVxdWFsKHRoaXMubGFzdFZhbHVlcyFbaV0sIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgZWZmZWN0c1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQgeyBjcmVhdGVFZmZlY3QgfSBmcm9tICcuL2NyZWF0ZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3Qgc2V0RWZmZWN0cyA9IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSk6IHZvaWQgPT4ge1xuICAgIHN0YXRlW2VmZmVjdHNTeW1ib2xdLnB1c2goY2IpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUVmZmVjdCA9IGNyZWF0ZUVmZmVjdChzZXRFZmZlY3RzKTtcbiIsImltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBsYXlvdXRFZmZlY3RzU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCB7IGNyZWF0ZUVmZmVjdCB9IGZyb20gJy4vY3JlYXRlLWVmZmVjdCc7XG5cbmNvbnN0IHNldExheW91dEVmZmVjdHMgPSAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpOiB2b2lkID0+IHtcbiAgICBzdGF0ZVtsYXlvdXRFZmZlY3RzU3ltYm9sXS5wdXNoKGNiKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VMYXlvdXRFZmZlY3QgPSBjcmVhdGVFZmZlY3Qoc2V0TGF5b3V0RWZmZWN0cyk7XG4iLCJpbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VNZW1vID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gICAgdmFsdWU6IFQ7XG4gICAgdmFsdWVzOiB1bmtub3duW107XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgfVxuXG4gICAgaGFzQ2hhbmdlZCh2YWx1ZXM6IHVua25vd25bXSA9IFtdKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2YWx1ZXMuc29tZSgodmFsdWUsIGkpID0+IHRoaXMudmFsdWVzW2ldICE9PSB2YWx1ZSk7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfSA9IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHVzZU1lbW8oKCkgPT4gKHtcbiAgICBjdXJyZW50OiBpbml0aWFsVmFsdWVcbn0pLCBbXSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVFxuICAgID0gPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gdXNlTWVtbygoKSA9PiBmbiwgaW5wdXRzKTtcbiIsImltcG9ydCB0eXBlIHsgSG9va1JlZHVjZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlUmVkdWNlciA9IG1ha2VIb29rKGNsYXNzIDxTLCBJLCBBPiBleHRlbmRzIEhvb2sge1xuICAgIHJlZHVjZXIhOiBIb29rUmVkdWNlcjxTLCBBPjtcbiAgICBjdXJyZW50U3RhdGU6IFM7XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIF86IEhvb2tSZWR1Y2VyPFMsIEE+LCBpbml0aWFsU3RhdGU6IEksIGluaXQ/OiAoXzogSSkgPT4gUykge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoID0gdGhpcy5kaXNwYXRjaC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHVuZGVmaW5lZCAhPT0gaW5pdCA/IGluaXQoaW5pdGlhbFN0YXRlKSA6IGluaXRpYWxTdGF0ZSBhcyB1bmtub3duIGFzIFM7XG4gICAgfVxuXG4gICAgdXBkYXRlKHJlZHVjZXI6IEhvb2tSZWR1Y2VyPFMsIEE+KTogcmVhZG9ubHkgW1MsIChhY3Rpb246IEEpID0+IHZvaWRdIHtcbiAgICAgICAgdGhpcy5yZWR1Y2VyID0gcmVkdWNlcjtcbiAgICAgICAgcmV0dXJuIFt0aGlzLmN1cnJlbnRTdGF0ZSwgdGhpcy5kaXNwYXRjaF07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxuXG4gICAgZGlzcGF0Y2goYWN0aW9uOiBBKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gdGhpcy5yZWR1Y2VyKHRoaXMuY3VycmVudFN0YXRlLCBhY3Rpb24pO1xuICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgdHlwZSBEaXJlY3RpdmVSZXN1bHQsIG5vQ2hhbmdlIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElIb29rQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmNsYXNzIEhvb2tDb250ZXh0PFQ+IGltcGxlbWVudHMgSUhvb2tDb250ZXh0PFQ+IHtcbiAgICByZWFkb25seSBkZWZhdWx0VmFsdWU6IFQgfCB1bmRlZmluZWQ7XG4gICAgcHJpdmF0ZSBfdmFsdWU6IFQ7XG5cbiAgICBjb25zdHJ1Y3RvcihkZWZhdWx0VmFsdWU/OiBUKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZSA9IHRoaXMucHJvdmlkZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmNvbnN1bWUgPSB0aGlzLmNvbnN1bWUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWUgPSBkZWZhdWx0VmFsdWU7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gZGVmYXVsdFZhbHVlIGFzIFQ7XG4gICAgfVxuXG4gICAgcHJvdmlkZSh2YWx1ZTogVCwgY2FsbGJhY2s/OiAodmFsdWU6IFQpID0+IERpcmVjdGl2ZVJlc3VsdCk6IERpcmVjdGl2ZVJlc3VsdCB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKGNhbGxiYWNrKSA/IGNhbGxiYWNrKHZhbHVlKSA6IG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIGNvbnN1bWUoY2FsbGJhY2s6ICh2YWx1ZTogVCkgPT4gRGlyZWN0aXZlUmVzdWx0IHwgdm9pZCk6IERpcmVjdGl2ZVJlc3VsdCB8IHZvaWQge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sodGhpcy5fdmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUNvbnRleHQgPSA8VD4oZGVmYXVsdFZhbHVlPzogVCk6IElIb29rQ29udGV4dDxUPiA9PiB7XG4gICAgcmV0dXJuIG5ldyBIb29rQ29udGV4dChkZWZhdWx0VmFsdWUpO1xufTtcbiIsImltcG9ydCB0eXBlIHsgSUhvb2tDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IHNldEVmZmVjdHMgfSBmcm9tICcuL3VzZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlQ29udGV4dCA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2s8W0lIb29rQ29udGV4dDxUPl0sIFQsIHVua25vd24+IHtcbiAgICBwcml2YXRlIF9yYW5FZmZlY3Q6IGJvb2xlYW47XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIF86IElIb29rQ29udGV4dDxUPikgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLl9yYW5FZmZlY3QgPSBmYWxzZTtcbiAgICAgICAgc2V0RWZmZWN0cyhzdGF0ZSwgdGhpcyk7XG4gICAgfVxuXG4gICAgdXBkYXRlKGNvbnRleHQ6IElIb29rQ29udGV4dDxUPik6IFQge1xuICAgICAgICBsZXQgcmV0dmFsITogVDtcbiAgICAgICAgY29udGV4dC5jb25zdW1lKHZhbHVlID0+IHsgcmV0dmFsID0gdmFsdWU7IH0pO1xuICAgICAgICByZXR1cm4gcmV0dmFsO1xuICAgIH1cblxuICAgIGNhbGwoKTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5fcmFuRWZmZWN0KSB7XG4gICAgICAgICAgICB0aGlzLl9yYW5FZmZlY3QgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIEhvb2tTdGF0ZVVwZGF0ZXIsXG4gICAgSG9va1JlZHVjZXIsXG4gICAgSUhvb2tDb250ZXh0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaG9va3NXaXRoIH0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICcuL3VzZS1zdGF0ZSc7XG5pbXBvcnQgeyB1c2VFZmZlY3QgfSBmcm9tICcuL3VzZS1lZmZlY3QnO1xuaW1wb3J0IHsgdXNlTGF5b3V0RWZmZWN0IH0gZnJvbSAnLi91c2UtbGF5b3V0LWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5pbXBvcnQgeyB1c2VSZWYgfSBmcm9tICcuL3VzZS1yZWYnO1xuaW1wb3J0IHsgdXNlQ2FsbGJhY2sgfSBmcm9tICcuL3VzZS1jYWxsYmFjayc7XG5pbXBvcnQgeyB1c2VSZWR1Y2VyIH0gZnJvbSAnLi91c2UtcmVkdWNlcic7XG5pbXBvcnQgeyBjcmVhdGVDb250ZXh0IH0gZnJvbSAnLi9jcmVhdGUtY29udGV4dCc7XG5pbXBvcnQgeyB1c2VDb250ZXh0IH0gZnJvbSAnLi91c2UtY29udGV4dCc7XG5leHBvcnQgKiBmcm9tICcuL2ludGVyZmFjZXMnO1xuZXhwb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuXG4vKipcbiAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IHBhcml0eSB3aXRoIHRoZSBSZWFjdCBob29rcyBjb25jZXB0LlxuICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+m1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAqXG4gKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAqICAgICBjb25zdCBbY291bnQsIHNldENvdW50XSA9IHVzZVN0YXRlKDApO1xuICogICAgIHJldHVybiBodG1sYFxuICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAqICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInN0YXRlLXBsdXNcIiBAY2xpY2s9JHsoKSA9PiBzZXRDb3VudChwcmV2Q291bnQgPT4gcHJldkNvdW50ISArIDEpfT7inpU8L2J1dHRvbj5cbiAqICAgICBgO1xuICogfVxuICpcbiAqIC8vIHJlbmRlciB3aXRoIGhvb2tzXG4gKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rcyB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuIDxicj5cbiAgICAgKiAgICAgQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguXG4gICAgICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+myA8YnI+XG4gICAgICogICAgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqBcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gICAgICogY29uc3QgeyB1c2VTdGF0ZSB9ID0gaG9va3M7XG4gICAgICpcbiAgICAgKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAgICAgKiBmdW5jdGlvbiBBcHAoKSB7XG4gICAgICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gICAgICogICAgIHJldHVybiBodG1sYFxuICAgICAqICAgICAgICAgPHA+Q291bnQ6ICR7IGNvdW50IH08L3A+XG4gICAgICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICAgICAqICAgICBgO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzXG4gICAgICogcmVuZGVyKGhvb2tzKEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlbmRlcmVyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHJldHVybnMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44KS6L+U5Y2044GZ44KL6Zai5pWw44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIEFyZ3VtZW50cyBwYXNzZWQgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBq+OCj+OBn+OCi+W8leaVsFxuICAgICAqL1xuICAgIChyZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pOiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFkZCBIb29rcyBmZWF0dXJlIHRvIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4LiAoc3BlY2lmeSBhIERPTSBkaXNjb25uZWN0IGRldGVjdGlvbiBlbGVtZW50KVxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgasgSG9va3Mg5qmf6IO944KS5LuY5YqgIChET00g5YiH5pat5qSc55+l6KaB57Sg44KS5oyH5a6aKVxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBjb25zdCBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzb21lLXBhZ2UnKTtcbiAgICAgKiAvLyBlbmFibGluZyBob29rcyB3aXRoIHJvb3QgZWxlbWVudFxuICAgICAqIHJlbmRlcihob29rcy53aXRoKGVsLCBBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlbFJvb3RcbiAgICAgKiAgLSBgZW5gIFJvb3QgZWxlbWVudCB1c2VkIGZvciBET00gZGlzY29ubmVjdGlvbiBkZXRlY3Rpb24uIElmIGBudWxsYCBwYXNzZWQsIGBkb2N1bWVudGAgaXMgc3BlY2lmaWVkXG4gICAgICogIC0gYGphYCBET00g5YiH5pat5qSc55+l44Gr5L2/55So44GZ44KL44Or44O844OI6KaB57SgLiBgbnVsbGAg44GM5rih44KL44GoIGBkb2N1bWVudGAg44GM5oyH5a6a44GV44KM44KLXG4gICAgICogQHBhcmFtIHJlbmRlcmVyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHJldHVybnMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44KS6L+U5Y2044GZ44KL6Zai5pWw44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIEFyZ3VtZW50cyBwYXNzZWQgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBq+OCj+OBn+OCi+W8leaVsFxuICAgICAqL1xuICAgIHdpdGg6IChlbFJvb3Q6IE5vZGUgfCBudWxsLCByZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJuIGEgc3RhdGVmdWwgdmFsdWUgYW5kIGEgZnVuY3Rpb24gdG8gdXBkYXRlIGl0LlxuICAgICAqIEBqYSDjgrnjg4bjg7zjg4jjg5Xjg6vjgarlgKTjgajjgIHjgZ3jgozjgpLmm7TmlrDjgZnjgovjgZ/jgoHjga7plqLmlbDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbml0aWFsU3RhdGVcbiAgICAgKiAgLSBgZW5gIFRoZSB2YWx1ZSB5b3Ugd2FudCB0aGUgc3RhdGUgdG8gYmUgaW5pdGlhbGx5LlxuICAgICAqICAtIGBqYWAg54q25oWL44Gu5Yid5pyf5YyW5YCkXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHJldHVybnMgYW4gYXJyYXkgd2l0aCBleGFjdGx5IHR3byB2YWx1ZXMuIFtgY3VycmVudFN0YXRlYCwgYHVwZGF0ZUZ1bmN0aW9uYF1cbiAgICAgKiAgLSBgamFgIDLjgaTjga7lgKTjgpLmjIHjgaTphY3liJfjgpLov5TljbQgW2BjdXJyZW50U3RhdGVgLCBgdXBkYXRlRnVuY3Rpb25gXVxuICAgICAqL1xuICAgIHVzZVN0YXRlOiA8VD4oaW5pdGlhbFN0YXRlPzogVCkgPT4gcmVhZG9ubHkgW1xuICAgICAgICBUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFIpID8gUiA6IFQsXG4gICAgICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuICAgIF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXB0cyBhIGZ1bmN0aW9uIHRoYXQgY29udGFpbnMgaW1wZXJhdGl2ZSwgcG9zc2libHkgZWZmZWN0ZnVsIGNvZGUuXG4gICAgICogQGphIOWJr+S9nOeUqOOCkuacieOBmeOCi+WPr+iDveaAp+OBruOBguOCi+WRveS7pOWei+OBruOCs+ODvOODieOBrumBqeeUqFxuICAgICAqXG4gICAgICogQHBhcmFtIGVmZmVjdFxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBydW5zIGVhY2ggdGltZSBkZXBlbmRlbmNpZXMgY2hhbmdlXG4gICAgICogIC0gYGphYCDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgovjgZ/jgbPjgavlrp/ooYzjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzXG4gICAgICogIC0gYGVuYCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byB0aGUgZWZmZWN0XG4gICAgICogIC0gYGphYCDlia/kvZznlKjnmbrngavjga7jg4jjg6rjgqzjg7zjgajjgarjgovkvp3lrZjplqLkv4Ljga7jg6rjgrnjg4hcbiAgICAgKi9cbiAgICB1c2VFZmZlY3Q6IChlZmZlY3Q6ICgpID0+IHZvaWQsIGRlcGVuZGVuY2llcz86IHVua25vd25bXSkgPT4gdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBjb250YWlucyBpbXBlcmF0aXZlLCBwb3NzaWJseSBlZmZlY3RmdWwgY29kZS4gPGJyPlxuICAgICAqICAgICBVbmxpa2Uge0BsaW5rIEhvb2tzLnVzZUVmZmVjdH0gLCBpdCBpcyBleGVjdXRlZCBiZWZvcmUgdGhlIGNvbXBvbmVudCBpcyByZW5kZXJlZCBhbmQgdGhlIG5ldyBlbGVtZW50IGlzIGRpc3BsYXllZCBvbiB0aGUgc2NyZWVuLlxuICAgICAqIEBqYSDlia/kvZznlKjjgpLmnInjgZnjgovlj6/og73mgKfjga7jgYLjgovlkb3ku6Tlnovjga7jgrPjg7zjg4njga7pgannlKggPGJyPlxuICAgICAqICAgICB7QGxpbmsgSG9va3MudXNlRWZmZWN0fSDjgajnlbDjgarjgoosIOOCs+ODs+ODneODvOODjeODs+ODiOOBjOODrOODs+ODgOODquODs+OCsOOBleOCjOOBpuaWsOOBl+OBhOimgee0oOOBjOeUu+mdouOBq+ihqOekuuOBleOCjOOCi+WJjeOBq+Wun+ihjOOBleOCjOOCi+OAglxuICAgICAqXG4gICAgICogQHBhcmFtIGVmZmVjdFxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBydW5zIGVhY2ggdGltZSBkZXBlbmRlbmNpZXMgY2hhbmdlXG4gICAgICogIC0gYGphYCDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgovjgZ/jgbPjgavlrp/ooYzjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzXG4gICAgICogIC0gYGVuYCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byB0aGUgZWZmZWN0XG4gICAgICogIC0gYGphYCDlia/kvZznlKjnmbrngavjga7jg4jjg6rjgqzjg7zjgajjgarjgovkvp3lrZjplqLkv4Ljga7jg6rjgrnjg4hcbiAgICAgKi9cbiAgICB1c2VMYXlvdXRFZmZlY3Q6IChlZmZlY3Q6ICgpID0+IHZvaWQsIGRlcGVuZGVuY2llcz86IHVua25vd25bXSkgPT4gdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVc2VkIHRvIHJlZHVjZSBjb21wb25lbnQgcmUtcmVuZGVyaW5nLiA8YnI+XG4gICAgICogICAgIENhY2hlIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gdGhlIGNhY2hlZCB2YWx1ZSB3aGVuIGNhbGxlZCB3aXRoIHRoZSBzYW1lIGFyZ3VtZW50cy5cbiAgICAgKiBAamEg44Kz44Oz44Od44O844ON44Oz44OI44Gu5YaN44Os44Oz44OA44Oq44Oz44Kw44KS5oqR44GI44KL44Gf44KB44Gr5L2/55SoIDxicj5cbiAgICAgKiAgICAg6Zai5pWw44Gu5oi744KK5YCk44KS44Kt44Oj44OD44K344Ol44GX44CB5ZCM44GY5byV5pWw44Gn5ZG844Gz5Ye644GV44KM44Gf5aC05ZCI44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gf5YCk44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWApOOCkui/lOOBmemWouaVsFxuICAgICAqIEBwYXJhbSB2YWx1ZXNcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5IG9mIHZhbHVlcyB0aGF0IGFyZSB1c2VkIGFzIGFyZ3VtZW50cyBmb3IgYGZuYFxuICAgICAqICAtIGBqYWAgYGZuYCDjga7lvJXmlbDjgajjgZfjgabkvb/nlKjjgZXjgozjgovlgKTjga7phY3liJdcbiAgICAgKi9cbiAgICB1c2VNZW1vOiA8VD4oZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKSA9PiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIExldHMgeW91IHJlZmVyZW5jZSBhIHZhbHVlIHRoYXTigJlzIG5vdCBuZWVkZWQgZm9yIHJlbmRlcmluZy4gPGJyPlxuICAgICAqICAgICBNYWlubHkgYXZhaWxhYmxlIGZvciBhY2Nlc3NpbmcgRE9NIG5vZGVzLlxuICAgICAqIEBqYSDjg6zjg7Pjg4Djg6rjg7PjgrDjgavkuI3opoHjgarlgKTjgpLlj4Lnhaflj6/og73jgavjgZnjgos8YnI+XG4gICAgICogICAgIOS4u+OBqyBET00g44OO44O844OJ44G444Gu44Ki44Kv44K744K544Gr5Yip55So5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFZhbHVlXG4gICAgICogIC0gYGVuYCBUaGUgaW5pdGlhbCB2YWx1ZSBvZiB0aGUgcmVmZXJlbmNlXG4gICAgICogIC0gYGphYCDlj4Lnhafjga7liJ3mnJ/lgKRcbiAgICAgKi9cbiAgICB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGEgbWVtb2l6ZWQgdmVyc2lvbiBvZiB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBvbmx5IGNoYW5nZXMgaWYgdGhlIGRlcGVuZGVuY2llcyBjaGFuZ2UuIDxicj5cbiAgICAgKiAgICAgVXNlZnVsIGZvciBwYXNzaW5nIGNhbGxiYWNrcyB0byBvcHRpbWl6ZWQgY2hpbGQgY29tcG9uZW50cyB0aGF0IHJlbHkgb24gcmVmZXJlbnRpYWwgZXF1YWxpdHkuXG4gICAgICogQGphIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOBn+WgtOWQiOOBq+OBruOBv+WkieabtOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBruODoeODouWMluODkOODvOOCuOODp+ODs+OCkui/lOWNtCA8YnI+XG4gICAgICogICAgIOWPgueFp+etieS+oeaAp+OBq+S+neWtmOOBmeOCi+acgOmBqeWMluOBleOCjOOBn+WtkOOCs+ODs+ODneODvOODjeODs+ODiOOBq+OCs+ODvOODq+ODkOODg+OCr+OCkua4oeOBmeWgtOWQiOOBq+W9ueeri+OBpFxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogIC0gYGVuYCBUaGUgZnVuY3Rpb24gdG8gbWVtb2l6ZVxuICAgICAqICAtIGBqYWAg44Oh44Oi5YyW44GZ44KL6Zai5pWwXG4gICAgICogQHBhcmFtIGlucHV0c1xuICAgICAqICAtIGBlbmAgQW4gYXJyYXkgb2YgaW5wdXRzIHRvIHdhdGNoIGZvciBjaGFuZ2VzXG4gICAgICogIC0gYGphYCDlpInmm7TjgpLnm6PoppbjgZnjgovlhaXlipvjga7phY3liJdcbiAgICAgKi9cbiAgICB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBIb29rIEFQSSBmb3IgbWFuYWdpbmcgc3RhdGUgaW4gZnVuY3Rpb24gY29tcG9uZW50cy5cbiAgICAgKiBAamEg6Zai5pWw44Kz44Oz44Od44O844ON44Oz44OI44Gn54q25oWL44KS566h55CG44GZ44KL44Gf44KB44GuIEhvb2sgQVBJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVkdWNlclxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZCBhbiBhY3Rpb24gYW5kIHJldHVybnMgYSBuZXcgc3RhdGVcbiAgICAgKiAgLSBgamFgIOePvuWcqOOBrueKtuaFi+OBqOOCouOCr+OCt+ODp+ODs+OCkuWPl+OBkeWPluOCiuOAgeaWsOOBl+OBhOeKtuaFi+OCkui/lOOBmemWouaVsFxuICAgICAqIEBwYXJhbSBpbml0aWFsU3RhdGVcbiAgICAgKiAgLSBgZW5gIFRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y2VyXG4gICAgICogIC0gYGphYCDjg6rjg4fjg6Xjg7zjgrXjg7zjga7liJ3mnJ/nirbmhYvjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gaW5pdFxuICAgICAqICAtIGBlbmAgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y2VyXG4gICAgICogIC0gYGphYCDjg6rjg4fjg6Xjg7zjgrXjg7zjga7liJ3mnJ/nirbmhYvjgpLov5TjgZnjgqrjg5fjgrfjg6fjg7Pjga7plqLmlbBcbiAgICAgKi9cbiAgICB1c2VSZWR1Y2VyOiA8UywgSSwgQT4ocmVkdWNlcjogSG9va1JlZHVjZXI8UywgQT4sIGluaXRpYWxTdGF0ZTogSSwgaW5pdD86ICgoXzogSSkgPT4gUykpID0+IHJlYWRvbmx5IFtTLCAoYWN0aW9uOiBBKSA9PiB2b2lkXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBDcmVhdGUgYSBuZXcgY29udGV4dCBvYmplY3QuIENvbnRleHQgb2JqZWN0cyBhcmUgdXNlZCB0byBzaGFyZSBkYXRhIHRoYXQgaXMgY29uc2lkZXJlZCBcImdsb2JhbFwiLlxuICAgICAqIEBqYSDmlrDjgZfjgYTjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjgpLkvZzmiJDjgZnjgovjgILjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjga8s44CM44Kw44Ot44O844OQ44Or44CN44Go6ICD44GI44KJ44KM44KL44OH44O844K/44KS5YWx5pyJ44GZ44KL44Gf44KB44Gr5L2/55So44GV44KM44KL44CCXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZGVmYXVsdFZhbHVlXG4gICAgICogIC0gYGVuYDogVGhlIGRlZmF1bHQgdmFsdWUgZm9yIHRoZSBjb250ZXh0IG9iamVjdFxuICAgICAqICAtIGBqYWA6IOOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBruODh+ODleOCqeODq+ODiOWApFxuICAgICAqL1xuICAgIGNyZWF0ZUNvbnRleHQ6IDxUPihkZWZhdWx0VmFsdWU/OiBUKSA9PiBJSG9va0NvbnRleHQ8VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCBjb250ZXh0IHZhbHVlIGZvciB0aGUgc3BlY2lmaWVkIGNvbnRleHQgb2JqZWN0LlxuICAgICAqIEBqYSDmjIflrprjgZXjgozjgZ/jgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjgavlr77jgZnjgovnj77lnKjjga7jgrPjg7Pjg4bjgq3jgrnjg4jlgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjb250ZXh0XG4gICAgICogIC0gYGVuYDogdGhlIGNvbnRleHQgb2JqZWN0IHJldHVybmVkIGZyb20ge0BsaW5rIEhvb2tzLmNyZWF0ZUNvbnRleHR9XG4gICAgICogIC0gYGphYDoge0BsaW5rIEhvb2tzLmNyZWF0ZUNvbnRleHR9IOOBi+OCiei/lOOBleOCjOOCi+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqL1xuICAgIHVzZUNvbnRleHQ6IDxUPihjb250ZXh0OiBJSG9va0NvbnRleHQ8VD4pID0+IFQ7XG59XG5cbmNvbnN0IGhvb2tzOiBIb29rcyA9IGhvb2tzV2l0aC5iaW5kKG51bGwsIG51bGwpO1xuaG9va3Mud2l0aCAgICAgICAgICAgID0gaG9va3NXaXRoO1xuaG9va3MudXNlU3RhdGUgICAgICAgID0gdXNlU3RhdGU7XG5ob29rcy51c2VFZmZlY3QgICAgICAgPSB1c2VFZmZlY3Q7XG5ob29rcy51c2VMYXlvdXRFZmZlY3QgPSB1c2VMYXlvdXRFZmZlY3Q7XG5ob29rcy51c2VNZW1vICAgICAgICAgPSB1c2VNZW1vO1xuaG9va3MudXNlUmVmICAgICAgICAgID0gdXNlUmVmO1xuaG9va3MudXNlQ2FsbGJhY2sgICAgID0gdXNlQ2FsbGJhY2s7XG5ob29rcy51c2VSZWR1Y2VyICAgICAgPSB1c2VSZWR1Y2VyO1xuaG9va3MuY3JlYXRlQ29udGV4dCAgID0gY3JlYXRlQ29udGV4dDtcbmhvb2tzLnVzZUNvbnRleHQgICAgICA9IHVzZUNvbnRleHQ7XG5cbmV4cG9ydCB7IGhvb2tzIH07XG4iXSwibmFtZXMiOlsiJCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBYUE7QUFD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