/*!
 * @cdp/web-utils 0.9.11
 *   web domain utilities
 */

import { safe } from '@cdp/core-utils';
import { request } from '@cdp/ajax';

/** @internal */ const location = safe(globalThis.location);
/** @internal */ const document = safe(globalThis.document);

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
        const html = await request.text(url);
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

export { clearTemplateCache, getWebDirectory, loadTemplateSource, toUrl, webRoot };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXV0aWxzLm1qcyIsInNvdXJjZXMiOlsic3NyLnRzIiwid2ViLXJvb3QudHMiLCJ0ZW1wbGF0ZS1sb2FkZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2FmZSB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBsb2NhdGlvbiA9IHNhZmUoZ2xvYmFsVGhpcy5sb2NhdGlvbik7XG4vKiogQGludGVybmFsICovIGV4cG9ydCBjb25zdCBkb2N1bWVudCA9IHNhZmUoZ2xvYmFsVGhpcy5kb2N1bWVudCk7XG4iLCJpbXBvcnQgeyBsb2NhdGlvbiB9IGZyb20gJy4vc3NyJztcblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBkaXJlY3RvcnkgdG8gd2hpY2ggYHVybGAgYmVsb25ncy5cbiAqIEBqYSDmjIflrpogYHVybGAg44Gu5omA5bGe44GZ44KL44OH44Kj44Os44Kv44OI44Oq44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCB0YXJnZXQgVVJMXG4gKiAgLSBgamFgIOWvvuixoeOBriBVUkxcbiAqL1xuZXhwb3J0IGNvbnN0IGdldFdlYkRpcmVjdG9yeSA9ICh1cmw6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgbWF0Y2ggPSAvKC4rXFwvKShbXi9dKiNbXi9dKyk/Ly5leGVjKHVybCk7XG4gICAgcmV0dXJuIChtYXRjaCAmJiBtYXRjaFsxXSkgfHwgJyc7XG59O1xuXG4vKipcbiAqIEBlbiBBY2NzZXNzb3IgZm9yIFdlYiByb290IGxvY2F0aW9uIDxicj5cbiAqICAgICBPbmx5IHRoZSBicm93c2VyIGVudmlyb25tZW50IHdpbGwgYmUgYW4gYWxsb2NhdGluZyBwbGFjZSBpbiBpbmRleC5odG1sLCBhbmQgYmVjb21lcyBlZmZlY3RpdmUuXG4gKiBAamEgV2ViIHJvb3QgbG9jYXRpb24g44G444Gu44Ki44Kv44K744K5IDxicj5cbiAqICAgICBpbmRleC5odG1sIOOBrumFjee9ruWgtOaJgOOBqOOBquOCiuOAgeODluODqeOCpuOCtueSsOWig+OBruOBv+acieWKueOBqOOBquOCiy5cbiAqL1xuZXhwb3J0IGNvbnN0IHdlYlJvb3Q6IHN0cmluZyA9IGdldFdlYkRpcmVjdG9yeShsb2NhdGlvbi5ocmVmKTtcblxuLyoqXG4gKiBAZW4gQ29udmVydCB0byBhbiBhYnNvbHV0ZSB1cmwgc3RyaW5nIGlmIGdpdmVuIGEgcmVsYXRpdmUgcGF0aC4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++44OR44K544GM5oyH5a6a44GV44KM44Gm44GE44KL5aC05ZCI44Gv44CB57W25a++VVJM5paH5a2X5YiX44Gr5aSJ5o+bIDxicj5cbiAqICAgICBqcyDjga7phY3nva7jgavkvp3lrZjjgZnjgovjgZPjgajjgarjgY8gYGFzc2V0c2Ag44Ki44Kv44K744K544GX44Gf44GE44Go44GN44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjE4ODIxOC9yZWxhdGl2ZS1wYXRocy1pbi1qYXZhc2NyaXB0LWluLWFuLWV4dGVybmFsLWZpbGVcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBjb25zb2xlLmxvZyh0b1VybCgnL3Jlcy9kYXRhL2NvbGxlY3Rpb24uanNvbicpKTtcbiAqICAvLyBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcHAvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzZWVkXG4gKiAgLSBgZW5gIHNldCByZWxhdGl2ZSBwYXRoIGZyb20gW1t3ZWJSb290XV0uXG4gKiAgLSBgamFgIFtbd2ViUm9vdF1dIOOBi+OCieOBruebuOWvvuODkeOCueOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgdG9VcmwgPSAoc2VlZDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBpZiAoc2VlZD8uaW5jbHVkZXMoJzovLycpKSB7XG4gICAgICAgIHJldHVybiBzZWVkO1xuICAgIH0gZWxzZSBpZiAobnVsbCAhPSBzZWVkPy5bMF0pIHtcbiAgICAgICAgcmV0dXJuICgnLycgPT09IHNlZWRbMF0pID8gd2ViUm9vdCArIHNlZWQuc2xpY2UoMSkgOiB3ZWJSb290ICsgc2VlZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gd2ViUm9vdDtcbiAgICB9XG59O1xuIiwiaW1wb3J0IHsgcmVxdWVzdCB9IGZyb20gJ0BjZHAvYWpheCc7XG5pbXBvcnQgeyBkb2N1bWVudCB9IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRlbXBsYXRlUHJvdmlkZXIge1xuICAgIGZyYWdtZW50OiBEb2N1bWVudEZyYWdtZW50O1xuICAgIGh0bWw6IHN0cmluZztcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFRlbXBsYXRlUHJvdmlkZXJNYXAge1xuICAgIFt1cmw6IHN0cmluZ106IFRlbXBsYXRlUHJvdmlkZXI7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBUZW1wbGF0ZVNvdXJjZU1hcCB7XG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgSFRNTFRlbXBsYXRlRWxlbWVudDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqLyBsZXQgX21hcFByb3ZpZGVyOiBUZW1wbGF0ZVByb3ZpZGVyTWFwID0ge307XG4vKiogQGludGVybmFsICovIGxldCBfbWFwU291cmNlOiBUZW1wbGF0ZVNvdXJjZU1hcCA9IHt9O1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBxdWVyeVRlbXBsYXRlU291cmNlKHNlbGVjdG9yOiBzdHJpbmcsIHByb3ZpZGVyOiBUZW1wbGF0ZVByb3ZpZGVyIHwgbnVsbCwgY2FjaGU6IGJvb2xlYW4pOiBzdHJpbmcgfCBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB7IGZyYWdtZW50LCBodG1sIH0gPSBwcm92aWRlciB8fCB7fTtcbiAgICBjb25zdCBrZXkgPSBgJHtzZWxlY3Rvcn0ke2h0bWwgPyBgOjoke2h0bWx9YCA6ICcnfWA7XG4gICAgaWYgKF9tYXBTb3VyY2Vba2V5XSkge1xuICAgICAgICByZXR1cm4gX21hcFNvdXJjZVtrZXldO1xuICAgIH1cbiAgICBjb25zdCBjb250ZXh0ID0gZnJhZ21lbnQgfHwgZG9jdW1lbnQ7XG4gICAgY29uc3QgdGFyZ2V0ID0gY29udGV4dC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBjb25zdCBzb3VyY2UgPSB0YXJnZXQgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdGFyZ2V0IDogdGFyZ2V0Py5pbm5lckhUTUw7XG4gICAgY2FjaGUgJiYgc291cmNlICYmIChfbWFwU291cmNlW2tleV0gPSBzb3VyY2UpO1xuICAgIHJldHVybiBzb3VyY2U7XG59XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5VGVtcGxhdGVQcm92aWRlcih1cmw6IHN0cmluZyB8IHVuZGVmaW5lZCwgY2FjaGU6IGJvb2xlYW4pOiBQcm9taXNlPFRlbXBsYXRlUHJvdmlkZXIgfCBudWxsPiB7XG4gICAgaWYgKCF1cmwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChfbWFwUHJvdmlkZXJbdXJsXSkge1xuICAgICAgICByZXR1cm4gX21hcFByb3ZpZGVyW3VybF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgaHRtbCA9IGF3YWl0IHJlcXVlc3QudGV4dCh1cmwpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gdGVtcGxhdGUuY29udGVudDtcbiAgICAgICAgY29uc3QgcHJvdmlkZXIgPSB7IGZyYWdtZW50LCBodG1sOiBodG1sLnJlcGxhY2UoL1xccy9nbSwgJycpIH07XG4gICAgICAgIGNhY2hlICYmIGZyYWdtZW50ICYmIChfbWFwUHJvdmlkZXJbdXJsXSA9IHByb3ZpZGVyKTtcbiAgICAgICAgcmV0dXJuIHByb3ZpZGVyO1xuICAgIH1cbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIExvYWQgdGVtcGxhdGUgb3B0aW9ucy5cbiAqIEBqYSDjg63jg7zjg4njg4bjg7Pjg5fjg6zjg7zjg4jjgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2FkVGVtcGxhdGVPcHRpb25zIHtcbiAgICB1cmw/OiBzdHJpbmc7XG4gICAgY2FjaGU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEBlbiBDbGVhciB0ZW1wbGF0ZSdzIHJlc291cmNlcy5cbiAqIEBqYSDjg4bjg7Pjg5fjg6zjg7zjg4jjg6rjgr3jg7zjgrnjgq3jg6Pjg4Pjgrfjg6Xjga7liYrpmaRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyVGVtcGxhdGVDYWNoZSgpOiB2b2lkIHtcbiAgICBfbWFwUHJvdmlkZXIgPSB7fTtcbiAgICBfbWFwU291cmNlICAgPSB7fTtcbn1cblxuLyoqXG4gKiBAZW4gTG9hZCB0ZW1wbGF0ZSBzb3VyY2UuXG4gKiBAamEg44OG44Oz44OX44Os44O844OI44K944O844K544Gu44Ot44O844OJXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiAgLSBgZW5gIFRoZSBzZWxlY3RvciBzdHJpbmcgb2YgRE9NLlxuICogIC0gYGphYCBET00g44K744Os44Kv44K/5paH5a2X5YiXXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBsb2FkIG9wdGlvbnNcbiAqICAtIGBqYWAg44Ot44O844OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkVGVtcGxhdGVTb3VyY2Uoc2VsZWN0b3I6IHN0cmluZywgb3B0aW9ucz86IExvYWRUZW1wbGF0ZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZyB8IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCB7IHVybCwgY2FjaGUgfSA9IE9iamVjdC5hc3NpZ24oeyBjYWNoZTogdHJ1ZSB9LCBvcHRpb25zKTtcbiAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IHF1ZXJ5VGVtcGxhdGVQcm92aWRlcih1cmwsIGNhY2hlKTtcbiAgICByZXR1cm4gcXVlcnlUZW1wbGF0ZVNvdXJjZShzZWxlY3RvciwgcHJvdmlkZXIsIGNhY2hlKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUNBLGlCQUF3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ25FLGlCQUF3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQzs7QUNBbEU7Ozs7Ozs7QUFPRztBQUNVLE1BQUEsZUFBZSxHQUFHLENBQUMsR0FBVyxLQUFZO0lBQ25ELE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQyxPQUFPLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDckMsRUFBRTtBQUVGOzs7OztBQUtHO0FBQ1UsTUFBQSxPQUFPLEdBQVcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUU7QUFFOUQ7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCRztBQUNVLE1BQUEsS0FBSyxHQUFHLENBQUMsSUFBWSxLQUFZO0FBQzFDLElBQUEsSUFBSSxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQ3ZCLFFBQUEsT0FBTyxJQUFJLENBQUM7QUFDZixLQUFBO0FBQU0sU0FBQSxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUU7UUFDMUIsT0FBTyxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQztBQUN2RSxLQUFBO0FBQU0sU0FBQTtBQUNILFFBQUEsT0FBTyxPQUFPLENBQUM7QUFDbEIsS0FBQTtBQUNMOztBQy9CQSxpQkFBaUIsSUFBSSxZQUFZLEdBQXdCLEVBQUUsQ0FBQztBQUM1RCxpQkFBaUIsSUFBSSxVQUFVLEdBQXNCLEVBQUUsQ0FBQztBQUV4RDtBQUNBLFNBQVMsbUJBQW1CLENBQUMsUUFBZ0IsRUFBRSxRQUFpQyxFQUFFLEtBQWMsRUFBQTtJQUM1RixNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxHQUFHLFFBQVEsSUFBSSxFQUFFLENBQUM7QUFDMUMsSUFBQSxNQUFNLEdBQUcsR0FBRyxDQUFBLEVBQUcsUUFBUSxDQUFBLEVBQUcsSUFBSSxHQUFHLENBQUEsRUFBQSxFQUFLLElBQUksQ0FBRSxDQUFBLEdBQUcsRUFBRSxFQUFFLENBQUM7QUFDcEQsSUFBQSxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUNqQixRQUFBLE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzFCLEtBQUE7QUFDRCxJQUFBLE1BQU0sT0FBTyxHQUFHLFFBQVEsSUFBSSxRQUFRLENBQUM7SUFDckMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQyxJQUFBLE1BQU0sTUFBTSxHQUFHLE1BQU0sWUFBWSxtQkFBbUIsR0FBRyxNQUFNLEdBQUcsTUFBTSxFQUFFLFNBQVMsQ0FBQztJQUNsRixLQUFLLElBQUksTUFBTSxLQUFLLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztBQUM5QyxJQUFBLE9BQU8sTUFBTSxDQUFDO0FBQ2xCLENBQUM7QUFFRDtBQUNBLGVBQWUscUJBQXFCLENBQUMsR0FBdUIsRUFBRSxLQUFjLEVBQUE7SUFDeEUsSUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNOLFFBQUEsT0FBTyxJQUFJLENBQUM7QUFDZixLQUFBO0FBQ0QsSUFBQSxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUNuQixRQUFBLE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLEtBQUE7QUFBTSxTQUFBO1FBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDcEQsUUFBQSxRQUFRLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztBQUMxQixRQUFBLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7QUFDbEMsUUFBQSxNQUFNLFFBQVEsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUM5RCxLQUFLLElBQUksUUFBUSxLQUFLLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQztBQUNwRCxRQUFBLE9BQU8sUUFBUSxDQUFDO0FBQ25CLEtBQUE7QUFDTCxDQUFDO0FBYUQ7OztBQUdHO1NBQ2Esa0JBQWtCLEdBQUE7SUFDOUIsWUFBWSxHQUFHLEVBQUUsQ0FBQztJQUNsQixVQUFVLEdBQUssRUFBRSxDQUFDO0FBQ3RCLENBQUM7QUFFRDs7Ozs7Ozs7OztBQVVHO0FBQ0ksZUFBZSxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLE9BQTZCLEVBQUE7QUFDcEYsSUFBQSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekQsT0FBTyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzFEOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC93ZWItdXRpbHMvIn0=
