/*!
 * @cdp/environment 0.9.0
 *   environment resolver module
 */

import { safe, getGlobal } from '@cdp/core-utils';

/*
 * SSR (Server Side Rendering) 環境においてもオブジェクト等の存在を保証する
 */
/** @internal */
const _location = safe(globalThis.location);
/** @internal */
const _navigator = safe(globalThis.navigator);
/** @internal */
const _screen = safe(globalThis.screen);
/** @internal */
const _devicePixelRatio = safe(globalThis.devicePixelRatio);

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
const webRoot = getWebDirectory(_location.href);
/**
 * @en Converter from relative path to absolute url string. <br>
 *     If you want to access to Assets and in spite of the script location, the function is available.
 * @ja 相対 path を絶対 URL に変換 <br>
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
 * @param path
 *  - `en` set relative path from [[webRoot]].
 *  - `ja` [[webRoot]] からの相対パスを指定
 */
const toUrl = (path) => {
    if (null != path && null != path[0]) {
        return ('/' === path[0]) ? webRoot + path.slice(1) : webRoot + path;
    }
    else {
        return webRoot;
    }
};

/* eslint-disable
   space-in-parens
 , @typescript-eslint/no-explicit-any
 */
//__________________________________________________________________________________________________//
const deviceContext = {
    navigator: _navigator,
    screen: _screen,
    devicePixelRatio: _devicePixelRatio,
};
const maybeTablet = (width, height) => {
    return (600 /* TABLET_MIN_WIDTH */ <= Math.min(width, height));
};
const supportTouch = () => {
    return !!((_navigator.maxTouchPoints > 0) || ('ontouchstart' in globalThis));
};
const supportOrientation = (ua) => {
    return ('orientation' in globalThis) || (0 <= ua.indexOf('Windows Phone'));
};
/**
 * @en Query platform information.
 * @ja プラットフォーム情報の取得
 *
 * @param context
 *  - `en` given `Navigator`, `Screen`, `devicePixelRatio` information.
 *  - `ja` 環境の `Navigator`, `Screen`, `devicePixelRatio` を指定
 */
const queryPlatform = (context = deviceContext) => {
    const info = {
        ios: false,
        android: false,
        androidChrome: false,
        desktop: false,
        mobile: false,
        phone: false,
        tablet: false,
        iphone: false,
        iphoneX: false,
        ipod: false,
        ipad: false,
        edge: false,
        ie: false,
        firefox: false,
        macos: false,
        windows: false,
        cordova: !!getGlobal().cordova,
        electron: false,
    };
    const { userAgent: ua, platform: os, standalone } = context.navigator || _navigator;
    const { width: screenWidth, height: screenHeight } = context.screen || _screen;
    const pixelRatio = context.devicePixelRatio;
    const android = /(Android);?[\s/]+([\d.]+)?/.exec(ua);
    let ipad = /(iPad).*OS\s([\d_]+)/.exec(ua);
    const ipod = /(iPod)(.*OS\s([\d_]+))?/.exec(ua);
    let iphone = !ipad && /(iPhone\sOS|iOS)\s([\d_]+)/.exec(ua);
    const ie = 0 <= ua.indexOf('MSIE ') || 0 <= ua.indexOf('Trident/');
    const edge = 0 <= ua.indexOf('Edge/');
    const firefox = 0 <= ua.indexOf('Gecko/') && 0 <= ua.indexOf('Firefox/');
    const windows = 'Win32' === os;
    let macos = 'MacIntel' === os;
    const electron = ua.toLowerCase().startsWith('electron');
    // iPhone(X) / iPad(Pro)Desktop Mode
    if (!iphone && !ipad
        && macos
        && supportTouch()
        && (undefined !== standalone
        //            (1024 === screenWidth && 1366 === screenHeight) // Pro 12.9 portrait
        //         || (1366 === screenWidth && 1024 === screenHeight) // Pro 12.9 landscape
        //         || ( 834 === screenWidth && 1194 === screenHeight) // Pro 11 portrait
        //         || (1194 === screenWidth &&  834 === screenHeight) // Pro 11 landscape
        //         || ( 834 === screenWidth && 1112 === screenHeight) // Pro 10.5 portrait
        //         || (1112 === screenWidth &&  834 === screenHeight) // Pro 10.5 landscape
        //         || ( 768 === screenWidth && 1024 === screenHeight) // other portrait
        //         || (1024 === screenWidth &&  768 === screenHeight) // other landscape
        )) {
        const regex = /(Version)\/([\d.]+)/.exec(ua);
        if (maybeTablet(screenWidth, screenHeight)) {
            ipad = regex;
        }
        else {
            iphone = regex;
        }
        macos = false;
    }
    info.ie = ie;
    info.edge = edge;
    info.firefox = firefox;
    // Android
    if (android && !windows) {
        info.os = 'android';
        info.osVersion = android[2];
        info.android = true;
        info.androidChrome = 0 <= ua.toLowerCase().indexOf('chrome');
        if (0 <= ua.indexOf('Mobile')) {
            info.phone = true;
        }
        else {
            info.tablet = true;
        }
    }
    if (ipad || iphone || ipod) {
        info.os = 'ios';
        info.ios = true;
    }
    // iOS
    if (iphone && !ipod) {
        info.osVersion = iphone[2].replace(/_/g, '.');
        info.phone = true;
        info.iphone = true;
        // iPhone X
        if ((375 === screenWidth && 812 === screenHeight) // X, XS portrait
            || (812 === screenWidth && 375 === screenHeight) // X, XS landscape
            || (414 === screenWidth && 896 === screenHeight) // XS Max, XR portrait
            || (896 === screenWidth && 414 === screenHeight) // XS Max, XR landscape
        ) {
            info.iphoneX = true;
        }
    }
    if (ipad) {
        info.osVersion = ipad[2].replace(/_/g, '.');
        info.tablet = true;
        info.ipad = true;
    }
    if (ipod) {
        info.osVersion = ipod[3] ? ipod[3].replace(/_/g, '.') : null;
        info.phone = true;
        info.ipod = true;
    }
    // Desktop
    info.desktop = !supportOrientation(ua);
    if (info.desktop) {
        info.electron = electron;
        info.macos = macos;
        info.windows = windows;
        info.macos && (info.os = 'macos');
        info.windows && (info.os = 'windows');
    }
    // Mobile
    info.mobile = !info.desktop;
    if (info.mobile && !info.phone && !info.tablet) {
        if (maybeTablet(screenWidth, screenHeight)) {
            info.tablet = true;
        }
        else {
            info.phone = true;
        }
    }
    // Pixel Ratio
    info.pixelRatio = pixelRatio || 1;
    return info;
};
/**
 * @en Platform information on runtime.
 * @ja ランタイムのプラットフォーム情報
 */
const platform = queryPlatform();

export { getWebDirectory, platform, queryPlatform, toUrl, webRoot };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQubWpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ3ZWIudHMiLCJwbGF0Zm9ybS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLypcbiAqIFNTUiAoU2VydmVyIFNpZGUgUmVuZGVyaW5nKSDnkrDlooPjgavjgYrjgYTjgabjgoLjgqrjg5bjgrjjgqfjgq/jg4jnrYnjga7lrZjlnKjjgpLkv53oqLzjgZnjgotcbiAqL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbG9jYXRpb24gICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5sb2NhdGlvbik7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfbmF2aWdhdG9yICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5uYXZpZ2F0b3IpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3NjcmVlbiAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuc2NyZWVuKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9kZXZpY2VQaXhlbFJhdGlvID0gc2FmZShnbG9iYWxUaGlzLmRldmljZVBpeGVsUmF0aW8pO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQge1xuICAgIF9sb2NhdGlvbiBhcyBsb2NhdGlvbixcbiAgICBfbmF2aWdhdG9yIGFzIG5hdmlnYXRvcixcbiAgICBfc2NyZWVuIGFzIHNjcmVlbixcbiAgICBfZGV2aWNlUGl4ZWxSYXRpbyBhcyBkZXZpY2VQaXhlbFJhdGlvLFxufTtcbiIsImltcG9ydCB7IGxvY2F0aW9uIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGRpcmVjdG9yeSB0byB3aGljaCBgdXJsYCBiZWxvbmdzLlxuICogQGphIOaMh+WumiBgdXJsYCDjga7miYDlsZ7jgZnjgovjg4fjgqPjg6zjgq/jg4jjg6rjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIHRhcmdldCBVUkxcbiAqICAtIGBqYWAg5a++6LGh44GuIFVSTFxuICovXG5leHBvcnQgY29uc3QgZ2V0V2ViRGlyZWN0b3J5ID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBtYXRjaCA9IC8oLitcXC8pKFteL10qI1teL10rKT8vLmV4ZWModXJsKTtcbiAgICByZXR1cm4gKG1hdGNoICYmIG1hdGNoWzFdKSB8fCAnJztcbn07XG5cbi8qKlxuICogQGVuIEFjY3Nlc3NvciBmb3IgV2ViIHJvb3QgbG9jYXRpb24gPGJyPlxuICogICAgIE9ubHkgdGhlIGJyb3dzZXIgZW52aXJvbm1lbnQgd2lsbCBiZSBhbiBhbGxvY2F0aW5nIHBsYWNlIGluIGluZGV4Lmh0bWwsIGFuZCBiZWNvbWVzIGVmZmVjdGl2ZS5cbiAqIEBqYSBXZWIgcm9vdCBsb2NhdGlvbiDjgbjjga7jgqLjgq/jgrvjgrkgPGJyPlxuICogICAgIGluZGV4Lmh0bWwg44Gu6YWN572u5aC05omA44Go44Gq44KK44CB44OW44Op44Km44K255Kw5aKD44Gu44G/5pyJ5Yq544Go44Gq44KLLlxuICovXG5leHBvcnQgY29uc3Qgd2ViUm9vdDogc3RyaW5nID0gZ2V0V2ViRGlyZWN0b3J5KGxvY2F0aW9uLmhyZWYpO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0ZXIgZnJvbSByZWxhdGl2ZSBwYXRoIHRvIGFic29sdXRlIHVybCBzdHJpbmcuIDxicj5cbiAqICAgICBJZiB5b3Ugd2FudCB0byBhY2Nlc3MgdG8gQXNzZXRzIGFuZCBpbiBzcGl0ZSBvZiB0aGUgc2NyaXB0IGxvY2F0aW9uLCB0aGUgZnVuY3Rpb24gaXMgYXZhaWxhYmxlLlxuICogQGphIOebuOWvviBwYXRoIOOCkue1tuWvviBVUkwg44Gr5aSJ5o+bIDxicj5cbiAqICAgICBqcyDjga7phY3nva7jgavkvp3lrZjjgZnjgovjgZPjgajjgarjgY8gYGFzc2V0c2Ag44Ki44Kv44K744K544GX44Gf44GE44Go44GN44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjE4ODIxOC9yZWxhdGl2ZS1wYXRocy1pbi1qYXZhc2NyaXB0LWluLWFuLWV4dGVybmFsLWZpbGVcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBjb25zb2xlLmxvZyh0b1VybCgnL3Jlcy9kYXRhL2NvbGxlY3Rpb24uanNvbicpKTtcbiAqICAvLyBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcHAvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwYXRoXG4gKiAgLSBgZW5gIHNldCByZWxhdGl2ZSBwYXRoIGZyb20gW1t3ZWJSb290XV0uXG4gKiAgLSBgamFgIFtbd2ViUm9vdF1dIOOBi+OCieOBruebuOWvvuODkeOCueOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgdG9VcmwgPSAocGF0aDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBpZiAobnVsbCAhPSBwYXRoICYmIG51bGwgIT0gcGF0aFswXSkge1xuICAgICAgICByZXR1cm4gKCcvJyA9PT0gcGF0aFswXSkgPyB3ZWJSb290ICsgcGF0aC5zbGljZSgxKSA6IHdlYlJvb3QgKyBwYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB3ZWJSb290O1xuICAgIH1cbn07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgc3BhY2UtaW4tcGFyZW5zXG4gLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHsgV3JpdGFibGUsIGdldEdsb2JhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIG5hdmlnYXRvcixcbiAgICBzY3JlZW4sXG4gICAgZGV2aWNlUGl4ZWxSYXRpbyxcbn0gZnJvbSAnLi9zc3InO1xuXG5jb25zdCBlbnVtIFRocmVzaG9sZCB7XG4gICAgVEFCTEVUX01JTl9XSURUSCA9IDYwMCwgLy8gZmFsbGJhY2sgZGV0ZWN0aW9uIHZhbHVlXG59XG5cbi8qKlxuICogQGVuIFBsYXRmb3JtIGluZm9ybWF0aW9uLlxuICogQGphIOODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgsVxuICpcbiAqIEBzZWVcbiAqICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS91dGlscy9pbmZvLmpzXG4gKiAgLSBodHRwczovL2dpdGh1Yi5jb20vT25zZW5VSS9PbnNlblVJL2Jsb2IvbWFzdGVyL2NvcmUvc3JjL29ucy9wbGF0Zm9ybS5qc1xuICogIC0gaHR0cHM6Ly93d3cuYml0LWhpdmUuY29tL2FydGljbGVzLzIwMTkwODIwXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGxhdGZvcm0ge1xuICAgIC8qKiB0cnVlIGZvciBpT1MgaW5mbyAqL1xuICAgIHJlYWRvbmx5IGlvczogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgQW5kcm9pZCBpbmZvICovXG4gICAgcmVhZG9ubHkgYW5kcm9pZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgQW5kcm9pZCBDaHJvbWUgKi9cbiAgICByZWFkb25seSBhbmRyb2lkQ2hyb21lOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIGJyb3dzZXIgKi9cbiAgICByZWFkb25seSBkZXNrdG9wOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBtb2JpbGUgaW5mbyAqL1xuICAgIHJlYWRvbmx5IG1vYmlsZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3Igc21hcnQgcGhvbmUgKGluY2x1ZGluZyBpUG9kKSBpbmZvICovXG4gICAgcmVhZG9ubHkgcGhvbmU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIHRhYmxldCBpbmZvICovXG4gICAgcmVhZG9ubHkgdGFibGV0OiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGhvbmUgKi9cbiAgICByZWFkb25seSBpcGhvbmU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQaG9uZVggKi9cbiAgICByZWFkb25seSBpcGhvbmVYOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUG9kICovXG4gICAgcmVhZG9ubHkgaXBvZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBhZCAqL1xuICAgIHJlYWRvbmx5IGlwYWQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIE1TIEVkZ2UgYnJvd3NlciAqL1xuICAgIHJlYWRvbmx5IGVkZ2U6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEludGVybmV0IEV4cGxvcmVyIGJyb3dzZXIqL1xuICAgIHJlYWRvbmx5IGllOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBGaXJlRm94IGJyb3dzZXIqL1xuICAgIHJlYWRvbmx5IGZpcmVmb3g6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgTWFjT1MgKi9cbiAgICByZWFkb25seSBtYWNvczogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBXaW5kb3dzICovXG4gICAgcmVhZG9ubHkgd2luZG93czogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSB3aGVuIGFwcCBydW5uaW5nIGluIGNvcmRvdmEgZW52aXJvbm1lbnQgKi9cbiAgICByZWFkb25seSBjb3Jkb3ZhOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIHdoZW4gYXBwIHJ1bm5pbmcgaW4gZWxlY3Ryb24gZW52aXJvbm1lbnQgKi9cbiAgICByZWFkb25seSBlbGVjdHJvbjogYm9vbGVhbjtcbiAgICAvKiogQ29udGFpbnMgT1MgY2FuIGJlIGlvcywgYW5kcm9pZCBvciB3aW5kb3dzIChmb3IgV2luZG93cyBQaG9uZSkgKi9cbiAgICByZWFkb25seSBvczogc3RyaW5nO1xuICAgIC8qKiBDb250YWlucyBPUyB2ZXJzaW9uLCBlLmcuIDExLjIuMCAqL1xuICAgIHJlYWRvbmx5IG9zVmVyc2lvbjogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZDtcbiAgICAvKiogRGV2aWNlIHBpeGVsIHJhdGlvICovXG4gICAgcmVhZG9ubHkgcGl4ZWxSYXRpbzogbnVtYmVyO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuY29uc3QgZGV2aWNlQ29udGV4dCA9IHtcbiAgICBuYXZpZ2F0b3IsXG4gICAgc2NyZWVuLFxuICAgIGRldmljZVBpeGVsUmF0aW8sXG59O1xuXG5jb25zdCBtYXliZVRhYmxldCA9ICh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAoVGhyZXNob2xkLlRBQkxFVF9NSU5fV0lEVEggPD0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkpO1xufTtcblxuY29uc3Qgc3VwcG9ydFRvdWNoID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAhISgobmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGdsb2JhbFRoaXMpKTtcbn07XG5cbmNvbnN0IHN1cHBvcnRPcmllbnRhdGlvbiA9ICh1YTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICgnb3JpZW50YXRpb24nIGluIGdsb2JhbFRoaXMpIHx8ICgwIDw9IHVhLmluZGV4T2YoJ1dpbmRvd3MgUGhvbmUnKSk7XG59O1xuXG4vKipcbiAqIEBlbiBRdWVyeSBwbGF0Zm9ybSBpbmZvcm1hdGlvbi5cbiAqIEBqYSDjg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLHjga7lj5blvpdcbiAqXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBnaXZlbiBgTmF2aWdhdG9yYCwgYFNjcmVlbmAsIGBkZXZpY2VQaXhlbFJhdGlvYCBpbmZvcm1hdGlvbi5cbiAqICAtIGBqYWAg55Kw5aKD44GuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIOOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgcXVlcnlQbGF0Zm9ybSA9IChcbiAgICBjb250ZXh0OiB7XG4gICAgICAgIG5hdmlnYXRvcj86IHsgdXNlckFnZW50OiBzdHJpbmc7IHBsYXRmb3JtOiBzdHJpbmc7IHN0YW5kYWxvbmU/OiBib29sZWFuOyB9O1xuICAgICAgICBzY3JlZW4/OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyOyB9O1xuICAgICAgICBkZXZpY2VQaXhlbFJhdGlvPzogbnVtYmVyO1xuICAgIH0gPSBkZXZpY2VDb250ZXh0XG4pOiBQbGF0Zm9ybSA9PiB7XG4gICAgY29uc3QgaW5mbyA9IHtcbiAgICAgICAgaW9zOiBmYWxzZSxcbiAgICAgICAgYW5kcm9pZDogZmFsc2UsXG4gICAgICAgIGFuZHJvaWRDaHJvbWU6IGZhbHNlLFxuICAgICAgICBkZXNrdG9wOiBmYWxzZSxcbiAgICAgICAgbW9iaWxlOiBmYWxzZSxcbiAgICAgICAgcGhvbmU6IGZhbHNlLFxuICAgICAgICB0YWJsZXQ6IGZhbHNlLFxuICAgICAgICBpcGhvbmU6IGZhbHNlLFxuICAgICAgICBpcGhvbmVYOiBmYWxzZSxcbiAgICAgICAgaXBvZDogZmFsc2UsXG4gICAgICAgIGlwYWQ6IGZhbHNlLFxuICAgICAgICBlZGdlOiBmYWxzZSxcbiAgICAgICAgaWU6IGZhbHNlLFxuICAgICAgICBmaXJlZm94OiBmYWxzZSxcbiAgICAgICAgbWFjb3M6IGZhbHNlLFxuICAgICAgICB3aW5kb3dzOiBmYWxzZSxcbiAgICAgICAgY29yZG92YTogISEoZ2V0R2xvYmFsKCkgYXMgYW55KS5jb3Jkb3ZhLFxuICAgICAgICBlbGVjdHJvbjogZmFsc2UsXG4gICAgfSBhcyBhbnkgYXMgV3JpdGFibGU8UGxhdGZvcm0+O1xuXG4gICAgY29uc3QgeyB1c2VyQWdlbnQ6IHVhLCBwbGF0Zm9ybTogb3MsIHN0YW5kYWxvbmUgfSA9IGNvbnRleHQubmF2aWdhdG9yIHx8IG5hdmlnYXRvciBhcyB7IHVzZXJBZ2VudDogc3RyaW5nOyBwbGF0Zm9ybTogc3RyaW5nOyBzdGFuZGFsb25lPzogYm9vbGVhbjsgfTtcbiAgICBjb25zdCB7IHdpZHRoOiBzY3JlZW5XaWR0aCwgaGVpZ2h0OiBzY3JlZW5IZWlnaHQgfSA9IGNvbnRleHQuc2NyZWVuIHx8IHNjcmVlbjtcbiAgICBjb25zdCBwaXhlbFJhdGlvID0gY29udGV4dC5kZXZpY2VQaXhlbFJhdGlvO1xuXG4gICAgY29uc3QgYW5kcm9pZCAgPSAvKEFuZHJvaWQpOz9bXFxzL10rKFtcXGQuXSspPy8uZXhlYyh1YSk7XG4gICAgbGV0ICAgaXBhZCAgICAgPSAvKGlQYWQpLipPU1xccyhbXFxkX10rKS8uZXhlYyh1YSk7XG4gICAgY29uc3QgaXBvZCAgICAgPSAvKGlQb2QpKC4qT1NcXHMoW1xcZF9dKykpPy8uZXhlYyh1YSk7XG4gICAgbGV0ICAgaXBob25lICAgPSAhaXBhZCAmJiAvKGlQaG9uZVxcc09TfGlPUylcXHMoW1xcZF9dKykvLmV4ZWModWEpO1xuICAgIGNvbnN0IGllICAgICAgID0gMCA8PSB1YS5pbmRleE9mKCdNU0lFICcpIHx8IDAgPD0gdWEuaW5kZXhPZignVHJpZGVudC8nKTtcbiAgICBjb25zdCBlZGdlICAgICA9IDAgPD0gdWEuaW5kZXhPZignRWRnZS8nKTtcbiAgICBjb25zdCBmaXJlZm94ICA9IDAgPD0gdWEuaW5kZXhPZignR2Vja28vJykgJiYgMCA8PSB1YS5pbmRleE9mKCdGaXJlZm94LycpO1xuICAgIGNvbnN0IHdpbmRvd3MgID0gJ1dpbjMyJyA9PT0gb3M7XG4gICAgbGV0ICAgbWFjb3MgICAgPSAnTWFjSW50ZWwnID09PSBvcztcbiAgICBjb25zdCBlbGVjdHJvbiA9IHVhLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCgnZWxlY3Ryb24nKTtcblxuICAgIC8vIGlQaG9uZShYKSAvIGlQYWQoUHJvKURlc2t0b3AgTW9kZVxuICAgIGlmICghaXBob25lICYmICFpcGFkXG4gICAgICAgICYmIG1hY29zXG4gICAgICAgICYmIHN1cHBvcnRUb3VjaCgpXG4gICAgICAgICYmICh1bmRlZmluZWQgIT09IHN0YW5kYWxvbmVcbi8vICAgICAgICAgICAgKDEwMjQgPT09IHNjcmVlbldpZHRoICYmIDEzNjYgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDEzNjYgPT09IHNjcmVlbldpZHRoICYmIDEwMjQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTk0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTE5NCA9PT0gc2NyZWVuV2lkdGggJiYgIDgzNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTEgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMTEyID09PSBzY3JlZW5XaWR0aCAmJiAgODM0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDc2OCA9PT0gc2NyZWVuV2lkdGggJiYgMTAyNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTAyNCA9PT0gc2NyZWVuV2lkdGggJiYgIDc2OCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBsYW5kc2NhcGVcbiAgICAgICAgKVxuICAgICkge1xuICAgICAgICBjb25zdCByZWdleCA9IC8oVmVyc2lvbilcXC8oW1xcZC5dKykvLmV4ZWModWEpO1xuICAgICAgICBpZiAobWF5YmVUYWJsZXQoc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkpIHtcbiAgICAgICAgICAgIGlwYWQgPSByZWdleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlwaG9uZSA9IHJlZ2V4O1xuICAgICAgICB9XG4gICAgICAgIG1hY29zID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaW5mby5pZSA9IGllO1xuICAgIGluZm8uZWRnZSA9IGVkZ2U7XG4gICAgaW5mby5maXJlZm94ID0gZmlyZWZveDtcblxuICAgIC8vIEFuZHJvaWRcbiAgICBpZiAoYW5kcm9pZCAmJiAhd2luZG93cykge1xuICAgICAgICBpbmZvLm9zID0gJ2FuZHJvaWQnO1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGFuZHJvaWRbMl07XG4gICAgICAgIGluZm8uYW5kcm9pZCA9IHRydWU7XG4gICAgICAgIGluZm8uYW5kcm9pZENocm9tZSA9IDAgPD0gdWEudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdjaHJvbWUnKTtcbiAgICAgICAgaWYgKDAgPD0gdWEuaW5kZXhPZignTW9iaWxlJykpIHtcbiAgICAgICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpcGFkIHx8IGlwaG9uZSB8fCBpcG9kKSB7XG4gICAgICAgIGluZm8ub3MgPSAnaW9zJztcbiAgICAgICAgaW5mby5pb3MgPSB0cnVlO1xuICAgIH1cbiAgICAvLyBpT1NcbiAgICBpZiAoaXBob25lICYmICFpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBob25lWzJdLnJlcGxhY2UoL18vZywgJy4nKTtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBob25lID0gdHJ1ZTtcbiAgICAgICAgLy8gaVBob25lIFhcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgKDM3NSA9PT0gc2NyZWVuV2lkdGggJiYgODEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFgsIFhTIHBvcnRyYWl0XG4gICAgICAgICB8fCAoODEyID09PSBzY3JlZW5XaWR0aCAmJiAzNzUgPT09IHNjcmVlbkhlaWdodCkgLy8gWCwgWFMgbGFuZHNjYXBlXG4gICAgICAgICB8fCAoNDE0ID09PSBzY3JlZW5XaWR0aCAmJiA4OTYgPT09IHNjcmVlbkhlaWdodCkgLy8gWFMgTWF4LCBYUiBwb3J0cmFpdFxuICAgICAgICAgfHwgKDg5NiA9PT0gc2NyZWVuV2lkdGggJiYgNDE0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFhTIE1heCwgWFIgbGFuZHNjYXBlXG4gICAgICAgICkge1xuICAgICAgICAgICAgaW5mby5pcGhvbmVYID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXBhZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwYWRbMl0ucmVwbGFjZSgvXy9nLCAnLicpO1xuICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIGluZm8uaXBhZCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBvZFszXSA/IGlwb2RbM10ucmVwbGFjZSgvXy9nLCAnLicpIDogbnVsbDtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBvZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gRGVza3RvcFxuICAgIGluZm8uZGVza3RvcCA9ICFzdXBwb3J0T3JpZW50YXRpb24odWEpO1xuICAgIGlmIChpbmZvLmRlc2t0b3ApIHtcbiAgICAgICAgaW5mby5lbGVjdHJvbiA9IGVsZWN0cm9uO1xuICAgICAgICBpbmZvLm1hY29zICAgID0gbWFjb3M7XG4gICAgICAgIGluZm8ud2luZG93cyAgPSB3aW5kb3dzO1xuICAgICAgICBpbmZvLm1hY29zICYmIChpbmZvLm9zID0gJ21hY29zJyk7XG4gICAgICAgIGluZm8ud2luZG93cyAmJiAoaW5mby5vcyA9ICd3aW5kb3dzJyk7XG4gICAgfVxuXG4gICAgLy8gTW9iaWxlXG4gICAgaW5mby5tb2JpbGUgPSAhaW5mby5kZXNrdG9wO1xuICAgIGlmIChpbmZvLm1vYmlsZSAmJiAhaW5mby5waG9uZSAmJiAhaW5mby50YWJsZXQpIHtcbiAgICAgICAgaWYgKG1heWJlVGFibGV0KHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpKSB7XG4gICAgICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFBpeGVsIFJhdGlvXG4gICAgaW5mby5waXhlbFJhdGlvID0gcGl4ZWxSYXRpbyB8fCAxO1xuXG4gICAgcmV0dXJuIGluZm87XG59O1xuXG4vKipcbiAqIEBlbiBQbGF0Zm9ybSBpbmZvcm1hdGlvbiBvbiBydW50aW1lLlxuICogQGphIOODqeODs+OCv+OCpOODoOOBruODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgsVxuICovXG5leHBvcnQgY29uc3QgcGxhdGZvcm0gPSBxdWVyeVBsYXRmb3JtKCk7XG4iXSwibmFtZXMiOlsibG9jYXRpb24iLCJuYXZpZ2F0b3IiLCJzY3JlZW4iLCJkZXZpY2VQaXhlbFJhdGlvIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBRUE7OztBQUlBO0FBQ0EsTUFBTSxTQUFTLEdBQVcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNwRDtBQUNBLE1BQU0sVUFBVSxHQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDckQ7QUFDQSxNQUFNLE9BQU8sR0FBYSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2xEO0FBQ0EsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDOztBQ1gzRDs7Ozs7Ozs7TUFRYSxlQUFlLEdBQUcsQ0FBQyxHQUFXO0lBQ3ZDLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQyxPQUFPLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMs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QUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7S0FDcEI7SUFDRCxJQUFJLElBQUksRUFBRTtRQUNOLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUM3RCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztLQUNwQjs7SUFHRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdkMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ2QsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssR0FBTSxLQUFLLENBQUM7UUFDdEIsSUFBSSxDQUFDLE9BQU8sR0FBSSxPQUFPLENBQUM7UUFDeEIsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztLQUN6Qzs7SUFHRCxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUM1QixJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtRQUM1QyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLEVBQUU7WUFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7U0FDdEI7YUFBTTtZQUNILElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1NBQ3JCO0tBQ0o7O0lBR0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLElBQUksQ0FBQyxDQUFDO0lBRWxDLE9BQU8sSUFBSSxDQUFDO0FBQ2hCLEVBQUU7QUFFRjs7OztNQUlhLFFBQVEsR0FBRyxhQUFhOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9lbnZpcm9ubWVudC8ifQ==
