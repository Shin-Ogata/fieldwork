/*!
 * @cdp/environment 0.9.20
 *   environment resolver module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP));
})(this, (function (exports, coreUtils) { 'use strict';

    /* ts4.7+ patch: non internal */
    /** !internal */ const navigator$1 = coreUtils.safe(globalThis.navigator);
    /** !internal */ const screen$1 = coreUtils.safe(globalThis.screen);
    /** !internal */ const devicePixelRatio$1 = coreUtils.safe(globalThis.devicePixelRatio);
    /** @internal */ const context = { navigator: navigator$1, screen: screen$1, devicePixelRatio: devicePixelRatio$1 };

    /** @internal ts4.7+ patch */
    const { navigator, screen, devicePixelRatio } = context;
    //__________________________________________________________________________________________________//
    /** @internal */
    const maybeTablet = (width, height) => {
        return (600 /* Threshold.TABLET_MIN_WIDTH */ <= Math.min(width, height));
    };
    /** @internal */
    const supportTouch = () => {
        return !!((navigator.maxTouchPoints > 0) || ('ontouchstart' in globalThis));
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
        context = context ?? { navigator, screen, devicePixelRatio };
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
        const { userAgent: ua, platform: os, standalone } = context.navigator ?? navigator;
        const { width: screenWidth, height: screenHeight } = context.screen ?? screen;
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
        if (ipad ?? iphone ?? ipod) {
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
        info.pixelRatio = pixelRatio ?? 1;
        return info;
    };
    /**
     * @en Platform information on runtime.
     * @ja ランタイムのプラットフォーム情報
     */
    const platform = queryPlatform();

    exports.platform = platform;
    exports.queryPlatform = queryPlatform;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VzIjpbInNzci50cyIsInBsYXRmb3JtLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiB0czQuNysgcGF0Y2g6IG5vbiBpbnRlcm5hbCAqL1xuLyoqICFpbnRlcm5hbCAqLyBjb25zdCBuYXZpZ2F0b3IgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLm5hdmlnYXRvcik7XG4vKiogIWludGVybmFsICovIGNvbnN0IHNjcmVlbiAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuc2NyZWVuKTtcbi8qKiAhaW50ZXJuYWwgKi8gY29uc3QgZGV2aWNlUGl4ZWxSYXRpbyA9IHNhZmUoZ2xvYmFsVGhpcy5kZXZpY2VQaXhlbFJhdGlvKTtcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgY29udGV4dCA9IHsgbmF2aWdhdG9yLCBzY3JlZW4sIGRldmljZVBpeGVsUmF0aW8gfTtcbiIsImltcG9ydCB7IHR5cGUgV3JpdGFibGUsIGdldEdsb2JhbCB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBjb250ZXh0IGFzIGdsb2JhbENvbnRleHQgfSBmcm9tICcuL3Nzcic7XG5cbi8qKiBAaW50ZXJuYWwgdHM0LjcrIHBhdGNoICovXG5jb25zdCB7IG5hdmlnYXRvciwgc2NyZWVuLCBkZXZpY2VQaXhlbFJhdGlvIH0gPSBnbG9iYWxDb250ZXh0O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBlbnVtIFRocmVzaG9sZCB7XG4gICAgVEFCTEVUX01JTl9XSURUSCA9IDYwMCwgLy8gZmFsbGJhY2sgZGV0ZWN0aW9uIHZhbHVlXG59XG5cbi8qKlxuICogQGVuIFBsYXRmb3JtIGluZm9ybWF0aW9uLlxuICogQGphIOODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgsVxuICpcbiAqIEBzZWUgb3RoZXIgZnJhbWV3b3JrIGltcGxlbWVudGF0aW9uIDxicj5cbiAqICAtIEZyYW1ld29yazdcbiAqICAgIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvbWFzdGVyL3NyYy9jb3JlL3NoYXJlZC9nZXQtZGV2aWNlLmpzXG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS9zaGFyZWQvZ2V0LWRldmljZS5kLnRzXG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS9zaGFyZWQvZ2V0LXN1cHBvcnQuanNcbiAqICAgIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvbWFzdGVyL3NyYy9jb3JlL3NoYXJlZC9nZXQtc3VwcG9ydC5kLnRzXG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL3Y0L3NyYy9jb3JlL3V0aWxzL2RldmljZS5qcyAgICAvLyBjaGVjayBsZWdhY3kgZGV2aWNlOiBpUGhvbmVYIGV0Y1xuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi92NC9zcmMvY29yZS91dGlscy9kZXZpY2UuZC50c1xuICogIC0gT25zZW5VSVxuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vT25zZW5VSS9PbnNlblVJL2Jsb2IvbWFzdGVyL2NvcmUvc3JjL29ucy9wbGF0Zm9ybS5qc1xuICogIC0gV2ViXG4gKiAgICAtIGh0dHBzOi8vd3d3LmJpdC1oaXZlLmNvbS9hcnRpY2xlcy8yMDE5MDgyMFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsYXRmb3JtIHtcbiAgICAvKiogdHJ1ZSBmb3IgaU9TIGluZm8gKi9cbiAgICByZWFkb25seSBpb3M6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEFuZHJvaWQgaW5mbyAqL1xuICAgIHJlYWRvbmx5IGFuZHJvaWQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEFuZHJvaWQgQ2hyb21lICovXG4gICAgcmVhZG9ubHkgYW5kcm9pZENocm9tZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBicm93c2VyICovXG4gICAgcmVhZG9ubHkgZGVza3RvcDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgbW9iaWxlIGluZm8gKi9cbiAgICByZWFkb25seSBtb2JpbGU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIHNtYXJ0IHBob25lIChpbmNsdWRpbmcgaVBvZCkgaW5mbyAqL1xuICAgIHJlYWRvbmx5IHBob25lOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciB0YWJsZXQgaW5mbyAqL1xuICAgIHJlYWRvbmx5IHRhYmxldDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBob25lICovXG4gICAgcmVhZG9ubHkgaXBob25lOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGhvbmVYICovXG4gICAgcmVhZG9ubHkgaXBob25lWDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBvZCAqL1xuICAgIHJlYWRvbmx5IGlwb2Q6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQYWQgKi9cbiAgICByZWFkb25seSBpcGFkOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBNUyBFZGdlIGJyb3dzZXIgKi9cbiAgICByZWFkb25seSBlZGdlOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBJbnRlcm5ldCBFeHBsb3JlciBicm93c2VyKi9cbiAgICByZWFkb25seSBpZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgRmlyZUZveCBicm93c2VyKi9cbiAgICByZWFkb25seSBmaXJlZm94OiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIE1hY09TICovXG4gICAgcmVhZG9ubHkgbWFjb3M6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgV2luZG93cyAqL1xuICAgIHJlYWRvbmx5IHdpbmRvd3M6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgd2hlbiBhcHAgcnVubmluZyBpbiBjb3Jkb3ZhIGVudmlyb25tZW50ICovXG4gICAgcmVhZG9ubHkgY29yZG92YTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSB3aGVuIGFwcCBydW5uaW5nIGluIGVsZWN0cm9uIGVudmlyb25tZW50ICovXG4gICAgcmVhZG9ubHkgZWxlY3Ryb246IGJvb2xlYW47XG4gICAgLyoqIENvbnRhaW5zIE9TIGNhbiBiZSBpb3MsIGFuZHJvaWQgb3Igd2luZG93cyAoZm9yIFdpbmRvd3MgUGhvbmUpICovXG4gICAgcmVhZG9ubHkgb3M6IHN0cmluZztcbiAgICAvKiogQ29udGFpbnMgT1MgdmVyc2lvbiwgZS5nLiAxMS4yLjAgKi9cbiAgICByZWFkb25seSBvc1ZlcnNpb246IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQ7XG4gICAgLyoqIERldmljZSBwaXhlbCByYXRpbyAqL1xuICAgIHJlYWRvbmx5IHBpeGVsUmF0aW86IG51bWJlcjtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IG1heWJlVGFibGV0ID0gKHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIChUaHJlc2hvbGQuVEFCTEVUX01JTl9XSURUSCA8PSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSk7XG59O1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBzdXBwb3J0VG91Y2ggPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICEhKChuYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgPiAwKSB8fCAoJ29udG91Y2hzdGFydCcgaW4gZ2xvYmFsVGhpcykpO1xufTtcblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqIEBzZWUgU2NyZWVuLm9yaWVudGF0aW9uIDxicj5cbiAqICAtIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0FQSS9TY3JlZW4vb3JpZW50YXRpb25cbiAqL1xuY29uc3Qgc3VwcG9ydE9yaWVudGF0aW9uID0gKHVhOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gKCdvcmllbnRhdGlvbicgaW4gZ2xvYmFsVGhpcykgfHwgKDAgPD0gdWEuaW5kZXhPZignV2luZG93cyBQaG9uZScpKTtcbn07XG5cbi8qKlxuICogQGVuIFF1ZXJ5IHBsYXRmb3JtIGluZm9ybWF0aW9uLlxuICogQGphIOODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgseOBruWPluW+l1xuICpcbiAqIEBwYXJhbSBjb250ZXh0XG4gKiAgLSBgZW5gIGdpdmVuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIGluZm9ybWF0aW9uLlxuICogIC0gYGphYCDnkrDlooPjga4gYE5hdmlnYXRvcmAsIGBTY3JlZW5gLCBgZGV2aWNlUGl4ZWxSYXRpb2Ag44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCBxdWVyeVBsYXRmb3JtID0gKFxuICAgIGNvbnRleHQ/OiB7XG4gICAgICAgIG5hdmlnYXRvcj86IHsgdXNlckFnZW50OiBzdHJpbmc7IHBsYXRmb3JtOiBzdHJpbmc7IHN0YW5kYWxvbmU/OiBib29sZWFuOyB9O1xuICAgICAgICBzY3JlZW4/OiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyOyB9O1xuICAgICAgICBkZXZpY2VQaXhlbFJhdGlvPzogbnVtYmVyO1xuICAgIH1cbik6IFBsYXRmb3JtID0+IHtcbiAgICBjb250ZXh0ID0gY29udGV4dCA/PyB7IG5hdmlnYXRvciwgc2NyZWVuLCBkZXZpY2VQaXhlbFJhdGlvIH07XG4gICAgY29uc3QgaW5mbyA9IHtcbiAgICAgICAgaW9zOiBmYWxzZSxcbiAgICAgICAgYW5kcm9pZDogZmFsc2UsXG4gICAgICAgIGFuZHJvaWRDaHJvbWU6IGZhbHNlLFxuICAgICAgICBkZXNrdG9wOiBmYWxzZSxcbiAgICAgICAgbW9iaWxlOiBmYWxzZSxcbiAgICAgICAgcGhvbmU6IGZhbHNlLFxuICAgICAgICB0YWJsZXQ6IGZhbHNlLFxuICAgICAgICBpcGhvbmU6IGZhbHNlLFxuICAgICAgICBpcGhvbmVYOiBmYWxzZSxcbiAgICAgICAgaXBvZDogZmFsc2UsXG4gICAgICAgIGlwYWQ6IGZhbHNlLFxuICAgICAgICBlZGdlOiBmYWxzZSxcbiAgICAgICAgaWU6IGZhbHNlLFxuICAgICAgICBmaXJlZm94OiBmYWxzZSxcbiAgICAgICAgbWFjb3M6IGZhbHNlLFxuICAgICAgICB3aW5kb3dzOiBmYWxzZSxcbiAgICAgICAgY29yZG92YTogISEoKGdldEdsb2JhbCgpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVsnY29yZG92YSddKSxcbiAgICAgICAgZWxlY3Ryb246IGZhbHNlLFxuICAgIH0gYXMgdW5rbm93biBhcyBXcml0YWJsZTxQbGF0Zm9ybT47XG5cbiAgICBjb25zdCB7IHVzZXJBZ2VudDogdWEsIHBsYXRmb3JtOiBvcywgc3RhbmRhbG9uZSB9ID0gY29udGV4dC5uYXZpZ2F0b3IgPz8gbmF2aWdhdG9yIGFzIHsgdXNlckFnZW50OiBzdHJpbmc7IHBsYXRmb3JtOiBzdHJpbmc7IHN0YW5kYWxvbmU/OiBib29sZWFuOyB9O1xuICAgIGNvbnN0IHsgd2lkdGg6IHNjcmVlbldpZHRoLCBoZWlnaHQ6IHNjcmVlbkhlaWdodCB9ID0gY29udGV4dC5zY3JlZW4gPz8gc2NyZWVuO1xuICAgIGNvbnN0IHBpeGVsUmF0aW8gPSBjb250ZXh0LmRldmljZVBpeGVsUmF0aW87XG5cbiAgICBjb25zdCBhbmRyb2lkICA9IC8oQW5kcm9pZCk7P1tcXHMvXSsoW1xcZC5dKyk/Ly5leGVjKHVhKTtcbiAgICBsZXQgICBpcGFkICAgICA9IC8oaVBhZCkuKk9TXFxzKFtcXGRfXSspLy5leGVjKHVhKTtcbiAgICBjb25zdCBpcG9kICAgICA9IC8oaVBvZCkoLipPU1xccyhbXFxkX10rKSk/Ly5leGVjKHVhKTtcbiAgICBsZXQgICBpcGhvbmUgICA9ICFpcGFkICYmIC8oaVBob25lXFxzT1N8aU9TKVxccyhbXFxkX10rKS8uZXhlYyh1YSk7XG4gICAgY29uc3QgaWUgICAgICAgPSAwIDw9IHVhLmluZGV4T2YoJ01TSUUgJykgfHwgMCA8PSB1YS5pbmRleE9mKCdUcmlkZW50LycpO1xuICAgIGNvbnN0IGVkZ2UgICAgID0gMCA8PSB1YS5pbmRleE9mKCdFZGdlLycpO1xuICAgIGNvbnN0IGZpcmVmb3ggID0gMCA8PSB1YS5pbmRleE9mKCdHZWNrby8nKSAmJiAwIDw9IHVhLmluZGV4T2YoJ0ZpcmVmb3gvJyk7XG4gICAgY29uc3Qgd2luZG93cyAgPSAnV2luMzInID09PSBvcztcbiAgICBsZXQgICBtYWNvcyAgICA9ICdNYWNJbnRlbCcgPT09IG9zO1xuICAgIGNvbnN0IGVsZWN0cm9uID0gdWEudG9Mb3dlckNhc2UoKS5zdGFydHNXaXRoKCdlbGVjdHJvbicpO1xuXG4gICAgLy8gaVBob25lKFgpIC8gaVBhZChQcm8pRGVza3RvcCBNb2RlXG4gICAgaWYgKCFpcGhvbmUgJiYgIWlwYWRcbiAgICAgICAgJiYgbWFjb3NcbiAgICAgICAgJiYgc3VwcG9ydFRvdWNoKClcbiAgICAgICAgJiYgKHVuZGVmaW5lZCAhPT0gc3RhbmRhbG9uZVxuLy8gICAgICAgICAgICAoMTAyNCA9PT0gc2NyZWVuV2lkdGggJiYgMTM2NiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTIuOSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTM2NiA9PT0gc2NyZWVuV2lkdGggJiYgMTAyNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTIuOSBsYW5kc2NhcGVcbi8vICAgICAgICAgfHwgKCA4MzQgPT09IHNjcmVlbldpZHRoICYmIDExOTQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDExIHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMTk0ID09PSBzY3JlZW5XaWR0aCAmJiAgODM0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMSBsYW5kc2NhcGVcbi8vICAgICAgICAgfHwgKCA4MzQgPT09IHNjcmVlbldpZHRoICYmIDExMTIgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEwLjUgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDExMTIgPT09IHNjcmVlbldpZHRoICYmICA4MzQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEwLjUgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggNzY4ID09PSBzY3JlZW5XaWR0aCAmJiAxMDI0ID09PSBzY3JlZW5IZWlnaHQpIC8vIG90aGVyIHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMDI0ID09PSBzY3JlZW5XaWR0aCAmJiAgNzY4ID09PSBzY3JlZW5IZWlnaHQpIC8vIG90aGVyIGxhbmRzY2FwZVxuICAgICAgICApXG4gICAgKSB7XG4gICAgICAgIGNvbnN0IHJlZ2V4ID0gLyhWZXJzaW9uKVxcLyhbXFxkLl0rKS8uZXhlYyh1YSk7XG4gICAgICAgIGlmIChtYXliZVRhYmxldChzY3JlZW5XaWR0aCwgc2NyZWVuSGVpZ2h0KSkge1xuICAgICAgICAgICAgaXBhZCA9IHJlZ2V4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXBob25lID0gcmVnZXg7XG4gICAgICAgIH1cbiAgICAgICAgbWFjb3MgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpbmZvLmllID0gaWU7XG4gICAgaW5mby5lZGdlID0gZWRnZTtcbiAgICBpbmZvLmZpcmVmb3ggPSBmaXJlZm94O1xuXG4gICAgLy8gQW5kcm9pZFxuICAgIGlmIChhbmRyb2lkICYmICF3aW5kb3dzKSB7XG4gICAgICAgIGluZm8ub3MgPSAnYW5kcm9pZCc7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gYW5kcm9pZFsyXTtcbiAgICAgICAgaW5mby5hbmRyb2lkID0gdHJ1ZTtcbiAgICAgICAgaW5mby5hbmRyb2lkQ2hyb21lID0gMCA8PSB1YS50b0xvd2VyQ2FzZSgpLmluZGV4T2YoJ2Nocm9tZScpO1xuICAgICAgICBpZiAoMCA8PSB1YS5pbmRleE9mKCdNb2JpbGUnKSkge1xuICAgICAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlwYWQgPz8gaXBob25lID8/IGlwb2QpIHtcbiAgICAgICAgaW5mby5vcyA9ICdpb3MnO1xuICAgICAgICBpbmZvLmlvcyA9IHRydWU7XG4gICAgfVxuICAgIC8vIGlPU1xuICAgIGlmIChpcGhvbmUgJiYgIWlwb2QpIHtcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBpcGhvbmVbMl0ucmVwbGFjZSgvXy9nLCAnLicpO1xuICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgaW5mby5pcGhvbmUgPSB0cnVlO1xuICAgICAgICAvLyBpUGhvbmUgWFxuICAgICAgICBpZiAoXG4gICAgICAgICAgICAoMzc1ID09PSBzY3JlZW5XaWR0aCAmJiA4MTIgPT09IHNjcmVlbkhlaWdodCkgLy8gWCwgWFMgcG9ydHJhaXRcbiAgICAgICAgIHx8ICg4MTIgPT09IHNjcmVlbldpZHRoICYmIDM3NSA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYLCBYUyBsYW5kc2NhcGVcbiAgICAgICAgIHx8ICg0MTQgPT09IHNjcmVlbldpZHRoICYmIDg5NiA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBYUyBNYXgsIFhSIHBvcnRyYWl0XG4gICAgICAgICB8fCAoODk2ID09PSBzY3JlZW5XaWR0aCAmJiA0MTQgPT09IHNjcmVlbkhlaWdodCkgLy8gWFMgTWF4LCBYUiBsYW5kc2NhcGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBpbmZvLmlwaG9uZVggPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpcGFkKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBhZFsyXS5yZXBsYWNlKC9fL2csICcuJyk7XG4gICAgICAgIGluZm8udGFibGV0ID0gdHJ1ZTtcbiAgICAgICAgaW5mby5pcGFkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlwb2QpIHtcbiAgICAgICAgaW5mby5vc1ZlcnNpb24gPSBpcG9kWzNdID8gaXBvZFszXS5yZXBsYWNlKC9fL2csICcuJykgOiBudWxsO1xuICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgaW5mby5pcG9kID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBEZXNrdG9wXG4gICAgaW5mby5kZXNrdG9wID0gIXN1cHBvcnRPcmllbnRhdGlvbih1YSk7XG4gICAgaWYgKGluZm8uZGVza3RvcCkge1xuICAgICAgICBpbmZvLmVsZWN0cm9uID0gZWxlY3Ryb247XG4gICAgICAgIGluZm8ubWFjb3MgICAgPSBtYWNvcztcbiAgICAgICAgaW5mby53aW5kb3dzICA9IHdpbmRvd3M7XG4gICAgICAgIGluZm8ubWFjb3MgJiYgKGluZm8ub3MgPSAnbWFjb3MnKTtcbiAgICAgICAgaW5mby53aW5kb3dzICYmIChpbmZvLm9zID0gJ3dpbmRvd3MnKTtcbiAgICB9XG5cbiAgICAvLyBNb2JpbGVcbiAgICBpbmZvLm1vYmlsZSA9ICFpbmZvLmRlc2t0b3A7XG4gICAgaWYgKGluZm8ubW9iaWxlICYmICFpbmZvLnBob25lICYmICFpbmZvLnRhYmxldCkge1xuICAgICAgICBpZiAobWF5YmVUYWJsZXQoc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkpIHtcbiAgICAgICAgICAgIGluZm8udGFibGV0ID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUGl4ZWwgUmF0aW9cbiAgICBpbmZvLnBpeGVsUmF0aW8gPSBwaXhlbFJhdGlvID8/IDE7XG5cbiAgICByZXR1cm4gaW5mbztcbn07XG5cbi8qKlxuICogQGVuIFBsYXRmb3JtIGluZm9ybWF0aW9uIG9uIHJ1bnRpbWUuXG4gKiBAamEg44Op44Oz44K/44Kk44Og44Gu44OX44Op44OD44OI44OV44Kp44O844Og5oOF5aCxXG4gKi9cbmV4cG9ydCBjb25zdCBwbGF0Zm9ybSA9IHF1ZXJ5UGxhdGZvcm0oKTtcbiJdLCJuYW1lcyI6WyJuYXZpZ2F0b3IiLCJzYWZlIiwic2NyZWVuIiwiZGV2aWNlUGl4ZWxSYXRpbyIsImdsb2JhbENvbnRleHQiLCJnZXRHbG9iYWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBRUE7SUFDQSxpQkFBaUIsTUFBTUEsV0FBUyxHQUFVQyxjQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztJQUNwRSxpQkFBaUIsTUFBTUMsUUFBTSxHQUFhRCxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztJQUNqRSxpQkFBaUIsTUFBTUUsa0JBQWdCLEdBQUdGLGNBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUM7SUFFM0UsaUJBQXdCLE1BQU0sT0FBTyxHQUFHLGFBQUVELFdBQVMsVUFBRUUsUUFBTSxvQkFBRUMsa0JBQWdCLEVBQUU7O0lDSi9FO0lBQ0EsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBR0MsT0FBYTtJQXFFN0Q7SUFFQTtJQUNBLE1BQU0sV0FBVyxHQUFHLENBQUMsS0FBYSxFQUFFLE1BQWMsS0FBYTtRQUMzRCxRQUFRLEdBQUEscUNBQThCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQztJQUNqRSxDQUFDO0lBRUQ7SUFDQSxNQUFNLFlBQVksR0FBRyxNQUFjO0lBQy9CLElBQUEsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsY0FBYyxHQUFHLENBQUMsTUFBTSxjQUFjLElBQUksVUFBVSxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVEOzs7O0lBSUc7SUFDSCxNQUFNLGtCQUFrQixHQUFHLENBQUMsRUFBVSxLQUFhO0lBQy9D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QUFDLEVBQUUsR0FBRyxPQUFPLENBQUM7WUFDakMsSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQztRQUN6Qzs7SUFHQSxJQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTztJQUMzQixJQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0lBQzVDLFFBQUEsSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxFQUFFO0lBQ3hDLFlBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJO1lBQ3RCO2lCQUFPO0lBQ0gsWUFBQSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUk7WUFDckI7UUFDSjs7SUFHQSxJQUFBLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxJQUFJLENBQUM7SUFFakMsSUFBQSxPQUFPLElBQUk7SUFDZjtJQUVBOzs7SUFHRztBQUNJLFVBQU0sUUFBUSxHQUFHLGFBQWE7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9lbnZpcm9ubWVudC8ifQ==