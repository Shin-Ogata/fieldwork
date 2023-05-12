/*!
 * @cdp/template 0.9.17
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

    Object.defineProperty(exports, 'clearTemplateCache', {
        enumerable: true,
        get: function () { return webUtils.clearTemplateCache; }
    });
    exports.Hook = Hook;
    exports.TemplateBridge = TemplateBridge;
    exports.getTemplate = getTemplate;
    exports.hooks = hooks;
    exports.makeHook = makeHook;
    Object.keys(extensionTemplate).forEach(function (k) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionTemplate[k]; }
        });
    });
    Object.keys(extensionTemplateBridge).forEach(function (k) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionTemplateBridge[k]; }
        });
    });

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VzIjpbImJyaWRnZS50cyIsImxvYWRlci50cyIsImhvb2tzL2N1cnJlbnQudHMiLCJob29rcy9zeW1ib2xzLnRzIiwiaG9va3Mvc3RhdGUudHMiLCJob29rcy9kaXJlY3RpdmUudHMiLCJob29rcy9ob29rLnRzIiwiaG9va3MvdXNlLXN0YXRlLnRzIiwiaG9va3MvY3JlYXRlLWVmZmVjdC50cyIsImhvb2tzL3VzZS1lZmZlY3QudHMiLCJob29rcy91c2UtbGF5b3V0LWVmZmVjdC50cyIsImhvb2tzL3VzZS1tZW1vLnRzIiwiaG9va3MvdXNlLXJlZi50cyIsImhvb2tzL3VzZS1jYWxsYmFjay50cyIsImhvb2tzL3VzZS1yZWR1Y2VyLnRzIiwiaG9va3MvY3JlYXRlLWNvbnRleHQudHMiLCJob29rcy91c2UtY29udGV4dC50cyIsImhvb2tzL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgVGVtcGxhdGVSZXN1bHQsXG4gICAgU1ZHVGVtcGxhdGVSZXN1bHQsXG4gICAgaHRtbCxcbiAgICBkaXJlY3RpdmVzLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQge1xuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS1icmlkZ2UnO1xuaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsIGJ1aWx0aW4gdHJhbnNmb3JtZXJzIChkZWZhdWx0OiBtdXN0YWNoZSkuICovXG5jb25zdCBfYnVpbHRpbnM6IFJlY29yZDxzdHJpbmcsIFRlbXBsYXRlVHJhbnNmb3JtZXI+ID0ge1xuICAgIG11c3RhY2hlOiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWwsIGRpcmVjdGl2ZXMudW5zYWZlSFRNTCksXG4gICAgc3RhbXBpbm86IGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIoKSxcbn07XG5cbi8qKlxuICogQGVuIENvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUgaW50ZXJmYWNlXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/44OG44Oz44OX44Os44O844OI5qC857SN44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFNvdXJjZSB0ZW1wbGF0ZSBzdHJpbmdcbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICovXG4gICAgc291cmNlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbVGVtcGxhdGVSZXN1bHRdXSB0aGF0IGFwcGxpZWQgZ2l2ZW4gcGFyYW1ldGVyKHMpLlxuICAgICAqIEBqYSDjg5Hjg6njg6Hjg7zjgr/jgpLpgannlKjjgZcgW1tUZW1wbGF0ZVJlc3VsdF1dIOOBuOWkieaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIHZpZXdcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHBhcmFtZXRlcnMgZm9yIHNvdXJjZS5cbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0O1xufVxuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlQnJpZGdlXV0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEgW1tUZW1wbGF0ZUJyaWRnZV1dIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRyYW5zZm9ybWVyPzogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbn1cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgYnJpZGdlIGZvciBvdGhlciB0ZW1wbGF0ZSBlbmdpbmUgc291cmNlLlxuICogQGphIOS7luOBruODhuODs+ODl+ODrOODvOODiOOCqOODs+OCuOODs+OBruWFpeWKm+OCkuWkieaPm+OBmeOCi+ODhuODs+ODl+ODrOODvOODiOODluODquODg+OCuOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVCcmlkZ2Uge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHN0YXRpYyBfdHJhbnNmb3JtZXIgPSBfYnVpbHRpbnMubXVzdGFjaGU7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbQ29tcGlsZWRUZW1wbGF0ZV1dIGZyb20gdGVtcGxhdGUgc291cmNlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJfjgYvjgokgW1tDb21waWxlZFRlbXBsYXRlXV0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmcgLyB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJcgLyDjg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg6zjg6Hjg7Pjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zKTogQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNmb3JtZXIgfSA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2Zvcm1lcjogVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyIH0sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBlbmdpbmUgPSB0cmFuc2Zvcm1lcih0ZW1wbGF0ZSk7XG4gICAgICAgIGNvbnN0IGpzdCA9ICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBlbmdpbmUodmlldyk7XG4gICAgICAgIH07XG4gICAgICAgIGpzdC5zb3VyY2UgPSB0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGRlZmF1bHQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDml6Llrprjga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdUcmFuc2Zvcm1lclxuICAgICAqICAtIGBlbmAgbmV3IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOS7peWJjeOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2V0VHJhbnNmb3JtZXIobmV3VHJhbnNmb3JtZXI6IFRlbXBsYXRlVHJhbnNmb3JtZXIpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICAgICAgY29uc3Qgb2xkVHJhbnNmb3JtZXIgPSBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXI7XG4gICAgICAgIFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciA9IG5ld1RyYW5zZm9ybWVyO1xuICAgICAgICByZXR1cm4gb2xkVHJhbnNmb3JtZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBuYW1lIGxpc3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeensOS4gOimp+OCkuWPluW+l1xuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG5hbWUgbGlzdC5cbiAgICAgKiAgLSBgamFgIOWQjeensOS4gOimp+OCkui/lOWNtFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgYnVpbHRpbnMoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoX2J1aWx0aW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0IG5hbWUuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY3jgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0QnVpdGluVHJhbnNmb3JtZXIobmFtZTogc3RyaW5nKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfYnVpbHRpbnNbbmFtZV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5lc2NhcGVIVE1MLCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgSlNULFxuICAgIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVFbmdpbmUsXG59IGZyb20gJ0BjZHAvY29yZS10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBMb2FkVGVtcGxhdGVPcHRpb25zLCBsb2FkVGVtcGxhdGVTb3VyY2UgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5leHBvcnQgeyBjbGVhclRlbXBsYXRlQ2FjaGUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIENvbXBpbGVkVGVtcGxhdGUsXG4gICAgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyxcbiAgICBUZW1wbGF0ZUJyaWRnZSxcbn0gZnJvbSAnLi9icmlkZ2UnO1xuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGxpc3QuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeVR5cGVMaXN0IHtcbiAgICBlbmdpbmU6IEpTVDtcbiAgICBicmlkZ2U6IENvbXBpbGVkVGVtcGxhdGU7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IHR5cGUgZGVmaW5pdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5oyH5a6a5a2QXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUXVlcnlUeXBlcyA9IGtleW9mIFRlbXBsYXRlUXVlcnlUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgb3B0aW9ucy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpfjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVF1ZXJ5T3B0aW9uczxUIGV4dGVuZHMgVGVtcGxhdGVRdWVyeVR5cGVzPiBleHRlbmRzIExvYWRUZW1wbGF0ZU9wdGlvbnMsIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIGBlbmdpbmVgIC8gJ2JyaWRnZSdcbiAgICAgKi9cbiAgICB0eXBlPzogVDtcbiAgICAvKipcbiAgICAgKiBAZW4gdGVtcGxhdGUgbG9hZCBjYWxsYmFjay4gYGJyaWRnZWAgbW9kZSBhbGxvd3MgbG9jYWxpemF0aW9uIGhlcmUuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOiqreOBv+i+vOOBv+OCs+ODvOODq+ODkOODg+OCry4gYGJyaWRnZWAg44Oi44O844OJ44Gn44Gv44GT44GT44Gn44Ot44O844Kr44Op44Kk44K644GM5Y+v6IO9XG4gICAgICovXG4gICAgY2FsbGJhY2s/OiAoc3JjOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50KSA9PiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgUHJvbWlzZTxzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50Pjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGNvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUuXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/IEphdmFTY3JpcHQg44OG44Oz44OX44Os44O844OI5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGU8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcyA9ICdlbmdpbmUnPihcbiAgICBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVRdWVyeU9wdGlvbnM8VD5cbik6IFByb21pc2U8VGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdPiB7XG4gICAgY29uc3QgeyB0eXBlLCB1cmwsIG5vQ2FjaGUsIGNhbGxiYWNrIH0gPSBPYmplY3QuYXNzaWduKHsgdHlwZTogJ2VuZ2luZScsIG5vQ2FjaGU6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgIGxldCBzcmMgPSBhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsLCBub0NhY2hlIH0pO1xuICAgIGlmICghc3JjKSB7XG4gICAgICAgIHRocm93IG5ldyBVUklFcnJvcihgY2Fubm90IHNwZWNpZmllZCB0ZW1wbGF0ZSByZXNvdXJjZS4geyBzZWxlY3RvcjogJHtzZWxlY3Rvcn0sICB1cmw6ICR7dXJsfSB9YCk7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIHNyYyA9IGF3YWl0IGNhbGxiYWNrKHNyYyk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2VuZ2luZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVFbmdpbmUuY29tcGlsZShzcmMgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdW5lc2NhcGVIVE1MKHNyYy5pbm5lckhUTUwpIDogc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGNhc2UgJ2JyaWRnZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVCcmlkZ2UuY29tcGlsZShzcmMsIG9wdGlvbnMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFt0eXBlOiAke3R5cGV9XSBpcyB1bmtub3duLmApO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmxldCBfY3VycmVudElkID0gMDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGxldCBjdXJyZW50OiBJSG9va1N0YXRlIHwgbnVsbDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHNldEN1cnJlbnQgPSAoc3RhdGU6IElIb29rU3RhdGUpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY2xlYXJDdXJyZW50ID0gKCk6IHZvaWQgPT4ge1xuICAgIGN1cnJlbnQgPSBudWxsO1xuICAgIF9jdXJyZW50SWQgPSAwO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmeSA9ICgpOiBudW1iZXIgPT4ge1xuICAgIHJldHVybiBfY3VycmVudElkKys7XG59O1xuIiwiLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGhvb2tTeW1ib2wgPSBTeW1ib2woJ2hvb2snKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlZmZlY3RzU3ltYm9sID0gU3ltYm9sKCdlZmZlY3RzJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgbGF5b3V0RWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnbGF5b3V0RWZmZWN0cycpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBFZmZlY3RzU3ltYm9scyA9IHR5cGVvZiBlZmZlY3RzU3ltYm9sIHwgdHlwZW9mIGxheW91dEVmZmVjdHNTeW1ib2w7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB7IHNldEN1cnJlbnQsIGNsZWFyQ3VycmVudCB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQge1xuICAgIGhvb2tTeW1ib2wsXG4gICAgZWZmZWN0c1N5bWJvbCxcbiAgICBsYXlvdXRFZmZlY3RzU3ltYm9sLFxuICAgIEVmZmVjdHNTeW1ib2xzLFxufSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgaW50ZXJmYWNlIENhbGxhYmxlIHtcbiAgICBjYWxsOiAoc3RhdGU6IFN0YXRlKSA9PiB2b2lkO1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY2xhc3MgU3RhdGU8SCA9IHVua25vd24+IGltcGxlbWVudHMgSUhvb2tTdGF0ZTxIPiB7XG4gICAgdXBkYXRlOiBWb2lkRnVuY3Rpb247XG4gICAgaG9zdDogSDtcbiAgICB2aXJ0dWFsPzogYm9vbGVhbjtcbiAgICBbaG9va1N5bWJvbF06IE1hcDxudW1iZXIsIEhvb2s+O1xuICAgIFtlZmZlY3RzU3ltYm9sXTogQ2FsbGFibGVbXTtcbiAgICBbbGF5b3V0RWZmZWN0c1N5bWJvbF06IENhbGxhYmxlW107XG5cbiAgICBjb25zdHJ1Y3Rvcih1cGRhdGU6IFZvaWRGdW5jdGlvbiwgaG9zdDogSCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSA9IHVwZGF0ZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gaG9zdDtcbiAgICAgICAgdGhpc1tob29rU3ltYm9sXSA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpc1tlZmZlY3RzU3ltYm9sXSA9IFtdO1xuICAgICAgICB0aGlzW2xheW91dEVmZmVjdHNTeW1ib2xdID0gW107XG4gICAgfVxuXG4gICAgcnVuPFQ+KGNiOiAoKSA9PiBUKTogVCB7XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGNvbnN0IHJlcyA9IGNiKCk7XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIF9ydW5FZmZlY3RzKHBoYXNlOiBFZmZlY3RzU3ltYm9scyk6IHZvaWQge1xuICAgICAgICBjb25zdCBlZmZlY3RzID0gdGhpc1twaGFzZV07XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIGVmZmVjdHMpIHtcbiAgICAgICAgICAgIGVmZmVjdC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgIH1cblxuICAgIHJ1bkVmZmVjdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3J1bkVmZmVjdHMoZWZmZWN0c1N5bWJvbCk7XG4gICAgfVxuXG4gICAgcnVuTGF5b3V0RWZmZWN0cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcnVuRWZmZWN0cyhsYXlvdXRFZmZlY3RzU3ltYm9sKTtcbiAgICB9XG5cbiAgICB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaG9va3MgPSB0aGlzW2hvb2tTeW1ib2xdO1xuICAgICAgICBmb3IgKGNvbnN0IFssIGhvb2tdIG9mIGhvb2tzKSB7XG4gICAgICAgICAgICAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGhvb2sudGVhcmRvd24pICYmIGhvb2sudGVhcmRvd24oKTtcbiAgICAgICAgICAgIGRlbGV0ZSBob29rLnRlYXJkb3duO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBQYXJ0SW5mbyxcbiAgICBBc3luY0RpcmVjdGl2ZSxcbiAgICBEaXJlY3RpdmVSZXN1bHQsXG4gICAgZGlyZWN0aXZlLFxuICAgIG5vQ2hhbmdlLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBub29wLFxuICAgIHNjaGVkdWxlcixcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvbSBhcyAkIH0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuY29uc3Qgc2NoZWR1bGUgPSBzY2hlZHVsZXIoKTtcblxuaW50ZXJmYWNlIERpc2Nvbm5lY3RhYmxlIHtcbiAgICBfJHBhcmVudD86IERpc2Nvbm5lY3RhYmxlO1xuICAgIHBhcmVudE5vZGU6IEVsZW1lbnQ7XG59XG5cbmNsYXNzIEhvb2tEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhdGU6IFN0YXRlO1xuICAgIHByaXZhdGUgX3JlbmRlcmVyOiBVbmtub3duRnVuY3Rpb247XG4gICAgcHJpdmF0ZSBfYXJnczogdW5rbm93bltdO1xuICAgIHByaXZhdGUgX2VsT2JzZXJ2ZWQ/OiBOb2RlO1xuICAgIHByaXZhdGUgX2Rpc2Nvbm5lY3RlZEhhbmRsZXI/OiB0eXBlb2YgSG9va0RpcmVjdGl2ZS5wcm90b3R5cGUuZGlzY29ubmVjdGVkO1xuXG4gICAgY29uc3RydWN0b3IocGFydDogUGFydEluZm8pIHtcbiAgICAgICAgc3VwZXIocGFydCk7XG4gICAgICAgIHRoaXMuX3N0YXRlID0gbmV3IFN0YXRlKCgpID0+IHRoaXMucmVkcmF3KCksIHRoaXMpO1xuICAgICAgICB0aGlzLl9yZW5kZXJlciA9IG5vb3A7XG4gICAgICAgIHRoaXMuX2FyZ3MgPSBbXTtcbiAgICB9XG5cbiAgICByZW5kZXIoZWxSb290OiBOb2RlIHwgbnVsbCwgcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKTogRGlyZWN0aXZlUmVzdWx0IHtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSByZW5kZXJlcjtcbiAgICAgICAgdGhpcy5fYXJncyA9IGFyZ3M7XG4gICAgICAgIHRoaXMub2JzZXJ2ZShlbFJvb3QpO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGRpc2Nvbm5lY3RlZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCAmJiAkLnV0aWxzLnVuZGV0ZWN0aWZ5KHRoaXMuX2VsT2JzZXJ2ZWQpO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9zdGF0ZS50ZWFyZG93bigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVkcmF3KCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGF0ZS5ydW4oKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMuX3JlbmRlcmVyKC4uLnRoaXMuX2FyZ3MpO1xuICAgICAgICAgICAgdGhpcy5zZXRWYWx1ZShyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlLnJ1bkxheW91dEVmZmVjdHMoKTtcbiAgICAgICAgc2NoZWR1bGUoKCkgPT4gdGhpcy5fc3RhdGUucnVuRWZmZWN0cygpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9ic2VydmUoZWxSb290OiBOb2RlIHwgbnVsbCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBfJHBhcmVudCB9ID0gdGhpcyBhcyB1bmtub3duIGFzIERpc2Nvbm5lY3RhYmxlO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gXyRwYXJlbnQ/LnBhcmVudE5vZGU7XG4gICAgICAgIGlmICh0aGlzLl9lbE9ic2VydmVkKSB7XG4gICAgICAgICAgICAkLnV0aWxzLmRldGVjdGlmeSh0aGlzLl9lbE9ic2VydmVkLCBlbFJvb3QgYXMgTm9kZSk7XG4gICAgICAgICAgICB0aGlzLl9lbE9ic2VydmVkLmFkZEV2ZW50TGlzdGVuZXIoJ2Rpc2Nvbm5lY3RlZCcsIHRoaXMuX2Rpc2Nvbm5lY3RlZEhhbmRsZXIgPSB0aGlzLmRpc2Nvbm5lY3RlZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGhvb2tzV2l0aCA9IGRpcmVjdGl2ZShIb29rRGlyZWN0aXZlKTtcbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBjdXJyZW50LCBub3RpZnkgfSBmcm9tICcuL2N1cnJlbnQnO1xuaW1wb3J0IHsgaG9va1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5cbi8qKlxuICogQGVuIEJhc2UgYWJzdHJhY3QgY2xhc3MgZm9yIEN1c3RvbSBIb29rIENsYXNzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+OCr+ODqeOCueOBruWfuuW6leaKveixoeOCr+ODqeOCuVxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgSG9vazxQIGV4dGVuZHMgdW5rbm93bltdID0gdW5rbm93bltdLCBSID0gdW5rbm93biwgSCA9IHVua25vd24+IHtcbiAgICBpZDogbnVtYmVyO1xuICAgIHN0YXRlOiBJSG9va1N0YXRlPEg+O1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGU8SD4pIHtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgfVxuXG4gICAgYWJzdHJhY3QgdXBkYXRlKC4uLmFyZ3M6IFApOiBSO1xuICAgIHRlYXJkb3duPygpOiB2b2lkO1xufVxuXG4vKipcbiAqIEBlbiBJbnRlcmZhY2UgZGVmaW5pdGlvbiBmb3IgY3VzdG9tIGhvb2tzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+OBruOCpOODs+OCv+ODvOODleOCp+OCpOOCueWumue+qVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEN1c3RvbUhvb2s8UCBleHRlbmRzIHVua25vd25bXSA9IHVua25vd25bXSwgUiA9IHVua25vd24sIEggPSB1bmtub3duPiB7XG4gICAgbmV3IChpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZTxIPiwgLi4uYXJnczogUCk6IEhvb2s8UCwgUiwgSD47XG59XG5cbmNvbnN0IHVzZSA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPiwgLi4uYXJnczogUCk6IFIgPT4ge1xuICAgIGNvbnN0IGlkID0gbm90aWZ5KCk7XG4gICAgY29uc3QgaG9va3MgPSAoY3VycmVudCBhcyBhbnkpW2hvb2tTeW1ib2xdIGFzIE1hcDxudW1iZXIsIEhvb2s+OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIGxldCBob29rID0gaG9va3MuZ2V0KGlkKSBhcyBIb29rPFAsIFIsIEg+IHwgdW5kZWZpbmVkO1xuICAgIGlmICghaG9vaykge1xuICAgICAgICBob29rID0gbmV3IEhvb2soaWQsIGN1cnJlbnQgYXMgSUhvb2tTdGF0ZTxIPiwgLi4uYXJncyk7XG4gICAgICAgIGhvb2tzLnNldChpZCwgaG9vayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvb2sudXBkYXRlKC4uLmFyZ3MpO1xufTtcblxuLyoqXG4gKiBAZW4gRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgY3VzdG9tIGhvb2tzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+S9nOaIkOeUqOODleOCoeOCr+ODiOODqumWouaVsFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgSUhvb2tTdGF0ZUNvbnRleHQsIEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBleHBvcnQgY29uc3QgdXNlTWVtbyA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICogICAgIHZhbHVlOiBUO1xuICogICAgIHZhbHVlczogdW5rbm93bltdO1xuICpcbiAqICAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICogICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICogICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgfVxuICpcbiAqICAgICB1cGRhdGUoZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKTogVCB7XG4gKiAgICAgICAgIGlmICh0aGlzLmhhc0NoYW5nZWQodmFsdWVzKSkge1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgfVxuICogICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAqICAgICB9XG4gKlxuICogICAgIGhhc0NoYW5nZWQodmFsdWVzOiB1bmtub3duW10gPSBbXSk6IGJvb2xlYW4ge1xuICogICAgICAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbHVlLCBpKSA9PiB0aGlzLnZhbHVlc1tpXSAhPT0gdmFsdWUpO1xuICogICAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBtYWtlSG9vayA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPik6ICguLi5hcmdzOiBQKSA9PiBSID0+IHtcbiAgICByZXR1cm4gdXNlLmJpbmQobnVsbCwgSG9vayk7XG59O1xuIiwiaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgTmV3SG9va1N0YXRlLCBIb29rU3RhdGVVcGRhdGVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVN0YXRlID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gICAgYXJncyE6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XTtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgaW5pdGlhbFZhbHVlOiBUKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMudXBkYXRlciA9IHRoaXMudXBkYXRlci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgICAgICBpbml0aWFsVmFsdWUgPSBpbml0aWFsVmFsdWUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWFrZUFyZ3MoaW5pdGlhbFZhbHVlKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKTogcmVhZG9ubHkgW1QsIEhvb2tTdGF0ZVVwZGF0ZXI8VD5dIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJncztcbiAgICB9XG5cbiAgICB1cGRhdGVyKHZhbHVlOiBOZXdIb29rU3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgW3ByZXZpb3VzVmFsdWVdID0gdGhpcy5hcmdzO1xuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB1cGRhdGVyRm4gPSB2YWx1ZSBhcyAocHJldmlvdXNTdGF0ZT86IFQpID0+IFQ7XG4gICAgICAgICAgICB2YWx1ZSA9IHVwZGF0ZXJGbihwcmV2aW91c1ZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWVwRXF1YWwocHJldmlvdXNWYWx1ZSwgdmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICB9XG5cbiAgICBtYWtlQXJncyh2YWx1ZTogVCk6IHZvaWQge1xuICAgICAgICB0aGlzLmFyZ3MgPSBPYmplY3QuZnJlZXplKFt2YWx1ZSwgdGhpcy51cGRhdGVyXSBhcyBjb25zdCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxufSkgYXMgPFQ+KGluaXRpYWxTdGF0ZT86IFQpID0+IHJlYWRvbmx5IFtcbiAgICBUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFIpID8gUiA6IFQsXG4gICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG5dO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvbixcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtZnVuY3Rpb24tcmV0dXJuLXR5cGUsXG4gKi9cblxuaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbnR5cGUgRWZmZWN0ID0gKHRoaXM6IFN0YXRlKSA9PiB2b2lkIHwgVm9pZEZ1bmN0aW9uIHwgUHJvbWlzZTx2b2lkPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUVmZmVjdCA9IChzZXRFZmZlY3RzOiAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpID0+IHZvaWQpID0+IHtcbiAgICByZXR1cm4gbWFrZUhvb2soY2xhc3MgZXh0ZW5kcyBIb29rIHtcbiAgICAgICAgY2FsbGJhY2shOiBFZmZlY3Q7XG4gICAgICAgIGxhc3RWYWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIHZhbHVlcz86IHVua25vd25bXTtcbiAgICAgICAgX3RlYXJkb3duITogUHJvbWlzZTx2b2lkPiB8IFZvaWRGdW5jdGlvbiB8IHZvaWQ7XG5cbiAgICAgICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBpZ25vcmVkMTogRWZmZWN0LCBpZ25vcmVkMj86IHVua25vd25bXSkge1xuICAgICAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgICAgIHNldEVmZmVjdHMoc3RhdGUsIHRoaXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlKGNhbGxiYWNrOiBFZmZlY3QsIHZhbHVlcz86IHVua25vd25bXSk6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsKCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnZhbHVlcyB8fCB0aGlzLmhhc0NoYW5nZWQoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxhc3RWYWx1ZXMgPSB0aGlzLnZhbHVlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJ1bigpOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMudGVhcmRvd24oKTtcbiAgICAgICAgICAgIHRoaXMuX3RlYXJkb3duID0gdGhpcy5jYWxsYmFjay5jYWxsKHRoaXMuc3RhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVhcmRvd24oKTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRoaXMuX3RlYXJkb3duKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGVhcmRvd24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGhhc0NoYW5nZWQoKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gIXRoaXMubGFzdFZhbHVlcyB8fCB0aGlzLnZhbHVlcyEuc29tZSgodmFsdWUsIGkpID0+ICFkZWVwRXF1YWwodGhpcy5sYXN0VmFsdWVzIVtpXSwgdmFsdWUpKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbiIsImltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBlZmZlY3RzU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCB7IGNyZWF0ZUVmZmVjdCB9IGZyb20gJy4vY3JlYXRlLWVmZmVjdCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRFZmZlY3RzID0gKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKTogdm9pZCA9PiB7XG4gICAgc3RhdGVbZWZmZWN0c1N5bWJvbF0ucHVzaChjYik7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlRWZmZWN0ID0gY3JlYXRlRWZmZWN0KHNldEVmZmVjdHMpO1xuIiwiaW1wb3J0IHR5cGUgeyBTdGF0ZSwgQ2FsbGFibGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IGxheW91dEVmZmVjdHNTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0IHsgY3JlYXRlRWZmZWN0IH0gZnJvbSAnLi9jcmVhdGUtZWZmZWN0JztcblxuY29uc3Qgc2V0TGF5b3V0RWZmZWN0cyA9IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSk6IHZvaWQgPT4ge1xuICAgIHN0YXRlW2xheW91dEVmZmVjdHNTeW1ib2xdLnB1c2goY2IpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUxheW91dEVmZmVjdCA9IGNyZWF0ZUVmZmVjdChzZXRMYXlvdXRFZmZlY3RzKTtcbiIsImltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZU1lbW8gPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAgICB2YWx1ZTogVDtcbiAgICB2YWx1ZXM6IHVua25vd25bXTtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICB1cGRhdGUoZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKTogVCB7XG4gICAgICAgIGlmICh0aGlzLmhhc0NoYW5nZWQodmFsdWVzKSkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgICB9XG5cbiAgICBoYXNDaGFuZ2VkKHZhbHVlczogdW5rbm93bltdID0gW10pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlcy5zb21lKCh2YWx1ZSwgaSkgPT4gdGhpcy52YWx1ZXNbaV0gIT09IHZhbHVlKTtcbiAgICB9XG59KTtcbiIsImltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVJlZjogPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4geyBjdXJyZW50OiBUOyB9ID0gPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4gdXNlTWVtbygoKSA9PiAoe1xuICAgIGN1cnJlbnQ6IGluaXRpYWxWYWx1ZVxufSksIFtdKTtcbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bkZ1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUNhbGxiYWNrOiA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiBUXG4gICAgPSA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiB1c2VNZW1vKCgpID0+IGZuLCBpbnB1dHMpO1xuIiwiaW1wb3J0IHR5cGUgeyBIb29rUmVkdWNlciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlUmVkdWNlciA9IG1ha2VIb29rKGNsYXNzIDxTLCBJLCBBPiBleHRlbmRzIEhvb2sge1xuICAgIHJlZHVjZXIhOiBIb29rUmVkdWNlcjxTLCBBPjtcbiAgICBjdXJyZW50U3RhdGU6IFM7XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIF86IEhvb2tSZWR1Y2VyPFMsIEE+LCBpbml0aWFsU3RhdGU6IEksIGluaXQ/OiAoXzogSSkgPT4gUykge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoID0gdGhpcy5kaXNwYXRjaC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHVuZGVmaW5lZCAhPT0gaW5pdCA/IGluaXQoaW5pdGlhbFN0YXRlKSA6IGluaXRpYWxTdGF0ZSBhcyB1bmtub3duIGFzIFM7XG4gICAgfVxuXG4gICAgdXBkYXRlKHJlZHVjZXI6IEhvb2tSZWR1Y2VyPFMsIEE+KTogcmVhZG9ubHkgW1MsIChhY3Rpb246IEEpID0+IHZvaWRdIHtcbiAgICAgICAgdGhpcy5yZWR1Y2VyID0gcmVkdWNlcjtcbiAgICAgICAgcmV0dXJuIFt0aGlzLmN1cnJlbnRTdGF0ZSwgdGhpcy5kaXNwYXRjaF07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxuXG4gICAgZGlzcGF0Y2goYWN0aW9uOiBBKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gdGhpcy5yZWR1Y2VyKHRoaXMuY3VycmVudFN0YXRlLCBhY3Rpb24pO1xuICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgRGlyZWN0aXZlUmVzdWx0LCBub0NoYW5nZSB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB7IGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBJSG9va0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG5jbGFzcyBIb29rQ29udGV4dDxUPiBpbXBsZW1lbnRzIElIb29rQ29udGV4dDxUPiB7XG4gICAgcmVhZG9ubHkgZGVmYXVsdFZhbHVlOiBUIHwgdW5kZWZpbmVkO1xuICAgIHByaXZhdGUgX3ZhbHVlOiBUO1xuXG4gICAgY29uc3RydWN0b3IoZGVmYXVsdFZhbHVlPzogVCkge1xuICAgICAgICB0aGlzLnByb3ZpZGUgPSB0aGlzLnByb3ZpZGUuYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5jb25zdW1lID0gdGhpcy5jb25zdW1lLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gZGVmYXVsdFZhbHVlO1xuICAgICAgICB0aGlzLl92YWx1ZSA9IGRlZmF1bHRWYWx1ZSBhcyBUO1xuICAgIH1cblxuICAgIHByb3ZpZGUodmFsdWU6IFQsIGNhbGxiYWNrPzogKHZhbHVlOiBUKSA9PiBEaXJlY3RpdmVSZXN1bHQpOiBEaXJlY3RpdmVSZXN1bHQge1xuICAgICAgICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gaXNGdW5jdGlvbihjYWxsYmFjaykgPyBjYWxsYmFjayh2YWx1ZSkgOiBub0NoYW5nZTtcbiAgICB9XG5cbiAgICBjb25zdW1lKGNhbGxiYWNrOiAodmFsdWU6IFQpID0+IERpcmVjdGl2ZVJlc3VsdCB8IHZvaWQpOiBEaXJlY3RpdmVSZXN1bHQgfCB2b2lkIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHRoaXMuX3ZhbHVlKTtcbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVDb250ZXh0ID0gPFQ+KGRlZmF1bHRWYWx1ZT86IFQpOiBJSG9va0NvbnRleHQ8VD4gPT4ge1xuICAgIHJldHVybiBuZXcgSG9va0NvbnRleHQoZGVmYXVsdFZhbHVlKTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBzZXRFZmZlY3RzIH0gZnJvbSAnLi91c2UtZWZmZWN0JztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUNvbnRleHQgPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rPFtJSG9va0NvbnRleHQ8VD5dLCBULCB1bmtub3duPiB7XG4gICAgcHJpdmF0ZSBfcmFuRWZmZWN0OiBib29sZWFuO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBfOiBJSG9va0NvbnRleHQ8VD4pIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnNcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy5fcmFuRWZmZWN0ID0gZmFsc2U7XG4gICAgICAgIHNldEVmZmVjdHMoc3RhdGUsIHRoaXMpO1xuICAgIH1cblxuICAgIHVwZGF0ZShjb250ZXh0OiBJSG9va0NvbnRleHQ8VD4pOiBUIHtcbiAgICAgICAgbGV0IHJldHZhbCE6IFQ7XG4gICAgICAgIGNvbnRleHQuY29uc3VtZSh2YWx1ZSA9PiB7IHJldHZhbCA9IHZhbHVlOyB9KTtcbiAgICAgICAgcmV0dXJuIHJldHZhbDtcbiAgICB9XG5cbiAgICBjYWxsKCk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMuX3JhbkVmZmVjdCkge1xuICAgICAgICAgICAgdGhpcy5fcmFuRWZmZWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUudXBkYXRlKCk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bkZ1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHtcbiAgICBIb29rU3RhdGVVcGRhdGVyLFxuICAgIEhvb2tSZWR1Y2VyLFxuICAgIElIb29rQ29udGV4dCxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGhvb2tzV2l0aCB9IGZyb20gJy4vZGlyZWN0aXZlJztcbmltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAnLi91c2Utc3RhdGUnO1xuaW1wb3J0IHsgdXNlRWZmZWN0IH0gZnJvbSAnLi91c2UtZWZmZWN0JztcbmltcG9ydCB7IHVzZUxheW91dEVmZmVjdCB9IGZyb20gJy4vdXNlLWxheW91dC1lZmZlY3QnO1xuaW1wb3J0IHsgdXNlTWVtbyB9IGZyb20gJy4vdXNlLW1lbW8nO1xuaW1wb3J0IHsgdXNlUmVmIH0gZnJvbSAnLi91c2UtcmVmJztcbmltcG9ydCB7IHVzZUNhbGxiYWNrIH0gZnJvbSAnLi91c2UtY2FsbGJhY2snO1xuaW1wb3J0IHsgdXNlUmVkdWNlciB9IGZyb20gJy4vdXNlLXJlZHVjZXInO1xuaW1wb3J0IHsgY3JlYXRlQ29udGV4dCB9IGZyb20gJy4vY3JlYXRlLWNvbnRleHQnO1xuaW1wb3J0IHsgdXNlQ29udGV4dCB9IGZyb20gJy4vdXNlLWNvbnRleHQnO1xuZXhwb3J0ICogZnJvbSAnLi9pbnRlcmZhY2VzJztcbmV4cG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcblxuLyoqXG4gKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBwYXJpdHkgd2l0aCB0aGUgUmVhY3QgaG9va3MgY29uY2VwdC5cbiAqIEBqYSBSZWFjdCBob29rcyDjgrPjg7Pjgrvjg5fjg4jjgajlkIznrYnjga7mqZ/og73jgpLmj5DkvptcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGh0bWwsIHJlbmRlciwgaG9va3MgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICogY29uc3QgeyB1c2VTdGF0ZSB9ID0gaG9va3M7XG4gKlxuICogLy8gZnVuY3Rpb24gY29tcG9uZW50XG4gKiBmdW5jdGlvbiBBcHAoKSB7XG4gKiAgICAgY29uc3QgW2NvdW50LCBzZXRDb3VudF0gPSB1c2VTdGF0ZSgwKTtcbiAqICAgICByZXR1cm4gaHRtbGBcbiAqICAgICAgICAgPHA+Q291bnQ6ICR7IGNvdW50IH08L3A+XG4gKiAgICAgICAgIDxidXR0b24gY2xhc3M9XCJzdGF0ZS1wbHVzXCIgQGNsaWNrPSR7KCkgPT4gc2V0Q291bnQocHJldkNvdW50ID0+IHByZXZDb3VudCEgKyAxKX0+4p6VPC9idXR0b24+XG4gKiAgICAgYDtcbiAqIH1cbiAqXG4gKiAvLyByZW5kZXIgd2l0aCBob29rc1xuICogcmVuZGVyKGhvb2tzKEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSG9va3Mge1xuICAgIC8qKlxuICAgICAqIEBlbiBQcm92aWRlcyBmdW5jdGlvbmFsaXR5IHBhcml0eSB3aXRoIHRoZSBSZWFjdCBob29rcyBjb25jZXB0LiA8YnI+XG4gICAgICogICAgIEFkZCBIb29rcyBmZWF0dXJlIHRvIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4LlxuICAgICAqIEBqYSBSZWFjdCBob29rcyDjgrPjg7Pjgrvjg5fjg4jjgajlkIznrYnjga7mqZ/og73jgpLmj5DkvpsgPGJyPlxuICAgICAqICAgICDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgasgSG9va3Mg5qmf6IO944KS5LuY5YqgXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGltcG9ydCB7IGh0bWwsIHJlbmRlciwgaG9va3MgfSBmcm9tICdAY2RwL3J1bnRpbWUnO1xuICAgICAqIGNvbnN0IHsgdXNlU3RhdGUgfSA9IGhvb2tzO1xuICAgICAqXG4gICAgICogLy8gZnVuY3Rpb24gY29tcG9uZW50XG4gICAgICogZnVuY3Rpb24gQXBwKCkge1xuICAgICAqICAgICBjb25zdCBbY291bnQsIHNldENvdW50XSA9IHVzZVN0YXRlKDApO1xuICAgICAqICAgICByZXR1cm4gaHRtbGBcbiAgICAgKiAgICAgICAgIDxwPkNvdW50OiAkeyBjb3VudCB9PC9wPlxuICAgICAqICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInN0YXRlLXBsdXNcIiBAY2xpY2s9JHsoKSA9PiBzZXRDb3VudChwcmV2Q291bnQgPT4gcHJldkNvdW50ISArIDEpfT7inpU8L2J1dHRvbj5cbiAgICAgKiAgICAgYDtcbiAgICAgKiB9XG4gICAgICpcbiAgICAgKiAvLyBlbmFibGluZyBob29rc1xuICAgICAqIHJlbmRlcihob29rcyhBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAgICAgKiBgYGBcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZW5kZXJlclxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiBvYmplY3QgdGhhdCByZXR1cm5zIGEgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OCkui/lOWNtOOBmeOCi+mWouaVsOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBBcmd1bWVudHMgcGFzc2VkIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgavjgo/jgZ/jgovlvJXmlbBcbiAgICAgKi9cbiAgICAocmVuZGVyZXI6IFVua25vd25GdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKTogdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBZGQgSG9va3MgZmVhdHVyZSB0byB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheC4gKHNwZWNpZnkgYSBET00gZGlzY29ubmVjdCBkZXRlY3Rpb24gZWxlbWVudClcbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44GrIEhvb2tzIOapn+iDveOCkuS7mOWKoCAoRE9NIOWIh+aWreaknOefpeimgee0oOOCkuaMh+WumilcbiAgICAgKlxuICAgICAqIEBleGFtcGxlIDxicj5cbiAgICAgKlxuICAgICAqIGBgYHRzXG4gICAgICogY29uc3QgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc29tZS1wYWdlJyk7XG4gICAgICogLy8gZW5hYmxpbmcgaG9va3Mgd2l0aCByb290IGVsZW1lbnRcbiAgICAgKiByZW5kZXIoaG9va3Mud2l0aChlbCwgQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWxSb290XG4gICAgICogIC0gYGVuYCBSb290IGVsZW1lbnQgdXNlZCBmb3IgRE9NIGRpc2Nvbm5lY3Rpb24gZGV0ZWN0aW9uLiBJZiBgbnVsbGAgcGFzc2VkLCBgZG9jdW1lbnRgIGlzIHNwZWNpZmllZFxuICAgICAqICAtIGBqYWAgRE9NIOWIh+aWreaknOefpeOBq+S9v+eUqOOBmeOCi+ODq+ODvOODiOimgee0oC4gYG51bGxgIOOBjOa4oeOCi+OBqCBgZG9jdW1lbnRgIOOBjOaMh+WumuOBleOCjOOCi1xuICAgICAqIEBwYXJhbSByZW5kZXJlclxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiBvYmplY3QgdGhhdCByZXR1cm5zIGEgdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXhcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OCkui/lOWNtOOBmeOCi+mWouaVsOOCquODluOCuOOCp+OCr+ODiFxuICAgICAqIEBwYXJhbSBhcmdzXG4gICAgICogIC0gYGVuYCBBcmd1bWVudHMgcGFzc2VkIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgavjgo/jgZ/jgovlvJXmlbBcbiAgICAgKi9cbiAgICB3aXRoOiAoZWxSb290OiBOb2RlIHwgbnVsbCwgcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKSA9PiB1bmtub3duO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybiBhIHN0YXRlZnVsIHZhbHVlIGFuZCBhIGZ1bmN0aW9uIHRvIHVwZGF0ZSBpdC5cbiAgICAgKiBAamEg44K544OG44O844OI44OV44Or44Gq5YCk44Go44CB44Gd44KM44KS5pu05paw44GZ44KL44Gf44KB44Gu6Zai5pWw44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFN0YXRlXG4gICAgICogIC0gYGVuYCBUaGUgdmFsdWUgeW91IHdhbnQgdGhlIHN0YXRlIHRvIGJlIGluaXRpYWxseS5cbiAgICAgKiAgLSBgamFgIOeKtuaFi+OBruWIneacn+WMluWApFxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCByZXR1cm5zIGFuIGFycmF5IHdpdGggZXhhY3RseSB0d28gdmFsdWVzLiBbYGN1cnJlbnRTdGF0ZWAsIGB1cGRhdGVGdW5jdGlvbmBdXG4gICAgICogIC0gYGphYCAy44Gk44Gu5YCk44KS5oyB44Gk6YWN5YiX44KS6L+U5Y20IFtgY3VycmVudFN0YXRlYCwgYHVwZGF0ZUZ1bmN0aW9uYF1cbiAgICAgKi9cbiAgICB1c2VTdGF0ZTogPFQ+KGluaXRpYWxTdGF0ZT86IFQpID0+IHJlYWRvbmx5IFtcbiAgICAgICAgVCBleHRlbmRzICgoLi4uYXJnczogdW5rbm93bltdKSA9PiBpbmZlciBSKSA/IFIgOiBULFxuICAgICAgICBIb29rU3RhdGVVcGRhdGVyPFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUykgPyBTIDogVD5cbiAgICBdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGNvbnRhaW5zIGltcGVyYXRpdmUsIHBvc3NpYmx5IGVmZmVjdGZ1bCBjb2RlLlxuICAgICAqIEBqYSDlia/kvZznlKjjgpLmnInjgZnjgovlj6/og73mgKfjga7jgYLjgovlkb3ku6Tlnovjga7jgrPjg7zjg4njga7pgannlKhcbiAgICAgKlxuICAgICAqIEBwYXJhbSBlZmZlY3RcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcnVucyBlYWNoIHRpbWUgZGVwZW5kZW5jaWVzIGNoYW5nZVxuICAgICAqICAtIGBqYWAg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44KL44Gf44Gz44Gr5a6f6KGM44GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogQHBhcmFtIGRlcGVuZGVuY2llc1xuICAgICAqICAtIGBlbmAgbGlzdCBvZiBkZXBlbmRlbmNpZXMgdG8gdGhlIGVmZmVjdFxuICAgICAqICAtIGBqYWAg5Ymv5L2c55So55m654Gr44Gu44OI44Oq44Ks44O844Go44Gq44KL5L6d5a2Y6Zai5L+C44Gu44Oq44K544OIXG4gICAgICovXG4gICAgdXNlRWZmZWN0OiAoZWZmZWN0OiAoKSA9PiB2b2lkLCBkZXBlbmRlbmNpZXM/OiB1bmtub3duW10pID0+IHZvaWQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWNjZXB0cyBhIGZ1bmN0aW9uIHRoYXQgY29udGFpbnMgaW1wZXJhdGl2ZSwgcG9zc2libHkgZWZmZWN0ZnVsIGNvZGUuIDxicj5cbiAgICAgKiAgICAgVW5saWtlIFtbdXNlRWZmZWN0XV0gLCBpdCBpcyBleGVjdXRlZCBiZWZvcmUgdGhlIGNvbXBvbmVudCBpcyByZW5kZXJlZCBhbmQgdGhlIG5ldyBlbGVtZW50IGlzIGRpc3BsYXllZCBvbiB0aGUgc2NyZWVuLlxuICAgICAqIEBqYSDlia/kvZznlKjjgpLmnInjgZnjgovlj6/og73mgKfjga7jgYLjgovlkb3ku6Tlnovjga7jgrPjg7zjg4njga7pgannlKggPGJyPlxuICAgICAqICAgICBbW3VzZUVmZmVjdF1dIOOBqOeVsOOBquOCiiwg44Kz44Oz44Od44O844ON44Oz44OI44GM44Os44Oz44OA44Oq44Oz44Kw44GV44KM44Gm5paw44GX44GE6KaB57Sg44GM55S76Z2i44Gr6KGo56S644GV44KM44KL5YmN44Gr5a6f6KGM44GV44KM44KL44CCXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWZmZWN0XG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCB0aW1lIGRlcGVuZGVuY2llcyBjaGFuZ2VcbiAgICAgKiAgLSBgamFgIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOCi+OBn+OBs+OBq+Wun+ihjOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBkZXBlbmRlbmNpZXNcbiAgICAgKiAgLSBgZW5gIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIHRoZSBlZmZlY3RcbiAgICAgKiAgLSBgamFgIOWJr+S9nOeUqOeZuueBq+OBruODiOODquOCrOODvOOBqOOBquOCi+S+neWtmOmWouS/guOBruODquOCueODiFxuICAgICAqL1xuICAgIHVzZUxheW91dEVmZmVjdDogKGVmZmVjdDogKCkgPT4gdm9pZCwgZGVwZW5kZW5jaWVzPzogdW5rbm93bltdKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVzZWQgdG8gcmVkdWNlIGNvbXBvbmVudCByZS1yZW5kZXJpbmcuIDxicj5cbiAgICAgKiAgICAgQ2FjaGUgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiB0aGUgY2FjaGVkIHZhbHVlIHdoZW4gY2FsbGVkIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzLlxuICAgICAqIEBqYSDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7lho3jg6zjg7Pjg4Djg6rjg7PjgrDjgpLmipHjgYjjgovjgZ/jgoHjgavkvb/nlKggPGJyPlxuICAgICAqICAgICDplqLmlbDjga7miLvjgorlgKTjgpLjgq3jg6Pjg4Pjgrfjg6XjgZfjgIHlkIzjgZjlvJXmlbDjgaflkbzjgbPlh7rjgZXjgozjgZ/loLTlkIjjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgZ/lgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB2YWx1ZVxuICAgICAqICAtIGBqYWAg5YCk44KS6L+U44GZ6Zai5pWwXG4gICAgICogQHBhcmFtIHZhbHVlc1xuICAgICAqICAtIGBlbmAgQW4gYXJyYXkgb2YgdmFsdWVzIHRoYXQgYXJlIHVzZWQgYXMgYXJndW1lbnRzIGZvciBgZm5gXG4gICAgICogIC0gYGphYCBgZm5gIOOBruW8leaVsOOBqOOBl+OBpuS9v+eUqOOBleOCjOOCi+WApOOBrumFjeWIl1xuICAgICAqL1xuICAgIHVzZU1lbW86IDxUPihmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pID0+IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTGV0cyB5b3UgcmVmZXJlbmNlIGEgdmFsdWUgdGhhdOKAmXMgbm90IG5lZWRlZCBmb3IgcmVuZGVyaW5nLiA8YnI+XG4gICAgICogICAgIE1haW5seSBhdmFpbGFibGUgZm9yIGFjY2Vzc2luZyBET00gbm9kZXMuXG4gICAgICogQGphIOODrOODs+ODgOODquODs+OCsOOBq+S4jeimgeOBquWApOOCkuWPgueFp+WPr+iDveOBq+OBmeOCizxicj5cbiAgICAgKiAgICAg5Li744GrIERPTSDjg47jg7zjg4njgbjjga7jgqLjgq/jgrvjgrnjgavliKnnlKjlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbml0aWFsVmFsdWVcbiAgICAgKiAgLSBgZW5gIFRoZSBpbml0aWFsIHZhbHVlIG9mIHRoZSByZWZlcmVuY2VcbiAgICAgKiAgLSBgamFgIOWPgueFp+OBruWIneacn+WApFxuICAgICAqL1xuICAgIHVzZVJlZjogPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4geyBjdXJyZW50OiBUOyB9O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYSBtZW1vaXplZCB2ZXJzaW9uIG9mIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IG9ubHkgY2hhbmdlcyBpZiB0aGUgZGVwZW5kZW5jaWVzIGNoYW5nZS4gPGJyPlxuICAgICAqICAgICBVc2VmdWwgZm9yIHBhc3NpbmcgY2FsbGJhY2tzIHRvIG9wdGltaXplZCBjaGlsZCBjb21wb25lbnRzIHRoYXQgcmVseSBvbiByZWZlcmVudGlhbCBlcXVhbGl0eS5cbiAgICAgKiBAamEg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44Gf5aC05ZCI44Gr44Gu44G/5aSJ5pu044GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gu44Oh44Oi5YyW44OQ44O844K444On44Oz44KS6L+U5Y20IDxicj5cbiAgICAgKiAgICAg5Y+C54Wn562J5L6h5oCn44Gr5L6d5a2Y44GZ44KL5pyA6YGp5YyW44GV44KM44Gf5a2Q44Kz44Oz44Od44O844ON44Oz44OI44Gr44Kz44O844Or44OQ44OD44Kv44KS5rih44GZ5aC05ZCI44Gr5b2556uL44GkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiAgLSBgZW5gIFRoZSBmdW5jdGlvbiB0byBtZW1vaXplXG4gICAgICogIC0gYGphYCDjg6Hjg6LljJbjgZnjgovplqLmlbBcbiAgICAgKiBAcGFyYW0gaW5wdXRzXG4gICAgICogIC0gYGVuYCBBbiBhcnJheSBvZiBpbnB1dHMgdG8gd2F0Y2ggZm9yIGNoYW5nZXNcbiAgICAgKiAgLSBgamFgIOWkieabtOOCkuebo+imluOBmeOCi+WFpeWKm+OBrumFjeWIl1xuICAgICAqL1xuICAgIHVzZUNhbGxiYWNrOiA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEhvb2sgQVBJIGZvciBtYW5hZ2luZyBzdGF0ZSBpbiBmdW5jdGlvbiBjb21wb25lbnRzLlxuICAgICAqIEBqYSDplqLmlbDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgafnirbmhYvjgpLnrqHnkIbjgZnjgovjgZ/jgoHjga4gSG9vayBBUElcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWR1Y2VyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFjdGlvbiBhbmQgcmV0dXJucyBhIG5ldyBzdGF0ZVxuICAgICAqICAtIGBqYWAg54++5Zyo44Gu54q25oWL44Go44Ki44Kv44K344On44Oz44KS5Y+X44GR5Y+W44KK44CB5paw44GX44GE54q25oWL44KS6L+U44GZ6Zai5pWwXG4gICAgICogQHBhcmFtIGluaXRpYWxTdGF0ZVxuICAgICAqICAtIGBlbmAgVGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjZXJcbiAgICAgKiAgLSBgamFgIOODquODh+ODpeODvOOCteODvOOBruWIneacn+eKtuaFi+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBpbml0XG4gICAgICogIC0gYGVuYCBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjZXJcbiAgICAgKiAgLSBgamFgIOODquODh+ODpeODvOOCteODvOOBruWIneacn+eKtuaFi+OCkui/lOOBmeOCquODl+OCt+ODp+ODs+OBrumWouaVsFxuICAgICAqL1xuICAgIHVzZVJlZHVjZXI6IDxTLCBJLCBBPihyZWR1Y2VyOiBIb29rUmVkdWNlcjxTLCBBPiwgaW5pdGlhbFN0YXRlOiBJLCBpbml0PzogKChfOiBJKSA9PiBTKSB8IHVuZGVmaW5lZCkgPT4gcmVhZG9ubHkgW1MsIChhY3Rpb246IEEpID0+IHZvaWRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuXG4gICAgICogY3JlYXRlQ29udGV4dCBpcyBhIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyBhIG5ldyBjb250ZXh0IG9iamVjdC4gQSBjb250ZXh0IG9iamVjdCBpcyB1c2VkIHRvIHNoYXJlIGRhdGEgdGhhdCBjYW4gYmUgY29uc2lkZXJlZCDigJxnbG9iYWzigJ0gZm9yIGEgdHJlZSBvZiBSZWFjdCBjb21wb25lbnRzLlxuICAgICAqXG4gICAgICogQGphXG4gICAgICogY3JlYXRlQ29udGV4dCDjga/mlrDjgZfjgYTjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjgpLkvZzmiJDjgZnjgovplqLmlbDjgafjgZnjgILjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjga/jgIFSZWFjdCDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7jg4Tjg6rjg7zjgavlr77jgZfjgabjgIzjgrDjg63jg7zjg5Djg6vjgI3jgajogIPjgYjjgonjgozjgovjg4fjg7zjgr/jgpLlhbHmnInjgZnjgovjgZ/jgoHjgavkvb/nlKjjgZXjgozjgb7jgZnjgIJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkZWZhdWx0VmFsdWVcbiAgICAgKiAgLSBgZW5gOiBUaGUgZGVmYXVsdCB2YWx1ZSBmb3IgdGhlIGNvbnRleHQgb2JqZWN0LlxuICAgICAqICAtIGBqYWA6IOOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBruODh+ODleOCqeODq+ODiOWApOOAglxuICAgICAqL1xuICAgIGNyZWF0ZUNvbnRleHQ6IDxUPihkZWZhdWx0VmFsdWU/OiBUKSA9PiBJSG9va0NvbnRleHQ8VD47XG5cbiAgICAvKipcbiAgICAgKiBAZW5cbiAgICAgKiB1c2VDb250ZXh0IGlzIGEgaG9vayB0aGF0IHJldHVybnMgdGhlIGN1cnJlbnQgY29udGV4dCB2YWx1ZSBmb3IgdGhlIGdpdmVuIGNvbnRleHQgb2JqZWN0LiBXaGVuIHRoZSBuZWFyZXN0IDxNeUNvbnRleHQuUHJvdmlkZXI+IGFib3ZlIHRoZSBjb21wb25lbnQgdXBkYXRlcywgdGhpcyBob29rIHdpbGwgdHJpZ2dlciBhIHJlcmVuZGVyIHdpdGggdGhlIGxhdGVzdCBjb250ZXh0IHZhbHVlIHBhc3NlZCB0byB0aGF0IE15Q29udGV4dCBwcm92aWRlci5cbiAgICAgKlxuICAgICAqIEBqYVxuICAgICAqIHVzZUNvbnRleHQg44Gv44CB5oyH5a6a44GV44KM44Gf44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44Gr5a++44GZ44KL54++5Zyo44Gu44Kz44Oz44OG44Kt44K544OI5YCk44KS6L+U44GZ44OV44OD44Kv44Gn44GZ44CC44GT44Gu44OV44OD44Kv44Gv44CB44Kz44Oz44Od44O844ON44Oz44OI44Gu5LiK44Gr44GC44KL5pyA44KC6L+R44GEIDxNeUNvbnRleHQuUHJvdmlkZXI+IOOBjOabtOaWsOOBleOCjOOCi+OBqOOAgeOBneOBriBNeUNvbnRleHQg44OX44Ot44OQ44Kk44OA44O844Gr5rih44GV44KM44Gf5pyA5paw44Gu44Kz44Oz44OG44Kt44K544OI5YCk44Gn5YaN44Os44Oz44OA44Oq44Oz44Kw44GM44OI44Oq44Ks44O844GV44KM44G+44GZ44CCXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY29udGV4dFxuICAgICAqICAtIGBlbmA6IFRoZSBjb250ZXh0IG9iamVjdCByZXR1cm5lZCBmcm9tIFJlYWN0LmNyZWF0ZUNvbnRleHQuXG4gICAgICogIC0gYGphYDogUmVhY3QuY3JlYXRlQ29udGV4dCDjgYvjgonov5TjgZXjgozjgovjgrPjg7Pjg4bjgq3jgrnjg4jjgqrjg5bjgrjjgqfjgq/jg4jjgIJcbiAgICAgKi9cbiAgICB1c2VDb250ZXh0OiA8VD4oY29udGV4dDogSUhvb2tDb250ZXh0PFQ+KSA9PiBUO1xufVxuXG5jb25zdCBob29rczogSG9va3MgPSBob29rc1dpdGguYmluZChudWxsLCBudWxsKTtcbmhvb2tzLndpdGggICAgICAgICAgICA9IGhvb2tzV2l0aDtcbmhvb2tzLnVzZVN0YXRlICAgICAgICA9IHVzZVN0YXRlO1xuaG9va3MudXNlRWZmZWN0ICAgICAgID0gdXNlRWZmZWN0O1xuaG9va3MudXNlTGF5b3V0RWZmZWN0ID0gdXNlTGF5b3V0RWZmZWN0O1xuaG9va3MudXNlTWVtbyAgICAgICAgID0gdXNlTWVtbztcbmhvb2tzLnVzZVJlZiAgICAgICAgICA9IHVzZVJlZjtcbmhvb2tzLnVzZUNhbGxiYWNrICAgICA9IHVzZUNhbGxiYWNrO1xuaG9va3MudXNlUmVkdWNlciAgICAgID0gdXNlUmVkdWNlcjtcbmhvb2tzLmNyZWF0ZUNvbnRleHQgICA9IGNyZWF0ZUNvbnRleHQ7XG5ob29rcy51c2VDb250ZXh0ICAgICAgPSB1c2VDb250ZXh0O1xuXG5leHBvcnQgeyBob29rcyB9O1xuIl0sIm5hbWVzIjpbImNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIiLCJodG1sIiwiZGlyZWN0aXZlcyIsImNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIiLCJsb2FkVGVtcGxhdGVTb3VyY2UiLCJpc0Z1bmN0aW9uIiwiVGVtcGxhdGVFbmdpbmUiLCJ1bmVzY2FwZUhUTUwiLCJzY2hlZHVsZXIiLCJBc3luY0RpcmVjdGl2ZSIsIm5vb3AiLCJub0NoYW5nZSIsIiQiLCJkaXJlY3RpdmUiLCJkZWVwRXF1YWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBYUE7SUFDQSxNQUFNLFNBQVMsR0FBd0M7UUFDbkQsUUFBUSxFQUFFQSxpREFBeUIsQ0FBQ0Msc0JBQUksRUFBRUMsNEJBQVUs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