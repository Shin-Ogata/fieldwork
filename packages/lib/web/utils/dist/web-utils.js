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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXV0aWxzLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ3ZWItcm9vdC50cyIsIndhaXQudHMiLCJ0ZW1wbGF0ZS1sb2FkZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGxvY2F0aW9uICAgICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5sb2NhdGlvbik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCAgICAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuZG9jdW1lbnQpO1xuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gc2FmZShnbG9iYWxUaGlzLnJlcXVlc3RBbmltYXRpb25GcmFtZSk7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCByZXF1ZXN0SWRsZUNhbGxiYWNrICAgPSBzYWZlKGdsb2JhbFRoaXMucmVxdWVzdElkbGVDYWxsYmFjayk7XG4iLCJpbXBvcnQgeyBsb2NhdGlvbiwgZG9jdW1lbnQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGlyZWN0b3J5IHRvIHdoaWNoIGB1cmxgIGJlbG9uZ3MuXG4gKiBAamEg5oyH5a6aIGB1cmxgIOOBruaJgOWxnuOBmeOCi+ODh+OCo+ODrOOCr+ODiOODquOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgdGFyZ2V0IFVSTFxuICogIC0gYGphYCDlr77osaHjga4gVVJMXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRXZWJEaXJlY3RvcnkgPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL14oKFtePyNdKylcXC8pKFtcXFNdKik/JC8uZXhlYyh1cmwpO1xuICAgIHJldHVybiBtYXRjaD8uWzFdID8/ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQWNjc2Vzc29yIGZvciBXZWIgcm9vdCBsb2NhdGlvbiA8YnI+XG4gKiAgICAgT25seSB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCB3aWxsIGJlIGFuIGFsbG9jYXRpbmcgcGxhY2UgaW4gaW5kZXguaHRtbCwgYW5kIGJlY29tZXMgZWZmZWN0aXZlLlxuICogQGphIFdlYiByb290IGxvY2F0aW9uIOOBuOOBruOCouOCr+OCu+OCuSA8YnI+XG4gKiAgICAgaW5kZXguaHRtbCDjga7phY3nva7loLTmiYDjgajjgarjgorjgIHjg5bjg6njgqbjgrbnkrDlooPjga7jgb/mnInlirnjgajjgarjgosuXG4gKi9cbmV4cG9ydCBjb25zdCB3ZWJSb290OiBzdHJpbmcgPSBnZXRXZWJEaXJlY3RvcnkoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYmFzZScpPy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSA/PyBsb2NhdGlvbi5ocmVmKTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBhbiBhYnNvbHV0ZSB1cmwgc3RyaW5nIGlmIGdpdmVuIGEgcmVsYXRpdmUgcGF0aC4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++44OR44K544GM5oyH5a6a44GV44KM44Gm44GE44KL5aC05ZCI44Gv44CB57W25a++VVJM5paH5a2X5YiX44Gr5aSJ5o+bIDxicj5cbiAqICAgICBqcyDjga7phY3nva7jgavkvp3lrZjjgZnjgovjgZPjgajjgarjgY8gYGFzc2V0c2Ag44Ki44Kv44K744K544GX44Gf44GE44Go44GN44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjE4ODIxOC9yZWxhdGl2ZS1wYXRocy1pbi1qYXZhc2NyaXB0LWluLWFuLWV4dGVybmFsLWZpbGVcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBjb25zb2xlLmxvZyh0b1VybCgnL3Jlcy9kYXRhL2NvbGxlY3Rpb24uanNvbicpKTtcbiAqICAvLyBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcHAvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIHNldCByZWxhdGl2ZSBwYXRoIGZyb20ge0BsaW5rIHdlYlJvb3R9LlxuICogIC0gYGphYCB7QGxpbmsgd2ViUm9vdH0g44GL44KJ44Gu55u45a++44OR44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1VybCA9IChzZWVkOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChzZWVkPy5pbmNsdWRlcygnOi8vJykpIHtcbiAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgfSBlbHNlIGlmIChudWxsICE9IHNlZWQ/LlswXSkge1xuICAgICAgICByZXR1cm4gKCcvJyA9PT0gc2VlZFswXSkgPyB3ZWJSb290ICsgc2VlZC5zbGljZSgxKSA6IHdlYlJvb3QgKyBzZWVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB3ZWJSb290O1xuICAgIH1cbn07XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsIHJlcXVlc3RJZGxlQ2FsbGJhY2sgfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgdGltaW5nIHRoYXQgZG9lcyBub3QgYmxvY2sgdGhlIHJlbmRlcmluZyBwcm9jZXNzIGV0Yy5cbiAqIEBqYSDjg6zjg7Pjg4Djg6rjg7PjgrDlh6bnkIbnrYnjgpLjg5bjg63jg4Pjgq/jgZfjgarjgYTjgr/jgqTjg5/jg7PjgrDjgpLlj5blvpdcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBhd2FpdCB3YWl0RnJhbWUoKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBmcmFtZUNvdW50XG4gKiAgLSBgZW5gIHdhaXQgZnJhbWUgY291bnQuXG4gKiAgLSBgamFgIOWHpueQhuW+heOBoeOCkuihjOOBhuODleODrOODvOODoOaVsFxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIHdhaXQgZnJhbWUgZXhlY3V0b3IuXG4gKiAgLSBgamFgIOWHpueQhuW+heOBoeOCkuihjOOBhuWun+ihjOmWouaVsFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd2FpdEZyYW1lKGZyYW1lQ291bnQgPSAxLCBleGVjdXRvcjogVW5rbm93bkZ1bmN0aW9uID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgd2hpbGUgKGZyYW1lQ291bnQtLSA+IDApIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oZXhlY3V0b3IpO1xuICAgIH1cbn1cblxuLyoqXG4gKiBAZW4gV2FpdCB1bnRpbCB0aGUgY3VycmVudCB0aHJlYWQgaXMgaWRsZS5cbiAqIEBqYSDnj77lnKjjga7jgrnjg6zjg4Pjg4njgYzjgqLjgqTjg4njg6vnirbmhYvjgavjgarjgovjgb7jgaflvoXmqZ9cbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBhd2FpdCB3YWl0SWRsZSgpO1xuICogYGBgXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2FpdElkbGUob3B0aW9ucz86IElkbGVSZXF1ZXN0T3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHJlcXVlc3RJZGxlQ2FsbGJhY2soKCkgPT4gcmVzb2x2ZSgpLCBvcHRpb25zKSk7XG59XG4iLCJpbXBvcnQgeyBBamF4R2V0UmVxdWVzdFNob3J0Y3V0T3B0aW9ucywgcmVxdWVzdCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRlbXBsYXRlUHJvdmlkZXIge1xuICAgIGZyYWdtZW50OiBEb2N1bWVudEZyYWdtZW50O1xuICAgIGh0bWw6IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBUZW1wbGF0ZVByb3ZpZGVyTWFwID0gUmVjb3JkPHN0cmluZywgVGVtcGxhdGVQcm92aWRlcj47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgVGVtcGxhdGVTb3VyY2VNYXAgPSBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50PjtcblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX21hcFByb3ZpZGVyOiBUZW1wbGF0ZVByb3ZpZGVyTWFwID0ge307XG4vKiogQGludGVybmFsICovIGxldCBfbWFwU291cmNlOiBUZW1wbGF0ZVNvdXJjZU1hcCA9IHt9O1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBxdWVyeVRlbXBsYXRlU291cmNlKHNlbGVjdG9yOiBzdHJpbmcsIHByb3ZpZGVyOiBUZW1wbGF0ZVByb3ZpZGVyIHwgbnVsbCwgbm9DYWNoZTogYm9vbGVhbik6IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHsgZnJhZ21lbnQsIGh0bWwgfSA9IHByb3ZpZGVyID8/IHt9O1xuICAgIGNvbnN0IGtleSA9IGAke3NlbGVjdG9yfSR7aHRtbCA/IGA6OiR7aHRtbH1gIDogJyd9YDtcbiAgICBpZiAoX21hcFNvdXJjZVtrZXldKSB7XG4gICAgICAgIHJldHVybiBfbWFwU291cmNlW2tleV07XG4gICAgfVxuICAgIGNvbnN0IGNvbnRleHQgPSBmcmFnbWVudCA/PyBkb2N1bWVudDtcbiAgICBjb25zdCB0YXJnZXQgPSBjb250ZXh0LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIGNvbnN0IHNvdXJjZSA9IHRhcmdldCBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0YXJnZXQgOiB0YXJnZXQ/LmlubmVySFRNTDtcbiAgICAhbm9DYWNoZSAmJiBzb3VyY2UgJiYgKF9tYXBTb3VyY2Vba2V5XSA9IHNvdXJjZSk7XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlUZW1wbGF0ZVByb3ZpZGVyKHVybDogc3RyaW5nIHwgdW5kZWZpbmVkLCBub0NhY2hlOiBib29sZWFuKTogUHJvbWlzZTxUZW1wbGF0ZVByb3ZpZGVyIHwgbnVsbD4ge1xuICAgIGlmICghdXJsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAoX21hcFByb3ZpZGVyW3VybF0pIHtcbiAgICAgICAgcmV0dXJuIF9tYXBQcm92aWRlclt1cmxdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZXF1ZXN0LnRleHQodXJsKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICBjb25zdCBmcmFnbWVudCA9IHRlbXBsYXRlLmNvbnRlbnQ7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0geyBmcmFnbWVudCwgaHRtbDogaHRtbC5yZXBsYWNlKC9cXHMvZ20sICcnKSB9O1xuICAgICAgICAhbm9DYWNoZSAmJiBmcmFnbWVudCAmJiAoX21hcFByb3ZpZGVyW3VybF0gPSBwcm92aWRlcik7XG4gICAgICAgIHJldHVybiBwcm92aWRlcjtcbiAgICB9XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBMb2FkIHRlbXBsYXRlIG9wdGlvbnMuXG4gKiBAamEg44Ot44O844OJ44OG44Oz44OX44Os44O844OI44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9hZFRlbXBsYXRlT3B0aW9ucyBleHRlbmRzIEFqYXhHZXRSZXF1ZXN0U2hvcnRjdXRPcHRpb25zIHtcbiAgICAvKipcbiAgICAgKiBAZW4gVGhlIHRlbXBsYXRlIGFjcXVpc2l0aW9uIFVSTC4gaWYgbm90IHNwZWNpZmllZCB0aGUgdGVtcGxhdGUgd2lsbCBiZSBzZWFyY2hlZCBmcm9tIGBkb2N1bWVudGAuXG4gICAgICogQGphIOODhuODs+ODl+ODrOODvOODiOWPluW+l+WFiCBVUkwuIOaMh+WumuOBjOOBquOBhOWgtOWQiOOBryBgZG9jdW1lbnRgIOOBi+OCieaknOe0olxuICAgICAqL1xuICAgIHVybD86IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBAZW4gSWYgeW91IGRvbid0IHdhbnQgdG8gY2FjaGUgdGhlIHRlbXBsYXRlIGluIG1lbW9yeSwgZ2l2ZW4gYHRydWVgLlxuICAgICAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjgpLjg6Hjg6Ljg6rjgavjgq3jg6Pjg4Pjgrfjg6XjgZfjgarjgYTloLTlkIjjga8gYHRydWVgIOOCkuaMh+WumlxuICAgICAqL1xuICAgIG5vQ2FjaGU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciB0ZW1wbGF0ZSdzIHJlc291cmNlcy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjgr3jg7zjgrnjgq3jg6Pjg4Pjgrfjg6Xjga7liYrpmaRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyVGVtcGxhdGVDYWNoZSgpOiB2b2lkIHtcbiAgICBfbWFwUHJvdmlkZXIgPSB7fTtcbiAgICBfbWFwU291cmNlICAgPSB7fTtcbn1cblxuLyoqXG4gKiBAZW4gTG9hZCB0ZW1wbGF0ZSBzb3VyY2UuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI44K944O844K544Gu44Ot44O844OJXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBsb2FkIG9wdGlvbnNcbiAqICAtIGBqYWAg44Ot44O844OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3I6IHN0cmluZywgb3B0aW9ucz86IExvYWRUZW1wbGF0ZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCB7IHVybCwgbm9DYWNoZSB9ID0gT2JqZWN0LmFzc2lnbih7IG5vQ2FjaGU6IGZhbHNlIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcXVlcnlUZW1wbGF0ZVByb3ZpZGVyKHVybCwgbm9DYWNoZSk7XG4gICAgcmV0dXJuIHF1ZXJ5VGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3IsIHByb3ZpZGVyLCBub0NhY2hlKTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEZvcmNlZCBjb252ZXJzaW9uIHRvIEhUTUwgc3RyaW5nLlxuICogQGphIEhUTUwg5paH5a2X5YiX44Gr5by35Yi25aSJ5o+bXG4gKlxuICogQHBhcmFtIHNyY1xuICogIC0gYGVuYCBgSFRNTFRlbXBsYXRlRWxlbWVudGAgaW5zdGFuY2Ugb3IgSFRNTCBzdHJpbmdcbiAqICAtIGBqYWAgYEhUTUxUZW1wbGF0ZUVsZW1lbnRgIOOCpOODs+OCueOCv+ODs+OCueOBvuOBn+OBryBIVE1MIOaWh+Wtl+WIl1xuICovXG5leHBvcnQgZnVuY3Rpb24gdG9UZW1wbGF0ZVN0cmluZyhzcmM6IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiBzcmMgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gc3JjLmlubmVySFRNTCA6IHNyYztcbn1cblxuLyoqXG4gKiBAZW4gRm9yY2VkIGNvbnZlcnNpb24gdG8gYEhUTUxUZW1wbGF0ZUVsZW1lbnRgLiAoSWYgaXQgaXMgYSBOb2RlLCBjcmVhdGUgYSBjbG9uZSB3aXRoIGBjbG9uZU5vZGUodHJ1ZSlgKVxuICogQGphIGBIVE1MVGVtcGxhdGVFbGVtZW50YCDjgavlvLfliLblpInmj5sgKE5vZGXjgafjgYLjgovloLTlkIjjgavjga8gYGNsb25lTm9kZSh0cnVlKWAg44Gr44KI44KL6KSH6KO944KS5L2c5oiQKVxuICpcbiAqIEBwYXJhbSBzcmNcbiAqICAtIGBlbmAgYEhUTUxUZW1wbGF0ZUVsZW1lbnRgIGluc3RhbmNlIG9yIEhUTUwgc3RyaW5nXG4gKiAgLSBgamFgIGBIVE1MVGVtcGxhdGVFbGVtZW50YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjgb7jgZ/jga8gSFRNTCDmloflrZfliJdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvVGVtcGxhdGVFbGVtZW50KHNyYzogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZCk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IGZyb20gPSAoc3RyOiBzdHJpbmcpOiBIVE1MVGVtcGxhdGVFbGVtZW50ID0+IHtcbiAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBzdHI7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9O1xuICAgIHJldHVybiAnc3RyaW5nJyA9PT0gdHlwZW9mIHNyYyA/IGZyb20oc3JjKSA6IHNyYz8uY2xvbmVOb2RlKHRydWUp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