/*!
 * @cdp/environment 0.9.5
 *   environment resolver module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
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

    //__________________________________________________________________________________________________//
    /** @internal */
    const maybeTablet = (width, height) => {
        return (600 /* TABLET_MIN_WIDTH */ <= Math.min(width, height));
    };
    /** @internal */
    const supportTouch = () => {
        return !!((_navigator.maxTouchPoints > 0) || ('ontouchstart' in globalThis));
    };
    /**
     * @internal
     * @see Screen.orientation <br>
     *  - https://developer.mozilla.org/ja/docs/Web/API/Screen/orientation
     */
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
            cordova: !!(coreUtils.getGlobal()['cordova']),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VzIjpbInNzci50cyIsIndlYi50cyIsInBsYXRmb3JtLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCguOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9sb2NhdGlvbiAgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLmxvY2F0aW9uKTtcbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IF9uYXZpZ2F0b3IgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLm5hdmlnYXRvcik7XG4vKiogQGludGVybmFsICovXG5jb25zdCBfc2NyZWVuICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5zY3JlZW4pO1xuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgX2RldmljZVBpeGVsUmF0aW8gPSBzYWZlKGdsb2JhbFRoaXMuZGV2aWNlUGl4ZWxSYXRpbyk7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB7XG4gICAgX2xvY2F0aW9uIGFzIGxvY2F0aW9uLFxuICAgIF9uYXZpZ2F0b3IgYXMgbmF2aWdhdG9yLFxuICAgIF9zY3JlZW4gYXMgc2NyZWVuLFxuICAgIF9kZXZpY2VQaXhlbFJhdGlvIGFzIGRldmljZVBpeGVsUmF0aW8sXG59O1xuIiwiaW1wb3J0IHsgbG9jYXRpb24gfSBmcm9tICcuL3Nzcic7XG5cbi8qKlxuICogQGVuIEdldCB0aGUgZGlyZWN0b3J5IHRvIHdoaWNoIGB1cmxgIGJlbG9uZ3MuXG4gKiBAamEg5oyH5a6aIGB1cmxgIOOBruaJgOWxnuOBmeOCi+ODh+OCo+ODrOOCr+ODiOODquOCkuWPluW+l1xuICpcbiAqIEBwYXJhbSB1cmxcbiAqICAtIGBlbmAgdGFyZ2V0IFVSTFxuICogIC0gYGphYCDlr77osaHjga4gVVJMXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRXZWJEaXJlY3RvcnkgPSAodXJsOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gLyguK1xcLykoW14vXSojW14vXSspPy8uZXhlYyh1cmwpO1xuICAgIHJldHVybiAobWF0Y2ggJiYgbWF0Y2hbMV0pIHx8ICcnO1xufTtcblxuLyoqXG4gKiBAZW4gQWNjc2Vzc29yIGZvciBXZWIgcm9vdCBsb2NhdGlvbiA8YnI+XG4gKiAgICAgT25seSB0aGUgYnJvd3NlciBlbnZpcm9ubWVudCB3aWxsIGJlIGFuIGFsbG9jYXRpbmcgcGxhY2UgaW4gaW5kZXguaHRtbCwgYW5kIGJlY29tZXMgZWZmZWN0aXZlLlxuICogQGphIFdlYiByb290IGxvY2F0aW9uIOOBuOOBruOCouOCr+OCu+OCuSA8YnI+XG4gKiAgICAgaW5kZXguaHRtbCDjga7phY3nva7loLTmiYDjgajjgarjgorjgIHjg5bjg6njgqbjgrbnkrDlooPjga7jgb/mnInlirnjgajjgarjgosuXG4gKi9cbmV4cG9ydCBjb25zdCB3ZWJSb290OiBzdHJpbmcgPSBnZXRXZWJEaXJlY3RvcnkobG9jYXRpb24uaHJlZik7XG5cbi8qKlxuICogQGVuIENvbnZlcnRlciBmcm9tIHJlbGF0aXZlIHBhdGggdG8gYWJzb2x1dGUgdXJsIHN0cmluZy4gPGJyPlxuICogICAgIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0byBBc3NldHMgYW5kIGluIHNwaXRlIG9mIHRoZSBzY3JpcHQgbG9jYXRpb24sIHRoZSBmdW5jdGlvbiBpcyBhdmFpbGFibGUuXG4gKiBAamEg55u45a++IHBhdGgg44KS57W25a++IFVSTCDjgavlpInmj5sgPGJyPlxuICogICAgIGpzIOOBrumFjee9ruOBq+S+neWtmOOBmeOCi+OBk+OBqOOBquOBjyBgYXNzZXRzYCDjgqLjgq/jgrvjgrnjgZfjgZ/jgYTjgajjgY3jgavkvb/nlKjjgZnjgosuXG4gKlxuICogQHNlZSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMTg4MjE4L3JlbGF0aXZlLXBhdGhzLWluLWphdmFzY3JpcHQtaW4tYW4tZXh0ZXJuYWwtZmlsZVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogIGNvbnNvbGUubG9nKHRvVXJsKCcvcmVzL2RhdGEvY29sbGVjdGlvbi5qc29uJykpO1xuICogIC8vIFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwL2FwcC9yZXMvZGF0YS9jb2xsZWN0aW9uLmpzb25cIlxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhcbiAqICAtIGBlbmAgc2V0IHJlbGF0aXZlIHBhdGggZnJvbSBbW3dlYlJvb3RdXS5cbiAqICAtIGBqYWAgW1t3ZWJSb290XV0g44GL44KJ44Gu55u45a++44OR44K544KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCB0b1VybCA9IChwYXRoOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChudWxsICE9IHBhdGggJiYgbnVsbCAhPSBwYXRoWzBdKSB7XG4gICAgICAgIHJldHVybiAoJy8nID09PSBwYXRoWzBdKSA/IHdlYlJvb3QgKyBwYXRoLnNsaWNlKDEpIDogd2ViUm9vdCArIHBhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHdlYlJvb3Q7XG4gICAgfVxufTtcbiIsImltcG9ydCB7IFdyaXRhYmxlLCBnZXRHbG9iYWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHtcbiAgICBuYXZpZ2F0b3IsXG4gICAgc2NyZWVuLFxuICAgIGRldmljZVBpeGVsUmF0aW8sXG59IGZyb20gJy4vc3NyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBUaHJlc2hvbGQge1xuICAgIFRBQkxFVF9NSU5fV0lEVEggPSA2MDAsIC8vIGZhbGxiYWNrIGRldGVjdGlvbiB2YWx1ZVxufVxuXG4vKipcbiAqIEBlbiBQbGF0Zm9ybSBpbmZvcm1hdGlvbi5cbiAqIEBqYSDjg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLFcbiAqXG4gKiBAc2VlIG90aGVyIGZyYW1ld29yayBpbXBsZW1lbnRhdGlvbiA8YnI+XG4gKiAgLSBGcmFtZXdvcms3XG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS9zaGFyZWQvZ2V0LWRldmljZS5qc1xuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi9tYXN0ZXIvc3JjL2NvcmUvc2hhcmVkL2dldC1kZXZpY2UuZC50c1xuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi9tYXN0ZXIvc3JjL2NvcmUvc2hhcmVkL2dldC1zdXBwb3J0LmpzXG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS9zaGFyZWQvZ2V0LXN1cHBvcnQuZC50c1xuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi92NC9zcmMvY29yZS91dGlscy9kZXZpY2UuanMgICAgLy8gY2hlY2sgbGVnYWN5IGRldmljZTogaVBob25lWCBldGNcbiAqICAgIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvdjQvc3JjL2NvcmUvdXRpbHMvZGV2aWNlLmQudHNcbiAqICAtIE9uc2VuVUlcbiAqICAgIC0gaHR0cHM6Ly9naXRodWIuY29tL09uc2VuVUkvT25zZW5VSS9ibG9iL21hc3Rlci9jb3JlL3NyYy9vbnMvcGxhdGZvcm0uanNcbiAqICAtIFdlYlxuICogICAgLSBodHRwczovL3d3dy5iaXQtaGl2ZS5jb20vYXJ0aWNsZXMvMjAxOTA4MjBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF0Zm9ybSB7XG4gICAgLyoqIHRydWUgZm9yIGlPUyBpbmZvICovXG4gICAgcmVhZG9ubHkgaW9zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIGluZm8gKi9cbiAgICByZWFkb25seSBhbmRyb2lkOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIENocm9tZSAqL1xuICAgIHJlYWRvbmx5IGFuZHJvaWRDaHJvbWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgYnJvd3NlciAqL1xuICAgIHJlYWRvbmx5IGRlc2t0b3A6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIG1vYmlsZSBpbmZvICovXG4gICAgcmVhZG9ubHkgbW9iaWxlOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBzbWFydCBwaG9uZSAoaW5jbHVkaW5nIGlQb2QpIGluZm8gKi9cbiAgICByZWFkb25seSBwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgdGFibGV0IGluZm8gKi9cbiAgICByZWFkb25seSB0YWJsZXQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQaG9uZSAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBob25lWCAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZVg6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQb2QgKi9cbiAgICByZWFkb25seSBpcG9kOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGFkICovXG4gICAgcmVhZG9ubHkgaXBhZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgTVMgRWRnZSBicm93c2VyICovXG4gICAgcmVhZG9ubHkgZWRnZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgSW50ZXJuZXQgRXhwbG9yZXIgYnJvd3NlciovXG4gICAgcmVhZG9ubHkgaWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEZpcmVGb3ggYnJvd3NlciovXG4gICAgcmVhZG9ubHkgZmlyZWZveDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBNYWNPUyAqL1xuICAgIHJlYWRvbmx5IG1hY29zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIFdpbmRvd3MgKi9cbiAgICByZWFkb25seSB3aW5kb3dzOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIHdoZW4gYXBwIHJ1bm5pbmcgaW4gY29yZG92YSBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGNvcmRvdmE6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgd2hlbiBhcHAgcnVubmluZyBpbiBlbGVjdHJvbiBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGVsZWN0cm9uOiBib29sZWFuO1xuICAgIC8qKiBDb250YWlucyBPUyBjYW4gYmUgaW9zLCBhbmRyb2lkIG9yIHdpbmRvd3MgKGZvciBXaW5kb3dzIFBob25lKSAqL1xuICAgIHJlYWRvbmx5IG9zOiBzdHJpbmc7XG4gICAgLyoqIENvbnRhaW5zIE9TIHZlcnNpb24sIGUuZy4gMTEuMi4wICovXG4gICAgcmVhZG9ubHkgb3NWZXJzaW9uOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkO1xuICAgIC8qKiBEZXZpY2UgcGl4ZWwgcmF0aW8gKi9cbiAgICByZWFkb25seSBwaXhlbFJhdGlvOiBudW1iZXI7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtYXliZVRhYmxldCA9ICh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAoVGhyZXNob2xkLlRBQkxFVF9NSU5fV0lEVEggPD0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc3VwcG9ydFRvdWNoID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAhISgobmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGdsb2JhbFRoaXMpKTtcbn07XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAc2VlIFNjcmVlbi5vcmllbnRhdGlvbiA8YnI+XG4gKiAgLSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL1dlYi9BUEkvU2NyZWVuL29yaWVudGF0aW9uXG4gKi9cbmNvbnN0IHN1cHBvcnRPcmllbnRhdGlvbiA9ICh1YTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICgnb3JpZW50YXRpb24nIGluIGdsb2JhbFRoaXMpIHx8ICgwIDw9IHVhLmluZGV4T2YoJ1dpbmRvd3MgUGhvbmUnKSk7XG59O1xuXG4vKipcbiAqIEBlbiBRdWVyeSBwbGF0Zm9ybSBpbmZvcm1hdGlvbi5cbiAqIEBqYSDjg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLHjga7lj5blvpdcbiAqXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBnaXZlbiBgTmF2aWdhdG9yYCwgYFNjcmVlbmAsIGBkZXZpY2VQaXhlbFJhdGlvYCBpbmZvcm1hdGlvbi5cbiAqICAtIGBqYWAg55Kw5aKD44GuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIOOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgcXVlcnlQbGF0Zm9ybSA9IChcbiAgICBjb250ZXh0Pzoge1xuICAgICAgICBuYXZpZ2F0b3I/OiB7IHVzZXJBZ2VudDogc3RyaW5nOyBwbGF0Zm9ybTogc3RyaW5nOyBzdGFuZGFsb25lPzogYm9vbGVhbjsgfTtcbiAgICAgICAgc2NyZWVuPzogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlcjsgfTtcbiAgICAgICAgZGV2aWNlUGl4ZWxSYXRpbz86IG51bWJlcjtcbiAgICB9XG4pOiBQbGF0Zm9ybSA9PiB7XG4gICAgY29udGV4dCA9IGNvbnRleHQgfHwgeyBuYXZpZ2F0b3IsIHNjcmVlbiwgZGV2aWNlUGl4ZWxSYXRpbyB9O1xuICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgIGlvczogZmFsc2UsXG4gICAgICAgIGFuZHJvaWQ6IGZhbHNlLFxuICAgICAgICBhbmRyb2lkQ2hyb21lOiBmYWxzZSxcbiAgICAgICAgZGVza3RvcDogZmFsc2UsXG4gICAgICAgIG1vYmlsZTogZmFsc2UsXG4gICAgICAgIHBob25lOiBmYWxzZSxcbiAgICAgICAgdGFibGV0OiBmYWxzZSxcbiAgICAgICAgaXBob25lOiBmYWxzZSxcbiAgICAgICAgaXBob25lWDogZmFsc2UsXG4gICAgICAgIGlwb2Q6IGZhbHNlLFxuICAgICAgICBpcGFkOiBmYWxzZSxcbiAgICAgICAgZWRnZTogZmFsc2UsXG4gICAgICAgIGllOiBmYWxzZSxcbiAgICAgICAgZmlyZWZveDogZmFsc2UsXG4gICAgICAgIG1hY29zOiBmYWxzZSxcbiAgICAgICAgd2luZG93czogZmFsc2UsXG4gICAgICAgIGNvcmRvdmE6ICEhKGdldEdsb2JhbCgpWydjb3Jkb3ZhJ10pLFxuICAgICAgICBlbGVjdHJvbjogZmFsc2UsXG4gICAgfSBhcyB1bmtub3duIGFzIFdyaXRhYmxlPFBsYXRmb3JtPjtcblxuICAgIGNvbnN0IHsgdXNlckFnZW50OiB1YSwgcGxhdGZvcm06IG9zLCBzdGFuZGFsb25lIH0gPSBjb250ZXh0Lm5hdmlnYXRvciB8fCBuYXZpZ2F0b3IgYXMgeyB1c2VyQWdlbnQ6IHN0cmluZzsgcGxhdGZvcm06IHN0cmluZzsgc3RhbmRhbG9uZT86IGJvb2xlYW47IH07XG4gICAgY29uc3QgeyB3aWR0aDogc2NyZWVuV2lkdGgsIGhlaWdodDogc2NyZWVuSGVpZ2h0IH0gPSBjb250ZXh0LnNjcmVlbiB8fCBzY3JlZW47XG4gICAgY29uc3QgcGl4ZWxSYXRpbyA9IGNvbnRleHQuZGV2aWNlUGl4ZWxSYXRpbztcblxuICAgIGNvbnN0IGFuZHJvaWQgID0gLyhBbmRyb2lkKTs/W1xccy9dKyhbXFxkLl0rKT8vLmV4ZWModWEpO1xuICAgIGxldCAgIGlwYWQgICAgID0gLyhpUGFkKS4qT1NcXHMoW1xcZF9dKykvLmV4ZWModWEpO1xuICAgIGNvbnN0IGlwb2QgICAgID0gLyhpUG9kKSguKk9TXFxzKFtcXGRfXSspKT8vLmV4ZWModWEpO1xuICAgIGxldCAgIGlwaG9uZSAgID0gIWlwYWQgJiYgLyhpUGhvbmVcXHNPU3xpT1MpXFxzKFtcXGRfXSspLy5leGVjKHVhKTtcbiAgICBjb25zdCBpZSAgICAgICA9IDAgPD0gdWEuaW5kZXhPZignTVNJRSAnKSB8fCAwIDw9IHVhLmluZGV4T2YoJ1RyaWRlbnQvJyk7XG4gICAgY29uc3QgZWRnZSAgICAgPSAwIDw9IHVhLmluZGV4T2YoJ0VkZ2UvJyk7XG4gICAgY29uc3QgZmlyZWZveCAgPSAwIDw9IHVhLmluZGV4T2YoJ0dlY2tvLycpICYmIDAgPD0gdWEuaW5kZXhPZignRmlyZWZveC8nKTtcbiAgICBjb25zdCB3aW5kb3dzICA9ICdXaW4zMicgPT09IG9zO1xuICAgIGxldCAgIG1hY29zICAgID0gJ01hY0ludGVsJyA9PT0gb3M7XG4gICAgY29uc3QgZWxlY3Ryb24gPSB1YS50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoJ2VsZWN0cm9uJyk7XG5cbiAgICAvLyBpUGhvbmUoWCkgLyBpUGFkKFBybylEZXNrdG9wIE1vZGVcbiAgICBpZiAoIWlwaG9uZSAmJiAhaXBhZFxuICAgICAgICAmJiBtYWNvc1xuICAgICAgICAmJiBzdXBwb3J0VG91Y2goKVxuICAgICAgICAmJiAodW5kZWZpbmVkICE9PSBzdGFuZGFsb25lXG4vLyAgICAgICAgICAgICgxMDI0ID09PSBzY3JlZW5XaWR0aCAmJiAxMzY2ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMi45IHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMzY2ID09PSBzY3JlZW5XaWR0aCAmJiAxMDI0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMi45IGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDgzNCA9PT0gc2NyZWVuV2lkdGggJiYgMTE5NCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTEgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDExOTQgPT09IHNjcmVlbldpZHRoICYmICA4MzQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDExIGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDgzNCA9PT0gc2NyZWVuV2lkdGggJiYgMTExMiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTAuNSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTExMiA9PT0gc2NyZWVuV2lkdGggJiYgIDgzNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTAuNSBsYW5kc2NhcGVcbi8vICAgICAgICAgfHwgKCA3NjggPT09IHNjcmVlbldpZHRoICYmIDEwMjQgPT09IHNjcmVlbkhlaWdodCkgLy8gb3RoZXIgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDEwMjQgPT09IHNjcmVlbldpZHRoICYmICA3NjggPT09IHNjcmVlbkhlaWdodCkgLy8gb3RoZXIgbGFuZHNjYXBlXG4gICAgICAgIClcbiAgICApIHtcbiAgICAgICAgY29uc3QgcmVnZXggPSAvKFZlcnNpb24pXFwvKFtcXGQuXSspLy5leGVjKHVhKTtcbiAgICAgICAgaWYgKG1heWJlVGFibGV0KHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpKSB7XG4gICAgICAgICAgICBpcGFkID0gcmVnZXg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpcGhvbmUgPSByZWdleDtcbiAgICAgICAgfVxuICAgICAgICBtYWNvcyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGluZm8uaWUgPSBpZTtcbiAgICBpbmZvLmVkZ2UgPSBlZGdlO1xuICAgIGluZm8uZmlyZWZveCA9IGZpcmVmb3g7XG5cbiAgICAvLyBBbmRyb2lkXG4gICAgaWYgKGFuZHJvaWQgJiYgIXdpbmRvd3MpIHtcbiAgICAgICAgaW5mby5vcyA9ICdhbmRyb2lkJztcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBhbmRyb2lkWzJdO1xuICAgICAgICBpbmZvLmFuZHJvaWQgPSB0cnVlO1xuICAgICAgICBpbmZvLmFuZHJvaWRDaHJvbWUgPSAwIDw9IHVhLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignY2hyb21lJyk7XG4gICAgICAgIGlmICgwIDw9IHVhLmluZGV4T2YoJ01vYmlsZScpKSB7XG4gICAgICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluZm8udGFibGV0ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXBhZCB8fCBpcGhvbmUgfHwgaXBvZCkge1xuICAgICAgICBpbmZvLm9zID0gJ2lvcyc7XG4gICAgICAgIGluZm8uaW9zID0gdHJ1ZTtcbiAgICB9XG4gICAgLy8gaU9TXG4gICAgaWYgKGlwaG9uZSAmJiAhaXBvZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwaG9uZVsyXS5yZXBsYWNlKC9fL2csICcuJyk7XG4gICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwaG9uZSA9IHRydWU7XG4gICAgICAgIC8vIGlQaG9uZSBYXG4gICAgICAgIGlmIChcbiAgICAgICAgICAgICgzNzUgPT09IHNjcmVlbldpZHRoICYmIDgxMiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYLCBYUyBwb3J0cmFpdFxuICAgICAgICAgfHwgKDgxMiA9PT0gc2NyZWVuV2lkdGggJiYgMzc1ID09PSBzY3JlZW5IZWlnaHQpIC8vIFgsIFhTIGxhbmRzY2FwZVxuICAgICAgICAgfHwgKDQxNCA9PT0gc2NyZWVuV2lkdGggJiYgODk2ID09PSBzY3JlZW5IZWlnaHQpIC8vIFhTIE1heCwgWFIgcG9ydHJhaXRcbiAgICAgICAgIHx8ICg4OTYgPT09IHNjcmVlbldpZHRoICYmIDQxNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYUyBNYXgsIFhSIGxhbmRzY2FwZVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGluZm8uaXBob25lWCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlwYWQpIHtcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBpcGFkWzJdLnJlcGxhY2UoL18vZywgJy4nKTtcbiAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwYWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXBvZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwb2RbM10gPyBpcG9kWzNdLnJlcGxhY2UoL18vZywgJy4nKSA6IG51bGw7XG4gICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICBpbmZvLmlwb2QgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIERlc2t0b3BcbiAgICBpbmZvLmRlc2t0b3AgPSAhc3VwcG9ydE9yaWVudGF0aW9uKHVhKTtcbiAgICBpZiAoaW5mby5kZXNrdG9wKSB7XG4gICAgICAgIGluZm8uZWxlY3Ryb24gPSBlbGVjdHJvbjtcbiAgICAgICAgaW5mby5tYWNvcyAgICA9IG1hY29zO1xuICAgICAgICBpbmZvLndpbmRvd3MgID0gd2luZG93cztcbiAgICAgICAgaW5mby5tYWNvcyAmJiAoaW5mby5vcyA9ICdtYWNvcycpO1xuICAgICAgICBpbmZvLndpbmRvd3MgJiYgKGluZm8ub3MgPSAnd2luZG93cycpO1xuICAgIH1cblxuICAgIC8vIE1vYmlsZVxuICAgIGluZm8ubW9iaWxlID0gIWluZm8uZGVza3RvcDtcbiAgICBpZiAoaW5mby5tb2JpbGUgJiYgIWluZm8ucGhvbmUgJiYgIWluZm8udGFibGV0KSB7XG4gICAgICAgIGlmIChtYXliZVRhYmxldChzY3JlZW5XaWR0aCwgc2NyZWVuSGVpZ2h0KSkge1xuICAgICAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQaXhlbCBSYXRpb1xuICAgIGluZm8ucGl4ZWxSYXRpbyA9IHBpeGVsUmF0aW8gfHwgMTtcblxuICAgIHJldHVybiBpbmZvO1xufTtcblxuLyoqXG4gKiBAZW4gUGxhdGZvcm0gaW5mb3JtYXRpb24gb24gcnVudGltZS5cbiAqIEBqYSDjg6njg7Pjgr/jgqTjg6Djga7jg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLFcbiAqL1xuZXhwb3J0IGNvbnN0IHBsYXRmb3JtID0gcXVlcnlQbGF0Zm9ybSgpO1xuIl0sIm5hbWVzIjpbInNhZmUiLCJsb2NhdGlvbiIsIm5hdmlnYXRvciIsInNjcmVlbiIsImRldmljZVBpeGVsUmF0aW8iLCJnZXRHbG9iYWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBRUE7OztJQUlBO0lBQ0EsTUFBTSxTQUFTLEdBQVdBLGNBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDcEQ7SUFDQSxNQUFNLFVBQVUsR0FBVUEsY0FBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyRDtJQUNBLE1BQU0sT0FBTyxHQUFhQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xEO0lBQ0EsTUFBTSxpQkFBaUIsR0FBR0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQzs7SUNYM0Q7Ozs7Ozs7O1VBUWEsZUFBZSxHQUFHLENBQUMsR0FBVztRQUN2QyxNQUFNLEtBQUssR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JDLEVBQUU7SUFFRjs7Ozs7O1VBTWEsT0FBTyxHQUFXLGVBQWUsQ0FBQ0MsU0FBUSxDQUFDLElBQUksRUFBRTtJQUU5RDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztVQW1CYSxLQUFLLEdBQUcsQ0FBQyxJQUFZO1FBQzlCLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pDLE9BQU8sQ0FBQyxH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
