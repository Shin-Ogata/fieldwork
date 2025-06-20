/*!
 * @cdp/web-utils 0.9.19
 *   web domain utilities
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/ajax')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/ajax'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, ajax) { 'use strict';

    /** @internal */ const location = coreUtils.safe(globalThis.location);
    /** @internal */ const document = coreUtils.safe(globalThis.document);
    /** @internal */ const requestAnimationFrame = coreUtils.safe(globalThis.requestAnimationFrame);
    /** @internal */ const requestIdleCallback = coreUtils.safe(globalThis.requestIdleCallback);

    /**
     * @en Get the directory to which `url` belongs.
     * @ja 指定 `url` の所属するディレクトリを取得
     *
     * @param url
     *  - `en` target URL
     *  - `ja` 対象の URL
     */
    const getWebDirectory = (url) => {
        const match = /^(([^?#]+)\/)([\S]*)?$/.exec(url);
        return match?.[1] ?? '';
    };
    /**
     * @en Accsessor for Web root location <br>
     *     Only the browser environment will be an allocating place in index.html, and becomes effective.
     * @ja Web root location へのアクセス <br>
     *     index.html の配置場所となり、ブラウザ環境のみ有効となる.
     */
    const webRoot = getWebDirectory(document.querySelector('base')?.getAttribute('href') ?? location.href);
    /**
     * @en Convert to an absolute url string if given a relative path. <br>
     *     If you want to access to Assets and in spite of the script location, the function is available.
     * @ja 相対パスが指定されている場合は、絶対URL文字列に変換 <br>
     *     js の配置に依存することなく `assets` アクセスしたいときに使用する.
     *
     * @see https://stackoverflow.com/questions/2188218/relative-paths-in-javascript-in-an-external-file
     *
     * @example <br>
     *
     * ```ts
     *  console.log(toUrl('/res/data/collection.json'));
     *  // "http://localhost:8080/app/res/data/collection.json"
     * ```
     *
     * @param seed
     *  - `en` set relative path from {@link webRoot}.
     *  - `ja` {@link webRoot} からの相対パスを指定
     */
    const toUrl = (seed) => {
        if (seed?.includes('://')) {
            return seed;
        }
        else if (null != seed?.[0]) {
            return ('/' === seed[0]) ? webRoot + seed.slice(1) : webRoot + seed;
        }
        else {
            return webRoot;
        }
    };

    /**
     * @en Get the timing that does not block the rendering process etc.
     * @ja レンダリング処理等をブロックしないタイミングを取得
     *
     * @example <br>
     *
     * ```ts
     *  await waitFrame();
     * ```
     *
     * @param frameCount
     *  - `en` wait frame count.
     *  - `ja` 処理待ちを行うフレーム数
     * @param executor
     *  - `en` wait frame executor.
     *  - `ja` 処理待ちを行う実行関数
     */
    async function waitFrame(frameCount = 1, executor = requestAnimationFrame) {
        while (frameCount-- > 0) {
            await new Promise(executor);
        }
    }
    /**
     * @en Wait until the current thread is idle.
     * @ja 現在のスレッドがアイドル状態になるまで待機
     *
     * @example <br>
     *
     * ```ts
     *  await waitIdle();
     * ```
     *
     */
    function waitIdle(options) {
        return new Promise(resolve => requestIdleCallback(() => resolve(), options));
    }

    /** @internal */ let _mapProvider = {};
    /** @internal */ let _mapSource = {};
    /** @internal */
    function queryTemplateSource(selector, provider, noCache) {
        const { fragment, html } = provider ?? {};
        const key = `${selector}${html ? `::${html}` : ''}`;
        if (_mapSource[key]) {
            return _mapSource[key];
        }
        const context = fragment ?? document;
        const target = context.querySelector(selector);
        const source = target instanceof HTMLTemplateElement ? target : target?.innerHTML;
        !noCache && source && (_mapSource[key] = source);
        return source;
    }
    /** @internal */
    async function queryTemplateProvider(url, noCache) {
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
            !noCache && fragment && (_mapProvider[url] = provider);
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
     * @en Load template source.
     * @ja テンプレートソースのロード
     *
     * @param selector
     *  - `en` The selector string of DOM.
     *  - `ja` DOM セレクタ文字列
     * @param options
     *  - `en` load options
     *  - `ja` ロードオプション
     */
    async function loadTemplateSource(selector, options) {
        const { url, noCache } = Object.assign({ noCache: false }, options);
        const provider = await queryTemplateProvider(url, noCache);
        return queryTemplateSource(selector, provider, noCache);
    }
    //__________________________________________________________________________________________________//
    /**
     * @en Forced conversion to HTML string.
     * @ja HTML 文字列に強制変換
     *
     * @param src
     *  - `en` `HTMLTemplateElement` instance or HTML string
     *  - `ja` `HTMLTemplateElement` インスタンスまたは HTML 文字列
     */
    function toTemplateString(src) {
        return src instanceof HTMLTemplateElement ? src.innerHTML : src;
    }
    /**
     * @en Forced conversion to `HTMLTemplateElement`. (If it is a Node, create a clone with `cloneNode(true)`)
     * @ja `HTMLTemplateElement` に強制変換 (Nodeである場合には `cloneNode(true)` による複製を作成)
     *
     * @param src
     *  - `en` `HTMLTemplateElement` instance or HTML string
     *  - `ja` `HTMLTemplateElement` インスタンスまたは HTML 文字列
     */
    function toTemplateElement(src) {
        const from = (str) => {
            const template = document.createElement('template');
            template.innerHTML = str;
            return template;
        };
        return 'string' === typeof src ? from(src) : src?.cloneNode(true);
    }

    exports.clearTemplateCache = clearTemplateCache;
    exports.getWebDirectory = getWebDirectory;
    exports.loadTemplateSource = loadTemplateSource;
    exports.toTemplateElement = toTemplateElement;
    exports.toTemplateString = toTemplateString;
    exports.toUrl = toUrl;
    exports.waitFrame = waitFrame;
    exports.waitIdle = waitIdle;
    exports.webRoot = webRoot;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXV0aWxzLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ3ZWItcm9vdC50cyIsIndhaXQudHMiLCJ0ZW1wbGF0ZS1sb2FkZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGxvY2F0aW9uICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5sb2NhdGlvbik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCAgICAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuZG9jdW1lbnQpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gc2FmZShnbG9iYWxUaGlzLnJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCByZXF1ZXN0SWRsZUNhbGxiYWNrICAgPSBzYWZlKGdsb2JhbFRoaXMucmVxdWVzdElkbGVDYWxsYmFjayk7XG4iLCJpbXBvcnQgeyBsb2NhdGlvbiwgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGlyZWN0b3J5IHRvIHdoaWNoIGB1cmxgIGJlbG9uZ3MuXG4gKiBAamEg5oyH5a6aIGB1cmxgIOOBruaJgOWxnuOBmeOCi+ODh+OCo+ODrOOCr+ODiOODquOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgdGFyZ2V0IFVSTFxuICogIC0gYGphYCDlr77osaHjga4gVVJMXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRXZWJEaXJlY3RvcnkgPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL14oKFtePyNdKylcXC8pKFtcXFNdKik/JC8uZXhlYyh1cmwpO1xuICAgIHJldHVybiBtYXRjaD8uWzFdID8/ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQWNjc2Vzc29yIGZvciBXZWIgcm9vdCBsb2NhdGlvbiA8YnI+XG4gKiAgICAgT25seSB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCB3aWxsIGJlIGFuIGFsbG9jYXRpbmcgcGxhY2UgaW4gaW5kZXguaHRtbCwgYW5kIGJlY29tZXMgZWZmZWN0aXZlLlxuICogQGphIFdlYiByb290IGxvY2F0aW9uIOOBuOOBruOCouOCr+OCu+OCuSA8YnI+XG4gKiAgICAgaW5kZXguaHRtbCDjga7phY3nva7loLTmiYDjgajjgarjgorjgIHjg5bjg6njgqbjgrbnkrDlooPjga7jgb/mnInlirnjgajjgarjgosuXG4gKi9cbmV4cG9ydCBjb25zdCB3ZWJSb290OiBzdHJpbmcgPSBnZXRXZWJEaXJlY3RvcnkoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYmFzZScpPy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSA/PyBsb2NhdGlvbi5ocmVmKTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBhbiBhYnNvbHV0ZSB1cmwgc3RyaW5nIGlmIGdpdmVuIGEgcmVsYXRpdmUgcGF0aC4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++44OR44K544GM5oyH5a6a44GV44KM44Gm44GE44KL5aC05ZCI44Gv44CB57W25a++VVJM5paH5a2X5YiX44Gr5aSJ5o+bIDxicj5cbiAqICAgICBqcyDjga7phY3nva7jgavkvp3lrZjjgZnjgovjgZPjgajjgarjgY8gYGFzc2V0c2Ag44Ki44Kv44K744K544GX44Gf44GE44Go44GN44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjE4ODIxOC9yZWxhdGl2ZS1wYXRocy1pbi1qYXZhc2NyaXB0LWluLWFuLWV4dGVybmFsLWZpbGVcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBjb25zb2xlLmxvZyh0b1VybCgnL3Jlcy9kYXRhL2NvbGxlY3Rpb24uanNvbicpKTtcbiAqICAvLyBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcHAvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIHNldCByZWxhdGl2ZSBwYXRoIGZyb20ge0BsaW5rIHdlYlJvb3R9LlxuICogIC0gYGphYCB7QGxpbmsgd2ViUm9vdH0g44GL44KJ44Gu55u45a++44OR44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1VybCA9IChzZWVkOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChzZWVkPy5pbmNsdWRlcygnOi8vJykpIHtcbiAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgfSBlbHNlIGlmIChudWxsICE9IHNlZWQ/LlswXSkge1xuICAgICAgICByZXR1cm4gKCcvJyA9PT0gc2VlZFswXSkgPyB3ZWJSb290ICsgc2VlZC5zbGljZSgxKSA6IHdlYlJvb3QgKyBzZWVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB3ZWJSb290O1xuICAgIH1cbn07XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsIHJlcXVlc3RJZGxlQ2FsbGJhY2sgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdGltaW5nIHRoYXQgZG9lcyBub3QgYmxvY2sgdGhlIHJlbmRlcmluZyBwcm9jZXNzIGV0Yy5cbiAqIEBqYSDjg6zjg7Pjg4Djg6rjg7PjgrDlh6bnkIbnrYnjgpLjg5bjg63jg4Pjgq/jgZfjgarjgYTjgr/jgqTjg5/jg7PjgrDjgpLlj5blvpdcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBhd2FpdCB3YWl0RnJhbWUoKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBmcmFtZUNvdW50XG4gKiAgLSBgZW5gIHdhaXQgZnJhbWUgY291bnQuXG4gKiAgLSBgamFgIOWHpueQhuW+heOBoeOCkuihjOOBhuODleODrOODvOODoOaVsFxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHdhaXQgZnJhbWUgZXhlY3V0b3IuXG4gKiAgLSBgamFgIOWHpueQhuW+heOBoeOCkuihjOOBhuWun+ihjOmWouaVsFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd2FpdEZyYW1lKGZyYW1lQ291bnQgPSAxLCBleGVjdXRvcjogVW5rbm93bkZ1bmN0aW9uID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgd2hpbGUgKGZyYW1lQ291bnQtLSA+IDApIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oZXhlY3V0b3IpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gV2FpdCB1bnRpbCB0aGUgY3VycmVudCB0aHJlYWQgaXMgaWRsZS5cbiAqIEBqYSDnj77lnKjjga7jgrnjg6zjg4Pjg4njgYzjgqLjgqTjg4njg6vnirbmhYvjgavjgarjgovjgb7jgaflvoXmqZ9cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBhd2FpdCB3YWl0SWRsZSgpO1xuICogYGBgXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2FpdElkbGUob3B0aW9ucz86IElkbGVSZXF1ZXN0T3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHJlcXVlc3RJZGxlQ2FsbGJhY2soKCkgPT4gcmVzb2x2ZSgpLCBvcHRpb25zKSk7XG59XG4iLCJpbXBvcnQgeyB0eXBlIEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zLCByZXF1ZXN0IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgVGVtcGxhdGVQcm92aWRlciB7XG4gICAgZnJhZ21lbnQ6IERvY3VtZW50RnJhZ21lbnQ7XG4gICAgaHRtbDogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG50eXBlIFRlbXBsYXRlUHJvdmlkZXJNYXAgPSBSZWNvcmQ8c3RyaW5nLCBUZW1wbGF0ZVByb3ZpZGVyPjtcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBUZW1wbGF0ZVNvdXJjZU1hcCA9IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQ+O1xuXG4vKiogQGludGVybmFsICovIGxldCBfbWFwUHJvdmlkZXI6IFRlbXBsYXRlUHJvdmlkZXJNYXAgPSB7fTtcbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF9tYXBTb3VyY2U6IFRlbXBsYXRlU291cmNlTWFwID0ge307XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIHF1ZXJ5VGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3I6IHN0cmluZywgcHJvdmlkZXI6IFRlbXBsYXRlUHJvdmlkZXIgfCBudWxsLCBub0NhY2hlOiBib29sZWFuKTogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgeyBmcmFnbWVudCwgaHRtbCB9ID0gcHJvdmlkZXIgPz8ge307XG4gICAgY29uc3Qga2V5ID0gYCR7c2VsZWN0b3J9JHtodG1sID8gYDo6JHtodG1sfWAgOiAnJ31gO1xuICAgIGlmIChfbWFwU291cmNlW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIF9tYXBTb3VyY2Vba2V5XTtcbiAgICB9XG4gICAgY29uc3QgY29udGV4dCA9IGZyYWdtZW50ID8/IGRvY3VtZW50O1xuICAgIGNvbnN0IHRhcmdldCA9IGNvbnRleHQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgY29uc3Qgc291cmNlID0gdGFyZ2V0IGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRhcmdldCA6IHRhcmdldD8uaW5uZXJIVE1MO1xuICAgICFub0NhY2hlICYmIHNvdXJjZSAmJiAoX21hcFNvdXJjZVtrZXldID0gc291cmNlKTtcbiAgICByZXR1cm4gc291cmNlO1xufVxuXG4vKiogQGludGVybmFsICovXG5hc3luYyBmdW5jdGlvbiBxdWVyeVRlbXBsYXRlUHJvdmlkZXIodXJsOiBzdHJpbmcgfCB1bmRlZmluZWQsIG5vQ2FjaGU6IGJvb2xlYW4pOiBQcm9taXNlPFRlbXBsYXRlUHJvdmlkZXIgfCBudWxsPiB7XG4gICAgaWYgKCF1cmwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChfbWFwUHJvdmlkZXJbdXJsXSkge1xuICAgICAgICByZXR1cm4gX21hcFByb3ZpZGVyW3VybF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaHRtbCA9IGF3YWl0IHJlcXVlc3QudGV4dCh1cmwpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGVtcGxhdGUuY29udGVudDtcbiAgICAgICAgY29uc3QgcHJvdmlkZXIgPSB7IGZyYWdtZW50LCBodG1sOiBodG1sLnJlcGxhY2UoL1xccy9nbSwgJycpIH07XG4gICAgICAgICFub0NhY2hlICYmIGZyYWdtZW50ICYmIChfbWFwUHJvdmlkZXJbdXJsXSA9IHByb3ZpZGVyKTtcbiAgICAgICAgcmV0dXJuIHByb3ZpZGVyO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIExvYWQgdGVtcGxhdGUgb3B0aW9ucy5cbiAqIEBqYSDjg63jg7zjg4njg4bjg7Pjg5fjg6zjg7zjg4jjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2FkVGVtcGxhdGVPcHRpb25zIGV4dGVuZHMgQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMge1xuICAgIC8qKlxuICAgICAqIEBlbiBUaGUgdGVtcGxhdGUgYWNxdWlzaXRpb24gVVJMLiBpZiBub3Qgc3BlY2lmaWVkIHRoZSB0ZW1wbGF0ZSB3aWxsIGJlIHNlYXJjaGVkIGZyb20gYGRvY3VtZW50YC5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI5Y+W5b6X5YWIIFVSTC4g5oyH5a6a44GM44Gq44GE5aC05ZCI44GvIGBkb2N1bWVudGAg44GL44KJ5qSc57SiXG4gICAgICovXG4gICAgdXJsPzogc3RyaW5nO1xuICAgIC8qKlxuICAgICAqIEBlbiBJZiB5b3UgZG9uJ3Qgd2FudCB0byBjYWNoZSB0aGUgdGVtcGxhdGUgaW4gbWVtb3J5LCBnaXZlbiBgdHJ1ZWAuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOOCkuODoeODouODquOBq+OCreODo+ODg+OCt+ODpeOBl+OBquOBhOWgtOWQiOOBryBgdHJ1ZWAg44KS5oyH5a6aXG4gICAgICovXG4gICAgbm9DYWNoZT86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIENsZWFyIHRlbXBsYXRlJ3MgcmVzb3VyY2VzLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOODquOCveODvOOCueOCreODo+ODg+OCt+ODpeOBruWJiumZpFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJUZW1wbGF0ZUNhY2hlKCk6IHZvaWQge1xuICAgIF9tYXBQcm92aWRlciA9IHt9O1xuICAgIF9tYXBTb3VyY2UgICA9IHt9O1xufVxuXG4vKipcbiAqIEBlbiBMb2FkIHRlbXBsYXRlIHNvdXJjZS5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjgr3jg7zjgrnjga7jg63jg7zjg4lcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgVGhlIHNlbGVjdG9yIHN0cmluZyBvZiBET00uXG4gKiAgLSBgamFgIERPTSDjgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGxvYWQgb3B0aW9uc1xuICogIC0gYGphYCDjg63jg7zjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUZW1wbGF0ZVNvdXJjZShzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogTG9hZFRlbXBsYXRlT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHsgdXJsLCBub0NhY2hlIH0gPSBPYmplY3QuYXNzaWduKHsgbm9DYWNoZTogZmFsc2UgfSwgb3B0aW9ucyk7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBhd2FpdCBxdWVyeVRlbXBsYXRlUHJvdmlkZXIodXJsLCBub0NhY2hlKTtcbiAgICByZXR1cm4gcXVlcnlUZW1wbGF0ZVNvdXJjZShzZWxlY3RvciwgcHJvdmlkZXIsIG5vQ2FjaGUpO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRm9yY2VkIGNvbnZlcnNpb24gdG8gSFRNTCBzdHJpbmcuXG4gKiBAamEgSFRNTCDmloflrZfliJfjgavlvLfliLblpInmj5tcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIGBIVE1MVGVtcGxhdGVFbGVtZW50YCBpbnN0YW5jZSBvciBIVE1MIHN0cmluZ1xuICogIC0gYGphYCBgSFRNTFRlbXBsYXRlRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K544G+44Gf44GvIEhUTUwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1RlbXBsYXRlU3RyaW5nKHNyYzogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHNyYyBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyBzcmMuaW5uZXJIVE1MIDogc3JjO1xufVxuXG4vKipcbiAqIEBlbiBGb3JjZWQgY29udmVyc2lvbiB0byBgSFRNTFRlbXBsYXRlRWxlbWVudGAuIChJZiBpdCBpcyBhIE5vZGUsIGNyZWF0ZSBhIGNsb25lIHdpdGggYGNsb25lTm9kZSh0cnVlKWApXG4gKiBAamEgYEhUTUxUZW1wbGF0ZUVsZW1lbnRgIOOBq+W8t+WItuWkieaPmyAoTm9kZeOBp+OBguOCi+WgtOWQiOOBq+OBryBgY2xvbmVOb2RlKHRydWUpYCDjgavjgojjgovopIfoo73jgpLkvZzmiJApXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBgSFRNTFRlbXBsYXRlRWxlbWVudGAgaW5zdGFuY2Ugb3IgSFRNTCBzdHJpbmdcbiAqICAtIGBqYWAgYEhUTUxUZW1wbGF0ZUVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBryBIVE1MIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UZW1wbGF0ZUVsZW1lbnQoc3JjOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkKTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZnJvbSA9IChzdHI6IHN0cmluZyk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgPT4ge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IHN0cjtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH07XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2Ygc3JjID8gZnJvbShzcmMpIDogc3JjPy5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTFRlbXBsYXRlRWxlbWVudDtcbn1cbiJdLCJuYW1lcyI6WyJzYWZlIiwicmVxdWVzdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFFQSxpQkFBd0IsTUFBTSxRQUFRLEdBQWdCQSxjQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztJQUMvRSxpQkFBd0IsTUFBTSxRQUFRLEdBQWdCQSxjQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztJQUMvRSxpQkFBd0IsTUFBTSxxQkFBcUIsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQztJQUM1RixpQkFBd0IsTUFBTSxtQkFBbUIsR0FBS0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQzs7SUNIMUY7Ozs7Ozs7SUFPRztBQUNJLFVBQU0sZUFBZSxHQUFHLENBQUMsR0FBVyxLQUFZO1FBQ25ELE1BQU0sS0FBSyxHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDaEQsSUFBQSxPQUFPLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFO0lBQzNCO0lBRUE7Ozs7O0lBS0c7VUFDVSxPQUFPLEdBQVcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxJQUFJO0lBRXBIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFrQkc7QUFDSSxVQUFNLEtBQUssR0FBRyxDQUFDLElBQVksS0FBWTtJQUMxQyxJQUFBLElBQUksSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUN2QixRQUFBLE9BQU8sSUFBSTs7YUFDUixJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUU7WUFDMUIsT0FBTyxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLElBQUk7O2FB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