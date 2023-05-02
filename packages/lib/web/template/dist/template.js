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

    /** @internal */ const hookSymbol = Symbol('hook');
    /** @internal */ const effectsSymbol = Symbol('effects');
    /** @internal */ const layoutEffectsSymbol = Symbol('layoutEffects');

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

    const hooks = hooksWith.bind(null, null);
    hooks.with = hooksWith;
    hooks.useState = useState;
    hooks.useEffect = useEffect;
    hooks.useLayoutEffect = useLayoutEffect;
    hooks.useMemo = useMemo;
    hooks.useRef = useRef;
    hooks.useCallback = useCallback;
    hooks.useReducer = useReducer;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VzIjpbImJyaWRnZS50cyIsImxvYWRlci50cyIsImhvb2tzL2N1cnJlbnQudHMiLCJob29rcy9zeW1ib2xzLnRzIiwiaG9va3Mvc3RhdGUudHMiLCJob29rcy9kaXJlY3RpdmUudHMiLCJob29rcy9ob29rLnRzIiwiaG9va3MvdXNlLXN0YXRlLnRzIiwiaG9va3MvY3JlYXRlLWVmZmVjdC50cyIsImhvb2tzL3VzZS1lZmZlY3QudHMiLCJob29rcy91c2UtbGF5b3V0LWVmZmVjdC50cyIsImhvb2tzL3VzZS1tZW1vLnRzIiwiaG9va3MvdXNlLXJlZi50cyIsImhvb2tzL3VzZS1jYWxsYmFjay50cyIsImhvb2tzL3VzZS1yZWR1Y2VyLnRzIiwiaG9va3MvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgICBUZW1wbGF0ZVJlc3VsdCxcbiAgICBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBodG1sLFxuICAgIGRpcmVjdGl2ZXMsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVUcmFuc2Zvcm1lcixcbiAgICBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZSc7XG5pbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgYnVpbHRpbiB0cmFuc2Zvcm1lcnMgKGRlZmF1bHQ6IG11c3RhY2hlKS4gKi9cbmNvbnN0IF9idWlsdGluczogUmVjb3JkPHN0cmluZywgVGVtcGxhdGVUcmFuc2Zvcm1lcj4gPSB7XG4gICAgbXVzdGFjaGU6IGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoaHRtbCwgZGlyZWN0aXZlcy51bnNhZmVIVE1MKSxcbiAgICBzdGFtcGlubzogY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcigpLFxufTtcblxuLyoqXG4gKiBAZW4gQ29tcGlsZWQgSmF2YVNjcmlwdCB0ZW1wbGF0ZSBpbnRlcmZhY2VcbiAqIEBqYSDjgrPjg7Pjg5HjgqTjg6vmuIjjgb/jg4bjg7Pjg5fjg6zjg7zjg4jmoLzntI3jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxlZFRlbXBsYXRlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gU291cmNlIHRlbXBsYXRlIHN0cmluZ1xuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJdcbiAgICAgKi9cbiAgICBzb3VyY2U6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tUZW1wbGF0ZVJlc3VsdF1dIHRoYXQgYXBwbGllZCBnaXZlbiBwYXJhbWV0ZXIocykuXG4gICAgICogQGphIOODkeODqeODoeODvOOCv+OCkumBqeeUqOOBlyBbW1RlbXBsYXRlUmVzdWx0XV0g44G45aSJ5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlld1xuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgcGFyYW1ldGVycyBmb3Igc291cmNlLlxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQ7XG59XG5cbi8qKlxuICogQGVuIFtbVGVtcGxhdGVCcmlkZ2VdXSBjb21waWxlIG9wdGlvbnNcbiAqIEBqYSBbW1RlbXBsYXRlQnJpZGdlXV0g44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyB7XG4gICAgdHJhbnNmb3JtZXI/OiBUZW1wbGF0ZVRyYW5zZm9ybWVyO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBicmlkZ2UgZm9yIG90aGVyIHRlbXBsYXRlIGVuZ2luZSBzb3VyY2UuXG4gKiBAamEg5LuW44Gu44OG44Oz44OX44Os44O844OI44Ko44Oz44K444Oz44Gu5YWl5Yqb44KS5aSJ5o+b44GZ44KL44OG44Oz44OX44Os44O844OI44OW44Oq44OD44K444Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUJyaWRnZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgc3RhdGljIF90cmFuc2Zvcm1lciA9IF9idWlsdGlucy5tdXN0YWNoZTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tDb21waWxlZFRlbXBsYXRlXV0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSBbW0NvbXBpbGVkVGVtcGxhdGVdXSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZW1wbGF0ZVxuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgc291cmNlIHN0cmluZyAvIHRlbXBsYXRlIGVsZW1lbnRcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIlyAvIOODhuODs+ODl+ODrOODvOODiOOCqOODrOODoeODs+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb21waWxlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY29tcGlsZSh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMpOiBDb21waWxlZFRlbXBsYXRlIHtcbiAgICAgICAgY29uc3QgeyB0cmFuc2Zvcm1lciB9ID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zZm9ybWVyOiBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXIgfSwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGVuZ2luZSA9IHRyYW5zZm9ybWVyKHRlbXBsYXRlKTtcbiAgICAgICAgY29uc3QganN0ID0gKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGVuZ2luZSh2aWV3KTtcbiAgICAgICAgfTtcbiAgICAgICAganN0LnNvdXJjZSA9IHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlO1xuICAgICAgICByZXR1cm4ganN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgZGVmYXVsdCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogQGphIOaXouWumuOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruabtOaWsFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1RyYW5zZm9ybWVyXG4gICAgICogIC0gYGVuYCBuZXcgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5paw44GX44GE5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBvbGQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5Lul5YmN44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzZXRUcmFuc2Zvcm1lcihuZXdUcmFuc2Zvcm1lcjogVGVtcGxhdGVUcmFuc2Zvcm1lcik6IFRlbXBsYXRlVHJhbnNmb3JtZXIge1xuICAgICAgICBjb25zdCBvbGRUcmFuc2Zvcm1lciA9IFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lcjtcbiAgICAgICAgVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyID0gbmV3VHJhbnNmb3JtZXI7XG4gICAgICAgIHJldHVybiBvbGRUcmFuc2Zvcm1lcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG5hbWUgbGlzdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5ZCN56ew5LiA6Kan44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgbmFtZSBsaXN0LlxuICAgICAqICAtIGBqYWAg5ZCN56ew5LiA6Kan44KS6L+U5Y20XG4gICAgICovXG4gICAgc3RhdGljIGdldCBidWlsdGlucygpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhfYnVpbHRpbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYnVpbHQtaW4gdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDntYTjgb/ovrzjgb/jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0cmFuc2Zvcm1lciBvYmplY3QgbmFtZS5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjeOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZXRCdWl0aW5UcmFuc2Zvcm1lcihuYW1lOiBzdHJpbmcpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF9idWlsdGluc1tuYW1lXTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmVzY2FwZUhUTUwsIGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBKU1QsXG4gICAgVGVtcGxhdGVDb21waWxlT3B0aW9ucyxcbiAgICBUZW1wbGF0ZUVuZ2luZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXRlbXBsYXRlJztcbmltcG9ydCB7IExvYWRUZW1wbGF0ZU9wdGlvbnMsIGxvYWRUZW1wbGF0ZVNvdXJjZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmV4cG9ydCB7IGNsZWFyVGVtcGxhdGVDYWNoZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ29tcGlsZWRUZW1wbGF0ZSxcbiAgICBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zLFxuICAgIFRlbXBsYXRlQnJpZGdlLFxufSBmcm9tICcuL2JyaWRnZSc7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IHR5cGUgbGlzdC5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpfmmYLjgavmjIflrprlj6/og73jgarlnovkuIDopqdcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Qge1xuICAgIGVuZ2luZTogSlNUO1xuICAgIGJyaWRnZTogQ29tcGlsZWRUZW1wbGF0ZTtcbn1cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBkZWZpbml0aW9ucy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpfmmYLjgavmjIflrprlj6/og73jgarlnovmjIflrprlrZBcbiAqL1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVRdWVyeVR5cGVzID0ga2V5b2YgVGVtcGxhdGVRdWVyeVR5cGVMaXN0O1xuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSBvcHRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlPcHRpb25zPFQgZXh0ZW5kcyBUZW1wbGF0ZVF1ZXJ5VHlwZXM+IGV4dGVuZHMgTG9hZFRlbXBsYXRlT3B0aW9ucywgVGVtcGxhdGVDb21waWxlT3B0aW9ucywgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogYGVuZ2luZWAgLyAnYnJpZGdlJ1xuICAgICAqL1xuICAgIHR5cGU/OiBUO1xuICAgIC8qKlxuICAgICAqIEBlbiB0ZW1wbGF0ZSBsb2FkIGNhbGxiYWNrLiBgYnJpZGdlYCBtb2RlIGFsbG93cyBsb2NhbGl6YXRpb24gaGVyZS5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI6Kqt44G/6L6844G/44Kz44O844Or44OQ44OD44KvLiBgYnJpZGdlYCDjg6Ljg7zjg4njgafjga/jgZPjgZPjgafjg63jg7zjgqvjg6njgqTjgrrjgYzlj6/og71cbiAgICAgKi9cbiAgICBjYWxsYmFjaz86IChzcmM6IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQpID0+IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBQcm9taXNlPHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQ+O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgY29tcGlsZWQgSmF2YVNjcmlwdCB0ZW1wbGF0ZS5cbiAqIEBqYSDjgrPjg7Pjg5HjgqTjg6vmuIjjgb8gSmF2YVNjcmlwdCDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpdcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgVGhlIHNlbGVjdG9yIHN0cmluZyBvZiBET00uXG4gKiAgLSBgamFgIERPTSDjgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHF1ZXJ5IG9wdGlvbnNcbiAqICAtIGBqYWAg44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRUZW1wbGF0ZTxUIGV4dGVuZHMgVGVtcGxhdGVRdWVyeVR5cGVzID0gJ2VuZ2luZSc+KFxuICAgIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZVF1ZXJ5T3B0aW9uczxUPlxuKTogUHJvbWlzZTxUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF0+IHtcbiAgICBjb25zdCB7IHR5cGUsIHVybCwgbm9DYWNoZSwgY2FsbGJhY2sgfSA9IE9iamVjdC5hc3NpZ24oeyB0eXBlOiAnZW5naW5lJywgbm9DYWNoZTogZmFsc2UgfSwgb3B0aW9ucyk7XG4gICAgbGV0IHNyYyA9IGF3YWl0IGxvYWRUZW1wbGF0ZVNvdXJjZShzZWxlY3RvciwgeyB1cmwsIG5vQ2FjaGUgfSk7XG4gICAgaWYgKCFzcmMpIHtcbiAgICAgICAgdGhyb3cgbmV3IFVSSUVycm9yKGBjYW5ub3Qgc3BlY2lmaWVkIHRlbXBsYXRlIHJlc291cmNlLiB7IHNlbGVjdG9yOiAke3NlbGVjdG9yfSwgIHVybDogJHt1cmx9IH1gKTtcbiAgICB9XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgc3JjID0gYXdhaXQgY2FsbGJhY2soc3JjKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnZW5naW5lJzpcbiAgICAgICAgICAgIHJldHVybiBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKHNyYyBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB1bmVzY2FwZUhUTUwoc3JjLmlubmVySFRNTCkgOiBzcmMsIG9wdGlvbnMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgY2FzZSAnYnJpZGdlJzpcbiAgICAgICAgICAgIHJldHVybiBUZW1wbGF0ZUJyaWRnZS5jb21waWxlKHNyYywgb3B0aW9ucykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgW3R5cGU6ICR7dHlwZX1dIGlzIHVua25vd24uYCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBJSG9va1N0YXRlQ29udGV4dCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5cbmxldCBfY3VycmVudElkID0gMDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGxldCBjdXJyZW50OiBJSG9va1N0YXRlQ29udGV4dCB8IG51bGw7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRDdXJyZW50ID0gKHN0YXRlOiBJSG9va1N0YXRlQ29udGV4dCk6IHZvaWQgPT4ge1xuICAgIGN1cnJlbnQgPSBzdGF0ZTtcbn07XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBjbGVhckN1cnJlbnQgPSAoKTogdm9pZCA9PiB7XG4gICAgY3VycmVudCA9IG51bGw7XG4gICAgX2N1cnJlbnRJZCA9IDA7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3Qgbm90aWZ5ID0gKCk6IG51bWJlciA9PiB7XG4gICAgcmV0dXJuIF9jdXJyZW50SWQrKztcbn07XG4iLCIvKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBwaGFzZVN5bWJvbCA9IFN5bWJvbCgncGhhc2UnKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGhvb2tTeW1ib2wgPSBTeW1ib2woJ2hvb2snKTtcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgdXBkYXRlU3ltYm9sID0gU3ltYm9sKCd1cGRhdGUnKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGNvbW1pdFN5bWJvbCA9IFN5bWJvbCgnY29tbWl0Jyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBlZmZlY3RzU3ltYm9sID0gU3ltYm9sKCdlZmZlY3RzJyk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBsYXlvdXRFZmZlY3RzU3ltYm9sID0gU3ltYm9sKCdsYXlvdXRFZmZlY3RzJyk7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IHR5cGUgRWZmZWN0c1N5bWJvbHMgPSB0eXBlb2YgZWZmZWN0c1N5bWJvbCB8IHR5cGVvZiBsYXlvdXRFZmZlY3RzU3ltYm9sO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgdHlwZSBQaGFzZSA9IHR5cGVvZiB1cGRhdGVTeW1ib2wgfCB0eXBlb2YgY29tbWl0U3ltYm9sIHwgdHlwZW9mIGVmZmVjdHNTeW1ib2w7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGNvbnRleHRFdmVudCA9ICdob29rcy5jb250ZXh0JztcbiIsImltcG9ydCB0eXBlIHsgSUhvb2tTdGF0ZUNvbnRleHQgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUgeyBIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB7IHNldEN1cnJlbnQsIGNsZWFyQ3VycmVudCB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQge1xuICAgIGhvb2tTeW1ib2wsXG4gICAgZWZmZWN0c1N5bWJvbCxcbiAgICBsYXlvdXRFZmZlY3RzU3ltYm9sLFxuICAgIEVmZmVjdHNTeW1ib2xzLFxufSBmcm9tICcuL3N5bWJvbHMnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgaW50ZXJmYWNlIENhbGxhYmxlIHtcbiAgICBjYWxsOiAoc3RhdGU6IFN0YXRlKSA9PiB2b2lkO1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY2xhc3MgU3RhdGU8SCA9IHVua25vd24+IGltcGxlbWVudHMgSUhvb2tTdGF0ZUNvbnRleHQ8SD4ge1xuICAgIHVwZGF0ZTogVm9pZEZ1bmN0aW9uO1xuICAgIGhvc3Q6IEg7XG4gICAgdmlydHVhbD86IGJvb2xlYW47XG4gICAgW2hvb2tTeW1ib2xdOiBNYXA8bnVtYmVyLCBIb29rPjtcbiAgICBbZWZmZWN0c1N5bWJvbF06IENhbGxhYmxlW107XG4gICAgW2xheW91dEVmZmVjdHNTeW1ib2xdOiBDYWxsYWJsZVtdO1xuXG4gICAgY29uc3RydWN0b3IodXBkYXRlOiBWb2lkRnVuY3Rpb24sIGhvc3Q6IEgpIHtcbiAgICAgICAgdGhpcy51cGRhdGUgPSB1cGRhdGU7XG4gICAgICAgIHRoaXMuaG9zdCA9IGhvc3Q7XG4gICAgICAgIHRoaXNbaG9va1N5bWJvbF0gPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXNbZWZmZWN0c1N5bWJvbF0gPSBbXTtcbiAgICAgICAgdGhpc1tsYXlvdXRFZmZlY3RzU3ltYm9sXSA9IFtdO1xuICAgIH1cblxuICAgIHJ1bjxUPihjYjogKCkgPT4gVCk6IFQge1xuICAgICAgICBzZXRDdXJyZW50KHRoaXMpO1xuICAgICAgICBjb25zdCByZXMgPSBjYigpO1xuICAgICAgICBjbGVhckN1cnJlbnQoKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG5cbiAgICBfcnVuRWZmZWN0cyhwaGFzZTogRWZmZWN0c1N5bWJvbHMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZWZmZWN0cyA9IHRoaXNbcGhhc2VdO1xuICAgICAgICBzZXRDdXJyZW50KHRoaXMpO1xuICAgICAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBlZmZlY3RzKSB7XG4gICAgICAgICAgICBlZmZlY3QuY2FsbCh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBjbGVhckN1cnJlbnQoKTtcbiAgICB9XG5cbiAgICBydW5FZmZlY3RzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLl9ydW5FZmZlY3RzKGVmZmVjdHNTeW1ib2wpO1xuICAgIH1cblxuICAgIHJ1bkxheW91dEVmZmVjdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3J1bkVmZmVjdHMobGF5b3V0RWZmZWN0c1N5bWJvbCk7XG4gICAgfVxuXG4gICAgdGVhcmRvd24oKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGhvb2tzID0gdGhpc1tob29rU3ltYm9sXTtcbiAgICAgICAgZm9yIChjb25zdCBbLCBob29rXSBvZiBob29rcykge1xuICAgICAgICAgICAgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBob29rLnRlYXJkb3duKSAmJiBob29rLnRlYXJkb3duKCk7XG4gICAgICAgICAgICBkZWxldGUgaG9vay50ZWFyZG93bjtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7XG4gICAgUGFydEluZm8sXG4gICAgQXN5bmNEaXJlY3RpdmUsXG4gICAgRGlyZWN0aXZlUmVzdWx0LFxuICAgIGRpcmVjdGl2ZSxcbiAgICBub0NoYW5nZSxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICBVbmtub3duRnVuY3Rpb24sXG4gICAgbm9vcCxcbiAgICBzY2hlZHVsZXIsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBkb20gYXMgJCB9IGZyb20gJ0BjZHAvZG9tJztcbmltcG9ydCB7IFN0YXRlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbmNvbnN0IHNjaGVkdWxlID0gc2NoZWR1bGVyKCk7XG5cbmludGVyZmFjZSBEaXNjb25uZWN0YWJsZSB7XG4gICAgXyRwYXJlbnQ/OiBEaXNjb25uZWN0YWJsZTtcbiAgICBwYXJlbnROb2RlOiBFbGVtZW50O1xufVxuXG5jbGFzcyBIb29rRGlyZWN0aXZlIGV4dGVuZHMgQXN5bmNEaXJlY3RpdmUge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0YXRlOiBTdGF0ZTtcbiAgICBwcml2YXRlIF9yZW5kZXJlcjogVW5rbm93bkZ1bmN0aW9uO1xuICAgIHByaXZhdGUgX2FyZ3M6IHVua25vd25bXTtcbiAgICBwcml2YXRlIF9lbE9ic2VydmVkPzogTm9kZTtcbiAgICBwcml2YXRlIF9kaXNjb25uZWN0ZWRIYW5kbGVyPzogdHlwZW9mIEhvb2tEaXJlY3RpdmUucHJvdG90eXBlLmRpc2Nvbm5lY3RlZDtcblxuICAgIGNvbnN0cnVjdG9yKHBhcnQ6IFBhcnRJbmZvKSB7XG4gICAgICAgIHN1cGVyKHBhcnQpO1xuICAgICAgICB0aGlzLl9zdGF0ZSA9IG5ldyBTdGF0ZSgoKSA9PiB0aGlzLnJlZHJhdygpLCB0aGlzKTtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIgPSBub29wO1xuICAgICAgICB0aGlzLl9hcmdzID0gW107XG4gICAgfVxuXG4gICAgcmVuZGVyKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IERpcmVjdGl2ZVJlc3VsdCB7XG4gICAgICAgIHRoaXMuX3JlbmRlcmVyID0gcmVuZGVyZXI7XG4gICAgICAgIHRoaXMuX2FyZ3MgPSBhcmdzO1xuICAgICAgICB0aGlzLm9ic2VydmUoZWxSb290KTtcbiAgICAgICAgdGhpcy5yZWRyYXcoKTtcbiAgICAgICAgcmV0dXJuIG5vQ2hhbmdlO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCBkaXNjb25uZWN0ZWQoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2VsT2JzZXJ2ZWQgJiYgJC51dGlscy51bmRldGVjdGlmeSh0aGlzLl9lbE9ic2VydmVkKTtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fc3RhdGUudGVhcmRvd24oKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlZHJhdygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RhdGUucnVuKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSB0aGlzLl9yZW5kZXJlciguLi50aGlzLl9hcmdzKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VmFsdWUocik7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9zdGF0ZS5ydW5MYXlvdXRFZmZlY3RzKCk7XG4gICAgICAgIHNjaGVkdWxlKCgpID0+IHRoaXMuX3N0YXRlLnJ1bkVmZmVjdHMoKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBvYnNlcnZlKGVsUm9vdDogTm9kZSB8IG51bGwpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuX2Rpc2Nvbm5lY3RlZEhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHsgXyRwYXJlbnQgfSA9IHRoaXMgYXMgdW5rbm93biBhcyBEaXNjb25uZWN0YWJsZTtcbiAgICAgICAgdGhpcy5fZWxPYnNlcnZlZCA9IF8kcGFyZW50Py5wYXJlbnROb2RlO1xuICAgICAgICBpZiAodGhpcy5fZWxPYnNlcnZlZCkge1xuICAgICAgICAgICAgJC51dGlscy5kZXRlY3RpZnkodGhpcy5fZWxPYnNlcnZlZCwgZWxSb290IGFzIE5vZGUpO1xuICAgICAgICAgICAgdGhpcy5fZWxPYnNlcnZlZC5hZGRFdmVudExpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCB0aGlzLl9kaXNjb25uZWN0ZWRIYW5kbGVyID0gdGhpcy5kaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBob29rc1dpdGggPSBkaXJlY3RpdmUoSG9va0RpcmVjdGl2ZSk7XG4iLCJpbXBvcnQgdHlwZSB7IElIb29rU3RhdGVDb250ZXh0IH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGN1cnJlbnQsIG5vdGlmeSB9IGZyb20gJy4vY3VycmVudCc7XG5pbXBvcnQgeyBob29rU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcblxuLyoqXG4gKiBAZW4gQmFzZSBhYnN0cmFjdCBjbGFzcyBmb3IgQ3VzdG9tIEhvb2sgQ2xhc3MuXG4gKiBAamEg44Kr44K544K/44Og44OV44OD44Kv44Kv44Op44K544Gu5Z+65bqV5oq96LGh44Kv44Op44K5XG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBIb29rPFAgZXh0ZW5kcyB1bmtub3duW10gPSB1bmtub3duW10sIFIgPSB1bmtub3duLCBIID0gdW5rbm93bj4ge1xuICAgIGlkOiBudW1iZXI7XG4gICAgc3RhdGU6IElIb29rU3RhdGVDb250ZXh0PEg+O1xuXG4gICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGVDb250ZXh0PEg+KSB7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICAgIH1cblxuICAgIGFic3RyYWN0IHVwZGF0ZSguLi5hcmdzOiBQKTogUjtcbiAgICB0ZWFyZG93bj8oKTogdm9pZDtcbn1cblxuLyoqXG4gKiBAZW4gSW50ZXJmYWNlIGRlZmluaXRpb24gZm9yIGN1c3RvbSBob29rcy5cbiAqIEBqYSDjgqvjgrnjgr/jg6Djg5Xjg4Pjgq/jga7jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrnlrprnvqlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDdXN0b21Ib29rPFAgZXh0ZW5kcyB1bmtub3duW10gPSB1bmtub3duW10sIFIgPSB1bmtub3duLCBIID0gdW5rbm93bj4ge1xuICAgIG5ldyAoaWQ6IG51bWJlciwgc3RhdGU6IElIb29rU3RhdGVDb250ZXh0PEg+LCAuLi5hcmdzOiBQKTogSG9vazxQLCBSLCBIPjtcbn1cblxuY29uc3QgdXNlID0gPFAgZXh0ZW5kcyB1bmtub3duW10sIFIsIEggPSB1bmtub3duPihIb29rOiBDdXN0b21Ib29rPFAsIFIsIEg+LCAuLi5hcmdzOiBQKTogUiA9PiB7XG4gICAgY29uc3QgaWQgPSBub3RpZnkoKTtcbiAgICBjb25zdCBob29rcyA9IChjdXJyZW50IGFzIGFueSlbaG9va1N5bWJvbF0gYXMgTWFwPG51bWJlciwgSG9vaz47IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuXG4gICAgbGV0IGhvb2sgPSBob29rcy5nZXQoaWQpIGFzIEhvb2s8UCwgUiwgSD4gfCB1bmRlZmluZWQ7XG4gICAgaWYgKCFob29rKSB7XG4gICAgICAgIGhvb2sgPSBuZXcgSG9vayhpZCwgY3VycmVudCBhcyBJSG9va1N0YXRlQ29udGV4dDxIPiwgLi4uYXJncyk7XG4gICAgICAgIGhvb2tzLnNldChpZCwgaG9vayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhvb2sudXBkYXRlKC4uLmFyZ3MpO1xufTtcblxuLyoqXG4gKiBAZW4gRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgY3VzdG9tIGhvb2tzLlxuICogQGphIOOCq+OCueOCv+ODoOODleODg+OCr+S9nOaIkOeUqOODleOCoeOCr+ODiOODqumWouaVsFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgSUhvb2tTdGF0ZUNvbnRleHQsIEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqXG4gKiBleHBvcnQgY29uc3QgdXNlTWVtbyA9IG1ha2VIb29rKGNsYXNzIDxUPiBleHRlbmRzIEhvb2sge1xuICogICAgIHZhbHVlOiBUO1xuICogICAgIHZhbHVlczogdW5rbm93bltdO1xuICpcbiAqICAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIGZuOiAoKSA9PiBULCB2YWx1ZXM6IHVua25vd25bXSkge1xuICogICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICogICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgfVxuICpcbiAqICAgICB1cGRhdGUoZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKTogVCB7XG4gKiAgICAgICAgIGlmICh0aGlzLmhhc0NoYW5nZWQodmFsdWVzKSkge1xuICogICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gKiAgICAgICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAqICAgICAgICAgfVxuICogICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAqICAgICB9XG4gKlxuICogICAgIGhhc0NoYW5nZWQodmFsdWVzOiB1bmtub3duW10gPSBbXSk6IGJvb2xlYW4ge1xuICogICAgICAgICByZXR1cm4gdmFsdWVzLnNvbWUoKHZhbHVlLCBpKSA9PiB0aGlzLnZhbHVlc1tpXSAhPT0gdmFsdWUpO1xuICogICAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBtYWtlSG9vayA9IDxQIGV4dGVuZHMgdW5rbm93bltdLCBSLCBIID0gdW5rbm93bj4oSG9vazogQ3VzdG9tSG9vazxQLCBSLCBIPik6ICguLi5hcmdzOiBQKSA9PiBSID0+IHtcbiAgICByZXR1cm4gdXNlLmJpbmQobnVsbCwgSG9vayk7XG59O1xuIiwiaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB0eXBlIHsgTmV3SG9va1N0YXRlLCBIb29rU3RhdGVVcGRhdGVyIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVN0YXRlID0gbWFrZUhvb2soY2xhc3MgPFQ+IGV4dGVuZHMgSG9vayB7XG4gICAgYXJncyE6IHJlYWRvbmx5IFtULCBIb29rU3RhdGVVcGRhdGVyPFQ+XTtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgaW5pdGlhbFZhbHVlOiBUKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMudXBkYXRlciA9IHRoaXMudXBkYXRlci5iaW5kKHRoaXMpO1xuXG4gICAgICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgICAgICBpbml0aWFsVmFsdWUgPSBpbml0aWFsVmFsdWUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubWFrZUFyZ3MoaW5pdGlhbFZhbHVlKTtcbiAgICB9XG5cbiAgICB1cGRhdGUoKTogcmVhZG9ubHkgW1QsIEhvb2tTdGF0ZVVwZGF0ZXI8VD5dIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJncztcbiAgICB9XG5cbiAgICB1cGRhdGVyKHZhbHVlOiBOZXdIb29rU3RhdGU8VD4pOiB2b2lkIHtcbiAgICAgICAgY29uc3QgW3ByZXZpb3VzVmFsdWVdID0gdGhpcy5hcmdzO1xuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCB1cGRhdGVyRm4gPSB2YWx1ZSBhcyAocHJldmlvdXNTdGF0ZT86IFQpID0+IFQ7XG4gICAgICAgICAgICB2YWx1ZSA9IHVwZGF0ZXJGbihwcmV2aW91c1ZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWVwRXF1YWwocHJldmlvdXNWYWx1ZSwgdmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ha2VBcmdzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5zdGF0ZS51cGRhdGUoKTtcbiAgICB9XG5cbiAgICBtYWtlQXJncyh2YWx1ZTogVCk6IHZvaWQge1xuICAgICAgICB0aGlzLmFyZ3MgPSBPYmplY3QuZnJlZXplKFt2YWx1ZSwgdGhpcy51cGRhdGVyXSBhcyBjb25zdCk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxufSkgYXMgPFQ+KGluaXRpYWxTdGF0ZT86IFQpID0+IHJlYWRvbmx5IFtcbiAgICBUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFIpID8gUiA6IFQsXG4gICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG5dO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW51c2VkLXZhcnMsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvbixcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvZXhwbGljaXQtZnVuY3Rpb24tcmV0dXJuLXR5cGUsXG4gKi9cblxuaW1wb3J0IHsgZGVlcEVxdWFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5cbnR5cGUgRWZmZWN0ID0gKHRoaXM6IFN0YXRlKSA9PiB2b2lkIHwgVm9pZEZ1bmN0aW9uIHwgUHJvbWlzZTx2b2lkPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUVmZmVjdCA9IChzZXRFZmZlY3RzOiAoc3RhdGU6IFN0YXRlLCBjYjogQ2FsbGFibGUpID0+IHZvaWQpID0+IHtcbiAgICByZXR1cm4gbWFrZUhvb2soY2xhc3MgZXh0ZW5kcyBIb29rIHtcbiAgICAgICAgY2FsbGJhY2shOiBFZmZlY3Q7XG4gICAgICAgIGxhc3RWYWx1ZXM/OiB1bmtub3duW107XG4gICAgICAgIHZhbHVlcz86IHVua25vd25bXTtcbiAgICAgICAgX3RlYXJkb3duITogUHJvbWlzZTx2b2lkPiB8IFZvaWRGdW5jdGlvbiB8IHZvaWQ7XG5cbiAgICAgICAgY29uc3RydWN0b3IoaWQ6IG51bWJlciwgc3RhdGU6IFN0YXRlLCBpZ25vcmVkMTogRWZmZWN0LCBpZ25vcmVkMj86IHVua25vd25bXSkge1xuICAgICAgICAgICAgc3VwZXIoaWQsIHN0YXRlKTtcbiAgICAgICAgICAgIHNldEVmZmVjdHMoc3RhdGUsIHRoaXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlKGNhbGxiYWNrOiBFZmZlY3QsIHZhbHVlcz86IHVua25vd25bXSk6IHZvaWQge1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsKCk6IHZvaWQge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnZhbHVlcyB8fCB0aGlzLmhhc0NoYW5nZWQoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxhc3RWYWx1ZXMgPSB0aGlzLnZhbHVlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJ1bigpOiB2b2lkIHtcbiAgICAgICAgICAgIHRoaXMudGVhcmRvd24oKTtcbiAgICAgICAgICAgIHRoaXMuX3RlYXJkb3duID0gdGhpcy5jYWxsYmFjay5jYWxsKHRoaXMuc3RhdGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVhcmRvd24oKTogdm9pZCB7XG4gICAgICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRoaXMuX3RlYXJkb3duKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdGVhcmRvd24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGhhc0NoYW5nZWQoKTogYm9vbGVhbiB7XG4gICAgICAgICAgICByZXR1cm4gIXRoaXMubGFzdFZhbHVlcyB8fCB0aGlzLnZhbHVlcyEuc29tZSgodmFsdWUsIGkpID0+ICFkZWVwRXF1YWwodGhpcy5sYXN0VmFsdWVzIVtpXSwgdmFsdWUpKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbiIsImltcG9ydCB0eXBlIHsgU3RhdGUsIENhbGxhYmxlIH0gZnJvbSAnLi9zdGF0ZSc7XG5pbXBvcnQgeyBlZmZlY3RzU3ltYm9sIH0gZnJvbSAnLi9zeW1ib2xzJztcbmltcG9ydCB7IGNyZWF0ZUVmZmVjdCB9IGZyb20gJy4vY3JlYXRlLWVmZmVjdCc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCBzZXRFZmZlY3RzID0gKHN0YXRlOiBTdGF0ZSwgY2I6IENhbGxhYmxlKTogdm9pZCA9PiB7XG4gICAgc3RhdGVbZWZmZWN0c1N5bWJvbF0ucHVzaChjYik7XG59O1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlRWZmZWN0ID0gY3JlYXRlRWZmZWN0KHNldEVmZmVjdHMpO1xuIiwiaW1wb3J0IHR5cGUgeyBTdGF0ZSwgQ2FsbGFibGUgfSBmcm9tICcuL3N0YXRlJztcbmltcG9ydCB7IGxheW91dEVmZmVjdHNTeW1ib2wgfSBmcm9tICcuL3N5bWJvbHMnO1xuaW1wb3J0IHsgY3JlYXRlRWZmZWN0IH0gZnJvbSAnLi9jcmVhdGUtZWZmZWN0JztcblxuY29uc3Qgc2V0TGF5b3V0RWZmZWN0cyA9IChzdGF0ZTogU3RhdGUsIGNiOiBDYWxsYWJsZSk6IHZvaWQgPT4ge1xuICAgIHN0YXRlW2xheW91dEVmZmVjdHNTeW1ib2xdLnB1c2goY2IpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUxheW91dEVmZmVjdCA9IGNyZWF0ZUVmZmVjdChzZXRMYXlvdXRFZmZlY3RzKTtcbiIsImltcG9ydCB7IEhvb2ssIG1ha2VIb29rIH0gZnJvbSAnLi9ob29rJztcbmltcG9ydCB0eXBlIHsgU3RhdGUgfSBmcm9tICcuL3N0YXRlJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZU1lbW8gPSBtYWtlSG9vayhjbGFzcyA8VD4gZXh0ZW5kcyBIb29rIHtcbiAgICB2YWx1ZTogVDtcbiAgICB2YWx1ZXM6IHVua25vd25bXTtcblxuICAgIGNvbnN0cnVjdG9yKGlkOiBudW1iZXIsIHN0YXRlOiBTdGF0ZSwgZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKSB7XG4gICAgICAgIHN1cGVyKGlkLCBzdGF0ZSk7XG4gICAgICAgIHRoaXMudmFsdWUgPSBmbigpO1xuICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgICB9XG5cbiAgICB1cGRhdGUoZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKTogVCB7XG4gICAgICAgIGlmICh0aGlzLmhhc0NoYW5nZWQodmFsdWVzKSkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gZm4oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgICB9XG5cbiAgICBoYXNDaGFuZ2VkKHZhbHVlczogdW5rbm93bltdID0gW10pOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlcy5zb21lKCh2YWx1ZSwgaSkgPT4gdGhpcy52YWx1ZXNbaV0gIT09IHZhbHVlKTtcbiAgICB9XG59KTtcbiIsImltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZVJlZjogPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4geyBjdXJyZW50OiBUOyB9ID0gPFQ+KGluaXRpYWxWYWx1ZTogVCkgPT4gdXNlTWVtbygoKSA9PiAoe1xuICAgIGN1cnJlbnQ6IGluaXRpYWxWYWx1ZVxufSksIFtdKTtcbiIsImltcG9ydCB0eXBlIHsgVW5rbm93bkZ1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IHVzZUNhbGxiYWNrOiA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiBUXG4gICAgPSA8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4oZm46IFQsIGlucHV0czogdW5rbm93bltdKSA9PiB1c2VNZW1vKCgpID0+IGZuLCBpbnB1dHMpO1xuIiwiaW1wb3J0IHR5cGUgeyBIb29rUmVkdWNlciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5pbXBvcnQgeyBTdGF0ZSB9IGZyb20gJy4vc3RhdGUnO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3QgdXNlUmVkdWNlciA9IG1ha2VIb29rKGNsYXNzIDxTLCBJLCBBPiBleHRlbmRzIEhvb2sge1xuICAgIHJlZHVjZXIhOiBIb29rUmVkdWNlcjxTLCBBPjtcbiAgICBjdXJyZW50U3RhdGU6IFM7XG5cbiAgICBjb25zdHJ1Y3RvcihpZDogbnVtYmVyLCBzdGF0ZTogU3RhdGUsIF86IEhvb2tSZWR1Y2VyPFMsIEE+LCBpbml0aWFsU3RhdGU6IEksIGluaXQ/OiAoXzogSSkgPT4gUykge1xuICAgICAgICBzdXBlcihpZCwgc3RhdGUpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoID0gdGhpcy5kaXNwYXRjaC5iaW5kKHRoaXMpO1xuICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IHVuZGVmaW5lZCAhPT0gaW5pdCA/IGluaXQoaW5pdGlhbFN0YXRlKSA6IGluaXRpYWxTdGF0ZSBhcyB1bmtub3duIGFzIFM7XG4gICAgfVxuXG4gICAgdXBkYXRlKHJlZHVjZXI6IEhvb2tSZWR1Y2VyPFMsIEE+KTogcmVhZG9ubHkgW1MsIChhY3Rpb246IEEpID0+IHZvaWRdIHtcbiAgICAgICAgdGhpcy5yZWR1Y2VyID0gcmVkdWNlcjtcbiAgICAgICAgcmV0dXJuIFt0aGlzLmN1cnJlbnRTdGF0ZSwgdGhpcy5kaXNwYXRjaF07IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L3VuYm91bmQtbWV0aG9kXG4gICAgfVxuXG4gICAgZGlzcGF0Y2goYWN0aW9uOiBBKTogdm9pZCB7XG4gICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gdGhpcy5yZWR1Y2VyKHRoaXMuY3VycmVudFN0YXRlLCBhY3Rpb24pO1xuICAgICAgICB0aGlzLnN0YXRlLnVwZGF0ZSgpO1xuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBIb29rU3RhdGVVcGRhdGVyLCBIb29rUmVkdWNlciB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBob29rc1dpdGggfSBmcm9tICcuL2RpcmVjdGl2ZSc7XG5pbXBvcnQgeyB1c2VTdGF0ZSB9IGZyb20gJy4vdXNlLXN0YXRlJztcbmltcG9ydCB7IHVzZUVmZmVjdCB9IGZyb20gJy4vdXNlLWVmZmVjdCc7XG5pbXBvcnQgeyB1c2VMYXlvdXRFZmZlY3QgfSBmcm9tICcuL3VzZS1sYXlvdXQtZWZmZWN0JztcbmltcG9ydCB7IHVzZU1lbW8gfSBmcm9tICcuL3VzZS1tZW1vJztcbmltcG9ydCB7IHVzZVJlZiB9IGZyb20gJy4vdXNlLXJlZic7XG5pbXBvcnQgeyB1c2VDYWxsYmFjayB9IGZyb20gJy4vdXNlLWNhbGxiYWNrJztcbmltcG9ydCB7IHVzZVJlZHVjZXIgfSBmcm9tICcuL3VzZS1yZWR1Y2VyJztcbmV4cG9ydCAqIGZyb20gJy4vaW50ZXJmYWNlcyc7XG5leHBvcnQgeyBIb29rLCBtYWtlSG9vayB9IGZyb20gJy4vaG9vayc7XG5cbi8qKlxuICogQGVuIFByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgcGFyaXR5IHdpdGggdGhlIFJlYWN0IGhvb2tzIGNvbmNlcHQuXG4gKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAqIGNvbnN0IHsgdXNlU3RhdGUgfSA9IGhvb2tzO1xuICpcbiAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICogZnVuY3Rpb24gQXBwKCkge1xuICogICAgIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gKiAgICAgcmV0dXJuIGh0bWxgXG4gKiAgICAgICAgIDxwPkNvdW50OiAkeyBjb3VudCB9PC9wPlxuICogICAgICAgICA8YnV0dG9uIGNsYXNzPVwic3RhdGUtcGx1c1wiIEBjbGljaz0keygpID0+IHNldENvdW50KHByZXZDb3VudCA9PiBwcmV2Q291bnQhICsgMSl9PuKelTwvYnV0dG9uPlxuICogICAgIGA7XG4gKiB9XG4gKlxuICogLy8gcmVuZGVyIHdpdGggaG9va3NcbiAqIHJlbmRlcihob29rcyhBcHApLCBkb2N1bWVudC5ib2R5KTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tzIHtcbiAgICAvKipcbiAgICAgKiBAZW4gUHJvdmlkZXMgZnVuY3Rpb25hbGl0eSBwYXJpdHkgd2l0aCB0aGUgUmVhY3QgaG9va3MgY29uY2VwdC4gPGJyPlxuICAgICAqICAgICBBZGQgSG9va3MgZmVhdHVyZSB0byB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheC5cbiAgICAgKiBAamEgUmVhY3QgaG9va3Mg44Kz44Oz44K744OX44OI44Go5ZCM562J44Gu5qmf6IO944KS5o+Q5L6bIDxicj5cbiAgICAgKiAgICAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44GrIEhvb2tzIOapn+iDveOCkuS7mOWKoFxuICAgICAqXG4gICAgICogQGV4YW1wbGUgPGJyPlxuICAgICAqXG4gICAgICogYGBgdHNcbiAgICAgKiBpbXBvcnQgeyBodG1sLCByZW5kZXIsIGhvb2tzIH0gZnJvbSAnQGNkcC9ydW50aW1lJztcbiAgICAgKiBjb25zdCB7IHVzZVN0YXRlIH0gPSBob29rcztcbiAgICAgKlxuICAgICAqIC8vIGZ1bmN0aW9uIGNvbXBvbmVudFxuICAgICAqIGZ1bmN0aW9uIEFwcCgpIHtcbiAgICAgKiAgICAgY29uc3QgW2NvdW50LCBzZXRDb3VudF0gPSB1c2VTdGF0ZSgwKTtcbiAgICAgKiAgICAgcmV0dXJuIGh0bWxgXG4gICAgICogICAgICAgICA8cD5Db3VudDogJHsgY291bnQgfTwvcD5cbiAgICAgKiAgICAgICAgIDxidXR0b24gY2xhc3M9XCJzdGF0ZS1wbHVzXCIgQGNsaWNrPSR7KCkgPT4gc2V0Q291bnQocHJldkNvdW50ID0+IHByZXZDb3VudCEgKyAxKX0+4p6VPC9idXR0b24+XG4gICAgICogICAgIGA7XG4gICAgICogfVxuICAgICAqXG4gICAgICogLy8gZW5hYmxpbmcgaG9va3NcbiAgICAgKiByZW5kZXIoaG9va3MoQXBwKSwgZG9jdW1lbnQuYm9keSk7XG4gICAgICogYGBgXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgKHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSk6IHVua25vd247XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIEhvb2tzIGZlYXR1cmUgdG8gdGVtcGxhdGUgbGl0ZXJhbCBzeW50YXguIChzcGVjaWZ5IGEgRE9NIGRpc2Nvbm5lY3QgZGV0ZWN0aW9uIGVsZW1lbnQpXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOODquODhuODqeODq+ani+aWh+OBqyBIb29rcyDmqZ/og73jgpLku5jliqAgKERPTSDliIfmlq3mpJznn6XopoHntKDjgpLmjIflrpopXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZSA8YnI+XG4gICAgICpcbiAgICAgKiBgYGB0c1xuICAgICAqIGNvbnN0IGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NvbWUtcGFnZScpO1xuICAgICAqIC8vIGVuYWJsaW5nIGhvb2tzIHdpdGggcm9vdCBlbGVtZW50XG4gICAgICogcmVuZGVyKGhvb2tzLndpdGgoZWwsIEFwcCksIGRvY3VtZW50LmJvZHkpO1xuICAgICAqIGBgYFxuICAgICAqXG4gICAgICogQHBhcmFtIGVsUm9vdFxuICAgICAqICAtIGBlbmAgUm9vdCBlbGVtZW50IHVzZWQgZm9yIERPTSBkaXNjb25uZWN0aW9uIGRldGVjdGlvbi4gSWYgYG51bGxgIHBhc3NlZCwgYGRvY3VtZW50YCBpcyBzcGVjaWZpZWRcbiAgICAgKiAgLSBgamFgIERPTSDliIfmlq3mpJznn6Xjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jopoHntKAuIGBudWxsYCDjgYzmuKHjgovjgaggYGRvY3VtZW50YCDjgYzmjIflrprjgZXjgozjgotcbiAgICAgKiBAcGFyYW0gcmVuZGVyZXJcbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gb2JqZWN0IHRoYXQgcmV0dXJucyBhIHRlbXBsYXRlIGxpdGVyYWwgc3ludGF4XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjg4bjg6njg6vmp4vmlofjgpLov5TljbTjgZnjgovplqLmlbDjgqrjg5bjgrjjgqfjgq/jg4hcbiAgICAgKiBAcGFyYW0gYXJnc1xuICAgICAqICAtIGBlbmAgQXJndW1lbnRzIHBhc3NlZCB0ZW1wbGF0ZSBsaXRlcmFsIHN5bnRheFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44Oq44OG44Op44Or5qeL5paH44Gr44KP44Gf44KL5byV5pWwXG4gICAgICovXG4gICAgd2l0aDogKGVsUm9vdDogTm9kZSB8IG51bGwsIHJlbmRlcmVyOiBVbmtub3duRnVuY3Rpb24sIC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBzdGF0ZWZ1bCB2YWx1ZSBhbmQgYSBmdW5jdGlvbiB0byB1cGRhdGUgaXQuXG4gICAgICogQGphIOOCueODhuODvOODiOODleODq+OBquWApOOBqOOAgeOBneOCjOOCkuabtOaWsOOBmeOCi+OBn+OCgeOBrumWouaVsOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGluaXRpYWxTdGF0ZVxuICAgICAqICAtIGBlbmAgVGhlIHZhbHVlIHlvdSB3YW50IHRoZSBzdGF0ZSB0byBiZSBpbml0aWFsbHkuXG4gICAgICogIC0gYGphYCDnirbmhYvjga7liJ3mnJ/ljJblgKRcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgcmV0dXJucyBhbiBhcnJheSB3aXRoIGV4YWN0bHkgdHdvIHZhbHVlcy4gW2BjdXJyZW50U3RhdGVgLCBgdXBkYXRlRnVuY3Rpb25gXVxuICAgICAqICAtIGBqYWAgMuOBpOOBruWApOOCkuaMgeOBpOmFjeWIl+OCkui/lOWNtCBbYGN1cnJlbnRTdGF0ZWAsIGB1cGRhdGVGdW5jdGlvbmBdXG4gICAgICovXG4gICAgdXNlU3RhdGU6IDxUPihpbml0aWFsU3RhdGU/OiBUKSA9PiByZWFkb25seSBbXG4gICAgICAgIFQgZXh0ZW5kcyAoKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gaW5mZXIgUikgPyBSIDogVCxcbiAgICAgICAgSG9va1N0YXRlVXBkYXRlcjxUIGV4dGVuZHMgKCguLi5hcmdzOiB1bmtub3duW10pID0+IGluZmVyIFMpID8gUyA6IFQ+XG4gICAgXTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2NlcHRzIGEgZnVuY3Rpb24gdGhhdCBjb250YWlucyBpbXBlcmF0aXZlLCBwb3NzaWJseSBlZmZlY3RmdWwgY29kZS5cbiAgICAgKiBAamEg5Ymv5L2c55So44KS5pyJ44GZ44KL5Y+v6IO95oCn44Gu44GC44KL5ZG95Luk5Z6L44Gu44Kz44O844OJ44Gu6YGp55SoXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZWZmZWN0XG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJ1bnMgZWFjaCB0aW1lIGRlcGVuZGVuY2llcyBjaGFuZ2VcbiAgICAgKiAgLSBgamFgIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOCi+OBn+OBs+OBq+Wun+ihjOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqIEBwYXJhbSBkZXBlbmRlbmNpZXNcbiAgICAgKiAgLSBgZW5gIGxpc3Qgb2YgZGVwZW5kZW5jaWVzIHRvIHRoZSBlZmZlY3RcbiAgICAgKiAgLSBgamFgIOWJr+S9nOeUqOeZuueBq+OBruODiOODquOCrOODvOOBqOOBquOCi+S+neWtmOmWouS/guOBruODquOCueODiFxuICAgICAqL1xuICAgIHVzZUVmZmVjdDogKGVmZmVjdDogKCkgPT4gdm9pZCwgZGVwZW5kZW5jaWVzPzogdW5rbm93bltdKSA9PiB2b2lkO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VwdHMgYSBmdW5jdGlvbiB0aGF0IGNvbnRhaW5zIGltcGVyYXRpdmUsIHBvc3NpYmx5IGVmZmVjdGZ1bCBjb2RlLiA8YnI+XG4gICAgICogICAgIFVubGlrZSBbW3VzZUVmZmVjdF1dICwgaXQgaXMgZXhlY3V0ZWQgYmVmb3JlIHRoZSBjb21wb25lbnQgaXMgcmVuZGVyZWQgYW5kIHRoZSBuZXcgZWxlbWVudCBpcyBkaXNwbGF5ZWQgb24gdGhlIHNjcmVlbi5cbiAgICAgKiBAamEg5Ymv5L2c55So44KS5pyJ44GZ44KL5Y+v6IO95oCn44Gu44GC44KL5ZG95Luk5Z6L44Gu44Kz44O844OJ44Gu6YGp55SoIDxicj5cbiAgICAgKiAgICAgW1t1c2VFZmZlY3RdXSDjgajnlbDjgarjgoosIOOCs+ODs+ODneODvOODjeODs+ODiOOBjOODrOODs+ODgOODquODs+OCsOOBleOCjOOBpuaWsOOBl+OBhOimgee0oOOBjOeUu+mdouOBq+ihqOekuuOBleOCjOOCi+WJjeOBq+Wun+ihjOOBleOCjOOCi+OAglxuICAgICAqXG4gICAgICogQHBhcmFtIGVmZmVjdFxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBydW5zIGVhY2ggdGltZSBkZXBlbmRlbmNpZXMgY2hhbmdlXG4gICAgICogIC0gYGphYCDkvp3lrZjplqLkv4LjgYzlpInmm7TjgZXjgozjgovjgZ/jgbPjgavlrp/ooYzjgZXjgozjgovjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiBAcGFyYW0gZGVwZW5kZW5jaWVzXG4gICAgICogIC0gYGVuYCBsaXN0IG9mIGRlcGVuZGVuY2llcyB0byB0aGUgZWZmZWN0XG4gICAgICogIC0gYGphYCDlia/kvZznlKjnmbrngavjga7jg4jjg6rjgqzjg7zjgajjgarjgovkvp3lrZjplqLkv4Ljga7jg6rjgrnjg4hcbiAgICAgKi9cbiAgICB1c2VMYXlvdXRFZmZlY3Q6IChlZmZlY3Q6ICgpID0+IHZvaWQsIGRlcGVuZGVuY2llcz86IHVua25vd25bXSkgPT4gdm9pZDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBVc2VkIHRvIHJlZHVjZSBjb21wb25lbnQgcmUtcmVuZGVyaW5nLiA8YnI+XG4gICAgICogICAgIENhY2hlIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gdGhlIGNhY2hlZCB2YWx1ZSB3aGVuIGNhbGxlZCB3aXRoIHRoZSBzYW1lIGFyZ3VtZW50cy5cbiAgICAgKiBAamEg44Kz44Oz44Od44O844ON44Oz44OI44Gu5YaN44Os44Oz44OA44Oq44Oz44Kw44KS5oqR44GI44KL44Gf44KB44Gr5L2/55SoIDxicj5cbiAgICAgKiAgICAg6Zai5pWw44Gu5oi744KK5YCk44KS44Kt44Oj44OD44K344Ol44GX44CB5ZCM44GY5byV5pWw44Gn5ZG844Gz5Ye644GV44KM44Gf5aC05ZCI44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gf5YCk44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiAgLSBgZW5gIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgdmFsdWVcbiAgICAgKiAgLSBgamFgIOWApOOCkui/lOOBmemWouaVsFxuICAgICAqIEBwYXJhbSB2YWx1ZXNcbiAgICAgKiAgLSBgZW5gIEFuIGFycmF5IG9mIHZhbHVlcyB0aGF0IGFyZSB1c2VkIGFzIGFyZ3VtZW50cyBmb3IgYGZuYFxuICAgICAqICAtIGBqYWAgYGZuYCDjga7lvJXmlbDjgajjgZfjgabkvb/nlKjjgZXjgozjgovlgKTjga7phY3liJdcbiAgICAgKi9cbiAgICB1c2VNZW1vOiA8VD4oZm46ICgpID0+IFQsIHZhbHVlczogdW5rbm93bltdKSA9PiBUO1xuXG4gICAgLyoqXG4gICAgICogQGVuIExldHMgeW91IHJlZmVyZW5jZSBhIHZhbHVlIHRoYXTigJlzIG5vdCBuZWVkZWQgZm9yIHJlbmRlcmluZy4gPGJyPlxuICAgICAqICAgICBNYWlubHkgYXZhaWxhYmxlIGZvciBhY2Nlc3NpbmcgRE9NIG5vZGVzLlxuICAgICAqIEBqYSDjg6zjg7Pjg4Djg6rjg7PjgrDjgavkuI3opoHjgarlgKTjgpLlj4Lnhaflj6/og73jgavjgZnjgos8YnI+XG4gICAgICogICAgIOS4u+OBqyBET00g44OO44O844OJ44G444Gu44Ki44Kv44K744K544Gr5Yip55So5Y+v6IO9XG4gICAgICpcbiAgICAgKiBAcGFyYW0gaW5pdGlhbFZhbHVlXG4gICAgICogIC0gYGVuYCBUaGUgaW5pdGlhbCB2YWx1ZSBvZiB0aGUgcmVmZXJlbmNlXG4gICAgICogIC0gYGphYCDlj4Lnhafjga7liJ3mnJ/lgKRcbiAgICAgKi9cbiAgICB1c2VSZWY6IDxUPihpbml0aWFsVmFsdWU6IFQpID0+IHsgY3VycmVudDogVDsgfTtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGEgbWVtb2l6ZWQgdmVyc2lvbiBvZiB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBvbmx5IGNoYW5nZXMgaWYgdGhlIGRlcGVuZGVuY2llcyBjaGFuZ2UuIDxicj5cbiAgICAgKiAgICAgVXNlZnVsIGZvciBwYXNzaW5nIGNhbGxiYWNrcyB0byBvcHRpbWl6ZWQgY2hpbGQgY29tcG9uZW50cyB0aGF0IHJlbHkgb24gcmVmZXJlbnRpYWwgZXF1YWxpdHkuXG4gICAgICogQGphIOS+neWtmOmWouS/guOBjOWkieabtOOBleOCjOOBn+WgtOWQiOOBq+OBruOBv+WkieabtOOBleOCjOOCi+OCs+ODvOODq+ODkOODg+OCr+mWouaVsOOBruODoeODouWMluODkOODvOOCuOODp+ODs+OCkui/lOWNtCA8YnI+XG4gICAgICogICAgIOWPgueFp+etieS+oeaAp+OBq+S+neWtmOOBmeOCi+acgOmBqeWMluOBleOCjOOBn+WtkOOCs+ODs+ODneODvOODjeODs+ODiOOBq+OCs+ODvOODq+ODkOODg+OCr+OCkua4oeOBmeWgtOWQiOOBq+W9ueeri+OBpFxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogIC0gYGVuYCBUaGUgZnVuY3Rpb24gdG8gbWVtb2l6ZVxuICAgICAqICAtIGBqYWAg44Oh44Oi5YyW44GZ44KL6Zai5pWwXG4gICAgICogQHBhcmFtIGlucHV0c1xuICAgICAqICAtIGBlbmAgQW4gYXJyYXkgb2YgaW5wdXRzIHRvIHdhdGNoIGZvciBjaGFuZ2VzXG4gICAgICogIC0gYGphYCDlpInmm7TjgpLnm6PoppbjgZnjgovlhaXlipvjga7phY3liJdcbiAgICAgKi9cbiAgICB1c2VDYWxsYmFjazogPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+KGZuOiBULCBpbnB1dHM6IHVua25vd25bXSkgPT4gVDtcblxuICAgIC8qKlxuICAgICAqIEBlbiBIb29rIEFQSSBmb3IgbWFuYWdpbmcgc3RhdGUgaW4gZnVuY3Rpb24gY29tcG9uZW50cy5cbiAgICAgKiBAamEg6Zai5pWw44Kz44Oz44Od44O844ON44Oz44OI44Gn54q25oWL44KS566h55CG44GZ44KL44Gf44KB44GuIEhvb2sgQVBJXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcmVkdWNlclxuICAgICAqICAtIGBlbmAgQSBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZCBhbiBhY3Rpb24gYW5kIHJldHVybnMgYSBuZXcgc3RhdGVcbiAgICAgKiAgLSBgamFgIOePvuWcqOOBrueKtuaFi+OBqOOCouOCr+OCt+ODp+ODs+OCkuWPl+OBkeWPluOCiuOAgeaWsOOBl+OBhOeKtuaFi+OCkui/lOOBmemWouaVsFxuICAgICAqIEBwYXJhbSBpbml0aWFsU3RhdGVcbiAgICAgKiAgLSBgZW5gIFRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y2VyXG4gICAgICogIC0gYGphYCDjg6rjg4fjg6Xjg7zjgrXjg7zjga7liJ3mnJ/nirbmhYvjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gaW5pdFxuICAgICAqICAtIGBlbmAgQW4gb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBpbml0aWFsIHN0YXRlIG9mIHRoZSByZWR1Y2VyXG4gICAgICogIC0gYGphYCDjg6rjg4fjg6Xjg7zjgrXjg7zjga7liJ3mnJ/nirbmhYvjgpLov5TjgZnjgqrjg5fjgrfjg6fjg7Pjga7plqLmlbBcbiAgICAgKi9cbiAgICB1c2VSZWR1Y2VyOiA8UywgSSwgQT4ocmVkdWNlcjogSG9va1JlZHVjZXI8UywgQT4sIGluaXRpYWxTdGF0ZTogSSwgaW5pdD86ICgoXzogSSkgPT4gUykgfCB1bmRlZmluZWQpID0+IHJlYWRvbmx5IFtTLCAoYWN0aW9uOiBBKSA9PiB2b2lkXTtcbn1cblxuY29uc3QgaG9va3M6IEhvb2tzID0gaG9va3NXaXRoLmJpbmQobnVsbCwgbnVsbCk7XG5ob29rcy53aXRoICAgICAgICAgICAgPSBob29rc1dpdGg7XG5ob29rcy51c2VTdGF0ZSAgICAgICAgPSB1c2VTdGF0ZTtcbmhvb2tzLnVzZUVmZmVjdCAgICAgICA9IHVzZUVmZmVjdDtcbmhvb2tzLnVzZUxheW91dEVmZmVjdCA9IHVzZUxheW91dEVmZmVjdDtcbmhvb2tzLnVzZU1lbW8gICAgICAgICA9IHVzZU1lbW87XG5ob29rcy51c2VSZWYgICAgICAgICAgPSB1c2VSZWY7XG5ob29rcy51c2VDYWxsYmFjayAgICAgPSB1c2VDYWxsYmFjaztcbmhvb2tzLnVzZVJlZHVjZXIgICAgICA9IHVzZVJlZHVjZXI7XG5cbmV4cG9ydCB7IGhvb2tzIH07XG4iXSwibmFtZXMiOlsiY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lciIsImh0bWwiLCJkaXJlY3RpdmVzIiwiY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lciIsImxvYWRUZW1wbGF0ZVNvdXJjZSIsImlzRnVuY3Rpb24iLCJUZW1wbGF0ZUVuZ2luZSIsInVuZXNjYXBlSFRNTCIsInNjaGVkdWxlciIsIkFzeW5jRGlyZWN0aXZlIiwibm9vcCIsIm5vQ2hhbmdlIiwiJCIsImRpcmVjdGl2ZSIsImRlZXBFcXVhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFhQTtJQUNBLE1BQU0sU0FBUyxHQUF3QztRQUNuRCxRQUFRLEVBQUVBLGlEQUF5QixDQUFDQyxzQkFBSSxFQUFFQyw0QkFBVSxDQUFDLFVBQVUsQ0FBQztRQUNoRSxRQUFRLEVBQUVDLGlEQUF5QixFQUFFO0tBQ3hDLENBQUM7SUFnQ0Y7OztJQUdHO0lBQ0gsTUFBYSxjQUFjLENBQUE7O0lBRWYsSUFBQSxPQUFPLFlBQVksR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDOzs7SUFLakQ7Ozs7Ozs7Ozs7SUFVRztJQUNJLElBQUEsT0FBTyxPQUFPLENBQUMsUUFBc0MsRUFBRSxPQUFzQyxFQUFBO0lBQ2hHLFFBQUEsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLFlBQVksRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzdGLFFBQUEsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLFFBQUEsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFrQixLQUF3QztJQUNuRSxZQUFBLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hCLFNBQUMsQ0FBQztJQUNGLFFBQUEsR0FBRyxDQUFDLE1BQU0sR0FBRyxRQUFRLFlBQVksbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7SUFDckYsUUFBQSxPQUFPLEdBQUcsQ0FBQztTQUNkO0lBRUQ7Ozs7Ozs7Ozs7SUFVRztRQUNJLE9BQU8sY0FBYyxDQUFDLGNBQW1DLEVBQUE7SUFDNUQsUUFBQSxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDO0lBQ25ELFFBQUEs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