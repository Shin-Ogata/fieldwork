/* eslint-disable
    space-in-parens
 ,  @typescript-eslint/no-explicit-any
 */

import { Writable, getGlobal } from '@cdp/core-utils';
import {
    navigator,
    screen,
    devicePixelRatio,
} from './ssr';

const enum Threshold {
    TABLET_MIN_WIDTH = 600, // fallback detection value
}

/**
 * @en Platform information.
 * @ja プラットフォーム情報
 *
 * @see
 *  - https://github.com/framework7io/framework7/blob/master/src/core/utils/info.js
 *  - https://github.com/OnsenUI/OnsenUI/blob/master/core/src/ons/platform.js
 *  - https://www.bit-hive.com/articles/20190820
 */
export interface Platform {
    /** true for iOS info */
    readonly ios: boolean;
    /** true for Android info */
    readonly android: boolean;
    /** true for Android Chrome */
    readonly androidChrome: boolean;
    /** true for desktop browser */
    readonly desktop: boolean;
    /** true for mobile info */
    readonly mobile: boolean;
    /** true for smart phone (including iPod) info */
    readonly phone: boolean;
    /** true for tablet info */
    readonly tablet: boolean;
    /** true for iPhone */
    readonly iphone: boolean;
    /** true for iPhoneX */
    readonly iphoneX: boolean;
    /** true for iPod */
    readonly ipod: boolean;
    /** true for iPad */
    readonly ipad: boolean;
    /** true for MS Edge browser */
    readonly edge: boolean;
    /** true for Internet Explorer browser*/
    readonly ie: boolean;
    /** true for FireFox browser*/
    readonly firefox: boolean;
    /** true for desktop MacOS */
    readonly macos: boolean;
    /** true for desktop Windows */
    readonly windows: boolean;
    /** true when app running in cordova environment */
    readonly cordova: boolean;
    /** true when app running in electron environment */
    readonly electron: boolean;
    /** Contains OS can be ios, android or windows (for Windows Phone) */
    readonly os: string;
    /** Contains OS version, e.g. 11.2.0 */
    readonly osVersion: string | null | undefined;
    /** Device pixel ratio */
    readonly pixelRatio: number;
}

//__________________________________________________________________________________________________//

const maybeTablet = (width: number, height: number): boolean => {
    return (Threshold.TABLET_MIN_WIDTH <= Math.min(width, height));
};

const supportTouch = (): boolean => {
    return !!((navigator.maxTouchPoints > 0) || ('ontouchstart' in globalThis));
};

const supportOrientation = (ua: string): boolean => {
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
export const queryPlatform = (
    context?: {
        navigator?: { userAgent: string; platform: string; standalone?: boolean; };
        screen?: { width: number; height: number; };
        devicePixelRatio?: number;
    }
): Platform => {
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
        cordova: !!(getGlobal() as any).cordova,
        electron: false,
    } as any as Writable<Platform>;

    const { userAgent: ua, platform: os, standalone } = context.navigator || navigator as { userAgent: string; platform: string; standalone?: boolean; };
    const { width: screenWidth, height: screenHeight } = context.screen || screen;
    const pixelRatio = context.devicePixelRatio;

    const android  = /(Android);?[\s/]+([\d.]+)?/.exec(ua);
    let   ipad     = /(iPad).*OS\s([\d_]+)/.exec(ua);
    const ipod     = /(iPod)(.*OS\s([\d_]+))?/.exec(ua);
    let   iphone   = !ipad && /(iPhone\sOS|iOS)\s([\d_]+)/.exec(ua);
    const ie       = 0 <= ua.indexOf('MSIE ') || 0 <= ua.indexOf('Trident/');
    const edge     = 0 <= ua.indexOf('Edge/');
    const firefox  = 0 <= ua.indexOf('Gecko/') && 0 <= ua.indexOf('Firefox/');
    const windows  = 'Win32' === os;
    let   macos    = 'MacIntel' === os;
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
        )
    ) {
        const regex = /(Version)\/([\d.]+)/.exec(ua);
        if (maybeTablet(screenWidth, screenHeight)) {
            ipad = regex;
        } else {
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
        } else {
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
        if (
            (375 === screenWidth && 812 === screenHeight) // X, XS portrait
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
        info.macos    = macos;
        info.windows  = windows;
        info.macos && (info.os = 'macos');
        info.windows && (info.os = 'windows');
    }

    // Mobile
    info.mobile = !info.desktop;
    if (info.mobile && !info.phone && !info.tablet) {
        if (maybeTablet(screenWidth, screenHeight)) {
            info.tablet = true;
        } else {
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
export const platform = queryPlatform();
