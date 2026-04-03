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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUubWpzIiwic291cmNlcyI6WyJicmlkZ2UudHMiLCJsb2FkZXIudHMiLCJob29rcy9jdXJyZW50LnRzIiwiaG9va3Mvc3ltYm9scy50cyIsImhvb2tzL3N0YXRlLnRzIiwiaG9va3MvZGlyZWN0aXZlLnRzIiwiaG9va3MvaG9vay50cyIsImhvb2tzL3VzZS1zdGF0ZS50cyIsImhvb2tzL2NyZWF0ZS1lZmZlY3QudHMiLCJob29rcy91c2UtZWZmZWN0LnRzIiwiaG9va3MvdXNlLWxheW91dC1lZmZlY3QudHMiLCJob29rcy91c2UtbWVtby50cyIsImhvb2tzL3VzZS1yZWYudHMiLCJob29rcy91c2UtY2FsbGJhY2sudHMiLCJob29rcy91c2UtcmVkdWNlci50cyIsImhvb2tzL2NyZWF0ZS1jb250ZXh0LnRzIiwiaG9va3MvdXNlLWNvbnRleHQudHMiLCJob29rcy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIHR5cGUgVGVtcGxhdGVSZXN1bHQsXG4gICAgdHlwZSBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBodG1sLFxuICAgIGRpcmVjdGl2ZXMsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB7XG4gICAgdHlwZSBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlJztcbmltcG9ydCB0eXBlIHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsIGJ1aWx0aW4gdHJhbnNmb3JtZXJzIChkZWZhdWx0OiBtdXN0YWNoZSkuICovXG5jb25zdCBfYnVpbHRpbnM6IFJlY29yZDxzdHJpbmcsIFRlbXBsYXRlVHJhbnNmb3JtZXI+ID0ge1xuICAgIG11c3RhY2hlOiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWwsIGRpcmVjdGl2ZXMudW5zYWZlSFRNTCksXG4gICAgc3RhbXBpbm86IGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIoKSxcbn07XG5cbi8qKlxuICogQGVuIENvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUgaW50ZXJmYWNlXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/44OG44Oz44OX44Os44O844OI5qC857SN44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFNvdXJjZSB0ZW1wbGF0ZSBzdHJpbmdcbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICovXG4gICAgc291cmNlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBUZW1wbGF0ZVJlc3VsdH0gdGhhdCBhcHBsaWVkIGdpdmVuIHBhcmFtZXRlcihzKS5cbiAgICAgKiBAamEg44OR44Op44Oh44O844K/44KS6YGp55So44GXIHtAbGluayBUZW1wbGF0ZVJlc3VsdH0g44G45aSJ5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlld1xuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgcGFyYW1ldGVycyBmb3Igc291cmNlLlxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQ7XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBUZW1wbGF0ZUJyaWRnZX0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEge0BsaW5rIFRlbXBsYXRlQnJpZGdlfSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0cmFuc2Zvcm1lcj86IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIGJyaWRnZSBmb3Igb3RoZXIgdGVtcGxhdGUgZW5naW5lIHNvdXJjZS5cbiAqIEBqYSDku5bjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg7Pjgrjjg7Pjga7lhaXlipvjgpLlpInmj5vjgZnjgovjg4bjg7Pjg5fjg6zjg7zjg4jjg5bjg6rjg4Pjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlQnJpZGdlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgX3RyYW5zZm9ybWVyID0gX2J1aWx0aW5zLm11c3RhY2hlO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgQ29tcGlsZWRUZW1wbGF0ZX0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSB7QGxpbmsgQ29tcGlsZWRUZW1wbGF0ZX0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmcgLyB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJcgLyDjg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg6zjg6Hjg7Pjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zKTogQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNmb3JtZXIgfSA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2Zvcm1lcjogVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyIH0sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBlbmdpbmUgPSB0cmFuc2Zvcm1lcih0ZW1wbGF0ZSk7XG4gICAgICAgIGNvbnN0IGpzdCA9ICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBlbmdpbmUodmlldyk7XG4gICAgICAgIH07XG4gICAgICAgIGpzdC5zb3VyY2UgPSB0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGRlZmF1bHQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDml6Llrprjga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdUcmFuc2Zvcm1lclxuICAgICAqICAtIGBlbmAgbmV3IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOS7peWJjeOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2V0VHJhbnNmb3JtZXIobmV3VHJhbnNmb3JtZXI6IFRlbXBsYXRlVHJhbnNmb3JtZXIpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICAgICAgY29uc3Qgb2xkVHJhbnNmb3JtZXIgPSBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXI7XG4gICAgICAgIFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciA9IG5ld1RyYW5zZm9ybWVyO1xuICAgICAgICByZXR1cm4gb2xkVHJhbnNmb3JtZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBuYW1lIGxpc3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeensOS4gOimp+OCkuWPluW+l1xuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG5hbWUgbGlzdC5cbiAgICAgKiAgLSBgamFgIOWQjeensOS4gOimp+OCkui/lOWNtFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgYnVpbHRpbnMoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoX2J1aWx0aW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0IG5hbWUuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY3jgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0QnVpdGluVHJhbnNmb3JtZXIobmFtZTogc3RyaW5nKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfYnVpbHRpbnNbbmFtZV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5lc2NhcGVIVE1MLCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBKU1QsXG4gICAgdHlwZSBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLFxuICAgIFRlbXBsYXRlRW5naW5lLFxufSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuaW1wb3J0IHsgdHlwZSBMb2FkVGVtcGxhdGVPcHRpb25zLCBsb2FkVGVtcGxhdGVTb3VyY2UgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5leHBvcnQgeyBjbGVhclRlbXBsYXRlQ2FjaGUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIHR5cGUgQ29tcGlsZWRUZW1wbGF0ZSxcbiAgICB0eXBlIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVCcmlkZ2UsXG59IGZyb20gJy4vYnJpZGdlJztcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBsaXN0LlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlUeXBlTGlzdCB7XG4gICAgZW5naW5lOiBKU1Q7XG4gICAgYnJpZGdlOiBDb21waWxlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGRlZmluaXRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+aMh+WumuWtkFxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSBrZXlvZiBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IG9wdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeU9wdGlvbnM8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcz4gZXh0ZW5kcyBMb2FkVGVtcGxhdGVPcHRpb25zLCBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLCBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBgZW5naW5lYCAvICdicmlkZ2UnXG4gICAgICovXG4gICAgdHlwZT86IFQ7XG4gICAgLyoqXG4gICAgICogQGVuIHRlbXBsYXRlIGxvYWQgY2FsbGJhY2suIGBicmlkZ2VgIG1vZGUgYWxsb3dzIGxvY2FsaXphdGlvbiBoZXJlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4joqq3jgb/ovrzjgb/jgrPjg7zjg6vjg5Djg4Pjgq8uIGBicmlkZ2VgIOODouODvOODieOBp+OBr+OBk+OBk+OBp+ODreODvOOCq+ODqeOCpOOCuuOBjOWPr+iDvVxuICAgICAqL1xuICAgIGNhbGxiYWNrPzogKHNyYzogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCkgPT4gc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IFByb21pc2U8c3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudD47XG59XG5cbi8qKlxuICogQGVuIEdldCBjb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlLlxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBvyBKYXZhU2NyaXB0IOODhuODs+ODl+ODrOODvOODiOWPluW+l1xuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBUaGUgc2VsZWN0b3Igc3RyaW5nIG9mIERPTS5cbiAqICAtIGBqYWAgRE9NIOOCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgcXVlcnkgb3B0aW9uc1xuICogIC0gYGphYCDjgq/jgqjjg6rjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFRlbXBsYXRlPFQgZXh0ZW5kcyBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSAnZW5naW5lJz4oXG4gICAgc2VsZWN0b3I6IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlUXVlcnlPcHRpb25zPFQ+XG4pOiBQcm9taXNlPFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXT4ge1xuICAgIGNvbnN0IHsgdHlwZSwgdXJsLCBub0NhY2hlLCBjYWxsYmFjayB9ID0gT2JqZWN0LmFzc2lnbih7IHR5cGU6ICdlbmdpbmUnLCBub0NhY2hlOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICBsZXQgc3JjID0gYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybCwgbm9DYWNoZSB9KTtcbiAgICBpZiAoIXNyYykge1xuICAgICAgICB0aHJvdyBuZXcgVVJJRXJyb3IoYGNhbm5vdCBzcGVjaWZpZWQgdGVtcGxhdGUgcmVzb3VyY2UuIHsgc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCAgdXJsOiAke3VybH0gfWApO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBzcmMgPSBhd2FpdCBjYWxsYmFjayhzcmMpO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdlbmdpbmUnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlRW5naW5lLmNvbXBpbGUoc3JjIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHVuZXNjYXBlSFRNTChzcmMuaW5uZXJIVE1MKSA6IHNyYywgb3B0aW9ucykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBjYXNlICdicmlkZ2UnOlxuICAgICAgICAgICAgcmV0dXJuIFRlbXBsYXRlQnJpZGdlLmNvbXBpbGUoc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBbdHlwZTogJHt0eXBlfV0gaXMgdW5rbm93bi5gKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5sZXQgX2N1cnJlbnRJZCA9IDA7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBsZXQgY3VycmVudDogSUhvb2tTdGF0ZSB8IG51bGw7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRDdXJyZW50ID0gKHN0YXRlOiBJSG9va1N0YXRlKTogdm9pZCA9PiB7XG4gICAgY3VycmVudCA9IHN0YXRlO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNsZWFyQ3VycmVudCA9ICgpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gbnVsbDtcbiAgICBfY3VycmVudElkID0gMDtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBub3RpZnkgPSAoKTogbnVtYmVyID0+IHtcbiAgICByZXR1cm4gX2N1cnJlbnRJZCsrO1xufTtcbiIsIi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rU3ltYm9sID0gU3ltYm9sKCdob29rJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgZWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnZWZmZWN0cycpO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGxheW91dEVmZmVjdHNTeW1ib2wgPSBTeW1ib2woJ2xheW91dEVmZmVjdHMnKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHR5cGUgRWZmZWN0c1N5bWJvbHMgPSB0eXBlb2YgZWZmZWN0c1N5bWJvbCB8IHR5cGVvZiBsYXlvdXRFZmZlY3RzU3ltYm9sO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgeyBzZXRDdXJyZW50LCBjbGVhckN1cnJlbnQgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEVmZmVjdHNTeW1ib2xzLFxuICAgIGhvb2tTeW1ib2wsXG4gICAgZWZmZWN0c1N5bWJvbCxcbiAgICBsYXlvdXRFZmZlY3RzU3ltYm9sLFxufSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgaW50ZXJmYWNlIENhbGxhYmxlIHtcbiAgICBjYWxsOiAoc3RhdGU6IFN0YXRlKSA9PiB2b2lkO1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY2xhc3MgU3RhdGU8SCA9IHVua25vd24+IGltcGxlbWVudHMgSUhvb2tTdGF0ZTxIPiB7XG4gICAgdXBkYXRlOiBWb2lkRnVuY3Rpb247XG4gICAgaG9zdDogSDtcbiAgICB2aXJ0dWFsPzogYm9vbGVhbjtcbiAgICBbaG9va1N5bWJvbF06IE1hcDxudW1iZXIsIEhvb2s+O1xuICAgIFtlZmZlY3RzU3ltYm9sXTogQ2FsbGFibGVbXTtcbiAgICBbbGF5b3V0RWZmZWN0c1N5bWJvbF06IENhbGxhYmxlW107XG5cbiAgICBjb25zdHJ1Y3Rvcih1cGRhdGU6IFZvaWRGdW5jdGlvbiwgaG9zdDogSCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSA9IHVwZGF0ZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gaG9zdDtcbiAgICAgICAgdGhpc1tob29rU3ltYm9sXSA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpc1tlZmZlY3RzU3ltYm9sXSA9IFtdO1xuICAgICAgICB0aGlzW2xheW91dEVmZmVjdHNTeW1ib2xdID0gW107XG4gICAgfVxuXG4gICAgcnVuPFQ+KGNiOiAoKSA9PiBUKTogVCB7XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGNvbnN0IHJlcyA9IGNiKCk7XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIF9ydW5FZmZlY3RzKHBoYXNlOiBFZmZlY3RzU3ltYm9scyk6IHZvaWQge1xuICAgICAgICBjb25zdCBlZmZlY3RzID0gdGhpc1twaGFzZV07XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIGVmZmVjdHMpIHtcbiAgICAgICAgICAgIGVmZmVjdC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgIH1cblxuICAgIHJ1bkVmZmVjdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3J1bkVmZmVjdHMoZWZmZWN0c1N5bWJvbCk7XG4gICAgfVxuXG4gICAgcnVuTGF5b3V0RWZmZWN0cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcnVuRWZmZWN0cyhsYXlvdXRFZmZlY3RzU3ltYm9sKTtcbiAgICB9XG5cbiAgICB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaG9va3MgPSB0aGlzW2hvb2tTeW1ib2xdO1xuICAgICAgICBmb3IgKGNvbnN0IFssIGhvb2tdIG9mIGhvb2tzKSB7XG4gICAgICAgICAgICAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGhvb2sudGVhcmRvd24pICYmIGhvb2sudGVhcmRvd24oKTtcbiAgICAgICAgICAgIGRlbGV0ZSBob29rLnRlYXJkb3duO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICB0eXBlIFBhcnRJbmZvLFxuICAgIHR5cGUgRGlyZWN0aXZlUmVzdWx0LFxuICAgIEFzeW5jRGlyZWN0aXZlLFxuICAgIGRpcmVjdGl2ZSxcbiAgICBub0NoYW5nZSxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFVua25vd25GdW5jdGlvbixcbiAgICBub29wLFxuICAgIHNjaGVkdWxlcixcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvbSBhcyAkIH0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuY29uc3Qgc2NoZWR1bGUgPSBzY2hlZHVsZXIoKTtcblxuaW50ZXJmYWNlIERpc2Nvbm5lY3RhYmxlIHtcbiAgICBfJHBhcmVudD86IERpc2Nvbm5lY3RhYmxlO1xuICAgIHBhcmVudE5vZGU6IEVsZW1lbnQ7XG59XG5cbmNsYXNzIEhvb2tEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhdGU6IFN0YXRlO1xuICAgIHByaXZhdGUgX3JlbmRlcmVyOiBVbmtub3duRnVuY3Rpb247XG4gICAgcHJpdmF0ZSBfYXJnczogdW5rbm93bltdO1xuICAgIHByaXZhdGUgX2VsT2JzZXJ2ZWQ/OiBOb2RlO1xuICAgIHByaXZhdGUgX2Rpc2Nvbm5lY3RlZEhhbmRsZXI/OiB0eXBlb2YgSG9va0RpcmVjdGl2ZS5wcm90b3R5cGUuZGlzY29ubmVjdGVkO1xuXG4gICAgY29uc3RydWN0b3IocGFydDogUGFydEluZm8pIHtcbiAgICAgICAgc3VwZXIocGFydCk7XG4gICAgICAgIHRoaXMuX3N0YXRlID0gbmV3IFN0YXRlKCgpID0+IHRoaXMucmVkcmF3KCksIHRoaXMpO1xuICAgICAgICB0aGlzLl9yZW5kZXJlciA9IG5vb3A7XG4gICAgICAgIHRoaXMuX2FyZ3MgPSBbXTtcbiAgICB9XG5cbiAgICByZW5kZXIoZWxSb290OiBOb2RlIHwgbnVsbCwgcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKTogRGlyZWN0aXZlUmVzdWx0IHtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSByZW5kZXJlcjtcbiAgICAgICAgdGhpcy5fYXJncyA9IGFyZ3M7XG4gICAgICAgIHRoaXMub2JzZXJ2ZShlbFJvb3QpO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGRpc2Nvbm5lY3RlZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCAmJiAkLnV0aWxzLnVuZGV0ZWN0aWZ5KHRoaXMuX2VsT2JzZXJ2ZWQpO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9zdGF0ZS50ZWFyZG93bigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVkcmF3KCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGF0ZS5ydW4oKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMuX3JlbmRlcmVyKC4uLnRoaXMuX2FyZ3MpO1xuICAgICAgICAgICAgdGhpcy5zZXRWYWx1ZShyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlLnJ1bkxheW91dEVmZmVjdHMoKTtcbiAgICAgICAgc2NoZWR1bGUoKCkgPT4gdGhpcy5fc3RhdGUucnVuRWZmZWN0cygpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9ic2VydmUoZWxSb290OiBOb2RlIHwgbnVsbCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBfJHBhcmVudCB9ID0gdGhpcyBhcyB1bmtub3duIGFzIERpc2Nvbm5lY3RhYmxlO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gXyRwYXJlbnQ/LnBhcmVudE5vZGU7XG4gICAgICAgIGlmICh0aGlzLl9lbE9ic2VydmVkKSB7XG4gICAgICAgICAgICAkLnV0aWxzLmRldGVjdGlmeSh0aGlzLl9lbE9ic2VydmVkLCBlbFJvb3QhKTtcbiAgICAgICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQuYWRkRXZlbnRMaXN0ZW5lcignZGlzY29ubmVjdGVkJywgdGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlciA9IHRoaXMuZGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgaG9va3NXaXRoID0gZGlyZWN0aXZlKEhvb2tEaXJlY3RpdmUpO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGN1cnJlbnQsIG5vdGlmeSB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQgeyBob29rU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdCBjbGFzcyBmb3IgQ3VzdG9tIEhvb2sgQ2xhc3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Kv44Op44K544Gu5Z+65bqV5oq96LGh44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBIb29rPFAgZXh0ZW5kcyB1bmtub3duW10gPSB1bmtub3duW10sIFIgPSB1bmtub3duLCBIID0gdW5rbm93bj4ge1xuICAgIGlkOiBudW1iZXI7XG4gICAgc3RhdGU6IElIb29rU3RhdGU8SD47XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZTxIPikge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICB9XG5cbiAgICBhYnN0cmFjdCB1cGRhdGUoLi4uYXJnczogUCk6IFI7XG4gICAgdGVhcmRvd24/KCk6IHZvaWQ7XG59XG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBkZWZpbml0aW9uIGZvciBjdXN0b20gaG9va3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIEN1c3RvbUhvb2s8UCBleHRlbmRzIHVua25vd25bXSA9IHVua25vd25bXSwgUiA9IHVua25vd24sIEggPSB1bmtub3duPiA9IG5ldyAoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGU8SD4sIC4uLmFyZ3M6IFApID0+IEhvb2s8UCwgUiwgSD47XG5cbmNvbnN0IHVzZSA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPiwgLi4uYXJnczogUCk6IFIgPT4ge1xuICAgIGNvbnN0IGlkID0gbm90aWZ5KCk7XG4gICAgY29uc3QgaG9va3MgPSAoY3VycmVudCBhcyBhbnkpW2hvb2tTeW1ib2xdIGFzIE1hcDxudW1iZXIsIEhvb2s+OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIGxldCBob29rID0gaG9va3MuZ2V0KGlkKSBhcyBIb29rPFAsIFIsIEg+IHwgdW5kZWZpbmVkO1xuICAgIGlmICghaG9vaykge1xuICAgICAgICBob29rID0gbmV3IEhvb2soaWQsIGN1cnJlbnQgYXMgSUhvb2tTdGF0ZTxIPiwgLi4uYXJncyk7XG4gICAgICAgIGhvb2tzLnNldChpZCwgaG9vayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvb2sudXBkYXRlKC4uLmFyZ3MpO1xufTtcblxuLyoqXG4gKiBAZW4gRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgY3VzdG9tIGhvb2tzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+S9nOaIkOeUqOODleOCoeOCr+ODiOODqumWouaVsFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgSUhvb2tTdGF0ZUNvbnRleHQsIEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBleHBvcnQgY29uc3QgdXNlTWVtbyA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICogICAgIHZhbHVlOiBUO1xuICogICAgIHZhbHVlczogdW5rbm93bltdO1xuICpcbiAqICAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICogICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICogICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgfVxuICpcbiAqICAgICB1cGRhdGUoZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKTogVCB7XG4gKiAgICAgICAgIGlmICh0aGlzLmhhc0NoYW5nZWQodmFsdWVzKSkge1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgfVxuICogICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAqICAgICB9XG4gKlxuICogICAgIGhhc0NoYW5nZWQodmFsdWVzOiB1bmtub3duW10gPSBbXSk6IGJvb2xlYW4ge1xuICogICAgICAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbHVlLCBpKSA9PiB0aGlzLnZhbHVlc1tpXSAhPT0gdmFsdWUpO1xuICogICAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBtYWtlSG9vayA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPik6ICguLi5hcmdzOiBQKSA9PiBSID0+IHtcbiAgICByZXR1cm4gKC4uLmFyZ3M6IFApOiBSID0+IHVzZShIb29rLCAuLi5hcmdzKTtcbn07XG4iLCJpbXBvcnQgeyBkZWVwRXF1YWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlLCBOZXdIb29rU3RhdGUsIEhvb2tTdGF0ZVVwZGF0ZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlU3RhdGUgPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAgICBhcmdzITogcmVhZG9ubHkgW1QsIEhvb2tTdGF0ZVVwZGF0ZXI8VD5dO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGUsIGluaXRpYWxWYWx1ZTogVCkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnVwZGF0ZXIgPSB0aGlzLnVwZGF0ZXIuYmluZCh0aGlzKTtcblxuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGluaXRpYWxWYWx1ZSkge1xuICAgICAgICAgICAgaW5pdGlhbFZhbHVlID0gaW5pdGlhbFZhbHVlKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKGluaXRpYWxWYWx1ZSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKCk6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFyZ3M7XG4gICAgfVxuXG4gICAgdXBkYXRlcih2YWx1ZTogTmV3SG9va1N0YXRlPFQ+KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IFtwcmV2aW91c1ZhbHVlXSA9IHRoaXMuYXJncztcbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlckZuID0gdmFsdWUgYXMgKHByZXZpb3VzU3RhdGU/OiBUKSA9PiBUO1xuICAgICAgICAgICAgdmFsdWUgPSB1cGRhdGVyRm4ocHJldmlvdXNWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVlcEVxdWFsKHByZXZpb3VzVmFsdWUsIHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYWtlQXJncyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxuXG4gICAgbWFrZUFyZ3ModmFsdWU6IFQpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5hcmdzID0gT2JqZWN0LmZyZWV6ZShbdmFsdWUsIHRoaXMudXBkYXRlcl0gYXMgY29uc3QpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cbn0pIGFzIDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgVCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBSKSA/IFIgOiBULFxuICAgIEhvb2tTdGF0ZVVwZGF0ZXI8VCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBTKSA/IFMgOiBUPlxuXTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1mdW5jdGlvbi1yZXR1cm4tdHlwZSxcbiAqL1xuXG5pbXBvcnQgeyBkZWVwRXF1YWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbnR5cGUgRWZmZWN0ID0gKHRoaXM6IFN0YXRlKSA9PiB2b2lkIHwgVm9pZEZ1bmN0aW9uIHwgUHJvbWlzZTx2b2lkPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUVmZmVjdCA9IChzZXRFZmZlY3RzOiAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpID0+IHZvaWQpID0+IHtcbiAgICByZXR1cm4gbWFrZUhvb2soY2xhc3MgZXh0ZW5kcyBIb29rIHtcbiAgICAgICAgY2FsbGJhY2shOiBFZmZlY3Q7XG4gICAgICAgIGxhc3RWYWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIHZhbHVlcz86IHVua25vd25bXTtcbiAgICAgICAgX3RlYXJkb3duITogUHJvbWlzZTx2b2lkPiB8IFZvaWRGdW5jdGlvbiB8IHZvaWQ7XG5cbiAgICAgICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGUsIGlnbm9yZWQxOiBFZmZlY3QsIGlnbm9yZWQyPzogdW5rbm93bltdKSB7XG4gICAgICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICAgICAgc2V0RWZmZWN0cyhzdGF0ZSBhcyBTdGF0ZSwgdGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICB1cGRhdGUoY2FsbGJhY2s6IEVmZmVjdCwgdmFsdWVzPzogdW5rbm93bltdKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGwoKTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudmFsdWVzIHx8IHRoaXMuaGFzQ2hhbmdlZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubGFzdFZhbHVlcyA9IHRoaXMudmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgcnVuKCk6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy50ZWFyZG93bigpO1xuICAgICAgICAgICAgdGhpcy5fdGVhcmRvd24gPSB0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5zdGF0ZSBhcyBTdGF0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5fdGVhcmRvd24pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90ZWFyZG93bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaGFzQ2hhbmdlZCgpOiBib29sZWFuIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5sYXN0VmFsdWVzIHx8IHRoaXMudmFsdWVzIS5zb21lKCh2YWx1ZSwgaSkgPT4gIWRlZXBFcXVhbCh0aGlzLmxhc3RWYWx1ZXMhW2ldLCB2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBTdGF0ZSwgQ2FsbGFibGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IGVmZmVjdHNTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0IHsgY3JlYXRlRWZmZWN0IH0gZnJvbSAnLi9jcmVhdGUtZWZmZWN0JztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHNldEVmZmVjdHMgPSAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpOiB2b2lkID0+IHtcbiAgICBzdGF0ZVtlZmZlY3RzU3ltYm9sXS5wdXNoKGNiKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VFZmZlY3QgPSBjcmVhdGVFZmZlY3Qoc2V0RWZmZWN0cyk7XG4iLCJpbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgbGF5b3V0RWZmZWN0c1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQgeyBjcmVhdGVFZmZlY3QgfSBmcm9tICcuL2NyZWF0ZS1lZmZlY3QnO1xuXG5jb25zdCBzZXRMYXlvdXRFZmZlY3RzID0gKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKTogdm9pZCA9PiB7XG4gICAgc3RhdGVbbGF5b3V0RWZmZWN0c1N5bWJvbF0ucHVzaChjYik7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlTGF5b3V0RWZmZWN0ID0gY3JlYXRlRWZmZWN0KHNldExheW91dEVmZmVjdHMpO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZU1lbW8gPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAgICB2YWx1ZTogVDtcbiAgICB2YWx1ZXM6IHVua25vd25bXTtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlLCBmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pIHtcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgIH1cblxuICAgIHVwZGF0ZShmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pOiBUIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzQ2hhbmdlZCh2YWx1ZXMpKSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgIH1cblxuICAgIGhhc0NoYW5nZWQodmFsdWVzOiB1bmtub3duW10gPSBbXSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbHVlLCBpKSA9PiB0aGlzLnZhbHVlc1tpXSAhPT0gdmFsdWUpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgdXNlTWVtbyB9IGZyb20gJy4vdXNlLW1lbW8nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlUmVmOiA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB7IGN1cnJlbnQ6IFQ7IH0gPSA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB1c2VNZW1vKCgpID0+ICh7XG4gICAgY3VycmVudDogaW5pdGlhbFZhbHVlXG59KSwgW10pO1xuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdXNlTWVtbyB9IGZyb20gJy4vdXNlLW1lbW8nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlQ2FsbGJhY2s6IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IFRcbiAgICA9IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IHVzZU1lbW8oKCkgPT4gZm4sIGlucHV0cyk7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUsIEhvb2tSZWR1Y2VyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVJlZHVjZXIgPSBtYWtlSG9vayhjbGFzcyA8UywgSSwgQT4gZXh0ZW5kcyBIb29rIHtcbiAgICByZWR1Y2VyITogSG9va1JlZHVjZXI8UywgQT47XG4gICAgY3VycmVudFN0YXRlOiBTO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGUsIF86IEhvb2tSZWR1Y2VyPFMsIEE+LCBpbml0aWFsU3RhdGU6IEksIGluaXQ/OiAoXzogSSkgPT4gUykge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoID0gdGhpcy5kaXNwYXRjaC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHVuZGVmaW5lZCAhPT0gaW5pdCA/IGluaXQoaW5pdGlhbFN0YXRlKSA6IGluaXRpYWxTdGF0ZSBhcyB1bmtub3duIGFzIFM7XG4gICAgfVxuXG4gICAgdXBkYXRlKHJlZHVjZXI6IEhvb2tSZWR1Y2VyPFMsIEE+KTogcmVhZG9ubHkgW1MsIChhY3Rpb246IEEpID0+IHZvaWRdIHtcbiAgICAgICAgdGhpcy5yZWR1Y2VyID0gcmVkdWNlcjtcbiAgICAgICAgcmV0dXJuIFt0aGlzLmN1cnJlbnRTdGF0ZSwgdGhpcy5kaXNwYXRjaF07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxuXG4gICAgZGlzcGF0Y2goYWN0aW9uOiBBKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gdGhpcy5yZWR1Y2VyKHRoaXMuY3VycmVudFN0YXRlLCBhY3Rpb24pO1xuICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgdHlwZSBEaXJlY3RpdmVSZXN1bHQsIG5vQ2hhbmdlIH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHsgaXNGdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElIb29rQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmNsYXNzIEhvb2tDb250ZXh0PFQ+IGltcGxlbWVudHMgSUhvb2tDb250ZXh0PFQ+IHtcbiAgICByZWFkb25seSBkZWZhdWx0VmFsdWU6IFQgfCB1bmRlZmluZWQ7XG4gICAgcHJpdmF0ZSBfdmFsdWU6IFQ7XG5cbiAgICBjb25zdHJ1Y3RvcihkZWZhdWx0VmFsdWU/OiBUKSB7XG4gICAgICAgIHRoaXMucHJvdmlkZSA9IHRoaXMucHJvdmlkZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmNvbnN1bWUgPSB0aGlzLmNvbnN1bWUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5kZWZhdWx0VmFsdWUgPSBkZWZhdWx0VmFsdWU7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gZGVmYXVsdFZhbHVlIGFzIFQ7XG4gICAgfVxuXG4gICAgcHJvdmlkZSh2YWx1ZTogVCwgY2FsbGJhY2s/OiAodmFsdWU6IFQpID0+IERpcmVjdGl2ZVJlc3VsdCk6IERpcmVjdGl2ZVJlc3VsdCB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHJldHVybiBpc0Z1bmN0aW9uKGNhbGxiYWNrKSA/IGNhbGxiYWNrKHZhbHVlKSA6IG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIGNvbnN1bWUoY2FsbGJhY2s6ICh2YWx1ZTogVCkgPT4gRGlyZWN0aXZlUmVzdWx0IHwgdm9pZCk6IERpcmVjdGl2ZVJlc3VsdCB8IHZvaWQge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sodGhpcy5fdmFsdWUpO1xuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUNvbnRleHQgPSA8VD4oZGVmYXVsdFZhbHVlPzogVCk6IElIb29rQ29udGV4dDxUPiA9PiB7XG4gICAgcmV0dXJuIG5ldyBIb29rQ29udGV4dChkZWZhdWx0VmFsdWUpO1xufTtcbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZSwgSUhvb2tDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IHNldEVmZmVjdHMgfSBmcm9tICcuL3VzZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlQ29udGV4dCA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2s8W0lIb29rQ29udGV4dDxUPl0sIFQsIHVua25vd24+IHtcbiAgICBwcml2YXRlIF9yYW5FZmZlY3Q6IGJvb2xlYW47XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZSwgXzogSUhvb2tDb250ZXh0PFQ+KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IGZhbHNlO1xuICAgICAgICBzZXRFZmZlY3RzKHN0YXRlIGFzIFN0YXRlLCB0aGlzKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoY29udGV4dDogSUhvb2tDb250ZXh0PFQ+KTogVCB7XG4gICAgICAgIGxldCByZXR2YWwhOiBUO1xuICAgICAgICBjb250ZXh0LmNvbnN1bWUodmFsdWUgPT4geyByZXR2YWwgPSB2YWx1ZTsgfSk7XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxuXG4gICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLl9yYW5FZmZlY3QpIHtcbiAgICAgICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSG9va1N0YXRlVXBkYXRlcixcbiAgICBIb29rUmVkdWNlcixcbiAgICBJSG9va0NvbnRleHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBob29rc1dpdGggfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gJy4vdXNlLXN0YXRlJztcbmltcG9ydCB7IHVzZUVmZmVjdCB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VMYXlvdXRFZmZlY3QgfSBmcm9tICcuL3VzZS1sYXlvdXQtZWZmZWN0JztcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcbmltcG9ydCB7IHVzZVJlZiB9IGZyb20gJy4vdXNlLXJlZic7XG5pbXBvcnQgeyB1c2VDYWxsYmFjayB9IGZyb20gJy4vdXNlLWNhbGxiYWNrJztcbmltcG9ydCB7IHVzZVJlZHVjZXIgfSBmcm9tICcuL3VzZS1yZWR1Y2VyJztcbmltcG9ydCB7IGNyZWF0ZUNvbnRleHQgfSBmcm9tICcuL2NyZWF0ZS1jb250ZXh0JztcbmltcG9ydCB7IHVzZUNvbnRleHQgfSBmcm9tICcuL3VzZS1jb250ZXh0JztcbmV4cG9ydCAqIGZyb20gJy4vaW50ZXJmYWNlcyc7XG5leHBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5cbi8qKlxuICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuXG4gKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGNvbnN0IHsgdXNlU3RhdGUgfSA9IGhvb2tzO1xuICpcbiAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICogZnVuY3Rpb24gQXBwKCkge1xuICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gKiAgICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgICAgIDxwPkNvdW50OiAkeyBjb3VudCB9PC9wPlxuICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICogICAgIGA7XG4gKiB9XG4gKlxuICogLy8gcmVuZGVyIHdpdGggaG9va3NcbiAqIHJlbmRlcihob29rcyhBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tzIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBwYXJpdHkgd2l0aCB0aGUgUmVhY3QgaG9va3MgY29uY2VwdC4gPGJyPlxuICAgICAqICAgICBBZGQgSG9va3MgZmVhdHVyZSB0byB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheC5cbiAgICAgKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bIDxicj5cbiAgICAgKiAgICAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44GrIEhvb2tzIOapn+iDveOCkuS7mOWKoFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAgICAgKlxuICAgICAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICAgICAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAgICAgKiAgICAgY29uc3QgW2NvdW50LCBzZXRDb3VudF0gPSB1c2VTdGF0ZSgwKTtcbiAgICAgKiAgICAgcmV0dXJuIGh0bWxgXG4gICAgICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAgICAgKiAgICAgICAgIDxidXR0b24gY2xhc3M9XCJzdGF0ZS1wbHVzXCIgQGNsaWNrPSR7KCkgPT4gc2V0Q291bnQocHJldkNvdW50ID0+IHByZXZDb3VudCEgKyAxKX0+4p6VPC9idXR0b24+XG4gICAgICogICAgIGA7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gZW5hYmxpbmcgaG9va3NcbiAgICAgKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgKHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguIChzcGVjaWZ5IGEgRE9NIGRpc2Nvbm5lY3QgZGV0ZWN0aW9uIGVsZW1lbnQpXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqAgKERPTSDliIfmlq3mpJznn6XopoHntKDjgpLmjIflrpopXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NvbWUtcGFnZScpO1xuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzIHdpdGggcm9vdCBlbGVtZW50XG4gICAgICogcmVuZGVyKGhvb2tzLndpdGgoZWwsIEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsUm9vdFxuICAgICAqICAtIGBlbmAgUm9vdCBlbGVtZW50IHVzZWQgZm9yIERPTSBkaXNjb25uZWN0aW9uIGRldGVjdGlvbi4gSWYgYG51bGxgIHBhc3NlZCwgYGRvY3VtZW50YCBpcyBzcGVjaWZpZWRcbiAgICAgKiAgLSBgamFgIERPTSDliIfmlq3mpJznn6Xjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jopoHntKAuIGBudWxsYCDjgYzmuKHjgovjgaggYGRvY3VtZW50YCDjgYzmjIflrprjgZXjgozjgotcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgd2l0aDogKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBzdGF0ZWZ1bCB2YWx1ZSBhbmQgYSBmdW5jdGlvbiB0byB1cGRhdGUgaXQuXG4gICAgICogQGphIOOCueODhuODvOODiOODleODq+OBquWApOOBqOOAgeOBneOCjOOCkuabtOaWsOOBmeOCi+OBn+OCgeOBrumWouaVsOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWxTdGF0ZVxuICAgICAqICAtIGBlbmAgVGhlIHZhbHVlIHlvdSB3YW50IHRoZSBzdGF0ZSB0byBiZSBpbml0aWFsbHkuXG4gICAgICogIC0gYGphYCDnirbmhYvjga7liJ3mnJ/ljJblgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dXJucyBhbiBhcnJheSB3aXRoIGV4YWN0bHkgdHdvIHZhbHVlcy4gW2BjdXJyZW50U3RhdGVgLCBgdXBkYXRlRnVuY3Rpb25gXVxuICAgICAqICAtIGBqYWAgMuOBpOOBruWApOOCkuaMgeOBpOmFjeWIl+OCkui/lOWNtCBbYGN1cnJlbnRTdGF0ZWAsIGB1cGRhdGVGdW5jdGlvbmBdXG4gICAgICovXG4gICAgdXNlU3RhdGU6IDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgICAgIFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUikgPyBSIDogVCxcbiAgICAgICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG4gICAgXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBjb250YWlucyBpbXBlcmF0aXZlLCBwb3NzaWJseSBlZmZlY3RmdWwgY29kZS5cbiAgICAgKiBAamEg5Ymv5L2c55So44KS5pyJ44GZ44KL5Y+v6IO95oCn44Gu44GC44KL5ZG95Luk5Z6L44Gu44Kz44O844OJ44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWZmZWN0XG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCB0aW1lIGRlcGVuZGVuY2llcyBjaGFuZ2VcbiAgICAgKiAgLSBgamFgIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOCi+OBn+OBs+OBq+Wun+ihjOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBkZXBlbmRlbmNpZXNcbiAgICAgKiAgLSBgZW5gIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIHRoZSBlZmZlY3RcbiAgICAgKiAgLSBgamFgIOWJr+S9nOeUqOeZuueBq+OBruODiOODquOCrOODvOOBqOOBquOCi+S+neWtmOmWouS/guOBruODquOCueODiFxuICAgICAqL1xuICAgIHVzZUVmZmVjdDogKGVmZmVjdDogKCkgPT4gdm9pZCwgZGVwZW5kZW5jaWVzPzogdW5rbm93bltdKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGNvbnRhaW5zIGltcGVyYXRpdmUsIHBvc3NpYmx5IGVmZmVjdGZ1bCBjb2RlLiA8YnI+XG4gICAgICogICAgIFVubGlrZSB7QGxpbmsgSG9va3MudXNlRWZmZWN0fSAsIGl0IGlzIGV4ZWN1dGVkIGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHJlbmRlcmVkIGFuZCB0aGUgbmV3IGVsZW1lbnQgaXMgZGlzcGxheWVkIG9uIHRoZSBzY3JlZW4uXG4gICAgICogQGphIOWJr+S9nOeUqOOCkuacieOBmeOCi+WPr+iDveaAp+OBruOBguOCi+WRveS7pOWei+OBruOCs+ODvOODieOBrumBqeeUqCA8YnI+XG4gICAgICogICAgIHtAbGluayBIb29rcy51c2VFZmZlY3R9IOOBqOeVsOOBquOCiiwg44Kz44Oz44Od44O844ON44Oz44OI44GM44Os44Oz44OA44Oq44Oz44Kw44GV44KM44Gm5paw44GX44GE6KaB57Sg44GM55S76Z2i44Gr6KGo56S644GV44KM44KL5YmN44Gr5a6f6KGM44GV44KM44KL44CCXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWZmZWN0XG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCB0aW1lIGRlcGVuZGVuY2llcyBjaGFuZ2VcbiAgICAgKiAgLSBgamFgIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOCi+OBn+OBs+OBq+Wun+ihjOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBkZXBlbmRlbmNpZXNcbiAgICAgKiAgLSBgZW5gIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIHRoZSBlZmZlY3RcbiAgICAgKiAgLSBgamFgIOWJr+S9nOeUqOeZuueBq+OBruODiOODquOCrOODvOOBqOOBquOCi+S+neWtmOmWouS/guOBruODquOCueODiFxuICAgICAqL1xuICAgIHVzZUxheW91dEVmZmVjdDogKGVmZmVjdDogKCkgPT4gdm9pZCwgZGVwZW5kZW5jaWVzPzogdW5rbm93bltdKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVzZWQgdG8gcmVkdWNlIGNvbXBvbmVudCByZS1yZW5kZXJpbmcuIDxicj5cbiAgICAgKiAgICAgQ2FjaGUgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiB0aGUgY2FjaGVkIHZhbHVlIHdoZW4gY2FsbGVkIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzLlxuICAgICAqIEBqYSDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7lho3jg6zjg7Pjg4Djg6rjg7PjgrDjgpLmipHjgYjjgovjgZ/jgoHjgavkvb/nlKggPGJyPlxuICAgICAqICAgICDplqLmlbDjga7miLvjgorlgKTjgpLjgq3jg6Pjg4Pjgrfjg6XjgZfjgIHlkIzjgZjlvJXmlbDjgaflkbzjgbPlh7rjgZXjgozjgZ/loLTlkIjjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgZ/lgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB2YWx1ZVxuICAgICAqICAtIGBqYWAg5YCk44KS6L+U44GZ6Zai5pWwXG4gICAgICogQHBhcmFtIHZhbHVlc1xuICAgICAqICAtIGBlbmAgQW4gYXJyYXkgb2YgdmFsdWVzIHRoYXQgYXJlIHVzZWQgYXMgYXJndW1lbnRzIGZvciBgZm5gXG4gICAgICogIC0gYGphYCBgZm5gIOOBruW8leaVsOOBqOOBl+OBpuS9v+eUqOOBleOCjOOCi+WApOOBrumFjeWIl1xuICAgICAqL1xuICAgIHVzZU1lbW86IDxUPihmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pID0+IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTGV0cyB5b3UgcmVmZXJlbmNlIGEgdmFsdWUgdGhhdOKAmXMgbm90IG5lZWRlZCBmb3IgcmVuZGVyaW5nLiA8YnI+XG4gICAgICogICAgIE1haW5seSBhdmFpbGFibGUgZm9yIGFjY2Vzc2luZyBET00gbm9kZXMuXG4gICAgICogQGphIOODrOODs+ODgOODquODs+OCsOOBq+S4jeimgeOBquWApOOCkuWPgueFp+WPr+iDveOBq+OBmeOCizxicj5cbiAgICAgKiAgICAg5Li744GrIERPTSDjg47jg7zjg4njgbjjga7jgqLjgq/jgrvjgrnjgavliKnnlKjlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbml0aWFsVmFsdWVcbiAgICAgKiAgLSBgZW5gIFRoZSBpbml0aWFsIHZhbHVlIG9mIHRoZSByZWZlcmVuY2VcbiAgICAgKiAgLSBgamFgIOWPgueFp+OBruWIneacn+WApFxuICAgICAqL1xuICAgIHVzZVJlZjogPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4geyBjdXJyZW50OiBUOyB9O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYSBtZW1vaXplZCB2ZXJzaW9uIG9mIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IG9ubHkgY2hhbmdlcyBpZiB0aGUgZGVwZW5kZW5jaWVzIGNoYW5nZS4gPGJyPlxuICAgICAqICAgICBVc2VmdWwgZm9yIHBhc3NpbmcgY2FsbGJhY2tzIHRvIG9wdGltaXplZCBjaGlsZCBjb21wb25lbnRzIHRoYXQgcmVseSBvbiByZWZlcmVudGlhbCBlcXVhbGl0eS5cbiAgICAgKiBAamEg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44Gf5aC05ZCI44Gr44Gu44G/5aSJ5pu044GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gu44Oh44Oi5YyW44OQ44O844K444On44Oz44KS6L+U5Y20IDxicj5cbiAgICAgKiAgICAg5Y+C54Wn562J5L6h5oCn44Gr5L6d5a2Y44GZ44KL5pyA6YGp5YyW44GV44KM44Gf5a2Q44Kz44Oz44Od44O844ON44Oz44OI44Gr44Kz44O844Or44OQ44OD44Kv44KS5rih44GZ5aC05ZCI44Gr5b2556uL44GkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiAgLSBgZW5gIFRoZSBmdW5jdGlvbiB0byBtZW1vaXplXG4gICAgICogIC0gYGphYCDjg6Hjg6LljJbjgZnjgovplqLmlbBcbiAgICAgKiBAcGFyYW0gaW5wdXRzXG4gICAgICogIC0gYGVuYCBBbiBhcnJheSBvZiBpbnB1dHMgdG8gd2F0Y2ggZm9yIGNoYW5nZXNcbiAgICAgKiAgLSBgamFgIOWkieabtOOCkuebo+imluOBmeOCi+WFpeWKm+OBrumFjeWIl1xuICAgICAqL1xuICAgIHVzZUNhbGxiYWNrOiA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEhvb2sgQVBJIGZvciBtYW5hZ2luZyBzdGF0ZSBpbiBmdW5jdGlvbiBjb21wb25lbnRzLlxuICAgICAqIEBqYSDplqLmlbDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgafnirbmhYvjgpLnrqHnkIbjgZnjgovjgZ/jgoHjga4gSG9vayBBUElcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWR1Y2VyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFjdGlvbiBhbmQgcmV0dXJucyBhIG5ldyBzdGF0ZVxuICAgICAqICAtIGBqYWAg54++5Zyo44Gu54q25oWL44Go44Ki44Kv44K344On44Oz44KS5Y+X44GR5Y+W44KK44CB5paw44GX44GE54q25oWL44KS6L+U44GZ6Zai5pWwXG4gICAgICogQHBhcmFtIGluaXRpYWxTdGF0ZVxuICAgICAqICAtIGBlbmAgVGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjZXJcbiAgICAgKiAgLSBgamFgIOODquODh+ODpeODvOOCteODvOOBruWIneacn+eKtuaFi+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBpbml0XG4gICAgICogIC0gYGVuYCBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjZXJcbiAgICAgKiAgLSBgamFgIOODquODh+ODpeODvOOCteODvOOBruWIneacn+eKtuaFi+OCkui/lOOBmeOCquODl+OCt+ODp+ODs+OBrumWouaVsFxuICAgICAqL1xuICAgIHVzZVJlZHVjZXI6IDxTLCBJLCBBPihyZWR1Y2VyOiBIb29rUmVkdWNlcjxTLCBBPiwgaW5pdGlhbFN0YXRlOiBJLCBpbml0PzogKChfOiBJKSA9PiBTKSkgPT4gcmVhZG9ubHkgW1MsIChhY3Rpb246IEEpID0+IHZvaWRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIG5ldyBjb250ZXh0IG9iamVjdC4gQ29udGV4dCBvYmplY3RzIGFyZSB1c2VkIHRvIHNoYXJlIGRhdGEgdGhhdCBpcyBjb25zaWRlcmVkIFwiZ2xvYmFsXCIuXG4gICAgICogQGphIOaWsOOBl+OBhOOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOCkuS9nOaIkOOBmeOCi+OAguOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBryzjgIzjgrDjg63jg7zjg5Djg6vjgI3jgajogIPjgYjjgonjgozjgovjg4fjg7zjgr/jgpLlhbHmnInjgZnjgovjgZ/jgoHjgavkvb/nlKjjgZXjgozjgovjgIJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkZWZhdWx0VmFsdWVcbiAgICAgKiAgLSBgZW5gOiBUaGUgZGVmYXVsdCB2YWx1ZSBmb3IgdGhlIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYDog44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44Gu44OH44OV44Kp44Or44OI5YCkXG4gICAgICovXG4gICAgY3JlYXRlQ29udGV4dDogPFQ+KGRlZmF1bHRWYWx1ZT86IFQpID0+IElIb29rQ29udGV4dDxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IGNvbnRleHQgdmFsdWUgZm9yIHRoZSBzcGVjaWZpZWQgY29udGV4dCBvYmplY3QuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBq+WvvuOBmeOCi+ePvuWcqOOBruOCs+ODs+ODhuOCreOCueODiOWApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gOiB0aGUgY29udGV4dCBvYmplY3QgcmV0dXJuZWQgZnJvbSB7QGxpbmsgSG9va3MuY3JlYXRlQ29udGV4dH1cbiAgICAgKiAgLSBgamFgOiB7QGxpbmsgSG9va3MuY3JlYXRlQ29udGV4dH0g44GL44KJ6L+U44GV44KM44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgdXNlQ29udGV4dDogPFQ+KGNvbnRleHQ6IElIb29rQ29udGV4dDxUPikgPT4gVDtcbn1cblxuY29uc3QgaG9va3MgPSBob29rc1dpdGguYmluZChudWxsLCBudWxsKSBhcyBIb29rcztcbmhvb2tzLndpdGggICAgICAgICAgICA9IGhvb2tzV2l0aDtcbmhvb2tzLnVzZVN0YXRlICAgICAgICA9IHVzZVN0YXRlO1xuaG9va3MudXNlRWZmZWN0ICAgICAgID0gdXNlRWZmZWN0O1xuaG9va3MudXNlTGF5b3V0RWZmZWN0ID0gdXNlTGF5b3V0RWZmZWN0O1xuaG9va3MudXNlTWVtbyAgICAgICAgID0gdXNlTWVtbztcbmhvb2tzLnVzZVJlZiAgICAgICAgICA9IHVzZVJlZjtcbmhvb2tzLnVzZUNhbGxiYWNrICAgICA9IHVzZUNhbGxiYWNrO1xuaG9va3MudXNlUmVkdWNlciAgICAgID0gdXNlUmVkdWNlcjtcbmhvb2tzLmNyZWF0ZUNvbnRleHQgICA9IGNyZWF0ZUNvbnRleHQ7XG5ob29rcy51c2VDb250ZXh0ICAgICAg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