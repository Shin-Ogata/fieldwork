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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VzIjpbInNzci50cyIsIndlYi50cyIsInBsYXRmb3JtLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCguOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9sb2NhdGlvbiAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmxvY2F0aW9uKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9uYXZpZ2F0b3IgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLm5hdmlnYXRvcik7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2NyZWVuICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5zY3JlZW4pO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2RldmljZVBpeGVsUmF0aW8gPSBzYWZlKGdsb2JhbFRoaXMuZGV2aWNlUGl4ZWxSYXRpbyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB7XG4gICAgX2xvY2F0aW9uIGFzIGxvY2F0aW9uLFxuICAgIF9uYXZpZ2F0b3IgYXMgbmF2aWdhdG9yLFxuICAgIF9zY3JlZW4gYXMgc2NyZWVuLFxuICAgIF9kZXZpY2VQaXhlbFJhdGlvIGFzIGRldmljZVBpeGVsUmF0aW8sXG59O1xuIiwiaW1wb3J0IHsgbG9jYXRpb24gfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGlyZWN0b3J5IHRvIHdoaWNoIGB1cmxgIGJlbG9uZ3MuXG4gKiBAamEg5oyH5a6aIGB1cmxgIOOBruaJgOWxnuOBmeOCi+ODh+OCo+ODrOOCr+ODiOODquOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgdGFyZ2V0IFVSTFxuICogIC0gYGphYCDlr77osaHjga4gVVJMXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRXZWJEaXJlY3RvcnkgPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gLyguK1xcLykoW14vXSojW14vXSspPy8uZXhlYyh1cmwpO1xuICAgIHJldHVybiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHx8ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQWNjc2Vzc29yIGZvciBXZWIgcm9vdCBsb2NhdGlvbiA8YnI+XG4gKiAgICAgT25seSB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCB3aWxsIGJlIGFuIGFsbG9jYXRpbmcgcGxhY2UgaW4gaW5kZXguaHRtbCwgYW5kIGJlY29tZXMgZWZmZWN0aXZlLlxuICogQGphIFdlYiByb290IGxvY2F0aW9uIOOBuOOBruOCouOCr+OCu+OCuSA8YnI+XG4gKiAgICAgaW5kZXguaHRtbCDjga7phY3nva7loLTmiYDjgajjgarjgorjgIHjg5bjg6njgqbjgrbnkrDlooPjga7jgb/mnInlirnjgajjgarjgosuXG4gKi9cbmV4cG9ydCBjb25zdCB3ZWJSb290OiBzdHJpbmcgPSBnZXRXZWJEaXJlY3RvcnkobG9jYXRpb24uaHJlZik7XG5cbi8qKlxuICogQGVuIENvbnZlcnRlciBmcm9tIHJlbGF0aXZlIHBhdGggdG8gYWJzb2x1dGUgdXJsIHN0cmluZy4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++IHBhdGgg44KS57W25a++IFVSTCDjgavlpInmj5sgPGJyPlxuICogICAgIGpzIOOBrumFjee9ruOBq+S+neWtmOOBmeOCi+OBk+OBqOOBquOBjyBgYXNzZXRzYCDjgqLjgq/jgrvjgrnjgZfjgZ/jgYTjgajjgY3jgavkvb/nlKjjgZnjgosuXG4gKlxuICogQHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMTg4MjE4L3JlbGF0aXZlLXBhdGhzLWluLWphdmFzY3JpcHQtaW4tYW4tZXh0ZXJuYWwtZmlsZVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogIGNvbnNvbGUubG9nKHRvVXJsKCcvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uJykpO1xuICogIC8vIFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwL2FwcC9yZXMvZGF0YS9jb2xsZWN0aW9uLmpzb25cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgc2V0IHJlbGF0aXZlIHBhdGggZnJvbSBbW3dlYlJvb3RdXS5cbiAqICAtIGBqYWAgW1t3ZWJSb290XV0g44GL44KJ44Gu55u45a++44OR44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1VybCA9IChwYXRoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChudWxsICE9IHBhdGggJiYgbnVsbCAhPSBwYXRoWzBdKSB7XG4gICAgICAgIHJldHVybiAoJy8nID09PSBwYXRoWzBdKSA/IHdlYlJvb3QgKyBwYXRoLnNsaWNlKDEpIDogd2ViUm9vdCArIHBhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHdlYlJvb3Q7XG4gICAgfVxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBzcGFjZS1pbi1wYXJlbnNcbiAsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQgeyBXcml0YWJsZSwgZ2V0R2xvYmFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgbmF2aWdhdG9yLFxuICAgIHNjcmVlbixcbiAgICBkZXZpY2VQaXhlbFJhdGlvLFxufSBmcm9tICcuL3Nzcic7XG5cbmNvbnN0IGVudW0gVGhyZXNob2xkIHtcbiAgICBUQUJMRVRfTUlOX1dJRFRIID0gNjAwLCAvLyBmYWxsYmFjayBkZXRlY3Rpb24gdmFsdWVcbn1cblxuLyoqXG4gKiBAZW4gUGxhdGZvcm0gaW5mb3JtYXRpb24uXG4gKiBAamEg44OX44Op44OD44OI44OV44Kp44O844Og5oOF5aCxXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvbWFzdGVyL3NyYy9jb3JlL3V0aWxzL2luZm8uanNcbiAqICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9PbnNlblVJL09uc2VuVUkvYmxvYi9tYXN0ZXIvY29yZS9zcmMvb25zL3BsYXRmb3JtLmpzXG4gKiAgLSBodHRwczovL3d3dy5iaXQtaGl2ZS5jb20vYXJ0aWNsZXMvMjAxOTA4MjBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF0Zm9ybSB7XG4gICAgLyoqIHRydWUgZm9yIGlPUyBpbmZvICovXG4gICAgcmVhZG9ubHkgaW9zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIGluZm8gKi9cbiAgICByZWFkb25seSBhbmRyb2lkOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIENocm9tZSAqL1xuICAgIHJlYWRvbmx5IGFuZHJvaWRDaHJvbWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgYnJvd3NlciAqL1xuICAgIHJlYWRvbmx5IGRlc2t0b3A6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIG1vYmlsZSBpbmZvICovXG4gICAgcmVhZG9ubHkgbW9iaWxlOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBzbWFydCBwaG9uZSAoaW5jbHVkaW5nIGlQb2QpIGluZm8gKi9cbiAgICByZWFkb25seSBwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgdGFibGV0IGluZm8gKi9cbiAgICByZWFkb25seSB0YWJsZXQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQaG9uZSAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBob25lWCAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZVg6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQb2QgKi9cbiAgICByZWFkb25seSBpcG9kOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGFkICovXG4gICAgcmVhZG9ubHkgaXBhZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgTVMgRWRnZSBicm93c2VyICovXG4gICAgcmVhZG9ubHkgZWRnZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgSW50ZXJuZXQgRXhwbG9yZXIgYnJvd3NlciovXG4gICAgcmVhZG9ubHkgaWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEZpcmVGb3ggYnJvd3NlciovXG4gICAgcmVhZG9ubHkgZmlyZWZveDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBNYWNPUyAqL1xuICAgIHJlYWRvbmx5IG1hY29zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIFdpbmRvd3MgKi9cbiAgICByZWFkb25seSB3aW5kb3dzOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIHdoZW4gYXBwIHJ1bm5pbmcgaW4gY29yZG92YSBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGNvcmRvdmE6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgd2hlbiBhcHAgcnVubmluZyBpbiBlbGVjdHJvbiBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGVsZWN0cm9uOiBib29sZWFuO1xuICAgIC8qKiBDb250YWlucyBPUyBjYW4gYmUgaW9zLCBhbmRyb2lkIG9yIHdpbmRvd3MgKGZvciBXaW5kb3dzIFBob25lKSAqL1xuICAgIHJlYWRvbmx5IG9zOiBzdHJpbmc7XG4gICAgLyoqIENvbnRhaW5zIE9TIHZlcnNpb24sIGUuZy4gMTEuMi4wICovXG4gICAgcmVhZG9ubHkgb3NWZXJzaW9uOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkO1xuICAgIC8qKiBEZXZpY2UgcGl4ZWwgcmF0aW8gKi9cbiAgICByZWFkb25seSBwaXhlbFJhdGlvOiBudW1iZXI7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBkZXZpY2VDb250ZXh0ID0ge1xuICAgIG5hdmlnYXRvcixcbiAgICBzY3JlZW4sXG4gICAgZGV2aWNlUGl4ZWxSYXRpbyxcbn07XG5cbmNvbnN0IG1heWJlVGFibGV0ID0gKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIChUaHJlc2hvbGQuVEFCTEVUX01JTl9XSURUSCA8PSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSk7XG59O1xuXG5jb25zdCBzdXBwb3J0VG91Y2ggPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICEhKChuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgPiAwKSB8fCAoJ29udG91Y2hzdGFydCcgaW4gZ2xvYmFsVGhpcykpO1xufTtcblxuY29uc3Qgc3VwcG9ydE9yaWVudGF0aW9uID0gKHVhOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gKCdvcmllbnRhdGlvbicgaW4gZ2xvYmFsVGhpcykgfHwgKDAgPD0gdWEuaW5kZXhPZignV2luZG93cyBQaG9uZScpKTtcbn07XG5cbi8qKlxuICogQGVuIFF1ZXJ5IHBsYXRmb3JtIGluZm9ybWF0aW9uLlxuICogQGphIOODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgseOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIGdpdmVuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIGluZm9ybWF0aW9uLlxuICogIC0gYGphYCDnkrDlooPjga4gYE5hdmlnYXRvcmAsIGBTY3JlZW5gLCBgZGV2aWNlUGl4ZWxSYXRpb2Ag44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCBxdWVyeVBsYXRmb3JtID0gKFxuICAgIGNvbnRleHQ6IHtcbiAgICAgICAgbmF2aWdhdG9yPzogeyB1c2VyQWdlbnQ6IHN0cmluZzsgcGxhdGZvcm06IHN0cmluZzsgc3RhbmRhbG9uZT86IGJvb2xlYW47IH07XG4gICAgICAgIHNjcmVlbj86IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXI7IH07XG4gICAgICAgIGRldmljZVBpeGVsUmF0aW8/OiBudW1iZXI7XG4gICAgfSA9IGRldmljZUNvbnRleHRcbik6IFBsYXRmb3JtID0+IHtcbiAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICBpb3M6IGZhbHNlLFxuICAgICAgICBhbmRyb2lkOiBmYWxzZSxcbiAgICAgICAgYW5kcm9pZENocm9tZTogZmFsc2UsXG4gICAgICAgIGRlc2t0b3A6IGZhbHNlLFxuICAgICAgICBtb2JpbGU6IGZhbHNlLFxuICAgICAgICBwaG9uZTogZmFsc2UsXG4gICAgICAgIHRhYmxldDogZmFsc2UsXG4gICAgICAgIGlwaG9uZTogZmFsc2UsXG4gICAgICAgIGlwaG9uZVg6IGZhbHNlLFxuICAgICAgICBpcG9kOiBmYWxzZSxcbiAgICAgICAgaXBhZDogZmFsc2UsXG4gICAgICAgIGVkZ2U6IGZhbHNlLFxuICAgICAgICBpZTogZmFsc2UsXG4gICAgICAgIGZpcmVmb3g6IGZhbHNlLFxuICAgICAgICBtYWNvczogZmFsc2UsXG4gICAgICAgIHdpbmRvd3M6IGZhbHNlLFxuICAgICAgICBjb3Jkb3ZhOiAhIShnZXRHbG9iYWwoKSBhcyBhbnkpLmNvcmRvdmEsXG4gICAgICAgIGVsZWN0cm9uOiBmYWxzZSxcbiAgICB9IGFzIGFueSBhcyBXcml0YWJsZTxQbGF0Zm9ybT47XG5cbiAgICBjb25zdCB7IHVzZXJBZ2VudDogdWEsIHBsYXRmb3JtOiBvcywgc3RhbmRhbG9uZSB9ID0gY29udGV4dC5uYXZpZ2F0b3IgfHwgbmF2aWdhdG9yIGFzIHsgdXNlckFnZW50OiBzdHJpbmc7IHBsYXRmb3JtOiBzdHJpbmc7IHN0YW5kYWxvbmU/OiBib29sZWFuOyB9O1xuICAgIGNvbnN0IHsgd2lkdGg6IHNjcmVlbldpZHRoLCBoZWlnaHQ6IHNjcmVlbkhlaWdodCB9ID0gY29udGV4dC5zY3JlZW4gfHwgc2NyZWVuO1xuICAgIGNvbnN0IHBpeGVsUmF0aW8gPSBjb250ZXh0LmRldmljZVBpeGVsUmF0aW87XG5cbiAgICBjb25zdCBhbmRyb2lkICA9IC8oQW5kcm9pZCk7P1tcXHMvXSsoW1xcZC5dKyk/Ly5leGVjKHVhKTtcbiAgICBsZXQgICBpcGFkICAgICA9IC8oaVBhZCkuKk9TXFxzKFtcXGRfXSspLy5leGVjKHVhKTtcbiAgICBjb25zdCBpcG9kICAgICA9IC8oaVBvZCkoLipPU1xccyhbXFxkX10rKSk/Ly5leGVjKHVhKTtcbiAgICBsZXQgICBpcGhvbmUgICA9ICFpcGFkICYmIC8oaVBob25lXFxzT1N8aU9TKVxccyhbXFxkX10rKS8uZXhlYyh1YSk7XG4gICAgY29uc3QgaWUgICAgICAgPSAwIDw9IHVhLmluZGV4T2YoJ01TSUUgJykgfHwgMCA8PSB1YS5pbmRleE9mKCdUcmlkZW50LycpO1xuICAgIGNvbnN0IGVkZ2UgICAgID0gMCA8PSB1YS5pbmRleE9mKCdFZGdlLycpO1xuICAgIGNvbnN0IGZpcmVmb3ggID0gMCA8PSB1YS5pbmRleE9mKCdHZWNrby8nKSAmJiAwIDw9IHVhLmluZGV4T2YoJ0ZpcmVmb3gvJyk7XG4gICAgY29uc3Qgd2luZG93cyAgPSAnV2luMzInID09PSBvcztcbiAgICBsZXQgICBtYWNvcyAgICA9ICdNYWNJbnRlbCcgPT09IG9zO1xuICAgIGNvbnN0IGVsZWN0cm9uID0gdWEudG9Mb3dlckNhc2UoKS5zdGFydHNXaXRoKCdlbGVjdHJvbicpO1xuXG4gICAgLy8gaVBob25lKFgpIC8gaVBhZChQcm8pRGVza3RvcCBNb2RlXG4gICAgaWYgKCFpcGhvbmUgJiYgIWlwYWRcbiAgICAgICAgJiYgbWFjb3NcbiAgICAgICAgJiYgc3VwcG9ydFRvdWNoKClcbiAgICAgICAgJiYgKHVuZGVmaW5lZCAhPT0gc3RhbmRhbG9uZVxuLy8gICAgICAgICAgICAoMTAyNCA9PT0gc2NyZWVuV2lkdGggJiYgMTM2NiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTIuOSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTM2NiA9PT0gc2NyZWVuV2lkdGggJiYgMTAyNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTIuOSBsYW5kc2NhcGVcbi8vICAgICAgICAgfHwgKCA4MzQgPT09IHNjcmVlbldpZHRoICYmIDExOTQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDExIHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMTk0ID09PSBzY3JlZW5XaWR0aCAmJiAgODM0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMSBsYW5kc2NhcGVcbi8vICAgICAgICAgfHwgKCA4MzQgPT09IHNjcmVlbldpZHRoICYmIDExMTIgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEwLjUgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDExMTIgPT09IHNjcmVlbldpZHRoICYmICA4MzQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEwLjUgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggNzY4ID09PSBzY3JlZW5XaWR0aCAmJiAxMDI0ID09PSBzY3JlZW5IZWlnaHQpIC8vIG90aGVyIHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMDI0ID09PSBzY3JlZW5XaWR0aCAmJiAgNzY4ID09PSBzY3JlZW5IZWlnaHQpIC8vIG90aGVyIGxhbmRzY2FwZVxuICAgICAgICApXG4gICAgKSB7XG4gICAgICAgIGNvbnN0IHJlZ2V4ID0gLyhWZXJzaW9uKVxcLyhbXFxkLl0rKS8uZXhlYyh1YSk7XG4gICAgICAgIGlmIChtYXliZVRhYmxldChzY3JlZW5XaWR0aCwgc2NyZWVuSGVpZ2h0KSkge1xuICAgICAgICAgICAgaXBhZCA9IHJlZ2V4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXBob25lID0gcmVnZXg7XG4gICAgICAgIH1cbiAgICAgICAgbWFjb3MgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpbmZvLmllID0gaWU7XG4gICAgaW5mby5lZGdlID0gZWRnZTtcbiAgICBpbmZvLmZpcmVmb3ggPSBmaXJlZm94O1xuXG4gICAgLy8gQW5kcm9pZFxuICAgIGlmIChhbmRyb2lkICYmICF3aW5kb3dzKSB7XG4gICAgICAgIGluZm8ub3MgPSAnYW5kcm9pZCc7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gYW5kcm9pZFsyXTtcbiAgICAgICAgaW5mby5hbmRyb2lkID0gdHJ1ZTtcbiAgICAgICAgaW5mby5hbmRyb2lkQ2hyb21lID0gMCA8PSB1YS50b0xvd2VyQ2FzZSgpLmluZGV4T2YoJ2Nocm9tZScpO1xuICAgICAgICBpZiAoMCA8PSB1YS5pbmRleE9mKCdNb2JpbGUnKSkge1xuICAgICAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlwYWQgfHwgaXBob25lIHx8IGlwb2QpIHtcbiAgICAgICAgaW5mby5vcyA9ICdpb3MnO1xuICAgICAgICBpbmZvLmlvcyA9IHRydWU7XG4gICAgfVxuICAgIC8vIGlPU1xuICAgIGlmIChpcGhvbmUgJiYgIWlwb2QpIHtcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBpcGhvbmVbMl0ucmVwbGFjZSgvXy9nLCAnLicpO1xuICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgaW5mby5pcGhvbmUgPSB0cnVlO1xuICAgICAgICAvLyBpUGhvbmUgWFxuICAgICAgICBpZiAoXG4gICAgICAgICAgICAoMzc1ID09PSBzY3JlZW5XaWR0aCAmJiA4MTIgPT09IHNjcmVlbkhlaWdodCkgLy8gWCwgWFMgcG9ydHJhaXRcbiAgICAgICAgIHx8ICg4MTIgPT09IHNjcmVlbldpZHRoICYmIDM3NSA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYLCBYUyBsYW5kc2NhcGVcbiAgICAgICAgIHx8ICg0MTQgPT09IHNjcmVlbldpZHRoICYmIDg5NiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYUyBNYXgsIFhSIHBvcnRyYWl0XG4gICAgICAgICB8fCAoODk2ID09PSBzY3JlZW5XaWR0aCAmJiA0MTQgPT09IHNjcmVlbkhlaWdodCkgLy8gWFMgTWF4LCBYUiBsYW5kc2NhcGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBpbmZvLmlwaG9uZVggPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpcGFkKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBhZFsyXS5yZXBsYWNlKC9fL2csICcuJyk7XG4gICAgICAgIGluZm8udGFibGV0ID0gdHJ1ZTtcbiAgICAgICAgaW5mby5pcGFkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlwb2QpIHtcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBpcG9kWzNdID8gaXBvZFszXS5yZXBsYWNlKC9fL2csICcuJykgOiBudWxsO1xuICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgaW5mby5pcG9kID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBEZXNrdG9wXG4gICAgaW5mby5kZXNrdG9wID0gIXN1cHBvcnRPcmllbnRhdGlvbih1YSk7XG4gICAgaWYgKGluZm8uZGVza3RvcCkge1xuICAgICAgICBpbmZvLmVsZWN0cm9uID0gZWxlY3Ryb247XG4gICAgICAgIGluZm8ubWFjb3MgICAgPSBtYWNvcztcbiAgICAgICAgaW5mby53aW5kb3dzICA9IHdpbmRvd3M7XG4gICAgICAgIGluZm8ubWFjb3MgJiYgKGluZm8ub3MgPSAnbWFjb3MnKTtcbiAgICAgICAgaW5mby53aW5kb3dzICYmIChpbmZvLm9zID0gJ3dpbmRvd3MnKTtcbiAgICB9XG5cbiAgICAvLyBNb2JpbGVcbiAgICBpbmZvLm1vYmlsZSA9ICFpbmZvLmRlc2t0b3A7XG4gICAgaWYgKGluZm8ubW9iaWxlICYmICFpbmZvLnBob25lICYmICFpbmZvLnRhYmxldCkge1xuICAgICAgICBpZiAobWF5YmVUYWJsZXQoc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkpIHtcbiAgICAgICAgICAgIGluZm8udGFibGV0ID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUGl4ZWwgUmF0aW9cbiAgICBpbmZvLnBpeGVsUmF0aW8gPSBwaXhlbFJhdGlvIHx8IDE7XG5cbiAgICByZXR1cm4gaW5mbztcbn07XG5cbi8qKlxuICogQGVuIFBsYXRmb3JtIGluZm9ybWF0aW9uIG9uIHJ1bnRpbWUuXG4gKiBAamEg44Op44Oz44K/44Kk44Og44Gu44OX44Op44OD44OI44OV44Kp44O844Og5oOF5aCxXG4gKi9cbmV4cG9ydCBjb25zdCBwbGF0Zm9ybSA9IHF1ZXJ5UGxhdGZvcm0oKTtcbiJdLCJuYW1lcyI6WyJzYWZlIiwibG9jYXRpb24iLCJuYXZpZ2F0b3IiLCJzY3JlZW4iLCJkZXZpY2VQaXhlbFJhdGlvIiwiZ2V0R2xvYmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUVBOzs7SUFJQTtJQUNBLE1BQU0sU0FBUyxHQUFXQSxjQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BEO0lBQ0EsTUFBTSxVQUFVLEdBQVVBLGNBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDckQ7SUFDQSxNQUFNLE9BQU8sR0FBYUEsY0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNsRDtJQUNBLE1BQU0saUJBQWlCLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7O0lDWDNEOzs7Ozs7OztVQVFhLGVBQWUsR0FBRyxDQUFDLEdBQVc7UUFDdkMsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxLQUFL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SjtRQUNELElBQUksSUFBSSxFQUFFO1lBQ04sSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztTQUNwQjtRQUNELElBQUksSUFBSSxFQUFFO1lBQ04sSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQzdELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ3BCOztRQUdELElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDZCxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztZQUN6QixJQUFJLENBQUMsS0FBSyxHQUFNLEtBQUssQ0FBQztZQUN0QixJQUFJLENBQUMsT0FBTyxHQUFJLE9BQU8sQ0FBQztZQUN4QixJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1NBQ3pDOztRQUdELElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzVDLElBQUksV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsRUFBRTtnQkFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7YUFDdEI7aUJBQU07Z0JBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7YUFDckI7U0FDSjs7UUFHRCxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsSUFBSSxDQUFDLENBQUM7UUFFbEMsT0FBTyxJQUFJLENBQUM7SUFDaEIsRUFBRTtJQUVGOzs7O1VBSWEsUUFBUSxHQUFHLGFBQWE7Ozs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2Vudmlyb25tZW50LyJ9
