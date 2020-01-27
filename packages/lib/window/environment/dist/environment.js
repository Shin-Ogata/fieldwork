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

    exports.getWebDirectory = getWebDirectory;
    exports.platform = platform;
    exports.queryPlatform = queryPlatform;
    exports.toUrl = toUrl;
    exports.webRoot = webRoot;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VzIjpbInNzci50cyIsIndlYi50cyIsInBsYXRmb3JtLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCguOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9sb2NhdGlvbiAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmxvY2F0aW9uKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9uYXZpZ2F0b3IgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLm5hdmlnYXRvcik7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2NyZWVuICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5zY3JlZW4pO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2RldmljZVBpeGVsUmF0aW8gPSBzYWZlKGdsb2JhbFRoaXMuZGV2aWNlUGl4ZWxSYXRpbyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB7XG4gICAgX2xvY2F0aW9uIGFzIGxvY2F0aW9uLFxuICAgIF9uYXZpZ2F0b3IgYXMgbmF2aWdhdG9yLFxuICAgIF9zY3JlZW4gYXMgc2NyZWVuLFxuICAgIF9kZXZpY2VQaXhlbFJhdGlvIGFzIGRldmljZVBpeGVsUmF0aW8sXG59O1xuIiwiaW1wb3J0IHsgbG9jYXRpb24gfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGlyZWN0b3J5IHRvIHdoaWNoIGB1cmxgIGJlbG9uZ3MuXG4gKiBAamEg5oyH5a6aIGB1cmxgIOOBruaJgOWxnuOBmeOCi+ODh+OCo+ODrOOCr+ODiOODquOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgdGFyZ2V0IFVSTFxuICogIC0gYGphYCDlr77osaHjga4gVVJMXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRXZWJEaXJlY3RvcnkgPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gLyguK1xcLykoW14vXSojW14vXSspPy8uZXhlYyh1cmwpO1xuICAgIHJldHVybiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHx8ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQWNjc2Vzc29yIGZvciBXZWIgcm9vdCBsb2NhdGlvbiA8YnI+XG4gKiAgICAgT25seSB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCB3aWxsIGJlIGFuIGFsbG9jYXRpbmcgcGxhY2UgaW4gaW5kZXguaHRtbCwgYW5kIGJlY29tZXMgZWZmZWN0aXZlLlxuICogQGphIFdlYiByb290IGxvY2F0aW9uIOOBuOOBruOCouOCr+OCu+OCuSA8YnI+XG4gKiAgICAgaW5kZXguaHRtbCDjga7phY3nva7loLTmiYDjgajjgarjgorjgIHjg5bjg6njgqbjgrbnkrDlooPjga7jgb/mnInlirnjgajjgarjgosuXG4gKi9cbmV4cG9ydCBjb25zdCB3ZWJSb290OiBzdHJpbmcgPSBnZXRXZWJEaXJlY3RvcnkobG9jYXRpb24uaHJlZik7XG5cbi8qKlxuICogQGVuIENvbnZlcnRlciBmcm9tIHJlbGF0aXZlIHBhdGggdG8gYWJzb2x1dGUgdXJsIHN0cmluZy4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++IHBhdGgg44KS57W25a++IFVSTCDjgavlpInmj5sgPGJyPlxuICogICAgIGpzIOOBrumFjee9ruOBq+S+neWtmOOBmeOCi+OBk+OBqOOBquOBjyBgYXNzZXRzYCDjgqLjgq/jgrvjgrnjgZfjgZ/jgYTjgajjgY3jgavkvb/nlKjjgZnjgosuXG4gKlxuICogQHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMTg4MjE4L3JlbGF0aXZlLXBhdGhzLWluLWphdmFzY3JpcHQtaW4tYW4tZXh0ZXJuYWwtZmlsZVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogIGNvbnNvbGUubG9nKHRvVXJsKCcvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uJykpO1xuICogIC8vIFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwL2FwcC9yZXMvZGF0YS9jb2xsZWN0aW9uLmpzb25cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgc2V0IHJlbGF0aXZlIHBhdGggZnJvbSBbW3dlYlJvb3RdXS5cbiAqICAtIGBqYWAgW1t3ZWJSb290XV0g44GL44KJ44Gu55u45a++44OR44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1VybCA9IChwYXRoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChudWxsICE9IHBhdGggJiYgbnVsbCAhPSBwYXRoWzBdKSB7XG4gICAgICAgIHJldHVybiAoJy8nID09PSBwYXRoWzBdKSA/IHdlYlJvb3QgKyBwYXRoLnNsaWNlKDEpIDogd2ViUm9vdCArIHBhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHdlYlJvb3Q7XG4gICAgfVxufTtcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICBzcGFjZS1pbi1wYXJlbnNcbiAsIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAqL1xuXG5pbXBvcnQgeyBXcml0YWJsZSwgZ2V0R2xvYmFsIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7XG4gICAgbmF2aWdhdG9yLFxuICAgIHNjcmVlbixcbiAgICBkZXZpY2VQaXhlbFJhdGlvLFxufSBmcm9tICcuL3Nzcic7XG5cbmNvbnN0IGVudW0gVGhyZXNob2xkIHtcbiAgICBUQUJMRVRfTUlOX1dJRFRIID0gNjAwLCAvLyBmYWxsYmFjayBkZXRlY3Rpb24gdmFsdWVcbn1cblxuLyoqXG4gKiBAZW4gUGxhdGZvcm0gaW5mb3JtYXRpb24uXG4gKiBAamEg44OX44Op44OD44OI44OV44Kp44O844Og5oOF5aCxXG4gKlxuICogQHNlZVxuICogIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvbWFzdGVyL3NyYy9jb3JlL3V0aWxzL2luZm8uanNcbiAqICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9PbnNlblVJL09uc2VuVUkvYmxvYi9tYXN0ZXIvY29yZS9zcmMvb25zL3BsYXRmb3JtLmpzXG4gKiAgLSBodHRwczovL3d3dy5iaXQtaGl2ZS5jb20vYXJ0aWNsZXMvMjAxOTA4MjBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF0Zm9ybSB7XG4gICAgLyoqIHRydWUgZm9yIGlPUyBpbmZvICovXG4gICAgcmVhZG9ubHkgaW9zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIGluZm8gKi9cbiAgICByZWFkb25seSBhbmRyb2lkOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIENocm9tZSAqL1xuICAgIHJlYWRvbmx5IGFuZHJvaWRDaHJvbWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgYnJvd3NlciAqL1xuICAgIHJlYWRvbmx5IGRlc2t0b3A6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIG1vYmlsZSBpbmZvICovXG4gICAgcmVhZG9ubHkgbW9iaWxlOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBzbWFydCBwaG9uZSAoaW5jbHVkaW5nIGlQb2QpIGluZm8gKi9cbiAgICByZWFkb25seSBwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgdGFibGV0IGluZm8gKi9cbiAgICByZWFkb25seSB0YWJsZXQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQaG9uZSAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBob25lWCAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZVg6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQb2QgKi9cbiAgICByZWFkb25seSBpcG9kOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGFkICovXG4gICAgcmVhZG9ubHkgaXBhZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgTVMgRWRnZSBicm93c2VyICovXG4gICAgcmVhZG9ubHkgZWRnZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgSW50ZXJuZXQgRXhwbG9yZXIgYnJvd3NlciovXG4gICAgcmVhZG9ubHkgaWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEZpcmVGb3ggYnJvd3NlciovXG4gICAgcmVhZG9ubHkgZmlyZWZveDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBNYWNPUyAqL1xuICAgIHJlYWRvbmx5IG1hY29zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIFdpbmRvd3MgKi9cbiAgICByZWFkb25seSB3aW5kb3dzOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIHdoZW4gYXBwIHJ1bm5pbmcgaW4gY29yZG92YSBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGNvcmRvdmE6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgd2hlbiBhcHAgcnVubmluZyBpbiBlbGVjdHJvbiBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGVsZWN0cm9uOiBib29sZWFuO1xuICAgIC8qKiBDb250YWlucyBPUyBjYW4gYmUgaW9zLCBhbmRyb2lkIG9yIHdpbmRvd3MgKGZvciBXaW5kb3dzIFBob25lKSAqL1xuICAgIHJlYWRvbmx5IG9zOiBzdHJpbmc7XG4gICAgLyoqIENvbnRhaW5zIE9TIHZlcnNpb24sIGUuZy4gMTEuMi4wICovXG4gICAgcmVhZG9ubHkgb3NWZXJzaW9uOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkO1xuICAgIC8qKiBEZXZpY2UgcGl4ZWwgcmF0aW8gKi9cbiAgICByZWFkb25seSBwaXhlbFJhdGlvOiBudW1iZXI7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG5jb25zdCBkZXZpY2VDb250ZXh0ID0ge1xuICAgIG5hdmlnYXRvcixcbiAgICBzY3JlZW4sXG4gICAgZGV2aWNlUGl4ZWxSYXRpbyxcbn07XG5cbmNvbnN0IG1heWJlVGFibGV0ID0gKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIChUaHJlc2hvbGQuVEFCTEVUX01JTl9XSURUSCA8PSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSk7XG59O1xuXG5jb25zdCBzdXBwb3J0VG91Y2ggPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICEhKChuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgPiAwKSB8fCAoJ29udG91Y2hzdGFydCcgaW4gZ2xvYmFsVGhpcykpO1xufTtcblxuY29uc3Qgc3VwcG9ydE9yaWVudGF0aW9uID0gKHVhOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gKCdvcmllbnRhdGlvbicgaW4gZ2xvYmFsVGhpcykgfHwgKDAgPD0gdWEuaW5kZXhPZignV2luZG93cyBQaG9uZScpKTtcbn07XG5cbi8qKlxuICogQGVuIFF1ZXJ5IHBsYXRmb3JtIGluZm9ybWF0aW9uLlxuICogQGphIOODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgseOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIGdpdmVuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIGluZm9ybWF0aW9uLlxuICogIC0gYGphYCDnkrDlooPjga4gYE5hdmlnYXRvcmAsIGBTY3JlZW5gLCBgZGV2aWNlUGl4ZWxSYXRpb2Ag44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCBxdWVyeVBsYXRmb3JtID0gKFxuICAgIGNvbnRleHQ6IHtcbiAgICAgICAgbmF2aWdhdG9yPzogeyB1c2VyQWdlbnQ6IHN0cmluZzsgcGxhdGZvcm06IHN0cmluZzsgc3RhbmRhbG9uZT86IGJvb2xlYW47IH07XG4gICAgICAgIHNjcmVlbj86IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXI7IH07XG4gICAgICAgIGRldmljZVBpeGVsUmF0aW8/OiBudW1iZXI7XG4gICAgfSA9IGRldmljZUNvbnRleHRcbik6IFBsYXRmb3JtID0+IHtcbiAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICBpb3M6IGZhbHNlLFxuICAgICAgICBhbmRyb2lkOiBmYWxzZSxcbiAgICAgICAgYW5kcm9pZENocm9tZTogZmFsc2UsXG4gICAgICAgIGRlc2t0b3A6IGZhbHNlLFxuICAgICAgICBtb2JpbGU6IGZhbHNlLFxuICAgICAgICBwaG9uZTogZmFsc2UsXG4gICAgICAgIHRhYmxldDogZmFsc2UsXG4gICAgICAgIGlwaG9uZTogZmFsc2UsXG4gICAgICAgIGlwaG9uZVg6IGZhbHNlLFxuICAgICAgICBpcG9kOiBmYWxzZSxcbiAgICAgICAgaXBhZDogZmFsc2UsXG4gICAgICAgIGVkZ2U6IGZhbHNlLFxuICAgICAgICBpZTogZmFsc2UsXG4gICAgICAgIGZpcmVmb3g6IGZhbHNlLFxuICAgICAgICBtYWNvczogZmFsc2UsXG4gICAgICAgIHdpbmRvd3M6IGZhbHNlLFxuICAgICAgICBjb3Jkb3ZhOiAhIShnZXRHbG9iYWwoKSBhcyBhbnkpLmNvcmRvdmEsXG4gICAgICAgIGVsZWN0cm9uOiBmYWxzZSxcbiAgICB9IGFzIGFueSBhcyBXcml0YWJsZTxQbGF0Zm9ybT47XG5cbiAgICBjb25zdCB7IHVzZXJBZ2VudDogdWEsIHBsYXRmb3JtOiBvcywgc3RhbmRhbG9uZSB9ID0gY29udGV4dC5uYXZpZ2F0b3IgfHwgbmF2aWdhdG9yIGFzIHsgdXNlckFnZW50OiBzdHJpbmc7IHBsYXRmb3JtOiBzdHJpbmc7IHN0YW5kYWxvbmU/OiBib29sZWFuOyB9O1xuICAgIGNvbnN0IHsgd2lkdGg6IHNjcmVlbldpZHRoLCBoZWlnaHQ6IHNjcmVlbkhlaWdodCB9ID0gY29udGV4dC5zY3JlZW4gfHwgc2NyZWVuO1xuICAgIGNvbnN0IHBpeGVsUmF0aW8gPSBjb250ZXh0LmRldmljZVBpeGVsUmF0aW87XG5cbiAgICBjb25zdCBhbmRyb2lkICA9IC8oQW5kcm9pZCk7P1tcXHNcXC9dKyhbXFxkLl0rKT8vLmV4ZWModWEpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgbGV0ICAgaXBhZCAgICAgPSAvKGlQYWQpLipPU1xccyhbXFxkX10rKS8uZXhlYyh1YSk7XG4gICAgY29uc3QgaXBvZCAgICAgPSAvKGlQb2QpKC4qT1NcXHMoW1xcZF9dKykpPy8uZXhlYyh1YSk7XG4gICAgbGV0ICAgaXBob25lICAgPSAhaXBhZCAmJiAvKGlQaG9uZVxcc09TfGlPUylcXHMoW1xcZF9dKykvLmV4ZWModWEpO1xuICAgIGNvbnN0IGllICAgICAgID0gMCA8PSB1YS5pbmRleE9mKCdNU0lFICcpIHx8IDAgPD0gdWEuaW5kZXhPZignVHJpZGVudC8nKTtcbiAgICBjb25zdCBlZGdlICAgICA9IDAgPD0gdWEuaW5kZXhPZignRWRnZS8nKTtcbiAgICBjb25zdCBmaXJlZm94ICA9IDAgPD0gdWEuaW5kZXhPZignR2Vja28vJykgJiYgMCA8PSB1YS5pbmRleE9mKCdGaXJlZm94LycpO1xuICAgIGNvbnN0IHdpbmRvd3MgID0gJ1dpbjMyJyA9PT0gb3M7XG4gICAgbGV0ICAgbWFjb3MgICAgPSAnTWFjSW50ZWwnID09PSBvcztcbiAgICBjb25zdCBlbGVjdHJvbiA9IHVhLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCgnZWxlY3Ryb24nKTtcblxuICAgIC8vIGlQaG9uZShYKSAvIGlQYWQoUHJvKURlc2t0b3AgTW9kZVxuICAgIGlmICghaXBob25lICYmICFpcGFkXG4gICAgICAgICYmIG1hY29zXG4gICAgICAgICYmIHN1cHBvcnRUb3VjaCgpXG4gICAgICAgICYmICh1bmRlZmluZWQgIT09IHN0YW5kYWxvbmVcbi8vICAgICAgICAgICAgKDEwMjQgPT09IHNjcmVlbldpZHRoICYmIDEzNjYgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDEzNjYgPT09IHNjcmVlbldpZHRoICYmIDEwMjQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTk0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTE5NCA9PT0gc2NyZWVuV2lkdGggJiYgIDgzNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTEgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMTEyID09PSBzY3JlZW5XaWR0aCAmJiAgODM0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDc2OCA9PT0gc2NyZWVuV2lkdGggJiYgMTAyNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTAyNCA9PT0gc2NyZWVuV2lkdGggJiYgIDc2OCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBsYW5kc2NhcGVcbiAgICAgICAgKVxuICAgICkge1xuICAgICAgICBjb25zdCByZWdleCA9IC8oVmVyc2lvbilcXC8oW1xcZC5dKykvLmV4ZWModWEpO1xuICAgICAgICBpZiAobWF5YmVUYWJsZXQoc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkpIHtcbiAgICAgICAgICAgIGlwYWQgPSByZWdleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlwaG9uZSA9IHJlZ2V4O1xuICAgICAgICB9XG4gICAgICAgIG1hY29zID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaW5mby5pZSA9IGllO1xuICAgIGluZm8uZWRnZSA9IGVkZ2U7XG4gICAgaW5mby5maXJlZm94ID0gZmlyZWZveDtcblxuICAgIC8vIEFuZHJvaWRcbiAgICBpZiAoYW5kcm9pZCAmJiAhd2luZG93cykge1xuICAgICAgICBpbmZvLm9zID0gJ2FuZHJvaWQnO1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGFuZHJvaWRbMl07XG4gICAgICAgIGluZm8uYW5kcm9pZCA9IHRydWU7XG4gICAgICAgIGluZm8uYW5kcm9pZENocm9tZSA9IDAgPD0gdWEudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdjaHJvbWUnKTtcbiAgICAgICAgaWYgKDAgPD0gdWEuaW5kZXhPZignTW9iaWxlJykpIHtcbiAgICAgICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpcGFkIHx8IGlwaG9uZSB8fCBpcG9kKSB7XG4gICAgICAgIGluZm8ub3MgPSAnaW9zJztcbiAgICAgICAgaW5mby5pb3MgPSB0cnVlO1xuICAgIH1cbiAgICAvLyBpT1NcbiAgICBpZiAoaXBob25lICYmICFpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBob25lWzJdLnJlcGxhY2UoL18vZywgJy4nKTtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBob25lID0gdHJ1ZTtcbiAgICAgICAgLy8gaVBob25lIFhcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgKDM3NSA9PT0gc2NyZWVuV2lkdGggJiYgODEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFgsIFhTIHBvcnRyYWl0XG4gICAgICAgICB8fCAoODEyID09PSBzY3JlZW5XaWR0aCAmJiAzNzUgPT09IHNjcmVlbkhlaWdodCkgLy8gWCwgWFMgbGFuZHNjYXBlXG4gICAgICAgICB8fCAoNDE0ID09PSBzY3JlZW5XaWR0aCAmJiA4OTYgPT09IHNjcmVlbkhlaWdodCkgLy8gWFMgTWF4LCBYUiBwb3J0cmFpdFxuICAgICAgICAgfHwgKDg5NiA9PT0gc2NyZWVuV2lkdGggJiYgNDE0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFhTIE1heCwgWFIgbGFuZHNjYXBlXG4gICAgICAgICkge1xuICAgICAgICAgICAgaW5mby5pcGhvbmVYID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXBhZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwYWRbMl0ucmVwbGFjZSgvXy9nLCAnLicpO1xuICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIGluZm8uaXBhZCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBvZFszXSA/IGlwb2RbM10ucmVwbGFjZSgvXy9nLCAnLicpIDogbnVsbDtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBvZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gRGVza3RvcFxuICAgIGluZm8uZGVza3RvcCA9ICFzdXBwb3J0T3JpZW50YXRpb24odWEpO1xuICAgIGlmIChpbmZvLmRlc2t0b3ApIHtcbiAgICAgICAgaW5mby5lbGVjdHJvbiA9IGVsZWN0cm9uO1xuICAgICAgICBpbmZvLm1hY29zICAgID0gbWFjb3M7XG4gICAgICAgIGluZm8ud2luZG93cyAgPSB3aW5kb3dzO1xuICAgICAgICBpbmZvLm1hY29zICYmIChpbmZvLm9zID0gJ21hY29zJyk7XG4gICAgICAgIGluZm8ud2luZG93cyAmJiAoaW5mby5vcyA9ICd3aW5kb3dzJyk7XG4gICAgfVxuXG4gICAgLy8gTW9iaWxlXG4gICAgaW5mby5tb2JpbGUgPSAhaW5mby5kZXNrdG9wO1xuICAgIGlmIChpbmZvLm1vYmlsZSAmJiAhaW5mby5waG9uZSAmJiAhaW5mby50YWJsZXQpIHtcbiAgICAgICAgaWYgKG1heWJlVGFibGV0KHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpKSB7XG4gICAgICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFBpeGVsIFJhdGlvXG4gICAgaW5mby5waXhlbFJhdGlvID0gcGl4ZWxSYXRpbyB8fCAxO1xuXG4gICAgcmV0dXJuIGluZm87XG59O1xuXG4vKipcbiAqIEBlbiBQbGF0Zm9ybSBpbmZvcm1hdGlvbiBvbiBydW50aW1lLlxuICogQGphIOODqeODs+OCv+OCpOODoOOBruODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgsVxuICovXG5leHBvcnQgY29uc3QgcGxhdGZvcm0gPSBxdWVyeVBsYXRmb3JtKCk7XG4iXSwibmFtZXMiOlsic2FmZSIsImxvY2F0aW9uIiwibmF2aWdhdG9yIiwic2NyZWVuIiwiZGV2aWNlUGl4ZWxSYXRpbyIsImdldEdsb2JhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFFQTs7O0lBSUE7SUFDQSxNQUFNLFNBQVMsR0FBV0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwRDtJQUNBLE1BQU0sVUFBVSxHQUFVQSxjQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JEO0lBQ0EsTUFBTSxPQUFPLEdBQWFBLGNBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQ7SUFDQSxNQUFNLGlCQUFpQixHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDOztJQ1gzRDs7Ozs7Ozs7QUFRQSxVQUFhLGVBQWUsR0FBRyxDQUFDLEdBQVc7UUFDdkMsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcs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QUFLLFlBQVksQ0FBQztjQUMvQztnQkFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQzthQUN2QjtTQUNKO1FBQ0QsSUFBSSxJQUFJLEVBQUU7WUFDTixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ25CLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO1FBQ0QsSUFBSSxJQUFJLEVBQUU7WUFDTixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDN0QsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7WUFDbEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7U0FDcEI7O1FBR0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNkLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQU0sS0FBSyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxPQUFPLEdBQUksT0FBTyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7U0FDekM7O1FBR0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDNUIsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDNUMsSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxFQUFFO2dCQUN4QyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQzthQUN0QjtpQkFBTTtnQkFDSCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQzthQUNyQjtTQUNKOztRQUdELElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxJQUFJLENBQUMsQ0FBQztRQUVsQyxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDLENBQUM7SUFFRjs7OztBQUlBLFVBQWEsUUFBUSxHQUFHLGFBQWEsRUFBRTs7Ozs7Ozs7Ozs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZW52aXJvbm1lbnQvIn0=
