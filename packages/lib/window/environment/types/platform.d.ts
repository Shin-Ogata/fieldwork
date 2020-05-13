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
/**
 * @en Query platform information.
 * @ja プラットフォーム情報の取得
 *
 * @param context
 *  - `en` given `Navigator`, `Screen`, `devicePixelRatio` information.
 *  - `ja` 環境の `Navigator`, `Screen`, `devicePixelRatio` を指定
 */
export declare const queryPlatform: (context?: {
    navigator?: {
        userAgent: string;
        platform: string;
        standalone?: boolean | undefined;
    } | undefined;
    screen?: {
        width: number;
        height: number;
    } | undefined;
    devicePixelRatio?: number | undefined;
} | undefined) => Platform;
/**
 * @en Platform information on runtime.
 * @ja ランタイムのプラットフォーム情報
 */
export declare const platform: Platform;
