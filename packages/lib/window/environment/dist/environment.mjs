/*!
 * @cdp/environment 0.9.5
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

//__________________________________________________________________________________________________//
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
const queryPlatform = (context) => {
    context = context || { navigator: _navigator, screen: _screen, devicePixelRatio: _devicePixelRatio };
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
        cordova: !!(getGlobal()['cordova']),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQubWpzIiwic291cmNlcyI6WyJzc3IudHMiLCJ3ZWIudHMiLCJwbGF0Zm9ybS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYWZlIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLypcbiAqIFNTUiAoU2VydmVyIFNpZGUgUmVuZGVyaW5nKSDnkrDlooPjgavjgYrjgYTjgabjgoLjgqrjg5bjgrjjgqfjgq/jg4jnrYnjga7lrZjlnKjjgpLkv53oqLzjgZnjgotcbiAqL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbG9jYXRpb24gICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5sb2NhdGlvbik7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfbmF2aWdhdG9yICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5uYXZpZ2F0b3IpO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX3NjcmVlbiAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuc2NyZWVuKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9kZXZpY2VQaXhlbFJhdGlvID0gc2FmZShnbG9iYWxUaGlzLmRldmljZVBpeGVsUmF0aW8pO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQge1xuICAgIF9sb2NhdGlvbiBhcyBsb2NhdGlvbixcbiAgICBfbmF2aWdhdG9yIGFzIG5hdmlnYXRvcixcbiAgICBfc2NyZWVuIGFzIHNjcmVlbixcbiAgICBfZGV2aWNlUGl4ZWxSYXRpbyBhcyBkZXZpY2VQaXhlbFJhdGlvLFxufTtcbiIsImltcG9ydCB7IGxvY2F0aW9uIH0gZnJvbSAnLi9zc3InO1xuXG4vKipcbiAqIEBlbiBHZXQgdGhlIGRpcmVjdG9yeSB0byB3aGljaCBgdXJsYCBiZWxvbmdzLlxuICogQGphIOaMh+WumiBgdXJsYCDjga7miYDlsZ7jgZnjgovjg4fjgqPjg6zjgq/jg4jjg6rjgpLlj5blvpdcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiAgLSBgZW5gIHRhcmdldCBVUkxcbiAqICAtIGBqYWAg5a++6LGh44GuIFVSTFxuICovXG5leHBvcnQgY29uc3QgZ2V0V2ViRGlyZWN0b3J5ID0gKHVybDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBtYXRjaCA9IC8oLitcXC8pKFteL10qI1teL10rKT8vLmV4ZWModXJsKTtcbiAgICByZXR1cm4gKG1hdGNoICYmIG1hdGNoWzFdKSB8fCAnJztcbn07XG5cbi8qKlxuICogQGVuIEFjY3Nlc3NvciBmb3IgV2ViIHJvb3QgbG9jYXRpb24gPGJyPlxuICogICAgIE9ubHkgdGhlIGJyb3dzZXIgZW52aXJvbm1lbnQgd2lsbCBiZSBhbiBhbGxvY2F0aW5nIHBsYWNlIGluIGluZGV4Lmh0bWwsIGFuZCBiZWNvbWVzIGVmZmVjdGl2ZS5cbiAqIEBqYSBXZWIgcm9vdCBsb2NhdGlvbiDjgbjjga7jgqLjgq/jgrvjgrkgPGJyPlxuICogICAgIGluZGV4Lmh0bWwg44Gu6YWN572u5aC05omA44Go44Gq44KK44CB44OW44Op44Km44K255Kw5aKD44Gu44G/5pyJ5Yq544Go44Gq44KLLlxuICovXG5leHBvcnQgY29uc3Qgd2ViUm9vdDogc3RyaW5nID0gZ2V0V2ViRGlyZWN0b3J5KGxvY2F0aW9uLmhyZWYpO1xuXG4vKipcbiAqIEBlbiBDb252ZXJ0ZXIgZnJvbSByZWxhdGl2ZSBwYXRoIHRvIGFic29sdXRlIHVybCBzdHJpbmcuIDxicj5cbiAqICAgICBJZiB5b3Ugd2FudCB0byBhY2Nlc3MgdG8gQXNzZXRzIGFuZCBpbiBzcGl0ZSBvZiB0aGUgc2NyaXB0IGxvY2F0aW9uLCB0aGUgZnVuY3Rpb24gaXMgYXZhaWxhYmxlLlxuICogQGphIOebuOWvviBwYXRoIOOCkue1tuWvviBVUkwg44Gr5aSJ5o+bIDxicj5cbiAqICAgICBqcyDjga7phY3nva7jgavkvp3lrZjjgZnjgovjgZPjgajjgarjgY8gYGFzc2V0c2Ag44Ki44Kv44K744K544GX44Gf44GE44Go44GN44Gr5L2/55So44GZ44KLLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjE4ODIxOC9yZWxhdGl2ZS1wYXRocy1pbi1qYXZhc2NyaXB0LWluLWFuLWV4dGVybmFsLWZpbGVcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqICBjb25zb2xlLmxvZyh0b1VybCgnL3Jlcy9kYXRhL2NvbGxlY3Rpb24uanNvbicpKTtcbiAqICAvLyBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcHAvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uXCJcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwYXRoXG4gKiAgLSBgZW5gIHNldCByZWxhdGl2ZSBwYXRoIGZyb20gW1t3ZWJSb290XV0uXG4gKiAgLSBgamFgIFtbd2ViUm9vdF1dIOOBi+OCieOBruebuOWvvuODkeOCueOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgdG9VcmwgPSAocGF0aDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICBpZiAobnVsbCAhPSBwYXRoICYmIG51bGwgIT0gcGF0aFswXSkge1xuICAgICAgICByZXR1cm4gKCcvJyA9PT0gcGF0aFswXSkgPyB3ZWJSb290ICsgcGF0aC5zbGljZSgxKSA6IHdlYlJvb3QgKyBwYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB3ZWJSb290O1xuICAgIH1cbn07XG4iLCJpbXBvcnQgeyBXcml0YWJsZSwgZ2V0R2xvYmFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgbmF2aWdhdG9yLFxuICAgIHNjcmVlbixcbiAgICBkZXZpY2VQaXhlbFJhdGlvLFxufSBmcm9tICcuL3Nzcic7XG5cbmNvbnN0IGVudW0gVGhyZXNob2xkIHtcbiAgICBUQUJMRVRfTUlOX1dJRFRIID0gNjAwLCAvLyBmYWxsYmFjayBkZXRlY3Rpb24gdmFsdWVcbn1cblxuLyoqXG4gKiBAZW4gUGxhdGZvcm0gaW5mb3JtYXRpb24uXG4gKiBAamEg44OX44Op44OD44OI44OV44Kp44O844Og5oOF5aCxXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvbWFzdGVyL3NyYy9jb3JlL3V0aWxzL2luZm8uanNcbiAqICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9PbnNlblVJL09uc2VuVUkvYmxvYi9tYXN0ZXIvY29yZS9zcmMvb25zL3BsYXRmb3JtLmpzXG4gKiAgLSBodHRwczovL3d3dy5iaXQtaGl2ZS5jb20vYXJ0aWNsZXMvMjAxOTA4MjBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF0Zm9ybSB7XG4gICAgLyoqIHRydWUgZm9yIGlPUyBpbmZvICovXG4gICAgcmVhZG9ubHkgaW9zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIGluZm8gKi9cbiAgICByZWFkb25seSBhbmRyb2lkOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIENocm9tZSAqL1xuICAgIHJlYWRvbmx5IGFuZHJvaWRDaHJvbWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgYnJvd3NlciAqL1xuICAgIHJlYWRvbmx5IGRlc2t0b3A6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIG1vYmlsZSBpbmZvICovXG4gICAgcmVhZG9ubHkgbW9iaWxlOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBzbWFydCBwaG9uZSAoaW5jbHVkaW5nIGlQb2QpIGluZm8gKi9cbiAgICByZWFkb25seSBwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgdGFibGV0IGluZm8gKi9cbiAgICByZWFkb25seSB0YWJsZXQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQaG9uZSAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBob25lWCAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZVg6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQb2QgKi9cbiAgICByZWFkb25seSBpcG9kOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGFkICovXG4gICAgcmVhZG9ubHkgaXBhZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgTVMgRWRnZSBicm93c2VyICovXG4gICAgcmVhZG9ubHkgZWRnZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgSW50ZXJuZXQgRXhwbG9yZXIgYnJvd3NlciovXG4gICAgcmVhZG9ubHkgaWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEZpcmVGb3ggYnJvd3NlciovXG4gICAgcmVhZG9ubHkgZmlyZWZveDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBNYWNPUyAqL1xuICAgIHJlYWRvbmx5IG1hY29zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIFdpbmRvd3MgKi9cbiAgICByZWFkb25seSB3aW5kb3dzOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIHdoZW4gYXBwIHJ1bm5pbmcgaW4gY29yZG92YSBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGNvcmRvdmE6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgd2hlbiBhcHAgcnVubmluZyBpbiBlbGVjdHJvbiBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGVsZWN0cm9uOiBib29sZWFuO1xuICAgIC8qKiBDb250YWlucyBPUyBjYW4gYmUgaW9zLCBhbmRyb2lkIG9yIHdpbmRvd3MgKGZvciBXaW5kb3dzIFBob25lKSAqL1xuICAgIHJlYWRvbmx5IG9zOiBzdHJpbmc7XG4gICAgLyoqIENvbnRhaW5zIE9TIHZlcnNpb24sIGUuZy4gMTEuMi4wICovXG4gICAgcmVhZG9ubHkgb3NWZXJzaW9uOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkO1xuICAgIC8qKiBEZXZpY2UgcGl4ZWwgcmF0aW8gKi9cbiAgICByZWFkb25seSBwaXhlbFJhdGlvOiBudW1iZXI7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBtYXliZVRhYmxldCA9ICh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAoVGhyZXNob2xkLlRBQkxFVF9NSU5fV0lEVEggPD0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkpO1xufTtcblxuY29uc3Qgc3VwcG9ydFRvdWNoID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAhISgobmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGdsb2JhbFRoaXMpKTtcbn07XG5cbmNvbnN0IHN1cHBvcnRPcmllbnRhdGlvbiA9ICh1YTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICgnb3JpZW50YXRpb24nIGluIGdsb2JhbFRoaXMpIHx8ICgwIDw9IHVhLmluZGV4T2YoJ1dpbmRvd3MgUGhvbmUnKSk7XG59O1xuXG4vKipcbiAqIEBlbiBRdWVyeSBwbGF0Zm9ybSBpbmZvcm1hdGlvbi5cbiAqIEBqYSDjg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLHjga7lj5blvpdcbiAqXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBnaXZlbiBgTmF2aWdhdG9yYCwgYFNjcmVlbmAsIGBkZXZpY2VQaXhlbFJhdGlvYCBpbmZvcm1hdGlvbi5cbiAqICAtIGBqYWAg55Kw5aKD44GuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIOOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgcXVlcnlQbGF0Zm9ybSA9IChcbiAgICBjb250ZXh0Pzoge1xuICAgICAgICBuYXZpZ2F0b3I/OiB7IHVzZXJBZ2VudDogc3RyaW5nOyBwbGF0Zm9ybTogc3RyaW5nOyBzdGFuZGFsb25lPzogYm9vbGVhbjsgfTtcbiAgICAgICAgc2NyZWVuPzogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlcjsgfTtcbiAgICAgICAgZGV2aWNlUGl4ZWxSYXRpbz86IG51bWJlcjtcbiAgICB9XG4pOiBQbGF0Zm9ybSA9PiB7XG4gICAgY29udGV4dCA9IGNvbnRleHQgfHwgeyBuYXZpZ2F0b3IsIHNjcmVlbiwgZGV2aWNlUGl4ZWxSYXRpbyB9O1xuICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgIGlvczogZmFsc2UsXG4gICAgICAgIGFuZHJvaWQ6IGZhbHNlLFxuICAgICAgICBhbmRyb2lkQ2hyb21lOiBmYWxzZSxcbiAgICAgICAgZGVza3RvcDogZmFsc2UsXG4gICAgICAgIG1vYmlsZTogZmFsc2UsXG4gICAgICAgIHBob25lOiBmYWxzZSxcbiAgICAgICAgdGFibGV0OiBmYWxzZSxcbiAgICAgICAgaXBob25lOiBmYWxzZSxcbiAgICAgICAgaXBob25lWDogZmFsc2UsXG4gICAgICAgIGlwb2Q6IGZhbHNlLFxuICAgICAgICBpcGFkOiBmYWxzZSxcbiAgICAgICAgZWRnZTogZmFsc2UsXG4gICAgICAgIGllOiBmYWxzZSxcbiAgICAgICAgZmlyZWZveDogZmFsc2UsXG4gICAgICAgIG1hY29zOiBmYWxzZSxcbiAgICAgICAgd2luZG93czogZmFsc2UsXG4gICAgICAgIGNvcmRvdmE6ICEhKGdldEdsb2JhbCgpWydjb3Jkb3ZhJ10pLFxuICAgICAgICBlbGVjdHJvbjogZmFsc2UsXG4gICAgfSBhcyB1bmtub3duIGFzIFdyaXRhYmxlPFBsYXRmb3JtPjtcblxuICAgIGNvbnN0IHsgdXNlckFnZW50OiB1YSwgcGxhdGZvcm06IG9zLCBzdGFuZGFsb25lIH0gPSBjb250ZXh0Lm5hdmlnYXRvciB8fCBuYXZpZ2F0b3IgYXMgeyB1c2VyQWdlbnQ6IHN0cmluZzsgcGxhdGZvcm06IHN0cmluZzsgc3RhbmRhbG9uZT86IGJvb2xlYW47IH07XG4gICAgY29uc3QgeyB3aWR0aDogc2NyZWVuV2lkdGgsIGhlaWdodDogc2NyZWVuSGVpZ2h0IH0gPSBjb250ZXh0LnNjcmVlbiB8fCBzY3JlZW47XG4gICAgY29uc3QgcGl4ZWxSYXRpbyA9IGNvbnRleHQuZGV2aWNlUGl4ZWxSYXRpbztcblxuICAgIGNvbnN0IGFuZHJvaWQgID0gLyhBbmRyb2lkKTs/W1xccy9dKyhbXFxkLl0rKT8vLmV4ZWModWEpO1xuICAgIGxldCAgIGlwYWQgICAgID0gLyhpUGFkKS4qT1NcXHMoW1xcZF9dKykvLmV4ZWModWEpO1xuICAgIGNvbnN0IGlwb2QgICAgID0gLyhpUG9kKSguKk9TXFxzKFtcXGRfXSspKT8vLmV4ZWModWEpO1xuICAgIGxldCAgIGlwaG9uZSAgID0gIWlwYWQgJiYgLyhpUGhvbmVcXHNPU3xpT1MpXFxzKFtcXGRfXSspLy5leGVjKHVhKTtcbiAgICBjb25zdCBpZSAgICAgICA9IDAgPD0gdWEuaW5kZXhPZignTVNJRSAnKSB8fCAwIDw9IHVhLmluZGV4T2YoJ1RyaWRlbnQvJyk7XG4gICAgY29uc3QgZWRnZSAgICAgPSAwIDw9IHVhLmluZGV4T2YoJ0VkZ2UvJyk7XG4gICAgY29uc3QgZmlyZWZveCAgPSAwIDw9IHVhLmluZGV4T2YoJ0dlY2tvLycpICYmIDAgPD0gdWEuaW5kZXhPZignRmlyZWZveC8nKTtcbiAgICBjb25zdCB3aW5kb3dzICA9ICdXaW4zMicgPT09IG9zO1xuICAgIGxldCAgIG1hY29zICAgID0gJ01hY0ludGVsJyA9PT0gb3M7XG4gICAgY29uc3QgZWxlY3Ryb24gPSB1YS50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJ2VsZWN0cm9uJyk7XG5cbiAgICAvLyBpUGhvbmUoWCkgLyBpUGFkKFBybylEZXNrdG9wIE1vZGVcbiAgICBpZiAoIWlwaG9uZSAmJiAhaXBhZFxuICAgICAgICAmJiBtYWNvc1xuICAgICAgICAmJiBzdXBwb3J0VG91Y2goKVxuICAgICAgICAmJiAodW5kZWZpbmVkICE9PSBzdGFuZGFsb25lXG4vLyAgICAgICAgICAgICgxMDI0ID09PSBzY3JlZW5XaWR0aCAmJiAxMzY2ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMi45IHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMzY2ID09PSBzY3JlZW5XaWR0aCAmJiAxMDI0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMi45IGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDgzNCA9PT0gc2NyZWVuV2lkdGggJiYgMTE5NCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTEgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDExOTQgPT09IHNjcmVlbldpZHRoICYmICA4MzQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDExIGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDgzNCA9PT0gc2NyZWVuV2lkdGggJiYgMTExMiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTAuNSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTExMiA9PT0gc2NyZWVuV2lkdGggJiYgIDgzNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTAuNSBsYW5kc2NhcGVcbi8vICAgICAgICAgfHwgKCA3NjggPT09IHNjcmVlbldpZHRoICYmIDEwMjQgPT09IHNjcmVlbkhlaWdodCkgLy8gb3RoZXIgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDEwMjQgPT09IHNjcmVlbldpZHRoICYmICA3NjggPT09IHNjcmVlbkhlaWdodCkgLy8gb3RoZXIgbGFuZHNjYXBlXG4gICAgICAgIClcbiAgICApIHtcbiAgICAgICAgY29uc3QgcmVnZXggPSAvKFZlcnNpb24pXFwvKFtcXGQuXSspLy5leGVjKHVhKTtcbiAgICAgICAgaWYgKG1heWJlVGFibGV0KHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpKSB7XG4gICAgICAgICAgICBpcGFkID0gcmVnZXg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpcGhvbmUgPSByZWdleDtcbiAgICAgICAgfVxuICAgICAgICBtYWNvcyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGluZm8uaWUgPSBpZTtcbiAgICBpbmZvLmVkZ2UgPSBlZGdlO1xuICAgIGluZm8uZmlyZWZveCA9IGZpcmVmb3g7XG5cbiAgICAvLyBBbmRyb2lkXG4gICAgaWYgKGFuZHJvaWQgJiYgIXdpbmRvd3MpIHtcbiAgICAgICAgaW5mby5vcyA9ICdhbmRyb2lkJztcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBhbmRyb2lkWzJdO1xuICAgICAgICBpbmZvLmFuZHJvaWQgPSB0cnVlO1xuICAgICAgICBpbmZvLmFuZHJvaWRDaHJvbWUgPSAwIDw9IHVhLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignY2hyb21lJyk7XG4gICAgICAgIGlmICgwIDw9IHVhLmluZGV4T2YoJ01vYmlsZScpKSB7XG4gICAgICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluZm8udGFibGV0ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXBhZCB8fCBpcGhvbmUgfHwgaXBvZCkge1xuICAgICAgICBpbmZvLm9zID0gJ2lvcyc7XG4gICAgICAgIGluZm8uaW9zID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8gaU9TXG4gICAgaWYgKGlwaG9uZSAmJiAhaXBvZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwaG9uZVsyXS5yZXBsYWNlKC9fL2csICcuJyk7XG4gICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwaG9uZSA9IHRydWU7XG4gICAgICAgIC8vIGlQaG9uZSBYXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICgzNzUgPT09IHNjcmVlbldpZHRoICYmIDgxMiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYLCBYUyBwb3J0cmFpdFxuICAgICAgICAgfHwgKDgxMiA9PT0gc2NyZWVuV2lkdGggJiYgMzc1ID09PSBzY3JlZW5IZWlnaHQpIC8vIFgsIFhTIGxhbmRzY2FwZVxuICAgICAgICAgfHwgKDQxNCA9PT0gc2NyZWVuV2lkdGggJiYgODk2ID09PSBzY3JlZW5IZWlnaHQpIC8vIFhTIE1heCwgWFIgcG9ydHJhaXRcbiAgICAgICAgIHx8ICg4OTYgPT09IHNjcmVlbldpZHRoICYmIDQxNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYUyBNYXgsIFhSIGxhbmRzY2FwZVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGluZm8uaXBob25lWCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlwYWQpIHtcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBpcGFkWzJdLnJlcGxhY2UoL18vZywgJy4nKTtcbiAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwYWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXBvZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwb2RbM10gPyBpcG9kWzNdLnJlcGxhY2UoL18vZywgJy4nKSA6IG51bGw7XG4gICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwb2QgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIERlc2t0b3BcbiAgICBpbmZvLmRlc2t0b3AgPSAhc3VwcG9ydE9yaWVudGF0aW9uKHVhKTtcbiAgICBpZiAoaW5mby5kZXNrdG9wKSB7XG4gICAgICAgIGluZm8uZWxlY3Ryb24gPSBlbGVjdHJvbjtcbiAgICAgICAgaW5mby5tYWNvcyAgICA9IG1hY29zO1xuICAgICAgICBpbmZvLndpbmRvd3MgID0gd2luZG93cztcbiAgICAgICAgaW5mby5tYWNvcyAmJiAoaW5mby5vcyA9ICdtYWNvcycpO1xuICAgICAgICBpbmZvLndpbmRvd3MgJiYgKGluZm8ub3MgPSAnd2luZG93cycpO1xuICAgIH1cblxuICAgIC8vIE1vYmlsZVxuICAgIGluZm8ubW9iaWxlID0gIWluZm8uZGVza3RvcDtcbiAgICBpZiAoaW5mby5tb2JpbGUgJiYgIWluZm8ucGhvbmUgJiYgIWluZm8udGFibGV0KSB7XG4gICAgICAgIGlmIChtYXliZVRhYmxldChzY3JlZW5XaWR0aCwgc2NyZWVuSGVpZ2h0KSkge1xuICAgICAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQaXhlbCBSYXRpb1xuICAgIGluZm8ucGl4ZWxSYXRpbyA9IHBpeGVsUmF0aW8gfHwgMTtcblxuICAgIHJldHVybiBpbmZvO1xufTtcblxuLyoqXG4gKiBAZW4gUGxhdGZvcm0gaW5mb3JtYXRpb24gb24gcnVudGltZS5cbiAqIEBqYSDjg6njg7Pjgr/jgqTjg6Djga7jg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLFcbiAqL1xuZXhwb3J0IGNvbnN0IHBsYXRmb3JtID0gcXVlcnlQbGF0Zm9ybSgpO1xuIl0sIm5hbWVzIjpbImxvY2F0aW9uIiwibmF2aWdhdG9yIiwic2NyZWVuIiwiZGV2aWNlUGl4ZWxSYXRpbyJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVBOzs7QUFJQTtBQUNBLE1BQU0sU0FBUyxHQUFXLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEQ7QUFDQSxNQUFNLFVBQVUsR0FBVSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JEO0FBQ0EsTUFBTSxPQUFPLEdBQWEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNsRDtBQUNBLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQzs7QUNYM0Q7Ozs7Ozs7O01BUWEsZUFBZSxHQUFHLENBQUMsR0FBVztJQUN2QyxNQUFNLEtBQUssR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0MsT0FBTyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3JDLEVBQUU7QUFFRjs7Ozs7O01BTWEsT0FBTyxHQUFXLGVBQWUsQ0FBQ0EsU0FBUSxDQUFDLElBQUksRUFBRTtBQUU5RDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztNQW1CYSxLQUFL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
