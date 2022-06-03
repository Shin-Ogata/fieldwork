/*!
 * @cdp/web-utils 0.9.13
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
     */
    async function waitFrame(frameCount = 1) {
        while (frameCount-- > 0) {
            await new Promise(requestAnimationFrame);
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

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXV0aWxzLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ3ZWItcm9vdC50cyIsIndhaXQudHMiLCJ0ZW1wbGF0ZS1sb2FkZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGxvY2F0aW9uICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5sb2NhdGlvbik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCAgICAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuZG9jdW1lbnQpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gc2FmZShnbG9iYWxUaGlzLnJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCByZXF1ZXN0SWRsZUNhbGxiYWNrICAgPSBzYWZlKGdsb2JhbFRoaXMucmVxdWVzdElkbGVDYWxsYmFjayk7XG4iLCJpbXBvcnQgeyBsb2NhdGlvbiwgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGlyZWN0b3J5IHRvIHdoaWNoIGB1cmxgIGJlbG9uZ3MuXG4gKiBAamEg5oyH5a6aIGB1cmxgIOOBruaJgOWxnuOBmeOCi+ODh+OCo+ODrOOCr+ODiOODquOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgdGFyZ2V0IFVSTFxuICogIC0gYGphYCDlr77osaHjga4gVVJMXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRXZWJEaXJlY3RvcnkgPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gLyguK1xcLykoW14vXSojW14vXSspPy8uZXhlYyh1cmwpO1xuICAgIHJldHVybiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHx8ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQWNjc2Vzc29yIGZvciBXZWIgcm9vdCBsb2NhdGlvbiA8YnI+XG4gKiAgICAgT25seSB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCB3aWxsIGJlIGFuIGFsbG9jYXRpbmcgcGxhY2UgaW4gaW5kZXguaHRtbCwgYW5kIGJlY29tZXMgZWZmZWN0aXZlLlxuICogQGphIFdlYiByb290IGxvY2F0aW9uIOOBuOOBruOCouOCr+OCu+OCuSA8YnI+XG4gKiAgICAgaW5kZXguaHRtbCDjga7phY3nva7loLTmiYDjgajjgarjgorjgIHjg5bjg6njgqbjgrbnkrDlooPjga7jgb/mnInlirnjgajjgarjgosuXG4gKi9cbmV4cG9ydCBjb25zdCB3ZWJSb290OiBzdHJpbmcgPSBnZXRXZWJEaXJlY3RvcnkoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYmFzZScpPy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSB8fCBsb2NhdGlvbi5ocmVmKTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBhbiBhYnNvbHV0ZSB1cmwgc3RyaW5nIGlmIGdpdmVuIGEgcmVsYXRpdmUgcGF0aC4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++44OR44K544GM5oyH5a6a44GV44KM44Gm44GE44KL5aC05ZCI44Gv44CB57W25a++VVJM5paH5a2X5YiX44Gr5aSJ5o+bIDxicj5cbiAqICAgICBqcyDjga7phY3nva7jgavkvp3lrZjjgZnjgovjgZPjgajjgarjgY8gYGFzc2V0c2Ag44Ki44Kv44K744K544GX44Gf44GE44Go44GN44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjE4ODIxOC9yZWxhdGl2ZS1wYXRocy1pbi1qYXZhc2NyaXB0LWluLWFuLWV4dGVybmFsLWZpbGVcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBjb25zb2xlLmxvZyh0b1VybCgnL3Jlcy9kYXRhL2NvbGxlY3Rpb24uanNvbicpKTtcbiAqICAvLyBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcHAvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIHNldCByZWxhdGl2ZSBwYXRoIGZyb20gW1t3ZWJSb290XV0uXG4gKiAgLSBgamFgIFtbd2ViUm9vdF1dIOOBi+OCieOBruebuOWvvuODkeOCueOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgdG9VcmwgPSAoc2VlZDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBpZiAoc2VlZD8uaW5jbHVkZXMoJzovLycpKSB7XG4gICAgICAgIHJldHVybiBzZWVkO1xuICAgIH0gZWxzZSBpZiAobnVsbCAhPSBzZWVkPy5bMF0pIHtcbiAgICAgICAgcmV0dXJuICgnLycgPT09IHNlZWRbMF0pID8gd2ViUm9vdCArIHNlZWQuc2xpY2UoMSkgOiB3ZWJSb290ICsgc2VlZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gd2ViUm9vdDtcbiAgICB9XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLCByZXF1ZXN0SWRsZUNhbGxiYWNrIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIHRpbWluZyB0aGF0IGRvZXMgbm90IGJsb2NrIHRoZSByZW5kZXJpbmcgcHJvY2VzcyBldGMuXG4gKiBAamEg44Os44Oz44OA44Oq44Oz44Kw5Yem55CG562J44KS44OW44Ot44OD44Kv44GX44Gq44GE44K/44Kk44Of44Oz44Kw44KS5Y+W5b6XXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAgYXdhaXQgd2FpdEZyYW1lKCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZnJhbWVDb3VudFxuICogIC0gYGVuYCB3YWl0IGZyYW1lIGNvdW50LlxuICogIC0gYGphYCDlh6bnkIblvoXjgaHjgpLooYzjgYbjg5Xjg6zjg7zjg6DmlbBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdhaXRGcmFtZShmcmFtZUNvdW50ID0gMSk6IFByb21pc2U8dm9pZD4ge1xuICAgIHdoaWxlIChmcmFtZUNvdW50LS0gPiAwKSB7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KHJlcXVlc3RBbmltYXRpb25GcmFtZSBhcyBVbmtub3duRnVuY3Rpb24pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gV2FpdCB1bnRpbCB0aGUgY3VycmVudCB0aHJlYWQgaXMgaWRsZS5cbiAqIEBqYSDnj77lnKjjga7jgrnjg6zjg4Pjg4njgYzjgqLjgqTjg4njg6vnirbmhYvjgavjgarjgovjgb7jgaflvoXmqZ9cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBhd2FpdCB3YWl0SWRsZSgpO1xuICogYGBgXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2FpdElkbGUob3B0aW9ucz86IElkbGVSZXF1ZXN0T3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHJlcXVlc3RJZGxlQ2FsbGJhY2soKCkgPT4gcmVzb2x2ZSgpLCBvcHRpb25zKSk7XG59XG4iLCJpbXBvcnQgeyBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucywgcmVxdWVzdCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRlbXBsYXRlUHJvdmlkZXIge1xuICAgIGZyYWdtZW50OiBEb2N1bWVudEZyYWdtZW50O1xuICAgIGh0bWw6IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRlbXBsYXRlUHJvdmlkZXJNYXAge1xuICAgIFt1cmw6IHN0cmluZ106IFRlbXBsYXRlUHJvdmlkZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUZW1wbGF0ZVNvdXJjZU1hcCB7XG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX21hcFByb3ZpZGVyOiBUZW1wbGF0ZVByb3ZpZGVyTWFwID0ge307XG4vKiogQGludGVybmFsICovIGxldCBfbWFwU291cmNlOiBUZW1wbGF0ZVNvdXJjZU1hcCA9IHt9O1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBxdWVyeVRlbXBsYXRlU291cmNlKHNlbGVjdG9yOiBzdHJpbmcsIHByb3ZpZGVyOiBUZW1wbGF0ZVByb3ZpZGVyIHwgbnVsbCwgbm9DYWNoZTogYm9vbGVhbik6IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHsgZnJhZ21lbnQsIGh0bWwgfSA9IHByb3ZpZGVyIHx8IHt9O1xuICAgIGNvbnN0IGtleSA9IGAke3NlbGVjdG9yfSR7aHRtbCA/IGA6OiR7aHRtbH1gIDogJyd9YDtcbiAgICBpZiAoX21hcFNvdXJjZVtrZXldKSB7XG4gICAgICAgIHJldHVybiBfbWFwU291cmNlW2tleV07XG4gICAgfVxuICAgIGNvbnN0IGNvbnRleHQgPSBmcmFnbWVudCB8fCBkb2N1bWVudDtcbiAgICBjb25zdCB0YXJnZXQgPSBjb250ZXh0LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIGNvbnN0IHNvdXJjZSA9IHRhcmdldCBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0YXJnZXQgOiB0YXJnZXQ/LmlubmVySFRNTDtcbiAgICAhbm9DYWNoZSAmJiBzb3VyY2UgJiYgKF9tYXBTb3VyY2Vba2V5XSA9IHNvdXJjZSk7XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlUZW1wbGF0ZVByb3ZpZGVyKHVybDogc3RyaW5nIHwgdW5kZWZpbmVkLCBub0NhY2hlOiBib29sZWFuKTogUHJvbWlzZTxUZW1wbGF0ZVByb3ZpZGVyIHwgbnVsbD4ge1xuICAgIGlmICghdXJsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAoX21hcFByb3ZpZGVyW3VybF0pIHtcbiAgICAgICAgcmV0dXJuIF9tYXBQcm92aWRlclt1cmxdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZXF1ZXN0LnRleHQodXJsKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRlbXBsYXRlLmNvbnRlbnQ7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0geyBmcmFnbWVudCwgaHRtbDogaHRtbC5yZXBsYWNlKC9cXHMvZ20sICcnKSB9O1xuICAgICAgICAhbm9DYWNoZSAmJiBmcmFnbWVudCAmJiAoX21hcFByb3ZpZGVyW3VybF0gPSBwcm92aWRlcik7XG4gICAgICAgIHJldHVybiBwcm92aWRlcjtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBMb2FkIHRlbXBsYXRlIG9wdGlvbnMuXG4gKiBAamEg44Ot44O844OJ44OG44Oz44OX44Os44O844OI44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9hZFRlbXBsYXRlT3B0aW9ucyBleHRlbmRzIEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIHRlbXBsYXRlIGFjcXVpc2l0aW9uIFVSTC4gaWYgbm90IHNwZWNpZmllZCB0aGUgdGVtcGxhdGUgd2lsbCBiZSBzZWFyY2hlZCBmcm9tIGBkb2N1bWVudGAuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+WFiCBVUkwuIOaMh+WumuOBjOOBquOBhOWgtOWQiOOBryBgZG9jdW1lbnRgIOOBi+OCieaknOe0olxuICAgICAqL1xuICAgIHVybD86IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBAZW4gSWYgeW91IGRvbid0IHdhbnQgdG8gY2FjaGUgdGhlIHRlbXBsYXRlIGluIG1lbW9yeSwgZ2l2ZW4gYHRydWVgLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjgpLjg6Hjg6Ljg6rjgavjgq3jg6Pjg4Pjgrfjg6XjgZfjgarjgYTloLTlkIjjga8gYHRydWVgIOOCkuaMh+WumlxuICAgICAqL1xuICAgIG5vQ2FjaGU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciB0ZW1wbGF0ZSdzIHJlc291cmNlcy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjgr3jg7zjgrnjgq3jg6Pjg4Pjgrfjg6Xjga7liYrpmaRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyVGVtcGxhdGVDYWNoZSgpOiB2b2lkIHtcbiAgICBfbWFwUHJvdmlkZXIgPSB7fTtcbiAgICBfbWFwU291cmNlICAgPSB7fTtcbn1cblxuLyoqXG4gKiBAZW4gTG9hZCB0ZW1wbGF0ZSBzb3VyY2UuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI44K944O844K544Gu44Ot44O844OJXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBsb2FkIG9wdGlvbnNcbiAqICAtIGBqYWAg44Ot44O844OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3I6IHN0cmluZywgb3B0aW9ucz86IExvYWRUZW1wbGF0ZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCB7IHVybCwgbm9DYWNoZSB9ID0gT2JqZWN0LmFzc2lnbih7IG5vQ2FjaGU6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcXVlcnlUZW1wbGF0ZVByb3ZpZGVyKHVybCwgbm9DYWNoZSk7XG4gICAgcmV0dXJuIHF1ZXJ5VGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHByb3ZpZGVyLCBub0NhY2hlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEZvcmNlZCBjb252ZXJzaW9uIHRvIEhUTUwgc3RyaW5nLlxuICogQGphIEhUTUwg5paH5a2X5YiX44Gr5by35Yi25aSJ5o+bXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBgSFRNTFRlbXBsYXRlRWxlbWVudGAgaW5zdGFuY2Ugb3IgSFRNTCBzdHJpbmdcbiAqICAtIGBqYWAgYEhUTUxUZW1wbGF0ZUVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBryBIVE1MIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UZW1wbGF0ZVN0cmluZyhzcmM6IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiBzcmMgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gc3JjLmlubmVySFRNTCA6IHNyYztcbn1cblxuLyoqXG4gKiBAZW4gRm9yY2VkIGNvbnZlcnNpb24gdG8gYEhUTUxUZW1wbGF0ZUVsZW1lbnRgLlxuICogQGphIGBIVE1MVGVtcGxhdGVFbGVtZW50YCDjgavlvLfliLblpInmj5tcbiAqXG4gKiBAcGFyYW0gc3JjXG4gKiAgLSBgZW5gIGBIVE1MVGVtcGxhdGVFbGVtZW50YCBpbnN0YW5jZSBvciBIVE1MIHN0cmluZ1xuICogIC0gYGphYCBgSFRNTFRlbXBsYXRlRWxlbWVudGAg44Kk44Oz44K544K/44Oz44K544G+44Gf44GvIEhUTUwg5paH5a2X5YiXXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1RlbXBsYXRlRWxlbWVudChzcmM6IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQpOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBmcm9tID0gKHN0cjogc3RyaW5nKTogSFRNTFRlbXBsYXRlRWxlbWVudCA9PiB7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gc3RyO1xuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfTtcbiAgICByZXR1cm4gJ3N0cmluZycgPT09IHR5cGVvZiBzcmMgPyBmcm9tKHNyYykgOiBzcmM7XG59XG4iXSwibmFtZXMiOlsic2FmZSIsInJlcXVlc3QiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBRUEsaUJBQXdCLE1BQU0sUUFBUSxHQUFnQkEsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoRixpQkFBd0IsTUFBTSxRQUFRLEdBQWdCQSxjQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2hGLGlCQUF3QixNQUFNLHFCQUFxQixHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLHFC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
