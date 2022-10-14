/*!
 * @cdp/web-utils 0.9.14
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
        const match = /(.+\/)([^/]*#[^/]+)?/.exec(url);
        return (match && match[1]) || '';
    };
    /**
     * @en Accsessor for Web root location <br>
     *     Only the browser environment will be an allocating place in index.html, and becomes effective.
     * @ja Web root location へのアクセス <br>
     *     index.html の配置場所となり、ブラウザ環境のみ有効となる.
     */
    const webRoot = getWebDirectory(document.querySelector('base')?.getAttribute('href') || location.href);
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
     *  - `en` set relative path from [[webRoot]].
     *  - `ja` [[webRoot]] からの相対パスを指定
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
        const { fragment, html } = provider || {};
        const key = `${selector}${html ? `::${html}` : ''}`;
        if (_mapSource[key]) {
            return _mapSource[key];
        }
        const context = fragment || document;
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
     * @en Forced conversion to `HTMLTemplateElement`.
     * @ja `HTMLTemplateElement` に強制変換
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
        return 'string' === typeof src ? from(src) : src;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXV0aWxzLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ3ZWItcm9vdC50cyIsIndhaXQudHMiLCJ0ZW1wbGF0ZS1sb2FkZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGxvY2F0aW9uICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5sb2NhdGlvbik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCAgICAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuZG9jdW1lbnQpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gc2FmZShnbG9iYWxUaGlzLnJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCByZXF1ZXN0SWRsZUNhbGxiYWNrICAgPSBzYWZlKGdsb2JhbFRoaXMucmVxdWVzdElkbGVDYWxsYmFjayk7XG4iLCJpbXBvcnQgeyBsb2NhdGlvbiwgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGlyZWN0b3J5IHRvIHdoaWNoIGB1cmxgIGJlbG9uZ3MuXG4gKiBAamEg5oyH5a6aIGB1cmxgIOOBruaJgOWxnuOBmeOCi+ODh+OCo+ODrOOCr+ODiOODquOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgdGFyZ2V0IFVSTFxuICogIC0gYGphYCDlr77osaHjga4gVVJMXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRXZWJEaXJlY3RvcnkgPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gLyguK1xcLykoW14vXSojW14vXSspPy8uZXhlYyh1cmwpO1xuICAgIHJldHVybiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHx8ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQWNjc2Vzc29yIGZvciBXZWIgcm9vdCBsb2NhdGlvbiA8YnI+XG4gKiAgICAgT25seSB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCB3aWxsIGJlIGFuIGFsbG9jYXRpbmcgcGxhY2UgaW4gaW5kZXguaHRtbCwgYW5kIGJlY29tZXMgZWZmZWN0aXZlLlxuICogQGphIFdlYiByb290IGxvY2F0aW9uIOOBuOOBruOCouOCr+OCu+OCuSA8YnI+XG4gKiAgICAgaW5kZXguaHRtbCDjga7phY3nva7loLTmiYDjgajjgarjgorjgIHjg5bjg6njgqbjgrbnkrDlooPjga7jgb/mnInlirnjgajjgarjgosuXG4gKi9cbmV4cG9ydCBjb25zdCB3ZWJSb290OiBzdHJpbmcgPSBnZXRXZWJEaXJlY3RvcnkoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYmFzZScpPy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSB8fCBsb2NhdGlvbi5ocmVmKTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBhbiBhYnNvbHV0ZSB1cmwgc3RyaW5nIGlmIGdpdmVuIGEgcmVsYXRpdmUgcGF0aC4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++44OR44K544GM5oyH5a6a44GV44KM44Gm44GE44KL5aC05ZCI44Gv44CB57W25a++VVJM5paH5a2X5YiX44Gr5aSJ5o+bIDxicj5cbiAqICAgICBqcyDjga7phY3nva7jgavkvp3lrZjjgZnjgovjgZPjgajjgarjgY8gYGFzc2V0c2Ag44Ki44Kv44K744K544GX44Gf44GE44Go44GN44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjE4ODIxOC9yZWxhdGl2ZS1wYXRocy1pbi1qYXZhc2NyaXB0LWluLWFuLWV4dGVybmFsLWZpbGVcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBjb25zb2xlLmxvZyh0b1VybCgnL3Jlcy9kYXRhL2NvbGxlY3Rpb24uanNvbicpKTtcbiAqICAvLyBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcHAvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIHNldCByZWxhdGl2ZSBwYXRoIGZyb20gW1t3ZWJSb290XV0uXG4gKiAgLSBgamFgIFtbd2ViUm9vdF1dIOOBi+OCieOBruebuOWvvuODkeOCueOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgdG9VcmwgPSAoc2VlZDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBpZiAoc2VlZD8uaW5jbHVkZXMoJzovLycpKSB7XG4gICAgICAgIHJldHVybiBzZWVkO1xuICAgIH0gZWxzZSBpZiAobnVsbCAhPSBzZWVkPy5bMF0pIHtcbiAgICAgICAgcmV0dXJuICgnLycgPT09IHNlZWRbMF0pID8gd2ViUm9vdCArIHNlZWQuc2xpY2UoMSkgOiB3ZWJSb290ICsgc2VlZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gd2ViUm9vdDtcbiAgICB9XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLCByZXF1ZXN0SWRsZUNhbGxiYWNrIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHRpbWluZyB0aGF0IGRvZXMgbm90IGJsb2NrIHRoZSByZW5kZXJpbmcgcHJvY2VzcyBldGMuXG4gKiBAamEg44Os44Oz44OA44Oq44Oz44Kw5Yem55CG562J44KS44OW44Ot44OD44Kv44GX44Gq44GE44K/44Kk44Of44Oz44Kw44KS5Y+W5b6XXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAgYXdhaXQgd2FpdEZyYW1lKCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZnJhbWVDb3VudFxuICogIC0gYGVuYCB3YWl0IGZyYW1lIGNvdW50LlxuICogIC0gYGphYCDlh6bnkIblvoXjgaHjgpLooYzjgYbjg5Xjg6zjg7zjg6DmlbBcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCB3YWl0IGZyYW1lIGV4ZWN1dG9yLlxuICogIC0gYGphYCDlh6bnkIblvoXjgaHjgpLooYzjgYblrp/ooYzplqLmlbBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhaXRGcmFtZShmcmFtZUNvdW50ID0gMSwgZXhlY3V0b3I6IFVua25vd25GdW5jdGlvbiA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIHdoaWxlIChmcmFtZUNvdW50LS0gPiAwKSB7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KGV4ZWN1dG9yKTtcbiAgICB9XG59XG5cbi8qKlxuICogQGVuIFdhaXQgdW50aWwgdGhlIGN1cnJlbnQgdGhyZWFkIGlzIGlkbGUuXG4gKiBAamEg54++5Zyo44Gu44K544Os44OD44OJ44GM44Ki44Kk44OJ44Or54q25oWL44Gr44Gq44KL44G+44Gn5b6F5qmfXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAgYXdhaXQgd2FpdElkbGUoKTtcbiAqIGBgYFxuICpcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhaXRJZGxlKG9wdGlvbnM/OiBJZGxlUmVxdWVzdE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiByZXF1ZXN0SWRsZUNhbGxiYWNrKCgpID0+IHJlc29sdmUoKSwgb3B0aW9ucykpO1xufVxuIiwiaW1wb3J0IHsgQWpheEdldFJlcXVlc3RTaG9ydGN1dE9wdGlvbnMsIHJlcXVlc3QgfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHsgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUZW1wbGF0ZVByb3ZpZGVyIHtcbiAgICBmcmFnbWVudDogRG9jdW1lbnRGcmFnbWVudDtcbiAgICBodG1sOiBzdHJpbmc7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUZW1wbGF0ZVByb3ZpZGVyTWFwIHtcbiAgICBbdXJsOiBzdHJpbmddOiBUZW1wbGF0ZVByb3ZpZGVyO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgVGVtcGxhdGVTb3VyY2VNYXAge1xuICAgIFtrZXk6IHN0cmluZ106IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQ7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF9tYXBQcm92aWRlcjogVGVtcGxhdGVQcm92aWRlck1hcCA9IHt9O1xuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX21hcFNvdXJjZTogVGVtcGxhdGVTb3VyY2VNYXAgPSB7fTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gcXVlcnlUZW1wbGF0ZVNvdXJjZShzZWxlY3Rvcjogc3RyaW5nLCBwcm92aWRlcjogVGVtcGxhdGVQcm92aWRlciB8IG51bGwsIG5vQ2FjaGU6IGJvb2xlYW4pOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB7IGZyYWdtZW50LCBodG1sIH0gPSBwcm92aWRlciB8fCB7fTtcbiAgICBjb25zdCBrZXkgPSBgJHtzZWxlY3Rvcn0ke2h0bWwgPyBgOjoke2h0bWx9YCA6ICcnfWA7XG4gICAgaWYgKF9tYXBTb3VyY2Vba2V5XSkge1xuICAgICAgICByZXR1cm4gX21hcFNvdXJjZVtrZXldO1xuICAgIH1cbiAgICBjb25zdCBjb250ZXh0ID0gZnJhZ21lbnQgfHwgZG9jdW1lbnQ7XG4gICAgY29uc3QgdGFyZ2V0ID0gY29udGV4dC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBjb25zdCBzb3VyY2UgPSB0YXJnZXQgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdGFyZ2V0IDogdGFyZ2V0Py5pbm5lckhUTUw7XG4gICAgIW5vQ2FjaGUgJiYgc291cmNlICYmIChfbWFwU291cmNlW2tleV0gPSBzb3VyY2UpO1xuICAgIHJldHVybiBzb3VyY2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5VGVtcGxhdGVQcm92aWRlcih1cmw6IHN0cmluZyB8IHVuZGVmaW5lZCwgbm9DYWNoZTogYm9vbGVhbik6IFByb21pc2U8VGVtcGxhdGVQcm92aWRlciB8IG51bGw+IHtcbiAgICBpZiAoIXVybCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKF9tYXBQcm92aWRlclt1cmxdKSB7XG4gICAgICAgIHJldHVybiBfbWFwUHJvdmlkZXJbdXJsXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBodG1sID0gYXdhaXQgcmVxdWVzdC50ZXh0KHVybCk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5jb250ZW50O1xuICAgICAgICBjb25zdCBwcm92aWRlciA9IHsgZnJhZ21lbnQsIGh0bWw6IGh0bWwucmVwbGFjZSgvXFxzL2dtLCAnJykgfTtcbiAgICAgICAgIW5vQ2FjaGUgJiYgZnJhZ21lbnQgJiYgKF9tYXBQcm92aWRlclt1cmxdID0gcHJvdmlkZXIpO1xuICAgICAgICByZXR1cm4gcHJvdmlkZXI7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTG9hZCB0ZW1wbGF0ZSBvcHRpb25zLlxuICogQGphIOODreODvOODieODhuODs+ODl+ODrOODvOODiOOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIExvYWRUZW1wbGF0ZU9wdGlvbnMgZXh0ZW5kcyBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucyB7XG4gICAgLyoqXG4gICAgICogQGVuIFRoZSB0ZW1wbGF0ZSBhY3F1aXNpdGlvbiBVUkwuIGlmIG5vdCBzcGVjaWZpZWQgdGhlIHRlbXBsYXRlIHdpbGwgYmUgc2VhcmNoZWQgZnJvbSBgZG9jdW1lbnRgLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jlj5blvpflhYggVVJMLiDmjIflrprjgYzjgarjgYTloLTlkIjjga8gYGRvY3VtZW50YCDjgYvjgonmpJzntKJcbiAgICAgKi9cbiAgICB1cmw/OiBzdHJpbmc7XG4gICAgLyoqXG4gICAgICogQGVuIElmIHlvdSBkb24ndCB3YW50IHRvIGNhY2hlIHRoZSB0ZW1wbGF0ZSBpbiBtZW1vcnksIGdpdmVuIGB0cnVlYC5cbiAgICAgKiBAamEg44OG44Oz44OX44Os44O844OI44KS44Oh44Oi44Oq44Gr44Kt44Oj44OD44K344Ol44GX44Gq44GE5aC05ZCI44GvIGB0cnVlYCDjgpLmjIflrppcbiAgICAgKi9cbiAgICBub0NhY2hlPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBAZW4gQ2xlYXIgdGVtcGxhdGUncyByZXNvdXJjZXMuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI44Oq44K944O844K544Kt44Oj44OD44K344Ol44Gu5YmK6ZmkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGVhclRlbXBsYXRlQ2FjaGUoKTogdm9pZCB7XG4gICAgX21hcFByb3ZpZGVyID0ge307XG4gICAgX21hcFNvdXJjZSAgID0ge307XG59XG5cbi8qKlxuICogQGVuIExvYWQgdGVtcGxhdGUgc291cmNlLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOOCveODvOOCueOBruODreODvOODiVxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogIC0gYGVuYCBUaGUgc2VsZWN0b3Igc3RyaW5nIG9mIERPTS5cbiAqICAtIGBqYWAgRE9NIOOCu+ODrOOCr+OCv+aWh+Wtl+WIl1xuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgbG9hZCBvcHRpb25zXG4gKiAgLSBgamFgIOODreODvOODieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFRlbXBsYXRlU291cmNlKHNlbGVjdG9yOiBzdHJpbmcsIG9wdGlvbnM/OiBMb2FkVGVtcGxhdGVPcHRpb25zKTogUHJvbWlzZTxzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3QgeyB1cmwsIG5vQ2FjaGUgfSA9IE9iamVjdC5hc3NpZ24oeyBub0NhY2hlOiBmYWxzZSB9LCBvcHRpb25zKTtcbiAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IHF1ZXJ5VGVtcGxhdGVQcm92aWRlcih1cmwsIG5vQ2FjaGUpO1xuICAgIHJldHVybiBxdWVyeVRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCBwcm92aWRlciwgbm9DYWNoZSk7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBGb3JjZWQgY29udmVyc2lvbiB0byBIVE1MIHN0cmluZy5cbiAqIEBqYSBIVE1MIOaWh+Wtl+WIl+OBq+W8t+WItuWkieaPm1xuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgYEhUTUxUZW1wbGF0ZUVsZW1lbnRgIGluc3RhbmNlIG9yIEhUTUwgc3RyaW5nXG4gKiAgLSBgamFgIGBIVE1MVGVtcGxhdGVFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga8gSFRNTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvVGVtcGxhdGVTdHJpbmcoc3JjOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gc3JjIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHNyYy5pbm5lckhUTUwgOiBzcmM7XG59XG5cbi8qKlxuICogQGVuIEZvcmNlZCBjb252ZXJzaW9uIHRvIGBIVE1MVGVtcGxhdGVFbGVtZW50YC5cbiAqIEBqYSBgSFRNTFRlbXBsYXRlRWxlbWVudGAg44Gr5by35Yi25aSJ5o+bXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBgSFRNTFRlbXBsYXRlRWxlbWVudGAgaW5zdGFuY2Ugb3IgSFRNTCBzdHJpbmdcbiAqICAtIGBqYWAgYEhUTUxUZW1wbGF0ZUVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBryBIVE1MIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UZW1wbGF0ZUVsZW1lbnQoc3JjOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkKTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgZnJvbSA9IChzdHI6IHN0cmluZyk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgPT4ge1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IHN0cjtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH07XG4gICAgcmV0dXJuICdzdHJpbmcnID09PSB0eXBlb2Ygc3JjID8gZnJvbShzcmMpIDogc3JjO1xufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJyZXF1ZXN0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUVBLGlCQUF3QixNQUFNLFFBQVEsR0FBZ0JBLGNBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7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