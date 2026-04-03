/*!
 * @cdp/template 0.9.22
 *   HTML template library
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-template'), require('@cdp/extension-template-bridge'), require('@cdp/core-utils'), require('@cdp/core-template'), require('@cdp/web-utils'), require('@cdp/dom')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-template', '@cdp/extension-template-bridge', '@cdp/core-utils', '@cdp/core-template', '@cdp/web-utils', '@cdp/dom'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP.Exension, global.CDP.Exension, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, extensionTemplate, extensionTemplateBridge, coreUtils, coreTemplate, webUtils, dom) { 'use strict';

    /** @internal builtin transformers (default: mustache). */
    const _builtins = {
        mustache: extensionTemplateBridge.createMustacheTransformer(extensionTemplate.html, extensionTemplate.directives.unsafeHTML),
        stampino: extensionTemplateBridge.createStampinoTransformer(),
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
        let src = await webUtils.loadTemplateSource(selector, { url, noCache });
        if (!src) {
            throw new URIError(`cannot specified template resource. { selector: ${selector},  url: ${url} }`);
        }
        if (coreUtils.isFunction(callback)) {
            src = await callback(src);
        }
        switch (type) {
            case 'engine':
                return coreTemplate.TemplateEngine.compile(src instanceof HTMLTemplateElement ? coreUtils.unescapeHTML(src.innerHTML) : src, options);
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

    const schedule = coreUtils.scheduler();
    class HookDirective extends extensionTemplate.AsyncDirective {
        _state;
        _renderer;
        _args;
        _elObserved;
        _disconnectedHandler;
        constructor(part) {
            super(part);
            this._state = new State(() => this.redraw(), this);
            this._renderer = coreUtils.noop;
            this._args = [];
        }
        render(elRoot, renderer, ...args) {
            this._renderer = renderer;
            this._args = args;
            this.observe(elRoot);
            this.redraw();
            return extensionTemplate.noChange;
        }
        disconnected() {
            this._elObserved && dom.dom.utils.undetectify(this._elObserved);
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
                dom.dom.utils.detectify(this._elObserved, elRoot);
                this._elObserved.addEventListener('disconnected', this._disconnectedHandler = this.disconnected.bind(this));
            }
        }
    }
    /** @internal */
    const hooksWith = extensionTemplate.directive(HookDirective);

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
            if (coreUtils.deepEqual(previousValue, value)) {
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
                return !this.lastValues || this.values.some((value, i) => !coreUtils.deepEqual(this.lastValues[i], value));
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
            return coreUtils.isFunction(callback) ? callback(value) : extensionTemplate.noChange;
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

    Object.defineProperty(exports, "clearTemplateCache", {
        enumerable: true,
        get: function () { return webUtils.clearTemplateCache; }
    });
    exports.Hook = Hook;
    exports.TemplateBridge = TemplateBridge;
    exports.getTemplate = getTemplate;
    exports.hooks = hooks;
    exports.makeHook = makeHook;
    Object.keys(extensionTemplate).forEach(function (k) {
        if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionTemplate[k]; }
        });
    });
    Object.keys(extensionTemplateBridge).forEach(function (k) {
        if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionTemplateBridge[k]; }
        });
    });

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VzIjpbImJyaWRnZS50cyIsImxvYWRlci50cyIsImhvb2tzL2N1cnJlbnQudHMiLCJob29rcy9zeW1ib2xzLnRzIiwiaG9va3Mvc3RhdGUudHMiLCJob29rcy9kaXJlY3RpdmUudHMiLCJob29rcy9ob29rLnRzIiwiaG9va3MvdXNlLXN0YXRlLnRzIiwiaG9va3MvY3JlYXRlLWVmZmVjdC50cyIsImhvb2tzL3VzZS1lZmZlY3QudHMiLCJob29rcy91c2UtbGF5b3V0LWVmZmVjdC50cyIsImhvb2tzL3VzZS1tZW1vLnRzIiwiaG9va3MvdXNlLXJlZi50cyIsImhvb2tzL3VzZS1jYWxsYmFjay50cyIsImhvb2tzL3VzZS1yZWR1Y2VyLnRzIiwiaG9va3MvY3JlYXRlLWNvbnRleHQudHMiLCJob29rcy91c2UtY29udGV4dC50cyIsImhvb2tzL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgdHlwZSBUZW1wbGF0ZVJlc3VsdCxcbiAgICB0eXBlIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIGh0bWwsXG4gICAgZGlyZWN0aXZlcyxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS1icmlkZ2UnO1xuaW1wb3J0IHR5cGUgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgYnVpbHRpbiB0cmFuc2Zvcm1lcnMgKGRlZmF1bHQ6IG11c3RhY2hlKS4gKi9cbmNvbnN0IF9idWlsdGluczogUmVjb3JkPHN0cmluZywgVGVtcGxhdGVUcmFuc2Zvcm1lcj4gPSB7XG4gICAgbXVzdGFjaGU6IGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoaHRtbCwgZGlyZWN0aXZlcy51bnNhZmVIVE1MKSxcbiAgICBzdGFtcGlubzogY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcigpLFxufTtcblxuLyoqXG4gKiBAZW4gQ29tcGlsZWQgSmF2YVNjcmlwdCB0ZW1wbGF0ZSBpbnRlcmZhY2VcbiAqIEBqYSDjgrPjg7Pjg5HjgqTjg6vmuIjjgb/jg4bjg7Pjg5fjg6zjg7zjg4jmoLzntI3jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxlZFRlbXBsYXRlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gU291cmNlIHRlbXBsYXRlIHN0cmluZ1xuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJdcbiAgICAgKi9cbiAgICBzb3VyY2U6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIFRlbXBsYXRlUmVzdWx0fSB0aGF0IGFwcGxpZWQgZ2l2ZW4gcGFyYW1ldGVyKHMpLlxuICAgICAqIEBqYSDjg5Hjg6njg6Hjg7zjgr/jgpLpgannlKjjgZcge0BsaW5rIFRlbXBsYXRlUmVzdWx0fSDjgbjlpInmj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWV3XG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBwYXJhbWV0ZXJzIGZvciBzb3VyY2UuXG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdDtcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIFRlbXBsYXRlQnJpZGdlfSBjb21waWxlIG9wdGlvbnNcbiAqIEBqYSB7QGxpbmsgVGVtcGxhdGVCcmlkZ2V9IOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRyYW5zZm9ybWVyPzogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbn1cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgYnJpZGdlIGZvciBvdGhlciB0ZW1wbGF0ZSBlbmdpbmUgc291cmNlLlxuICogQGphIOS7luOBruODhuODs+ODl+ODrOODvOODiOOCqOODs+OCuOODs+OBruWFpeWKm+OCkuWkieaPm+OBmeOCi+ODhuODs+ODl+ODrOODvOODiOODluODquODg+OCuOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVCcmlkZ2Uge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHN0YXRpYyBfdHJhbnNmb3JtZXIgPSBfYnVpbHRpbnMubXVzdGFjaGU7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBDb21waWxlZFRlbXBsYXRlfSBmcm9tIHRlbXBsYXRlIHNvdXJjZS5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiX44GL44KJIHtAbGluayBDb21waWxlZFRlbXBsYXRlfSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZW1wbGF0ZVxuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgc291cmNlIHN0cmluZyAvIHRlbXBsYXRlIGVsZW1lbnRcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIlyAvIOODhuODs+ODl+ODrOODvOODiOOCqOODrOODoeODs+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb21waWxlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY29tcGlsZSh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMpOiBDb21waWxlZFRlbXBsYXRlIHtcbiAgICAgICAgY29uc3QgeyB0cmFuc2Zvcm1lciB9ID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zZm9ybWVyOiBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXIgfSwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGVuZ2luZSA9IHRyYW5zZm9ybWVyKHRlbXBsYXRlKTtcbiAgICAgICAgY29uc3QganN0ID0gKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGVuZ2luZSh2aWV3KTtcbiAgICAgICAgfTtcbiAgICAgICAganN0LnNvdXJjZSA9IHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlO1xuICAgICAgICByZXR1cm4ganN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgZGVmYXVsdCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogQGphIOaXouWumuOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruabtOaWsFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1RyYW5zZm9ybWVyXG4gICAgICogIC0gYGVuYCBuZXcgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5paw44GX44GE5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBvbGQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5Lul5YmN44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzZXRUcmFuc2Zvcm1lcihuZXdUcmFuc2Zvcm1lcjogVGVtcGxhdGVUcmFuc2Zvcm1lcik6IFRlbXBsYXRlVHJhbnNmb3JtZXIge1xuICAgICAgICBjb25zdCBvbGRUcmFuc2Zvcm1lciA9IFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lcjtcbiAgICAgICAgVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyID0gbmV3VHJhbnNmb3JtZXI7XG4gICAgICAgIHJldHVybiBvbGRUcmFuc2Zvcm1lcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG5hbWUgbGlzdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5ZCN56ew5LiA6Kan44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgbmFtZSBsaXN0LlxuICAgICAqICAtIGBqYWAg5ZCN56ew5LiA6Kan44KS6L+U5Y20XG4gICAgICovXG4gICAgc3RhdGljIGdldCBidWlsdGlucygpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhfYnVpbHRpbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYnVpbHQtaW4gdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDntYTjgb/ovrzjgb/jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0cmFuc2Zvcm1lciBvYmplY3QgbmFtZS5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjeOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZXRCdWl0aW5UcmFuc2Zvcm1lcihuYW1lOiBzdHJpbmcpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF9idWlsdGluc1tuYW1lXTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmVzY2FwZUhUTUwsIGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEpTVCxcbiAgICB0eXBlIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVFbmdpbmUsXG59IGZyb20gJ0BjZHAvY29yZS10ZW1wbGF0ZSc7XG5pbXBvcnQgeyB0eXBlIExvYWRUZW1wbGF0ZU9wdGlvbnMsIGxvYWRUZW1wbGF0ZVNvdXJjZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmV4cG9ydCB7IGNsZWFyVGVtcGxhdGVDYWNoZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBDb21waWxlZFRlbXBsYXRlLFxuICAgIHR5cGUgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyxcbiAgICBUZW1wbGF0ZUJyaWRnZSxcbn0gZnJvbSAnLi9icmlkZ2UnO1xuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGxpc3QuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeVR5cGVMaXN0IHtcbiAgICBlbmdpbmU6IEpTVDtcbiAgICBicmlkZ2U6IENvbXBpbGVkVGVtcGxhdGU7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IHR5cGUgZGVmaW5pdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5oyH5a6a5a2QXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUXVlcnlUeXBlcyA9IGtleW9mIFRlbXBsYXRlUXVlcnlUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgb3B0aW9ucy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpfjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVF1ZXJ5T3B0aW9uczxUIGV4dGVuZHMgVGVtcGxhdGVRdWVyeVR5cGVzPiBleHRlbmRzIExvYWRUZW1wbGF0ZU9wdGlvbnMsIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIGBlbmdpbmVgIC8gJ2JyaWRnZSdcbiAgICAgKi9cbiAgICB0eXBlPzogVDtcbiAgICAvKipcbiAgICAgKiBAZW4gdGVtcGxhdGUgbG9hZCBjYWxsYmFjay4gYGJyaWRnZWAgbW9kZSBhbGxvd3MgbG9jYWxpemF0aW9uIGhlcmUuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOiqreOBv+i+vOOBv+OCs+ODvOODq+ODkOODg+OCry4gYGJyaWRnZWAg44Oi44O844OJ44Gn44Gv44GT44GT44Gn44Ot44O844Kr44Op44Kk44K644GM5Y+v6IO9XG4gICAgICovXG4gICAgY2FsbGJhY2s/OiAoc3JjOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50KSA9PiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgUHJvbWlzZTxzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50Pjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGNvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUuXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/IEphdmFTY3JpcHQg44OG44Oz44OX44Os44O844OI5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGU8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcyA9ICdlbmdpbmUnPihcbiAgICBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVRdWVyeU9wdGlvbnM8VD5cbik6IFByb21pc2U8VGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdPiB7XG4gICAgY29uc3QgeyB0eXBlLCB1cmwsIG5vQ2FjaGUsIGNhbGxiYWNrIH0gPSBPYmplY3QuYXNzaWduKHsgdHlwZTogJ2VuZ2luZScsIG5vQ2FjaGU6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgIGxldCBzcmMgPSBhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsLCBub0NhY2hlIH0pO1xuICAgIGlmICghc3JjKSB7XG4gICAgICAgIHRocm93IG5ldyBVUklFcnJvcihgY2Fubm90IHNwZWNpZmllZCB0ZW1wbGF0ZSByZXNvdXJjZS4geyBzZWxlY3RvcjogJHtzZWxlY3Rvcn0sICB1cmw6ICR7dXJsfSB9YCk7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIHNyYyA9IGF3YWl0IGNhbGxiYWNrKHNyYyk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2VuZ2luZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVFbmdpbmUuY29tcGlsZShzcmMgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdW5lc2NhcGVIVE1MKHNyYy5pbm5lckhUTUwpIDogc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGNhc2UgJ2JyaWRnZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVCcmlkZ2UuY29tcGlsZShzcmMsIG9wdGlvbnMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFt0eXBlOiAke3R5cGV9XSBpcyB1bmtub3duLmApO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmxldCBfY3VycmVudElkID0gMDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGxldCBjdXJyZW50OiBJSG9va1N0YXRlIHwgbnVsbDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHNldEN1cnJlbnQgPSAoc3RhdGU6IElIb29rU3RhdGUpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY2xlYXJDdXJyZW50ID0gKCk6IHZvaWQgPT4ge1xuICAgIGN1cnJlbnQgPSBudWxsO1xuICAgIF9jdXJyZW50SWQgPSAwO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmeSA9ICgpOiBudW1iZXIgPT4ge1xuICAgIHJldHVybiBfY3VycmVudElkKys7XG59O1xuIiwiLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGhvb2tTeW1ib2wgPSBTeW1ib2woJ2hvb2snKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlZmZlY3RzU3ltYm9sID0gU3ltYm9sKCdlZmZlY3RzJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgbGF5b3V0RWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnbGF5b3V0RWZmZWN0cycpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBFZmZlY3RzU3ltYm9scyA9IHR5cGVvZiBlZmZlY3RzU3ltYm9sIHwgdHlwZW9mIGxheW91dEVmZmVjdHNTeW1ib2w7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB7IHNldEN1cnJlbnQsIGNsZWFyQ3VycmVudCB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQge1xuICAgIHR5cGUgRWZmZWN0c1N5bWJvbHMsXG4gICAgaG9va1N5bWJvbCxcbiAgICBlZmZlY3RzU3ltYm9sLFxuICAgIGxheW91dEVmZmVjdHNTeW1ib2wsXG59IGZyb20gJy4vc3ltYm9scyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FsbGFibGUge1xuICAgIGNhbGw6IChzdGF0ZTogU3RhdGUpID0+IHZvaWQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjbGFzcyBTdGF0ZTxIID0gdW5rbm93bj4gaW1wbGVtZW50cyBJSG9va1N0YXRlPEg+IHtcbiAgICB1cGRhdGU6IFZvaWRGdW5jdGlvbjtcbiAgICBob3N0OiBIO1xuICAgIHZpcnR1YWw/OiBib29sZWFuO1xuICAgIFtob29rU3ltYm9sXTogTWFwPG51bWJlciwgSG9vaz47XG4gICAgW2VmZmVjdHNTeW1ib2xdOiBDYWxsYWJsZVtdO1xuICAgIFtsYXlvdXRFZmZlY3RzU3ltYm9sXTogQ2FsbGFibGVbXTtcblxuICAgIGNvbnN0cnVjdG9yKHVwZGF0ZTogVm9pZEZ1bmN0aW9uLCBob3N0OiBIKSB7XG4gICAgICAgIHRoaXMudXBkYXRlID0gdXBkYXRlO1xuICAgICAgICB0aGlzLmhvc3QgPSBob3N0O1xuICAgICAgICB0aGlzW2hvb2tTeW1ib2xdID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzW2VmZmVjdHNTeW1ib2xdID0gW107XG4gICAgICAgIHRoaXNbbGF5b3V0RWZmZWN0c1N5bWJvbF0gPSBbXTtcbiAgICB9XG5cbiAgICBydW48VD4oY2I6ICgpID0+IFQpOiBUIHtcbiAgICAgICAgc2V0Q3VycmVudCh0aGlzKTtcbiAgICAgICAgY29uc3QgcmVzID0gY2IoKTtcbiAgICAgICAgY2xlYXJDdXJyZW50KCk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgX3J1bkVmZmVjdHMocGhhc2U6IEVmZmVjdHNTeW1ib2xzKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzW3BoYXNlXTtcbiAgICAgICAgc2V0Q3VycmVudCh0aGlzKTtcbiAgICAgICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY2xlYXJDdXJyZW50KCk7XG4gICAgfVxuXG4gICAgcnVuRWZmZWN0cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcnVuRWZmZWN0cyhlZmZlY3RzU3ltYm9sKTtcbiAgICB9XG5cbiAgICBydW5MYXlvdXRFZmZlY3RzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9ydW5FZmZlY3RzKGxheW91dEVmZmVjdHNTeW1ib2wpO1xuICAgIH1cblxuICAgIHRlYXJkb3duKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBob29rcyA9IHRoaXNbaG9va1N5bWJvbF07XG4gICAgICAgIGZvciAoY29uc3QgWywgaG9va10gb2YgaG9va3MpIHtcbiAgICAgICAgICAgICgnZnVuY3Rpb24nID09PSB0eXBlb2YgaG9vay50ZWFyZG93bikgJiYgaG9vay50ZWFyZG93bigpO1xuICAgICAgICAgICAgZGVsZXRlIGhvb2sudGVhcmRvd247XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgUGFydEluZm8sXG4gICAgdHlwZSBEaXJlY3RpdmVSZXN1bHQsXG4gICAgQXN5bmNEaXJlY3RpdmUsXG4gICAgZGlyZWN0aXZlLFxuICAgIG5vQ2hhbmdlLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIG5vb3AsXG4gICAgc2NoZWR1bGVyLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgZG9tIGFzICQgfSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuXG5jb25zdCBzY2hlZHVsZSA9IHNjaGVkdWxlcigpO1xuXG5pbnRlcmZhY2UgRGlzY29ubmVjdGFibGUge1xuICAgIF8kcGFyZW50PzogRGlzY29ubmVjdGFibGU7XG4gICAgcGFyZW50Tm9kZTogRWxlbWVudDtcbn1cblxuY2xhc3MgSG9va0RpcmVjdGl2ZSBleHRlbmRzIEFzeW5jRGlyZWN0aXZlIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGF0ZTogU3RhdGU7XG4gICAgcHJpdmF0ZSBfcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbjtcbiAgICBwcml2YXRlIF9hcmdzOiB1bmtub3duW107XG4gICAgcHJpdmF0ZSBfZWxPYnNlcnZlZD86IE5vZGU7XG4gICAgcHJpdmF0ZSBfZGlzY29ubmVjdGVkSGFuZGxlcj86IHR5cGVvZiBIb29rRGlyZWN0aXZlLnByb3RvdHlwZS5kaXNjb25uZWN0ZWQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJ0OiBQYXJ0SW5mbykge1xuICAgICAgICBzdXBlcihwYXJ0KTtcbiAgICAgICAgdGhpcy5fc3RhdGUgPSBuZXcgU3RhdGUoKCkgPT4gdGhpcy5yZWRyYXcoKSwgdGhpcyk7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVyID0gbm9vcDtcbiAgICAgICAgdGhpcy5fYXJncyA9IFtdO1xuICAgIH1cblxuICAgIHJlbmRlcihlbFJvb3Q6IE5vZGUgfCBudWxsLCByZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pOiBEaXJlY3RpdmVSZXN1bHQge1xuICAgICAgICB0aGlzLl9yZW5kZXJlciA9IHJlbmRlcmVyO1xuICAgICAgICB0aGlzLl9hcmdzID0gYXJncztcbiAgICAgICAgdGhpcy5vYnNlcnZlKGVsUm9vdCk7XG4gICAgICAgIHRoaXMucmVkcmF3KCk7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgZGlzY29ubmVjdGVkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkICYmICQudXRpbHMudW5kZXRlY3RpZnkodGhpcy5fZWxPYnNlcnZlZCk7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX3N0YXRlLnRlYXJkb3duKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZWRyYXcoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YXRlLnJ1bigoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByID0gdGhpcy5fcmVuZGVyZXIoLi4udGhpcy5fYXJncyk7XG4gICAgICAgICAgICB0aGlzLnNldFZhbHVlKHIpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fc3RhdGUucnVuTGF5b3V0RWZmZWN0cygpO1xuICAgICAgICBzY2hlZHVsZSgoKSA9PiB0aGlzLl9zdGF0ZS5ydW5FZmZlY3RzKCkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgb2JzZXJ2ZShlbFJvb3Q6IE5vZGUgfCBudWxsKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9kaXNjb25uZWN0ZWRIYW5kbGVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IF8kcGFyZW50IH0gPSB0aGlzIGFzIHVua25vd24gYXMgRGlzY29ubmVjdGFibGU7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgPSBfJHBhcmVudD8ucGFyZW50Tm9kZTtcbiAgICAgICAgaWYgKHRoaXMuX2VsT2JzZXJ2ZWQpIHtcbiAgICAgICAgICAgICQudXRpbHMuZGV0ZWN0aWZ5KHRoaXMuX2VsT2JzZXJ2ZWQsIGVsUm9vdCEpO1xuICAgICAgICAgICAgdGhpcy5fZWxPYnNlcnZlZC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCB0aGlzLl9kaXNjb25uZWN0ZWRIYW5kbGVyID0gdGhpcy5kaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rc1dpdGggPSBkaXJlY3RpdmUoSG9va0RpcmVjdGl2ZSk7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY3VycmVudCwgbm90aWZ5IH0gZnJvbSAnLi9jdXJyZW50JztcbmltcG9ydCB7IGhvb2tTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKipcbiAqIEBlbiBCYXNlIGFic3RyYWN0IGNsYXNzIGZvciBDdXN0b20gSG9vayBDbGFzcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/jgq/jg6njgrnjga7ln7rlupXmir3osaHjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEhvb2s8UCBleHRlbmRzIHVua25vd25bXSA9IHVua25vd25bXSwgUiA9IHVua25vd24sIEggPSB1bmtub3duPiB7XG4gICAgaWQ6IG51bWJlcjtcbiAgICBzdGF0ZTogSUhvb2tTdGF0ZTxIPjtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlPEg+KSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgIH1cblxuICAgIGFic3RyYWN0IHVwZGF0ZSguLi5hcmdzOiBQKTogUjtcbiAgICB0ZWFyZG93bj8oKTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGRlZmluaXRpb24gZm9yIGN1c3RvbSBob29rcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/jga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ3VzdG9tSG9vazxQIGV4dGVuZHMgdW5rbm93bltdID0gdW5rbm93bltdLCBSID0gdW5rbm93biwgSCA9IHVua25vd24+ID0gbmV3IChpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZTxIPiwgLi4uYXJnczogUCkgPT4gSG9vazxQLCBSLCBIPjtcblxuY29uc3QgdXNlID0gPFAgZXh0ZW5kcyB1bmtub3duW10sIFIsIEggPSB1bmtub3duPihIb29rOiBDdXN0b21Ib29rPFAsIFIsIEg+LCAuLi5hcmdzOiBQKTogUiA9PiB7XG4gICAgY29uc3QgaWQgPSBub3RpZnkoKTtcbiAgICBjb25zdCBob29rcyA9IChjdXJyZW50IGFzIGFueSlbaG9va1N5bWJvbF0gYXMgTWFwPG51bWJlciwgSG9vaz47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4gICAgbGV0IGhvb2sgPSBob29rcy5nZXQoaWQpIGFzIEhvb2s8UCwgUiwgSD4gfCB1bmRlZmluZWQ7XG4gICAgaWYgKCFob29rKSB7XG4gICAgICAgIGhvb2sgPSBuZXcgSG9vayhpZCwgY3VycmVudCBhcyBJSG9va1N0YXRlPEg+LCAuLi5hcmdzKTtcbiAgICAgICAgaG9va3Muc2V0KGlkLCBob29rKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9vay51cGRhdGUoLi4uYXJncyk7XG59O1xuXG4vKipcbiAqIEBlbiBGYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBjdXN0b20gaG9va3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv5L2c5oiQ55So44OV44Kh44Kv44OI44Oq6Zai5pWwXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBJSG9va1N0YXRlQ29udGV4dCwgSG9vaywgbWFrZUhvb2sgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGV4cG9ydCBjb25zdCB1c2VNZW1vID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gKiAgICAgdmFsdWU6IFQ7XG4gKiAgICAgdmFsdWVzOiB1bmtub3duW107XG4gKlxuICogICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKSB7XG4gKiAgICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gKiAgICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICogICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAqICAgICB9XG4gKlxuICogICAgIHVwZGF0ZShmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pOiBUIHtcbiAqICAgICAgICAgaWYgKHRoaXMuaGFzQ2hhbmdlZCh2YWx1ZXMpKSB7XG4gKiAgICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAqICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICogICAgICAgICB9XG4gKiAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICogICAgIH1cbiAqXG4gKiAgICAgaGFzQ2hhbmdlZCh2YWx1ZXM6IHVua25vd25bXSA9IFtdKTogYm9vbGVhbiB7XG4gKiAgICAgICAgIHJldHVybiB2YWx1ZXMuc29tZSgodmFsdWUsIGkpID0+IHRoaXMudmFsdWVzW2ldICE9PSB2YWx1ZSk7XG4gKiAgICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG1ha2VIb29rID0gPFAgZXh0ZW5kcyB1bmtub3duW10sIFIsIEggPSB1bmtub3duPihIb29rOiBDdXN0b21Ib29rPFAsIFIsIEg+KTogKC4uLmFyZ3M6IFApID0+IFIgPT4ge1xuICAgIHJldHVybiAoLi4uYXJnczogUCk6IFIgPT4gdXNlKEhvb2ssIC4uLmFyZ3MpO1xufTtcbiIsImltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7IElIb29rU3RhdGUsIE5ld0hvb2tTdGF0ZSwgSG9va1N0YXRlVXBkYXRlciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VTdGF0ZSA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICAgIGFyZ3MhOiByZWFkb25seSBbVCwgSG9va1N0YXRlVXBkYXRlcjxUPl07XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZSwgaW5pdGlhbFZhbHVlOiBUKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMudXBkYXRlciA9IHRoaXMudXBkYXRlci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgICAgICBpbml0aWFsVmFsdWUgPSBpbml0aWFsVmFsdWUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWFrZUFyZ3MoaW5pdGlhbFZhbHVlKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKTogcmVhZG9ubHkgW1QsIEhvb2tTdGF0ZVVwZGF0ZXI8VD5dIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJncztcbiAgICB9XG5cbiAgICB1cGRhdGVyKHZhbHVlOiBOZXdIb29rU3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgW3ByZXZpb3VzVmFsdWVdID0gdGhpcy5hcmdzO1xuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB1cGRhdGVyRm4gPSB2YWx1ZSBhcyAocHJldmlvdXNTdGF0ZT86IFQpID0+IFQ7XG4gICAgICAgICAgICB2YWx1ZSA9IHVwZGF0ZXJGbihwcmV2aW91c1ZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWVwRXF1YWwocHJldmlvdXNWYWx1ZSwgdmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICB9XG5cbiAgICBtYWtlQXJncyh2YWx1ZTogVCk6IHZvaWQge1xuICAgICAgICB0aGlzLmFyZ3MgPSBPYmplY3QuZnJlZXplKFt2YWx1ZSwgdGhpcy51cGRhdGVyXSBhcyBjb25zdCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxufSkgYXMgPFQ+KGluaXRpYWxTdGF0ZT86IFQpID0+IHJlYWRvbmx5IFtcbiAgICBUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFIpID8gUiA6IFQsXG4gICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG5dO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LWZ1bmN0aW9uLXJldHVybi10eXBlLFxuICovXG5cbmltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSwgQ2FsbGFibGUgfSBmcm9tICcuL3N0YXRlJztcblxudHlwZSBFZmZlY3QgPSAodGhpczogU3RhdGUpID0+IHZvaWQgfCBWb2lkRnVuY3Rpb24gfCBQcm9taXNlPHZvaWQ+O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY3JlYXRlRWZmZWN0ID0gKHNldEVmZmVjdHM6IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSkgPT4gdm9pZCkgPT4ge1xuICAgIHJldHVybiBtYWtlSG9vayhjbGFzcyBleHRlbmRzIEhvb2sge1xuICAgICAgICBjYWxsYmFjayE6IEVmZmVjdDtcbiAgICAgICAgbGFzdFZhbHVlcz86IHVua25vd25bXTtcbiAgICAgICAgdmFsdWVzPzogdW5rbm93bltdO1xuICAgICAgICBfdGVhcmRvd24hOiBQcm9taXNlPHZvaWQ+IHwgVm9pZEZ1bmN0aW9uIHwgdm9pZDtcblxuICAgICAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZSwgaWdub3JlZDE6IEVmZmVjdCwgaWdub3JlZDI/OiB1bmtub3duW10pIHtcbiAgICAgICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgICAgICBzZXRFZmZlY3RzKHN0YXRlIGFzIFN0YXRlLCB0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZShjYWxsYmFjazogRWZmZWN0LCB2YWx1ZXM/OiB1bmtub3duW10pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICghdGhpcy52YWx1ZXMgfHwgdGhpcy5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sYXN0VmFsdWVzID0gdGhpcy52YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBydW4oKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnRlYXJkb3duKCk7XG4gICAgICAgICAgICB0aGlzLl90ZWFyZG93biA9IHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLnN0YXRlIGFzIFN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRlYXJkb3duKCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLl90ZWFyZG93bikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RlYXJkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBoYXNDaGFuZ2VkKCk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmxhc3RWYWx1ZXMgfHwgdGhpcy52YWx1ZXMhLnNvbWUoKHZhbHVlLCBpKSA9PiAhZGVlcEVxdWFsKHRoaXMubGFzdFZhbHVlcyFbaV0sIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgZWZmZWN0c1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQgeyBjcmVhdGVFZmZlY3QgfSBmcm9tICcuL2NyZWF0ZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3Qgc2V0RWZmZWN0cyA9IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSk6IHZvaWQgPT4ge1xuICAgIHN0YXRlW2VmZmVjdHNTeW1ib2xdLnB1c2goY2IpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUVmZmVjdCA9IGNyZWF0ZUVmZmVjdChzZXRFZmZlY3RzKTtcbiIsImltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBsYXlvdXRFZmZlY3RzU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCB7IGNyZWF0ZUVmZmVjdCB9IGZyb20gJy4vY3JlYXRlLWVmZmVjdCc7XG5cbmNvbnN0IHNldExheW91dEVmZmVjdHMgPSAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpOiB2b2lkID0+IHtcbiAgICBzdGF0ZVtsYXlvdXRFZmZlY3RzU3ltYm9sXS5wdXNoKGNiKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VMYXlvdXRFZmZlY3QgPSBjcmVhdGVFZmZlY3Qoc2V0TGF5b3V0RWZmZWN0cyk7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlTWVtbyA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICAgIHZhbHVlOiBUO1xuICAgIHZhbHVlczogdW5rbm93bltdO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgfVxuXG4gICAgaGFzQ2hhbmdlZCh2YWx1ZXM6IHVua25vd25bXSA9IFtdKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2YWx1ZXMuc29tZSgodmFsdWUsIGkpID0+IHRoaXMudmFsdWVzW2ldICE9PSB2YWx1ZSk7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfSA9IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHVzZU1lbW8oKCkgPT4gKHtcbiAgICBjdXJyZW50OiBpbml0aWFsVmFsdWVcbn0pLCBbXSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVFxuICAgID0gPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gdXNlTWVtbygoKSA9PiBmbiwgaW5wdXRzKTtcbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZSwgSG9va1JlZHVjZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlUmVkdWNlciA9IG1ha2VIb29rKGNsYXNzIDxTLCBJLCBBPiBleHRlbmRzIEhvb2sge1xuICAgIHJlZHVjZXIhOiBIb29rUmVkdWNlcjxTLCBBPjtcbiAgICBjdXJyZW50U3RhdGU6IFM7XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZSwgXzogSG9va1JlZHVjZXI8UywgQT4sIGluaXRpYWxTdGF0ZTogSSwgaW5pdD86IChfOiBJKSA9PiBTKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSB0aGlzLmRpc3BhdGNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gdW5kZWZpbmVkICE9PSBpbml0ID8gaW5pdChpbml0aWFsU3RhdGUpIDogaW5pdGlhbFN0YXRlIGFzIHVua25vd24gYXMgUztcbiAgICB9XG5cbiAgICB1cGRhdGUocmVkdWNlcjogSG9va1JlZHVjZXI8UywgQT4pOiByZWFkb25seSBbUywgKGFjdGlvbjogQSkgPT4gdm9pZF0ge1xuICAgICAgICB0aGlzLnJlZHVjZXIgPSByZWR1Y2VyO1xuICAgICAgICByZXR1cm4gW3RoaXMuY3VycmVudFN0YXRlLCB0aGlzLmRpc3BhdGNoXTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICB9XG5cbiAgICBkaXNwYXRjaChhY3Rpb246IEEpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSB0aGlzLnJlZHVjZXIodGhpcy5jdXJyZW50U3RhdGUsIGFjdGlvbik7XG4gICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgeyB0eXBlIERpcmVjdGl2ZVJlc3VsdCwgbm9DaGFuZ2UgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgSUhvb2tDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuY2xhc3MgSG9va0NvbnRleHQ8VD4gaW1wbGVtZW50cyBJSG9va0NvbnRleHQ8VD4ge1xuICAgIHJlYWRvbmx5IGRlZmF1bHRWYWx1ZTogVCB8IHVuZGVmaW5lZDtcbiAgICBwcml2YXRlIF92YWx1ZTogVDtcblxuICAgIGNvbnN0cnVjdG9yKGRlZmF1bHRWYWx1ZT86IFQpIHtcbiAgICAgICAgdGhpcy5wcm92aWRlID0gdGhpcy5wcm92aWRlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY29uc3VtZSA9IHRoaXMuY29uc3VtZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSBkZWZhdWx0VmFsdWUgYXMgVDtcbiAgICB9XG5cbiAgICBwcm92aWRlKHZhbHVlOiBULCBjYWxsYmFjaz86ICh2YWx1ZTogVCkgPT4gRGlyZWN0aXZlUmVzdWx0KTogRGlyZWN0aXZlUmVzdWx0IHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIGlzRnVuY3Rpb24oY2FsbGJhY2spID8gY2FsbGJhY2sodmFsdWUpIDogbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgY29uc3VtZShjYWxsYmFjazogKHZhbHVlOiBUKSA9PiBEaXJlY3RpdmVSZXN1bHQgfCB2b2lkKTogRGlyZWN0aXZlUmVzdWx0IHwgdm9pZCB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayh0aGlzLl92YWx1ZSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY3JlYXRlQ29udGV4dCA9IDxUPihkZWZhdWx0VmFsdWU/OiBUKTogSUhvb2tDb250ZXh0PFQ+ID0+IHtcbiAgICByZXR1cm4gbmV3IEhvb2tDb250ZXh0KGRlZmF1bHRWYWx1ZSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlLCBJSG9va0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgc2V0RWZmZWN0cyB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDb250ZXh0ID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vazxbSUhvb2tDb250ZXh0PFQ+XSwgVCwgdW5rbm93bj4ge1xuICAgIHByaXZhdGUgX3JhbkVmZmVjdDogYm9vbGVhbjtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlLCBfOiBJSG9va0NvbnRleHQ8VD4pIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy5fcmFuRWZmZWN0ID0gZmFsc2U7XG4gICAgICAgIHNldEVmZmVjdHMoc3RhdGUgYXMgU3RhdGUsIHRoaXMpO1xuICAgIH1cblxuICAgIHVwZGF0ZShjb250ZXh0OiBJSG9va0NvbnRleHQ8VD4pOiBUIHtcbiAgICAgICAgbGV0IHJldHZhbCE6IFQ7XG4gICAgICAgIGNvbnRleHQuY29uc3VtZSh2YWx1ZSA9PiB7IHJldHZhbCA9IHZhbHVlOyB9KTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG5cbiAgICBjYWxsKCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuX3JhbkVmZmVjdCkge1xuICAgICAgICAgICAgdGhpcy5fcmFuRWZmZWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bkZ1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHtcbiAgICBIb29rU3RhdGVVcGRhdGVyLFxuICAgIEhvb2tSZWR1Y2VyLFxuICAgIElIb29rQ29udGV4dCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGhvb2tzV2l0aCB9IGZyb20gJy4vZGlyZWN0aXZlJztcbmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAnLi91c2Utc3RhdGUnO1xuaW1wb3J0IHsgdXNlRWZmZWN0IH0gZnJvbSAnLi91c2UtZWZmZWN0JztcbmltcG9ydCB7IHVzZUxheW91dEVmZmVjdCB9IGZyb20gJy4vdXNlLWxheW91dC1lZmZlY3QnO1xuaW1wb3J0IHsgdXNlTWVtbyB9IGZyb20gJy4vdXNlLW1lbW8nO1xuaW1wb3J0IHsgdXNlUmVmIH0gZnJvbSAnLi91c2UtcmVmJztcbmltcG9ydCB7IHVzZUNhbGxiYWNrIH0gZnJvbSAnLi91c2UtY2FsbGJhY2snO1xuaW1wb3J0IHsgdXNlUmVkdWNlciB9IGZyb20gJy4vdXNlLXJlZHVjZXInO1xuaW1wb3J0IHsgY3JlYXRlQ29udGV4dCB9IGZyb20gJy4vY3JlYXRlLWNvbnRleHQnO1xuaW1wb3J0IHsgdXNlQ29udGV4dCB9IGZyb20gJy4vdXNlLWNvbnRleHQnO1xuZXhwb3J0ICogZnJvbSAnLi9pbnRlcmZhY2VzJztcbmV4cG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcblxuLyoqXG4gKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBwYXJpdHkgd2l0aCB0aGUgUmVhY3QgaG9va3MgY29uY2VwdC5cbiAqIEBqYSBSZWFjdCBob29rcyDjgrPjg7Pjgrvjg5fjg4jjgajlkIznrYnjga7mqZ/og73jgpLmj5DkvptcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGh0bWwsIHJlbmRlciwgaG9va3MgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICogY29uc3QgeyB1c2VTdGF0ZSB9ID0gaG9va3M7XG4gKlxuICogLy8gZnVuY3Rpb24gY29tcG9uZW50XG4gKiBmdW5jdGlvbiBBcHAoKSB7XG4gKiAgICAgY29uc3QgW2NvdW50LCBzZXRDb3VudF0gPSB1c2VTdGF0ZSgwKTtcbiAqICAgICByZXR1cm4gaHRtbGBcbiAqICAgICAgICAgPHA+Q291bnQ6ICR7IGNvdW50IH08L3A+XG4gKiAgICAgICAgIDxidXR0b24gY2xhc3M9XCJzdGF0ZS1wbHVzXCIgQGNsaWNrPSR7KCkgPT4gc2V0Q291bnQocHJldkNvdW50ID0+IHByZXZDb3VudCEgKyAxKX0+4p6VPC9idXR0b24+XG4gKiAgICAgYDtcbiAqIH1cbiAqXG4gKiAvLyByZW5kZXIgd2l0aCBob29rc1xuICogcmVuZGVyKGhvb2tzKEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSG9va3Mge1xuICAgIC8qKlxuICAgICAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IHBhcml0eSB3aXRoIHRoZSBSZWFjdCBob29rcyBjb25jZXB0LiA8YnI+XG4gICAgICogICAgIEFkZCBIb29rcyBmZWF0dXJlIHRvIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4LlxuICAgICAqIEBqYSBSZWFjdCBob29rcyDjgrPjg7Pjgrvjg5fjg4jjgajlkIznrYnjga7mqZ/og73jgpLmj5DkvpsgPGJyPlxuICAgICAqICAgICDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgasgSG9va3Mg5qmf6IO944KS5LuY5YqgXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGltcG9ydCB7IGh0bWwsIHJlbmRlciwgaG9va3MgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICAgICAqIGNvbnN0IHsgdXNlU3RhdGUgfSA9IGhvb2tzO1xuICAgICAqXG4gICAgICogLy8gZnVuY3Rpb24gY29tcG9uZW50XG4gICAgICogZnVuY3Rpb24gQXBwKCkge1xuICAgICAqICAgICBjb25zdCBbY291bnQsIHNldENvdW50XSA9IHVzZVN0YXRlKDApO1xuICAgICAqICAgICByZXR1cm4gaHRtbGBcbiAgICAgKiAgICAgICAgIDxwPkNvdW50OiAkeyBjb3VudCB9PC9wPlxuICAgICAqICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInN0YXRlLXBsdXNcIiBAY2xpY2s9JHsoKSA9PiBzZXRDb3VudChwcmV2Q291bnQgPT4gcHJldkNvdW50ISArIDEpfT7inpU8L2J1dHRvbj5cbiAgICAgKiAgICAgYDtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyBlbmFibGluZyBob29rc1xuICAgICAqIHJlbmRlcihob29rcyhBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZW5kZXJlclxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiBvYmplY3QgdGhhdCByZXR1cm5zIGEgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OCkui/lOWNtOOBmeOCi+mWouaVsOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBBcmd1bWVudHMgcGFzc2VkIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgavjgo/jgZ/jgovlvJXmlbBcbiAgICAgKi9cbiAgICAocmVuZGVyZXI6IFVua25vd25GdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKTogdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgSG9va3MgZmVhdHVyZSB0byB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheC4gKHNwZWNpZnkgYSBET00gZGlzY29ubmVjdCBkZXRlY3Rpb24gZWxlbWVudClcbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44GrIEhvb2tzIOapn+iDveOCkuS7mOWKoCAoRE9NIOWIh+aWreaknOefpeimgee0oOOCkuaMh+WumilcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogY29uc3QgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc29tZS1wYWdlJyk7XG4gICAgICogLy8gZW5hYmxpbmcgaG9va3Mgd2l0aCByb290IGVsZW1lbnRcbiAgICAgKiByZW5kZXIoaG9va3Mud2l0aChlbCwgQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxSb290XG4gICAgICogIC0gYGVuYCBSb290IGVsZW1lbnQgdXNlZCBmb3IgRE9NIGRpc2Nvbm5lY3Rpb24gZGV0ZWN0aW9uLiBJZiBgbnVsbGAgcGFzc2VkLCBgZG9jdW1lbnRgIGlzIHNwZWNpZmllZFxuICAgICAqICAtIGBqYWAgRE9NIOWIh+aWreaknOefpeOBq+S9v+eUqOOBmeOCi+ODq+ODvOODiOimgee0oC4gYG51bGxgIOOBjOa4oeOCi+OBqCBgZG9jdW1lbnRgIOOBjOaMh+WumuOBleOCjOOCi1xuICAgICAqIEBwYXJhbSByZW5kZXJlclxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiBvYmplY3QgdGhhdCByZXR1cm5zIGEgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OCkui/lOWNtOOBmeOCi+mWouaVsOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBBcmd1bWVudHMgcGFzc2VkIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgavjgo/jgZ/jgovlvJXmlbBcbiAgICAgKi9cbiAgICB3aXRoOiAoZWxSb290OiBOb2RlIHwgbnVsbCwgcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIHN0YXRlZnVsIHZhbHVlIGFuZCBhIGZ1bmN0aW9uIHRvIHVwZGF0ZSBpdC5cbiAgICAgKiBAamEg44K544OG44O844OI44OV44Or44Gq5YCk44Go44CB44Gd44KM44KS5pu05paw44GZ44KL44Gf44KB44Gu6Zai5pWw44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFN0YXRlXG4gICAgICogIC0gYGVuYCBUaGUgdmFsdWUgeW91IHdhbnQgdGhlIHN0YXRlIHRvIGJlIGluaXRpYWxseS5cbiAgICAgKiAgLSBgamFgIOeKtuaFi+OBruWIneacn+WMluWApFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR1cm5zIGFuIGFycmF5IHdpdGggZXhhY3RseSB0d28gdmFsdWVzLiBbYGN1cnJlbnRTdGF0ZWAsIGB1cGRhdGVGdW5jdGlvbmBdXG4gICAgICogIC0gYGphYCAy44Gk44Gu5YCk44KS5oyB44Gk6YWN5YiX44KS6L+U5Y20IFtgY3VycmVudFN0YXRlYCwgYHVwZGF0ZUZ1bmN0aW9uYF1cbiAgICAgKi9cbiAgICB1c2VTdGF0ZTogPFQ+KGluaXRpYWxTdGF0ZT86IFQpID0+IHJlYWRvbmx5IFtcbiAgICAgICAgVCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBSKSA/IFIgOiBULFxuICAgICAgICBIb29rU3RhdGVVcGRhdGVyPFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUykgPyBTIDogVD5cbiAgICBdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGNvbnRhaW5zIGltcGVyYXRpdmUsIHBvc3NpYmx5IGVmZmVjdGZ1bCBjb2RlLlxuICAgICAqIEBqYSDlia/kvZznlKjjgpLmnInjgZnjgovlj6/og73mgKfjga7jgYLjgovlkb3ku6Tlnovjga7jgrPjg7zjg4njga7pgannlKhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlZmZlY3RcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcnVucyBlYWNoIHRpbWUgZGVwZW5kZW5jaWVzIGNoYW5nZVxuICAgICAqICAtIGBqYWAg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44KL44Gf44Gz44Gr5a6f6KGM44GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIGRlcGVuZGVuY2llc1xuICAgICAqICAtIGBlbmAgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gdGhlIGVmZmVjdFxuICAgICAqICAtIGBqYWAg5Ymv5L2c55So55m654Gr44Gu44OI44Oq44Ks44O844Go44Gq44KL5L6d5a2Y6Zai5L+C44Gu44Oq44K544OIXG4gICAgICovXG4gICAgdXNlRWZmZWN0OiAoZWZmZWN0OiAoKSA9PiB2b2lkLCBkZXBlbmRlbmNpZXM/OiB1bmtub3duW10pID0+IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXB0cyBhIGZ1bmN0aW9uIHRoYXQgY29udGFpbnMgaW1wZXJhdGl2ZSwgcG9zc2libHkgZWZmZWN0ZnVsIGNvZGUuIDxicj5cbiAgICAgKiAgICAgVW5saWtlIHtAbGluayBIb29rcy51c2VFZmZlY3R9ICwgaXQgaXMgZXhlY3V0ZWQgYmVmb3JlIHRoZSBjb21wb25lbnQgaXMgcmVuZGVyZWQgYW5kIHRoZSBuZXcgZWxlbWVudCBpcyBkaXNwbGF5ZWQgb24gdGhlIHNjcmVlbi5cbiAgICAgKiBAamEg5Ymv5L2c55So44KS5pyJ44GZ44KL5Y+v6IO95oCn44Gu44GC44KL5ZG95Luk5Z6L44Gu44Kz44O844OJ44Gu6YGp55SoIDxicj5cbiAgICAgKiAgICAge0BsaW5rIEhvb2tzLnVzZUVmZmVjdH0g44Go55Ww44Gq44KKLCDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgYzjg6zjg7Pjg4Djg6rjg7PjgrDjgZXjgozjgabmlrDjgZfjgYTopoHntKDjgYznlLvpnaLjgavooajnpLrjgZXjgozjgovliY3jgavlrp/ooYzjgZXjgozjgovjgIJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlZmZlY3RcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcnVucyBlYWNoIHRpbWUgZGVwZW5kZW5jaWVzIGNoYW5nZVxuICAgICAqICAtIGBqYWAg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44KL44Gf44Gz44Gr5a6f6KGM44GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIGRlcGVuZGVuY2llc1xuICAgICAqICAtIGBlbmAgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gdGhlIGVmZmVjdFxuICAgICAqICAtIGBqYWAg5Ymv5L2c55So55m654Gr44Gu44OI44Oq44Ks44O844Go44Gq44KL5L6d5a2Y6Zai5L+C44Gu44Oq44K544OIXG4gICAgICovXG4gICAgdXNlTGF5b3V0RWZmZWN0OiAoZWZmZWN0OiAoKSA9PiB2b2lkLCBkZXBlbmRlbmNpZXM/OiB1bmtub3duW10pID0+IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXNlZCB0byByZWR1Y2UgY29tcG9uZW50IHJlLXJlbmRlcmluZy4gPGJyPlxuICAgICAqICAgICBDYWNoZSB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIHRoZSBjYWNoZWQgdmFsdWUgd2hlbiBjYWxsZWQgd2l0aCB0aGUgc2FtZSBhcmd1bWVudHMuXG4gICAgICogQGphIOOCs+ODs+ODneODvOODjeODs+ODiOOBruWGjeODrOODs+ODgOODquODs+OCsOOCkuaKkeOBiOOCi+OBn+OCgeOBq+S9v+eUqCA8YnI+XG4gICAgICogICAgIOmWouaVsOOBruaIu+OCiuWApOOCkuOCreODo+ODg+OCt+ODpeOBl+OAgeWQjOOBmOW8leaVsOOBp+WRvOOBs+WHuuOBleOCjOOBn+WgtOWQiOOBq+OCreODo+ODg+OCt+ODpeOBleOCjOOBn+WApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHZhbHVlXG4gICAgICogIC0gYGphYCDlgKTjgpLov5TjgZnplqLmlbBcbiAgICAgKiBAcGFyYW0gdmFsdWVzXG4gICAgICogIC0gYGVuYCBBbiBhcnJheSBvZiB2YWx1ZXMgdGhhdCBhcmUgdXNlZCBhcyBhcmd1bWVudHMgZm9yIGBmbmBcbiAgICAgKiAgLSBgamFgIGBmbmAg44Gu5byV5pWw44Go44GX44Gm5L2/55So44GV44KM44KL5YCk44Gu6YWN5YiXXG4gICAgICovXG4gICAgdXNlTWVtbzogPFQ+KGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkgPT4gVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBMZXRzIHlvdSByZWZlcmVuY2UgYSB2YWx1ZSB0aGF04oCZcyBub3QgbmVlZGVkIGZvciByZW5kZXJpbmcuIDxicj5cbiAgICAgKiAgICAgTWFpbmx5IGF2YWlsYWJsZSBmb3IgYWNjZXNzaW5nIERPTSBub2Rlcy5cbiAgICAgKiBAamEg44Os44Oz44OA44Oq44Oz44Kw44Gr5LiN6KaB44Gq5YCk44KS5Y+C54Wn5Y+v6IO944Gr44GZ44KLPGJyPlxuICAgICAqICAgICDkuLvjgasgRE9NIOODjuODvOODieOBuOOBruOCouOCr+OCu+OCueOBq+WIqeeUqOWPr+iDvVxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWxWYWx1ZVxuICAgICAqICAtIGBlbmAgVGhlIGluaXRpYWwgdmFsdWUgb2YgdGhlIHJlZmVyZW5jZVxuICAgICAqICAtIGBqYWAg5Y+C54Wn44Gu5Yid5pyf5YCkXG4gICAgICovXG4gICAgdXNlUmVmOiA8VD4oaW5pdGlhbFZhbHVlOiBUKSA9PiB7IGN1cnJlbnQ6IFQ7IH07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhIG1lbW9pemVkIHZlcnNpb24gb2YgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgb25seSBjaGFuZ2VzIGlmIHRoZSBkZXBlbmRlbmNpZXMgY2hhbmdlLiA8YnI+XG4gICAgICogICAgIFVzZWZ1bCBmb3IgcGFzc2luZyBjYWxsYmFja3MgdG8gb3B0aW1pemVkIGNoaWxkIGNvbXBvbmVudHMgdGhhdCByZWx5IG9uIHJlZmVyZW50aWFsIGVxdWFsaXR5LlxuICAgICAqIEBqYSDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgZ/loLTlkIjjgavjga7jgb/lpInmm7TjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbDjga7jg6Hjg6LljJbjg5Djg7zjgrjjg6fjg7PjgpLov5TljbQgPGJyPlxuICAgICAqICAgICDlj4LnhafnrYnkvqHmgKfjgavkvp3lrZjjgZnjgovmnIDpganljJbjgZXjgozjgZ/lrZDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgavjgrPjg7zjg6vjg5Djg4Pjgq/jgpLmuKHjgZnloLTlkIjjgavlvbnnq4vjgaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqICAtIGBlbmAgVGhlIGZ1bmN0aW9uIHRvIG1lbW9pemVcbiAgICAgKiAgLSBgamFgIOODoeODouWMluOBmeOCi+mWouaVsFxuICAgICAqIEBwYXJhbSBpbnB1dHNcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5IG9mIGlucHV0cyB0byB3YXRjaCBmb3IgY2hhbmdlc1xuICAgICAqICAtIGBqYWAg5aSJ5pu044KS55uj6KaW44GZ44KL5YWl5Yqb44Gu6YWN5YiXXG4gICAgICovXG4gICAgdXNlQ2FsbGJhY2s6IDxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPihmbjogVCwgaW5wdXRzOiB1bmtub3duW10pID0+IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gSG9vayBBUEkgZm9yIG1hbmFnaW5nIHN0YXRlIGluIGZ1bmN0aW9uIGNvbXBvbmVudHMuXG4gICAgICogQGphIOmWouaVsOOCs+ODs+ODneODvOODjeODs+ODiOOBp+eKtuaFi+OCkueuoeeQhuOBmeOCi+OBn+OCgeOBriBIb29rIEFQSVxuICAgICAqXG4gICAgICogQHBhcmFtIHJlZHVjZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmQgYW4gYWN0aW9uIGFuZCByZXR1cm5zIGEgbmV3IHN0YXRlXG4gICAgICogIC0gYGphYCDnj77lnKjjga7nirbmhYvjgajjgqLjgq/jgrfjg6fjg7PjgpLlj5fjgZHlj5bjgorjgIHmlrDjgZfjgYTnirbmhYvjgpLov5TjgZnplqLmlbBcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFN0YXRlXG4gICAgICogIC0gYGVuYCBUaGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWNlclxuICAgICAqICAtIGBqYWAg44Oq44OH44Ol44O844K144O844Gu5Yid5pyf54q25oWL44KS5oyH5a6aXG4gICAgICogQHBhcmFtIGluaXRcbiAgICAgKiAgLSBgZW5gIEFuIG9wdGlvbmFsIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgaW5pdGlhbCBzdGF0ZSBvZiB0aGUgcmVkdWNlclxuICAgICAqICAtIGBqYWAg44Oq44OH44Ol44O844K144O844Gu5Yid5pyf54q25oWL44KS6L+U44GZ44Kq44OX44K344On44Oz44Gu6Zai5pWwXG4gICAgICovXG4gICAgdXNlUmVkdWNlcjogPFMsIEksIEE+KHJlZHVjZXI6IEhvb2tSZWR1Y2VyPFMsIEE+LCBpbml0aWFsU3RhdGU6IEksIGluaXQ/OiAoKF86IEkpID0+IFMpKSA9PiByZWFkb25seSBbUywgKGFjdGlvbjogQSkgPT4gdm9pZF07XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ3JlYXRlIGEgbmV3IGNvbnRleHQgb2JqZWN0LiBDb250ZXh0IG9iamVjdHMgYXJlIHVzZWQgdG8gc2hhcmUgZGF0YSB0aGF0IGlzIGNvbnNpZGVyZWQgXCJnbG9iYWxcIi5cbiAgICAgKiBAamEg5paw44GX44GE44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44KS5L2c5oiQ44GZ44KL44CC44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44GvLOOAjOOCsOODreODvOODkOODq+OAjeOBqOiAg+OBiOOCieOCjOOCi+ODh+ODvOOCv+OCkuWFseacieOBmeOCi+OBn+OCgeOBq+S9v+eUqOOBleOCjOOCi+OAglxuICAgICAqXG4gICAgICogQHBhcmFtIGRlZmF1bHRWYWx1ZVxuICAgICAqICAtIGBlbmA6IFRoZSBkZWZhdWx0IHZhbHVlIGZvciB0aGUgY29udGV4dCBvYmplY3RcbiAgICAgKiAgLSBgamFgOiDjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjga7jg4fjg5Xjgqnjg6vjg4jlgKRcbiAgICAgKi9cbiAgICBjcmVhdGVDb250ZXh0OiA8VD4oZGVmYXVsdFZhbHVlPzogVCkgPT4gSUhvb2tDb250ZXh0PFQ+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgY29udGV4dCB2YWx1ZSBmb3IgdGhlIHNwZWNpZmllZCBjb250ZXh0IG9iamVjdC5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44Gr5a++44GZ44KL54++5Zyo44Gu44Kz44Oz44OG44Kt44K544OI5YCk44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmA6IHRoZSBjb250ZXh0IG9iamVjdCByZXR1cm5lZCBmcm9tIHtAbGluayBIb29rcy5jcmVhdGVDb250ZXh0fVxuICAgICAqICAtIGBqYWA6IHtAbGluayBIb29rcy5jcmVhdGVDb250ZXh0fSDjgYvjgonov5TjgZXjgozjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKi9cbiAgICB1c2VDb250ZXh0OiA8VD4oY29udGV4dDogSUhvb2tDb250ZXh0PFQ+KSA9PiBUO1xufVxuXG5jb25zdCBob29rcyA9IGhvb2tzV2l0aC5iaW5kKG51bGwsIG51bGwpIGFzIEhvb2tzO1xuaG9va3Mud2l0aCAgICAgICAgICAgID0gaG9va3NXaXRoO1xuaG9va3MudXNlU3RhdGUgICAgICAgID0gdXNlU3RhdGU7XG5ob29rcy51c2VFZmZlY3QgICAgICAgPSB1c2VFZmZlY3Q7XG5ob29rcy51c2VMYXlvdXRFZmZlY3QgPSB1c2VMYXlvdXRFZmZlY3Q7XG5ob29rcy51c2VNZW1vICAgICAgICAgPSB1c2VNZW1vO1xuaG9va3MudXNlUmVmICAgICAgICAgID0gdXNlUmVmO1xuaG9va3MudXNlQ2FsbGJhY2sgICAgID0gdXNlQ2FsbGJhY2s7XG5ob29rcy51c2VSZWR1Y2VyICAgICAgPSB1c2VSZWR1Y2VyO1xuaG9va3MuY3JlYXRlQ29udGV4dCAgID0gY3JlYXRlQ29udGV4dDtcbmhvb2tzLnVzZUNvbnRleHQgICAgICA9IHVzZUNvbnRleHQ7XG5cbmV4cG9ydCB7IGhvb2tzIH07XG4iXSwibmFtZXMiOlsiY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lciIsImh0bWwiLCJkaXJlY3RpdmVzIiwiY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lciIsImxvYWRUZW1wbGF0ZVNvdXJjZSIsImlzRnVuY3Rpb24iLCJUZW1wbGF0ZUVuZ2luZSIsInVuZXNjYXBlSFRNTCIsInNjaGVkdWxlciIsIkFzeW5jRGlyZWN0aXZlIiwibm9vcCIsIm5vQ2hhbmdlIiwiJCIsImRpcmVjdGl2ZSIsImRlZXBFcXVhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFhQTtJQUNBLE1BQU0sU0FBUyxHQUF3QztRQUNuRCxRQUFRLEVBQUVBLGlEQUF5QixDQUFDQyxzQkFBSSxFQUFFQyw0QkFBVSxDQUFDLFVBQVUsQ0FBQztRQUNoRSxRQUFRLEVBQUVDLGlEQUF5QixFQUFFO0tBQ3hDO0lBZ0NEOzs7SUFHRztVQUNVLGNBQWMsQ0FBQTs7SUFFZixJQUFBLE9BQU8sWUFBWSxHQUFHLFNBQVMsQ0FBQyxRQUFROzs7SUFLaEQ7Ozs7Ozs7Ozs7SUFVRztJQUNJLElBQUEsT0FBTyxPQUFPLENBQUMsUUFBc0MsRUFBRSxPQUFzQyxFQUFBO0lBQ2hHLFFBQUEsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLFlBQVksRUFBRSxFQUFFLE9BQU8sQ0FBQztJQUM1RixRQUFBLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUM7SUFDcEMsUUFBQSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQWtCLEtBQXdDO0lBQ25FLFlBQUEsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ3ZCLFFBQUEsQ0FBQztJQUNELFFBQUEsR0FBRyxDQUFDLE1BQU0sR0FBRyxRQUFRLFlBQVksbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFNBQVMsR0FBRyxRQUFRO0lBQ3BGLFFBQUEsT0FBTyxHQUFHO1FBQ2Q7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O1FBQzVEO0lBRUEsSUFBQSxPQUFPLENBQUMsUUFBOEMsRUFBQTtJQUNsRCxRQUFBLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDaEM7SUFDSDtJQUVEO0lBQ08sTUFBTSxhQUFhLEdBQUcsQ0FBSSxZQUFnQixLQUFxQjtJQUNsRSxJQUFBLE9BQU8sSUFBSSxXQUFXLENBQUMsWUFBWSxDQUFDO0lBQ3hDLENBQUM7O0lDdkJEO0lBQ08sTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWtCLElBQW1DLENBQUE7SUFDNUUsSUFBQSxVQUFVO0lBRWxCLElBQUEsV0FBQSxDQUFZLEVBQVUsRUFBRSxLQUFpQixFQUFFLENBQWtCLEVBQUE7SUFDekQsUUFBQSxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQztJQUNoQixRQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSztJQUN2QixRQUFBLFVBQVUsQ0FBQyxLQUFjLEVBQUUsSUFBSSxDQUFDO1FBQ3BDO0lBRUEsSUFBQSxNQUFNLENBQUMsT0FBd0IsRUFBQTtJQUMzQixRQUFBLElBQUksTUFBVTtJQUNkLFFBQUEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUcsRUFBRyxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdDLFFBQUEsT0FBTyxNQUFNO1FBQ2pCO1FBRUEsSUFBSSxHQUFBO0lBQ0EsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtJQUNsQixZQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSTtJQUN0QixZQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ3ZCO1FBQ0o7SUFDSCxDQUFBLENBQUM7O0FDcU1GLFVBQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUk7SUFDdkMsS0FBSyxDQUFDLElBQUksR0FBYyxTQUFTO0lBQ2pDLEtBQUssQ0FBQyxRQUFRLEdBQVUsUUFBUTtJQUNoQyxLQUFLLENBQUMsU0FBUyxHQUFTLFNBQVM7SUFDakMsS0FBSyxDQUFDLGVBQWUsR0FBRyxlQUFlO0lBQ3ZDLEtBQUssQ0FBQyxPQUFPLEdBQVcsT0FBTztJQUMvQixLQUFLLENBQUMsTUFBTSxHQUFZLE1BQU07SUFDOUIsS0FBSyxDQUFDLFdBQVcsR0FBTyxXQUFXO0lBQ25DLEtBQUssQ0FBQyxVQUFVLEdBQVEsVUFBVTtJQUNsQyxLQUFLLENBQUMsYUFBYSxHQUFLLGFBQWE7SUFDckMsS0FBSyxDQUFDLFVBQVUsR0FBUSxVQUFVOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3RlbXBsYXRlLyJ9