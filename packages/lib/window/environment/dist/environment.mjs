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
    const android = /(Android);?[\s\/]+([\d.]+)?/.exec(ua); // eslint-disable-line
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQubWpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ3ZWIudHMiLCJwbGF0Zm9ybS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLypcbiAqIFNTUiAoU2VydmVyIFNpZGUgUmVuZGVyaW5nKSDnkrDlooPjgavjgYrjgYTjgabjgoLjgqrjg5bjgrjjgqfjgq/jg4jnrYnjga7lrZjlnKjjgpLkv53oqLzjgZnjgotcbiAqL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbG9jYXRpb24gICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5sb2NhdGlvbik7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfbmF2aWdhdG9yICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5uYXZpZ2F0b3IpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3NjcmVlbiAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuc2NyZWVuKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9kZXZpY2VQaXhlbFJhdGlvID0gc2FmZShnbG9iYWxUaGlzLmRldmljZVBpeGVsUmF0aW8pO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQge1xuICAgIF9sb2NhdGlvbiBhcyBsb2NhdGlvbixcbiAgICBfbmF2aWdhdG9yIGFzIG5hdmlnYXRvcixcbiAgICBfc2NyZWVuIGFzIHNjcmVlbixcbiAgICBfZGV2aWNlUGl4ZWxSYXRpbyBhcyBkZXZpY2VQaXhlbFJhdGlvLFxufTtcbiIsImltcG9ydCB7IGxvY2F0aW9uIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGRpcmVjdG9yeSB0byB3aGljaCBgdXJsYCBiZWxvbmdzLlxuICogQGphIOaMh+WumiBgdXJsYCDjga7miYDlsZ7jgZnjgovjg4fjgqPjg6zjgq/jg4jjg6rjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIHRhcmdldCBVUkxcbiAqICAtIGBqYWAg5a++6LGh44GuIFVSTFxuICovXG5leHBvcnQgY29uc3QgZ2V0V2ViRGlyZWN0b3J5ID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBtYXRjaCA9IC8oLitcXC8pKFteL10qI1teL10rKT8vLmV4ZWModXJsKTtcbiAgICByZXR1cm4gKG1hdGNoICYmIG1hdGNoWzFdKSB8fCAnJztcbn07XG5cbi8qKlxuICogQGVuIEFjY3Nlc3NvciBmb3IgV2ViIHJvb3QgbG9jYXRpb24gPGJyPlxuICogICAgIE9ubHkgdGhlIGJyb3dzZXIgZW52aXJvbm1lbnQgd2lsbCBiZSBhbiBhbGxvY2F0aW5nIHBsYWNlIGluIGluZGV4Lmh0bWwsIGFuZCBiZWNvbWVzIGVmZmVjdGl2ZS5cbiAqIEBqYSBXZWIgcm9vdCBsb2NhdGlvbiDjgbjjga7jgqLjgq/jgrvjgrkgPGJyPlxuICogICAgIGluZGV4Lmh0bWwg44Gu6YWN572u5aC05omA44Go44Gq44KK44CB44OW44Op44Km44K255Kw5aKD44Gu44G/5pyJ5Yq544Go44Gq44KLLlxuICovXG5leHBvcnQgY29uc3Qgd2ViUm9vdDogc3RyaW5nID0gZ2V0V2ViRGlyZWN0b3J5KGxvY2F0aW9uLmhyZWYpO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0ZXIgZnJvbSByZWxhdGl2ZSBwYXRoIHRvIGFic29sdXRlIHVybCBzdHJpbmcuIDxicj5cbiAqICAgICBJZiB5b3Ugd2FudCB0byBhY2Nlc3MgdG8gQXNzZXRzIGFuZCBpbiBzcGl0ZSBvZiB0aGUgc2NyaXB0IGxvY2F0aW9uLCB0aGUgZnVuY3Rpb24gaXMgYXZhaWxhYmxlLlxuICogQGphIOebuOWvviBwYXRoIOOCkue1tuWvviBVUkwg44Gr5aSJ5o+bIDxicj5cbiAqICAgICBqcyDjga7phY3nva7jgavkvp3lrZjjgZnjgovjgZPjgajjgarjgY8gYGFzc2V0c2Ag44Ki44Kv44K744K544GX44Gf44GE44Go44GN44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjE4ODIxOC9yZWxhdGl2ZS1wYXRocy1pbi1qYXZhc2NyaXB0LWluLWFuLWV4dGVybmFsLWZpbGVcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBjb25zb2xlLmxvZyh0b1VybCgnL3Jlcy9kYXRhL2NvbGxlY3Rpb24uanNvbicpKTtcbiAqICAvLyBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcHAvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwYXRoXG4gKiAgLSBgZW5gIHNldCByZWxhdGl2ZSBwYXRoIGZyb20gW1t3ZWJSb290XV0uXG4gKiAgLSBgamFgIFtbd2ViUm9vdF1dIOOBi+OCieOBruebuOWvvuODkeOCueOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgdG9VcmwgPSAocGF0aDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBpZiAobnVsbCAhPSBwYXRoICYmIG51bGwgIT0gcGF0aFswXSkge1xuICAgICAgICByZXR1cm4gKCcvJyA9PT0gcGF0aFswXSkgPyB3ZWJSb290ICsgcGF0aC5zbGljZSgxKSA6IHdlYlJvb3QgKyBwYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB3ZWJSb290O1xuICAgIH1cbn07XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgc3BhY2UtaW4tcGFyZW5zXG4gLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHsgV3JpdGFibGUsIGdldEdsb2JhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIG5hdmlnYXRvcixcbiAgICBzY3JlZW4sXG4gICAgZGV2aWNlUGl4ZWxSYXRpbyxcbn0gZnJvbSAnLi9zc3InO1xuXG5jb25zdCBlbnVtIFRocmVzaG9sZCB7XG4gICAgVEFCTEVUX01JTl9XSURUSCA9IDYwMCwgLy8gZmFsbGJhY2sgZGV0ZWN0aW9uIHZhbHVlXG59XG5cbi8qKlxuICogQGVuIFBsYXRmb3JtIGluZm9ybWF0aW9uLlxuICogQGphIOODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgsVxuICpcbiAqIEBzZWVcbiAqICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS91dGlscy9pbmZvLmpzXG4gKiAgLSBodHRwczovL2dpdGh1Yi5jb20vT25zZW5VSS9PbnNlblVJL2Jsb2IvbWFzdGVyL2NvcmUvc3JjL29ucy9wbGF0Zm9ybS5qc1xuICogIC0gaHR0cHM6Ly93d3cuYml0LWhpdmUuY29tL2FydGljbGVzLzIwMTkwODIwXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGxhdGZvcm0ge1xuICAgIC8qKiB0cnVlIGZvciBpT1MgaW5mbyAqL1xuICAgIHJlYWRvbmx5IGlvczogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgQW5kcm9pZCBpbmZvICovXG4gICAgcmVhZG9ubHkgYW5kcm9pZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgQW5kcm9pZCBDaHJvbWUgKi9cbiAgICByZWFkb25seSBhbmRyb2lkQ2hyb21lOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIGJyb3dzZXIgKi9cbiAgICByZWFkb25seSBkZXNrdG9wOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBtb2JpbGUgaW5mbyAqL1xuICAgIHJlYWRvbmx5IG1vYmlsZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3Igc21hcnQgcGhvbmUgKGluY2x1ZGluZyBpUG9kKSBpbmZvICovXG4gICAgcmVhZG9ubHkgcGhvbmU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIHRhYmxldCBpbmZvICovXG4gICAgcmVhZG9ubHkgdGFibGV0OiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGhvbmUgKi9cbiAgICByZWFkb25seSBpcGhvbmU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQaG9uZVggKi9cbiAgICByZWFkb25seSBpcGhvbmVYOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUG9kICovXG4gICAgcmVhZG9ubHkgaXBvZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBhZCAqL1xuICAgIHJlYWRvbmx5IGlwYWQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIE1TIEVkZ2UgYnJvd3NlciAqL1xuICAgIHJlYWRvbmx5IGVkZ2U6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEludGVybmV0IEV4cGxvcmVyIGJyb3dzZXIqL1xuICAgIHJlYWRvbmx5IGllOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBGaXJlRm94IGJyb3dzZXIqL1xuICAgIHJlYWRvbmx5IGZpcmVmb3g6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgTWFjT1MgKi9cbiAgICByZWFkb25seSBtYWNvczogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBXaW5kb3dzICovXG4gICAgcmVhZG9ubHkgd2luZG93czogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSB3aGVuIGFwcCBydW5uaW5nIGluIGNvcmRvdmEgZW52aXJvbm1lbnQgKi9cbiAgICByZWFkb25seSBjb3Jkb3ZhOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIHdoZW4gYXBwIHJ1bm5pbmcgaW4gZWxlY3Ryb24gZW52aXJvbm1lbnQgKi9cbiAgICByZWFkb25seSBlbGVjdHJvbjogYm9vbGVhbjtcbiAgICAvKiogQ29udGFpbnMgT1MgY2FuIGJlIGlvcywgYW5kcm9pZCBvciB3aW5kb3dzIChmb3IgV2luZG93cyBQaG9uZSkgKi9cbiAgICByZWFkb25seSBvczogc3RyaW5nO1xuICAgIC8qKiBDb250YWlucyBPUyB2ZXJzaW9uLCBlLmcuIDExLjIuMCAqL1xuICAgIHJlYWRvbmx5IG9zVmVyc2lvbjogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZDtcbiAgICAvKiogRGV2aWNlIHBpeGVsIHJhdGlvICovXG4gICAgcmVhZG9ubHkgcGl4ZWxSYXRpbzogbnVtYmVyO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuY29uc3QgZGV2aWNlQ29udGV4dCA9IHtcbiAgICBuYXZpZ2F0b3IsXG4gICAgc2NyZWVuLFxuICAgIGRldmljZVBpeGVsUmF0aW8sXG59O1xuXG5jb25zdCBtYXliZVRhYmxldCA9ICh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAoVGhyZXNob2xkLlRBQkxFVF9NSU5fV0lEVEggPD0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkpO1xufTtcblxuY29uc3Qgc3VwcG9ydFRvdWNoID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAhISgobmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGdsb2JhbFRoaXMpKTtcbn07XG5cbmNvbnN0IHN1cHBvcnRPcmllbnRhdGlvbiA9ICh1YTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICgnb3JpZW50YXRpb24nIGluIGdsb2JhbFRoaXMpIHx8ICgwIDw9IHVhLmluZGV4T2YoJ1dpbmRvd3MgUGhvbmUnKSk7XG59O1xuXG4vKipcbiAqIEBlbiBRdWVyeSBwbGF0Zm9ybSBpbmZvcm1hdGlvbi5cbiAqIEBqYSDjg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLHjga7lj5blvpdcbiAqXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBnaXZlbiBgTmF2aWdhdG9yYCwgYFNjcmVlbmAsIGBkZXZpY2VQaXhlbFJhdGlvYCBpbmZvcm1hdGlvbi5cbiAqICAtIGBqYWAg55Kw5aKD44GuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIOOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgcXVlcnlQbGF0Zm9ybSA9IChcbiAgICBjb250ZXh0OiB7XG4gICAgICAgIG5hdmlnYXRvcj86IHsgdXNlckFnZW50OiBzdHJpbmc7IHBsYXRmb3JtOiBzdHJpbmc7IHN0YW5kYWxvbmU/OiBib29sZWFuOyB9O1xuICAgICAgICBzY3JlZW4/OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyOyB9O1xuICAgICAgICBkZXZpY2VQaXhlbFJhdGlvPzogbnVtYmVyO1xuICAgIH0gPSBkZXZpY2VDb250ZXh0XG4pOiBQbGF0Zm9ybSA9PiB7XG4gICAgY29uc3QgaW5mbyA9IHtcbiAgICAgICAgaW9zOiBmYWxzZSxcbiAgICAgICAgYW5kcm9pZDogZmFsc2UsXG4gICAgICAgIGFuZHJvaWRDaHJvbWU6IGZhbHNlLFxuICAgICAgICBkZXNrdG9wOiBmYWxzZSxcbiAgICAgICAgbW9iaWxlOiBmYWxzZSxcbiAgICAgICAgcGhvbmU6IGZhbHNlLFxuICAgICAgICB0YWJsZXQ6IGZhbHNlLFxuICAgICAgICBpcGhvbmU6IGZhbHNlLFxuICAgICAgICBpcGhvbmVYOiBmYWxzZSxcbiAgICAgICAgaXBvZDogZmFsc2UsXG4gICAgICAgIGlwYWQ6IGZhbHNlLFxuICAgICAgICBlZGdlOiBmYWxzZSxcbiAgICAgICAgaWU6IGZhbHNlLFxuICAgICAgICBmaXJlZm94OiBmYWxzZSxcbiAgICAgICAgbWFjb3M6IGZhbHNlLFxuICAgICAgICB3aW5kb3dzOiBmYWxzZSxcbiAgICAgICAgY29yZG92YTogISEoZ2V0R2xvYmFsKCkgYXMgYW55KS5jb3Jkb3ZhLFxuICAgICAgICBlbGVjdHJvbjogZmFsc2UsXG4gICAgfSBhcyBhbnkgYXMgV3JpdGFibGU8UGxhdGZvcm0+O1xuXG4gICAgY29uc3QgeyB1c2VyQWdlbnQ6IHVhLCBwbGF0Zm9ybTogb3MsIHN0YW5kYWxvbmUgfSA9IGNvbnRleHQubmF2aWdhdG9yIHx8IG5hdmlnYXRvciBhcyB7IHVzZXJBZ2VudDogc3RyaW5nOyBwbGF0Zm9ybTogc3RyaW5nOyBzdGFuZGFsb25lPzogYm9vbGVhbjsgfTtcbiAgICBjb25zdCB7IHdpZHRoOiBzY3JlZW5XaWR0aCwgaGVpZ2h0OiBzY3JlZW5IZWlnaHQgfSA9IGNvbnRleHQuc2NyZWVuIHx8IHNjcmVlbjtcbiAgICBjb25zdCBwaXhlbFJhdGlvID0gY29udGV4dC5kZXZpY2VQaXhlbFJhdGlvO1xuXG4gICAgY29uc3QgYW5kcm9pZCAgPSAvKEFuZHJvaWQpOz9bXFxzXFwvXSsoW1xcZC5dKyk/Ly5leGVjKHVhKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgIGxldCAgIGlwYWQgICAgID0gLyhpUGFkKS4qT1NcXHMoW1xcZF9dKykvLmV4ZWModWEpO1xuICAgIGNvbnN0IGlwb2QgICAgID0gLyhpUG9kKSguKk9TXFxzKFtcXGRfXSspKT8vLmV4ZWModWEpO1xuICAgIGxldCAgIGlwaG9uZSAgID0gIWlwYWQgJiYgLyhpUGhvbmVcXHNPU3xpT1MpXFxzKFtcXGRfXSspLy5leGVjKHVhKTtcbiAgICBjb25zdCBpZSAgICAgICA9IDAgPD0gdWEuaW5kZXhPZignTVNJRSAnKSB8fCAwIDw9IHVhLmluZGV4T2YoJ1RyaWRlbnQvJyk7XG4gICAgY29uc3QgZWRnZSAgICAgPSAwIDw9IHVhLmluZGV4T2YoJ0VkZ2UvJyk7XG4gICAgY29uc3QgZmlyZWZveCAgPSAwIDw9IHVhLmluZGV4T2YoJ0dlY2tvLycpICYmIDAgPD0gdWEuaW5kZXhPZignRmlyZWZveC8nKTtcbiAgICBjb25zdCB3aW5kb3dzICA9ICdXaW4zMicgPT09IG9zO1xuICAgIGxldCAgIG1hY29zICAgID0gJ01hY0ludGVsJyA9PT0gb3M7XG4gICAgY29uc3QgZWxlY3Ryb24gPSB1YS50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJ2VsZWN0cm9uJyk7XG5cbiAgICAvLyBpUGhvbmUoWCkgLyBpUGFkKFBybylEZXNrdG9wIE1vZGVcbiAgICBpZiAoIWlwaG9uZSAmJiAhaXBhZFxuICAgICAgICAmJiBtYWNvc1xuICAgICAgICAmJiBzdXBwb3J0VG91Y2goKVxuICAgICAgICAmJiAodW5kZWZpbmVkICE9PSBzdGFuZGFsb25lXG4vLyAgICAgICAgICAgICgxMDI0ID09PSBzY3JlZW5XaWR0aCAmJiAxMzY2ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMi45IHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMzY2ID09PSBzY3JlZW5XaWR0aCAmJiAxMDI0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMi45IGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDgzNCA9PT0gc2NyZWVuV2lkdGggJiYgMTE5NCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTEgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDExOTQgPT09IHNjcmVlbldpZHRoICYmICA4MzQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDExIGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDgzNCA9PT0gc2NyZWVuV2lkdGggJiYgMTExMiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTAuNSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTExMiA9PT0gc2NyZWVuV2lkdGggJiYgIDgzNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTAuNSBsYW5kc2NhcGVcbi8vICAgICAgICAgfHwgKCA3NjggPT09IHNjcmVlbldpZHRoICYmIDEwMjQgPT09IHNjcmVlbkhlaWdodCkgLy8gb3RoZXIgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDEwMjQgPT09IHNjcmVlbldpZHRoICYmICA3NjggPT09IHNjcmVlbkhlaWdodCkgLy8gb3RoZXIgbGFuZHNjYXBlXG4gICAgICAgIClcbiAgICApIHtcbiAgICAgICAgY29uc3QgcmVnZXggPSAvKFZlcnNpb24pXFwvKFtcXGQuXSspLy5leGVjKHVhKTtcbiAgICAgICAgaWYgKG1heWJlVGFibGV0KHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpKSB7XG4gICAgICAgICAgICBpcGFkID0gcmVnZXg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpcGhvbmUgPSByZWdleDtcbiAgICAgICAgfVxuICAgICAgICBtYWNvcyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGluZm8uaWUgPSBpZTtcbiAgICBpbmZvLmVkZ2UgPSBlZGdlO1xuICAgIGluZm8uZmlyZWZveCA9IGZpcmVmb3g7XG5cbiAgICAvLyBBbmRyb2lkXG4gICAgaWYgKGFuZHJvaWQgJiYgIXdpbmRvd3MpIHtcbiAgICAgICAgaW5mby5vcyA9ICdhbmRyb2lkJztcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBhbmRyb2lkWzJdO1xuICAgICAgICBpbmZvLmFuZHJvaWQgPSB0cnVlO1xuICAgICAgICBpbmZvLmFuZHJvaWRDaHJvbWUgPSAwIDw9IHVhLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignY2hyb21lJyk7XG4gICAgICAgIGlmICgwIDw9IHVhLmluZGV4T2YoJ01vYmlsZScpKSB7XG4gICAgICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluZm8udGFibGV0ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXBhZCB8fCBpcGhvbmUgfHwgaXBvZCkge1xuICAgICAgICBpbmZvLm9zID0gJ2lvcyc7XG4gICAgICAgIGluZm8uaW9zID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8gaU9TXG4gICAgaWYgKGlwaG9uZSAmJiAhaXBvZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwaG9uZVsyXS5yZXBsYWNlKC9fL2csICcuJyk7XG4gICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwaG9uZSA9IHRydWU7XG4gICAgICAgIC8vIGlQaG9uZSBYXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICgzNzUgPT09IHNjcmVlbldpZHRoICYmIDgxMiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYLCBYUyBwb3J0cmFpdFxuICAgICAgICAgfHwgKDgxMiA9PT0gc2NyZWVuV2lkdGggJiYgMzc1ID09PSBzY3JlZW5IZWlnaHQpIC8vIFgsIFhTIGxhbmRzY2FwZVxuICAgICAgICAgfHwgKDQxNCA9PT0gc2NyZWVuV2lkdGggJiYgODk2ID09PSBzY3JlZW5IZWlnaHQpIC8vIFhTIE1heCwgWFIgcG9ydHJhaXRcbiAgICAgICAgIHx8ICg4OTYgPT09IHNjcmVlbldpZHRoICYmIDQxNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYUyBNYXgsIFhSIGxhbmRzY2FwZVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGluZm8uaXBob25lWCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlwYWQpIHtcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBpcGFkWzJdLnJlcGxhY2UoL18vZywgJy4nKTtcbiAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwYWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXBvZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwb2RbM10gPyBpcG9kWzNdLnJlcGxhY2UoL18vZywgJy4nKSA6IG51bGw7XG4gICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwb2QgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIERlc2t0b3BcbiAgICBpbmZvLmRlc2t0b3AgPSAhc3VwcG9ydE9yaWVudGF0aW9uKHVhKTtcbiAgICBpZiAoaW5mby5kZXNrdG9wKSB7XG4gICAgICAgIGluZm8uZWxlY3Ryb24gPSBlbGVjdHJvbjtcbiAgICAgICAgaW5mby5tYWNvcyAgICA9IG1hY29zO1xuICAgICAgICBpbmZvLndpbmRvd3MgID0gd2luZG93cztcbiAgICAgICAgaW5mby5tYWNvcyAmJiAoaW5mby5vcyA9ICdtYWNvcycpO1xuICAgICAgICBpbmZvLndpbmRvd3MgJiYgKGluZm8ub3MgPSAnd2luZG93cycpO1xuICAgIH1cblxuICAgIC8vIE1vYmlsZVxuICAgIGluZm8ubW9iaWxlID0gIWluZm8uZGVza3RvcDtcbiAgICBpZiAoaW5mby5tb2JpbGUgJiYgIWluZm8ucGhvbmUgJiYgIWluZm8udGFibGV0KSB7XG4gICAgICAgIGlmIChtYXliZVRhYmxldChzY3JlZW5XaWR0aCwgc2NyZWVuSGVpZ2h0KSkge1xuICAgICAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQaXhlbCBSYXRpb1xuICAgIGluZm8ucGl4ZWxSYXRpbyA9IHBpeGVsUmF0aW8gfHwgMTtcblxuICAgIHJldHVybiBpbmZvO1xufTtcblxuLyoqXG4gKiBAZW4gUGxhdGZvcm0gaW5mb3JtYXRpb24gb24gcnVudGltZS5cbiAqIEBqYSDjg6njg7Pjgr/jgqTjg6Djga7jg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLFcbiAqL1xuZXhwb3J0IGNvbnN0IHBsYXRmb3JtID0gcXVlcnlQbGF0Zm9ybSgpO1xuIl0sIm5hbWVzIjpbImxvY2F0aW9uIiwibmF2aWdhdG9yIiwic2NyZWVuIiwiZGV2aWNlUGl4ZWxSYXRpbyJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVBOzs7QUFJQTtBQUNBLE1BQU0sU0FBUyxHQUFXLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEQ7QUFDQSxNQUFNLFVBQVUsR0FBVSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JEO0FBQ0EsTUFBTSxPQUFPLEdBQWEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNsRDtBQUNBLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQzs7QUNYM0Q7Ozs7Ozs7O0FBUUEsTUFBYSxlQUFlLEdBQUcsQ0FBQyxHQUFXO0lBQ3ZDLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQyxPQUFPLENBQUMs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QU8sR0FBRyxJQUFJLENBQUM7U0FDdkI7S0FDSjtJQUNELElBQUksSUFBSSxFQUFFO1FBQ04sSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztLQUNwQjtJQUNELElBQUksSUFBSSxFQUFFO1FBQ04sSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQzdELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0tBQ3BCOztJQUdELElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN2QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7UUFDZCxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsS0FBSyxHQUFNLEtBQUssQ0FBQztRQUN0QixJQUFJLENBQUMsT0FBTyxHQUFJLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDO0tBQ3pDOztJQUdELElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQzVDLElBQUksV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsRUFBRTtZQUN4QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztTQUN0QjthQUFNO1lBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7U0FDckI7S0FDSjs7SUFHRCxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsSUFBSSxDQUFDLENBQUM7SUFFbEMsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQyxDQUFDO0FBRUY7Ozs7QUFJQSxNQUFhLFFBQVEsR0FBRyxhQUFhLEVBQUU7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2Vudmlyb25tZW50LyJ9
