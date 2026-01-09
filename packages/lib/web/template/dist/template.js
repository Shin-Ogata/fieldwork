/*!
 * @cdp/template 0.9.21
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VzIjpbImJyaWRnZS50cyIsImxvYWRlci50cyIsImhvb2tzL2N1cnJlbnQudHMiLCJob29rcy9zeW1ib2xzLnRzIiwiaG9va3Mvc3RhdGUudHMiLCJob29rcy9kaXJlY3RpdmUudHMiLCJob29rcy9ob29rLnRzIiwiaG9va3MvdXNlLXN0YXRlLnRzIiwiaG9va3MvY3JlYXRlLWVmZmVjdC50cyIsImhvb2tzL3VzZS1lZmZlY3QudHMiLCJob29rcy91c2UtbGF5b3V0LWVmZmVjdC50cyIsImhvb2tzL3VzZS1tZW1vLnRzIiwiaG9va3MvdXNlLXJlZi50cyIsImhvb2tzL3VzZS1jYWxsYmFjay50cyIsImhvb2tzL3VzZS1yZWR1Y2VyLnRzIiwiaG9va3MvY3JlYXRlLWNvbnRleHQudHMiLCJob29rcy91c2UtY29udGV4dC50cyIsImhvb2tzL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgdHlwZSBUZW1wbGF0ZVJlc3VsdCxcbiAgICB0eXBlIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIGh0bWwsXG4gICAgZGlyZWN0aXZlcyxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS1icmlkZ2UnO1xuaW1wb3J0IHR5cGUgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgYnVpbHRpbiB0cmFuc2Zvcm1lcnMgKGRlZmF1bHQ6IG11c3RhY2hlKS4gKi9cbmNvbnN0IF9idWlsdGluczogUmVjb3JkPHN0cmluZywgVGVtcGxhdGVUcmFuc2Zvcm1lcj4gPSB7XG4gICAgbXVzdGFjaGU6IGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoaHRtbCwgZGlyZWN0aXZlcy51bnNhZmVIVE1MKSxcbiAgICBzdGFtcGlubzogY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcigpLFxufTtcblxuLyoqXG4gKiBAZW4gQ29tcGlsZWQgSmF2YVNjcmlwdCB0ZW1wbGF0ZSBpbnRlcmZhY2VcbiAqIEBqYSDjgrPjg7Pjg5HjgqTjg6vmuIjjgb/jg4bjg7Pjg5fjg6zjg7zjg4jmoLzntI3jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxlZFRlbXBsYXRlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gU291cmNlIHRlbXBsYXRlIHN0cmluZ1xuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJdcbiAgICAgKi9cbiAgICBzb3VyY2U6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQge0BsaW5rIFRlbXBsYXRlUmVzdWx0fSB0aGF0IGFwcGxpZWQgZ2l2ZW4gcGFyYW1ldGVyKHMpLlxuICAgICAqIEBqYSDjg5Hjg6njg6Hjg7zjgr/jgpLpgannlKjjgZcge0BsaW5rIFRlbXBsYXRlUmVzdWx0fSDjgbjlpInmj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWV3XG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBwYXJhbWV0ZXJzIGZvciBzb3VyY2UuXG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdDtcbn1cblxuLyoqXG4gKiBAZW4ge0BsaW5rIFRlbXBsYXRlQnJpZGdlfSBjb21waWxlIG9wdGlvbnNcbiAqIEBqYSB7QGxpbmsgVGVtcGxhdGVCcmlkZ2V9IOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRyYW5zZm9ybWVyPzogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbn1cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgYnJpZGdlIGZvciBvdGhlciB0ZW1wbGF0ZSBlbmdpbmUgc291cmNlLlxuICogQGphIOS7luOBruODhuODs+ODl+ODrOODvOODiOOCqOODs+OCuOODs+OBruWFpeWKm+OCkuWkieaPm+OBmeOCi+ODhuODs+ODl+ODrOODvOODiOODluODquODg+OCuOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVCcmlkZ2Uge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHN0YXRpYyBfdHJhbnNmb3JtZXIgPSBfYnVpbHRpbnMubXVzdGFjaGU7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBDb21waWxlZFRlbXBsYXRlfSBmcm9tIHRlbXBsYXRlIHNvdXJjZS5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiX44GL44KJIHtAbGluayBDb21waWxlZFRlbXBsYXRlfSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZW1wbGF0ZVxuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgc291cmNlIHN0cmluZyAvIHRlbXBsYXRlIGVsZW1lbnRcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIlyAvIOODhuODs+ODl+ODrOODvOODiOOCqOODrOODoeODs+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb21waWxlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY29tcGlsZSh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMpOiBDb21waWxlZFRlbXBsYXRlIHtcbiAgICAgICAgY29uc3QgeyB0cmFuc2Zvcm1lciB9ID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zZm9ybWVyOiBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXIgfSwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGVuZ2luZSA9IHRyYW5zZm9ybWVyKHRlbXBsYXRlKTtcbiAgICAgICAgY29uc3QganN0ID0gKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGVuZ2luZSh2aWV3KTtcbiAgICAgICAgfTtcbiAgICAgICAganN0LnNvdXJjZSA9IHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlO1xuICAgICAgICByZXR1cm4ganN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgZGVmYXVsdCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogQGphIOaXouWumuOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruabtOaWsFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1RyYW5zZm9ybWVyXG4gICAgICogIC0gYGVuYCBuZXcgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5paw44GX44GE5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBvbGQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5Lul5YmN44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzZXRUcmFuc2Zvcm1lcihuZXdUcmFuc2Zvcm1lcjogVGVtcGxhdGVUcmFuc2Zvcm1lcik6IFRlbXBsYXRlVHJhbnNmb3JtZXIge1xuICAgICAgICBjb25zdCBvbGRUcmFuc2Zvcm1lciA9IFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lcjtcbiAgICAgICAgVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyID0gbmV3VHJhbnNmb3JtZXI7XG4gICAgICAgIHJldHVybiBvbGRUcmFuc2Zvcm1lcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG5hbWUgbGlzdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5ZCN56ew5LiA6Kan44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgbmFtZSBsaXN0LlxuICAgICAqICAtIGBqYWAg5ZCN56ew5LiA6Kan44KS6L+U5Y20XG4gICAgICovXG4gICAgc3RhdGljIGdldCBidWlsdGlucygpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhfYnVpbHRpbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYnVpbHQtaW4gdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDntYTjgb/ovrzjgb/jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0cmFuc2Zvcm1lciBvYmplY3QgbmFtZS5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjeOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZXRCdWl0aW5UcmFuc2Zvcm1lcihuYW1lOiBzdHJpbmcpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF9idWlsdGluc1tuYW1lXTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmVzY2FwZUhUTUwsIGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIEpTVCxcbiAgICB0eXBlIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVFbmdpbmUsXG59IGZyb20gJ0BjZHAvY29yZS10ZW1wbGF0ZSc7XG5pbXBvcnQgeyB0eXBlIExvYWRUZW1wbGF0ZU9wdGlvbnMsIGxvYWRUZW1wbGF0ZVNvdXJjZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmV4cG9ydCB7IGNsZWFyVGVtcGxhdGVDYWNoZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgdHlwZSBDb21waWxlZFRlbXBsYXRlLFxuICAgIHR5cGUgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyxcbiAgICBUZW1wbGF0ZUJyaWRnZSxcbn0gZnJvbSAnLi9icmlkZ2UnO1xuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGxpc3QuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeVR5cGVMaXN0IHtcbiAgICBlbmdpbmU6IEpTVDtcbiAgICBicmlkZ2U6IENvbXBpbGVkVGVtcGxhdGU7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IHR5cGUgZGVmaW5pdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5oyH5a6a5a2QXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUXVlcnlUeXBlcyA9IGtleW9mIFRlbXBsYXRlUXVlcnlUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgb3B0aW9ucy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpfjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVF1ZXJ5T3B0aW9uczxUIGV4dGVuZHMgVGVtcGxhdGVRdWVyeVR5cGVzPiBleHRlbmRzIExvYWRUZW1wbGF0ZU9wdGlvbnMsIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIGBlbmdpbmVgIC8gJ2JyaWRnZSdcbiAgICAgKi9cbiAgICB0eXBlPzogVDtcbiAgICAvKipcbiAgICAgKiBAZW4gdGVtcGxhdGUgbG9hZCBjYWxsYmFjay4gYGJyaWRnZWAgbW9kZSBhbGxvd3MgbG9jYWxpemF0aW9uIGhlcmUuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOiqreOBv+i+vOOBv+OCs+ODvOODq+ODkOODg+OCry4gYGJyaWRnZWAg44Oi44O844OJ44Gn44Gv44GT44GT44Gn44Ot44O844Kr44Op44Kk44K644GM5Y+v6IO9XG4gICAgICovXG4gICAgY2FsbGJhY2s/OiAoc3JjOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50KSA9PiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgUHJvbWlzZTxzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50Pjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGNvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUuXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/IEphdmFTY3JpcHQg44OG44Oz44OX44Os44O844OI5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGU8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcyA9ICdlbmdpbmUnPihcbiAgICBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVRdWVyeU9wdGlvbnM8VD5cbik6IFByb21pc2U8VGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdPiB7XG4gICAgY29uc3QgeyB0eXBlLCB1cmwsIG5vQ2FjaGUsIGNhbGxiYWNrIH0gPSBPYmplY3QuYXNzaWduKHsgdHlwZTogJ2VuZ2luZScsIG5vQ2FjaGU6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgIGxldCBzcmMgPSBhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsLCBub0NhY2hlIH0pO1xuICAgIGlmICghc3JjKSB7XG4gICAgICAgIHRocm93IG5ldyBVUklFcnJvcihgY2Fubm90IHNwZWNpZmllZCB0ZW1wbGF0ZSByZXNvdXJjZS4geyBzZWxlY3RvcjogJHtzZWxlY3Rvcn0sICB1cmw6ICR7dXJsfSB9YCk7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIHNyYyA9IGF3YWl0IGNhbGxiYWNrKHNyYyk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2VuZ2luZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVFbmdpbmUuY29tcGlsZShzcmMgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdW5lc2NhcGVIVE1MKHNyYy5pbm5lckhUTUwpIDogc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGNhc2UgJ2JyaWRnZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVCcmlkZ2UuY29tcGlsZShzcmMsIG9wdGlvbnMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFt0eXBlOiAke3R5cGV9XSBpcyB1bmtub3duLmApO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmxldCBfY3VycmVudElkID0gMDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGxldCBjdXJyZW50OiBJSG9va1N0YXRlIHwgbnVsbDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHNldEN1cnJlbnQgPSAoc3RhdGU6IElIb29rU3RhdGUpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY2xlYXJDdXJyZW50ID0gKCk6IHZvaWQgPT4ge1xuICAgIGN1cnJlbnQgPSBudWxsO1xuICAgIF9jdXJyZW50SWQgPSAwO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmeSA9ICgpOiBudW1iZXIgPT4ge1xuICAgIHJldHVybiBfY3VycmVudElkKys7XG59O1xuIiwiLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGhvb2tTeW1ib2wgPSBTeW1ib2woJ2hvb2snKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlZmZlY3RzU3ltYm9sID0gU3ltYm9sKCdlZmZlY3RzJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgbGF5b3V0RWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnbGF5b3V0RWZmZWN0cycpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBFZmZlY3RzU3ltYm9scyA9IHR5cGVvZiBlZmZlY3RzU3ltYm9sIHwgdHlwZW9mIGxheW91dEVmZmVjdHNTeW1ib2w7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB7IHNldEN1cnJlbnQsIGNsZWFyQ3VycmVudCB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQge1xuICAgIHR5cGUgRWZmZWN0c1N5bWJvbHMsXG4gICAgaG9va1N5bWJvbCxcbiAgICBlZmZlY3RzU3ltYm9sLFxuICAgIGxheW91dEVmZmVjdHNTeW1ib2wsXG59IGZyb20gJy4vc3ltYm9scyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FsbGFibGUge1xuICAgIGNhbGw6IChzdGF0ZTogU3RhdGUpID0+IHZvaWQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjbGFzcyBTdGF0ZTxIID0gdW5rbm93bj4gaW1wbGVtZW50cyBJSG9va1N0YXRlPEg+IHtcbiAgICB1cGRhdGU6IFZvaWRGdW5jdGlvbjtcbiAgICBob3N0OiBIO1xuICAgIHZpcnR1YWw/OiBib29sZWFuO1xuICAgIFtob29rU3ltYm9sXTogTWFwPG51bWJlciwgSG9vaz47XG4gICAgW2VmZmVjdHNTeW1ib2xdOiBDYWxsYWJsZVtdO1xuICAgIFtsYXlvdXRFZmZlY3RzU3ltYm9sXTogQ2FsbGFibGVbXTtcblxuICAgIGNvbnN0cnVjdG9yKHVwZGF0ZTogVm9pZEZ1bmN0aW9uLCBob3N0OiBIKSB7XG4gICAgICAgIHRoaXMudXBkYXRlID0gdXBkYXRlO1xuICAgICAgICB0aGlzLmhvc3QgPSBob3N0O1xuICAgICAgICB0aGlzW2hvb2tTeW1ib2xdID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzW2VmZmVjdHNTeW1ib2xdID0gW107XG4gICAgICAgIHRoaXNbbGF5b3V0RWZmZWN0c1N5bWJvbF0gPSBbXTtcbiAgICB9XG5cbiAgICBydW48VD4oY2I6ICgpID0+IFQpOiBUIHtcbiAgICAgICAgc2V0Q3VycmVudCh0aGlzKTtcbiAgICAgICAgY29uc3QgcmVzID0gY2IoKTtcbiAgICAgICAgY2xlYXJDdXJyZW50KCk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgX3J1bkVmZmVjdHMocGhhc2U6IEVmZmVjdHNTeW1ib2xzKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGVmZmVjdHMgPSB0aGlzW3BoYXNlXTtcbiAgICAgICAgc2V0Q3VycmVudCh0aGlzKTtcbiAgICAgICAgZm9yIChjb25zdCBlZmZlY3Qgb2YgZWZmZWN0cykge1xuICAgICAgICAgICAgZWZmZWN0LmNhbGwodGhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgY2xlYXJDdXJyZW50KCk7XG4gICAgfVxuXG4gICAgcnVuRWZmZWN0cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcnVuRWZmZWN0cyhlZmZlY3RzU3ltYm9sKTtcbiAgICB9XG5cbiAgICBydW5MYXlvdXRFZmZlY3RzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9ydW5FZmZlY3RzKGxheW91dEVmZmVjdHNTeW1ib2wpO1xuICAgIH1cblxuICAgIHRlYXJkb3duKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBob29rcyA9IHRoaXNbaG9va1N5bWJvbF07XG4gICAgICAgIGZvciAoY29uc3QgWywgaG9va10gb2YgaG9va3MpIHtcbiAgICAgICAgICAgICgnZnVuY3Rpb24nID09PSB0eXBlb2YgaG9vay50ZWFyZG93bikgJiYgaG9vay50ZWFyZG93bigpO1xuICAgICAgICAgICAgZGVsZXRlIGhvb2sudGVhcmRvd247XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQge1xuICAgIHR5cGUgUGFydEluZm8sXG4gICAgdHlwZSBEaXJlY3RpdmVSZXN1bHQsXG4gICAgQXN5bmNEaXJlY3RpdmUsXG4gICAgZGlyZWN0aXZlLFxuICAgIG5vQ2hhbmdlLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQge1xuICAgIHR5cGUgVW5rbm93bkZ1bmN0aW9uLFxuICAgIG5vb3AsXG4gICAgc2NoZWR1bGVyLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgZG9tIGFzICQgfSBmcm9tICdAY2RwL2RvbSc7XG5pbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuXG5jb25zdCBzY2hlZHVsZSA9IHNjaGVkdWxlcigpO1xuXG5pbnRlcmZhY2UgRGlzY29ubmVjdGFibGUge1xuICAgIF8kcGFyZW50PzogRGlzY29ubmVjdGFibGU7XG4gICAgcGFyZW50Tm9kZTogRWxlbWVudDtcbn1cblxuY2xhc3MgSG9va0RpcmVjdGl2ZSBleHRlbmRzIEFzeW5jRGlyZWN0aXZlIHtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdGF0ZTogU3RhdGU7XG4gICAgcHJpdmF0ZSBfcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbjtcbiAgICBwcml2YXRlIF9hcmdzOiB1bmtub3duW107XG4gICAgcHJpdmF0ZSBfZWxPYnNlcnZlZD86IE5vZGU7XG4gICAgcHJpdmF0ZSBfZGlzY29ubmVjdGVkSGFuZGxlcj86IHR5cGVvZiBIb29rRGlyZWN0aXZlLnByb3RvdHlwZS5kaXNjb25uZWN0ZWQ7XG5cbiAgICBjb25zdHJ1Y3RvcihwYXJ0OiBQYXJ0SW5mbykge1xuICAgICAgICBzdXBlcihwYXJ0KTtcbiAgICAgICAgdGhpcy5fc3RhdGUgPSBuZXcgU3RhdGUoKCkgPT4gdGhpcy5yZWRyYXcoKSwgdGhpcyk7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVyID0gbm9vcDtcbiAgICAgICAgdGhpcy5fYXJncyA9IFtdO1xuICAgIH1cblxuICAgIHJlbmRlcihlbFJvb3Q6IE5vZGUgfCBudWxsLCByZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uLCAuLi5hcmdzOiB1bmtub3duW10pOiBEaXJlY3RpdmVSZXN1bHQge1xuICAgICAgICB0aGlzLl9yZW5kZXJlciA9IHJlbmRlcmVyO1xuICAgICAgICB0aGlzLl9hcmdzID0gYXJncztcbiAgICAgICAgdGhpcy5vYnNlcnZlKGVsUm9vdCk7XG4gICAgICAgIHRoaXMucmVkcmF3KCk7XG4gICAgICAgIHJldHVybiBub0NoYW5nZTtcbiAgICB9XG5cbiAgICBwcm90ZWN0ZWQgZGlzY29ubmVjdGVkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkICYmICQudXRpbHMudW5kZXRlY3RpZnkodGhpcy5fZWxPYnNlcnZlZCk7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX3N0YXRlLnRlYXJkb3duKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZWRyYXcoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3N0YXRlLnJ1bigoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByID0gdGhpcy5fcmVuZGVyZXIoLi4udGhpcy5fYXJncyk7XG4gICAgICAgICAgICB0aGlzLnNldFZhbHVlKHIpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fc3RhdGUucnVuTGF5b3V0RWZmZWN0cygpO1xuICAgICAgICBzY2hlZHVsZSgoKSA9PiB0aGlzLl9zdGF0ZS5ydW5FZmZlY3RzKCkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgb2JzZXJ2ZShlbFJvb3Q6IE5vZGUgfCBudWxsKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLl9kaXNjb25uZWN0ZWRIYW5kbGVyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7IF8kcGFyZW50IH0gPSB0aGlzIGFzIHVua25vd24gYXMgRGlzY29ubmVjdGFibGU7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgPSBfJHBhcmVudD8ucGFyZW50Tm9kZTtcbiAgICAgICAgaWYgKHRoaXMuX2VsT2JzZXJ2ZWQpIHtcbiAgICAgICAgICAgICQudXRpbHMuZGV0ZWN0aWZ5KHRoaXMuX2VsT2JzZXJ2ZWQsIGVsUm9vdCEpO1xuICAgICAgICAgICAgdGhpcy5fZWxPYnNlcnZlZC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCB0aGlzLl9kaXNjb25uZWN0ZWRIYW5kbGVyID0gdGhpcy5kaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rc1dpdGggPSBkaXJlY3RpdmUoSG9va0RpcmVjdGl2ZSk7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgY3VycmVudCwgbm90aWZ5IH0gZnJvbSAnLi9jdXJyZW50JztcbmltcG9ydCB7IGhvb2tTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKipcbiAqIEBlbiBCYXNlIGFic3RyYWN0IGNsYXNzIGZvciBDdXN0b20gSG9vayBDbGFzcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/jgq/jg6njgrnjga7ln7rlupXmir3osaHjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEhvb2s8UCBleHRlbmRzIHVua25vd25bXSA9IHVua25vd25bXSwgUiA9IHVua25vd24sIEggPSB1bmtub3duPiB7XG4gICAgaWQ6IG51bWJlcjtcbiAgICBzdGF0ZTogSUhvb2tTdGF0ZTxIPjtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBJSG9va1N0YXRlPEg+KSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgIH1cblxuICAgIGFic3RyYWN0IHVwZGF0ZSguLi5hcmdzOiBQKTogUjtcbiAgICB0ZWFyZG93bj8oKTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGRlZmluaXRpb24gZm9yIGN1c3RvbSBob29rcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/jga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgQ3VzdG9tSG9vazxQIGV4dGVuZHMgdW5rbm93bltdID0gdW5rbm93bltdLCBSID0gdW5rbm93biwgSCA9IHVua25vd24+ID0gbmV3IChpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZTxIPiwgLi4uYXJnczogUCkgPT4gSG9vazxQLCBSLCBIPjtcblxuY29uc3QgdXNlID0gPFAgZXh0ZW5kcyB1bmtub3duW10sIFIsIEggPSB1bmtub3duPihIb29rOiBDdXN0b21Ib29rPFAsIFIsIEg+LCAuLi5hcmdzOiBQKTogUiA9PiB7XG4gICAgY29uc3QgaWQgPSBub3RpZnkoKTtcbiAgICBjb25zdCBob29rcyA9IChjdXJyZW50IGFzIGFueSlbaG9va1N5bWJvbF0gYXMgTWFwPG51bWJlciwgSG9vaz47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4gICAgbGV0IGhvb2sgPSBob29rcy5nZXQoaWQpIGFzIEhvb2s8UCwgUiwgSD4gfCB1bmRlZmluZWQ7XG4gICAgaWYgKCFob29rKSB7XG4gICAgICAgIGhvb2sgPSBuZXcgSG9vayhpZCwgY3VycmVudCBhcyBJSG9va1N0YXRlPEg+LCAuLi5hcmdzKTtcbiAgICAgICAgaG9va3Muc2V0KGlkLCBob29rKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaG9vay51cGRhdGUoLi4uYXJncyk7XG59O1xuXG4vKipcbiAqIEBlbiBGYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBjdXN0b20gaG9va3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv5L2c5oiQ55So44OV44Kh44Kv44OI44Oq6Zai5pWwXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBJSG9va1N0YXRlQ29udGV4dCwgSG9vaywgbWFrZUhvb2sgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICpcbiAqIGV4cG9ydCBjb25zdCB1c2VNZW1vID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gKiAgICAgdmFsdWU6IFQ7XG4gKiAgICAgdmFsdWVzOiB1bmtub3duW107XG4gKlxuICogICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKSB7XG4gKiAgICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gKiAgICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICogICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAqICAgICB9XG4gKlxuICogICAgIHVwZGF0ZShmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pOiBUIHtcbiAqICAgICAgICAgaWYgKHRoaXMuaGFzQ2hhbmdlZCh2YWx1ZXMpKSB7XG4gKiAgICAgICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAqICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICogICAgICAgICB9XG4gKiAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICogICAgIH1cbiAqXG4gKiAgICAgaGFzQ2hhbmdlZCh2YWx1ZXM6IHVua25vd25bXSA9IFtdKTogYm9vbGVhbiB7XG4gKiAgICAgICAgIHJldHVybiB2YWx1ZXMuc29tZSgodmFsdWUsIGkpID0+IHRoaXMudmFsdWVzW2ldICE9PSB2YWx1ZSk7XG4gKiAgICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG1ha2VIb29rID0gPFAgZXh0ZW5kcyB1bmtub3duW10sIFIsIEggPSB1bmtub3duPihIb29rOiBDdXN0b21Ib29rPFAsIFIsIEg+KTogKC4uLmFyZ3M6IFApID0+IFIgPT4ge1xuICAgIHJldHVybiB1c2UuYmluZChudWxsLCBIb29rKTtcbn07XG4iLCJpbXBvcnQgeyBkZWVwRXF1YWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBOZXdIb29rU3RhdGUsIEhvb2tTdGF0ZVVwZGF0ZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlU3RhdGUgPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAgICBhcmdzITogcmVhZG9ubHkgW1QsIEhvb2tTdGF0ZVVwZGF0ZXI8VD5dO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBpbml0aWFsVmFsdWU6IFQpIHtcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy51cGRhdGVyID0gdGhpcy51cGRhdGVyLmJpbmQodGhpcyk7XG5cbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBpbml0aWFsVmFsdWUpIHtcbiAgICAgICAgICAgIGluaXRpYWxWYWx1ZSA9IGluaXRpYWxWYWx1ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5tYWtlQXJncyhpbml0aWFsVmFsdWUpO1xuICAgIH1cblxuICAgIHVwZGF0ZSgpOiByZWFkb25seSBbVCwgSG9va1N0YXRlVXBkYXRlcjxUPl0ge1xuICAgICAgICByZXR1cm4gdGhpcy5hcmdzO1xuICAgIH1cblxuICAgIHVwZGF0ZXIodmFsdWU6IE5ld0hvb2tTdGF0ZTxUPik6IHZvaWQge1xuICAgICAgICBjb25zdCBbcHJldmlvdXNWYWx1ZV0gPSB0aGlzLmFyZ3M7XG4gICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZXJGbiA9IHZhbHVlIGFzIChwcmV2aW91c1N0YXRlPzogVCkgPT4gVDtcbiAgICAgICAgICAgIHZhbHVlID0gdXBkYXRlckZuKHByZXZpb3VzVmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlZXBFcXVhbChwcmV2aW91c1ZhbHVlLCB2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWFrZUFyZ3ModmFsdWUpO1xuICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIG1ha2VBcmdzKHZhbHVlOiBUKTogdm9pZCB7XG4gICAgICAgIHRoaXMuYXJncyA9IE9iamVjdC5mcmVlemUoW3ZhbHVlLCB0aGlzLnVwZGF0ZXJdIGFzIGNvbnN0KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICB9XG59KSBhcyA8VD4oaW5pdGlhbFN0YXRlPzogVCkgPT4gcmVhZG9ubHkgW1xuICAgIFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUikgPyBSIDogVCxcbiAgICBIb29rU3RhdGVVcGRhdGVyPFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUykgPyBTIDogVD5cbl07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFycyxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtZnVuY3Rpb24tcmV0dXJuLXR5cGUsXG4gKi9cblxuaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbnR5cGUgRWZmZWN0ID0gKHRoaXM6IFN0YXRlKSA9PiB2b2lkIHwgVm9pZEZ1bmN0aW9uIHwgUHJvbWlzZTx2b2lkPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUVmZmVjdCA9IChzZXRFZmZlY3RzOiAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpID0+IHZvaWQpID0+IHtcbiAgICByZXR1cm4gbWFrZUhvb2soY2xhc3MgZXh0ZW5kcyBIb29rIHtcbiAgICAgICAgY2FsbGJhY2shOiBFZmZlY3Q7XG4gICAgICAgIGxhc3RWYWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIHZhbHVlcz86IHVua25vd25bXTtcbiAgICAgICAgX3RlYXJkb3duITogUHJvbWlzZTx2b2lkPiB8IFZvaWRGdW5jdGlvbiB8IHZvaWQ7XG5cbiAgICAgICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBpZ25vcmVkMTogRWZmZWN0LCBpZ25vcmVkMj86IHVua25vd25bXSkge1xuICAgICAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgICAgIHNldEVmZmVjdHMoc3RhdGUsIHRoaXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlKGNhbGxiYWNrOiBFZmZlY3QsIHZhbHVlcz86IHVua25vd25bXSk6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsKCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnZhbHVlcyB8fCB0aGlzLmhhc0NoYW5nZWQoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxhc3RWYWx1ZXMgPSB0aGlzLnZhbHVlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJ1bigpOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMudGVhcmRvd24oKTtcbiAgICAgICAgICAgIHRoaXMuX3RlYXJkb3duID0gdGhpcy5jYWxsYmFjay5jYWxsKHRoaXMuc3RhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVhcmRvd24oKTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRoaXMuX3RlYXJkb3duKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGVhcmRvd24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGhhc0NoYW5nZWQoKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gIXRoaXMubGFzdFZhbHVlcyB8fCB0aGlzLnZhbHVlcyEuc29tZSgodmFsdWUsIGkpID0+ICFkZWVwRXF1YWwodGhpcy5sYXN0VmFsdWVzIVtpXSwgdmFsdWUpKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbiIsImltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBlZmZlY3RzU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCB7IGNyZWF0ZUVmZmVjdCB9IGZyb20gJy4vY3JlYXRlLWVmZmVjdCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRFZmZlY3RzID0gKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKTogdm9pZCA9PiB7XG4gICAgc3RhdGVbZWZmZWN0c1N5bWJvbF0ucHVzaChjYik7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlRWZmZWN0ID0gY3JlYXRlRWZmZWN0KHNldEVmZmVjdHMpO1xuIiwiaW1wb3J0IHR5cGUgeyBTdGF0ZSwgQ2FsbGFibGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IGxheW91dEVmZmVjdHNTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0IHsgY3JlYXRlRWZmZWN0IH0gZnJvbSAnLi9jcmVhdGUtZWZmZWN0JztcblxuY29uc3Qgc2V0TGF5b3V0RWZmZWN0cyA9IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSk6IHZvaWQgPT4ge1xuICAgIHN0YXRlW2xheW91dEVmZmVjdHNTeW1ib2xdLnB1c2goY2IpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUxheW91dEVmZmVjdCA9IGNyZWF0ZUVmZmVjdChzZXRMYXlvdXRFZmZlY3RzKTtcbiIsImltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZU1lbW8gPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAgICB2YWx1ZTogVDtcbiAgICB2YWx1ZXM6IHVua25vd25bXTtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICB1cGRhdGUoZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKTogVCB7XG4gICAgICAgIGlmICh0aGlzLmhhc0NoYW5nZWQodmFsdWVzKSkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgICB9XG5cbiAgICBoYXNDaGFuZ2VkKHZhbHVlczogdW5rbm93bltdID0gW10pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlcy5zb21lKCh2YWx1ZSwgaSkgPT4gdGhpcy52YWx1ZXNbaV0gIT09IHZhbHVlKTtcbiAgICB9XG59KTtcbiIsImltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVJlZjogPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4geyBjdXJyZW50OiBUOyB9ID0gPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4gdXNlTWVtbygoKSA9PiAoe1xuICAgIGN1cnJlbnQ6IGluaXRpYWxWYWx1ZVxufSksIFtdKTtcbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bkZ1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUNhbGxiYWNrOiA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiBUXG4gICAgPSA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiB1c2VNZW1vKCgpID0+IGZuLCBpbnB1dHMpO1xuIiwiaW1wb3J0IHR5cGUgeyBIb29rUmVkdWNlciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VSZWR1Y2VyID0gbWFrZUhvb2soY2xhc3MgPFMsIEksIEE+IGV4dGVuZHMgSG9vayB7XG4gICAgcmVkdWNlciE6IEhvb2tSZWR1Y2VyPFMsIEE+O1xuICAgIGN1cnJlbnRTdGF0ZTogUztcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgXzogSG9va1JlZHVjZXI8UywgQT4sIGluaXRpYWxTdGF0ZTogSSwgaW5pdD86IChfOiBJKSA9PiBTKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSB0aGlzLmRpc3BhdGNoLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gdW5kZWZpbmVkICE9PSBpbml0ID8gaW5pdChpbml0aWFsU3RhdGUpIDogaW5pdGlhbFN0YXRlIGFzIHVua25vd24gYXMgUztcbiAgICB9XG5cbiAgICB1cGRhdGUocmVkdWNlcjogSG9va1JlZHVjZXI8UywgQT4pOiByZWFkb25seSBbUywgKGFjdGlvbjogQSkgPT4gdm9pZF0ge1xuICAgICAgICB0aGlzLnJlZHVjZXIgPSByZWR1Y2VyO1xuICAgICAgICByZXR1cm4gW3RoaXMuY3VycmVudFN0YXRlLCB0aGlzLmRpc3BhdGNoXTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvdW5ib3VuZC1tZXRob2RcbiAgICB9XG5cbiAgICBkaXNwYXRjaChhY3Rpb246IEEpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSB0aGlzLnJlZHVjZXIodGhpcy5jdXJyZW50U3RhdGUsIGFjdGlvbik7XG4gICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgeyB0eXBlIERpcmVjdGl2ZVJlc3VsdCwgbm9DaGFuZ2UgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgSUhvb2tDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuY2xhc3MgSG9va0NvbnRleHQ8VD4gaW1wbGVtZW50cyBJSG9va0NvbnRleHQ8VD4ge1xuICAgIHJlYWRvbmx5IGRlZmF1bHRWYWx1ZTogVCB8IHVuZGVmaW5lZDtcbiAgICBwcml2YXRlIF92YWx1ZTogVDtcblxuICAgIGNvbnN0cnVjdG9yKGRlZmF1bHRWYWx1ZT86IFQpIHtcbiAgICAgICAgdGhpcy5wcm92aWRlID0gdGhpcy5wcm92aWRlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY29uc3VtZSA9IHRoaXMuY29uc3VtZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSBkZWZhdWx0VmFsdWUgYXMgVDtcbiAgICB9XG5cbiAgICBwcm92aWRlKHZhbHVlOiBULCBjYWxsYmFjaz86ICh2YWx1ZTogVCkgPT4gRGlyZWN0aXZlUmVzdWx0KTogRGlyZWN0aXZlUmVzdWx0IHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIGlzRnVuY3Rpb24oY2FsbGJhY2spID8gY2FsbGJhY2sodmFsdWUpIDogbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgY29uc3VtZShjYWxsYmFjazogKHZhbHVlOiBUKSA9PiBEaXJlY3RpdmVSZXN1bHQgfCB2b2lkKTogRGlyZWN0aXZlUmVzdWx0IHwgdm9pZCB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayh0aGlzLl92YWx1ZSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY3JlYXRlQ29udGV4dCA9IDxUPihkZWZhdWx0VmFsdWU/OiBUKTogSUhvb2tDb250ZXh0PFQ+ID0+IHtcbiAgICByZXR1cm4gbmV3IEhvb2tDb250ZXh0KGRlZmF1bHRWYWx1ZSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgc2V0RWZmZWN0cyB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDb250ZXh0ID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vazxbSUhvb2tDb250ZXh0PFQ+XSwgVCwgdW5rbm93bj4ge1xuICAgIHByaXZhdGUgX3JhbkVmZmVjdDogYm9vbGVhbjtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgXzogSUhvb2tDb250ZXh0PFQ+KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IGZhbHNlO1xuICAgICAgICBzZXRFZmZlY3RzKHN0YXRlLCB0aGlzKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoY29udGV4dDogSUhvb2tDb250ZXh0PFQ+KTogVCB7XG4gICAgICAgIGxldCByZXR2YWwhOiBUO1xuICAgICAgICBjb250ZXh0LmNvbnN1bWUodmFsdWUgPT4geyByZXR2YWwgPSB2YWx1ZTsgfSk7XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxuXG4gICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLl9yYW5FZmZlY3QpIHtcbiAgICAgICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSG9va1N0YXRlVXBkYXRlcixcbiAgICBIb29rUmVkdWNlcixcbiAgICBJSG9va0NvbnRleHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBob29rc1dpdGggfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gJy4vdXNlLXN0YXRlJztcbmltcG9ydCB7IHVzZUVmZmVjdCB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VMYXlvdXRFZmZlY3QgfSBmcm9tICcuL3VzZS1sYXlvdXQtZWZmZWN0JztcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcbmltcG9ydCB7IHVzZVJlZiB9IGZyb20gJy4vdXNlLXJlZic7XG5pbXBvcnQgeyB1c2VDYWxsYmFjayB9IGZyb20gJy4vdXNlLWNhbGxiYWNrJztcbmltcG9ydCB7IHVzZVJlZHVjZXIgfSBmcm9tICcuL3VzZS1yZWR1Y2VyJztcbmltcG9ydCB7IGNyZWF0ZUNvbnRleHQgfSBmcm9tICcuL2NyZWF0ZS1jb250ZXh0JztcbmltcG9ydCB7IHVzZUNvbnRleHQgfSBmcm9tICcuL3VzZS1jb250ZXh0JztcbmV4cG9ydCAqIGZyb20gJy4vaW50ZXJmYWNlcyc7XG5leHBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5cbi8qKlxuICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuXG4gKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGNvbnN0IHsgdXNlU3RhdGUgfSA9IGhvb2tzO1xuICpcbiAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICogZnVuY3Rpb24gQXBwKCkge1xuICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gKiAgICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgICAgIDxwPkNvdW50OiAkeyBjb3VudCB9PC9wPlxuICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICogICAgIGA7XG4gKiB9XG4gKlxuICogLy8gcmVuZGVyIHdpdGggaG9va3NcbiAqIHJlbmRlcihob29rcyhBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tzIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBwYXJpdHkgd2l0aCB0aGUgUmVhY3QgaG9va3MgY29uY2VwdC4gPGJyPlxuICAgICAqICAgICBBZGQgSG9va3MgZmVhdHVyZSB0byB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheC5cbiAgICAgKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bIDxicj5cbiAgICAgKiAgICAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44GrIEhvb2tzIOapn+iDveOCkuS7mOWKoFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAgICAgKlxuICAgICAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICAgICAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAgICAgKiAgICAgY29uc3QgW2NvdW50LCBzZXRDb3VudF0gPSB1c2VTdGF0ZSgwKTtcbiAgICAgKiAgICAgcmV0dXJuIGh0bWxgXG4gICAgICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAgICAgKiAgICAgICAgIDxidXR0b24gY2xhc3M9XCJzdGF0ZS1wbHVzXCIgQGNsaWNrPSR7KCkgPT4gc2V0Q291bnQocHJldkNvdW50ID0+IHByZXZDb3VudCEgKyAxKX0+4p6VPC9idXR0b24+XG4gICAgICogICAgIGA7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gZW5hYmxpbmcgaG9va3NcbiAgICAgKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgKHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguIChzcGVjaWZ5IGEgRE9NIGRpc2Nvbm5lY3QgZGV0ZWN0aW9uIGVsZW1lbnQpXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqAgKERPTSDliIfmlq3mpJznn6XopoHntKDjgpLmjIflrpopXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NvbWUtcGFnZScpO1xuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzIHdpdGggcm9vdCBlbGVtZW50XG4gICAgICogcmVuZGVyKGhvb2tzLndpdGgoZWwsIEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsUm9vdFxuICAgICAqICAtIGBlbmAgUm9vdCBlbGVtZW50IHVzZWQgZm9yIERPTSBkaXNjb25uZWN0aW9uIGRldGVjdGlvbi4gSWYgYG51bGxgIHBhc3NlZCwgYGRvY3VtZW50YCBpcyBzcGVjaWZpZWRcbiAgICAgKiAgLSBgamFgIERPTSDliIfmlq3mpJznn6Xjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jopoHntKAuIGBudWxsYCDjgYzmuKHjgovjgaggYGRvY3VtZW50YCDjgYzmjIflrprjgZXjgozjgotcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgd2l0aDogKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBzdGF0ZWZ1bCB2YWx1ZSBhbmQgYSBmdW5jdGlvbiB0byB1cGRhdGUgaXQuXG4gICAgICogQGphIOOCueODhuODvOODiOODleODq+OBquWApOOBqOOAgeOBneOCjOOCkuabtOaWsOOBmeOCi+OBn+OCgeOBrumWouaVsOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWxTdGF0ZVxuICAgICAqICAtIGBlbmAgVGhlIHZhbHVlIHlvdSB3YW50IHRoZSBzdGF0ZSB0byBiZSBpbml0aWFsbHkuXG4gICAgICogIC0gYGphYCDnirbmhYvjga7liJ3mnJ/ljJblgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dXJucyBhbiBhcnJheSB3aXRoIGV4YWN0bHkgdHdvIHZhbHVlcy4gW2BjdXJyZW50U3RhdGVgLCBgdXBkYXRlRnVuY3Rpb25gXVxuICAgICAqICAtIGBqYWAgMuOBpOOBruWApOOCkuaMgeOBpOmFjeWIl+OCkui/lOWNtCBbYGN1cnJlbnRTdGF0ZWAsIGB1cGRhdGVGdW5jdGlvbmBdXG4gICAgICovXG4gICAgdXNlU3RhdGU6IDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgICAgIFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUikgPyBSIDogVCxcbiAgICAgICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG4gICAgXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBjb250YWlucyBpbXBlcmF0aXZlLCBwb3NzaWJseSBlZmZlY3RmdWwgY29kZS5cbiAgICAgKiBAamEg5Ymv5L2c55So44KS5pyJ44GZ44KL5Y+v6IO95oCn44Gu44GC44KL5ZG95Luk5Z6L44Gu44Kz44O844OJ44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWZmZWN0XG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCB0aW1lIGRlcGVuZGVuY2llcyBjaGFuZ2VcbiAgICAgKiAgLSBgamFgIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOCi+OBn+OBs+OBq+Wun+ihjOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBkZXBlbmRlbmNpZXNcbiAgICAgKiAgLSBgZW5gIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIHRoZSBlZmZlY3RcbiAgICAgKiAgLSBgamFgIOWJr+S9nOeUqOeZuueBq+OBruODiOODquOCrOODvOOBqOOBquOCi+S+neWtmOmWouS/guOBruODquOCueODiFxuICAgICAqL1xuICAgIHVzZUVmZmVjdDogKGVmZmVjdDogKCkgPT4gdm9pZCwgZGVwZW5kZW5jaWVzPzogdW5rbm93bltdKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGNvbnRhaW5zIGltcGVyYXRpdmUsIHBvc3NpYmx5IGVmZmVjdGZ1bCBjb2RlLiA8YnI+XG4gICAgICogICAgIFVubGlrZSB7QGxpbmsgSG9va3MudXNlRWZmZWN0fSAsIGl0IGlzIGV4ZWN1dGVkIGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHJlbmRlcmVkIGFuZCB0aGUgbmV3IGVsZW1lbnQgaXMgZGlzcGxheWVkIG9uIHRoZSBzY3JlZW4uXG4gICAgICogQGphIOWJr+S9nOeUqOOCkuacieOBmeOCi+WPr+iDveaAp+OBruOBguOCi+WRveS7pOWei+OBruOCs+ODvOODieOBrumBqeeUqCA8YnI+XG4gICAgICogICAgIHtAbGluayBIb29rcy51c2VFZmZlY3R9IOOBqOeVsOOBquOCiiwg44Kz44Oz44Od44O844ON44Oz44OI44GM44Os44Oz44OA44Oq44Oz44Kw44GV44KM44Gm5paw44GX44GE6KaB57Sg44GM55S76Z2i44Gr6KGo56S644GV44KM44KL5YmN44Gr5a6f6KGM44GV44KM44KL44CCXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWZmZWN0XG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCB0aW1lIGRlcGVuZGVuY2llcyBjaGFuZ2VcbiAgICAgKiAgLSBgamFgIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOCi+OBn+OBs+OBq+Wun+ihjOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBkZXBlbmRlbmNpZXNcbiAgICAgKiAgLSBgZW5gIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIHRoZSBlZmZlY3RcbiAgICAgKiAgLSBgamFgIOWJr+S9nOeUqOeZuueBq+OBruODiOODquOCrOODvOOBqOOBquOCi+S+neWtmOmWouS/guOBruODquOCueODiFxuICAgICAqL1xuICAgIHVzZUxheW91dEVmZmVjdDogKGVmZmVjdDogKCkgPT4gdm9pZCwgZGVwZW5kZW5jaWVzPzogdW5rbm93bltdKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVzZWQgdG8gcmVkdWNlIGNvbXBvbmVudCByZS1yZW5kZXJpbmcuIDxicj5cbiAgICAgKiAgICAgQ2FjaGUgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiB0aGUgY2FjaGVkIHZhbHVlIHdoZW4gY2FsbGVkIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzLlxuICAgICAqIEBqYSDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7lho3jg6zjg7Pjg4Djg6rjg7PjgrDjgpLmipHjgYjjgovjgZ/jgoHjgavkvb/nlKggPGJyPlxuICAgICAqICAgICDplqLmlbDjga7miLvjgorlgKTjgpLjgq3jg6Pjg4Pjgrfjg6XjgZfjgIHlkIzjgZjlvJXmlbDjgaflkbzjgbPlh7rjgZXjgozjgZ/loLTlkIjjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgZ/lgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB2YWx1ZVxuICAgICAqICAtIGBqYWAg5YCk44KS6L+U44GZ6Zai5pWwXG4gICAgICogQHBhcmFtIHZhbHVlc1xuICAgICAqICAtIGBlbmAgQW4gYXJyYXkgb2YgdmFsdWVzIHRoYXQgYXJlIHVzZWQgYXMgYXJndW1lbnRzIGZvciBgZm5gXG4gICAgICogIC0gYGphYCBgZm5gIOOBruW8leaVsOOBqOOBl+OBpuS9v+eUqOOBleOCjOOCi+WApOOBrumFjeWIl1xuICAgICAqL1xuICAgIHVzZU1lbW86IDxUPihmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pID0+IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTGV0cyB5b3UgcmVmZXJlbmNlIGEgdmFsdWUgdGhhdOKAmXMgbm90IG5lZWRlZCBmb3IgcmVuZGVyaW5nLiA8YnI+XG4gICAgICogICAgIE1haW5seSBhdmFpbGFibGUgZm9yIGFjY2Vzc2luZyBET00gbm9kZXMuXG4gICAgICogQGphIOODrOODs+ODgOODquODs+OCsOOBq+S4jeimgeOBquWApOOCkuWPgueFp+WPr+iDveOBq+OBmeOCizxicj5cbiAgICAgKiAgICAg5Li744GrIERPTSDjg47jg7zjg4njgbjjga7jgqLjgq/jgrvjgrnjgavliKnnlKjlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbml0aWFsVmFsdWVcbiAgICAgKiAgLSBgZW5gIFRoZSBpbml0aWFsIHZhbHVlIG9mIHRoZSByZWZlcmVuY2VcbiAgICAgKiAgLSBgamFgIOWPgueFp+OBruWIneacn+WApFxuICAgICAqL1xuICAgIHVzZVJlZjogPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4geyBjdXJyZW50OiBUOyB9O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYSBtZW1vaXplZCB2ZXJzaW9uIG9mIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IG9ubHkgY2hhbmdlcyBpZiB0aGUgZGVwZW5kZW5jaWVzIGNoYW5nZS4gPGJyPlxuICAgICAqICAgICBVc2VmdWwgZm9yIHBhc3NpbmcgY2FsbGJhY2tzIHRvIG9wdGltaXplZCBjaGlsZCBjb21wb25lbnRzIHRoYXQgcmVseSBvbiByZWZlcmVudGlhbCBlcXVhbGl0eS5cbiAgICAgKiBAamEg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44Gf5aC05ZCI44Gr44Gu44G/5aSJ5pu044GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gu44Oh44Oi5YyW44OQ44O844K444On44Oz44KS6L+U5Y20IDxicj5cbiAgICAgKiAgICAg5Y+C54Wn562J5L6h5oCn44Gr5L6d5a2Y44GZ44KL5pyA6YGp5YyW44GV44KM44Gf5a2Q44Kz44Oz44Od44O844ON44Oz44OI44Gr44Kz44O844Or44OQ44OD44Kv44KS5rih44GZ5aC05ZCI44Gr5b2556uL44GkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiAgLSBgZW5gIFRoZSBmdW5jdGlvbiB0byBtZW1vaXplXG4gICAgICogIC0gYGphYCDjg6Hjg6LljJbjgZnjgovplqLmlbBcbiAgICAgKiBAcGFyYW0gaW5wdXRzXG4gICAgICogIC0gYGVuYCBBbiBhcnJheSBvZiBpbnB1dHMgdG8gd2F0Y2ggZm9yIGNoYW5nZXNcbiAgICAgKiAgLSBgamFgIOWkieabtOOCkuebo+imluOBmeOCi+WFpeWKm+OBrumFjeWIl1xuICAgICAqL1xuICAgIHVzZUNhbGxiYWNrOiA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEhvb2sgQVBJIGZvciBtYW5hZ2luZyBzdGF0ZSBpbiBmdW5jdGlvbiBjb21wb25lbnRzLlxuICAgICAqIEBqYSDplqLmlbDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgafnirbmhYvjgpLnrqHnkIbjgZnjgovjgZ/jgoHjga4gSG9vayBBUElcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWR1Y2VyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFjdGlvbiBhbmQgcmV0dXJucyBhIG5ldyBzdGF0ZVxuICAgICAqICAtIGBqYWAg54++5Zyo44Gu54q25oWL44Go44Ki44Kv44K344On44Oz44KS5Y+X44GR5Y+W44KK44CB5paw44GX44GE54q25oWL44KS6L+U44GZ6Zai5pWwXG4gICAgICogQHBhcmFtIGluaXRpYWxTdGF0ZVxuICAgICAqICAtIGBlbmAgVGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjZXJcbiAgICAgKiAgLSBgamFgIOODquODh+ODpeODvOOCteODvOOBruWIneacn+eKtuaFi+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBpbml0XG4gICAgICogIC0gYGVuYCBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjZXJcbiAgICAgKiAgLSBgamFgIOODquODh+ODpeODvOOCteODvOOBruWIneacn+eKtuaFi+OCkui/lOOBmeOCquODl+OCt+ODp+ODs+OBrumWouaVsFxuICAgICAqL1xuICAgIHVzZVJlZHVjZXI6IDxTLCBJLCBBPihyZWR1Y2VyOiBIb29rUmVkdWNlcjxTLCBBPiwgaW5pdGlhbFN0YXRlOiBJLCBpbml0PzogKChfOiBJKSA9PiBTKSkgPT4gcmVhZG9ubHkgW1MsIChhY3Rpb246IEEpID0+IHZvaWRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIG5ldyBjb250ZXh0IG9iamVjdC4gQ29udGV4dCBvYmplY3RzIGFyZSB1c2VkIHRvIHNoYXJlIGRhdGEgdGhhdCBpcyBjb25zaWRlcmVkIFwiZ2xvYmFsXCIuXG4gICAgICogQGphIOaWsOOBl+OBhOOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOCkuS9nOaIkOOBmeOCi+OAguOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBryzjgIzjgrDjg63jg7zjg5Djg6vjgI3jgajogIPjgYjjgonjgozjgovjg4fjg7zjgr/jgpLlhbHmnInjgZnjgovjgZ/jgoHjgavkvb/nlKjjgZXjgozjgovjgIJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkZWZhdWx0VmFsdWVcbiAgICAgKiAgLSBgZW5gOiBUaGUgZGVmYXVsdCB2YWx1ZSBmb3IgdGhlIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYDog44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44Gu44OH44OV44Kp44Or44OI5YCkXG4gICAgICovXG4gICAgY3JlYXRlQ29udGV4dDogPFQ+KGRlZmF1bHRWYWx1ZT86IFQpID0+IElIb29rQ29udGV4dDxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IGNvbnRleHQgdmFsdWUgZm9yIHRoZSBzcGVjaWZpZWQgY29udGV4dCBvYmplY3QuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBq+WvvuOBmeOCi+ePvuWcqOOBruOCs+ODs+ODhuOCreOCueODiOWApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gOiB0aGUgY29udGV4dCBvYmplY3QgcmV0dXJuZWQgZnJvbSB7QGxpbmsgSG9va3MuY3JlYXRlQ29udGV4dH1cbiAgICAgKiAgLSBgamFgOiB7QGxpbmsgSG9va3MuY3JlYXRlQ29udGV4dH0g44GL44KJ6L+U44GV44KM44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgdXNlQ29udGV4dDogPFQ+KGNvbnRleHQ6IElIb29rQ29udGV4dDxUPikgPT4gVDtcbn1cblxuY29uc3QgaG9va3M6IEhvb2tzID0gaG9va3NXaXRoLmJpbmQobnVsbCwgbnVsbCk7XG5ob29rcy53aXRoICAgICAgICAgICAgPSBob29rc1dpdGg7XG5ob29rcy51c2VTdGF0ZSAgICAgICAgPSB1c2VTdGF0ZTtcbmhvb2tzLnVzZUVmZmVjdCAgICAgICA9IHVzZUVmZmVjdDtcbmhvb2tzLnVzZUxheW91dEVmZmVjdCA9IHVzZUxheW91dEVmZmVjdDtcbmhvb2tzLnVzZU1lbW8gICAgICAgICA9IHVzZU1lbW87XG5ob29rcy51c2VSZWYgICAgICAgICAgPSB1c2VSZWY7XG5ob29rcy51c2VDYWxsYmFjayAgICAgPSB1c2VDYWxsYmFjaztcbmhvb2tzLnVzZVJlZHVjZXIgICAgICA9IHVzZVJlZHVjZXI7XG5ob29rcy5jcmVhdGVDb250ZXh0ICAgPSBjcmVhdGVDb250ZXh0O1xuaG9va3MudXNlQ29udGV4dCAgICAgID0gdXNlQ29udGV4dDtcblxuZXhwb3J0IHsgaG9va3MgfTtcbiJdLCJuYW1lcyI6WyJjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyIiwiaHRtbCIsImRpcmVjdGl2ZXMiLCJjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyIiwibG9hZFRlbXBsYXRlU291cmNlIiwiaXNGdW5jdGlvbiIsIlRlbXBsYXRlRW5naW5lIiwidW5lc2NhcGVIVE1MIiwic2NoZWR1bGVyIiwiQXN5bmNEaXJlY3RpdmUiLCJub29wIiwibm9DaGFuZ2UiLCIkIiwiZGlyZWN0aXZlIiwiZGVlcEVxdWFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQWFBO0lBQ0EsTUFBTSxTQUFTLEdBQXdDO1FBQ25ELFFBQVEsRUFBRUEsaURBQXlCLENBQUNDLHNCQUFJLEVBQUVDLDRCQUFVLENBQUMsVUFBVSxDQUFDO1FBQ2hFLFFBQVEsRUFBRUMsaURBQXlCLEVBQUU7S0FDeEM7SUFnQ0Q7OztJQUdHO1VBQ1UsY0FBYyxDQUFBOztJQUVmLElBQUEsT0FBTyxZQUFZLEdBQUcsU0FBUyxDQUFDLFFBQVE7OztJQUtoRDs7Ozs7Ozs7OztJQVVHO0lBQ0ksSUFBQSxPQUFPLE9BQU8sQ0FBQyxRQUFzQyxFQUFFLE9BQXNDLEVBQUE7SUFDaEcsUUFBQSxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsWUFBWSxFQUFFLEVBQUUsT0FBTyxDQUFDO0lBQzVGLFFBQUEsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQztJQUNwQyxRQUFBLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBa0IsS0FBd0M7SUFDbkUsWUFBQSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDdkIsUUFBQSxDQUFDO0lBQ0QsUUFBQSxHQUFHLENBQUMsTUFBTSxHQUFHLFFBQVEsWUFBWSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsU0FBUyxHQUFHLFFBQVE7SUFDcEYsUUFBQSxPQUFPLEdBQUc7UUFDZDtJQUVBOzs7Ozs7Ozs7O0lBVUc7UUFDSSxPQUFPLGNBQWMsQ0FBQyxjQUFtQyxFQUFBO0lBQzVELFFBQUEsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLFlB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QWEsR0FBRyxDQUFJLFlBQWdCLEtBQXFCO0lBQ2xFLElBQUEsT0FBTyxJQUFJLFdBQVcsQ0FBQyxZQUFZLENBQUM7SUFDeEMsQ0FBQzs7SUN2QkQ7SUFDTyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsY0FBa0IsSUFBbUMsQ0FBQTtJQUM1RSxJQUFBLFVBQVU7SUFFbEIsSUFBQSxXQUFBLENBQVksRUFBVSxFQUFFLEtBQVksRUFBRSxDQUFrQixFQUFBO0lBQ3BELFFBQUEsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUM7SUFDaEIsUUFBQSxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUs7SUFDdkIsUUFBQSxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQztRQUMzQjtJQUVBLElBQUEsTUFBTSxDQUFDLE9BQXdCLEVBQUE7SUFDM0IsUUFBQSxJQUFJLE1BQVU7SUFDZCxRQUFBLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFHLEVBQUcsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3QyxRQUFBLE9BQU8sTUFBTTtRQUNqQjtRQUVBLElBQUksR0FBQTtJQUNBLFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7SUFDbEIsWUFBQSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUk7SUFDdEIsWUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRTtZQUN2QjtRQUNKO0lBQ0gsQ0FBQSxDQUFDOztBQ3FNRixVQUFNLEtBQUssR0FBVSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJO0lBQzlDLEtBQUssQ0FBQyxJQUFJLEdBQWMsU0FBUztJQUNqQyxLQUFLLENBQUMsUUFBUSxHQUFVLFFBQVE7SUFDaEMsS0FBSyxDQUFDLFNBQVMsR0FBUyxTQUFTO0lBQ2pDLEtBQUssQ0FBQyxlQUFlLEdBQUcsZUFBZTtJQUN2QyxLQUFLLENBQUMsT0FBTyxHQUFXLE9BQU87SUFDL0IsS0FBSyxDQUFDLE1BQU0sR0FBWSxNQUFNO0lBQzlCLEtBQUssQ0FBQyxXQUFXLEdBQU8sV0FBVztJQUNuQyxLQUFLLENBQUMsVUFBVSxHQUFRLFVBQVU7SUFDbEMsS0FBSyxDQUFDLGFBQWEsR0FBSyxhQUFhO0lBQ3JDLEtBQUssQ0FBQyxVQUFVLEdBQVEsVUFBVTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC90ZW1wbGF0ZS8ifQ==