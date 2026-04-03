/*!
 * @cdp/template 0.9.22
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
    return (...args) => use(Hook, ...args);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUubWpzIiwic291cmNlcyI6WyJicmlkZ2UudHMiLCJsb2FkZXIudHMiLCJob29rcy9jdXJyZW50LnRzIiwiaG9va3Mvc3ltYm9scy50cyIsImhvb2tzL3N0YXRlLnRzIiwiaG9va3MvZGlyZWN0aXZlLnRzIiwiaG9va3MvaG9vay50cyIsImhvb2tzL3VzZS1zdGF0ZS50cyIsImhvb2tzL2NyZWF0ZS1lZmZlY3QudHMiLCJob29rcy91c2UtZWZmZWN0LnRzIiwiaG9va3MvdXNlLWxheW91dC1lZmZlY3QudHMiLCJob29rcy91c2UtbWVtby50cyIsImhvb2tzL3VzZS1yZWYudHMiLCJob29rcy91c2UtY2FsbGJhY2sudHMiLCJob29rcy91c2UtcmVkdWNlci50cyIsImhvb2tzL2NyZWF0ZS1jb250ZXh0LnRzIiwiaG9va3MvdXNlLWNvbnRleHQudHMiLCJob29rcy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIHR5cGUgVGVtcGxhdGVSZXN1bHQsXG4gICAgdHlwZSBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBodG1sLFxuICAgIGRpcmVjdGl2ZXMsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB7XG4gICAgdHlwZSBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlJztcbmltcG9ydCB0eXBlIHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsIGJ1aWx0aW4gdHJhbnNmb3JtZXJzIChkZWZhdWx0OiBtdXN0YWNoZSkuICovXG5jb25zdCBfYnVpbHRpbnM6IFJlY29yZDxzdHJpbmcsIFRlbXBsYXRlVHJhbnNmb3JtZXI+ID0ge1xuICAgIG11c3RhY2hlOiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWwsIGRpcmVjdGl2ZXMudW5zYWZlSFRNTCksXG4gICAgc3RhbXBpbm86IGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIoKSxcbn07XG5cbi8qKlxuICogQGVuIENvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUgaW50ZXJmYWNlXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/44OG44Oz44OX44Os44O844OI5qC857SN44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFNvdXJjZSB0ZW1wbGF0ZSBzdHJpbmdcbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICovXG4gICAgc291cmNlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBUZW1wbGF0ZVJlc3VsdH0gdGhhdCBhcHBsaWVkIGdpdmVuIHBhcmFtZXRlcihzKS5cbiAgICAgKiBAamEg44OR44Op44Oh44O844K/44KS6YGp55So44GXIHtAbGluayBUZW1wbGF0ZVJlc3VsdH0g44G45aSJ5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlld1xuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgcGFyYW1ldGVycyBmb3Igc291cmNlLlxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQ7XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBUZW1wbGF0ZUJyaWRnZX0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEge0BsaW5rIFRlbXBsYXRlQnJpZGdlfSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0cmFuc2Zvcm1lcj86IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIGJyaWRnZSBmb3Igb3RoZXIgdGVtcGxhdGUgZW5naW5lIHNvdXJjZS5cbiAqIEBqYSDku5bjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg7Pjgrjjg7Pjga7lhaXlipvjgpLlpInmj5vjgZnjgovjg4bjg7Pjg5fjg6zjg7zjg4jjg5bjg6rjg4Pjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlQnJpZGdlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgX3RyYW5zZm9ybWVyID0gX2J1aWx0aW5zLm11c3RhY2hlO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgQ29tcGlsZWRUZW1wbGF0ZX0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSB7QGxpbmsgQ29tcGlsZWRUZW1wbGF0ZX0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmcgLyB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJcgLyDjg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg6zjg6Hjg7Pjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zKTogQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNmb3JtZXIgfSA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2Zvcm1lcjogVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyIH0sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBlbmdpbmUgPSB0cmFuc2Zvcm1lcih0ZW1wbGF0ZSk7XG4gICAgICAgIGNvbnN0IGpzdCA9ICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBlbmdpbmUodmlldyk7XG4gICAgICAgIH07XG4gICAgICAgIGpzdC5zb3VyY2UgPSB0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGRlZmF1bHQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDml6Llrprjga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdUcmFuc2Zvcm1lclxuICAgICAqICAtIGBlbmAgbmV3IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOS7peWJjeOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2V0VHJhbnNmb3JtZXIobmV3VHJhbnNmb3JtZXI6IFRlbXBsYXRlVHJhbnNmb3JtZXIpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICAgICAgY29uc3Qgb2xkVHJhbnNmb3JtZXIgPSBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXI7XG4gICAgICAgIFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciA9IG5ld1RyYW5zZm9ybWVyO1xuICAgICAgICByZXR1cm4gb2xkVHJhbnNmb3JtZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBuYW1lIGxpc3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeensOS4gOimp+OCkuWPluW+l1xuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG5hbWUgbGlzdC5cbiAgICAgKiAgLSBgamFgIOWQjeensOS4gOimp+OCkui/lOWNtFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgYnVpbHRpbnMoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoX2J1aWx0aW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0IG5hbWUuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY3jgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0QnVpdGluVHJhbnNmb3JtZXIobmFtZTogc3RyaW5nKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfYnVpbHRpbnNbbmFtZV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5lc2NhcGVIVE1MLCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBKU1QsXG4gICAgdHlwZSBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLFxuICAgIFRlbXBsYXRlRW5naW5lLFxufSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuaW1wb3J0IHsgdHlwZSBMb2FkVGVtcGxhdGVPcHRpb25zLCBsb2FkVGVtcGxhdGVTb3VyY2UgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5leHBvcnQgeyBjbGVhclRlbXBsYXRlQ2FjaGUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgQ29tcGlsZWRUZW1wbGF0ZSxcbiAgICB0eXBlIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVCcmlkZ2UsXG59IGZyb20gJy4vYnJpZGdlJztcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBsaXN0LlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlUeXBlTGlzdCB7XG4gICAgZW5naW5lOiBKU1Q7XG4gICAgYnJpZGdlOiBDb21waWxlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGRlZmluaXRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+aMh+WumuWtkFxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSBrZXlvZiBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IG9wdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeU9wdGlvbnM8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcz4gZXh0ZW5kcyBMb2FkVGVtcGxhdGVPcHRpb25zLCBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLCBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBgZW5naW5lYCAvICdicmlkZ2UnXG4gICAgICovXG4gICAgdHlwZT86IFQ7XG4gICAgLyoqXG4gICAgICogQGVuIHRlbXBsYXRlIGxvYWQgY2FsbGJhY2suIGBicmlkZ2VgIG1vZGUgYWxsb3dzIGxvY2FsaXphdGlvbiBoZXJlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4joqq3jgb/ovrzjgb/jgrPjg7zjg6vjg5Djg4Pjgq8uIGBicmlkZ2VgIOODouODvOODieOBp+OBr+OBk+OBk+OBp+ODreODvOOCq+ODqeOCpOOCuuOBjOWPr+iDvVxuICAgICAqL1xuICAgIGNhbGxiYWNrPzogKHNyYzogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCkgPT4gc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IFByb21pc2U8c3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudD47XG59XG5cbi8qKlxuICogQGVuIEdldCBjb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlLlxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBvyBKYXZhU2NyaXB0IOODhuODs+ODl+ODrOODvOODiOWPluW+l1xuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBUaGUgc2VsZWN0b3Igc3RyaW5nIG9mIERPTS5cbiAqICAtIGBqYWAgRE9NIOOCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFRlbXBsYXRlPFQgZXh0ZW5kcyBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSAnZW5naW5lJz4oXG4gICAgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlUXVlcnlPcHRpb25zPFQ+XG4pOiBQcm9taXNlPFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXT4ge1xuICAgIGNvbnN0IHsgdHlwZSwgdXJsLCBub0NhY2hlLCBjYWxsYmFjayB9ID0gT2JqZWN0LmFzc2lnbih7IHR5cGU6ICdlbmdpbmUnLCBub0NhY2hlOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICBsZXQgc3JjID0gYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybCwgbm9DYWNoZSB9KTtcbiAgICBpZiAoIXNyYykge1xuICAgICAgICB0aHJvdyBuZXcgVVJJRXJyb3IoYGNhbm5vdCBzcGVjaWZpZWQgdGVtcGxhdGUgcmVzb3VyY2UuIHsgc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCAgdXJsOiAke3VybH0gfWApO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBzcmMgPSBhd2FpdCBjYWxsYmFjayhzcmMpO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdlbmdpbmUnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoc3JjIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHVuZXNjYXBlSFRNTChzcmMuaW5uZXJIVE1MKSA6IHNyYywgb3B0aW9ucykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBjYXNlICdicmlkZ2UnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlQnJpZGdlLmNvbXBpbGUoc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBbdHlwZTogJHt0eXBlfV0gaXMgdW5rbm93bi5gKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5sZXQgX2N1cnJlbnRJZCA9IDA7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBsZXQgY3VycmVudDogSUhvb2tTdGF0ZSB8IG51bGw7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRDdXJyZW50ID0gKHN0YXRlOiBJSG9va1N0YXRlKTogdm9pZCA9PiB7XG4gICAgY3VycmVudCA9IHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyQ3VycmVudCA9ICgpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gbnVsbDtcbiAgICBfY3VycmVudElkID0gMDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBub3RpZnkgPSAoKTogbnVtYmVyID0+IHtcbiAgICByZXR1cm4gX2N1cnJlbnRJZCsrO1xufTtcbiIsIi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rU3ltYm9sID0gU3ltYm9sKCdob29rJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnZWZmZWN0cycpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGxheW91dEVmZmVjdHNTeW1ib2wgPSBTeW1ib2woJ2xheW91dEVmZmVjdHMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRWZmZWN0c1N5bWJvbHMgPSB0eXBlb2YgZWZmZWN0c1N5bWJvbCB8IHR5cGVvZiBsYXlvdXRFZmZlY3RzU3ltYm9sO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgeyBzZXRDdXJyZW50LCBjbGVhckN1cnJlbnQgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEVmZmVjdHNTeW1ib2xzLFxuICAgIGhvb2tTeW1ib2wsXG4gICAgZWZmZWN0c1N5bWJvbCxcbiAgICBsYXlvdXRFZmZlY3RzU3ltYm9sLFxufSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgaW50ZXJmYWNlIENhbGxhYmxlIHtcbiAgICBjYWxsOiAoc3RhdGU6IFN0YXRlKSA9PiB2b2lkO1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY2xhc3MgU3RhdGU8SCA9IHVua25vd24+IGltcGxlbWVudHMgSUhvb2tTdGF0ZTxIPiB7XG4gICAgdXBkYXRlOiBWb2lkRnVuY3Rpb247XG4gICAgaG9zdDogSDtcbiAgICB2aXJ0dWFsPzogYm9vbGVhbjtcbiAgICBbaG9va1N5bWJvbF06IE1hcDxudW1iZXIsIEhvb2s+O1xuICAgIFtlZmZlY3RzU3ltYm9sXTogQ2FsbGFibGVbXTtcbiAgICBbbGF5b3V0RWZmZWN0c1N5bWJvbF06IENhbGxhYmxlW107XG5cbiAgICBjb25zdHJ1Y3Rvcih1cGRhdGU6IFZvaWRGdW5jdGlvbiwgaG9zdDogSCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSA9IHVwZGF0ZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gaG9zdDtcbiAgICAgICAgdGhpc1tob29rU3ltYm9sXSA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpc1tlZmZlY3RzU3ltYm9sXSA9IFtdO1xuICAgICAgICB0aGlzW2xheW91dEVmZmVjdHNTeW1ib2xdID0gW107XG4gICAgfVxuXG4gICAgcnVuPFQ+KGNiOiAoKSA9PiBUKTogVCB7XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGNvbnN0IHJlcyA9IGNiKCk7XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIF9ydW5FZmZlY3RzKHBoYXNlOiBFZmZlY3RzU3ltYm9scyk6IHZvaWQge1xuICAgICAgICBjb25zdCBlZmZlY3RzID0gdGhpc1twaGFzZV07XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIGVmZmVjdHMpIHtcbiAgICAgICAgICAgIGVmZmVjdC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgIH1cblxuICAgIHJ1bkVmZmVjdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3J1bkVmZmVjdHMoZWZmZWN0c1N5bWJvbCk7XG4gICAgfVxuXG4gICAgcnVuTGF5b3V0RWZmZWN0cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcnVuRWZmZWN0cyhsYXlvdXRFZmZlY3RzU3ltYm9sKTtcbiAgICB9XG5cbiAgICB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaG9va3MgPSB0aGlzW2hvb2tTeW1ib2xdO1xuICAgICAgICBmb3IgKGNvbnN0IFssIGhvb2tdIG9mIGhvb2tzKSB7XG4gICAgICAgICAgICAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGhvb2sudGVhcmRvd24pICYmIGhvb2sudGVhcmRvd24oKTtcbiAgICAgICAgICAgIGRlbGV0ZSBob29rLnRlYXJkb3duO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFBhcnRJbmZvLFxuICAgIHR5cGUgRGlyZWN0aXZlUmVzdWx0LFxuICAgIEFzeW5jRGlyZWN0aXZlLFxuICAgIGRpcmVjdGl2ZSxcbiAgICBub0NoYW5nZSxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICBub29wLFxuICAgIHNjaGVkdWxlcixcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvbSBhcyAkIH0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuY29uc3Qgc2NoZWR1bGUgPSBzY2hlZHVsZXIoKTtcblxuaW50ZXJmYWNlIERpc2Nvbm5lY3RhYmxlIHtcbiAgICBfJHBhcmVudD86IERpc2Nvbm5lY3RhYmxlO1xuICAgIHBhcmVudE5vZGU6IEVsZW1lbnQ7XG59XG5cbmNsYXNzIEhvb2tEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhdGU6IFN0YXRlO1xuICAgIHByaXZhdGUgX3JlbmRlcmVyOiBVbmtub3duRnVuY3Rpb247XG4gICAgcHJpdmF0ZSBfYXJnczogdW5rbm93bltdO1xuICAgIHByaXZhdGUgX2VsT2JzZXJ2ZWQ/OiBOb2RlO1xuICAgIHByaXZhdGUgX2Rpc2Nvbm5lY3RlZEhhbmRsZXI/OiB0eXBlb2YgSG9va0RpcmVjdGl2ZS5wcm90b3R5cGUuZGlzY29ubmVjdGVkO1xuXG4gICAgY29uc3RydWN0b3IocGFydDogUGFydEluZm8pIHtcbiAgICAgICAgc3VwZXIocGFydCk7XG4gICAgICAgIHRoaXMuX3N0YXRlID0gbmV3IFN0YXRlKCgpID0+IHRoaXMucmVkcmF3KCksIHRoaXMpO1xuICAgICAgICB0aGlzLl9yZW5kZXJlciA9IG5vb3A7XG4gICAgICAgIHRoaXMuX2FyZ3MgPSBbXTtcbiAgICB9XG5cbiAgICByZW5kZXIoZWxSb290OiBOb2RlIHwgbnVsbCwgcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKTogRGlyZWN0aXZlUmVzdWx0IHtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSByZW5kZXJlcjtcbiAgICAgICAgdGhpcy5fYXJncyA9IGFyZ3M7XG4gICAgICAgIHRoaXMub2JzZXJ2ZShlbFJvb3QpO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGRpc2Nvbm5lY3RlZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCAmJiAkLnV0aWxzLnVuZGV0ZWN0aWZ5KHRoaXMuX2VsT2JzZXJ2ZWQpO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9zdGF0ZS50ZWFyZG93bigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVkcmF3KCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGF0ZS5ydW4oKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMuX3JlbmRlcmVyKC4uLnRoaXMuX2FyZ3MpO1xuICAgICAgICAgICAgdGhpcy5zZXRWYWx1ZShyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlLnJ1bkxheW91dEVmZmVjdHMoKTtcbiAgICAgICAgc2NoZWR1bGUoKCkgPT4gdGhpcy5fc3RhdGUucnVuRWZmZWN0cygpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9ic2VydmUoZWxSb290OiBOb2RlIHwgbnVsbCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBfJHBhcmVudCB9ID0gdGhpcyBhcyB1bmtub3duIGFzIERpc2Nvbm5lY3RhYmxlO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gXyRwYXJlbnQ/LnBhcmVudE5vZGU7XG4gICAgICAgIGlmICh0aGlzLl9lbE9ic2VydmVkKSB7XG4gICAgICAgICAgICAkLnV0aWxzLmRldGVjdGlmeSh0aGlzLl9lbE9ic2VydmVkLCBlbFJvb3QhKTtcbiAgICAgICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQuYWRkRXZlbnRMaXN0ZW5lcignZGlzY29ubmVjdGVkJywgdGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlciA9IHRoaXMuZGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgaG9va3NXaXRoID0gZGlyZWN0aXZlKEhvb2tEaXJlY3RpdmUpO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGN1cnJlbnQsIG5vdGlmeSB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQgeyBob29rU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdCBjbGFzcyBmb3IgQ3VzdG9tIEhvb2sgQ2xhc3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Kv44Op44K544Gu5Z+65bqV5oq96LGh44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBIb29rPFAgZXh0ZW5kcyB1bmtub3duW10gPSB1bmtub3duW10sIFIgPSB1bmtub3duLCBIID0gdW5rbm93bj4ge1xuICAgIGlkOiBudW1iZXI7XG4gICAgc3RhdGU6IElIb29rU3RhdGU8SD47XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZTxIPikge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICB9XG5cbiAgICBhYnN0cmFjdCB1cGRhdGUoLi4uYXJnczogUCk6IFI7XG4gICAgdGVhcmRvd24/KCk6IHZvaWQ7XG59XG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBkZWZpbml0aW9uIGZvciBjdXN0b20gaG9va3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIEN1c3RvbUhvb2s8UCBleHRlbmRzIHVua25vd25bXSA9IHVua25vd25bXSwgUiA9IHVua25vd24sIEggPSB1bmtub3duPiA9IG5ldyAoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGU8SD4sIC4uLmFyZ3M6IFApID0+IEhvb2s8UCwgUiwgSD47XG5cbmNvbnN0IHVzZSA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPiwgLi4uYXJnczogUCk6IFIgPT4ge1xuICAgIGNvbnN0IGlkID0gbm90aWZ5KCk7XG4gICAgY29uc3QgaG9va3MgPSAoY3VycmVudCBhcyBhbnkpW2hvb2tTeW1ib2xdIGFzIE1hcDxudW1iZXIsIEhvb2s+OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIGxldCBob29rID0gaG9va3MuZ2V0KGlkKSBhcyBIb29rPFAsIFIsIEg+IHwgdW5kZWZpbmVkO1xuICAgIGlmICghaG9vaykge1xuICAgICAgICBob29rID0gbmV3IEhvb2soaWQsIGN1cnJlbnQgYXMgSUhvb2tTdGF0ZTxIPiwgLi4uYXJncyk7XG4gICAgICAgIGhvb2tzLnNldChpZCwgaG9vayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvb2sudXBkYXRlKC4uLmFyZ3MpO1xufTtcblxuLyoqXG4gKiBAZW4gRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgY3VzdG9tIGhvb2tzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+S9nOaIkOeUqOODleOCoeOCr+ODiOODqumWouaVsFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgSUhvb2tTdGF0ZUNvbnRleHQsIEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBleHBvcnQgY29uc3QgdXNlTWVtbyA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICogICAgIHZhbHVlOiBUO1xuICogICAgIHZhbHVlczogdW5rbm93bltdO1xuICpcbiAqICAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICogICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICogICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgfVxuICpcbiAqICAgICB1cGRhdGUoZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKTogVCB7XG4gKiAgICAgICAgIGlmICh0aGlzLmhhc0NoYW5nZWQodmFsdWVzKSkge1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgfVxuICogICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAqICAgICB9XG4gKlxuICogICAgIGhhc0NoYW5nZWQodmFsdWVzOiB1bmtub3duW10gPSBbXSk6IGJvb2xlYW4ge1xuICogICAgICAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbHVlLCBpKSA9PiB0aGlzLnZhbHVlc1tpXSAhPT0gdmFsdWUpO1xuICogICAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBtYWtlSG9vayA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPik6ICguLi5hcmdzOiBQKSA9PiBSID0+IHtcbiAgICByZXR1cm4gKC4uLmFyZ3M6IFApOiBSID0+IHVzZShIb29rLCAuLi5hcmdzKTtcbn07XG4iLCJpbXBvcnQgeyBkZWVwRXF1YWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlLCBOZXdIb29rU3RhdGUsIEhvb2tTdGF0ZVVwZGF0ZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlU3RhdGUgPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAgICBhcmdzITogcmVhZG9ubHkgW1QsIEhvb2tTdGF0ZVVwZGF0ZXI8VD5dO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGUsIGluaXRpYWxWYWx1ZTogVCkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnVwZGF0ZXIgPSB0aGlzLnVwZGF0ZXIuYmluZCh0aGlzKTtcblxuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGluaXRpYWxWYWx1ZSkge1xuICAgICAgICAgICAgaW5pdGlhbFZhbHVlID0gaW5pdGlhbFZhbHVlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKGluaXRpYWxWYWx1ZSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKCk6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFyZ3M7XG4gICAgfVxuXG4gICAgdXBkYXRlcih2YWx1ZTogTmV3SG9va1N0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IFtwcmV2aW91c1ZhbHVlXSA9IHRoaXMuYXJncztcbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlckZuID0gdmFsdWUgYXMgKHByZXZpb3VzU3RhdGU/OiBUKSA9PiBUO1xuICAgICAgICAgICAgdmFsdWUgPSB1cGRhdGVyRm4ocHJldmlvdXNWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVlcEVxdWFsKHByZXZpb3VzVmFsdWUsIHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYWtlQXJncyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgbWFrZUFyZ3ModmFsdWU6IFQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcmdzID0gT2JqZWN0LmZyZWV6ZShbdmFsdWUsIHRoaXMudXBkYXRlcl0gYXMgY29uc3QpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cbn0pIGFzIDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgVCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBSKSA/IFIgOiBULFxuICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuXTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1mdW5jdGlvbi1yZXR1cm4tdHlwZSxcbiAqL1xuXG5pbXBvcnQgeyBkZWVwRXF1YWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbnR5cGUgRWZmZWN0ID0gKHRoaXM6IFN0YXRlKSA9PiB2b2lkIHwgVm9pZEZ1bmN0aW9uIHwgUHJvbWlzZTx2b2lkPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUVmZmVjdCA9IChzZXRFZmZlY3RzOiAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpID0+IHZvaWQpID0+IHtcbiAgICByZXR1cm4gbWFrZUhvb2soY2xhc3MgZXh0ZW5kcyBIb29rIHtcbiAgICAgICAgY2FsbGJhY2shOiBFZmZlY3Q7XG4gICAgICAgIGxhc3RWYWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIHZhbHVlcz86IHVua25vd25bXTtcbiAgICAgICAgX3RlYXJkb3duITogUHJvbWlzZTx2b2lkPiB8IFZvaWRGdW5jdGlvbiB8IHZvaWQ7XG5cbiAgICAgICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGUsIGlnbm9yZWQxOiBFZmZlY3QsIGlnbm9yZWQyPzogdW5rbm93bltdKSB7XG4gICAgICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICAgICAgc2V0RWZmZWN0cyhzdGF0ZSBhcyBTdGF0ZSwgdGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGUoY2FsbGJhY2s6IEVmZmVjdCwgdmFsdWVzPzogdW5rbm93bltdKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGwoKTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudmFsdWVzIHx8IHRoaXMuaGFzQ2hhbmdlZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubGFzdFZhbHVlcyA9IHRoaXMudmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgcnVuKCk6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy50ZWFyZG93bigpO1xuICAgICAgICAgICAgdGhpcy5fdGVhcmRvd24gPSB0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5zdGF0ZSBhcyBTdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5fdGVhcmRvd24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90ZWFyZG93bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaGFzQ2hhbmdlZCgpOiBib29sZWFuIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5sYXN0VmFsdWVzIHx8IHRoaXMudmFsdWVzIS5zb21lKCh2YWx1ZSwgaSkgPT4gIWRlZXBFcXVhbCh0aGlzLmxhc3RWYWx1ZXMhW2ldLCB2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBTdGF0ZSwgQ2FsbGFibGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IGVmZmVjdHNTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0IHsgY3JlYXRlRWZmZWN0IH0gZnJvbSAnLi9jcmVhdGUtZWZmZWN0JztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHNldEVmZmVjdHMgPSAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpOiB2b2lkID0+IHtcbiAgICBzdGF0ZVtlZmZlY3RzU3ltYm9sXS5wdXNoKGNiKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VFZmZlY3QgPSBjcmVhdGVFZmZlY3Qoc2V0RWZmZWN0cyk7XG4iLCJpbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgbGF5b3V0RWZmZWN0c1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQgeyBjcmVhdGVFZmZlY3QgfSBmcm9tICcuL2NyZWF0ZS1lZmZlY3QnO1xuXG5jb25zdCBzZXRMYXlvdXRFZmZlY3RzID0gKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKTogdm9pZCA9PiB7XG4gICAgc3RhdGVbbGF5b3V0RWZmZWN0c1N5bWJvbF0ucHVzaChjYik7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlTGF5b3V0RWZmZWN0ID0gY3JlYXRlRWZmZWN0KHNldExheW91dEVmZmVjdHMpO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZU1lbW8gPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAgICB2YWx1ZTogVDtcbiAgICB2YWx1ZXM6IHVua25vd25bXTtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlLCBmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pIHtcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIHVwZGF0ZShmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pOiBUIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzQ2hhbmdlZCh2YWx1ZXMpKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgIH1cblxuICAgIGhhc0NoYW5nZWQodmFsdWVzOiB1bmtub3duW10gPSBbXSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbHVlLCBpKSA9PiB0aGlzLnZhbHVlc1tpXSAhPT0gdmFsdWUpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgdXNlTWVtbyB9IGZyb20gJy4vdXNlLW1lbW8nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlUmVmOiA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB7IGN1cnJlbnQ6IFQ7IH0gPSA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB1c2VNZW1vKCgpID0+ICh7XG4gICAgY3VycmVudDogaW5pdGlhbFZhbHVlXG59KSwgW10pO1xuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdXNlTWVtbyB9IGZyb20gJy4vdXNlLW1lbW8nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlQ2FsbGJhY2s6IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IFRcbiAgICA9IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IHVzZU1lbW8oKCkgPT4gZm4sIGlucHV0cyk7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUsIEhvb2tSZWR1Y2VyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVJlZHVjZXIgPSBtYWtlSG9vayhjbGFzcyA8UywgSSwgQT4gZXh0ZW5kcyBIb29rIHtcbiAgICByZWR1Y2VyITogSG9va1JlZHVjZXI8UywgQT47XG4gICAgY3VycmVudFN0YXRlOiBTO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGUsIF86IEhvb2tSZWR1Y2VyPFMsIEE+LCBpbml0aWFsU3RhdGU6IEksIGluaXQ/OiAoXzogSSkgPT4gUykge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoID0gdGhpcy5kaXNwYXRjaC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHVuZGVmaW5lZCAhPT0gaW5pdCA/IGluaXQoaW5pdGlhbFN0YXRlKSA6IGluaXRpYWxTdGF0ZSBhcyB1bmtub3duIGFzIFM7XG4gICAgfVxuXG4gICAgdXBkYXRlKHJlZHVjZXI6IEhvb2tSZWR1Y2VyPFMsIEE+KTogcmVhZG9ubHkgW1MsIChhY3Rpb246IEEpID0+IHZvaWRdIHtcbiAgICAgICAgdGhpcy5yZWR1Y2VyID0gcmVkdWNlcjtcbiAgICAgICAgcmV0dXJuIFt0aGlzLmN1cnJlbnRTdGF0ZSwgdGhpcy5kaXNwYXRjaF07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxuXG4gICAgZGlzcGF0Y2goYWN0aW9uOiBBKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gdGhpcy5yZWR1Y2VyKHRoaXMuY3VycmVudFN0YXRlLCBhY3Rpb24pO1xuICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgdHlwZSBEaXJlY3RpdmVSZXN1bHQsIG5vQ2hhbmdlIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElIb29rQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmNsYXNzIEhvb2tDb250ZXh0PFQ+IGltcGxlbWVudHMgSUhvb2tDb250ZXh0PFQ+IHtcbiAgICByZWFkb25seSBkZWZhdWx0VmFsdWU6IFQgfCB1bmRlZmluZWQ7XG4gICAgcHJpdmF0ZSBfdmFsdWU6IFQ7XG5cbiAgICBjb25zdHJ1Y3RvcihkZWZhdWx0VmFsdWU/OiBUKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZSA9IHRoaXMucHJvdmlkZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmNvbnN1bWUgPSB0aGlzLmNvbnN1bWUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWUgPSBkZWZhdWx0VmFsdWU7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gZGVmYXVsdFZhbHVlIGFzIFQ7XG4gICAgfVxuXG4gICAgcHJvdmlkZSh2YWx1ZTogVCwgY2FsbGJhY2s/OiAodmFsdWU6IFQpID0+IERpcmVjdGl2ZVJlc3VsdCk6IERpcmVjdGl2ZVJlc3VsdCB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKGNhbGxiYWNrKSA/IGNhbGxiYWNrKHZhbHVlKSA6IG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIGNvbnN1bWUoY2FsbGJhY2s6ICh2YWx1ZTogVCkgPT4gRGlyZWN0aXZlUmVzdWx0IHwgdm9pZCk6IERpcmVjdGl2ZVJlc3VsdCB8IHZvaWQge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sodGhpcy5fdmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUNvbnRleHQgPSA8VD4oZGVmYXVsdFZhbHVlPzogVCk6IElIb29rQ29udGV4dDxUPiA9PiB7XG4gICAgcmV0dXJuIG5ldyBIb29rQ29udGV4dChkZWZhdWx0VmFsdWUpO1xufTtcbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZSwgSUhvb2tDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IHNldEVmZmVjdHMgfSBmcm9tICcuL3VzZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlQ29udGV4dCA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2s8W0lIb29rQ29udGV4dDxUPl0sIFQsIHVua25vd24+IHtcbiAgICBwcml2YXRlIF9yYW5FZmZlY3Q6IGJvb2xlYW47XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZSwgXzogSUhvb2tDb250ZXh0PFQ+KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IGZhbHNlO1xuICAgICAgICBzZXRFZmZlY3RzKHN0YXRlIGFzIFN0YXRlLCB0aGlzKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoY29udGV4dDogSUhvb2tDb250ZXh0PFQ+KTogVCB7XG4gICAgICAgIGxldCByZXR2YWwhOiBUO1xuICAgICAgICBjb250ZXh0LmNvbnN1bWUodmFsdWUgPT4geyByZXR2YWwgPSB2YWx1ZTsgfSk7XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxuXG4gICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLl9yYW5FZmZlY3QpIHtcbiAgICAgICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgdHlwZSB7IEFueUZ1bmN0aW9uLCBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUge1xuICAgIEhvb2tTdGF0ZVVwZGF0ZXIsXG4gICAgSG9va1JlZHVjZXIsXG4gICAgSUhvb2tDb250ZXh0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgaG9va3NXaXRoIH0gZnJvbSAnLi9kaXJlY3RpdmUnO1xuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICcuL3VzZS1zdGF0ZSc7XG5pbXBvcnQgeyB1c2VFZmZlY3QgfSBmcm9tICcuL3VzZS1lZmZlY3QnO1xuaW1wb3J0IHsgdXNlTGF5b3V0RWZmZWN0IH0gZnJvbSAnLi91c2UtbGF5b3V0LWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5pbXBvcnQgeyB1c2VSZWYgfSBmcm9tICcuL3VzZS1yZWYnO1xuaW1wb3J0IHsgdXNlQ2FsbGJhY2sgfSBmcm9tICcuL3VzZS1jYWxsYmFjayc7XG5pbXBvcnQgeyB1c2VSZWR1Y2VyIH0gZnJvbSAnLi91c2UtcmVkdWNlcic7XG5pbXBvcnQgeyBjcmVhdGVDb250ZXh0IH0gZnJvbSAnLi9jcmVhdGUtY29udGV4dCc7XG5pbXBvcnQgeyB1c2VDb250ZXh0IH0gZnJvbSAnLi91c2UtY29udGV4dCc7XG5leHBvcnQgKiBmcm9tICcuL2ludGVyZmFjZXMnO1xuZXhwb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuXG4vKipcbiAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IHBhcml0eSB3aXRoIHRoZSBSZWFjdCBob29rcyBjb25jZXB0LlxuICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+m1xuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAqXG4gKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAqICAgICBjb25zdCBbY291bnQsIHNldENvdW50XSA9IHVzZVN0YXRlKDApO1xuICogICAgIHJldHVybiBodG1sYFxuICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAqICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInN0YXRlLXBsdXNcIiBAY2xpY2s9JHsoKSA9PiBzZXRDb3VudChwcmV2Q291bnQgPT4gcHJldkNvdW50ISArIDEpfT7inpU8L2J1dHRvbj5cbiAqICAgICBgO1xuICogfVxuICpcbiAqIC8vIHJlbmRlciB3aXRoIGhvb2tzXG4gKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rcyB7XG4gICAgLyoqXG4gICAgICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuIDxicj5cbiAgICAgKiAgICAgQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguXG4gICAgICogQGphIFJlYWN0IGhvb2tzIOOCs+ODs+OCu+ODl+ODiOOBqOWQjOetieOBruapn+iDveOCkuaPkOS+myA8YnI+XG4gICAgICogICAgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqBcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogaW1wb3J0IHsgaHRtbCwgcmVuZGVyLCBob29rcyB9IGZyb20gJ0BjZHAvcnVudGltZSc7XG4gICAgICogY29uc3QgeyB1c2VTdGF0ZSB9ID0gaG9va3M7XG4gICAgICpcbiAgICAgKiAvLyBmdW5jdGlvbiBjb21wb25lbnRcbiAgICAgKiBmdW5jdGlvbiBBcHAoKSB7XG4gICAgICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gICAgICogICAgIHJldHVybiBodG1sYFxuICAgICAqICAgICAgICAgPHA+Q291bnQ6ICR7IGNvdW50IH08L3A+XG4gICAgICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICAgICAqICAgICBgO1xuICAgICAqIH1cbiAgICAgKlxuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzXG4gICAgICogcmVuZGVyKGhvb2tzKEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIHJlbmRlcmVyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIG9iamVjdCB0aGF0IHJldHVybnMgYSB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44KS6L+U5Y2044GZ44KL6Zai5pWw44Kq44OW44K444Kn44Kv44OIXG4gICAgICogQHBhcmFtIGFyZ3NcbiAgICAgKiAgLSBgZW5gIEFyZ3VtZW50cyBwYXNzZWQgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBq+OCj+OBn+OCi+W8leaVsFxuICAgICAqL1xuICAgIChyZW5kZXJlcjogQW55RnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguIChzcGVjaWZ5IGEgRE9NIGRpc2Nvbm5lY3QgZGV0ZWN0aW9uIGVsZW1lbnQpXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqAgKERPTSDliIfmlq3mpJznn6XopoHntKDjgpLmjIflrpopXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NvbWUtcGFnZScpO1xuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzIHdpdGggcm9vdCBlbGVtZW50XG4gICAgICogcmVuZGVyKGhvb2tzLndpdGgoZWwsIEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsUm9vdFxuICAgICAqICAtIGBlbmAgUm9vdCBlbGVtZW50IHVzZWQgZm9yIERPTSBkaXNjb25uZWN0aW9uIGRldGVjdGlvbi4gSWYgYG51bGxgIHBhc3NlZCwgYGRvY3VtZW50YCBpcyBzcGVjaWZpZWRcbiAgICAgKiAgLSBgamFgIERPTSDliIfmlq3mpJznn6Xjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jopoHntKAuIGBudWxsYCDjgYzmuKHjgovjgaggYGRvY3VtZW50YCDjgYzmjIflrprjgZXjgozjgotcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgd2l0aDogKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBBbnlGdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIHN0YXRlZnVsIHZhbHVlIGFuZCBhIGZ1bmN0aW9uIHRvIHVwZGF0ZSBpdC5cbiAgICAgKiBAamEg44K544OG44O844OI44OV44Or44Gq5YCk44Go44CB44Gd44KM44KS5pu05paw44GZ44KL44Gf44KB44Gu6Zai5pWw44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFN0YXRlXG4gICAgICogIC0gYGVuYCBUaGUgdmFsdWUgeW91IHdhbnQgdGhlIHN0YXRlIHRvIGJlIGluaXRpYWxseS5cbiAgICAgKiAgLSBgamFgIOeKtuaFi+OBruWIneacn+WMluWApFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR1cm5zIGFuIGFycmF5IHdpdGggZXhhY3RseSB0d28gdmFsdWVzLiBbYGN1cnJlbnRTdGF0ZWAsIGB1cGRhdGVGdW5jdGlvbmBdXG4gICAgICogIC0gYGphYCAy44Gk44Gu5YCk44KS5oyB44Gk6YWN5YiX44KS6L+U5Y20IFtgY3VycmVudFN0YXRlYCwgYHVwZGF0ZUZ1bmN0aW9uYF1cbiAgICAgKi9cbiAgICB1c2VTdGF0ZTogPFQ+KGluaXRpYWxTdGF0ZT86IFQpID0+IHJlYWRvbmx5IFtcbiAgICAgICAgVCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBSKSA/IFIgOiBULFxuICAgICAgICBIb29rU3RhdGVVcGRhdGVyPFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUykgPyBTIDogVD5cbiAgICBdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGNvbnRhaW5zIGltcGVyYXRpdmUsIHBvc3NpYmx5IGVmZmVjdGZ1bCBjb2RlLlxuICAgICAqIEBqYSDlia/kvZznlKjjgpLmnInjgZnjgovlj6/og73mgKfjga7jgYLjgovlkb3ku6Tlnovjga7jgrPjg7zjg4njga7pgannlKhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlZmZlY3RcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcnVucyBlYWNoIHRpbWUgZGVwZW5kZW5jaWVzIGNoYW5nZVxuICAgICAqICAtIGBqYWAg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44KL44Gf44Gz44Gr5a6f6KGM44GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIGRlcGVuZGVuY2llc1xuICAgICAqICAtIGBlbmAgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gdGhlIGVmZmVjdFxuICAgICAqICAtIGBqYWAg5Ymv5L2c55So55m654Gr44Gu44OI44Oq44Ks44O844Go44Gq44KL5L6d5a2Y6Zai5L+C44Gu44Oq44K544OIXG4gICAgICovXG4gICAgdXNlRWZmZWN0OiAoZWZmZWN0OiAoKSA9PiB2b2lkLCBkZXBlbmRlbmNpZXM/OiB1bmtub3duW10pID0+IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXB0cyBhIGZ1bmN0aW9uIHRoYXQgY29udGFpbnMgaW1wZXJhdGl2ZSwgcG9zc2libHkgZWZmZWN0ZnVsIGNvZGUuIDxicj5cbiAgICAgKiAgICAgVW5saWtlIHtAbGluayBIb29rcy51c2VFZmZlY3R9ICwgaXQgaXMgZXhlY3V0ZWQgYmVmb3JlIHRoZSBjb21wb25lbnQgaXMgcmVuZGVyZWQgYW5kIHRoZSBuZXcgZWxlbWVudCBpcyBkaXNwbGF5ZWQgb24gdGhlIHNjcmVlbi5cbiAgICAgKiBAamEg5Ymv5L2c55So44KS5pyJ44GZ44KL5Y+v6IO95oCn44Gu44GC44KL5ZG95Luk5Z6L44Gu44Kz44O844OJ44Gu6YGp55SoIDxicj5cbiAgICAgKiAgICAge0BsaW5rIEhvb2tzLnVzZUVmZmVjdH0g44Go55Ww44Gq44KKLCDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgYzjg6zjg7Pjg4Djg6rjg7PjgrDjgZXjgozjgabmlrDjgZfjgYTopoHntKDjgYznlLvpnaLjgavooajnpLrjgZXjgozjgovliY3jgavlrp/ooYzjgZXjgozjgovjgIJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlZmZlY3RcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcnVucyBlYWNoIHRpbWUgZGVwZW5kZW5jaWVzIGNoYW5nZVxuICAgICAqICAtIGBqYWAg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44KL44Gf44Gz44Gr5a6f6KGM44GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIGRlcGVuZGVuY2llc1xuICAgICAqICAtIGBlbmAgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gdGhlIGVmZmVjdFxuICAgICAqICAtIGBqYWAg5Ymv5L2c55So55m654Gr44Gu44OI44Oq44Ks44O844Go44Gq44KL5L6d5a2Y6Zai5L+C44Gu44Oq44K544OIXG4gICAgICovXG4gICAgdXNlTGF5b3V0RWZmZWN0OiAoZWZmZWN0OiAoKSA9PiB2b2lkLCBkZXBlbmRlbmNpZXM/OiB1bmtub3duW10pID0+IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXNlZCB0byByZWR1Y2UgY29tcG9uZW50IHJlLXJlbmRlcmluZy4gPGJyPlxuICAgICAqICAgICBDYWNoZSB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIHRoZSBjYWNoZWQgdmFsdWUgd2hlbiBjYWxsZWQgd2l0aCB0aGUgc2FtZSBhcmd1bWVudHMuXG4gICAgICogQGphIOOCs+ODs+ODneODvOODjeODs+ODiOOBruWGjeODrOODs+ODgOODquODs+OCsOOCkuaKkeOBiOOCi+OBn+OCgeOBq+S9v+eUqCA8YnI+XG4gICAgICogICAgIOmWouaVsOOBruaIu+OCiuWApOOCkuOCreODo+ODg+OCt+ODpeOBl+OAgeWQjOOBmOW8leaVsOOBp+WRvOOBs+WHuuOBleOCjOOBn+WgtOWQiOOBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBn+WApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHZhbHVlXG4gICAgICogIC0gYGphYCDlgKTjgpLov5TjgZnplqLmlbBcbiAgICAgKiBAcGFyYW0gdmFsdWVzXG4gICAgICogIC0gYGVuYCBBbiBhcnJheSBvZiB2YWx1ZXMgdGhhdCBhcmUgdXNlZCBhcyBhcmd1bWVudHMgZm9yIGBmbmBcbiAgICAgKiAgLSBgamFgIGBmbmAg44Gu5byV5pWw44Go44GX44Gm5L2/55So44GV44KM44KL5YCk44Gu6YWN5YiXXG4gICAgICovXG4gICAgdXNlTWVtbzogPFQ+KGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkgPT4gVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBMZXRzIHlvdSByZWZlcmVuY2UgYSB2YWx1ZSB0aGF04oCZcyBub3QgbmVlZGVkIGZvciByZW5kZXJpbmcuIDxicj5cbiAgICAgKiAgICAgTWFpbmx5IGF2YWlsYWJsZSBmb3IgYWNjZXNzaW5nIERPTSBub2Rlcy5cbiAgICAgKiBAamEg44Os44Oz44OA44Oq44Oz44Kw44Gr5LiN6KaB44Gq5YCk44KS5Y+C54Wn5Y+v6IO944Gr44GZ44KLPGJyPlxuICAgICAqICAgICDkuLvjgasgRE9NIOODjuODvOODieOBuOOBruOCouOCr+OCu+OCueOBq+WIqeeUqOWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWxWYWx1ZVxuICAgICAqICAtIGBlbmAgVGhlIGluaXRpYWwgdmFsdWUgb2YgdGhlIHJlZmVyZW5jZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Gu5Yid5pyf5YCkXG4gICAgICovXG4gICAgdXNlUmVmOiA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB7IGN1cnJlbnQ6IFQ7IH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhIG1lbW9pemVkIHZlcnNpb24gb2YgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgb25seSBjaGFuZ2VzIGlmIHRoZSBkZXBlbmRlbmNpZXMgY2hhbmdlLiA8YnI+XG4gICAgICogICAgIFVzZWZ1bCBmb3IgcGFzc2luZyBjYWxsYmFja3MgdG8gb3B0aW1pemVkIGNoaWxkIGNvbXBvbmVudHMgdGhhdCByZWx5IG9uIHJlZmVyZW50aWFsIGVxdWFsaXR5LlxuICAgICAqIEBqYSDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgZ/loLTlkIjjgavjga7jgb/lpInmm7TjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjga7jg6Hjg6LljJbjg5Djg7zjgrjjg6fjg7PjgpLov5TljbQgPGJyPlxuICAgICAqICAgICDlj4LnhafnrYnkvqHmgKfjgavkvp3lrZjjgZnjgovmnIDpganljJbjgZXjgozjgZ/lrZDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgavjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmuKHjgZnloLTlkIjjgavlvbnnq4vjgaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqICAtIGBlbmAgVGhlIGZ1bmN0aW9uIHRvIG1lbW9pemVcbiAgICAgKiAgLSBgamFgIOODoeODouWMluOBmeOCi+mWouaVsFxuICAgICAqIEBwYXJhbSBpbnB1dHNcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5IG9mIGlucHV0cyB0byB3YXRjaCBmb3IgY2hhbmdlc1xuICAgICAqICAtIGBqYWAg5aSJ5pu044KS55uj6KaW44GZ44KL5YWl5Yqb44Gu6YWN5YiXXG4gICAgICovXG4gICAgdXNlQ2FsbGJhY2s6IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSG9vayBBUEkgZm9yIG1hbmFnaW5nIHN0YXRlIGluIGZ1bmN0aW9uIGNvbXBvbmVudHMuXG4gICAgICogQGphIOmWouaVsOOCs+ODs+ODneODvOODjeODs+ODiOOBp+eKtuaFi+OCkueuoeeQhuOBmeOCi+OBn+OCgeOBriBIb29rIEFQSVxuICAgICAqXG4gICAgICogQHBhcmFtIHJlZHVjZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmQgYW4gYWN0aW9uIGFuZCByZXR1cm5zIGEgbmV3IHN0YXRlXG4gICAgICogIC0gYGphYCDnj77lnKjjga7nirbmhYvjgajjgqLjgq/jgrfjg6fjg7PjgpLlj5fjgZHlj5bjgorjgIHmlrDjgZfjgYTnirbmhYvjgpLov5TjgZnplqLmlbBcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFN0YXRlXG4gICAgICogIC0gYGVuYCBUaGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWNlclxuICAgICAqICAtIGBqYWAg44Oq44OH44Ol44O844K144O844Gu5Yid5pyf54q25oWL44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRcbiAgICAgKiAgLSBgZW5gIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWNlclxuICAgICAqICAtIGBqYWAg44Oq44OH44Ol44O844K144O844Gu5Yid5pyf54q25oWL44KS6L+U44GZ44Kq44OX44K344On44Oz44Gu6Zai5pWwXG4gICAgICovXG4gICAgdXNlUmVkdWNlcjogPFMsIEksIEE+KHJlZHVjZXI6IEhvb2tSZWR1Y2VyPFMsIEE+LCBpbml0aWFsU3RhdGU6IEksIGluaXQ/OiAoKF86IEkpID0+IFMpKSA9PiByZWFkb25seSBbUywgKGFjdGlvbjogQSkgPT4gdm9pZF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IGNvbnRleHQgb2JqZWN0LiBDb250ZXh0IG9iamVjdHMgYXJlIHVzZWQgdG8gc2hhcmUgZGF0YSB0aGF0IGlzIGNvbnNpZGVyZWQgXCJnbG9iYWxcIi5cbiAgICAgKiBAamEg5paw44GX44GE44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44KS5L2c5oiQ44GZ44KL44CC44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44GvLOOAjOOCsOODreODvOODkOODq+OAjeOBqOiAg+OBiOOCieOCjOOCi+ODh+ODvOOCv+OCkuWFseacieOBmeOCi+OBn+OCgeOBq+S9v+eUqOOBleOCjOOCi+OAglxuICAgICAqXG4gICAgICogQHBhcmFtIGRlZmF1bHRWYWx1ZVxuICAgICAqICAtIGBlbmA6IFRoZSBkZWZhdWx0IHZhbHVlIGZvciB0aGUgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgOiDjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjga7jg4fjg5Xjgqnjg6vjg4jlgKRcbiAgICAgKi9cbiAgICBjcmVhdGVDb250ZXh0OiA8VD4oZGVmYXVsdFZhbHVlPzogVCkgPT4gSUhvb2tDb250ZXh0PFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgY29udGV4dCB2YWx1ZSBmb3IgdGhlIHNwZWNpZmllZCBjb250ZXh0IG9iamVjdC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44Gr5a++44GZ44KL54++5Zyo44Gu44Kz44Oz44OG44Kt44K544OI5YCk44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmA6IHRoZSBjb250ZXh0IG9iamVjdCByZXR1cm5lZCBmcm9tIHtAbGluayBIb29rcy5jcmVhdGVDb250ZXh0fVxuICAgICAqICAtIGBqYWA6IHtAbGluayBIb29rcy5jcmVhdGVDb250ZXh0fSDjgYvjgonov5TjgZXjgozjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICB1c2VDb250ZXh0OiA8VD4oY29udGV4dDogSUhvb2tDb250ZXh0PFQ+KSA9PiBUO1xufVxuXG5jb25zdCBob29rcyA9IGhvb2tzV2l0aC5iaW5kKG51bGwsIG51bGwpIGFzIEhvb2tzO1xuaG9va3Mud2l0aCAgICAgICAgICAgID0gaG9va3NXaXRoO1xuaG9va3MudXNlU3RhdGUgICAgICAgID0gdXNlU3RhdGU7XG5ob29rcy51c2VFZmZlY3QgICAgICAgPSB1c2VFZmZlY3Q7XG5ob29rcy51c2VMYXlvdXRFZmZlY3QgPSB1c2VMYXlvdXRFZmZlY3Q7XG5ob29rcy51c2VNZW1vICAgICAgICAgPSB1c2VNZW1vO1xuaG9va3MudXNlUmVmICAgICAgICAgID0gdXNlUmVmO1xuaG9va3MudXNlQ2FsbGJhY2sgICAgID0gdXNlQ2FsbGJhY2s7XG5ob29rcy51c2VSZWR1Y2VyICAgICAgPSB1c2VSZWR1Y2VyO1xuaG9va3MuY3JlYXRlQ29udGV4dCAgID0gY3JlYXRlQ29udGV4dDtcbmhvb2tzLnVzZUNvbnRleHQg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