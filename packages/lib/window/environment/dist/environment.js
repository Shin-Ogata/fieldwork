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
     , @typescript-eslint/no-explicit-any
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VzIjpbInNzci50cyIsIndlYi50cyIsInBsYXRmb3JtLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCguOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9sb2NhdGlvbiAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmxvY2F0aW9uKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9uYXZpZ2F0b3IgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLm5hdmlnYXRvcik7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2NyZWVuICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5zY3JlZW4pO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2RldmljZVBpeGVsUmF0aW8gPSBzYWZlKGdsb2JhbFRoaXMuZGV2aWNlUGl4ZWxSYXRpbyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB7XG4gICAgX2xvY2F0aW9uIGFzIGxvY2F0aW9uLFxuICAgIF9uYXZpZ2F0b3IgYXMgbmF2aWdhdG9yLFxuICAgIF9zY3JlZW4gYXMgc2NyZWVuLFxuICAgIF9kZXZpY2VQaXhlbFJhdGlvIGFzIGRldmljZVBpeGVsUmF0aW8sXG59O1xuIiwiaW1wb3J0IHsgbG9jYXRpb24gfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGlyZWN0b3J5IHRvIHdoaWNoIGB1cmxgIGJlbG9uZ3MuXG4gKiBAamEg5oyH5a6aIGB1cmxgIOOBruaJgOWxnuOBmeOCi+ODh+OCo+ODrOOCr+ODiOODquOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgdGFyZ2V0IFVSTFxuICogIC0gYGphYCDlr77osaHjga4gVVJMXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRXZWJEaXJlY3RvcnkgPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gLyguK1xcLykoW14vXSojW14vXSspPy8uZXhlYyh1cmwpO1xuICAgIHJldHVybiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHx8ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQWNjc2Vzc29yIGZvciBXZWIgcm9vdCBsb2NhdGlvbiA8YnI+XG4gKiAgICAgT25seSB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCB3aWxsIGJlIGFuIGFsbG9jYXRpbmcgcGxhY2UgaW4gaW5kZXguaHRtbCwgYW5kIGJlY29tZXMgZWZmZWN0aXZlLlxuICogQGphIFdlYiByb290IGxvY2F0aW9uIOOBuOOBruOCouOCr+OCu+OCuSA8YnI+XG4gKiAgICAgaW5kZXguaHRtbCDjga7phY3nva7loLTmiYDjgajjgarjgorjgIHjg5bjg6njgqbjgrbnkrDlooPjga7jgb/mnInlirnjgajjgarjgosuXG4gKi9cbmV4cG9ydCBjb25zdCB3ZWJSb290OiBzdHJpbmcgPSBnZXRXZWJEaXJlY3RvcnkobG9jYXRpb24uaHJlZik7XG5cbi8qKlxuICogQGVuIENvbnZlcnRlciBmcm9tIHJlbGF0aXZlIHBhdGggdG8gYWJzb2x1dGUgdXJsIHN0cmluZy4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++IHBhdGgg44KS57W25a++IFVSTCDjgavlpInmj5sgPGJyPlxuICogICAgIGpzIOOBrumFjee9ruOBq+S+neWtmOOBmeOCi+OBk+OBqOOBquOBjyBgYXNzZXRzYCDjgqLjgq/jgrvjgrnjgZfjgZ/jgYTjgajjgY3jgavkvb/nlKjjgZnjgosuXG4gKlxuICogQHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMTg4MjE4L3JlbGF0aXZlLXBhdGhzLWluLWphdmFzY3JpcHQtaW4tYW4tZXh0ZXJuYWwtZmlsZVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogIGNvbnNvbGUubG9nKHRvVXJsKCcvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uJykpO1xuICogIC8vIFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwL2FwcC9yZXMvZGF0YS9jb2xsZWN0aW9uLmpzb25cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgc2V0IHJlbGF0aXZlIHBhdGggZnJvbSBbW3dlYlJvb3RdXS5cbiAqICAtIGBqYWAgW1t3ZWJSb290XV0g44GL44KJ44Gu55u45a++44OR44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1VybCA9IChwYXRoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChudWxsICE9IHBhdGggJiYgbnVsbCAhPSBwYXRoWzBdKSB7XG4gICAgICAgIHJldHVybiAoJy8nID09PSBwYXRoWzBdKSA/IHdlYlJvb3QgKyBwYXRoLnNsaWNlKDEpIDogd2ViUm9vdCArIHBhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHdlYlJvb3Q7XG4gICAgfVxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBzcGFjZS1pbi1wYXJlbnNcbiAsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQgeyBXcml0YWJsZSwgZ2V0R2xvYmFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgbmF2aWdhdG9yLFxuICAgIHNjcmVlbixcbiAgICBkZXZpY2VQaXhlbFJhdGlvLFxufSBmcm9tICcuL3Nzcic7XG5cbmNvbnN0IGVudW0gVGhyZXNob2xkIHtcbiAgICBUQUJMRVRfTUlOX1dJRFRIID0gNjAwLCAvLyBmYWxsYmFjayBkZXRlY3Rpb24gdmFsdWVcbn1cblxuLyoqXG4gKiBAZW4gUGxhdGZvcm0gaW5mb3JtYXRpb24uXG4gKiBAamEg44OX44Op44OD44OI44OV44Kp44O844Og5oOF5aCxXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvbWFzdGVyL3NyYy9jb3JlL3V0aWxzL2luZm8uanNcbiAqICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9PbnNlblVJL09uc2VuVUkvYmxvYi9tYXN0ZXIvY29yZS9zcmMvb25zL3BsYXRmb3JtLmpzXG4gKiAgLSBodHRwczovL3d3dy5iaXQtaGl2ZS5jb20vYXJ0aWNsZXMvMjAxOTA4MjBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF0Zm9ybSB7XG4gICAgLyoqIHRydWUgZm9yIGlPUyBpbmZvICovXG4gICAgcmVhZG9ubHkgaW9zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIGluZm8gKi9cbiAgICByZWFkb25seSBhbmRyb2lkOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIENocm9tZSAqL1xuICAgIHJlYWRvbmx5IGFuZHJvaWRDaHJvbWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgYnJvd3NlciAqL1xuICAgIHJlYWRvbmx5IGRlc2t0b3A6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIG1vYmlsZSBpbmZvICovXG4gICAgcmVhZG9ubHkgbW9iaWxlOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBzbWFydCBwaG9uZSAoaW5jbHVkaW5nIGlQb2QpIGluZm8gKi9cbiAgICByZWFkb25seSBwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgdGFibGV0IGluZm8gKi9cbiAgICByZWFkb25seSB0YWJsZXQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQaG9uZSAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBob25lWCAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZVg6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQb2QgKi9cbiAgICByZWFkb25seSBpcG9kOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGFkICovXG4gICAgcmVhZG9ubHkgaXBhZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgTVMgRWRnZSBicm93c2VyICovXG4gICAgcmVhZG9ubHkgZWRnZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgSW50ZXJuZXQgRXhwbG9yZXIgYnJvd3NlciovXG4gICAgcmVhZG9ubHkgaWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEZpcmVGb3ggYnJvd3NlciovXG4gICAgcmVhZG9ubHkgZmlyZWZveDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBNYWNPUyAqL1xuICAgIHJlYWRvbmx5IG1hY29zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIFdpbmRvd3MgKi9cbiAgICByZWFkb25seSB3aW5kb3dzOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIHdoZW4gYXBwIHJ1bm5pbmcgaW4gY29yZG92YSBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGNvcmRvdmE6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgd2hlbiBhcHAgcnVubmluZyBpbiBlbGVjdHJvbiBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGVsZWN0cm9uOiBib29sZWFuO1xuICAgIC8qKiBDb250YWlucyBPUyBjYW4gYmUgaW9zLCBhbmRyb2lkIG9yIHdpbmRvd3MgKGZvciBXaW5kb3dzIFBob25lKSAqL1xuICAgIHJlYWRvbmx5IG9zOiBzdHJpbmc7XG4gICAgLyoqIENvbnRhaW5zIE9TIHZlcnNpb24sIGUuZy4gMTEuMi4wICovXG4gICAgcmVhZG9ubHkgb3NWZXJzaW9uOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkO1xuICAgIC8qKiBEZXZpY2UgcGl4ZWwgcmF0aW8gKi9cbiAgICByZWFkb25seSBwaXhlbFJhdGlvOiBudW1iZXI7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBtYXliZVRhYmxldCA9ICh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAoVGhyZXNob2xkLlRBQkxFVF9NSU5fV0lEVEggPD0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkpO1xufTtcblxuY29uc3Qgc3VwcG9ydFRvdWNoID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAhISgobmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGdsb2JhbFRoaXMpKTtcbn07XG5cbmNvbnN0IHN1cHBvcnRPcmllbnRhdGlvbiA9ICh1YTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICgnb3JpZW50YXRpb24nIGluIGdsb2JhbFRoaXMpIHx8ICgwIDw9IHVhLmluZGV4T2YoJ1dpbmRvd3MgUGhvbmUnKSk7XG59O1xuXG4vKipcbiAqIEBlbiBRdWVyeSBwbGF0Zm9ybSBpbmZvcm1hdGlvbi5cbiAqIEBqYSDjg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLHjga7lj5blvpdcbiAqXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBnaXZlbiBgTmF2aWdhdG9yYCwgYFNjcmVlbmAsIGBkZXZpY2VQaXhlbFJhdGlvYCBpbmZvcm1hdGlvbi5cbiAqICAtIGBqYWAg55Kw5aKD44GuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIOOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgcXVlcnlQbGF0Zm9ybSA9IChcbiAgICBjb250ZXh0Pzoge1xuICAgICAgICBuYXZpZ2F0b3I/OiB7IHVzZXJBZ2VudDogc3RyaW5nOyBwbGF0Zm9ybTogc3RyaW5nOyBzdGFuZGFsb25lPzogYm9vbGVhbjsgfTtcbiAgICAgICAgc2NyZWVuPzogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlcjsgfTtcbiAgICAgICAgZGV2aWNlUGl4ZWxSYXRpbz86IG51bWJlcjtcbiAgICB9XG4pOiBQbGF0Zm9ybSA9PiB7XG4gICAgY29udGV4dCA9IGNvbnRleHQgfHwgeyBuYXZpZ2F0b3IsIHNjcmVlbiwgZGV2aWNlUGl4ZWxSYXRpbyB9O1xuICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgIGlvczogZmFsc2UsXG4gICAgICAgIGFuZHJvaWQ6IGZhbHNlLFxuICAgICAgICBhbmRyb2lkQ2hyb21lOiBmYWxzZSxcbiAgICAgICAgZGVza3RvcDogZmFsc2UsXG4gICAgICAgIG1vYmlsZTogZmFsc2UsXG4gICAgICAgIHBob25lOiBmYWxzZSxcbiAgICAgICAgdGFibGV0OiBmYWxzZSxcbiAgICAgICAgaXBob25lOiBmYWxzZSxcbiAgICAgICAgaXBob25lWDogZmFsc2UsXG4gICAgICAgIGlwb2Q6IGZhbHNlLFxuICAgICAgICBpcGFkOiBmYWxzZSxcbiAgICAgICAgZWRnZTogZmFsc2UsXG4gICAgICAgIGllOiBmYWxzZSxcbiAgICAgICAgZmlyZWZveDogZmFsc2UsXG4gICAgICAgIG1hY29zOiBmYWxzZSxcbiAgICAgICAgd2luZG93czogZmFsc2UsXG4gICAgICAgIGNvcmRvdmE6ICEhKGdldEdsb2JhbCgpIGFzIGFueSkuY29yZG92YSxcbiAgICAgICAgZWxlY3Ryb246IGZhbHNlLFxuICAgIH0gYXMgYW55IGFzIFdyaXRhYmxlPFBsYXRmb3JtPjtcblxuICAgIGNvbnN0IHsgdXNlckFnZW50OiB1YSwgcGxhdGZvcm06IG9zLCBzdGFuZGFsb25lIH0gPSBjb250ZXh0Lm5hdmlnYXRvciB8fCBuYXZpZ2F0b3IgYXMgeyB1c2VyQWdlbnQ6IHN0cmluZzsgcGxhdGZvcm06IHN0cmluZzsgc3RhbmRhbG9uZT86IGJvb2xlYW47IH07XG4gICAgY29uc3QgeyB3aWR0aDogc2NyZWVuV2lkdGgsIGhlaWdodDogc2NyZWVuSGVpZ2h0IH0gPSBjb250ZXh0LnNjcmVlbiB8fCBzY3JlZW47XG4gICAgY29uc3QgcGl4ZWxSYXRpbyA9IGNvbnRleHQuZGV2aWNlUGl4ZWxSYXRpbztcblxuICAgIGNvbnN0IGFuZHJvaWQgID0gLyhBbmRyb2lkKTs/W1xccy9dKyhbXFxkLl0rKT8vLmV4ZWModWEpO1xuICAgIGxldCAgIGlwYWQgICAgID0gLyhpUGFkKS4qT1NcXHMoW1xcZF9dKykvLmV4ZWModWEpO1xuICAgIGNvbnN0IGlwb2QgICAgID0gLyhpUG9kKSguKk9TXFxzKFtcXGRfXSspKT8vLmV4ZWModWEpO1xuICAgIGxldCAgIGlwaG9uZSAgID0gIWlwYWQgJiYgLyhpUGhvbmVcXHNPU3xpT1MpXFxzKFtcXGRfXSspLy5leGVjKHVhKTtcbiAgICBjb25zdCBpZSAgICAgICA9IDAgPD0gdWEuaW5kZXhPZignTVNJRSAnKSB8fCAwIDw9IHVhLmluZGV4T2YoJ1RyaWRlbnQvJyk7XG4gICAgY29uc3QgZWRnZSAgICAgPSAwIDw9IHVhLmluZGV4T2YoJ0VkZ2UvJyk7XG4gICAgY29uc3QgZmlyZWZveCAgPSAwIDw9IHVhLmluZGV4T2YoJ0dlY2tvLycpICYmIDAgPD0gdWEuaW5kZXhPZignRmlyZWZveC8nKTtcbiAgICBjb25zdCB3aW5kb3dzICA9ICdXaW4zMicgPT09IG9zO1xuICAgIGxldCAgIG1hY29zICAgID0gJ01hY0ludGVsJyA9PT0gb3M7XG4gICAgY29uc3QgZWxlY3Ryb24gPSB1YS50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJ2VsZWN0cm9uJyk7XG5cbiAgICAvLyBpUGhvbmUoWCkgLyBpUGFkKFBybylEZXNrdG9wIE1vZGVcbiAgICBpZiAoIWlwaG9uZSAmJiAhaXBhZFxuICAgICAgICAmJiBtYWNvc1xuICAgICAgICAmJiBzdXBwb3J0VG91Y2goKVxuICAgICAgICAmJiAodW5kZWZpbmVkICE9PSBzdGFuZGFsb25lXG4vLyAgICAgICAgICAgICgxMDI0ID09PSBzY3JlZW5XaWR0aCAmJiAxMzY2ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMi45IHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMzY2ID09PSBzY3JlZW5XaWR0aCAmJiAxMDI0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMi45IGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDgzNCA9PT0gc2NyZWVuV2lkdGggJiYgMTE5NCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTEgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDExOTQgPT09IHNjcmVlbldpZHRoICYmICA4MzQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDExIGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDgzNCA9PT0gc2NyZWVuV2lkdGggJiYgMTExMiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTAuNSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTExMiA9PT0gc2NyZWVuV2lkdGggJiYgIDgzNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTAuNSBsYW5kc2NhcGVcbi8vICAgICAgICAgfHwgKCA3NjggPT09IHNjcmVlbldpZHRoICYmIDEwMjQgPT09IHNjcmVlbkhlaWdodCkgLy8gb3RoZXIgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDEwMjQgPT09IHNjcmVlbldpZHRoICYmICA3NjggPT09IHNjcmVlbkhlaWdodCkgLy8gb3RoZXIgbGFuZHNjYXBlXG4gICAgICAgIClcbiAgICApIHtcbiAgICAgICAgY29uc3QgcmVnZXggPSAvKFZlcnNpb24pXFwvKFtcXGQuXSspLy5leGVjKHVhKTtcbiAgICAgICAgaWYgKG1heWJlVGFibGV0KHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpKSB7XG4gICAgICAgICAgICBpcGFkID0gcmVnZXg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpcGhvbmUgPSByZWdleDtcbiAgICAgICAgfVxuICAgICAgICBtYWNvcyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGluZm8uaWUgPSBpZTtcbiAgICBpbmZvLmVkZ2UgPSBlZGdlO1xuICAgIGluZm8uZmlyZWZveCA9IGZpcmVmb3g7XG5cbiAgICAvLyBBbmRyb2lkXG4gICAgaWYgKGFuZHJvaWQgJiYgIXdpbmRvd3MpIHtcbiAgICAgICAgaW5mby5vcyA9ICdhbmRyb2lkJztcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBhbmRyb2lkWzJdO1xuICAgICAgICBpbmZvLmFuZHJvaWQgPSB0cnVlO1xuICAgICAgICBpbmZvLmFuZHJvaWRDaHJvbWUgPSAwIDw9IHVhLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignY2hyb21lJyk7XG4gICAgICAgIGlmICgwIDw9IHVhLmluZGV4T2YoJ01vYmlsZScpKSB7XG4gICAgICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluZm8udGFibGV0ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXBhZCB8fCBpcGhvbmUgfHwgaXBvZCkge1xuICAgICAgICBpbmZvLm9zID0gJ2lvcyc7XG4gICAgICAgIGluZm8uaW9zID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8gaU9TXG4gICAgaWYgKGlwaG9uZSAmJiAhaXBvZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwaG9uZVsyXS5yZXBsYWNlKC9fL2csICcuJyk7XG4gICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwaG9uZSA9IHRydWU7XG4gICAgICAgIC8vIGlQaG9uZSBYXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICgzNzUgPT09IHNjcmVlbldpZHRoICYmIDgxMiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYLCBYUyBwb3J0cmFpdFxuICAgICAgICAgfHwgKDgxMiA9PT0gc2NyZWVuV2lkdGggJiYgMzc1ID09PSBzY3JlZW5IZWlnaHQpIC8vIFgsIFhTIGxhbmRzY2FwZVxuICAgICAgICAgfHwgKDQxNCA9PT0gc2NyZWVuV2lkdGggJiYgODk2ID09PSBzY3JlZW5IZWlnaHQpIC8vIFhTIE1heCwgWFIgcG9ydHJhaXRcbiAgICAgICAgIHx8ICg4OTYgPT09IHNjcmVlbldpZHRoICYmIDQxNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYUyBNYXgsIFhSIGxhbmRzY2FwZVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGluZm8uaXBob25lWCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlwYWQpIHtcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBpcGFkWzJdLnJlcGxhY2UoL18vZywgJy4nKTtcbiAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwYWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXBvZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwb2RbM10gPyBpcG9kWzNdLnJlcGxhY2UoL18vZywgJy4nKSA6IG51bGw7XG4gICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwb2QgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIERlc2t0b3BcbiAgICBpbmZvLmRlc2t0b3AgPSAhc3VwcG9ydE9yaWVudGF0aW9uKHVhKTtcbiAgICBpZiAoaW5mby5kZXNrdG9wKSB7XG4gICAgICAgIGluZm8uZWxlY3Ryb24gPSBlbGVjdHJvbjtcbiAgICAgICAgaW5mby5tYWNvcyAgICA9IG1hY29zO1xuICAgICAgICBpbmZvLndpbmRvd3MgID0gd2luZG93cztcbiAgICAgICAgaW5mby5tYWNvcyAmJiAoaW5mby5vcyA9ICdtYWNvcycpO1xuICAgICAgICBpbmZvLndpbmRvd3MgJiYgKGluZm8ub3MgPSAnd2luZG93cycpO1xuICAgIH1cblxuICAgIC8vIE1vYmlsZVxuICAgIGluZm8ubW9iaWxlID0gIWluZm8uZGVza3RvcDtcbiAgICBpZiAoaW5mby5tb2JpbGUgJiYgIWluZm8ucGhvbmUgJiYgIWluZm8udGFibGV0KSB7XG4gICAgICAgIGlmIChtYXliZVRhYmxldChzY3JlZW5XaWR0aCwgc2NyZWVuSGVpZ2h0KSkge1xuICAgICAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQaXhlbCBSYXRpb1xuICAgIGluZm8ucGl4ZWxSYXRpbyA9IHBpeGVsUmF0aW8gfHwgMTtcblxuICAgIHJldHVybiBpbmZvO1xufTtcblxuLyoqXG4gKiBAZW4gUGxhdGZvcm0gaW5mb3JtYXRpb24gb24gcnVudGltZS5cbiAqIEBqYSDjg6njg7Pjgr/jgqTjg6Djga7jg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLFcbiAqL1xuZXhwb3J0IGNvbnN0IHBsYXRmb3JtID0gcXVlcnlQbGF0Zm9ybSgpO1xuIl0sIm5hbWVzIjpbInNhZmUiLCJsb2NhdGlvbiIsIm5hdmlnYXRvciIsInNjcmVlbiIsImRldmljZVBpeGVsUmF0aW8iLCJnZXRHbG9iYWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBRUE7OztJQUlBO0lBQ0EsTUFBTSxTQUFTLEdBQVdBLGNBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEQ7SUFDQSxNQUFNLFVBQVUsR0FBVUEsY0FBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyRDtJQUNBLE1BQU0sT0FBTyxHQUFhQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xEO0lBQ0EsTUFBTSxpQkFBaUIsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQzs7SUNYM0Q7Ozs7Ozs7O1VBUWEsZUFBZSxHQUFHLENBQUMsR0FBVztRQUN2QyxNQUFNLEtBQUssR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUss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QyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7U0FDcEI7UUFDRCxJQUFJLElBQUksRUFBRTtZQUNOLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztZQUM3RCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztZQUNsQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztTQUNwQjs7UUFHRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2QsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7WUFDekIsSUFBSSxDQUFDLEtBQUssR0FBTSxLQUFLLENBQUM7WUFDdEIsSUFBSSxDQUFDLE9BQU8sR0FBSSxPQUFPLENBQUM7WUFDeEIsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQztTQUN6Qzs7UUFHRCxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM1QixJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM1QyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2FBQ3RCO2lCQUFNO2dCQUNILElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2FBQ3JCO1NBQ0o7O1FBR0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLElBQUksQ0FBQyxDQUFDO1FBRWxDLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLEVBQUU7SUFFRjs7OztVQUlhLFFBQVEsR0FBRyxhQUFhOzs7Ozs7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9lbnZpcm9ubWVudC8ifQ==
