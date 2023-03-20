/*!
 * @cdp/template 0.9.17
 *   HTML template library
 */

import { html, directives } from '@cdp/extension-template';
export * from '@cdp/extension-template';
import { createMustacheTransformer, createStampinoTransformer } from '@cdp/extension-template-bridge';
export * from '@cdp/extension-template-bridge';
import { TemplateEngine } from '@cdp/core-template';
export { TemplateEngine } from '@cdp/core-template';
import { isFunction, unescapeHTML } from '@cdp/core-utils';
import { loadTemplateSource } from '@cdp/web-utils';
export { clearTemplateCache } from '@cdp/web-utils';

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

export { TemplateBridge, getTemplate };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUubWpzIiwic291cmNlcyI6WyJicmlkZ2UudHMiLCJsb2FkZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgICBUZW1wbGF0ZVJlc3VsdCxcbiAgICBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBodG1sLFxuICAgIGRpcmVjdGl2ZXMsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVUcmFuc2Zvcm1lcixcbiAgICBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZSc7XG5pbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgYnVpbHRpbiB0cmFuc2Zvcm1lcnMgKGRlZmF1bHQ6IG11c3RhY2hlKS4gKi9cbmNvbnN0IF9idWlsdGluczogUmVjb3JkPHN0cmluZywgVGVtcGxhdGVUcmFuc2Zvcm1lcj4gPSB7XG4gICAgbXVzdGFjaGU6IGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoaHRtbCwgZGlyZWN0aXZlcy51bnNhZmVIVE1MKSxcbiAgICBzdGFtcGlubzogY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcigpLFxufTtcblxuLyoqXG4gKiBAZW4gQ29tcGlsZWQgSmF2YVNjcmlwdCB0ZW1wbGF0ZSBpbnRlcmZhY2VcbiAqIEBqYSDjgrPjg7Pjg5HjgqTjg6vmuIjjgb/jg4bjg7Pjg5fjg6zjg7zjg4jmoLzntI3jgqTjg7Pjgr/jg7zjg5XjgqfjgqTjgrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxlZFRlbXBsYXRlIHtcbiAgICAvKipcbiAgICAgKiBAZW4gU291cmNlIHRlbXBsYXRlIHN0cmluZ1xuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jmloflrZfliJdcbiAgICAgKi9cbiAgICBzb3VyY2U6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tUZW1wbGF0ZVJlc3VsdF1dIHRoYXQgYXBwbGllZCBnaXZlbiBwYXJhbWV0ZXIocykuXG4gICAgICogQGphIOODkeODqeODoeODvOOCv+OCkumBqeeUqOOBlyBbW1RlbXBsYXRlUmVzdWx0XV0g44G45aSJ5o+bXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdmlld1xuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgcGFyYW1ldGVycyBmb3Igc291cmNlLlxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI44OR44Op44Oh44O844K/XG4gICAgICovXG4gICAgKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQ7XG59XG5cbi8qKlxuICogQGVuIFtbVGVtcGxhdGVCcmlkZ2VdXSBjb21waWxlIG9wdGlvbnNcbiAqIEBqYSBbW1RlbXBsYXRlQnJpZGdlXV0g44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyB7XG4gICAgdHJhbnNmb3JtZXI/OiBUZW1wbGF0ZVRyYW5zZm9ybWVyO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBicmlkZ2UgZm9yIG90aGVyIHRlbXBsYXRlIGVuZ2luZSBzb3VyY2UuXG4gKiBAamEg5LuW44Gu44OG44Oz44OX44Os44O844OI44Ko44Oz44K444Oz44Gu5YWl5Yqb44KS5aSJ5o+b44GZ44KL44OG44Oz44OX44Os44O844OI44OW44Oq44OD44K444Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW1wbGF0ZUJyaWRnZSB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgc3RhdGljIF90cmFuc2Zvcm1lciA9IF9idWlsdGlucy5tdXN0YWNoZTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBzdGF0aWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgW1tDb21waWxlZFRlbXBsYXRlXV0gZnJvbSB0ZW1wbGF0ZSBzb3VyY2UuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl+OBi+OCiSBbW0NvbXBpbGVkVGVtcGxhdGVdXSDjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0ZW1wbGF0ZVxuICAgICAqICAtIGBlbmAgdGVtcGxhdGUgc291cmNlIHN0cmluZyAvIHRlbXBsYXRlIGVsZW1lbnRcbiAgICAgKiAgLSBgamFgIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIlyAvIOODhuODs+ODl+ODrOODvOODiOOCqOODrOODoeODs+ODiFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjb21waWxlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCs+ODs+ODkeOCpOODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgY29tcGlsZSh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZywgb3B0aW9ucz86IFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMpOiBDb21waWxlZFRlbXBsYXRlIHtcbiAgICAgICAgY29uc3QgeyB0cmFuc2Zvcm1lciB9ID0gT2JqZWN0LmFzc2lnbih7IHRyYW5zZm9ybWVyOiBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXIgfSwgb3B0aW9ucyk7XG4gICAgICAgIGNvbnN0IGVuZ2luZSA9IHRyYW5zZm9ybWVyKHRlbXBsYXRlKTtcbiAgICAgICAgY29uc3QganN0ID0gKHZpZXc/OiBQbGFpbk9iamVjdCk6IFRlbXBsYXRlUmVzdWx0IHwgU1ZHVGVtcGxhdGVSZXN1bHQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGVuZ2luZSh2aWV3KTtcbiAgICAgICAgfTtcbiAgICAgICAganN0LnNvdXJjZSA9IHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlO1xuICAgICAgICByZXR1cm4ganN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVcGRhdGUgZGVmYXVsdCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogQGphIOaXouWumuOBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruabtOaWsFxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1RyYW5zZm9ybWVyXG4gICAgICogIC0gYGVuYCBuZXcgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5paw44GX44GE5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS5oyH5a6aLlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBvbGQgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5Lul5YmN44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzZXRUcmFuc2Zvcm1lcihuZXdUcmFuc2Zvcm1lcjogVGVtcGxhdGVUcmFuc2Zvcm1lcik6IFRlbXBsYXRlVHJhbnNmb3JtZXIge1xuICAgICAgICBjb25zdCBvbGRUcmFuc2Zvcm1lciA9IFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lcjtcbiAgICAgICAgVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyID0gbmV3VHJhbnNmb3JtZXI7XG4gICAgICAgIHJldHVybiBvbGRUcmFuc2Zvcm1lcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IGJ1aWx0LWluIHRyYW5zZm9ybWVyIG5hbWUgbGlzdC5cbiAgICAgKiBAamEg57WE44G/6L6844G/44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5ZCN56ew5LiA6Kan44KS5Y+W5b6XXG4gICAgICpcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgbmFtZSBsaXN0LlxuICAgICAqICAtIGBqYWAg5ZCN56ew5LiA6Kan44KS6L+U5Y20XG4gICAgICovXG4gICAgc3RhdGljIGdldCBidWlsdGlucygpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhfYnVpbHRpbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYnVpbHQtaW4gdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqIEBqYSDntYTjgb/ovrzjgb/jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogIC0gYGVuYCB0cmFuc2Zvcm1lciBvYmplY3QgbmFtZS5cbiAgICAgKiAgLSBgamFgIOWkieaPm+OCquODluOCuOOCp+OCr+ODiOOBruWQjeWJjeOCkuaMh+Wumi5cbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgdHJhbnNmb3JtZXIgb2JqZWN0LlxuICAgICAqICAtIGBqYWAg5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44KS6L+U5Y20XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZXRCdWl0aW5UcmFuc2Zvcm1lcihuYW1lOiBzdHJpbmcpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF9idWlsdGluc1tuYW1lXTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyB1bmVzY2FwZUhUTUwsIGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBKU1QsXG4gICAgVGVtcGxhdGVDb21waWxlT3B0aW9ucyxcbiAgICBUZW1wbGF0ZUVuZ2luZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXRlbXBsYXRlJztcbmltcG9ydCB7IExvYWRUZW1wbGF0ZU9wdGlvbnMsIGxvYWRUZW1wbGF0ZVNvdXJjZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmV4cG9ydCB7IGNsZWFyVGVtcGxhdGVDYWNoZSB9IGZyb20gJ0BjZHAvd2ViLXV0aWxzJztcbmltcG9ydCB7XG4gICAgQ29tcGlsZWRUZW1wbGF0ZSxcbiAgICBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zLFxuICAgIFRlbXBsYXRlQnJpZGdlLFxufSBmcm9tICcuL2JyaWRnZSc7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IHR5cGUgbGlzdC5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpfmmYLjgavmjIflrprlj6/og73jgarlnovkuIDopqdcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Qge1xuICAgIGVuZ2luZTogSlNUO1xuICAgIGJyaWRnZTogQ29tcGlsZWRUZW1wbGF0ZTtcbn1cblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBkZWZpbml0aW9ucy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpfmmYLjgavmjIflrprlj6/og73jgarlnovmjIflrprlrZBcbiAqL1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVRdWVyeVR5cGVzID0ga2V5b2YgVGVtcGxhdGVRdWVyeVR5cGVMaXN0O1xuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSBvcHRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+OCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlPcHRpb25zPFQgZXh0ZW5kcyBUZW1wbGF0ZVF1ZXJ5VHlwZXM+IGV4dGVuZHMgTG9hZFRlbXBsYXRlT3B0aW9ucywgVGVtcGxhdGVDb21waWxlT3B0aW9ucywgVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogYGVuZ2luZWAgLyAnYnJpZGdlJ1xuICAgICAqL1xuICAgIHR5cGU/OiBUO1xuICAgIC8qKlxuICAgICAqIEBlbiB0ZW1wbGF0ZSBsb2FkIGNhbGxiYWNrLiBgYnJpZGdlYCBtb2RlIGFsbG93cyBsb2NhbGl6YXRpb24gaGVyZS5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI6Kqt44G/6L6844G/44Kz44O844Or44OQ44OD44KvLiBgYnJpZGdlYCDjg6Ljg7zjg4njgafjga/jgZPjgZPjgafjg63jg7zjgqvjg6njgqTjgrrjgYzlj6/og71cbiAgICAgKi9cbiAgICBjYWxsYmFjaz86IChzcmM6IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQpID0+IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBQcm9taXNlPHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQ+O1xufVxuXG4vKipcbiAqIEBlbiBHZXQgY29tcGlsZWQgSmF2YVNjcmlwdCB0ZW1wbGF0ZS5cbiAqIEBqYSDjgrPjg7Pjg5HjgqTjg6vmuIjjgb8gSmF2YVNjcmlwdCDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpdcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgVGhlIHNlbGVjdG9yIHN0cmluZyBvZiBET00uXG4gKiAgLSBgamFgIERPTSDjgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHF1ZXJ5IG9wdGlvbnNcbiAqICAtIGBqYWAg44Kv44Ko44Oq44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRUZW1wbGF0ZTxUIGV4dGVuZHMgVGVtcGxhdGVRdWVyeVR5cGVzID0gJ2VuZ2luZSc+KFxuICAgIHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM/OiBUZW1wbGF0ZVF1ZXJ5T3B0aW9uczxUPlxuKTogUHJvbWlzZTxUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3RbVF0+IHtcbiAgICBjb25zdCB7IHR5cGUsIHVybCwgbm9DYWNoZSwgY2FsbGJhY2sgfSA9IE9iamVjdC5hc3NpZ24oeyB0eXBlOiAnZW5naW5lJywgbm9DYWNoZTogZmFsc2UgfSwgb3B0aW9ucyk7XG4gICAgbGV0IHNyYyA9IGF3YWl0IGxvYWRUZW1wbGF0ZVNvdXJjZShzZWxlY3RvciwgeyB1cmwsIG5vQ2FjaGUgfSk7XG4gICAgaWYgKCFzcmMpIHtcbiAgICAgICAgdGhyb3cgbmV3IFVSSUVycm9yKGBjYW5ub3Qgc3BlY2lmaWVkIHRlbXBsYXRlIHJlc291cmNlLiB7IHNlbGVjdG9yOiAke3NlbGVjdG9yfSwgIHVybDogJHt1cmx9IH1gKTtcbiAgICB9XG5cbiAgICBpZiAoaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgc3JjID0gYXdhaXQgY2FsbGJhY2soc3JjKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnZW5naW5lJzpcbiAgICAgICAgICAgIHJldHVybiBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKHNyYyBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB1bmVzY2FwZUhUTUwoc3JjLmlubmVySFRNTCkgOiBzcmMsIG9wdGlvbnMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgY2FzZSAnYnJpZGdlJzpcbiAgICAgICAgICAgIHJldHVybiBUZW1wbGF0ZUJyaWRnZS5jb21waWxlKHNyYywgb3B0aW9ucykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgW3R5cGU6ICR7dHlwZX1dIGlzIHVua25vd24uYCk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQWFBO0FBQ0EsTUFBTSxTQUFTLEdBQXdDO0lBQ25ELFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQztJQUNoRSxRQUFRLEVBQUUseUJBQXlCLEVBQUU7Q0FDeEMsQ0FBQztBQWdDRjs7O0FBR0c7QUFDSCxNQUFhLGNBQWMsQ0FBQTs7QUFFZixJQUFBLE9BQU8sWUFBWSxHQUFHLFNBQVMsQ0FBQyxRQUFR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