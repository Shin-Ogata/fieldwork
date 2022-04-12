/*!
 * @cdp/template 0.9.11
 *   HTML template library
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-template'), require('@cdp/extension-template-bridge'), require('@cdp/core-template'), require('@cdp/core-utils'), require('@cdp/ajax')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-template', '@cdp/extension-template-bridge', '@cdp/core-template', '@cdp/core-utils', '@cdp/ajax'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP.Exension, global.CDP.Exension, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, extensionTemplate, extensionTemplateBridge, coreTemplate, coreUtils, ajax) { 'use strict';

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
    /** @internal */
    TemplateBridge._transformer = _builtins.mustache;

    /** @internal */ const document = coreUtils.safe(globalThis.document);

    /** @internal */ let _mapProvider = {};
    /** @internal */ let _mapSource = {};
    /** @internal */
    function queryTemplateSource(selector, provider, cache) {
        const { fragment, html } = provider || {};
        const key = `${selector}${html ? `::${html}` : ''}`;
        if (_mapSource[key]) {
            return _mapSource[key];
        }
        const context = fragment || document;
        const target = context.querySelector(selector);
        const source = target instanceof HTMLTemplateElement ? target : target?.innerHTML;
        cache && source && (_mapSource[key] = source);
        return source;
    }
    /** @internal */
    async function queryTemplateProvider(url, cache) {
        if (!url) {
            return null;
        }
        if (_mapProvider[url]) {
            return _mapProvider[url];
        }
        else {
            const html = await ajax.request.text(url);
            const template = document.createElement('template');
            template.innerHTML = html;
            const fragment = template.content;
            const provider = { fragment, html: html.replace(/\s/gm, '') };
            cache && fragment && (_mapProvider[url] = provider);
            return provider;
        }
    }
    /**
     * @en Clear template's resources.
     * @ja テンプレートリソースキャッシュの削除
     */
    function clearTemplateCache() {
        _mapProvider = {};
        _mapSource = {};
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
        const { type, url, cache } = Object.assign({ type: 'engine', cache: true }, options);
        const provider = await queryTemplateProvider(url, cache);
        const src = queryTemplateSource(selector, provider, cache);
        if (!src) {
            throw new URIError(`cannot specified template resource. { selector: ${selector},  url: ${url} }`);
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

    Object.defineProperty(exports, 'TemplateEngine', {
        enumerable: true,
        get: function () { return coreTemplate.TemplateEngine; }
    });
    exports.TemplateBridge = TemplateBridge;
    exports.clearTemplateCache = clearTemplateCache;
    exports.getTemplate = getTemplate;
    for (const k in extensionTemplate) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionTemplate[k]; }
        });
    }
    for (const k in extensionTemplateBridge) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () { return extensionTemplateBridge[k]; }
        });
    }

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VzIjpbImJyaWRnZS50cyIsInNzci50cyIsImxvYWRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIGh0bWwsXG4gICAgZGlyZWN0aXZlcyxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHtcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlJztcbmltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCBidWlsdGluIHRyYW5zZm9ybWVycyAoZGVmYXVsdDogbXVzdGFjaGUpLiAqL1xuY29uc3QgX2J1aWx0aW5zID0ge1xuICAgIG11c3RhY2hlOiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWwsIGRpcmVjdGl2ZXMudW5zYWZlSFRNTCksXG4gICAgc3RhbXBpbm86IGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIoKSxcbn07XG5cbi8qKlxuICogQGVuIENvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUgaW50ZXJmYWNlXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/44OG44Oz44OX44Os44O844OI5qC857SN44Kk44Oz44K/44O844OV44Kn44Kk44K5XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgLyoqXG4gICAgICogQGVuIFNvdXJjZSB0ZW1wbGF0ZSBzdHJpbmdcbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXXG4gICAgICovXG4gICAgc291cmNlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbVGVtcGxhdGVSZXN1bHRdXSB0aGF0IGFwcGxpZWQgZ2l2ZW4gcGFyYW1ldGVyKHMpLlxuICAgICAqIEBqYSDjg5Hjg6njg6Hjg7zjgr/jgpLpgannlKjjgZcgW1tUZW1wbGF0ZVJlc3VsdF1dIOOBuOWkieaPm1xuICAgICAqXG4gICAgICogQHBhcmFtIHZpZXdcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHBhcmFtZXRlcnMgZm9yIHNvdXJjZS5cbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOODkeODqeODoeODvOOCv1xuICAgICAqL1xuICAgICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0O1xufVxuXG4vKipcbiAqIEBlbiBbW1RlbXBsYXRlQnJpZGdlXV0gY29tcGlsZSBvcHRpb25zXG4gKiBAamEgW1tUZW1wbGF0ZUJyaWRnZV1dIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMge1xuICAgIHRyYW5zZm9ybWVyPzogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbn1cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgYnJpZGdlIGZvciBvdGhlciB0ZW1wbGF0ZSBlbmdpbmUgc291cmNlLlxuICogQGphIOS7luOBruODhuODs+ODl+ODrOODvOODiOOCqOODs+OCuOODs+OBruWFpeWKm+OCkuWkieaPm+OBmeOCi+ODhuODs+ODl+ODrOODvOODiOODluODquODg+OCuOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgVGVtcGxhdGVCcmlkZ2Uge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHN0YXRpYyBfdHJhbnNmb3JtZXIgPSBfYnVpbHRpbnMubXVzdGFjaGU7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbQ29tcGlsZWRUZW1wbGF0ZV1dIGZyb20gdGVtcGxhdGUgc291cmNlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJfjgYvjgokgW1tDb21waWxlZFRlbXBsYXRlXV0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmcgLyB0ZW1wbGF0ZSBlbGVtZW50XG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJcgLyDjg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg6zjg6Hjg7Pjg4hcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY29tcGlsZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGNvbXBpbGUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zKTogQ29tcGlsZWRUZW1wbGF0ZSB7XG4gICAgICAgIGNvbnN0IHsgdHJhbnNmb3JtZXIgfSA9IE9iamVjdC5hc3NpZ24oeyB0cmFuc2Zvcm1lcjogVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyIH0sIG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBlbmdpbmUgPSB0cmFuc2Zvcm1lcih0ZW1wbGF0ZSk7XG4gICAgICAgIGNvbnN0IGpzdCA9ICh2aWV3PzogUGxhaW5PYmplY3QpOiBUZW1wbGF0ZVJlc3VsdCB8IFNWR1RlbXBsYXRlUmVzdWx0ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBlbmdpbmUodmlldyk7XG4gICAgICAgIH07XG4gICAgICAgIGpzdC5zb3VyY2UgPSB0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGpzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIGRlZmF1bHQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDml6Llrprjga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7mm7TmlrBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdUcmFuc2Zvcm1lclxuICAgICAqICAtIGBlbmAgbmV3IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOaWsOOBl+OBhOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgb2xkIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOS7peWJjeOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgc2V0VHJhbnNmb3JtZXIobmV3VHJhbnNmb3JtZXI6IFRlbXBsYXRlVHJhbnNmb3JtZXIpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICAgICAgY29uc3Qgb2xkVHJhbnNmb3JtZXIgPSBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXI7XG4gICAgICAgIFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciA9IG5ld1RyYW5zZm9ybWVyO1xuICAgICAgICByZXR1cm4gb2xkVHJhbnNmb3JtZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBuYW1lIGxpc3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeensOS4gOimp+OCkuWPluW+l1xuICAgICAqXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG5hbWUgbGlzdC5cbiAgICAgKiAgLSBgamFgIOWQjeensOS4gOimp+OCkui/lOWNtFxuICAgICAqL1xuICAgIHN0YXRpYyBnZXQgYnVpbHRpbnMoKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoX2J1aWx0aW5zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0IG5hbWUuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3liY3jgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkui/lOWNtFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0QnVpdGluVHJhbnNmb3JtZXIobmFtZTogc3RyaW5nKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBfYnVpbHRpbnNbbmFtZV07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4iLCJpbXBvcnQgeyB1bmVzY2FwZUhUTUwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBKU1QsXG4gICAgVGVtcGxhdGVDb21waWxlT3B0aW9ucyxcbiAgICBUZW1wbGF0ZUVuZ2luZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXRlbXBsYXRlJztcbmltcG9ydCB7IHJlcXVlc3QgfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQge1xuICAgIENvbXBpbGVkVGVtcGxhdGUsXG4gICAgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyxcbiAgICBUZW1wbGF0ZUJyaWRnZSxcbn0gZnJvbSAnLi9icmlkZ2UnO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgVGVtcGxhdGVQcm92aWRlciB7XG4gICAgZnJhZ21lbnQ6IERvY3VtZW50RnJhZ21lbnQ7XG4gICAgaHRtbDogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgVGVtcGxhdGVQcm92aWRlck1hcCB7XG4gICAgW3VybDogc3RyaW5nXTogVGVtcGxhdGVQcm92aWRlcjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRlbXBsYXRlU291cmNlTWFwIHtcbiAgICBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50O1xufVxuXG4vKiogQGludGVybmFsICovIGxldCBfbWFwUHJvdmlkZXI6IFRlbXBsYXRlUHJvdmlkZXJNYXAgPSB7fTtcbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF9tYXBTb3VyY2U6IFRlbXBsYXRlU291cmNlTWFwID0ge307XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIHF1ZXJ5VGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3I6IHN0cmluZywgcHJvdmlkZXI6IFRlbXBsYXRlUHJvdmlkZXIgfCBudWxsLCBjYWNoZTogYm9vbGVhbik6IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHsgZnJhZ21lbnQsIGh0bWwgfSA9IHByb3ZpZGVyIHx8IHt9O1xuICAgIGNvbnN0IGtleSA9IGAke3NlbGVjdG9yfSR7aHRtbCA/IGA6OiR7aHRtbH1gIDogJyd9YDtcbiAgICBpZiAoX21hcFNvdXJjZVtrZXldKSB7XG4gICAgICAgIHJldHVybiBfbWFwU291cmNlW2tleV07XG4gICAgfVxuICAgIGNvbnN0IGNvbnRleHQgPSBmcmFnbWVudCB8fCBkb2N1bWVudDtcbiAgICBjb25zdCB0YXJnZXQgPSBjb250ZXh0LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIGNvbnN0IHNvdXJjZSA9IHRhcmdldCBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0YXJnZXQgOiB0YXJnZXQ/LmlubmVySFRNTDtcbiAgICBjYWNoZSAmJiBzb3VyY2UgJiYgKF9tYXBTb3VyY2Vba2V5XSA9IHNvdXJjZSk7XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlUZW1wbGF0ZVByb3ZpZGVyKHVybDogc3RyaW5nIHwgdW5kZWZpbmVkLCBjYWNoZTogYm9vbGVhbik6IFByb21pc2U8VGVtcGxhdGVQcm92aWRlciB8IG51bGw+IHtcbiAgICBpZiAoIXVybCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKF9tYXBQcm92aWRlclt1cmxdKSB7XG4gICAgICAgIHJldHVybiBfbWFwUHJvdmlkZXJbdXJsXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBodG1sID0gYXdhaXQgcmVxdWVzdC50ZXh0KHVybCk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5jb250ZW50O1xuICAgICAgICBjb25zdCBwcm92aWRlciA9IHsgZnJhZ21lbnQsIGh0bWw6IGh0bWwucmVwbGFjZSgvXFxzL2dtLCAnJykgfTtcbiAgICAgICAgY2FjaGUgJiYgZnJhZ21lbnQgJiYgKF9tYXBQcm92aWRlclt1cmxdID0gcHJvdmlkZXIpO1xuICAgICAgICByZXR1cm4gcHJvdmlkZXI7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBsaXN0LlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlUeXBlTGlzdCB7XG4gICAgZW5naW5lOiBKU1Q7XG4gICAgYnJpZGdlOiBDb21waWxlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGRlZmluaXRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+aMh+WumuWtkFxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSBrZXlvZiBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IG9wdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeU9wdGlvbnM8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcz4gZXh0ZW5kcyBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLCBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0eXBlPzogVDtcbiAgICB1cmw/OiBzdHJpbmc7XG4gICAgY2FjaGU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciB0ZW1wbGF0ZSdzIHJlc291cmNlcy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjgr3jg7zjgrnjgq3jg6Pjg4Pjgrfjg6Xjga7liYrpmaRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyVGVtcGxhdGVDYWNoZSgpOiB2b2lkIHtcbiAgICBfbWFwUHJvdmlkZXIgPSB7fTtcbiAgICBfbWFwU291cmNlICAgPSB7fTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGNvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUuXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/IEphdmFTY3JpcHQg44OG44Oz44OX44Os44O844OI5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGU8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcyA9ICdlbmdpbmUnPihcbiAgICBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVRdWVyeU9wdGlvbnM8VD5cbik6IFByb21pc2U8VGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdPiB7XG4gICAgY29uc3QgeyB0eXBlLCB1cmwsIGNhY2hlIH0gPSBPYmplY3QuYXNzaWduKHsgdHlwZTogJ2VuZ2luZScsIGNhY2hlOiB0cnVlIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcXVlcnlUZW1wbGF0ZVByb3ZpZGVyKHVybCwgY2FjaGUpO1xuICAgIGNvbnN0IHNyYyA9IHF1ZXJ5VGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHByb3ZpZGVyLCBjYWNoZSk7XG4gICAgaWYgKCFzcmMpIHtcbiAgICAgICAgdGhyb3cgbmV3IFVSSUVycm9yKGBjYW5ub3Qgc3BlY2lmaWVkIHRlbXBsYXRlIHJlc291cmNlLiB7IHNlbGVjdG9yOiAke3NlbGVjdG9yfSwgIHVybDogJHt1cmx9IH1gKTtcbiAgICB9XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2VuZ2luZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVFbmdpbmUuY29tcGlsZShzcmMgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdW5lc2NhcGVIVE1MKHNyYy5pbm5lckhUTUwpIDogc3JjLCBvcHRpb25zKSBhcyBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF07XG4gICAgICAgIGNhc2UgJ2JyaWRnZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVCcmlkZ2UuY29tcGlsZShzcmMsIG9wdGlvbnMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFt0eXBlOiAke3R5cGV9XSBpcyB1bmtub3duLmApO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyIiwiaHRtbCIsImRpcmVjdGl2ZXMiLCJjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyIiwic2FmZSIsInJlcXVlc3QiLCJUZW1wbGF0ZUVuZ2luZSIsInVuZXNjYXBlSFRNTCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFhQTtJQUNBLE1BQU0sU0FBUyxHQUFHO1FBQ2QsUUFBUSxFQUFFQSxpREFBeUIsQ0FBQ0Msc0JBQUksRUFBRUMsNEJBQVUsQ0FBQyxVQUFVLENBQUM7UUFDaEUsUUFBUSxFQUFFQyxpREFBeUIsRUFBRTtLQUN4QyxDQUFDO0lBZ0NGOzs7SUFHRztVQUNVLGNBQWMsQ0FBQTs7O0lBT3ZCOzs7Ozs7Ozs7O0lBVUc7SUFDSSxJQUFBLE9BQU8sT0FBTyxDQUFDLFFBQXNDLEVBQUUsT0FBc0MsRUFBQTtJQUNoRyxRQUFBLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxZQUFZ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QVMsR0FBRyxJQUFJLENBQUM7SUFDMUIsUUFBQSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQ2xDLFFBQUEsTUFBTSxRQUFRLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDOUQsS0FBSyxJQUFJLFFBQVEsS0FBSyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7SUFDcEQsUUFBQSxPQUFPLFFBQVEsQ0FBQztJQUNuQixLQUFBO0lBQ0wsQ0FBQztJQTZCRDs7O0lBR0c7YUFDYSxrQkFBa0IsR0FBQTtRQUM5QixZQUFZLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLFVBQVUsR0FBSyxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVEOzs7Ozs7Ozs7O0lBVUc7SUFDSSxlQUFlLFdBQVcsQ0FDN0IsUUFBZ0IsRUFBRSxPQUFpQyxFQUFBO1FBRW5ELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRixNQUFNLFFBQVEsR0FBRyxNQUFNLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RCxNQUFNLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDTixNQUFNLElBQUksUUFBUSxDQUFDLENBQUEsZ0RBQUEsRUFBbUQsUUFBUSxDQUFXLFFBQUEsRUFBQSxHQUFHLENBQUksRUFBQSxDQUFBLENBQUMsQ0FBQztJQUNyRyxLQUFBO0lBQ0QsSUFBQSxRQUFRLElBQUk7SUFDUixRQUFBLEtBQUssUUFBUTtnQkFDVCxPQUFPQywyQkFBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFlBQVksbUJBQW1CLEdBQUdDLHNCQUFZLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxPQUFPLENBQTZCLENBQUM7SUFDL0ksUUFBQSxLQUFLLFFBQVE7Z0JBQ1QsT0FBTyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQTZCLENBQUM7SUFDNUUsUUFBQTtJQUNJLFlBQUEsTUFBTSxJQUFJLFNBQVMsQ0FBQyxVQUFVLElBQUksQ0FBQSxhQUFBLENBQWUsQ0FBQyxDQUFDO0lBQzFELEtBQUE7SUFDTDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdGVtcGxhdGUvIn0=
