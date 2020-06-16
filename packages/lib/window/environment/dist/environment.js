/*!
 * @cdp/environment 0.9.0
 *   environment resolver module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP));
}(this, (function (exports, coreUtils) { 'use strict';

    /*
     * SSR (Server Side Rendering) 環境においてもオブジェクト等の存在を保証する
     */
    /** @internal */
    const _location = coreUtils.safe(globalThis.location);
    /** @internal */
    const _navigator = coreUtils.safe(globalThis.navigator);
    /** @internal */
    const _screen = coreUtils.safe(globalThis.screen);
    /** @internal */
    const _devicePixelRatio = coreUtils.safe(globalThis.devicePixelRatio);

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
     ,  @typescript-eslint/no-explicit-any
     */
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
            cordova: !!coreUtils.getGlobal().cordova,
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

    exports.getWebDirectory = getWebDirectory;
    exports.platform = platform;
    exports.queryPlatform = queryPlatform;
    exports.toUrl = toUrl;
    exports.webRoot = webRoot;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VzIjpbInNzci50cyIsIndlYi50cyIsInBsYXRmb3JtLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCguOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9sb2NhdGlvbiAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmxvY2F0aW9uKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9uYXZpZ2F0b3IgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLm5hdmlnYXRvcik7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2NyZWVuICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5zY3JlZW4pO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2RldmljZVBpeGVsUmF0aW8gPSBzYWZlKGdsb2JhbFRoaXMuZGV2aWNlUGl4ZWxSYXRpbyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB7XG4gICAgX2xvY2F0aW9uIGFzIGxvY2F0aW9uLFxuICAgIF9uYXZpZ2F0b3IgYXMgbmF2aWdhdG9yLFxuICAgIF9zY3JlZW4gYXMgc2NyZWVuLFxuICAgIF9kZXZpY2VQaXhlbFJhdGlvIGFzIGRldmljZVBpeGVsUmF0aW8sXG59O1xuIiwiaW1wb3J0IHsgbG9jYXRpb24gfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGlyZWN0b3J5IHRvIHdoaWNoIGB1cmxgIGJlbG9uZ3MuXG4gKiBAamEg5oyH5a6aIGB1cmxgIOOBruaJgOWxnuOBmeOCi+ODh+OCo+ODrOOCr+ODiOODquOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgdGFyZ2V0IFVSTFxuICogIC0gYGphYCDlr77osaHjga4gVVJMXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRXZWJEaXJlY3RvcnkgPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gLyguK1xcLykoW14vXSojW14vXSspPy8uZXhlYyh1cmwpO1xuICAgIHJldHVybiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHx8ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQWNjc2Vzc29yIGZvciBXZWIgcm9vdCBsb2NhdGlvbiA8YnI+XG4gKiAgICAgT25seSB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCB3aWxsIGJlIGFuIGFsbG9jYXRpbmcgcGxhY2UgaW4gaW5kZXguaHRtbCwgYW5kIGJlY29tZXMgZWZmZWN0aXZlLlxuICogQGphIFdlYiByb290IGxvY2F0aW9uIOOBuOOBruOCouOCr+OCu+OCuSA8YnI+XG4gKiAgICAgaW5kZXguaHRtbCDjga7phY3nva7loLTmiYDjgajjgarjgorjgIHjg5bjg6njgqbjgrbnkrDlooPjga7jgb/mnInlirnjgajjgarjgosuXG4gKi9cbmV4cG9ydCBjb25zdCB3ZWJSb290OiBzdHJpbmcgPSBnZXRXZWJEaXJlY3RvcnkobG9jYXRpb24uaHJlZik7XG5cbi8qKlxuICogQGVuIENvbnZlcnRlciBmcm9tIHJlbGF0aXZlIHBhdGggdG8gYWJzb2x1dGUgdXJsIHN0cmluZy4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++IHBhdGgg44KS57W25a++IFVSTCDjgavlpInmj5sgPGJyPlxuICogICAgIGpzIOOBrumFjee9ruOBq+S+neWtmOOBmeOCi+OBk+OBqOOBquOBjyBgYXNzZXRzYCDjgqLjgq/jgrvjgrnjgZfjgZ/jgYTjgajjgY3jgavkvb/nlKjjgZnjgosuXG4gKlxuICogQHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMTg4MjE4L3JlbGF0aXZlLXBhdGhzLWluLWphdmFzY3JpcHQtaW4tYW4tZXh0ZXJuYWwtZmlsZVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogIGNvbnNvbGUubG9nKHRvVXJsKCcvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uJykpO1xuICogIC8vIFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwL2FwcC9yZXMvZGF0YS9jb2xsZWN0aW9uLmpzb25cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgc2V0IHJlbGF0aXZlIHBhdGggZnJvbSBbW3dlYlJvb3RdXS5cbiAqICAtIGBqYWAgW1t3ZWJSb290XV0g44GL44KJ44Gu55u45a++44OR44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1VybCA9IChwYXRoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChudWxsICE9IHBhdGggJiYgbnVsbCAhPSBwYXRoWzBdKSB7XG4gICAgICAgIHJldHVybiAoJy8nID09PSBwYXRoWzBdKSA/IHdlYlJvb3QgKyBwYXRoLnNsaWNlKDEpIDogd2ViUm9vdCArIHBhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHdlYlJvb3Q7XG4gICAgfVxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgc3BhY2UtaW4tcGFyZW5zXG4gLCAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7IFdyaXRhYmxlLCBnZXRHbG9iYWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBuYXZpZ2F0b3IsXG4gICAgc2NyZWVuLFxuICAgIGRldmljZVBpeGVsUmF0aW8sXG59IGZyb20gJy4vc3NyJztcblxuY29uc3QgZW51bSBUaHJlc2hvbGQge1xuICAgIFRBQkxFVF9NSU5fV0lEVEggPSA2MDAsIC8vIGZhbGxiYWNrIGRldGVjdGlvbiB2YWx1ZVxufVxuXG4vKipcbiAqIEBlbiBQbGF0Zm9ybSBpbmZvcm1hdGlvbi5cbiAqIEBqYSDjg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLFcbiAqXG4gKiBAc2VlXG4gKiAgLSBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi9tYXN0ZXIvc3JjL2NvcmUvdXRpbHMvaW5mby5qc1xuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL09uc2VuVUkvT25zZW5VSS9ibG9iL21hc3Rlci9jb3JlL3NyYy9vbnMvcGxhdGZvcm0uanNcbiAqICAtIGh0dHBzOi8vd3d3LmJpdC1oaXZlLmNvbS9hcnRpY2xlcy8yMDE5MDgyMFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsYXRmb3JtIHtcbiAgICAvKiogdHJ1ZSBmb3IgaU9TIGluZm8gKi9cbiAgICByZWFkb25seSBpb3M6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEFuZHJvaWQgaW5mbyAqL1xuICAgIHJlYWRvbmx5IGFuZHJvaWQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEFuZHJvaWQgQ2hyb21lICovXG4gICAgcmVhZG9ubHkgYW5kcm9pZENocm9tZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBicm93c2VyICovXG4gICAgcmVhZG9ubHkgZGVza3RvcDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgbW9iaWxlIGluZm8gKi9cbiAgICByZWFkb25seSBtb2JpbGU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIHNtYXJ0IHBob25lIChpbmNsdWRpbmcgaVBvZCkgaW5mbyAqL1xuICAgIHJlYWRvbmx5IHBob25lOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciB0YWJsZXQgaW5mbyAqL1xuICAgIHJlYWRvbmx5IHRhYmxldDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBob25lICovXG4gICAgcmVhZG9ubHkgaXBob25lOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGhvbmVYICovXG4gICAgcmVhZG9ubHkgaXBob25lWDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBvZCAqL1xuICAgIHJlYWRvbmx5IGlwb2Q6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQYWQgKi9cbiAgICByZWFkb25seSBpcGFkOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBNUyBFZGdlIGJyb3dzZXIgKi9cbiAgICByZWFkb25seSBlZGdlOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBJbnRlcm5ldCBFeHBsb3JlciBicm93c2VyKi9cbiAgICByZWFkb25seSBpZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgRmlyZUZveCBicm93c2VyKi9cbiAgICByZWFkb25seSBmaXJlZm94OiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIE1hY09TICovXG4gICAgcmVhZG9ubHkgbWFjb3M6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgV2luZG93cyAqL1xuICAgIHJlYWRvbmx5IHdpbmRvd3M6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgd2hlbiBhcHAgcnVubmluZyBpbiBjb3Jkb3ZhIGVudmlyb25tZW50ICovXG4gICAgcmVhZG9ubHkgY29yZG92YTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSB3aGVuIGFwcCBydW5uaW5nIGluIGVsZWN0cm9uIGVudmlyb25tZW50ICovXG4gICAgcmVhZG9ubHkgZWxlY3Ryb246IGJvb2xlYW47XG4gICAgLyoqIENvbnRhaW5zIE9TIGNhbiBiZSBpb3MsIGFuZHJvaWQgb3Igd2luZG93cyAoZm9yIFdpbmRvd3MgUGhvbmUpICovXG4gICAgcmVhZG9ubHkgb3M6IHN0cmluZztcbiAgICAvKiogQ29udGFpbnMgT1MgdmVyc2lvbiwgZS5nLiAxMS4yLjAgKi9cbiAgICByZWFkb25seSBvc1ZlcnNpb246IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQ7XG4gICAgLyoqIERldmljZSBwaXhlbCByYXRpbyAqL1xuICAgIHJlYWRvbmx5IHBpeGVsUmF0aW86IG51bWJlcjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbmNvbnN0IG1heWJlVGFibGV0ID0gKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIChUaHJlc2hvbGQuVEFCTEVUX01JTl9XSURUSCA8PSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSk7XG59O1xuXG5jb25zdCBzdXBwb3J0VG91Y2ggPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICEhKChuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgPiAwKSB8fCAoJ29udG91Y2hzdGFydCcgaW4gZ2xvYmFsVGhpcykpO1xufTtcblxuY29uc3Qgc3VwcG9ydE9yaWVudGF0aW9uID0gKHVhOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gKCdvcmllbnRhdGlvbicgaW4gZ2xvYmFsVGhpcykgfHwgKDAgPD0gdWEuaW5kZXhPZignV2luZG93cyBQaG9uZScpKTtcbn07XG5cbi8qKlxuICogQGVuIFF1ZXJ5IHBsYXRmb3JtIGluZm9ybWF0aW9uLlxuICogQGphIOODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgseOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIGdpdmVuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIGluZm9ybWF0aW9uLlxuICogIC0gYGphYCDnkrDlooPjga4gYE5hdmlnYXRvcmAsIGBTY3JlZW5gLCBgZGV2aWNlUGl4ZWxSYXRpb2Ag44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCBxdWVyeVBsYXRmb3JtID0gKFxuICAgIGNvbnRleHQ/OiB7XG4gICAgICAgIG5hdmlnYXRvcj86IHsgdXNlckFnZW50OiBzdHJpbmc7IHBsYXRmb3JtOiBzdHJpbmc7IHN0YW5kYWxvbmU/OiBib29sZWFuOyB9O1xuICAgICAgICBzY3JlZW4/OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyOyB9O1xuICAgICAgICBkZXZpY2VQaXhlbFJhdGlvPzogbnVtYmVyO1xuICAgIH1cbik6IFBsYXRmb3JtID0+IHtcbiAgICBjb250ZXh0ID0gY29udGV4dCB8fCB7IG5hdmlnYXRvciwgc2NyZWVuLCBkZXZpY2VQaXhlbFJhdGlvIH07XG4gICAgY29uc3QgaW5mbyA9IHtcbiAgICAgICAgaW9zOiBmYWxzZSxcbiAgICAgICAgYW5kcm9pZDogZmFsc2UsXG4gICAgICAgIGFuZHJvaWRDaHJvbWU6IGZhbHNlLFxuICAgICAgICBkZXNrdG9wOiBmYWxzZSxcbiAgICAgICAgbW9iaWxlOiBmYWxzZSxcbiAgICAgICAgcGhvbmU6IGZhbHNlLFxuICAgICAgICB0YWJsZXQ6IGZhbHNlLFxuICAgICAgICBpcGhvbmU6IGZhbHNlLFxuICAgICAgICBpcGhvbmVYOiBmYWxzZSxcbiAgICAgICAgaXBvZDogZmFsc2UsXG4gICAgICAgIGlwYWQ6IGZhbHNlLFxuICAgICAgICBlZGdlOiBmYWxzZSxcbiAgICAgICAgaWU6IGZhbHNlLFxuICAgICAgICBmaXJlZm94OiBmYWxzZSxcbiAgICAgICAgbWFjb3M6IGZhbHNlLFxuICAgICAgICB3aW5kb3dzOiBmYWxzZSxcbiAgICAgICAgY29yZG92YTogISEoZ2V0R2xvYmFsKCkgYXMgYW55KS5jb3Jkb3ZhLFxuICAgICAgICBlbGVjdHJvbjogZmFsc2UsXG4gICAgfSBhcyBhbnkgYXMgV3JpdGFibGU8UGxhdGZvcm0+O1xuXG4gICAgY29uc3QgeyB1c2VyQWdlbnQ6IHVhLCBwbGF0Zm9ybTogb3MsIHN0YW5kYWxvbmUgfSA9IGNvbnRleHQubmF2aWdhdG9yIHx8IG5hdmlnYXRvciBhcyB7IHVzZXJBZ2VudDogc3RyaW5nOyBwbGF0Zm9ybTogc3RyaW5nOyBzdGFuZGFsb25lPzogYm9vbGVhbjsgfTtcbiAgICBjb25zdCB7IHdpZHRoOiBzY3JlZW5XaWR0aCwgaGVpZ2h0OiBzY3JlZW5IZWlnaHQgfSA9IGNvbnRleHQuc2NyZWVuIHx8IHNjcmVlbjtcbiAgICBjb25zdCBwaXhlbFJhdGlvID0gY29udGV4dC5kZXZpY2VQaXhlbFJhdGlvO1xuXG4gICAgY29uc3QgYW5kcm9pZCAgPSAvKEFuZHJvaWQpOz9bXFxzL10rKFtcXGQuXSspPy8uZXhlYyh1YSk7XG4gICAgbGV0ICAgaXBhZCAgICAgPSAvKGlQYWQpLipPU1xccyhbXFxkX10rKS8uZXhlYyh1YSk7XG4gICAgY29uc3QgaXBvZCAgICAgPSAvKGlQb2QpKC4qT1NcXHMoW1xcZF9dKykpPy8uZXhlYyh1YSk7XG4gICAgbGV0ICAgaXBob25lICAgPSAhaXBhZCAmJiAvKGlQaG9uZVxcc09TfGlPUylcXHMoW1xcZF9dKykvLmV4ZWModWEpO1xuICAgIGNvbnN0IGllICAgICAgID0gMCA8PSB1YS5pbmRleE9mKCdNU0lFICcpIHx8IDAgPD0gdWEuaW5kZXhPZignVHJpZGVudC8nKTtcbiAgICBjb25zdCBlZGdlICAgICA9IDAgPD0gdWEuaW5kZXhPZignRWRnZS8nKTtcbiAgICBjb25zdCBmaXJlZm94ICA9IDAgPD0gdWEuaW5kZXhPZignR2Vja28vJykgJiYgMCA8PSB1YS5pbmRleE9mKCdGaXJlZm94LycpO1xuICAgIGNvbnN0IHdpbmRvd3MgID0gJ1dpbjMyJyA9PT0gb3M7XG4gICAgbGV0ICAgbWFjb3MgICAgPSAnTWFjSW50ZWwnID09PSBvcztcbiAgICBjb25zdCBlbGVjdHJvbiA9IHVhLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCgnZWxlY3Ryb24nKTtcblxuICAgIC8vIGlQaG9uZShYKSAvIGlQYWQoUHJvKURlc2t0b3AgTW9kZVxuICAgIGlmICghaXBob25lICYmICFpcGFkXG4gICAgICAgICYmIG1hY29zXG4gICAgICAgICYmIHN1cHBvcnRUb3VjaCgpXG4gICAgICAgICYmICh1bmRlZmluZWQgIT09IHN0YW5kYWxvbmVcbi8vICAgICAgICAgICAgKDEwMjQgPT09IHNjcmVlbldpZHRoICYmIDEzNjYgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDEzNjYgPT09IHNjcmVlbldpZHRoICYmIDEwMjQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTk0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTE5NCA9PT0gc2NyZWVuV2lkdGggJiYgIDgzNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTEgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMTEyID09PSBzY3JlZW5XaWR0aCAmJiAgODM0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDc2OCA9PT0gc2NyZWVuV2lkdGggJiYgMTAyNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTAyNCA9PT0gc2NyZWVuV2lkdGggJiYgIDc2OCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBsYW5kc2NhcGVcbiAgICAgICAgKVxuICAgICkge1xuICAgICAgICBjb25zdCByZWdleCA9IC8oVmVyc2lvbilcXC8oW1xcZC5dKykvLmV4ZWModWEpO1xuICAgICAgICBpZiAobWF5YmVUYWJsZXQoc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkpIHtcbiAgICAgICAgICAgIGlwYWQgPSByZWdleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlwaG9uZSA9IHJlZ2V4O1xuICAgICAgICB9XG4gICAgICAgIG1hY29zID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaW5mby5pZSA9IGllO1xuICAgIGluZm8uZWRnZSA9IGVkZ2U7XG4gICAgaW5mby5maXJlZm94ID0gZmlyZWZveDtcblxuICAgIC8vIEFuZHJvaWRcbiAgICBpZiAoYW5kcm9pZCAmJiAhd2luZG93cykge1xuICAgICAgICBpbmZvLm9zID0gJ2FuZHJvaWQnO1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGFuZHJvaWRbMl07XG4gICAgICAgIGluZm8uYW5kcm9pZCA9IHRydWU7XG4gICAgICAgIGluZm8uYW5kcm9pZENocm9tZSA9IDAgPD0gdWEudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdjaHJvbWUnKTtcbiAgICAgICAgaWYgKDAgPD0gdWEuaW5kZXhPZignTW9iaWxlJykpIHtcbiAgICAgICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpcGFkIHx8IGlwaG9uZSB8fCBpcG9kKSB7XG4gICAgICAgIGluZm8ub3MgPSAnaW9zJztcbiAgICAgICAgaW5mby5pb3MgPSB0cnVlO1xuICAgIH1cbiAgICAvLyBpT1NcbiAgICBpZiAoaXBob25lICYmICFpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBob25lWzJdLnJlcGxhY2UoL18vZywgJy4nKTtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBob25lID0gdHJ1ZTtcbiAgICAgICAgLy8gaVBob25lIFhcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgKDM3NSA9PT0gc2NyZWVuV2lkdGggJiYgODEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFgsIFhTIHBvcnRyYWl0XG4gICAgICAgICB8fCAoODEyID09PSBzY3JlZW5XaWR0aCAmJiAzNzUgPT09IHNjcmVlbkhlaWdodCkgLy8gWCwgWFMgbGFuZHNjYXBlXG4gICAgICAgICB8fCAoNDE0ID09PSBzY3JlZW5XaWR0aCAmJiA4OTYgPT09IHNjcmVlbkhlaWdodCkgLy8gWFMgTWF4LCBYUiBwb3J0cmFpdFxuICAgICAgICAgfHwgKDg5NiA9PT0gc2NyZWVuV2lkdGggJiYgNDE0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFhTIE1heCwgWFIgbGFuZHNjYXBlXG4gICAgICAgICkge1xuICAgICAgICAgICAgaW5mby5pcGhvbmVYID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXBhZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwYWRbMl0ucmVwbGFjZSgvXy9nLCAnLicpO1xuICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIGluZm8uaXBhZCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBvZFszXSA/IGlwb2RbM10ucmVwbGFjZSgvXy9nLCAnLicpIDogbnVsbDtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBvZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gRGVza3RvcFxuICAgIGluZm8uZGVza3RvcCA9ICFzdXBwb3J0T3JpZW50YXRpb24odWEpO1xuICAgIGlmIChpbmZvLmRlc2t0b3ApIHtcbiAgICAgICAgaW5mby5lbGVjdHJvbiA9IGVsZWN0cm9uO1xuICAgICAgICBpbmZvLm1hY29zICAgID0gbWFjb3M7XG4gICAgICAgIGluZm8ud2luZG93cyAgPSB3aW5kb3dzO1xuICAgICAgICBpbmZvLm1hY29zICYmIChpbmZvLm9zID0gJ21hY29zJyk7XG4gICAgICAgIGluZm8ud2luZG93cyAmJiAoaW5mby5vcyA9ICd3aW5kb3dzJyk7XG4gICAgfVxuXG4gICAgLy8gTW9iaWxlXG4gICAgaW5mby5tb2JpbGUgPSAhaW5mby5kZXNrdG9wO1xuICAgIGlmIChpbmZvLm1vYmlsZSAmJiAhaW5mby5waG9uZSAmJiAhaW5mby50YWJsZXQpIHtcbiAgICAgICAgaWYgKG1heWJlVGFibGV0KHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpKSB7XG4gICAgICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFBpeGVsIFJhdGlvXG4gICAgaW5mby5waXhlbFJhdGlvID0gcGl4ZWxSYXRpbyB8fCAxO1xuXG4gICAgcmV0dXJuIGluZm87XG59O1xuXG4vKipcbiAqIEBlbiBQbGF0Zm9ybSBpbmZvcm1hdGlvbiBvbiBydW50aW1lLlxuICogQGphIOODqeODs+OCv+OCpOODoOOBruODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgsVxuICovXG5leHBvcnQgY29uc3QgcGxhdGZvcm0gPSBxdWVyeVBsYXRmb3JtKCk7XG4iXSwibmFtZXMiOlsic2FmZSIsImxvY2F0aW9uIiwibmF2aWdhdG9yIiwic2NyZWVuIiwiZGV2aWNlUGl4ZWxSYXRpbyIsImdldEdsb2JhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFFQTs7O0lBSUE7SUFDQSxNQUFNLFNBQVMsR0FBV0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwRDtJQUNBLE1BQU0sVUFBVSxHQUFVQSxjQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JEO0lBQ0EsTUFBTSxPQUFPLEdBQWFBLGNBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQ7SUFDQSxNQUFNLGlCQUFpQixHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDOztJQ1gzRDs7Ozs7Ozs7VUFRYSxlQUFlLEdBQUcsQ0FBQyxHQUFXO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQyxPQUFPLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FB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QUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztTQUNwQjtRQUNELElBQUksSUFBSSxFQUFFO1lBQ04sSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQzdELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ3BCOztRQUdELElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDZCxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztZQUN6QixJQUFJLENBQUMsS0FBSyxHQUFNLEtBQUssQ0FBQztZQUN0QixJQUFJLENBQUMsT0FBTyxHQUFJLE9BQU8sQ0FBQztZQUN4QixJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1NBQ3pDOztRQUdELElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzVDLElBQUksV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsRUFBRTtnQkFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7YUFDdEI7aUJBQU07Z0JBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7YUFDckI7U0FDSjs7UUFHRCxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsSUFBSSxDQUFDLENBQUM7UUFFbEMsT0FBTyxJQUFJLENBQUM7SUFDaEIsRUFBRTtJQUVGOzs7O1VBSWEsUUFBUSxHQUFHLGFBQWE7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2Vudmlyb25tZW50LyJ9
