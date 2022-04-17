/*!
 * @cdp/web-utils 0.9.11
 *   web domain utilities
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/ajax')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/ajax'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, ajax) { 'use strict';

    /** @internal */ const location = coreUtils.safe(globalThis.location);
    /** @internal */ const document = coreUtils.safe(globalThis.document);

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
    const webRoot = getWebDirectory(location.href);
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
        const { url, cache } = Object.assign({ cache: true }, options);
        const provider = await queryTemplateProvider(url, cache);
        return queryTemplateSource(selector, provider, cache);
    }

    exports.clearTemplateCache = clearTemplateCache;
    exports.getWebDirectory = getWebDirectory;
    exports.loadTemplateSource = loadTemplateSource;
    exports.toUrl = toUrl;
    exports.webRoot = webRoot;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXV0aWxzLmpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ3ZWItcm9vdC50cyIsInRlbXBsYXRlLWxvYWRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGxvY2F0aW9uID0gc2FmZShnbG9iYWxUaGlzLmxvY2F0aW9uKTtcbi8qKiBAaW50ZXJuYWwgKi8gZXhwb3J0IGNvbnN0IGRvY3VtZW50ID0gc2FmZShnbG9iYWxUaGlzLmRvY3VtZW50KTtcbiIsImltcG9ydCB7IGxvY2F0aW9uIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGRpcmVjdG9yeSB0byB3aGljaCBgdXJsYCBiZWxvbmdzLlxuICogQGphIOaMh+WumiBgdXJsYCDjga7miYDlsZ7jgZnjgovjg4fjgqPjg6zjgq/jg4jjg6rjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIHRhcmdldCBVUkxcbiAqICAtIGBqYWAg5a++6LGh44GuIFVSTFxuICovXG5leHBvcnQgY29uc3QgZ2V0V2ViRGlyZWN0b3J5ID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBtYXRjaCA9IC8oLitcXC8pKFteL10qI1teL10rKT8vLmV4ZWModXJsKTtcbiAgICByZXR1cm4gKG1hdGNoICYmIG1hdGNoWzFdKSB8fCAnJztcbn07XG5cbi8qKlxuICogQGVuIEFjY3Nlc3NvciBmb3IgV2ViIHJvb3QgbG9jYXRpb24gPGJyPlxuICogICAgIE9ubHkgdGhlIGJyb3dzZXIgZW52aXJvbm1lbnQgd2lsbCBiZSBhbiBhbGxvY2F0aW5nIHBsYWNlIGluIGluZGV4Lmh0bWwsIGFuZCBiZWNvbWVzIGVmZmVjdGl2ZS5cbiAqIEBqYSBXZWIgcm9vdCBsb2NhdGlvbiDjgbjjga7jgqLjgq/jgrvjgrkgPGJyPlxuICogICAgIGluZGV4Lmh0bWwg44Gu6YWN572u5aC05omA44Go44Gq44KK44CB44OW44Op44Km44K255Kw5aKD44Gu44G/5pyJ5Yq544Go44Gq44KLLlxuICovXG5leHBvcnQgY29uc3Qgd2ViUm9vdDogc3RyaW5nID0gZ2V0V2ViRGlyZWN0b3J5KGxvY2F0aW9uLmhyZWYpO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0IHRvIGFuIGFic29sdXRlIHVybCBzdHJpbmcgaWYgZ2l2ZW4gYSByZWxhdGl2ZSBwYXRoLiA8YnI+XG4gKiAgICAgSWYgeW91IHdhbnQgdG8gYWNjZXNzIHRvIEFzc2V0cyBhbmQgaW4gc3BpdGUgb2YgdGhlIHNjcmlwdCBsb2NhdGlvbiwgdGhlIGZ1bmN0aW9uIGlzIGF2YWlsYWJsZS5cbiAqIEBqYSDnm7jlr77jg5HjgrnjgYzmjIflrprjgZXjgozjgabjgYTjgovloLTlkIjjga/jgIHntbblr75VUkzmloflrZfliJfjgavlpInmj5sgPGJyPlxuICogICAgIGpzIOOBrumFjee9ruOBq+S+neWtmOOBmeOCi+OBk+OBqOOBquOBjyBgYXNzZXRzYCDjgqLjgq/jgrvjgrnjgZfjgZ/jgYTjgajjgY3jgavkvb/nlKjjgZnjgosuXG4gKlxuICogQHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMTg4MjE4L3JlbGF0aXZlLXBhdGhzLWluLWphdmFzY3JpcHQtaW4tYW4tZXh0ZXJuYWwtZmlsZVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogIGNvbnNvbGUubG9nKHRvVXJsKCcvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uJykpO1xuICogIC8vIFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwL2FwcC9yZXMvZGF0YS9jb2xsZWN0aW9uLmpzb25cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHNlZWRcbiAqICAtIGBlbmAgc2V0IHJlbGF0aXZlIHBhdGggZnJvbSBbW3dlYlJvb3RdXS5cbiAqICAtIGBqYWAgW1t3ZWJSb290XV0g44GL44KJ44Gu55u45a++44OR44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1VybCA9IChzZWVkOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChzZWVkPy5pbmNsdWRlcygnOi8vJykpIHtcbiAgICAgICAgcmV0dXJuIHNlZWQ7XG4gICAgfSBlbHNlIGlmIChudWxsICE9IHNlZWQ/LlswXSkge1xuICAgICAgICByZXR1cm4gKCcvJyA9PT0gc2VlZFswXSkgPyB3ZWJSb290ICsgc2VlZC5zbGljZSgxKSA6IHdlYlJvb3QgKyBzZWVkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB3ZWJSb290O1xuICAgIH1cbn07XG4iLCJpbXBvcnQgeyByZXF1ZXN0IH0gZnJvbSAnQGNkcC9hamF4JztcbmltcG9ydCB7IGRvY3VtZW50IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgVGVtcGxhdGVQcm92aWRlciB7XG4gICAgZnJhZ21lbnQ6IERvY3VtZW50RnJhZ21lbnQ7XG4gICAgaHRtbDogc3RyaW5nO1xufVxuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgVGVtcGxhdGVQcm92aWRlck1hcCB7XG4gICAgW3VybDogc3RyaW5nXTogVGVtcGxhdGVQcm92aWRlcjtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRlbXBsYXRlU291cmNlTWFwIHtcbiAgICBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50O1xufVxuXG4vKiogQGludGVybmFsICovIGxldCBfbWFwUHJvdmlkZXI6IFRlbXBsYXRlUHJvdmlkZXJNYXAgPSB7fTtcbi8qKiBAaW50ZXJuYWwgKi8gbGV0IF9tYXBTb3VyY2U6IFRlbXBsYXRlU291cmNlTWFwID0ge307XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIHF1ZXJ5VGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3I6IHN0cmluZywgcHJvdmlkZXI6IFRlbXBsYXRlUHJvdmlkZXIgfCBudWxsLCBjYWNoZTogYm9vbGVhbik6IHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHsgZnJhZ21lbnQsIGh0bWwgfSA9IHByb3ZpZGVyIHx8IHt9O1xuICAgIGNvbnN0IGtleSA9IGAke3NlbGVjdG9yfSR7aHRtbCA/IGA6OiR7aHRtbH1gIDogJyd9YDtcbiAgICBpZiAoX21hcFNvdXJjZVtrZXldKSB7XG4gICAgICAgIHJldHVybiBfbWFwU291cmNlW2tleV07XG4gICAgfVxuICAgIGNvbnN0IGNvbnRleHQgPSBmcmFnbWVudCB8fCBkb2N1bWVudDtcbiAgICBjb25zdCB0YXJnZXQgPSBjb250ZXh0LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgIGNvbnN0IHNvdXJjZSA9IHRhcmdldCBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0YXJnZXQgOiB0YXJnZXQ/LmlubmVySFRNTDtcbiAgICBjYWNoZSAmJiBzb3VyY2UgJiYgKF9tYXBTb3VyY2Vba2V5XSA9IHNvdXJjZSk7XG4gICAgcmV0dXJuIHNvdXJjZTtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuYXN5bmMgZnVuY3Rpb24gcXVlcnlUZW1wbGF0ZVByb3ZpZGVyKHVybDogc3RyaW5nIHwgdW5kZWZpbmVkLCBjYWNoZTogYm9vbGVhbik6IFByb21pc2U8VGVtcGxhdGVQcm92aWRlciB8IG51bGw+IHtcbiAgICBpZiAoIXVybCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKF9tYXBQcm92aWRlclt1cmxdKSB7XG4gICAgICAgIHJldHVybiBfbWFwUHJvdmlkZXJbdXJsXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBodG1sID0gYXdhaXQgcmVxdWVzdC50ZXh0KHVybCk7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgY29uc3QgZnJhZ21lbnQgPSB0ZW1wbGF0ZS5jb250ZW50O1xuICAgICAgICBjb25zdCBwcm92aWRlciA9IHsgZnJhZ21lbnQsIGh0bWw6IGh0bWwucmVwbGFjZSgvXFxzL2dtLCAnJykgfTtcbiAgICAgICAgY2FjaGUgJiYgZnJhZ21lbnQgJiYgKF9tYXBQcm92aWRlclt1cmxdID0gcHJvdmlkZXIpO1xuICAgICAgICByZXR1cm4gcHJvdmlkZXI7XG4gICAgfVxufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gTG9hZCB0ZW1wbGF0ZSBvcHRpb25zLlxuICogQGphIOODreODvOODieODhuODs+ODl+ODrOODvOODiOOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIExvYWRUZW1wbGF0ZU9wdGlvbnMge1xuICAgIHVybD86IHN0cmluZztcbiAgICBjYWNoZT86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGVuIENsZWFyIHRlbXBsYXRlJ3MgcmVzb3VyY2VzLlxuICogQGphIOODhuODs+ODl+ODrOODvOODiOODquOCveODvOOCueOCreODo+ODg+OCt+ODpeOBruWJiumZpFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJUZW1wbGF0ZUNhY2hlKCk6IHZvaWQge1xuICAgIF9tYXBQcm92aWRlciA9IHt9O1xuICAgIF9tYXBTb3VyY2UgICA9IHt9O1xufVxuXG4vKipcbiAqIEBlbiBMb2FkIHRlbXBsYXRlIHNvdXJjZS5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjgr3jg7zjgrnjga7jg63jg7zjg4lcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqICAtIGBlbmAgVGhlIHNlbGVjdG9yIHN0cmluZyBvZiBET00uXG4gKiAgLSBgamFgIERPTSDjgrvjg6zjgq/jgr/mloflrZfliJdcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIGxvYWQgb3B0aW9uc1xuICogIC0gYGphYCDjg63jg7zjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUZW1wbGF0ZVNvdXJjZShzZWxlY3Rvcjogc3RyaW5nLCBvcHRpb25zPzogTG9hZFRlbXBsYXRlT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZD4ge1xuICAgIGNvbnN0IHsgdXJsLCBjYWNoZSB9ID0gT2JqZWN0LmFzc2lnbih7IGNhY2hlOiB0cnVlIH0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IHByb3ZpZGVyID0gYXdhaXQgcXVlcnlUZW1wbGF0ZVByb3ZpZGVyKHVybCwgY2FjaGUpO1xuICAgIHJldHVybiBxdWVyeVRlbXBsYXRlU291cmNlKHNlbGVjdG9yLCBwcm92aWRlciwgY2FjaGUpO1xufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJyZXF1ZXN0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUNBLGlCQUF3QixNQUFNLFFBQVEsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuRSxpQkFBd0IsTUFBTSxRQUFRLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDOztJQ0FsRTs7Ozs7OztJQU9HO0FBQ1UsVUFBQSxlQUFlLEdBQUcsQ0FBQyxHQUFXLEtBQVk7UUFDbkQsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQyxFQUFFO0lBRUY7Ozs7O0lBS0c7QUFDVSxVQUFBLE9BQU8sR0FBVyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtJQUU5RDs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBa0JHO0FBQ1UsVUFBQSxLQUFLLEdBQUcsQ0FBQyxJQUFZLEtBQVk7SUFDMUMsSUFBQSxJQUFJLElBQUksRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7SUFDdkIsUUFBQSxPQUFPLElBQUksQ0FBQztJQUNmLEtBQUE7SUFBTSxTQUFBLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsRUFBRTtZQUMxQixPQUFPLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ3ZFLEtBQUE7SUFBTSxTQUFBO0lBQ0gsUUFBQSxPQUFPLE9BQU8sQ0FBQztJQUNsQixLQUFBO0lBQ0w7O0lDL0JBLGlCQUFpQixJQUFJLFlBQVksR0FBd0IsRUFBRSxDQUFDO0lBQzVELGlCQUFpQixJQUFJLFVBQVUsR0FBc0IsRUFBRSxDQUFDO0lBRXhEO0lBQ0EsU0FBUyxtQkFBbUIsQ0FBQyxRQUFnQixFQUFFLFFBQWlDLEVBQUUsS0FBYyxFQUFBO1FBQzVGLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsUUFBUSxJQUFJLEVBQUUsQ0FBQztJQUMxQyxJQUFBLE1BQU0sR0FBRyxHQUFHLENBQUEsRUFBRyxRQUFRLENBQUEsRUFBRyxJQUFJLEdBQUcsQ0FBQSxFQUFBLEVBQUssSUFBSSxDQUFFLENBQUEsR0FBRyxFQUFFLEVBQUUsQ0FBQztJQUNwRCxJQUFBLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2pCLFFBQUEsT0FBTyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDMUIsS0FBQTtJQUNELElBQUEsTUFBTSxPQUFPLEdBQUcsUUFBUSxJQUFJLFFBQVEsQ0FBQztRQUNyQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQy9DLElBQUEsTUFBTSxNQUFNLEdBQUcsTUFBTSxZQUFZLG1CQUFtQixHQUFHLE1BQU0sR0FBRyxNQUFNLEVBQUUsU0FBUyxDQUFDO1FBQ2xGLEtBQUssSUFBSSxNQUFNLEtBQUssVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLElBQUEsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUVEO0lBQ0EsZUFBZSxxQkFBcUIsQ0FBQyxHQUF1QixFQUFFLEtBQWMsRUFBQTtRQUN4RSxJQUFJLENBQUMsR0FBRyxFQUFFO0lBQ04sUUFBQSxPQUFPLElBQUksQ0FBQztJQUNmLEtBQUE7SUFDRCxJQUFBLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ25CLFFBQUEsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUIsS0FBQTtJQUFNLFNBQUE7WUFDSCxNQUFNLElBQUksR0FBRyxNQUFNQyxZQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDcEQsUUFBQSxRQUFRLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztJQUMxQixRQUFBLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7SUFDbEMsUUFBQSxNQUFNLFFBQVEsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUM5RCxLQUFLLElBQUksUUFBUSxLQUFLLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQztJQUNwRCxRQUFBLE9BQU8sUUFBUSxDQUFDO0lBQ25CLEtBQUE7SUFDTCxDQUFDO0lBYUQ7OztJQUdHO2FBQ2Esa0JBQWtCLEdBQUE7UUFDOUIsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUNsQixVQUFVLEdBQUssRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7Ozs7Ozs7OztJQVVHO0lBQ0ksZUFBZSxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLE9BQTZCLEVBQUE7SUFDcEYsSUFBQSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsT0FBTyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFEOzs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvd2ViLXV0aWxzLyJ9
