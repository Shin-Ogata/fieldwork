/*!
 * @cdp/template 0.9.8
 *   HTML template library
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-template'), require('@cdp/extension-template-transformer'), require('@cdp/core-template'), require('@cdp/ajax'), require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-template', '@cdp/extension-template-transformer', '@cdp/core-template', '@cdp/ajax', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP.Exension, global.CDP.Exension, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, extensionTemplate, extensionTemplateTransformer, coreTemplate, ajax, coreUtils) { 'use strict';

    /** @internal default transformer for mustache. */
    const mustache = extensionTemplateTransformer.createTransformFactory(extensionTemplate.html, extensionTemplate.directives.unsafeHTML);
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
         *  - `en` template source string
         *  - `ja` テンプレート文字列
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
            jst.source = template;
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
    }
    /** @internal */
    TemplateBridge._transformer = mustache;

    /** @internal */ const document = coreUtils.safe(globalThis.document);

    /** @internal */ let _mapElement = {};
    /** @internal */ let _mapSource = {};
    /** @internal */
    function queryTemplateSource(selector, el, cache) {
        const key = `${selector}${el ? `::${el.innerHTML.replace(/\s/gm, '')}` : ''}`;
        if (_mapSource[key]) {
            return _mapSource[key];
        }
        const context = el || document;
        const target = context.querySelector(selector);
        const source = target?.innerHTML;
        cache && source && (_mapSource[key] = source);
        return source;
    }
    /** @internal */
    async function queryTemplateElement(url, cache) {
        if (!url) {
            return null;
        }
        if (_mapElement[url]) {
            return _mapElement[url];
        }
        else {
            const html = await ajax.request.text(url);
            const template = document.createElement('template');
            template.innerHTML = html;
            const el = template.content.firstElementChild;
            cache && el && (_mapElement[url] = el);
            return el;
        }
    }
    /**
     * @en Clear template's resources.
     * @ja テンプレートリソースキャッシュの削除
     */
    function clearTemplateCache() {
        _mapElement = {};
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
        const el = await queryTemplateElement(url, cache);
        const src = queryTemplateSource(selector, el, cache);
        if (!src) {
            throw new URIError(`cannot specified template resource. { selector: ${selector},  url: ${url} }`);
        }
        switch (type) {
            case 'engine':
                return coreTemplate.TemplateEngine.compile(src);
            case 'bridge':
                return TemplateBridge.compile(src);
            default:
                throw new TypeError(`[type: ${type}] is unknown.`);
        }
    }

    Object.defineProperty(exports, 'TemplateEngine', {
        enumerable: true,
        get: function () {
            return coreTemplate.TemplateEngine;
        }
    });
    exports.TemplateBridge = TemplateBridge;
    exports.clearTemplateCache = clearTemplateCache;
    exports.getTemplate = getTemplate;
    Object.keys(extensionTemplate).forEach(function (k) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () {
                return extensionTemplate[k];
            }
        });
    });
    Object.keys(extensionTemplateTransformer).forEach(function (k) {
        if (k !== 'default' && !exports.hasOwnProperty(k)) Object.defineProperty(exports, k, {
            enumerable: true,
            get: function () {
                return extensionTemplateTransformer[k];
            }
        });
    });

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUuanMiLCJzb3VyY2VzIjpbImJyaWRnZS50cyIsInNzci50cyIsImxvYWRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIFRlbXBsYXRlUmVzdWx0LFxuICAgIFNWR1RlbXBsYXRlUmVzdWx0LFxuICAgIGh0bWwsXG4gICAgZGlyZWN0aXZlcyxcbn0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHsgVGVtcGxhdGVUcmFuc2Zvcm1lciwgY3JlYXRlVHJhbnNmb3JtRmFjdG9yeSB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlLXRyYW5zZm9ybWVyJztcbmltcG9ydCB7IFBsYWluT2JqZWN0IH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqIEBpbnRlcm5hbCBkZWZhdWx0IHRyYW5zZm9ybWVyIGZvciBtdXN0YWNoZS4gKi9cbmNvbnN0IG11c3RhY2hlID0gY3JlYXRlVHJhbnNmb3JtRmFjdG9yeShodG1sLCBkaXJlY3RpdmVzLnVuc2FmZUhUTUwpO1xuXG4vKipcbiAqIEBlbiBDb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlIGludGVyZmFjZVxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBv+ODhuODs+ODl+ODrOODvOODiOagvOe0jeOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTb3VyY2UgdGVtcGxhdGUgc3RyaW5nXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNvdXJjZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW1RlbXBsYXRlUmVzdWx0XV0gdGhhdCBhcHBsaWVkIGdpdmVuIHBhcmFtZXRlcihzKS5cbiAgICAgKiBAamEg44OR44Op44Oh44O844K/44KS6YGp55So44GXIFtbVGVtcGxhdGVSZXN1bHRdXSDjgbjlpInmj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWV3XG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBwYXJhbWV0ZXJzIGZvciBzb3VyY2UuXG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdDtcbn1cblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUJyaWRnZV1dIGNvbXBpbGUgb3B0aW9uc1xuICogQGphIFtbVGVtcGxhdGVCcmlkZ2VdXSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0cmFuc2Zvcm1lcj86IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIGJyaWRnZSBmb3Igb3RoZXIgdGVtcGxhdGUgZW5naW5lIHNvdXJjZS5cbiAqIEBqYSDku5bjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg7Pjgrjjg7Pjga7lhaXlipvjgpLlpInmj5vjgZnjgovjg4bjg7Pjg5fjg6zjg7zjg4jjg5bjg6rjg4Pjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlQnJpZGdlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgX3RyYW5zZm9ybWVyID0gbXVzdGFjaGU7XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgc3RhdGljIG1ldGhvZHM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IFtbQ29tcGlsZWRUZW1wbGF0ZV1dIGZyb20gdGVtcGxhdGUgc291cmNlLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJfjgYvjgokgW1tDb21waWxlZFRlbXBsYXRlXV0g44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGVtcGxhdGVcbiAgICAgKiAgLSBgZW5gIHRlbXBsYXRlIHNvdXJjZSBzdHJpbmdcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb21waWxlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY29tcGlsZSh0ZW1wbGF0ZTogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyk6IENvbXBpbGVkVGVtcGxhdGUge1xuICAgICAgICBjb25zdCB7IHRyYW5zZm9ybWVyIH0gPSBPYmplY3QuYXNzaWduKHsgdHJhbnNmb3JtZXI6IFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciB9LCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgZW5naW5lID0gdHJhbnNmb3JtZXIodGVtcGxhdGUpO1xuICAgICAgICBjb25zdCBqc3QgPSAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdCA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZW5naW5lKHZpZXcpO1xuICAgICAgICB9O1xuICAgICAgICBqc3Quc291cmNlID0gdGVtcGxhdGU7XG4gICAgICAgIHJldHVybiBqc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBkZWZhdWx0IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg5pei5a6a44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3VHJhbnNmb3JtZXJcbiAgICAgKiAgLSBgZW5gIG5ldyB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDku6XliY3jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldFRyYW5zZm9ybWVyKG5ld1RyYW5zZm9ybWVyOiBUZW1wbGF0ZVRyYW5zZm9ybWVyKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgICAgIGNvbnN0IG9sZFRyYW5zZm9ybWVyID0gVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyO1xuICAgICAgICBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXIgPSBuZXdUcmFuc2Zvcm1lcjtcbiAgICAgICAgcmV0dXJuIG9sZFRyYW5zZm9ybWVyO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgZG9jdW1lbnQgPSBzYWZlKGdsb2JhbFRoaXMuZG9jdW1lbnQpO1xuIiwiaW1wb3J0IHsgSlNULCBUZW1wbGF0ZUVuZ2luZSB9IGZyb20gJ0BjZHAvY29yZS10ZW1wbGF0ZSc7XG5pbXBvcnQgeyByZXF1ZXN0IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuaW1wb3J0IHsgQ29tcGlsZWRUZW1wbGF0ZSwgVGVtcGxhdGVCcmlkZ2UgfSBmcm9tICcuL2JyaWRnZSc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUZW1wbGF0ZUVsZW1lbnRNYXAge1xuICAgIFt1cmw6IHN0cmluZ106IEVsZW1lbnQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUZW1wbGF0ZVNvdXJjZU1hcCB7XG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovIGxldCBfbWFwRWxlbWVudDogVGVtcGxhdGVFbGVtZW50TWFwID0ge307XG4vKiogQGludGVybmFsICovIGxldCBfbWFwU291cmNlOiBUZW1wbGF0ZVNvdXJjZU1hcCA9IHt9O1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBxdWVyeVRlbXBsYXRlU291cmNlKHNlbGVjdG9yOiBzdHJpbmcsIGVsOiBFbGVtZW50IHwgbnVsbCwgY2FjaGU6IGJvb2xlYW4pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IGtleSA9IGAke3NlbGVjdG9yfSR7ZWwgPyBgOjoke2VsLmlubmVySFRNTC5yZXBsYWNlKC9cXHMvZ20sICcnKX1gIDogJyd9YDtcbiAgICBpZiAoX21hcFNvdXJjZVtrZXldKSB7XG4gICAgICAgIHJldHVybiBfbWFwU291cmNlW2tleV07XG4gICAgfVxuICAgIGNvbnN0IGNvbnRleHQgPSBlbCB8fCBkb2N1bWVudDtcbiAgICBjb25zdCB0YXJnZXQgPSBjb250ZXh0LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIGNvbnN0IHNvdXJjZSA9IHRhcmdldD8uaW5uZXJIVE1MO1xuICAgIGNhY2hlICYmIHNvdXJjZSAmJiAoX21hcFNvdXJjZVtrZXldID0gc291cmNlKTtcbiAgICByZXR1cm4gc291cmNlO1xufVxuXG4vKiogQGludGVybmFsICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeVRlbXBsYXRlRWxlbWVudCh1cmw6IHN0cmluZyB8IHVuZGVmaW5lZCwgY2FjaGU6IGJvb2xlYW4pOiBQcm9taXNlPEVsZW1lbnQgfCBudWxsPiB7XG4gICAgaWYgKCF1cmwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChfbWFwRWxlbWVudFt1cmxdKSB7XG4gICAgICAgIHJldHVybiBfbWFwRWxlbWVudFt1cmxdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZXF1ZXN0LnRleHQodXJsKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICBjb25zdCBlbCA9IHRlbXBsYXRlLmNvbnRlbnQuZmlyc3RFbGVtZW50Q2hpbGQ7XG4gICAgICAgIGNhY2hlICYmIGVsICYmIChfbWFwRWxlbWVudFt1cmxdID0gZWwpO1xuICAgICAgICByZXR1cm4gZWw7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBsaXN0LlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlUeXBlTGlzdCB7XG4gICAgZW5naW5lOiBKU1Q7XG4gICAgYnJpZGdlOiBDb21waWxlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGRlZmluaXRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+aMh+WumuWtkFxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSBrZXlvZiBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IG9wdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeU9wdGlvbnM8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcz4ge1xuICAgIHR5cGU/OiBUO1xuICAgIHVybD86IHN0cmluZztcbiAgICBjYWNoZT86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIENsZWFyIHRlbXBsYXRlJ3MgcmVzb3VyY2VzLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOODquOCveODvOOCueOCreODo+ODg+OCt+ODpeOBruWJiumZpFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJUZW1wbGF0ZUNhY2hlKCk6IHZvaWQge1xuICAgIF9tYXBFbGVtZW50ID0ge307XG4gICAgX21hcFNvdXJjZSAgPSB7fTtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGNvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUuXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/IEphdmFTY3JpcHQg44OG44Oz44OX44Os44O844OI5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGU8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcyA9ICdlbmdpbmUnPihcbiAgICBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVRdWVyeU9wdGlvbnM8VD5cbik6IFByb21pc2U8VGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdPiB7XG4gICAgY29uc3QgeyB0eXBlLCB1cmwsIGNhY2hlIH0gPSBPYmplY3QuYXNzaWduKHsgdHlwZTogJ2VuZ2luZScsIGNhY2hlOiB0cnVlIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IGVsICA9IGF3YWl0IHF1ZXJ5VGVtcGxhdGVFbGVtZW50KHVybCwgY2FjaGUpO1xuICAgIGNvbnN0IHNyYyA9IHF1ZXJ5VGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIGVsLCBjYWNoZSk7XG4gICAgaWYgKCFzcmMpIHtcbiAgICAgICAgdGhyb3cgbmV3IFVSSUVycm9yKGBjYW5ub3Qgc3BlY2lmaWVkIHRlbXBsYXRlIHJlc291cmNlLiB7IHNlbGVjdG9yOiAke3NlbGVjdG9yfSwgIHVybDogJHt1cmx9IH1gKTtcbiAgICB9XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2VuZ2luZSc6XG4gICAgICAgICAgICByZXR1cm4gVGVtcGxhdGVFbmdpbmUuY29tcGlsZShzcmMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgY2FzZSAnYnJpZGdlJzpcbiAgICAgICAgICAgIHJldHVybiBUZW1wbGF0ZUJyaWRnZS5jb21waWxlKHNyYykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgW3R5cGU6ICR7dHlwZX1dIGlzIHVua25vd24uYCk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImNyZWF0ZVRyYW5zZm9ybUZhY3RvcnkiLCJodG1sIiwiZGlyZWN0aXZlcyIsInNhZmUiLCJyZXF1ZXN0IiwiVGVtcGxhdGVFbmdpbmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBU0E7SUFDQSxNQUFNLFFBQVEsR0FBR0EsbURBQXNCLENBQUNDLHNCQUFJLEVBQUVDLDRCQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFnQ3JFOzs7O1VBSWEsY0FBYzs7Ozs7Ozs7Ozs7Ozs7UUFrQmhCLE9BQU8sT0FBTyxDQUFDLFFBQWdCLEVBQUUsT0FBc0M7WUFDMUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLFlBQVksRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdGLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyQyxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQWtCO2dCQUMzQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUN2QixDQUFDO1lBQ0YsR0FBRyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7WUFDdEIsT0FBTyxHQUFHLENBQUM7U0FDZDs7Ozs7Ozs7Ozs7O1FBYU0sT0FBTyxjQUFjLENBQUMsY0FBbUM7WUFDNUQsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQztZQUNuRCxjQUFjLENBQUMsWUFBWSxHQUFHLGNBQWMsQ0FBQztZQUM3QyxPQUFPLGNBQWMsQ0FBQztTQUN6Qjs7SUExQ0Q7SUFDZSwyQkFBWSxHQUFHLFFBQVE7O0lDL0MxQyxpQkFBd0IsTUFBTSxRQUFRLEdBQUdDLGNBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDOztJQ2NsRSxpQkFBaUIsSUFBSSxXQUFXLEdBQXVCLEVBQUUsQ0FBQztJQUMxRCxpQkFBaUIsSUFBSSxVQUFVLEdBQXNCLEVBQUUsQ0FBQztJQUV4RDtJQUNBLFNBQVMsbUJBQW1CLENBQUMsUUFBZ0IsRUFBRSxFQUFrQixFQUFFLEtBQWM7UUFDN0UsTUFBTSxHQUFHLEdBQUcsR0FBRyxRQUFRLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7UUFDOUUsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDakIsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDMUI7UUFDRCxNQUFNLE9BQU8sR0FBRyxFQUFFLElBQUksUUFBUSxDQUFDO1FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxFQUFFLFNBQVMsQ0FBQztRQUNqQyxLQUFLLElBQUksTUFBTSxLQUFLLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUM5QyxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRUQ7SUFDQSxlQUFlLG9CQUFvQixDQUFDLEdBQXVCLEVBQUUsS0FBYztRQUN2RSxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ04sT0FBTyxJQUFJLENBQUM7U0FDZjtRQUNELElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2xCLE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzNCO2FBQU07WUFDSCxNQUFNLElBQUksR0FBRyxNQUFNQyxZQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEQsUUFBUSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDMUIsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztZQUM5QyxLQUFLLElBQUksRUFBRSxLQUFLLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUN2QyxPQUFPLEVBQUUsQ0FBQztTQUNiO0lBQ0wsQ0FBQztJQTZCRDs7OzthQUlnQixrQkFBa0I7UUFDOUIsV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUNqQixVQUFVLEdBQUksRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7SUFXTyxlQUFlLFdBQVcsQ0FDN0IsUUFBZ0IsRUFBRSxPQUFpQztRQUVuRCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckYsTUFBTSxFQUFFLEdBQUksTUFBTSxvQkFBb0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkQsTUFBTSxHQUFHLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ04sTUFBTSxJQUFJLFFBQVEsQ0FBQyxtREFBbUQsUUFBUSxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDckc7UUFDRCxRQUFRLElBQUk7WUFDUixLQUFLLFFBQVE7Z0JBQ1QsT0FBT0MsMkJBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUE2QixDQUFDO1lBQ25FLEtBQUssUUFBUTtnQkFDVCxPQUFPLGNBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUE2QixDQUFDO1lBQ25FO2dCQUNJLE1BQU0sSUFBSSxTQUFTLENBQUMsVUFBVSxJQUFJLGVBQWUsQ0FBQyxDQUFDO1NBQzFEO0lBQ0w7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3RlbXBsYXRlLyJ9
