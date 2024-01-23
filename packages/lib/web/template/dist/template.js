/*!
 * @cdp/template 0.9.18
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VzIjpbImJyaWRnZS50cyIsImxvYWRlci50cyIsImhvb2tzL2N1cnJlbnQudHMiLCJob29rcy9zeW1ib2xzLnRzIiwiaG9va3Mvc3RhdGUudHMiLCJob29rcy9kaXJlY3RpdmUudHMiLCJob29rcy9ob29rLnRzIiwiaG9va3MvdXNlLXN0YXRlLnRzIiwiaG9va3MvY3JlYXRlLWVmZmVjdC50cyIsImhvb2tzL3VzZS1lZmZlY3QudHMiLCJob29rcy91c2UtbGF5b3V0LWVmZmVjdC50cyIsImhvb2tzL3VzZS1tZW1vLnRzIiwiaG9va3MvdXNlLXJlZi50cyIsImhvb2tzL3VzZS1jYWxsYmFjay50cyIsImhvb2tzL3VzZS1yZWR1Y2VyLnRzIiwiaG9va3MvY3JlYXRlLWNvbnRleHQudHMiLCJob29rcy91c2UtY29udGV4dC50cyIsImhvb2tzL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgVGVtcGxhdGVSZXN1bHQsXG4gICAgU1ZHVGVtcGxhdGVSZXN1bHQsXG4gICAgaHRtbCxcbiAgICBkaXJlY3RpdmVzLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQge1xuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS1icmlkZ2UnO1xuaW1wb3J0IHsgUGxhaW5PYmplY3QgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsIGJ1aWx0aW4gdHJhbnNmb3JtZXJzIChkZWZhdWx0OiBtdXN0YWNoZSkuICovXG5jb25zdCBfYnVpbHRpbnM6IFJlY29yZDxzdHJpbmcsIFRlbXBsYXRlVHJhbnNmb3JtZXI+ID0ge1xuICAgIG11c3RhY2hlOiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWwsIGRpcmVjdGl2ZXMudW5zYWZlSFRNTCksXG4gICAgc3RhbXBpbm86IGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIoKSxcbn07XG5cbi8qKlxuICogQGVuIENvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUgaW50ZXJmYWNlXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/44OG44Oz44OX44Os44O844OI5qC857SN44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFNvdXJjZSB0ZW1wbGF0ZSBzdHJpbmdcbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICovXG4gICAgc291cmNlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHtAbGluayBUZW1wbGF0ZVJlc3VsdH0gdGhhdCBhcHBsaWVkIGdpdmVuIHBhcmFtZXRlcihzKS5cbiAgICAgKiBAamEg44OR44Op44Oh44O844K/44KS6YGp55So44GXIHtAbGluayBUZW1wbGF0ZVJlc3VsdH0g44G45aSJ5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlld1xuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgcGFyYW1ldGVycyBmb3Igc291cmNlLlxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQ7XG59XG5cbi8qKlxuICogQGVuIHtAbGluayBUZW1wbGF0ZUJyaWRnZX0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEge0BsaW5rIFRlbXBsYXRlQnJpZGdlfSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0cmFuc2Zvcm1lcj86IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIGJyaWRnZSBmb3Igb3RoZXIgdGVtcGxhdGUgZW5naW5lIHNvdXJjZS5cbiAqIEBqYSDku5bjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg7Pjgrjjg7Pjga7lhaXlipvjgpLlpInmj5vjgZnjgovjg4bjg7Pjg5fjg6zjg7zjg4jjg5bjg6rjg4Pjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlQnJpZGdlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgX3RyYW5zZm9ybWVyID0gX2J1aWx0aW5zLm11c3RhY2hlO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCB7QGxpbmsgQ29tcGlsZWRUZW1wbGF0ZX0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSB7QGxpbmsgQ29tcGlsZWRUZW1wbGF0ZX0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmcgLyB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJcgLyDjg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg6zjg6Hjg7Pjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zKTogQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNmb3JtZXIgfSA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2Zvcm1lcjogVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyIH0sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBlbmdpbmUgPSB0cmFuc2Zvcm1lcih0ZW1wbGF0ZSk7XG4gICAgICAgIGNvbnN0IGpzdCA9ICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBlbmdpbmUodmlldyk7XG4gICAgICAgIH07XG4gICAgICAgIGpzdC5zb3VyY2UgPSB0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGRlZmF1bHQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDml6Llrprjga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdUcmFuc2Zvcm1lclxuICAgICAqICAtIGBlbmAgbmV3IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOS7peWJjeOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2V0VHJhbnNmb3JtZXIobmV3VHJhbnNmb3JtZXI6IFRlbXBsYXRlVHJhbnNmb3JtZXIpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICAgICAgY29uc3Qgb2xkVHJhbnNmb3JtZXIgPSBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXI7XG4gICAgICAgIFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciA9IG5ld1RyYW5zZm9ybWVyO1xuICAgICAgICByZXR1cm4gb2xkVHJhbnNmb3JtZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBuYW1lIGxpc3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeensOS4gOimp+OCkuWPluW+l1xuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG5hbWUgbGlzdC5cbiAgICAgKiAgLSBgamFgIOWQjeensOS4gOimp+OCkui/lOWNtFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgYnVpbHRpbnMoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoX2J1aWx0aW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0IG5hbWUuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY3jgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0QnVpdGluVHJhbnNmb3JtZXIobmFtZTogc3RyaW5nKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfYnVpbHRpbnNbbmFtZV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdW5lc2NhcGVIVE1MLCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgSlNULFxuICAgIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVFbmdpbmUsXG59IGZyb20gJ0BjZHAvY29yZS10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBMb2FkVGVtcGxhdGVPcHRpb25zLCBsb2FkVGVtcGxhdGVTb3VyY2UgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5leHBvcnQgeyBjbGVhclRlbXBsYXRlQ2FjaGUgfSBmcm9tICdAY2RwL3dlYi11dGlscyc7XG5pbXBvcnQge1xuICAgIENvbXBpbGVkVGVtcGxhdGUsXG4gICAgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyxcbiAgICBUZW1wbGF0ZUJyaWRnZSxcbn0gZnJvbSAnLi9icmlkZ2UnO1xuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGxpc3QuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5LiA6KanXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeVR5cGVMaXN0IHtcbiAgICBlbmdpbmU6IEpTVDtcbiAgICBicmlkZ2U6IENvbXBpbGVkVGVtcGxhdGU7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IHR5cGUgZGVmaW5pdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5pmC44Gr5oyH5a6a5Y+v6IO944Gq5Z6L5oyH5a6a5a2QXG4gKi9cbmV4cG9ydCB0eXBlIFRlbXBsYXRlUXVlcnlUeXBlcyA9IGtleW9mIFRlbXBsYXRlUXVlcnlUeXBlTGlzdDtcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgb3B0aW9ucy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpfjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVF1ZXJ5T3B0aW9uczxUIGV4dGVuZHMgVGVtcGxhdGVRdWVyeVR5cGVzPiBleHRlbmRzIExvYWRUZW1wbGF0ZU9wdGlvbnMsIFRlbXBsYXRlQ29tcGlsZU9wdGlvbnMsIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIGBlbmdpbmVgIC8gJ2JyaWRnZSdcbiAgICAgKi9cbiAgICB0eXBlPzogVDtcbiAgICAvKipcbiAgICAgKiBAZW4gdGVtcGxhdGUgbG9hZCBjYWxsYmFjay4gYGJyaWRnZWAgbW9kZSBhbGxvd3MgbG9jYWxpemF0aW9uIGhlcmUuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOiqreOBv+i+vOOBv+OCs+ODvOODq+ODkOODg+OCry4gYGJyaWRnZWAg44Oi44O844OJ44Gn44Gv44GT44GT44Gn44Ot44O844Kr44Op44Kk44K644GM5Y+v6IO9XG4gICAgICovXG4gICAgY2FsbGJhY2s/OiAoc3JjOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50KSA9PiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgUHJvbWlzZTxzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50Pjtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGNvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUuXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/IEphdmFTY3JpcHQg44OG44Oz44OX44Os44O844OI5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGU8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcyA9ICdlbmdpbmUnPihcbiAgICBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVRdWVyeU9wdGlvbnM8VD5cbik6IFByb21pc2U8VGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdPiB7XG4gICAgY29uc3QgeyB0eXBlLCB1cmwsIG5vQ2FjaGUsIGNhbGxiYWNrIH0gPSBPYmplY3QuYXNzaWduKHsgdHlwZTogJ2VuZ2luZScsIG5vQ2FjaGU6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgIGxldCBzcmMgPSBhd2FpdCBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHsgdXJsLCBub0NhY2hlIH0pO1xuICAgIGlmICghc3JjKSB7XG4gICAgICAgIHRocm93IG5ldyBVUklFcnJvcihgY2Fubm90IHNwZWNpZmllZCB0ZW1wbGF0ZSByZXNvdXJjZS4geyBzZWxlY3RvcjogJHtzZWxlY3Rvcn0sICB1cmw6ICR7dXJsfSB9YCk7XG4gICAgfVxuXG4gICAgaWYgKGlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIHNyYyA9IGF3YWl0IGNhbGxiYWNrKHNyYyk7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2VuZ2luZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVFbmdpbmUuY29tcGlsZShzcmMgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdW5lc2NhcGVIVE1MKHNyYy5pbm5lckhUTUwpIDogc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGNhc2UgJ2JyaWRnZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVCcmlkZ2UuY29tcGlsZShzcmMsIG9wdGlvbnMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFt0eXBlOiAke3R5cGV9XSBpcyB1bmtub3duLmApO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZSB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmxldCBfY3VycmVudElkID0gMDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGxldCBjdXJyZW50OiBJSG9va1N0YXRlIHwgbnVsbDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHNldEN1cnJlbnQgPSAoc3RhdGU6IElIb29rU3RhdGUpOiB2b2lkID0+IHtcbiAgICBjdXJyZW50ID0gc3RhdGU7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY2xlYXJDdXJyZW50ID0gKCk6IHZvaWQgPT4ge1xuICAgIGN1cnJlbnQgPSBudWxsO1xuICAgIF9jdXJyZW50SWQgPSAwO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmeSA9ICgpOiBudW1iZXIgPT4ge1xuICAgIHJldHVybiBfY3VycmVudElkKys7XG59O1xuIiwiLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGhvb2tTeW1ib2wgPSBTeW1ib2woJ2hvb2snKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBlZmZlY3RzU3ltYm9sID0gU3ltYm9sKCdlZmZlY3RzJyk7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgbGF5b3V0RWZmZWN0c1N5bWJvbCA9IFN5bWJvbCgnbGF5b3V0RWZmZWN0cycpO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgdHlwZSBFZmZlY3RzU3ltYm9scyA9IHR5cGVvZiBlZmZlY3RzU3ltYm9sIHwgdHlwZW9mIGxheW91dEVmZmVjdHNTeW1ib2w7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGUgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB7IHNldEN1cnJlbnQsIGNsZWFyQ3VycmVudCB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQge1xuICAgIGhvb2tTeW1ib2wsXG4gICAgZWZmZWN0c1N5bWJvbCxcbiAgICBsYXlvdXRFZmZlY3RzU3ltYm9sLFxuICAgIEVmZmVjdHNTeW1ib2xzLFxufSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgaW50ZXJmYWNlIENhbGxhYmxlIHtcbiAgICBjYWxsOiAoc3RhdGU6IFN0YXRlKSA9PiB2b2lkO1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY2xhc3MgU3RhdGU8SCA9IHVua25vd24+IGltcGxlbWVudHMgSUhvb2tTdGF0ZTxIPiB7XG4gICAgdXBkYXRlOiBWb2lkRnVuY3Rpb247XG4gICAgaG9zdDogSDtcbiAgICB2aXJ0dWFsPzogYm9vbGVhbjtcbiAgICBbaG9va1N5bWJvbF06IE1hcDxudW1iZXIsIEhvb2s+O1xuICAgIFtlZmZlY3RzU3ltYm9sXTogQ2FsbGFibGVbXTtcbiAgICBbbGF5b3V0RWZmZWN0c1N5bWJvbF06IENhbGxhYmxlW107XG5cbiAgICBjb25zdHJ1Y3Rvcih1cGRhdGU6IFZvaWRGdW5jdGlvbiwgaG9zdDogSCkge1xuICAgICAgICB0aGlzLnVwZGF0ZSA9IHVwZGF0ZTtcbiAgICAgICAgdGhpcy5ob3N0ID0gaG9zdDtcbiAgICAgICAgdGhpc1tob29rU3ltYm9sXSA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpc1tlZmZlY3RzU3ltYm9sXSA9IFtdO1xuICAgICAgICB0aGlzW2xheW91dEVmZmVjdHNTeW1ib2xdID0gW107XG4gICAgfVxuXG4gICAgcnVuPFQ+KGNiOiAoKSA9PiBUKTogVCB7XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGNvbnN0IHJlcyA9IGNiKCk7XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIF9ydW5FZmZlY3RzKHBoYXNlOiBFZmZlY3RzU3ltYm9scyk6IHZvaWQge1xuICAgICAgICBjb25zdCBlZmZlY3RzID0gdGhpc1twaGFzZV07XG4gICAgICAgIHNldEN1cnJlbnQodGhpcyk7XG4gICAgICAgIGZvciAoY29uc3QgZWZmZWN0IG9mIGVmZmVjdHMpIHtcbiAgICAgICAgICAgIGVmZmVjdC5jYWxsKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIGNsZWFyQ3VycmVudCgpO1xuICAgIH1cblxuICAgIHJ1bkVmZmVjdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3J1bkVmZmVjdHMoZWZmZWN0c1N5bWJvbCk7XG4gICAgfVxuXG4gICAgcnVuTGF5b3V0RWZmZWN0cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fcnVuRWZmZWN0cyhsYXlvdXRFZmZlY3RzU3ltYm9sKTtcbiAgICB9XG5cbiAgICB0ZWFyZG93bigpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaG9va3MgPSB0aGlzW2hvb2tTeW1ib2xdO1xuICAgICAgICBmb3IgKGNvbnN0IFssIGhvb2tdIG9mIGhvb2tzKSB7XG4gICAgICAgICAgICAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGhvb2sudGVhcmRvd24pICYmIGhvb2sudGVhcmRvd24oKTtcbiAgICAgICAgICAgIGRlbGV0ZSBob29rLnRlYXJkb3duO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHtcbiAgICBQYXJ0SW5mbyxcbiAgICBBc3luY0RpcmVjdGl2ZSxcbiAgICBEaXJlY3RpdmVSZXN1bHQsXG4gICAgZGlyZWN0aXZlLFxuICAgIG5vQ2hhbmdlLFxufSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQge1xuICAgIFVua25vd25GdW5jdGlvbixcbiAgICBub29wLFxuICAgIHNjaGVkdWxlcixcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IGRvbSBhcyAkIH0gZnJvbSAnQGNkcC9kb20nO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuY29uc3Qgc2NoZWR1bGUgPSBzY2hlZHVsZXIoKTtcblxuaW50ZXJmYWNlIERpc2Nvbm5lY3RhYmxlIHtcbiAgICBfJHBhcmVudD86IERpc2Nvbm5lY3RhYmxlO1xuICAgIHBhcmVudE5vZGU6IEVsZW1lbnQ7XG59XG5cbmNsYXNzIEhvb2tEaXJlY3RpdmUgZXh0ZW5kcyBBc3luY0RpcmVjdGl2ZSB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RhdGU6IFN0YXRlO1xuICAgIHByaXZhdGUgX3JlbmRlcmVyOiBVbmtub3duRnVuY3Rpb247XG4gICAgcHJpdmF0ZSBfYXJnczogdW5rbm93bltdO1xuICAgIHByaXZhdGUgX2VsT2JzZXJ2ZWQ/OiBOb2RlO1xuICAgIHByaXZhdGUgX2Rpc2Nvbm5lY3RlZEhhbmRsZXI/OiB0eXBlb2YgSG9va0RpcmVjdGl2ZS5wcm90b3R5cGUuZGlzY29ubmVjdGVkO1xuXG4gICAgY29uc3RydWN0b3IocGFydDogUGFydEluZm8pIHtcbiAgICAgICAgc3VwZXIocGFydCk7XG4gICAgICAgIHRoaXMuX3N0YXRlID0gbmV3IFN0YXRlKCgpID0+IHRoaXMucmVkcmF3KCksIHRoaXMpO1xuICAgICAgICB0aGlzLl9yZW5kZXJlciA9IG5vb3A7XG4gICAgICAgIHRoaXMuX2FyZ3MgPSBbXTtcbiAgICB9XG5cbiAgICByZW5kZXIoZWxSb290OiBOb2RlIHwgbnVsbCwgcmVuZGVyZXI6IFVua25vd25GdW5jdGlvbiwgLi4uYXJnczogdW5rbm93bltdKTogRGlyZWN0aXZlUmVzdWx0IHtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSByZW5kZXJlcjtcbiAgICAgICAgdGhpcy5fYXJncyA9IGFyZ3M7XG4gICAgICAgIHRoaXMub2JzZXJ2ZShlbFJvb3QpO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgICAgICByZXR1cm4gbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGRpc2Nvbm5lY3RlZCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCAmJiAkLnV0aWxzLnVuZGV0ZWN0aWZ5KHRoaXMuX2VsT2JzZXJ2ZWQpO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9zdGF0ZS50ZWFyZG93bigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgcmVkcmF3KCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdGF0ZS5ydW4oKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMuX3JlbmRlcmVyKC4uLnRoaXMuX2FyZ3MpO1xuICAgICAgICAgICAgdGhpcy5zZXRWYWx1ZShyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlLnJ1bkxheW91dEVmZmVjdHMoKTtcbiAgICAgICAgc2NoZWR1bGUoKCkgPT4gdGhpcy5fc3RhdGUucnVuRWZmZWN0cygpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG9ic2VydmUoZWxSb290OiBOb2RlIHwgbnVsbCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgeyBfJHBhcmVudCB9ID0gdGhpcyBhcyB1bmtub3duIGFzIERpc2Nvbm5lY3RhYmxlO1xuICAgICAgICB0aGlzLl9lbE9ic2VydmVkID0gXyRwYXJlbnQ/LnBhcmVudE5vZGU7XG4gICAgICAgIGlmICh0aGlzLl9lbE9ic2VydmVkKSB7XG4gICAgICAgICAgICAkLnV0aWxzLmRldGVjdGlmeSh0aGlzLl9lbE9ic2VydmVkLCBlbFJvb3QhKTtcbiAgICAgICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQuYWRkRXZlbnRMaXN0ZW5lcignZGlzY29ubmVjdGVkJywgdGhpcy5fZGlzY29ubmVjdGVkSGFuZGxlciA9IHRoaXMuZGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgaG9va3NXaXRoID0gZGlyZWN0aXZlKEhvb2tEaXJlY3RpdmUpO1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGN1cnJlbnQsIG5vdGlmeSB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQgeyBob29rU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdCBjbGFzcyBmb3IgQ3VzdG9tIEhvb2sgQ2xhc3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Kv44Op44K544Gu5Z+65bqV5oq96LGh44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBIb29rPFAgZXh0ZW5kcyB1bmtub3duW10gPSB1bmtub3duW10sIFIgPSB1bmtub3duLCBIID0gdW5rbm93bj4ge1xuICAgIGlkOiBudW1iZXI7XG4gICAgc3RhdGU6IElIb29rU3RhdGU8SD47XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogSUhvb2tTdGF0ZTxIPikge1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICB9XG5cbiAgICBhYnN0cmFjdCB1cGRhdGUoLi4uYXJnczogUCk6IFI7XG4gICAgdGVhcmRvd24/KCk6IHZvaWQ7XG59XG5cbi8qKlxuICogQGVuIEludGVyZmFjZSBkZWZpbml0aW9uIGZvciBjdXN0b20gaG9va3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Gu44Kk44Oz44K/44O844OV44Kn44Kk44K55a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIEN1c3RvbUhvb2s8UCBleHRlbmRzIHVua25vd25bXSA9IHVua25vd25bXSwgUiA9IHVua25vd24sIEggPSB1bmtub3duPiA9IG5ldyAoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGU8SD4sIC4uLmFyZ3M6IFApID0+IEhvb2s8UCwgUiwgSD47XG5cbmNvbnN0IHVzZSA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPiwgLi4uYXJnczogUCk6IFIgPT4ge1xuICAgIGNvbnN0IGlkID0gbm90aWZ5KCk7XG4gICAgY29uc3QgaG9va3MgPSAoY3VycmVudCBhcyBhbnkpW2hvb2tTeW1ib2xdIGFzIE1hcDxudW1iZXIsIEhvb2s+OyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcblxuICAgIGxldCBob29rID0gaG9va3MuZ2V0KGlkKSBhcyBIb29rPFAsIFIsIEg+IHwgdW5kZWZpbmVkO1xuICAgIGlmICghaG9vaykge1xuICAgICAgICBob29rID0gbmV3IEhvb2soaWQsIGN1cnJlbnQgYXMgSUhvb2tTdGF0ZTxIPiwgLi4uYXJncyk7XG4gICAgICAgIGhvb2tzLnNldChpZCwgaG9vayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvb2sudXBkYXRlKC4uLmFyZ3MpO1xufTtcblxuLyoqXG4gKiBAZW4gRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgY3VzdG9tIGhvb2tzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+S9nOaIkOeUqOODleOCoeOCr+ODiOODqumWouaVsFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgSUhvb2tTdGF0ZUNvbnRleHQsIEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBleHBvcnQgY29uc3QgdXNlTWVtbyA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICogICAgIHZhbHVlOiBUO1xuICogICAgIHZhbHVlczogdW5rbm93bltdO1xuICpcbiAqICAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICogICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICogICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgfVxuICpcbiAqICAgICB1cGRhdGUoZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKTogVCB7XG4gKiAgICAgICAgIGlmICh0aGlzLmhhc0NoYW5nZWQodmFsdWVzKSkge1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgfVxuICogICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAqICAgICB9XG4gKlxuICogICAgIGhhc0NoYW5nZWQodmFsdWVzOiB1bmtub3duW10gPSBbXSk6IGJvb2xlYW4ge1xuICogICAgICAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbHVlLCBpKSA9PiB0aGlzLnZhbHVlc1tpXSAhPT0gdmFsdWUpO1xuICogICAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBtYWtlSG9vayA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPik6ICguLi5hcmdzOiBQKSA9PiBSID0+IHtcbiAgICByZXR1cm4gdXNlLmJpbmQobnVsbCwgSG9vayk7XG59O1xuIiwiaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgTmV3SG9va1N0YXRlLCBIb29rU3RhdGVVcGRhdGVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVN0YXRlID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gICAgYXJncyE6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XTtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgaW5pdGlhbFZhbHVlOiBUKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMudXBkYXRlciA9IHRoaXMudXBkYXRlci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgICAgICBpbml0aWFsVmFsdWUgPSBpbml0aWFsVmFsdWUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWFrZUFyZ3MoaW5pdGlhbFZhbHVlKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKTogcmVhZG9ubHkgW1QsIEhvb2tTdGF0ZVVwZGF0ZXI8VD5dIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJncztcbiAgICB9XG5cbiAgICB1cGRhdGVyKHZhbHVlOiBOZXdIb29rU3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgW3ByZXZpb3VzVmFsdWVdID0gdGhpcy5hcmdzO1xuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB1cGRhdGVyRm4gPSB2YWx1ZSBhcyAocHJldmlvdXNTdGF0ZT86IFQpID0+IFQ7XG4gICAgICAgICAgICB2YWx1ZSA9IHVwZGF0ZXJGbihwcmV2aW91c1ZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWVwRXF1YWwocHJldmlvdXNWYWx1ZSwgdmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICB9XG5cbiAgICBtYWtlQXJncyh2YWx1ZTogVCk6IHZvaWQge1xuICAgICAgICB0aGlzLmFyZ3MgPSBPYmplY3QuZnJlZXplKFt2YWx1ZSwgdGhpcy51cGRhdGVyXSBhcyBjb25zdCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxufSkgYXMgPFQ+KGluaXRpYWxTdGF0ZT86IFQpID0+IHJlYWRvbmx5IFtcbiAgICBUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFIpID8gUiA6IFQsXG4gICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG5dO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LWZ1bmN0aW9uLXJldHVybi10eXBlLFxuICovXG5cbmltcG9ydCB7IGRlZXBFcXVhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuXG50eXBlIEVmZmVjdCA9ICh0aGlzOiBTdGF0ZSkgPT4gdm9pZCB8IFZvaWRGdW5jdGlvbiB8IFByb21pc2U8dm9pZD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBjcmVhdGVFZmZlY3QgPSAoc2V0RWZmZWN0czogKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKSA9PiB2b2lkKSA9PiB7XG4gICAgcmV0dXJuIG1ha2VIb29rKGNsYXNzIGV4dGVuZHMgSG9vayB7XG4gICAgICAgIGNhbGxiYWNrITogRWZmZWN0O1xuICAgICAgICBsYXN0VmFsdWVzPzogdW5rbm93bltdO1xuICAgICAgICB2YWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIF90ZWFyZG93biE6IFByb21pc2U8dm9pZD4gfCBWb2lkRnVuY3Rpb24gfCB2b2lkO1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgaWdub3JlZDE6IEVmZmVjdCwgaWdub3JlZDI/OiB1bmtub3duW10pIHtcbiAgICAgICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgICAgICBzZXRFZmZlY3RzKHN0YXRlLCB0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZShjYWxsYmFjazogRWZmZWN0LCB2YWx1ZXM/OiB1bmtub3duW10pOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgICAgIGlmICghdGhpcy52YWx1ZXMgfHwgdGhpcy5oYXNDaGFuZ2VkKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sYXN0VmFsdWVzID0gdGhpcy52YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBydW4oKTogdm9pZCB7XG4gICAgICAgICAgICB0aGlzLnRlYXJkb3duKCk7XG4gICAgICAgICAgICB0aGlzLl90ZWFyZG93biA9IHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLnN0YXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRlYXJkb3duKCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLl90ZWFyZG93bikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RlYXJkb3duKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBoYXNDaGFuZ2VkKCk6IGJvb2xlYW4ge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmxhc3RWYWx1ZXMgfHwgdGhpcy52YWx1ZXMhLnNvbWUoKHZhbHVlLCBpKSA9PiAhZGVlcEVxdWFsKHRoaXMubGFzdFZhbHVlcyFbaV0sIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFN0YXRlLCBDYWxsYWJsZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgZWZmZWN0c1N5bWJvbCB9IGZyb20gJy4vc3ltYm9scyc7XG5pbXBvcnQgeyBjcmVhdGVFZmZlY3QgfSBmcm9tICcuL2NyZWF0ZS1lZmZlY3QnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3Qgc2V0RWZmZWN0cyA9IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSk6IHZvaWQgPT4ge1xuICAgIHN0YXRlW2VmZmVjdHNTeW1ib2xdLnB1c2goY2IpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUVmZmVjdCA9IGNyZWF0ZUVmZmVjdChzZXRFZmZlY3RzKTtcbiIsImltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBsYXlvdXRFZmZlY3RzU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCB7IGNyZWF0ZUVmZmVjdCB9IGZyb20gJy4vY3JlYXRlLWVmZmVjdCc7XG5cbmNvbnN0IHNldExheW91dEVmZmVjdHMgPSAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpOiB2b2lkID0+IHtcbiAgICBzdGF0ZVtsYXlvdXRFZmZlY3RzU3ltYm9sXS5wdXNoKGNiKTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VMYXlvdXRFZmZlY3QgPSBjcmVhdGVFZmZlY3Qoc2V0TGF5b3V0RWZmZWN0cyk7XG4iLCJpbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgdHlwZSB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VNZW1vID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gICAgdmFsdWU6IFQ7XG4gICAgdmFsdWVzOiB1bmtub3duW107XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgfVxuXG4gICAgdXBkYXRlKGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSk6IFQge1xuICAgICAgICBpZiAodGhpcy5oYXNDaGFuZ2VkKHZhbHVlcykpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGZuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgfVxuXG4gICAgaGFzQ2hhbmdlZCh2YWx1ZXM6IHVua25vd25bXSA9IFtdKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB2YWx1ZXMuc29tZSgodmFsdWUsIGkpID0+IHRoaXMudmFsdWVzW2ldICE9PSB2YWx1ZSk7XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfSA9IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHVzZU1lbW8oKCkgPT4gKHtcbiAgICBjdXJyZW50OiBpbml0aWFsVmFsdWVcbn0pLCBbXSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB1c2VNZW1vIH0gZnJvbSAnLi91c2UtbWVtbyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVFxuICAgID0gPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gdXNlTWVtbygoKSA9PiBmbiwgaW5wdXRzKTtcbiIsImltcG9ydCB0eXBlIHsgSG9va1JlZHVjZXIgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVJlZHVjZXIgPSBtYWtlSG9vayhjbGFzcyA8UywgSSwgQT4gZXh0ZW5kcyBIb29rIHtcbiAgICByZWR1Y2VyITogSG9va1JlZHVjZXI8UywgQT47XG4gICAgY3VycmVudFN0YXRlOiBTO1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBfOiBIb29rUmVkdWNlcjxTLCBBPiwgaW5pdGlhbFN0YXRlOiBJLCBpbml0PzogKF86IEkpID0+IFMpIHtcbiAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IHRoaXMuZGlzcGF0Y2guYmluZCh0aGlzKTtcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSB1bmRlZmluZWQgIT09IGluaXQgPyBpbml0KGluaXRpYWxTdGF0ZSkgOiBpbml0aWFsU3RhdGUgYXMgdW5rbm93biBhcyBTO1xuICAgIH1cblxuICAgIHVwZGF0ZShyZWR1Y2VyOiBIb29rUmVkdWNlcjxTLCBBPik6IHJlYWRvbmx5IFtTLCAoYWN0aW9uOiBBKSA9PiB2b2lkXSB7XG4gICAgICAgIHRoaXMucmVkdWNlciA9IHJlZHVjZXI7XG4gICAgICAgIHJldHVybiBbdGhpcy5jdXJyZW50U3RhdGUsIHRoaXMuZGlzcGF0Y2hdOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIEB0eXBlc2NyaXB0LWVzbGludC91bmJvdW5kLW1ldGhvZFxuICAgIH1cblxuICAgIGRpc3BhdGNoKGFjdGlvbjogQSk6IHZvaWQge1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHRoaXMucmVkdWNlcih0aGlzLmN1cnJlbnRTdGF0ZSwgYWN0aW9uKTtcbiAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICB9XG59KTtcbiIsImltcG9ydCB7IERpcmVjdGl2ZVJlc3VsdCwgbm9DaGFuZ2UgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgSUhvb2tDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcblxuY2xhc3MgSG9va0NvbnRleHQ8VD4gaW1wbGVtZW50cyBJSG9va0NvbnRleHQ8VD4ge1xuICAgIHJlYWRvbmx5IGRlZmF1bHRWYWx1ZTogVCB8IHVuZGVmaW5lZDtcbiAgICBwcml2YXRlIF92YWx1ZTogVDtcblxuICAgIGNvbnN0cnVjdG9yKGRlZmF1bHRWYWx1ZT86IFQpIHtcbiAgICAgICAgdGhpcy5wcm92aWRlID0gdGhpcy5wcm92aWRlLmJpbmQodGhpcyk7XG4gICAgICAgIHRoaXMuY29uc3VtZSA9IHRoaXMuY29uc3VtZS5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSBkZWZhdWx0VmFsdWUgYXMgVDtcbiAgICB9XG5cbiAgICBwcm92aWRlKHZhbHVlOiBULCBjYWxsYmFjaz86ICh2YWx1ZTogVCkgPT4gRGlyZWN0aXZlUmVzdWx0KTogRGlyZWN0aXZlUmVzdWx0IHtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIGlzRnVuY3Rpb24oY2FsbGJhY2spID8gY2FsbGJhY2sodmFsdWUpIDogbm9DaGFuZ2U7XG4gICAgfVxuXG4gICAgY29uc3VtZShjYWxsYmFjazogKHZhbHVlOiBUKSA9PiBEaXJlY3RpdmVSZXN1bHQgfCB2b2lkKTogRGlyZWN0aXZlUmVzdWx0IHwgdm9pZCB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayh0aGlzLl92YWx1ZSk7XG4gICAgfVxufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgY3JlYXRlQ29udGV4dCA9IDxUPihkZWZhdWx0VmFsdWU/OiBUKTogSUhvb2tDb250ZXh0PFQ+ID0+IHtcbiAgICByZXR1cm4gbmV3IEhvb2tDb250ZXh0KGRlZmF1bHRWYWx1ZSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBJSG9va0NvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgSG9vaywgbWFrZUhvb2sgfSBmcm9tICcuL2hvb2snO1xuaW1wb3J0IHR5cGUgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuaW1wb3J0IHsgc2V0RWZmZWN0cyB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB1c2VDb250ZXh0ID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vazxbSUhvb2tDb250ZXh0PFQ+XSwgVCwgdW5rbm93bj4ge1xuICAgIHByaXZhdGUgX3JhbkVmZmVjdDogYm9vbGVhbjtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgXzogSUhvb2tDb250ZXh0PFQ+KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVudXNlZC12YXJzXG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IGZhbHNlO1xuICAgICAgICBzZXRFZmZlY3RzKHN0YXRlLCB0aGlzKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoY29udGV4dDogSUhvb2tDb250ZXh0PFQ+KTogVCB7XG4gICAgICAgIGxldCByZXR2YWwhOiBUO1xuICAgICAgICBjb250ZXh0LmNvbnN1bWUodmFsdWUgPT4geyByZXR2YWwgPSB2YWx1ZTsgfSk7XG4gICAgICAgIHJldHVybiByZXR2YWw7XG4gICAgfVxuXG4gICAgY2FsbCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLl9yYW5FZmZlY3QpIHtcbiAgICAgICAgICAgIHRoaXMuX3JhbkVmZmVjdCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgICAgICB9XG4gICAgfVxufSk7XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgSG9va1N0YXRlVXBkYXRlcixcbiAgICBIb29rUmVkdWNlcixcbiAgICBJSG9va0NvbnRleHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBob29rc1dpdGggfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gJy4vdXNlLXN0YXRlJztcbmltcG9ydCB7IHVzZUVmZmVjdCB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VMYXlvdXRFZmZlY3QgfSBmcm9tICcuL3VzZS1sYXlvdXQtZWZmZWN0JztcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcbmltcG9ydCB7IHVzZVJlZiB9IGZyb20gJy4vdXNlLXJlZic7XG5pbXBvcnQgeyB1c2VDYWxsYmFjayB9IGZyb20gJy4vdXNlLWNhbGxiYWNrJztcbmltcG9ydCB7IHVzZVJlZHVjZXIgfSBmcm9tICcuL3VzZS1yZWR1Y2VyJztcbmltcG9ydCB7IGNyZWF0ZUNvbnRleHQgfSBmcm9tICcuL2NyZWF0ZS1jb250ZXh0JztcbmltcG9ydCB7IHVzZUNvbnRleHQgfSBmcm9tICcuL3VzZS1jb250ZXh0JztcbmV4cG9ydCAqIGZyb20gJy4vaW50ZXJmYWNlcyc7XG5leHBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5cbi8qKlxuICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuXG4gKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGNvbnN0IHsgdXNlU3RhdGUgfSA9IGhvb2tzO1xuICpcbiAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICogZnVuY3Rpb24gQXBwKCkge1xuICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gKiAgICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgICAgIDxwPkNvdW50OiAkeyBjb3VudCB9PC9wPlxuICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICogICAgIGA7XG4gKiB9XG4gKlxuICogLy8gcmVuZGVyIHdpdGggaG9va3NcbiAqIHJlbmRlcihob29rcyhBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tzIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBwYXJpdHkgd2l0aCB0aGUgUmVhY3QgaG9va3MgY29uY2VwdC4gPGJyPlxuICAgICAqICAgICBBZGQgSG9va3MgZmVhdHVyZSB0byB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheC5cbiAgICAgKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bIDxicj5cbiAgICAgKiAgICAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44GrIEhvb2tzIOapn+iDveOCkuS7mOWKoFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAgICAgKlxuICAgICAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICAgICAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAgICAgKiAgICAgY29uc3QgW2NvdW50LCBzZXRDb3VudF0gPSB1c2VTdGF0ZSgwKTtcbiAgICAgKiAgICAgcmV0dXJuIGh0bWxgXG4gICAgICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAgICAgKiAgICAgICAgIDxidXR0b24gY2xhc3M9XCJzdGF0ZS1wbHVzXCIgQGNsaWNrPSR7KCkgPT4gc2V0Q291bnQocHJldkNvdW50ID0+IHByZXZDb3VudCEgKyAxKX0+4p6VPC9idXR0b24+XG4gICAgICogICAgIGA7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gZW5hYmxpbmcgaG9va3NcbiAgICAgKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgKHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguIChzcGVjaWZ5IGEgRE9NIGRpc2Nvbm5lY3QgZGV0ZWN0aW9uIGVsZW1lbnQpXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqAgKERPTSDliIfmlq3mpJznn6XopoHntKDjgpLmjIflrpopXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NvbWUtcGFnZScpO1xuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzIHdpdGggcm9vdCBlbGVtZW50XG4gICAgICogcmVuZGVyKGhvb2tzLndpdGgoZWwsIEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsUm9vdFxuICAgICAqICAtIGBlbmAgUm9vdCBlbGVtZW50IHVzZWQgZm9yIERPTSBkaXNjb25uZWN0aW9uIGRldGVjdGlvbi4gSWYgYG51bGxgIHBhc3NlZCwgYGRvY3VtZW50YCBpcyBzcGVjaWZpZWRcbiAgICAgKiAgLSBgamFgIERPTSDliIfmlq3mpJznn6Xjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jopoHntKAuIGBudWxsYCDjgYzmuKHjgovjgaggYGRvY3VtZW50YCDjgYzmjIflrprjgZXjgozjgotcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgd2l0aDogKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBzdGF0ZWZ1bCB2YWx1ZSBhbmQgYSBmdW5jdGlvbiB0byB1cGRhdGUgaXQuXG4gICAgICogQGphIOOCueODhuODvOODiOODleODq+OBquWApOOBqOOAgeOBneOCjOOCkuabtOaWsOOBmeOCi+OBn+OCgeOBrumWouaVsOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWxTdGF0ZVxuICAgICAqICAtIGBlbmAgVGhlIHZhbHVlIHlvdSB3YW50IHRoZSBzdGF0ZSB0byBiZSBpbml0aWFsbHkuXG4gICAgICogIC0gYGphYCDnirbmhYvjga7liJ3mnJ/ljJblgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dXJucyBhbiBhcnJheSB3aXRoIGV4YWN0bHkgdHdvIHZhbHVlcy4gW2BjdXJyZW50U3RhdGVgLCBgdXBkYXRlRnVuY3Rpb25gXVxuICAgICAqICAtIGBqYWAgMuOBpOOBruWApOOCkuaMgeOBpOmFjeWIl+OCkui/lOWNtCBbYGN1cnJlbnRTdGF0ZWAsIGB1cGRhdGVGdW5jdGlvbmBdXG4gICAgICovXG4gICAgdXNlU3RhdGU6IDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgICAgIFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUikgPyBSIDogVCxcbiAgICAgICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG4gICAgXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBjb250YWlucyBpbXBlcmF0aXZlLCBwb3NzaWJseSBlZmZlY3RmdWwgY29kZS5cbiAgICAgKiBAamEg5Ymv5L2c55So44KS5pyJ44GZ44KL5Y+v6IO95oCn44Gu44GC44KL5ZG95Luk5Z6L44Gu44Kz44O844OJ44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWZmZWN0XG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCB0aW1lIGRlcGVuZGVuY2llcyBjaGFuZ2VcbiAgICAgKiAgLSBgamFgIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOCi+OBn+OBs+OBq+Wun+ihjOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBkZXBlbmRlbmNpZXNcbiAgICAgKiAgLSBgZW5gIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIHRoZSBlZmZlY3RcbiAgICAgKiAgLSBgamFgIOWJr+S9nOeUqOeZuueBq+OBruODiOODquOCrOODvOOBqOOBquOCi+S+neWtmOmWouS/guOBruODquOCueODiFxuICAgICAqL1xuICAgIHVzZUVmZmVjdDogKGVmZmVjdDogKCkgPT4gdm9pZCwgZGVwZW5kZW5jaWVzPzogdW5rbm93bltdKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGNvbnRhaW5zIGltcGVyYXRpdmUsIHBvc3NpYmx5IGVmZmVjdGZ1bCBjb2RlLiA8YnI+XG4gICAgICogICAgIFVubGlrZSB7QGxpbmsgSG9va3MudXNlRWZmZWN0fSAsIGl0IGlzIGV4ZWN1dGVkIGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHJlbmRlcmVkIGFuZCB0aGUgbmV3IGVsZW1lbnQgaXMgZGlzcGxheWVkIG9uIHRoZSBzY3JlZW4uXG4gICAgICogQGphIOWJr+S9nOeUqOOCkuacieOBmeOCi+WPr+iDveaAp+OBruOBguOCi+WRveS7pOWei+OBruOCs+ODvOODieOBrumBqeeUqCA8YnI+XG4gICAgICogICAgIHtAbGluayBIb29rcy51c2VFZmZlY3R9IOOBqOeVsOOBquOCiiwg44Kz44Oz44Od44O844ON44Oz44OI44GM44Os44Oz44OA44Oq44Oz44Kw44GV44KM44Gm5paw44GX44GE6KaB57Sg44GM55S76Z2i44Gr6KGo56S644GV44KM44KL5YmN44Gr5a6f6KGM44GV44KM44KL44CCXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWZmZWN0XG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCB0aW1lIGRlcGVuZGVuY2llcyBjaGFuZ2VcbiAgICAgKiAgLSBgamFgIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOCi+OBn+OBs+OBq+Wun+ihjOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBkZXBlbmRlbmNpZXNcbiAgICAgKiAgLSBgZW5gIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIHRoZSBlZmZlY3RcbiAgICAgKiAgLSBgamFgIOWJr+S9nOeUqOeZuueBq+OBruODiOODquOCrOODvOOBqOOBquOCi+S+neWtmOmWouS/guOBruODquOCueODiFxuICAgICAqL1xuICAgIHVzZUxheW91dEVmZmVjdDogKGVmZmVjdDogKCkgPT4gdm9pZCwgZGVwZW5kZW5jaWVzPzogdW5rbm93bltdKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIFVzZWQgdG8gcmVkdWNlIGNvbXBvbmVudCByZS1yZW5kZXJpbmcuIDxicj5cbiAgICAgKiAgICAgQ2FjaGUgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiB0aGUgY2FjaGVkIHZhbHVlIHdoZW4gY2FsbGVkIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzLlxuICAgICAqIEBqYSDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjga7lho3jg6zjg7Pjg4Djg6rjg7PjgrDjgpLmipHjgYjjgovjgZ/jgoHjgavkvb/nlKggPGJyPlxuICAgICAqICAgICDplqLmlbDjga7miLvjgorlgKTjgpLjgq3jg6Pjg4Pjgrfjg6XjgZfjgIHlkIzjgZjlvJXmlbDjgaflkbzjgbPlh7rjgZXjgozjgZ/loLTlkIjjgavjgq3jg6Pjg4Pjgrfjg6XjgZXjgozjgZ/lgKTjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB2YWx1ZVxuICAgICAqICAtIGBqYWAg5YCk44KS6L+U44GZ6Zai5pWwXG4gICAgICogQHBhcmFtIHZhbHVlc1xuICAgICAqICAtIGBlbmAgQW4gYXJyYXkgb2YgdmFsdWVzIHRoYXQgYXJlIHVzZWQgYXMgYXJndW1lbnRzIGZvciBgZm5gXG4gICAgICogIC0gYGphYCBgZm5gIOOBruW8leaVsOOBqOOBl+OBpuS9v+eUqOOBleOCjOOCi+WApOOBrumFjeWIl1xuICAgICAqL1xuICAgIHVzZU1lbW86IDxUPihmbjogKCkgPT4gVCwgdmFsdWVzOiB1bmtub3duW10pID0+IFQ7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gTGV0cyB5b3UgcmVmZXJlbmNlIGEgdmFsdWUgdGhhdOKAmXMgbm90IG5lZWRlZCBmb3IgcmVuZGVyaW5nLiA8YnI+XG4gICAgICogICAgIE1haW5seSBhdmFpbGFibGUgZm9yIGFjY2Vzc2luZyBET00gbm9kZXMuXG4gICAgICogQGphIOODrOODs+ODgOODquODs+OCsOOBq+S4jeimgeOBquWApOOCkuWPgueFp+WPr+iDveOBq+OBmeOCizxicj5cbiAgICAgKiAgICAg5Li744GrIERPTSDjg47jg7zjg4njgbjjga7jgqLjgq/jgrvjgrnjgavliKnnlKjlj6/og71cbiAgICAgKlxuICAgICAqIEBwYXJhbSBpbml0aWFsVmFsdWVcbiAgICAgKiAgLSBgZW5gIFRoZSBpbml0aWFsIHZhbHVlIG9mIHRoZSByZWZlcmVuY2VcbiAgICAgKiAgLSBgamFgIOWPgueFp+OBruWIneacn+WApFxuICAgICAqL1xuICAgIHVzZVJlZjogPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4geyBjdXJyZW50OiBUOyB9O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYSBtZW1vaXplZCB2ZXJzaW9uIG9mIHRoZSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IG9ubHkgY2hhbmdlcyBpZiB0aGUgZGVwZW5kZW5jaWVzIGNoYW5nZS4gPGJyPlxuICAgICAqICAgICBVc2VmdWwgZm9yIHBhc3NpbmcgY2FsbGJhY2tzIHRvIG9wdGltaXplZCBjaGlsZCBjb21wb25lbnRzIHRoYXQgcmVseSBvbiByZWZlcmVudGlhbCBlcXVhbGl0eS5cbiAgICAgKiBAamEg5L6d5a2Y6Zai5L+C44GM5aSJ5pu044GV44KM44Gf5aC05ZCI44Gr44Gu44G/5aSJ5pu044GV44KM44KL44Kz44O844Or44OQ44OD44Kv6Zai5pWw44Gu44Oh44Oi5YyW44OQ44O844K444On44Oz44KS6L+U5Y20IDxicj5cbiAgICAgKiAgICAg5Y+C54Wn562J5L6h5oCn44Gr5L6d5a2Y44GZ44KL5pyA6YGp5YyW44GV44KM44Gf5a2Q44Kz44Oz44Od44O844ON44Oz44OI44Gr44Kz44O844Or44OQ44OD44Kv44KS5rih44GZ5aC05ZCI44Gr5b2556uL44GkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiAgLSBgZW5gIFRoZSBmdW5jdGlvbiB0byBtZW1vaXplXG4gICAgICogIC0gYGphYCDjg6Hjg6LljJbjgZnjgovplqLmlbBcbiAgICAgKiBAcGFyYW0gaW5wdXRzXG4gICAgICogIC0gYGVuYCBBbiBhcnJheSBvZiBpbnB1dHMgdG8gd2F0Y2ggZm9yIGNoYW5nZXNcbiAgICAgKiAgLSBgamFgIOWkieabtOOCkuebo+imluOBmeOCi+WFpeWKm+OBrumFjeWIl1xuICAgICAqL1xuICAgIHVzZUNhbGxiYWNrOiA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEhvb2sgQVBJIGZvciBtYW5hZ2luZyBzdGF0ZSBpbiBmdW5jdGlvbiBjb21wb25lbnRzLlxuICAgICAqIEBqYSDplqLmlbDjgrPjg7Pjg53jg7zjg43jg7Pjg4jjgafnirbmhYvjgpLnrqHnkIbjgZnjgovjgZ/jgoHjga4gSG9vayBBUElcbiAgICAgKlxuICAgICAqIEBwYXJhbSByZWR1Y2VyXG4gICAgICogIC0gYGVuYCBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFjdGlvbiBhbmQgcmV0dXJucyBhIG5ldyBzdGF0ZVxuICAgICAqICAtIGBqYWAg54++5Zyo44Gu54q25oWL44Go44Ki44Kv44K344On44Oz44KS5Y+X44GR5Y+W44KK44CB5paw44GX44GE54q25oWL44KS6L+U44GZ6Zai5pWwXG4gICAgICogQHBhcmFtIGluaXRpYWxTdGF0ZVxuICAgICAqICAtIGBlbmAgVGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjZXJcbiAgICAgKiAgLSBgamFgIOODquODh+ODpeODvOOCteODvOOBruWIneacn+eKtuaFi+OCkuaMh+WumlxuICAgICAqIEBwYXJhbSBpbml0XG4gICAgICogIC0gYGVuYCBBbiBvcHRpb25hbCBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIHJlZHVjZXJcbiAgICAgKiAgLSBgamFgIOODquODh+ODpeODvOOCteODvOOBruWIneacn+eKtuaFi+OCkui/lOOBmeOCquODl+OCt+ODp+ODs+OBrumWouaVsFxuICAgICAqL1xuICAgIHVzZVJlZHVjZXI6IDxTLCBJLCBBPihyZWR1Y2VyOiBIb29rUmVkdWNlcjxTLCBBPiwgaW5pdGlhbFN0YXRlOiBJLCBpbml0PzogKChfOiBJKSA9PiBTKSB8IHVuZGVmaW5lZCkgPT4gcmVhZG9ubHkgW1MsIChhY3Rpb246IEEpID0+IHZvaWRdO1xuXG4gICAgLyoqXG4gICAgICogQGVuIENyZWF0ZSBhIG5ldyBjb250ZXh0IG9iamVjdC4gQ29udGV4dCBvYmplY3RzIGFyZSB1c2VkIHRvIHNoYXJlIGRhdGEgdGhhdCBpcyBjb25zaWRlcmVkIFwiZ2xvYmFsXCIuXG4gICAgICogQGphIOaWsOOBl+OBhOOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOCkuS9nOaIkOOBmeOCi+OAguOCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBryzjgIzjgrDjg63jg7zjg5Djg6vjgI3jgajogIPjgYjjgonjgozjgovjg4fjg7zjgr/jgpLlhbHmnInjgZnjgovjgZ/jgoHjgavkvb/nlKjjgZXjgozjgovjgIJcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkZWZhdWx0VmFsdWVcbiAgICAgKiAgLSBgZW5gOiBUaGUgZGVmYXVsdCB2YWx1ZSBmb3IgdGhlIGNvbnRleHQgb2JqZWN0XG4gICAgICogIC0gYGphYDog44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OI44Gu44OH44OV44Kp44Or44OI5YCkXG4gICAgICovXG4gICAgY3JlYXRlQ29udGV4dDogPFQ+KGRlZmF1bHRWYWx1ZT86IFQpID0+IElIb29rQ29udGV4dDxUPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IGNvbnRleHQgdmFsdWUgZm9yIHRoZSBzcGVjaWZpZWQgY29udGV4dCBvYmplY3QuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCs+ODs+ODhuOCreOCueODiOOCquODluOCuOOCp+OCr+ODiOOBq+WvvuOBmeOCi+ePvuWcqOOBruOCs+ODs+ODhuOCreOCueODiOWApOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGNvbnRleHRcbiAgICAgKiAgLSBgZW5gOiB0aGUgY29udGV4dCBvYmplY3QgcmV0dXJuZWQgZnJvbSB7QGxpbmsgSG9va3MuY3JlYXRlQ29udGV4dH1cbiAgICAgKiAgLSBgamFgOiB7QGxpbmsgSG9va3MuY3JlYXRlQ29udGV4dH0g44GL44KJ6L+U44GV44KM44KL44Kz44Oz44OG44Kt44K544OI44Kq44OW44K444Kn44Kv44OIXG4gICAgICovXG4gICAgdXNlQ29udGV4dDogPFQ+KGNvbnRleHQ6IElIb29rQ29udGV4dDxUPikgPT4gVDtcbn1cblxuY29uc3QgaG9va3M6IEhvb2tzID0gaG9va3NXaXRoLmJpbmQobnVsbCwgbnVsbCk7XG5ob29rcy53aXRoICAgICAgICAgICAgPSBob29rc1dpdGg7XG5ob29rcy51c2VTdGF0ZSAgICAgICAgPSB1c2VTdGF0ZTtcbmhvb2tzLnVzZUVmZmVjdCAgICAgICA9IHVzZUVmZmVjdDtcbmhvb2tzLnVzZUxheW91dEVmZmVjdCA9IHVzZUxheW91dEVmZmVjdDtcbmhvb2tzLnVzZU1lbW8gICAgICAgICA9IHVzZU1lbW87XG5ob29rcy51c2VSZWYgICAgICAgICAgPSB1c2VSZWY7XG5ob29rcy51c2VDYWxsYmFjayAgICAgPSB1c2VDYWxsYmFjaztcbmhvb2tzLnVzZVJlZHVjZXIgICAgICA9IHVzZVJlZHVjZXI7XG5ob29rcy5jcmVhdGVDb250ZXh0ICAgPSBjcmVhdGVDb250ZXh0O1xuaG9va3MudXNlQ29udGV4dCAgICAgID0gdXNlQ29udGV4dDtcblxuZXhwb3J0IHsgaG9va3MgfTtcbiJdLCJuYW1lcyI6WyJjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyIiwiaHRtbCIsImRpcmVjdGl2ZXMiLCJjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyIiwibG9hZFRlbXBsYXRlU291cmNlIiwiaXNGdW5jdGlvbiIsIlRlbXBsYXRlRW5naW5lIiwidW5lc2NhcGVIVE1MIiwic2NoZWR1bGVyIiwiQXN5bmNEaXJlY3RpdmUiLCJub29wIiwibm9DaGFuZ2UiLCIkIiwiZGlyZWN0aXZlIiwiZGVlcEVxdWFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQWFBO0lBQ0EsTUFBTSxTQUFTLEdBQXdDO1FBQ25ELFFBQVEsRUFBRUEsaURBQXlCLENBQUNDLHNCQUFJLEVBQUVDLDRCQUFVLENBQUMsVUFBVSxDQUFDO1FBQ2hFLFFBQVEsRUFBRUMsaURBQXlCLEVBQUU7S0FDeEMsQ0FBQztJQWdDRjs7O0lBR0c7VUFDVSxjQUFjLENBQUE7O0lBRWYsSUFBQSxPQUFPLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDOzs7SUFLakQ7Ozs7Ozs7Ozs7SUFVRztJQUNJLElBQUEsT0FBTyxPQUFPLENBQUMsUUFBc0MsRUFBRSxPQUFzQyxFQUFBO0lBQ2hHLFFBQUEsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLFlBQVksRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzdGLFFBQUEsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLFFBQUEsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFrQixLQUF3QztJQUNuRSxZQUFBLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hCLFNBQUMsQ0FBQztJQUNGLFFBQUEsR0FBRyxDQUFDLE1BQU0sR0FBRyxRQUFRLFlBQVksbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7SUFDckYsUUFBQSxPQUFPLEdBQUcsQ0FBQztTQUNkO0lBRUQ7Ozs7Ozs7Ozs7SUFVRztRQUNJLE9BQU8sY0FBYyxDQUFDLGNBQW1DLEVBQUE7SUFDNUQsUUFBQSxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDO0lBQ25ELFFBQUEsY0FBYyxDQUFD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