/*!
 * @cdp/environment 0.9.17
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
        context = context || { navigator, screen, devicePixelRatio };
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
        const { userAgent: ua, platform: os, standalone } = context.navigator || navigator;
        const { width: screenWidth, height: screenHeight } = context.screen || screen;
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

    exports.platform = platform;
    exports.queryPlatform = queryPlatform;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VzIjpbInNzci50cyIsInBsYXRmb3JtLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiB0czQuNysgcGF0Y2g6IG5vbiBpbnRlcm5hbCAqL1xuLyoqICFpbnRlcm5hbCAqLyBjb25zdCBuYXZpZ2F0b3IgICAgICAgID0gc2FmZShnbG9iYWxUaGlzLm5hdmlnYXRvcik7XG4vKiogIWludGVybmFsICovIGNvbnN0IHNjcmVlbiAgICAgICAgICAgPSBzYWZlKGdsb2JhbFRoaXMuc2NyZWVuKTtcbi8qKiAhaW50ZXJuYWwgKi8gY29uc3QgZGV2aWNlUGl4ZWxSYXRpbyA9IHNhZmUoZ2xvYmFsVGhpcy5kZXZpY2VQaXhlbFJhdGlvKTtcblxuLyoqIEBpbnRlcm5hbCAqLyBleHBvcnQgY29uc3QgY29udGV4dCA9IHsgbmF2aWdhdG9yLCBzY3JlZW4sIGRldmljZVBpeGVsUmF0aW8gfTtcbiIsImltcG9ydCB7IFdyaXRhYmxlLCBnZXRHbG9iYWwgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgY29udGV4dCBhcyBnbG9iYWxDb250ZXh0IH0gZnJvbSAnLi9zc3InO1xuXG4vKiogQGludGVybmFsIHRzNC43KyBwYXRjaCAqL1xuY29uc3QgeyBuYXZpZ2F0b3IsIHNjcmVlbiwgZGV2aWNlUGl4ZWxSYXRpbyB9ID0gZ2xvYmFsQ29udGV4dDtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3QgZW51bSBUaHJlc2hvbGQge1xuICAgIFRBQkxFVF9NSU5fV0lEVEggPSA2MDAsIC8vIGZhbGxiYWNrIGRldGVjdGlvbiB2YWx1ZVxufVxuXG4vKipcbiAqIEBlbiBQbGF0Zm9ybSBpbmZvcm1hdGlvbi5cbiAqIEBqYSDjg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLFcbiAqXG4gKiBAc2VlIG90aGVyIGZyYW1ld29yayBpbXBsZW1lbnRhdGlvbiA8YnI+XG4gKiAgLSBGcmFtZXdvcms3XG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS9zaGFyZWQvZ2V0LWRldmljZS5qc1xuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi9tYXN0ZXIvc3JjL2NvcmUvc2hhcmVkL2dldC1kZXZpY2UuZC50c1xuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi9tYXN0ZXIvc3JjL2NvcmUvc2hhcmVkL2dldC1zdXBwb3J0LmpzXG4gKiAgICAtIGh0dHBzOi8vZ2l0aHViLmNvbS9mcmFtZXdvcms3aW8vZnJhbWV3b3JrNy9ibG9iL21hc3Rlci9zcmMvY29yZS9zaGFyZWQvZ2V0LXN1cHBvcnQuZC50c1xuICogICAgLSBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi92NC9zcmMvY29yZS91dGlscy9kZXZpY2UuanMgICAgLy8gY2hlY2sgbGVnYWN5IGRldmljZTogaVBob25lWCBldGNcbiAqICAgIC0gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvdjQvc3JjL2NvcmUvdXRpbHMvZGV2aWNlLmQudHNcbiAqICAtIE9uc2VuVUlcbiAqICAgIC0gaHR0cHM6Ly9naXRodWIuY29tL09uc2VuVUkvT25zZW5VSS9ibG9iL21hc3Rlci9jb3JlL3NyYy9vbnMvcGxhdGZvcm0uanNcbiAqICAtIFdlYlxuICogICAgLSBodHRwczovL3d3dy5iaXQtaGl2ZS5jb20vYXJ0aWNsZXMvMjAxOTA4MjBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF0Zm9ybSB7XG4gICAgLyoqIHRydWUgZm9yIGlPUyBpbmZvICovXG4gICAgcmVhZG9ubHkgaW9zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIGluZm8gKi9cbiAgICByZWFkb25seSBhbmRyb2lkOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBBbmRyb2lkIENocm9tZSAqL1xuICAgIHJlYWRvbmx5IGFuZHJvaWRDaHJvbWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGRlc2t0b3AgYnJvd3NlciAqL1xuICAgIHJlYWRvbmx5IGRlc2t0b3A6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIG1vYmlsZSBpbmZvICovXG4gICAgcmVhZG9ubHkgbW9iaWxlOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBzbWFydCBwaG9uZSAoaW5jbHVkaW5nIGlQb2QpIGluZm8gKi9cbiAgICByZWFkb25seSBwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgdGFibGV0IGluZm8gKi9cbiAgICByZWFkb25seSB0YWJsZXQ6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQaG9uZSAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgaVBob25lWCAqL1xuICAgIHJlYWRvbmx5IGlwaG9uZVg6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIGlQb2QgKi9cbiAgICByZWFkb25seSBpcG9kOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBpUGFkICovXG4gICAgcmVhZG9ubHkgaXBhZDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgTVMgRWRnZSBicm93c2VyICovXG4gICAgcmVhZG9ubHkgZWRnZTogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgSW50ZXJuZXQgRXhwbG9yZXIgYnJvd3NlciovXG4gICAgcmVhZG9ubHkgaWU6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgZm9yIEZpcmVGb3ggYnJvd3NlciovXG4gICAgcmVhZG9ubHkgZmlyZWZveDogYm9vbGVhbjtcbiAgICAvKiogdHJ1ZSBmb3IgZGVza3RvcCBNYWNPUyAqL1xuICAgIHJlYWRvbmx5IG1hY29zOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIGZvciBkZXNrdG9wIFdpbmRvd3MgKi9cbiAgICByZWFkb25seSB3aW5kb3dzOiBib29sZWFuO1xuICAgIC8qKiB0cnVlIHdoZW4gYXBwIHJ1bm5pbmcgaW4gY29yZG92YSBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGNvcmRvdmE6IGJvb2xlYW47XG4gICAgLyoqIHRydWUgd2hlbiBhcHAgcnVubmluZyBpbiBlbGVjdHJvbiBlbnZpcm9ubWVudCAqL1xuICAgIHJlYWRvbmx5IGVsZWN0cm9uOiBib29sZWFuO1xuICAgIC8qKiBDb250YWlucyBPUyBjYW4gYmUgaW9zLCBhbmRyb2lkIG9yIHdpbmRvd3MgKGZvciBXaW5kb3dzIFBob25lKSAqL1xuICAgIHJlYWRvbmx5IG9zOiBzdHJpbmc7XG4gICAgLyoqIENvbnRhaW5zIE9TIHZlcnNpb24sIGUuZy4gMTEuMi4wICovXG4gICAgcmVhZG9ubHkgb3NWZXJzaW9uOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkO1xuICAgIC8qKiBEZXZpY2UgcGl4ZWwgcmF0aW8gKi9cbiAgICByZWFkb25seSBwaXhlbFJhdGlvOiBudW1iZXI7XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBtYXliZVRhYmxldCA9ICh3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAoVGhyZXNob2xkLlRBQkxFVF9NSU5fV0lEVEggPD0gTWF0aC5taW4od2lkdGgsIGhlaWdodCkpO1xufTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuY29uc3Qgc3VwcG9ydFRvdWNoID0gKCk6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAhISgobmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMCkgfHwgKCdvbnRvdWNoc3RhcnQnIGluIGdsb2JhbFRoaXMpKTtcbn07XG5cbi8qKlxuICogQGludGVybmFsXG4gKiBAc2VlIFNjcmVlbi5vcmllbnRhdGlvbiA8YnI+XG4gKiAgLSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9qYS9kb2NzL1dlYi9BUEkvU2NyZWVuL29yaWVudGF0aW9uXG4gKi9cbmNvbnN0IHN1cHBvcnRPcmllbnRhdGlvbiA9ICh1YTogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICgnb3JpZW50YXRpb24nIGluIGdsb2JhbFRoaXMpIHx8ICgwIDw9IHVhLmluZGV4T2YoJ1dpbmRvd3MgUGhvbmUnKSk7XG59O1xuXG4vKipcbiAqIEBlbiBRdWVyeSBwbGF0Zm9ybSBpbmZvcm1hdGlvbi5cbiAqIEBqYSDjg5fjg6njg4Pjg4jjg5Xjgqnjg7zjg6Dmg4XloLHjga7lj5blvpdcbiAqXG4gKiBAcGFyYW0gY29udGV4dFxuICogIC0gYGVuYCBnaXZlbiBgTmF2aWdhdG9yYCwgYFNjcmVlbmAsIGBkZXZpY2VQaXhlbFJhdGlvYCBpbmZvcm1hdGlvbi5cbiAqICAtIGBqYWAg55Kw5aKD44GuIGBOYXZpZ2F0b3JgLCBgU2NyZWVuYCwgYGRldmljZVBpeGVsUmF0aW9gIOOCkuaMh+WumlxuICovXG5leHBvcnQgY29uc3QgcXVlcnlQbGF0Zm9ybSA9IChcbiAgICBjb250ZXh0Pzoge1xuICAgICAgICBuYXZpZ2F0b3I/OiB7IHVzZXJBZ2VudDogc3RyaW5nOyBwbGF0Zm9ybTogc3RyaW5nOyBzdGFuZGFsb25lPzogYm9vbGVhbjsgfTtcbiAgICAgICAgc2NyZWVuPzogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlcjsgfTtcbiAgICAgICAgZGV2aWNlUGl4ZWxSYXRpbz86IG51bWJlcjtcbiAgICB9XG4pOiBQbGF0Zm9ybSA9PiB7XG4gICAgY29udGV4dCA9IGNvbnRleHQgfHwgeyBuYXZpZ2F0b3IsIHNjcmVlbiwgZGV2aWNlUGl4ZWxSYXRpbyB9O1xuICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgIGlvczogZmFsc2UsXG4gICAgICAgIGFuZHJvaWQ6IGZhbHNlLFxuICAgICAgICBhbmRyb2lkQ2hyb21lOiBmYWxzZSxcbiAgICAgICAgZGVza3RvcDogZmFsc2UsXG4gICAgICAgIG1vYmlsZTogZmFsc2UsXG4gICAgICAgIHBob25lOiBmYWxzZSxcbiAgICAgICAgdGFibGV0OiBmYWxzZSxcbiAgICAgICAgaXBob25lOiBmYWxzZSxcbiAgICAgICAgaXBob25lWDogZmFsc2UsXG4gICAgICAgIGlwb2Q6IGZhbHNlLFxuICAgICAgICBpcGFkOiBmYWxzZSxcbiAgICAgICAgZWRnZTogZmFsc2UsXG4gICAgICAgIGllOiBmYWxzZSxcbiAgICAgICAgZmlyZWZveDogZmFsc2UsXG4gICAgICAgIG1hY29zOiBmYWxzZSxcbiAgICAgICAgd2luZG93czogZmFsc2UsXG4gICAgICAgIGNvcmRvdmE6ICEhKChnZXRHbG9iYWwoKSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilbJ2NvcmRvdmEnXSksXG4gICAgICAgIGVsZWN0cm9uOiBmYWxzZSxcbiAgICB9IGFzIHVua25vd24gYXMgV3JpdGFibGU8UGxhdGZvcm0+O1xuXG4gICAgY29uc3QgeyB1c2VyQWdlbnQ6IHVhLCBwbGF0Zm9ybTogb3MsIHN0YW5kYWxvbmUgfSA9IGNvbnRleHQubmF2aWdhdG9yIHx8IG5hdmlnYXRvciBhcyB7IHVzZXJBZ2VudDogc3RyaW5nOyBwbGF0Zm9ybTogc3RyaW5nOyBzdGFuZGFsb25lPzogYm9vbGVhbjsgfTtcbiAgICBjb25zdCB7IHdpZHRoOiBzY3JlZW5XaWR0aCwgaGVpZ2h0OiBzY3JlZW5IZWlnaHQgfSA9IGNvbnRleHQuc2NyZWVuIHx8IHNjcmVlbjtcbiAgICBjb25zdCBwaXhlbFJhdGlvID0gY29udGV4dC5kZXZpY2VQaXhlbFJhdGlvO1xuXG4gICAgY29uc3QgYW5kcm9pZCAgPSAvKEFuZHJvaWQpOz9bXFxzL10rKFtcXGQuXSspPy8uZXhlYyh1YSk7XG4gICAgbGV0ICAgaXBhZCAgICAgPSAvKGlQYWQpLipPU1xccyhbXFxkX10rKS8uZXhlYyh1YSk7XG4gICAgY29uc3QgaXBvZCAgICAgPSAvKGlQb2QpKC4qT1NcXHMoW1xcZF9dKykpPy8uZXhlYyh1YSk7XG4gICAgbGV0ICAgaXBob25lICAgPSAhaXBhZCAmJiAvKGlQaG9uZVxcc09TfGlPUylcXHMoW1xcZF9dKykvLmV4ZWModWEpO1xuICAgIGNvbnN0IGllICAgICAgID0gMCA8PSB1YS5pbmRleE9mKCdNU0lFICcpIHx8IDAgPD0gdWEuaW5kZXhPZignVHJpZGVudC8nKTtcbiAgICBjb25zdCBlZGdlICAgICA9IDAgPD0gdWEuaW5kZXhPZignRWRnZS8nKTtcbiAgICBjb25zdCBmaXJlZm94ICA9IDAgPD0gdWEuaW5kZXhPZignR2Vja28vJykgJiYgMCA8PSB1YS5pbmRleE9mKCdGaXJlZm94LycpO1xuICAgIGNvbnN0IHdpbmRvd3MgID0gJ1dpbjMyJyA9PT0gb3M7XG4gICAgbGV0ICAgbWFjb3MgICAgPSAnTWFjSW50ZWwnID09PSBvcztcbiAgICBjb25zdCBlbGVjdHJvbiA9IHVhLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aCgnZWxlY3Ryb24nKTtcblxuICAgIC8vIGlQaG9uZShYKSAvIGlQYWQoUHJvKURlc2t0b3AgTW9kZVxuICAgIGlmICghaXBob25lICYmICFpcGFkXG4gICAgICAgICYmIG1hY29zXG4gICAgICAgICYmIHN1cHBvcnRUb3VjaCgpXG4gICAgICAgICYmICh1bmRlZmluZWQgIT09IHN0YW5kYWxvbmVcbi8vICAgICAgICAgICAgKDEwMjQgPT09IHNjcmVlbldpZHRoICYmIDEzNjYgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgcG9ydHJhaXRcbi8vICAgICAgICAgfHwgKDEzNjYgPT09IHNjcmVlbldpZHRoICYmIDEwMjQgPT09IHNjcmVlbkhlaWdodCkgLy8gUHJvIDEyLjkgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTk0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMSBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTE5NCA9PT0gc2NyZWVuV2lkdGggJiYgIDgzNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBQcm8gMTEgbGFuZHNjYXBlXG4vLyAgICAgICAgIHx8ICggODM0ID09PSBzY3JlZW5XaWR0aCAmJiAxMTEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IHBvcnRyYWl0XG4vLyAgICAgICAgIHx8ICgxMTEyID09PSBzY3JlZW5XaWR0aCAmJiAgODM0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFBybyAxMC41IGxhbmRzY2FwZVxuLy8gICAgICAgICB8fCAoIDc2OCA9PT0gc2NyZWVuV2lkdGggJiYgMTAyNCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBwb3J0cmFpdFxuLy8gICAgICAgICB8fCAoMTAyNCA9PT0gc2NyZWVuV2lkdGggJiYgIDc2OCA9PT0gc2NyZWVuSGVpZ2h0KSAvLyBvdGhlciBsYW5kc2NhcGVcbiAgICAgICAgKVxuICAgICkge1xuICAgICAgICBjb25zdCByZWdleCA9IC8oVmVyc2lvbilcXC8oW1xcZC5dKykvLmV4ZWModWEpO1xuICAgICAgICBpZiAobWF5YmVUYWJsZXQoc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkpIHtcbiAgICAgICAgICAgIGlwYWQgPSByZWdleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlwaG9uZSA9IHJlZ2V4O1xuICAgICAgICB9XG4gICAgICAgIG1hY29zID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaW5mby5pZSA9IGllO1xuICAgIGluZm8uZWRnZSA9IGVkZ2U7XG4gICAgaW5mby5maXJlZm94ID0gZmlyZWZveDtcblxuICAgIC8vIEFuZHJvaWRcbiAgICBpZiAoYW5kcm9pZCAmJiAhd2luZG93cykge1xuICAgICAgICBpbmZvLm9zID0gJ2FuZHJvaWQnO1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGFuZHJvaWRbMl07XG4gICAgICAgIGluZm8uYW5kcm9pZCA9IHRydWU7XG4gICAgICAgIGluZm8uYW5kcm9pZENocm9tZSA9IDAgPD0gdWEudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdjaHJvbWUnKTtcbiAgICAgICAgaWYgKDAgPD0gdWEuaW5kZXhPZignTW9iaWxlJykpIHtcbiAgICAgICAgICAgIGluZm8ucGhvbmUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5mby50YWJsZXQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChpcGFkIHx8IGlwaG9uZSB8fCBpcG9kKSB7XG4gICAgICAgIGluZm8ub3MgPSAnaW9zJztcbiAgICAgICAgaW5mby5pb3MgPSB0cnVlO1xuICAgIH1cbiAgICAvLyBpT1NcbiAgICBpZiAoaXBob25lICYmICFpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBob25lWzJdLnJlcGxhY2UoL18vZywgJy4nKTtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBob25lID0gdHJ1ZTtcbiAgICAgICAgLy8gaVBob25lIFhcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgKDM3NSA9PT0gc2NyZWVuV2lkdGggJiYgODEyID09PSBzY3JlZW5IZWlnaHQpIC8vIFgsIFhTIHBvcnRyYWl0XG4gICAgICAgICB8fCAoODEyID09PSBzY3JlZW5XaWR0aCAmJiAzNzUgPT09IHNjcmVlbkhlaWdodCkgLy8gWCwgWFMgbGFuZHNjYXBlXG4gICAgICAgICB8fCAoNDE0ID09PSBzY3JlZW5XaWR0aCAmJiA4OTYgPT09IHNjcmVlbkhlaWdodCkgLy8gWFMgTWF4LCBYUiBwb3J0cmFpdFxuICAgICAgICAgfHwgKDg5NiA9PT0gc2NyZWVuV2lkdGggJiYgNDE0ID09PSBzY3JlZW5IZWlnaHQpIC8vIFhTIE1heCwgWFIgbGFuZHNjYXBlXG4gICAgICAgICkge1xuICAgICAgICAgICAgaW5mby5pcGhvbmVYID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXBhZCkge1xuICAgICAgICBpbmZvLm9zVmVyc2lvbiA9IGlwYWRbMl0ucmVwbGFjZSgvXy9nLCAnLicpO1xuICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIGluZm8uaXBhZCA9IHRydWU7XG4gICAgfVxuICAgIGlmIChpcG9kKSB7XG4gICAgICAgIGluZm8ub3NWZXJzaW9uID0gaXBvZFszXSA/IGlwb2RbM10ucmVwbGFjZSgvXy9nLCAnLicpIDogbnVsbDtcbiAgICAgICAgaW5mby5waG9uZSA9IHRydWU7XG4gICAgICAgIGluZm8uaXBvZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gRGVza3RvcFxuICAgIGluZm8uZGVza3RvcCA9ICFzdXBwb3J0T3JpZW50YXRpb24odWEpO1xuICAgIGlmIChpbmZvLmRlc2t0b3ApIHtcbiAgICAgICAgaW5mby5lbGVjdHJvbiA9IGVsZWN0cm9uO1xuICAgICAgICBpbmZvLm1hY29zICAgID0gbWFjb3M7XG4gICAgICAgIGluZm8ud2luZG93cyAgPSB3aW5kb3dzO1xuICAgICAgICBpbmZvLm1hY29zICYmIChpbmZvLm9zID0gJ21hY29zJyk7XG4gICAgICAgIGluZm8ud2luZG93cyAmJiAoaW5mby5vcyA9ICd3aW5kb3dzJyk7XG4gICAgfVxuXG4gICAgLy8gTW9iaWxlXG4gICAgaW5mby5tb2JpbGUgPSAhaW5mby5kZXNrdG9wO1xuICAgIGlmIChpbmZvLm1vYmlsZSAmJiAhaW5mby5waG9uZSAmJiAhaW5mby50YWJsZXQpIHtcbiAgICAgICAgaWYgKG1heWJlVGFibGV0KHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpKSB7XG4gICAgICAgICAgICBpbmZvLnRhYmxldCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmZvLnBob25lID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFBpeGVsIFJhdGlvXG4gICAgaW5mby5waXhlbFJhdGlvID0gcGl4ZWxSYXRpbyB8fCAxO1xuXG4gICAgcmV0dXJuIGluZm87XG59O1xuXG4vKipcbiAqIEBlbiBQbGF0Zm9ybSBpbmZvcm1hdGlvbiBvbiBydW50aW1lLlxuICogQGphIOODqeODs+OCv+OCpOODoOOBruODl+ODqeODg+ODiOODleOCqeODvOODoOaDheWgsVxuICovXG5leHBvcnQgY29uc3QgcGxhdGZvcm0gPSBxdWVyeVBsYXRmb3JtKCk7XG4iXSwibmFtZXMiOlsibmF2aWdhdG9yIiwic2FmZSIsInNjcmVlbiIsImRldmljZVBpeGVsUmF0aW8iLCJnbG9iYWxDb250ZXh0IiwiZ2V0R2xvYmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUVBO0lBQ0EsaUJBQWlCLE1BQU1BLFdBQVMsR0FBVUMsY0FBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyRSxpQkFBaUIsTUFBTUMsUUFBTSxHQUFhRCxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xFLGlCQUFpQixNQUFNRSxrQkFBZ0IsR0FBR0YsY0FBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBRTVFLGlCQUF3QixNQUFNLE9BQU8sR0FBRyxhQUFFRCxXQUFTLFVBQUVFLFFBQU0sb0JBQUVDLGtCQUFnQixFQUFFOztJQ0ovRTtJQUNBLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFFLEdBQUdDLE9BQWEsQ0FBQztJQXFFOUQ7SUFFQTtJQUNBLE1BQU0sV0FBVyxHQUFHLENBQUMsS0FBYSxFQUFFLE1BQWMsS0FBYTtRQUMzRCxRQUFRLEdBQThCLHFDQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxFQUFFO0lBQ25FLENBQUMsQ0FBQztJQUVGO0lBQ0EsTUFBTSxZQUFZLEdBQUcsTUFBYztJQUMvQixJQUFBLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsR0FBRyxDQUFDLE1BQU0sY0FBYyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDaEYsQ0FBQyxDQUFDO0lBRUY7Ozs7SUFJRztJQUNILE1B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