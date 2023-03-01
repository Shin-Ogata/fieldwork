/*!
 * @cdp/template 0.9.16
 *   HTML template library
 */

import { html, directives } from '@cdp/extension-template';
export * from '@cdp/extension-template';
import { createMustacheTransformer, createStampinoTransformer } from '@cdp/extension-template-bridge';
export * from '@cdp/extension-template-bridge';
import { TemplateEngine } from '@cdp/core-template';
export { TemplateEngine } from '@cdp/core-template';
import { unescapeHTML } from '@cdp/core-utils';
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
    const { type, url, noCache } = Object.assign({ type: 'engine', noCache: false }, options);
    const src = await loadTemplateSource(selector, { url, noCache });
    if (!src) {
        throw new URIError(`cannot specified template resource. { selector: ${selector},  url: ${url} }`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUubWpzIiwic291cmNlcyI6WyJicmlkZ2UudHMiLCJsb2FkZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgICBUZW1wbGF0ZVJlc3VsdCxcbiAgICBTVkdUZW1wbGF0ZVJlc3VsdCxcbiAgICBodG1sLFxuICAgIGRpcmVjdGl2ZXMsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVUcmFuc2Zvcm1lcixcbiAgICBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyLFxuICAgIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIsXG59IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZSc7XG5pbXBvcnQgeyBQbGFpbk9iamVjdCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgYnVpbHRpbiB0cmFuc2Zvcm1lcnMgKGRlZmF1bHQ6IG11c3RhY2hlKS4gKi9cbmNvbnN0IF9idWlsdGlucyA9IHtcbiAgICBtdXN0YWNoZTogY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihodG1sLCBkaXJlY3RpdmVzLnVuc2FmZUhUTUwpLFxuICAgIHN0YW1waW5vOiBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyKCksXG59O1xuXG4vKipcbiAqIEBlbiBDb21waWxlZCBKYXZhU2NyaXB0IHRlbXBsYXRlIGludGVyZmFjZVxuICogQGphIOOCs+ODs+ODkeOCpOODq+a4iOOBv+ODhuODs+ODl+ODrOODvOODiOagvOe0jeOCpOODs+OCv+ODvOODleOCp+OCpOOCuVxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVkVGVtcGxhdGUge1xuICAgIC8qKlxuICAgICAqIEBlbiBTb3VyY2UgdGVtcGxhdGUgc3RyaW5nXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOaWh+Wtl+WIl1xuICAgICAqL1xuICAgIHNvdXJjZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW1RlbXBsYXRlUmVzdWx0XV0gdGhhdCBhcHBsaWVkIGdpdmVuIHBhcmFtZXRlcihzKS5cbiAgICAgKiBAamEg44OR44Op44Oh44O844K/44KS6YGp55So44GXIFtbVGVtcGxhdGVSZXN1bHRdXSDjgbjlpInmj5tcbiAgICAgKlxuICAgICAqIEBwYXJhbSB2aWV3XG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBwYXJhbWV0ZXJzIGZvciBzb3VyY2UuXG4gICAgICogIC0gYGphYCDjg4bjg7Pjg5fjg6zjg7zjg4jjg5Hjg6njg6Hjg7zjgr9cbiAgICAgKi9cbiAgICAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdDtcbn1cblxuLyoqXG4gKiBAZW4gW1tUZW1wbGF0ZUJyaWRnZV1dIGNvbXBpbGUgb3B0aW9uc1xuICogQGphIFtbVGVtcGxhdGVCcmlkZ2VdXSDjgrPjg7Pjg5HjgqTjg6vjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0cmFuc2Zvcm1lcj86IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG59XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIGJyaWRnZSBmb3Igb3RoZXIgdGVtcGxhdGUgZW5naW5lIHNvdXJjZS5cbiAqIEBqYSDku5bjga7jg4bjg7Pjg5fjg6zjg7zjg4jjgqjjg7Pjgrjjg7Pjga7lhaXlipvjgpLlpInmj5vjgZnjgovjg4bjg7Pjg5fjg6zjg7zjg4jjg5bjg6rjg4Pjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIFRlbXBsYXRlQnJpZGdlIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBzdGF0aWMgX3RyYW5zZm9ybWVyID0gX2J1aWx0aW5zLm11c3RhY2hlO1xuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHVibGljIHN0YXRpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBbW0NvbXBpbGVkVGVtcGxhdGVdXSBmcm9tIHRlbXBsYXRlIHNvdXJjZS5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5paH5a2X5YiX44GL44KJIFtbQ29tcGlsZWRUZW1wbGF0ZV1dIOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIHRlbXBsYXRlXG4gICAgICogIC0gYGVuYCB0ZW1wbGF0ZSBzb3VyY2Ugc3RyaW5nIC8gdGVtcGxhdGUgZWxlbWVudFxuICAgICAqICAtIGBqYWAg44OG44Oz44OX44Os44O844OI5paH5a2X5YiXIC8g44OG44Oz44OX44Os44O844OI44Ko44Os44Oh44Oz44OIXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNvbXBpbGUgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kz44Oz44OR44Kk44Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjb21waWxlKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVCcmlkZ2VDb21waWxlT3B0aW9ucyk6IENvbXBpbGVkVGVtcGxhdGUge1xuICAgICAgICBjb25zdCB7IHRyYW5zZm9ybWVyIH0gPSBPYmplY3QuYXNzaWduKHsgdHJhbnNmb3JtZXI6IFRlbXBsYXRlQnJpZGdlLl90cmFuc2Zvcm1lciB9LCBvcHRpb25zKTtcbiAgICAgICAgY29uc3QgZW5naW5lID0gdHJhbnNmb3JtZXIodGVtcGxhdGUpO1xuICAgICAgICBjb25zdCBqc3QgPSAodmlldz86IFBsYWluT2JqZWN0KTogVGVtcGxhdGVSZXN1bHQgfCBTVkdUZW1wbGF0ZVJlc3VsdCA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZW5naW5lKHZpZXcpO1xuICAgICAgICB9O1xuICAgICAgICBqc3Quc291cmNlID0gdGVtcGxhdGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdGVtcGxhdGUuaW5uZXJIVE1MIDogdGVtcGxhdGU7XG4gICAgICAgIHJldHVybiBqc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVwZGF0ZSBkZWZhdWx0IHRyYW5zZm9ybWVyIG9iamVjdC5cbiAgICAgKiBAamEg5pei5a6a44Gu5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5pu05pawXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3VHJhbnNmb3JtZXJcbiAgICAgKiAgLSBgZW5gIG5ldyB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDmlrDjgZfjgYTlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLmjIflrpouXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIG9sZCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDku6XliY3jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHNldFRyYW5zZm9ybWVyKG5ld1RyYW5zZm9ybWVyOiBUZW1wbGF0ZVRyYW5zZm9ybWVyKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgICAgIGNvbnN0IG9sZFRyYW5zZm9ybWVyID0gVGVtcGxhdGVCcmlkZ2UuX3RyYW5zZm9ybWVyO1xuICAgICAgICBUZW1wbGF0ZUJyaWRnZS5fdHJhbnNmb3JtZXIgPSBuZXdUcmFuc2Zvcm1lcjtcbiAgICAgICAgcmV0dXJuIG9sZFRyYW5zZm9ybWVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgYnVpbHQtaW4gdHJhbnNmb3JtZXIgbmFtZSBsaXN0LlxuICAgICAqIEBqYSDntYTjgb/ovrzjgb/jga7lpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjga7lkI3np7DkuIDopqfjgpLlj5blvpdcbiAgICAgKlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBuYW1lIGxpc3QuXG4gICAgICogIC0gYGphYCDlkI3np7DkuIDopqfjgpLov5TljbRcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0IGJ1aWx0aW5zKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKF9idWlsdGlucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBidWlsdC1pbiB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogQGphIOe1hOOBv+i+vOOBv+OBruWkieaPm+OCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqXG4gICAgICogQHBhcmFtIG5hbWVcbiAgICAgKiAgLSBgZW5gIHRyYW5zZm9ybWVyIG9iamVjdCBuYW1lLlxuICAgICAqICAtIGBqYWAg5aSJ5o+b44Kq44OW44K444Kn44Kv44OI44Gu5ZCN5YmN44KS5oyH5a6aLlxuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCB0cmFuc2Zvcm1lciBvYmplY3QuXG4gICAgICogIC0gYGphYCDlpInmj5vjgqrjg5bjgrjjgqfjgq/jg4jjgpLov5TljbRcbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIGdldEJ1aXRpblRyYW5zZm9ybWVyKG5hbWU6IHN0cmluZyk6IFRlbXBsYXRlVHJhbnNmb3JtZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX2J1aWx0aW5zW25hbWVdO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHVuZXNjYXBlSFRNTCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIEpTVCxcbiAgICBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLFxuICAgIFRlbXBsYXRlRW5naW5lLFxufSBmcm9tICdAY2RwL2NvcmUtdGVtcGxhdGUnO1xuaW1wb3J0IHsgTG9hZFRlbXBsYXRlT3B0aW9ucywgbG9hZFRlbXBsYXRlU291cmNlIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuZXhwb3J0IHsgY2xlYXJUZW1wbGF0ZUNhY2hlIH0gZnJvbSAnQGNkcC93ZWItdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBDb21waWxlZFRlbXBsYXRlLFxuICAgIFRlbXBsYXRlQnJpZGdlQ29tcGlsZU9wdGlvbnMsXG4gICAgVGVtcGxhdGVCcmlkZ2UsXG59IGZyb20gJy4vYnJpZGdlJztcblxuLyoqXG4gKiBAZW4gVGVtcGxhdGUgcXVlcnkgdHlwZSBsaXN0LlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+S4gOimp1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlUXVlcnlUeXBlTGlzdCB7XG4gICAgZW5naW5lOiBKU1Q7XG4gICAgYnJpZGdlOiBDb21waWxlZFRlbXBsYXRlO1xufVxuXG4vKipcbiAqIEBlbiBUZW1wbGF0ZSBxdWVyeSB0eXBlIGRlZmluaXRpb25zLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+aZguOBq+aMh+WumuWPr+iDveOBquWei+aMh+WumuWtkFxuICovXG5leHBvcnQgdHlwZSBUZW1wbGF0ZVF1ZXJ5VHlwZXMgPSBrZXlvZiBUZW1wbGF0ZVF1ZXJ5VHlwZUxpc3Q7XG5cbi8qKlxuICogQGVuIFRlbXBsYXRlIHF1ZXJ5IG9wdGlvbnMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGVtcGxhdGVRdWVyeU9wdGlvbnM8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcz4gZXh0ZW5kcyBMb2FkVGVtcGxhdGVPcHRpb25zLCBUZW1wbGF0ZUNvbXBpbGVPcHRpb25zLCBUZW1wbGF0ZUJyaWRnZUNvbXBpbGVPcHRpb25zIHtcbiAgICB0eXBlPzogVDtcbn1cblxuLyoqXG4gKiBAZW4gR2V0IGNvbXBpbGVkIEphdmFTY3JpcHQgdGVtcGxhdGUuXG4gKiBAamEg44Kz44Oz44OR44Kk44Or5riI44G/IEphdmFTY3JpcHQg44OG44Oz44OX44Os44O844OI5Y+W5b6XXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBxdWVyeSBvcHRpb25zXG4gKiAgLSBgamFgIOOCr+OCqOODquOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGVtcGxhdGU8VCBleHRlbmRzIFRlbXBsYXRlUXVlcnlUeXBlcyA9ICdlbmdpbmUnPihcbiAgICBzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogVGVtcGxhdGVRdWVyeU9wdGlvbnM8VD5cbik6IFByb21pc2U8VGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdPiB7XG4gICAgY29uc3QgeyB0eXBlLCB1cmwsIG5vQ2FjaGUgfSA9IE9iamVjdC5hc3NpZ24oeyB0eXBlOiAnZW5naW5lJywgbm9DYWNoZTogZmFsc2UgfSwgb3B0aW9ucyk7XG4gICAgY29uc3Qgc3JjID0gYXdhaXQgbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCB7IHVybCwgbm9DYWNoZSB9KTtcbiAgICBpZiAoIXNyYykge1xuICAgICAgICB0aHJvdyBuZXcgVVJJRXJyb3IoYGNhbm5vdCBzcGVjaWZpZWQgdGVtcGxhdGUgcmVzb3VyY2UuIHsgc2VsZWN0b3I6ICR7c2VsZWN0b3J9LCAgdXJsOiAke3VybH0gfWApO1xuICAgIH1cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnZW5naW5lJzpcbiAgICAgICAgICAgIHJldHVybiBUZW1wbGF0ZUVuZ2luZS5jb21waWxlKHNyYyBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB1bmVzY2FwZUhUTUwoc3JjLmlubmVySFRNTCkgOiBzcmMsIG9wdGlvbnMpIGFzIFRlbXBsYXRlUXVlcnlUeXBlTGlzdFtUXTtcbiAgICAgICAgY2FzZSAnYnJpZGdlJzpcbiAgICAgICAgICAgIHJldHVybiBUZW1wbGF0ZUJyaWRnZS5jb21waWxlKHNyYywgb3B0aW9ucykgYXMgVGVtcGxhdGVRdWVyeVR5cGVMaXN0W1RdO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgW3R5cGU6ICR7dHlwZX1dIGlzIHVua25vd24uYCk7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQWFBO0FBQ0EsTUFBTSxTQUFTLEdBQUc7SUFDZCxRQUFRLEVBQUUseUJBQXlCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUM7SUFDaEUsUUFBUSxFQUFFLHlCQUF5QixFQUFFO0NBQ3hDLENBQUM7QUFnQ0Y7OztBQUdHO01BQ1UsY0FBYyxDQUFBOztBQUVmLElBQUEsT0FBTyxZQUFZLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQzs7O0FBS2pEOzs7Ozs7Ozs7O0FBVUc7QUFDSSxJQUFBLE9BQU8sT0FBTyxDQUFDLFFBQXNDLEVBQUUsT0FBc0MsRUFBQTtBQUNoRyxRQUFBLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM3RixRQUFBLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNyQyxRQUFBLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBa0IsS0FBd0M7QUFDbkUsWUFBQSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN4QixTQUFDLENBQUM7QUFDRixRQUFBLEdBQUcsQ0FBQyxNQUFNLEdBQUcsUUFBUSxZQUFZLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0FBQ3JGLFFBQUEsT0FBTyxHQUFHLENBQUM7S0FDZDtBQUVEOzs7Ozs7Ozs7O0FBVUc7SUFDSSxPQUFPLGNBQWMsQ0FBQyxjQUFtQyxFQUFBO0FBQzVELFFBQUEsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQztBQUNuRCxRQUFBLGNBQWMsQ0FBQyxZQUFZLEdBQUcsY0FBYyxDQUFDO0FBQzdDLFFBQUEsT0FBTyxjQUFjLENBQUM7S0FDekI7QUFFRDs7Ozs7OztBQU9HO0FBQ0gsSUFBQSxXQUFXLFFBQVEsR0FBQTtBQUNmLFFBQUEsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ2pDO0FBRUQ7Ozs7Ozs7Ozs7QUFVRztJQUNJLE9BQU8sb0JBQW9CLENBQUMsSUFBWSxFQUFBO0FBQzNDLFFBQUEsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDMUI7OztBQ3RGTDs7Ozs7Ozs7OztBQVVHO0FBQ0ksZUFBZSxXQUFXLENBQzdCLFFBQWdCLEVBQUUsT0FBaUMsRUFBQTtJQUVuRCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDMUYsSUFBQSxNQUFNLEdBQUcsR0FBRyxNQUFNLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ2pFLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDTixNQUFNLElBQUksUUFBUSxDQUFDLENBQUEsZ0RBQUEsRUFBbUQsUUFBUSxDQUFXLFFBQUEsRUFBQSxHQUFHLENBQUksRUFBQSxDQUFBLENBQUMsQ0FBQztBQUNyRyxLQUFBO0FBQ0QsSUFBQSxRQUFRLElBQUk7QUFDUixRQUFBLEtBQUssUUFBUTtZQUNULE9BQU8sY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFlBQVksbUJBQW1CLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLEVBQUUsT0FBTyxDQUE2QixDQUFDO0FBQy9JLFFBQUEsS0FBSyxRQUFRO1lBQ1QsT0FBTyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQTZCLENBQUM7QUFDNUUsUUFBQTtBQUNJLFlBQUEsTUFBTSxJQUFJLFNBQVMsQ0FBQyxVQUFVLElBQUksQ0FBQSxhQUFBLENBQWUsQ0FBQyxDQUFDO0FBQzFELEtBQUE7QUFDTDs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvdGVtcGxhdGUvIn0=