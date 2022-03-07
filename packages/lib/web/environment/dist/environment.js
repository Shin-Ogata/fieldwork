/*!
 * @cdp/environment 0.9.10
 *   environment resolver module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, coreUtils) { 'use strict';

    /*
     * SSR (Server Side Rendering) 環境においてもオブジェクト等の存在を保証する
     */
    /** @internal */ const _location = coreUtils.safe(globalThis.location);
    /** @internal */ const _navigator = coreUtils.safe(globalThis.navigator);
    /** @internal */ const _screen = coreUtils.safe(globalThis.screen);
    /** @internal */ const _devicePixelRatio = coreUtils.safe(globalThis.devicePixelRatio);

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

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VzIjpbInNzci50cyIsIndlYi50cyIsInBsYXRmb3JtLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKlxuICogU1NSIChTZXJ2ZXIgU2lkZSBSZW5kZXJpbmcpIOeSsOWig+OBq+OBiuOBhOOBpuOCguOCquODluOCuOOCp+OCr+ODiOetieOBruWtmOWcqOOCkuS/neiovOOBmeOCi1xuICovXG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgX2xvY2F0aW9uICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMubG9jYXRpb24pO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfbmF2aWdhdG9yICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5uYXZpZ2F0b3IpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfc2NyZWVuICAgICAgICAgICA9IHNhZmUoZ2xvYmFsVGhpcy5zY3JlZW4pO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBfZGV2aWNlUGl4ZWxSYXRpbyA9IHNhZmUoZ2xvYmFsVGhpcy5kZXZpY2VQaXhlbFJhdGlvKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IHtcbiAgICBfbG9jYXRpb24gYXMgbG9jYXRpb24sXG4gICAgX25hdmlnYXRvciBhcyBuYXZpZ2F0b3IsXG4gICAgX3NjcmVlbiBhcyBzY3JlZW4sXG4gICAgX2RldmljZVBpeGVsUmF0aW8gYXMgZGV2aWNlUGl4ZWxSYXRpbyxcbn07XG4iLCJpbXBvcnQgeyBsb2NhdGlvbiB9IGZyb20gJy4vc3NyJztcblxuLyoqXG4gKiBAZW4gR2V0IHRoZSBkaXJlY3RvcnkgdG8gd2hpY2ggYHVybGAgYmVsb25ncy5cbiAqIEBqYSDmjIflrpogYHVybGAg44Gu5omA5bGe44GZ44KL44OH44Kj44Os44Kv44OI44Oq44KS5Y+W5b6XXG4gKlxuICogQHBhcmFtIHVybFxuICogIC0gYGVuYCB0YXJnZXQgVVJMXG4gKiAgLSBgamFgIOWvvuixoeOBriBVUkxcbiAqL1xuZXhwb3J0IGNvbnN0IGdldFdlYkRpcmVjdG9yeSA9ICh1cmw6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgY29uc3QgbWF0Y2ggPSAvKC4rXFwvKShbXi9dKiNbXi9dKyk/Ly5leGVjKHVybCk7XG4gICAgcmV0dXJuIChtYXRjaCAmJiBtYXRjaFsxXSkgfHwgJyc7XG59O1xuXG4vKipcbiAqIEBlbiBBY2NzZXNzb3IgZm9yIFdlYiByb290IGxvY2F0aW9uIDxicj5cbiAqICAgICBPbmx5IHRoZSBicm93c2VyIGVudmlyb25tZW50IHdpbGwgYmUgYW4gYWxsb2NhdGluZyBwbGFjZSBpbiBpbmRleC5odG1sLCBhbmQgYmVjb21lcyBlZmZlY3RpdmUuXG4gKiBAamEgV2ViIHJvb3QgbG9jYXRpb24g44G444Gu44Ki44Kv44K744K5IDxicj5cbiAqICAgICBpbmRleC5odG1sIOOBrumFjee9ruWgtOaJgOOBqOOBquOCiuOAgeODluODqeOCpuOCtueSsOWig+OBruOBv+acieWKueOBqOOBquOCiy5cbiAqL1xuZXhwb3J0IGNvbnN0IHdlYlJvb3Q6IHN0cmluZyA9IGdldFdlYkRpcmVjdG9yeShsb2NhdGlvbi5ocmVmKTtcblxuLyoqXG4gKiBAZW4gQ29udmVydGVyIGZyb20gcmVsYXRpdmUgcGF0aCB0byBhYnNvbHV0ZSB1cmwgc3RyaW5nLiA8YnI+XG4gKiAgICAgSWYgeW91IHdhbnQgdG8gYWNjZXNzIHRvIEFzc2V0cyBhbmQgaW4gc3BpdGUgb2YgdGhlIHNjcmlwdCBsb2NhdGlvbiwgdGhlIGZ1bmN0aW9uIGlzIGF2YWlsYWJsZS5cbiAqIEBqYSDnm7jlr74gcGF0aCDjgpLntbblr74gVVJMIOOBq+WkieaPmyA8YnI+XG4gKiAgICAganMg44Gu6YWN572u44Gr5L6d5a2Y44GZ44KL44GT44Go44Gq44GPIGBhc3NldHNgIOOCouOCr+OCu+OCueOBl+OBn+OBhOOBqOOBjeOBq+S9v+eUqOOBmeOCiy5cbiAqXG4gKiBAc2VlIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzIxODgyMTgvcmVsYXRpdmUtcGF0aHMtaW4tamF2YXNjcmlwdC1pbi1hbi1leHRlcm5hbC1maWxlXG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAgY29uc29sZS5sb2codG9VcmwoJy9yZXMvZGF0YS9jb2xsZWN0aW9uLmpzb24nKSk7XG4gKiAgLy8gXCJodHRwOi8vbG9jYWxob3N0OjgwODAvYXBwL3Jlcy9kYXRhL2NvbGxlY3Rpb24uanNvblwiXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcGF0aFxuICogIC0gYGVuYCBzZXQgcmVsYXRpdmUgcGF0aCBmcm9tIFtbd2ViUm9vdF1dLlxuICogIC0gYGphYCBbW3dlYlJvb3RdXSDjgYvjgonjga7nm7jlr77jg5HjgrnjgpLmjIflrppcbiAqL1xuZXhwb3J0IGNvbnN0IHRvVXJsID0gKHBhdGg6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgaWYgKG51bGwgIT0gcGF0aCAmJiBudWxsICE9IHBhdGhbMF0pIHtcbiAgICAgICAgcmV0dXJuICgnLycgPT09IHBhdGhbMF0pID8gd2ViUm9vdCArIHBhdGguc2xpY2UoMSkgOiB3ZWJSb290ICsgcGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gd2ViUm9vdDtcbiAgICB9XG59O1xuIiwiaW1wb3J0IHsgV3JpdGFibGUsIGdldEdsb2JhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQge1xuICAgIG5hdmlnYXRvcixcbiAgICBzY3JlZW4sXG4gICAgZGV2aWNlUGl4ZWxSYXRpbyxcbn0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIFRocmVzaG9sZCB7XG4gICAgVEFCTEVUX01JTl9XSURUSCA9IDYwMCwgLy8gZmFsbGJhY2sgZGV0ZWN0aW9uIHZhbHVlXG59XG5cbi8qKlxuICogQGVuIFBsYXRmb3JtIGluZm9ybWF0aW9uLlxuICogQGphIOODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgsVxuICpcbiAqIEBzZWUgb3RoZXIgZnJhbWV3b3JrIGltcGxlbWVudGF0aW9uIDxicj5cbiAqICAtIEZyYW1ld29yazdcbiAqICAgIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvbWFzdGVyL3NyYy9jb3JlL3NoYXJlZC9nZXQtZGV2aWNlLmpzXG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS9zaGFyZWQvZ2V0LWRldmljZS5kLnRzXG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS9zaGFyZWQvZ2V0LXN1cHBvcnQuanNcbiAqICAgIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvbWFzdGVyL3NyYy9jb3JlL3NoYXJlZC9nZXQtc3VwcG9ydC5kLnRzXG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL3Y0L3NyYy9jb3JlL3V0aWxzL2RldmljZS5qcyAgICAvLyBjaGVjayBsZWdhY3kgZGV2aWNlOiBpUGhvbmVYIGV0Y1xuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi92NC9zcmMvY29yZS91dGlscy9kZXZpY2UuZC50c1xuICogIC0gT25zZW5VSVxuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vT25zZW5VSS9PbnNlblVJL2Jsb2IvbWFzdGVyL2NvcmUvc3JjL29ucy9wbGF0Zm9ybS5qc1xuICogIC0gV2ViXG4gKiAgICAtIGh0dHBzOi8vd3d3LmJpdC1oaXZlLmNvbS9hcnRpY2xlcy8yMDE5MDgyMFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsYXRmb3JtIHtcbiAgICAvKiogdHJ1ZSBmb3IgaU9TIGluZm8gKi9cbiAgICByZWFkb25seSBpb3M6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEFuZHJvaWQgaW5mbyAqL1xuICAgIHJlYWRvbmx5IGFuZHJvaWQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEFuZHJvaWQgQ2hyb21lICovXG4gICAgcmVhZG9ubHkgYW5kcm9pZENocm9tZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBicm93c2VyICovXG4gICAgcmVhZG9ubHkgZGVza3RvcDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgbW9iaWxlIGluZm8gKi9cbiAgICByZWFkb25seSBtb2JpbGU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIHNtYXJ0IHBob25lIChpbmNsdWRpbmcgaVBvZCkgaW5mbyAqL1xuICAgIHJlYWRvbmx5IHBob25lOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciB0YWJsZXQgaW5mbyAqL1xuICAgIHJlYWRvbmx5IHRhYmxldDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBob25lICovXG4gICAgcmVhZG9ubHkgaXBob25lOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGhvbmVYICovXG4gICAgcmVhZG9ubHkgaXBob25lWDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBvZCAqL1xuICAgIHJlYWRvbmx5IGlwb2Q6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQYWQgKi9cbiAgICByZWFkb25seSBpcGFkOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBNUyBFZGdlIGJyb3dzZXIgKi9cbiAgICByZWFkb25seSBlZGdlOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBJbnRlcm5ldCBFeHBsb3JlciBicm93c2VyKi9cbiAgICByZWFkb25seSBpZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgRmlyZUZveCBicm93c2VyKi9cbiAgICByZWFkb25seSBmaXJlZm94OiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIE1hY09TICovXG4gICAgcmVhZG9ubHkgbWFjb3M6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgV2luZG93cyAqL1xuICAgIHJlYWRvbmx5IHdpbmRvd3M6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgd2hlbiBhcHAgcnVubmluZyBpbiBjb3Jkb3ZhIGVudmlyb25tZW50ICovXG4gICAgcmVhZG9ubHkgY29yZG92YTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSB3aGVuIGFwcCBydW5uaW5nIGluIGVsZWN0cm9uIGVudmlyb25tZW50ICovXG4gICAgcmVhZG9ubHkgZWxlY3Ryb246IGJvb2xlYW47XG4gICAgLyoqIENvbnRhaW5zIE9TIGNhbiBiZSBpb3MsIGFuZHJvaWQgb3Igd2luZG93cyAoZm9yIFdpbmRvd3MgUGhvbmUpICovXG4gICAgcmVhZG9ubHkgb3M6IHN0cmluZztcbiAgICAvKiogQ29udGFpbnMgT1MgdmVyc2lvbiwgZS5nLiAxMS4yLjAgKi9cbiAgICByZWFkb25seSBvc1ZlcnNpb246IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQ7XG4gICAgLyoqIERldmljZSBwaXhlbCByYXRpbyAqL1xuICAgIHJlYWRvbmx5IHBpeGVsUmF0aW86IG51bWJlcjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1heWJlVGFibGV0ID0gKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIChUaHJlc2hvbGQuVEFCTEVUX01JTl9XSURUSCA8PSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSk7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzdXBwb3J0VG91Y2ggPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICEhKChuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgPiAwKSB8fCAoJ29udG91Y2hzdGFydCcgaW4gZ2xvYmFsVGhpcykpO1xufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBzZWUgU2NyZWVuLm9yaWVudGF0aW9uIDxicj5cbiAqICAtIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9TY3JlZW4vb3JpZW50YXRpb25cbiAqL1xuY29uc3Qgc3VwcG9ydE9yaWVudGF0aW9uID0gKHVhOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gKCdvcmllbnRhdGlvbicgaW4gZ2xvYmFsVGhpcykgfHwgKDAgPD0gdWEuaW5kZXhPZignV2luZG93cyBQaG9uZScpKTtcbn07XG5cbi8qKlxuICogQGVuIFF1ZXJ5IHBsYXRmb3JtIGluZm9ybWF0aW9uLlxuICogQGphIOODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgseOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIGdpdmVuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIGluZm9ybWF0aW9uLlxuICogIC0gYGphYCDnkrDlooPjga4gYE5hdmlnYXRvcmAsIGBTY3JlZW5gLCBgZGV2aWNlUGl4ZWxSYXRpb2Ag44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCBxdWVyeVBsYXRmb3JtID0gKFxuICAgIGNvbnRleHQ/OiB7XG4gICAgICAgIG5hdmlnYXRvcj86IHsgdXNlckFnZW50OiBzdHJpbmc7IHBsYXRmb3JtOiBzdHJpbmc7IHN0YW5kYWxvbmU/OiBib29sZWFuOyB9O1xuICAgICAgICBzY3JlZW4/OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyOyB9O1xuICAgICAgICBkZXZpY2VQaXhlbFJhdGlvPzogbnVtYmVyO1xuICAgIH1cbik6IFBsYXRmb3JtID0+IHtcbiAgICBjb250ZXh0ID0gY29udGV4dCB8fCB7IG5hdmlnYXRvciwgc2NyZWVuLCBkZXZpY2VQaXhlbFJhdGlvIH07XG4gICAgY29uc3QgaW5mbyA9IHtcbiAgICAgICAgaW9zOiBmYWxzZSxcbiAgICAgICAgYW5kcm9pZDogZmFsc2UsXG4gICAgICAgIGFuZHJvaWRDaHJvbWU6IGZhbHNlLFxuICAgICAgICBkZXNrdG9wOiBmYWxzZSxcbiAgICAgICAgbW9iaWxlOiBmYWxzZSxcbiAgICAgICAgcGhvbmU6IGZhbHNlLFxuICAgICAgICB0YWJsZXQ6IGZhbHNlLFxuICAgICAgICBpcGhvbmU6IGZhbHNlLFxuICAgICAgICBpcGhvbmVYOiBmYWxzZSxcbiAgICAgICAgaXBvZDogZmFsc2UsXG4gICAgICAgIGlwYWQ6IGZhbHNlLFxuICAgICAgICBlZGdlOiBmYWxzZSxcbiAgICAgICAgaWU6IGZhbHNlLFxuICAgICAgICBmaXJlZm94OiBmYWxzZSxcbiAgICAgICAgbWFjb3M6IGZhbHNlLFxuICAgICAgICB3aW5kb3dzOiBmYWxzZSxcbiAgICAgICAgY29yZG92YTogISEoZ2V0R2xvYmFsKClbJ2NvcmRvdmEnXSksXG4gICAgICAgIGVsZWN0cm9uOiBmYWxzZSxcbiAgICB9IGFzIHVua25vd24gYXMgV3JpdGFibGU8UGxhdGZvcm0+O1xuXG4gICAgY29uc3QgeyB1c2VyQWdlbnQ6IHVhLCBwbGF0Zm9ybTogb3MsIHN0YW5kYWxvbmUgfSA9IGNvbnRleHQubmF2aWdhdG9yIHx8IG5hdmlnYXRvciBhcyB7IHVzZXJBZ2VudDogc3RyaW5nOyBwbGF0Zm9ybTogc3RyaW5nOyBzdGFuZGFsb25lPzogYm9vbGVhbjsgfTtcbiAgICBjb25zdCB7IHdpZHRoOiBzY3JlZW5XaWR0aCwgaGVpZ2h0OiBzY3JlZW5IZWlnaHQgfSA9IGNvbnRleHQuc2NyZWVuIHx8IHNjcmVlbjtcbiAgICBjb25zdCBwaXhlbFJhdGlvID0gY29udGV4dC5kZXZpY2VQaXhlbFJhdGlvO1xuXG4gICAgY29uc3QgYW5kcm9pZCAgPSAvKEFuZHJvaWQpOz9bXFxzL10rKFtcXGQuXSspPy8uZXhlYyh1YSk7XG4gICAgbGV0ICAgaXBhZCAgICAgPSAvKGlQYWQpLipPU1xccyhbXFxkX10rKS8uZXhlYyh1YSk7XG4gICAgY29uc3QgaXBvZCAgICAgPSAvKGlQb2QpKC4qT1NcXHMoW1xcZF9dKykpPy8uZXhlYyh1YSk7XG4gICAgbGV0ICAgaXBob25lICAgPSAhaXBhZCAmJiAvKGlQaG9uZVxcc09TfGlPUylcXHMoW1xcZF9dKykvLmV4ZWModWEpO1xuICAgIGNvbnN0IGllICAgICAgID0gMCA8PSB1YS5pbmRleE9mKCdNU0lFICcpIHx8IDAgPD0gdWEuaW5kZXhPZignVHJpZGVudC8nKTtcbiAgICBjb25zdCBlZGdlICAgICA9IDAgPD0gdWEuaW5kZXhPZignRWRnZS8nKTtcbiAgICBjb25zdCBmaXJlZm94ICA9IDAgPD0gdWEuaW5kZXhPZignR2Vja28vJykgJiYgMCA8PSB1YS5pbmRleE9mKCdGaXJlZm94LycpO1xuICAgIGNvbnN0IHdpbmRvd3MgID0gJ1dpbjMyJyA9PT0gb3M7XG4gICAgbGV0ICAgbWFjb3MgICAgPSAnTWFjSW50ZWwnID09PSBvcztcbiAgICBjb25zdCBlbGVjdHJvbiA9IHVhLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCgnZWxlY3Ryb24nKTtcblxuICAgIC8vIGlQaG9uZShYKSAvIGlQYWQoUHJvKURlc2t0b3AgTW9kZVxuICAgIGlmICghaXBob25lICYmICFpcGFkXG4gICAgICAgICYmIG1hY29zXG4gICAgICAgICYmIHN1cHBvcnRUb3VjaCgpXG4gICAgICAgICYmICh1bmRlZmluZWQgIT09IHN0YW5kYWxvbmVcbi8vICAgICAgICAgICAgKDEwMjQgPT09IHNjcmVlbldpZHRoICYmIDEzNjYgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDEzNjYgPT09IHNjcmVlbldpZHRoICYmIDEwMjQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTk0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTE5NCA9PT0gc2NyZWVuV2lkdGggJiYgIDgzNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTEgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMTEyID09PSBzY3JlZW5XaWR0aCAmJiAgODM0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDc2OCA9PT0gc2NyZWVuV2lkdGggJiYgMTAyNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTAyNCA9PT0gc2NyZWVuV2lkdGggJiYgIDc2OCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBsYW5kc2NhcGVcbiAgICAgICAgKVxuICAgICkge1xuICAgICAgICBjb25zdCByZWdleCA9IC8oVmVyc2lvbilcXC8oW1xcZC5dKykvLmV4ZWModWEpO1xuICAgICAgICBpZiAobWF5YmVUYWJsZXQoc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkpIHtcbiAgICAgICAgICAgIGlwYWQgPSByZWdleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlwaG9uZSA9IHJlZ2V4O1xuICAgICAgICB9XG4gICAgICAgIG1hY29zID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaW5mby5pZSA9IGllO1xuICAgIGluZm8uZWRnZSA9IGVkZ2U7XG4gICAgaW5mby5maXJlZm94ID0gZmlyZWZveDtcblxuICAgIC8vIEFuZHJvaWRcbiAgICBpZiAoYW5kcm9pZCAmJiAhd2luZG93cykge1xuICAgICAgICBpbmZvLm9zID0gJ2FuZHJvaWQnO1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGFuZHJvaWRbMl07XG4gICAgICAgIGluZm8uYW5kcm9pZCA9IHRydWU7XG4gICAgICAgIGluZm8uYW5kcm9pZENocm9tZSA9IDAgPD0gdWEudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdjaHJvbWUnKTtcbiAgICAgICAgaWYgKDAgPD0gdWEuaW5kZXhPZignTW9iaWxlJykpIHtcbiAgICAgICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpcGFkIHx8IGlwaG9uZSB8fCBpcG9kKSB7XG4gICAgICAgIGluZm8ub3MgPSAnaW9zJztcbiAgICAgICAgaW5mby5pb3MgPSB0cnVlO1xuICAgIH1cbiAgICAvLyBpT1NcbiAgICBpZiAoaXBob25lICYmICFpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBob25lWzJdLnJlcGxhY2UoL18vZywgJy4nKTtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBob25lID0gdHJ1ZTtcbiAgICAgICAgLy8gaVBob25lIFhcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgKDM3NSA9PT0gc2NyZWVuV2lkdGggJiYgODEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFgsIFhTIHBvcnRyYWl0XG4gICAgICAgICB8fCAoODEyID09PSBzY3JlZW5XaWR0aCAmJiAzNzUgPT09IHNjcmVlbkhlaWdodCkgLy8gWCwgWFMgbGFuZHNjYXBlXG4gICAgICAgICB8fCAoNDE0ID09PSBzY3JlZW5XaWR0aCAmJiA4OTYgPT09IHNjcmVlbkhlaWdodCkgLy8gWFMgTWF4LCBYUiBwb3J0cmFpdFxuICAgICAgICAgfHwgKDg5NiA9PT0gc2NyZWVuV2lkdGggJiYgNDE0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFhTIE1heCwgWFIgbGFuZHNjYXBlXG4gICAgICAgICkge1xuICAgICAgICAgICAgaW5mby5pcGhvbmVYID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXBhZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwYWRbMl0ucmVwbGFjZSgvXy9nLCAnLicpO1xuICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIGluZm8uaXBhZCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBvZFszXSA/IGlwb2RbM10ucmVwbGFjZSgvXy9nLCAnLicpIDogbnVsbDtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBvZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gRGVza3RvcFxuICAgIGluZm8uZGVza3RvcCA9ICFzdXBwb3J0T3JpZW50YXRpb24odWEpO1xuICAgIGlmIChpbmZvLmRlc2t0b3ApIHtcbiAgICAgICAgaW5mby5lbGVjdHJvbiA9IGVsZWN0cm9uO1xuICAgICAgICBpbmZvLm1hY29zICAgID0gbWFjb3M7XG4gICAgICAgIGluZm8ud2luZG93cyAgPSB3aW5kb3dzO1xuICAgICAgICBpbmZvLm1hY29zICYmIChpbmZvLm9zID0gJ21hY29zJyk7XG4gICAgICAgIGluZm8ud2luZG93cyAmJiAoaW5mby5vcyA9ICd3aW5kb3dzJyk7XG4gICAgfVxuXG4gICAgLy8gTW9iaWxlXG4gICAgaW5mby5tb2JpbGUgPSAhaW5mby5kZXNrdG9wO1xuICAgIGlmIChpbmZvLm1vYmlsZSAmJiAhaW5mby5waG9uZSAmJiAhaW5mby50YWJsZXQpIHtcbiAgICAgICAgaWYgKG1heWJlVGFibGV0KHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpKSB7XG4gICAgICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFBpeGVsIFJhdGlvXG4gICAgaW5mby5waXhlbFJhdGlvID0gcGl4ZWxSYXRpbyB8fCAxO1xuXG4gICAgcmV0dXJuIGluZm87XG59O1xuXG4vKipcbiAqIEBlbiBQbGF0Zm9ybSBpbmZvcm1hdGlvbiBvbiBydW50aW1lLlxuICogQGphIOODqeODs+OCv+OCpOODoOOBruODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgsVxuICovXG5leHBvcnQgY29uc3QgcGxhdGZvcm0gPSBxdWVyeVBsYXRmb3JtKCk7XG4iXSwibmFtZXMiOlsic2FmZSIsImxvY2F0aW9uIiwibmF2aWdhdG9yIiwic2NyZWVuIiwiZGV2aWNlUGl4ZWxSYXRpbyIsImdldEdsb2JhbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFFQTs7SUFFRztJQUVILGlCQUFpQixNQUFNLFNBQVMsR0FBV0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNyRSxpQkFBaUIsTUFBTSxVQUFVLEdBQVVBLGNBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdEUsaUJBQWlCLE1BQU0sT0FBTyxHQUFhQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25FLGlCQUFpQixNQUFNLGlCQUFpQixHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDOztJQ1A1RTs7Ozs7OztJQU9HO0FBQ1UsVUFBQSxlQUFlLEdBQUcsQ0FBQyxHQUFXLEtBQVk7UUFDbkQsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQyxFQUFFO0lBRUY7Ozs7O0lBS0c7QUFDVSxVQUFBLE9BQU8sR0FBVyxlQUFlLENBQUNDLFNBQVEsQ0FBQyxJQUFJLEVBQUU7SUFFOUQ7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQWtCRztBQUNVLFVBQUEsS0FBSyxHQUFHLENBQUMsSUFBWSxLQUFZO1FBQzFDLElBQUksSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElB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
