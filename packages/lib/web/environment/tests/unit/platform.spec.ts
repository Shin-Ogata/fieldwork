/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import { has, noop } from '@cdp/core-utils';
import { queryPlatform, platform } from '@cdp/environment';

describe('platform spec', () => {

    const rollback = {
        orientation: false,
        ontouchstart: false,
    };

    const ensureOrientation = (): void => {
        if (!has(globalThis, 'orientation')) {
            globalThis['orientation'] = 'portrait' as any;
            rollback.orientation = true;
        }
    };

    const ensureOnToucStart = (): void => {
        if (!has(globalThis, 'ontouchstart')) {
            globalThis['ontouchstart'] = noop;
            rollback.ontouchstart = true;
        }
    };

    beforeEach(() => {
        rollback.orientation = false;
        rollback.ontouchstart = false;
    });

    afterEach(() => {
        if (rollback.orientation) {
            /*
             * @deprecated
             *  globalThis.orientation は window.screen.orientation に変わる予定. ただし2020/08 時点でモバイルサポートはなし
             *    https://developer.mozilla.org/en-US/docs/Web/API/Window/orientation
             *    https://developer.mozilla.org/ja/docs/Web/API/Screen/orientation
             *    https://caniuse.com/#search=screen
             */
            delete (globalThis as { orientation?: string | number; })['orientation'];
            rollback.orientation = false;
        }
        if (rollback.ontouchstart) {
            delete globalThis['ontouchstart'];
            rollback.ontouchstart = false;
        }
    });

    it('check instance', () => {
        expect(queryPlatform).toBeDefined();
        expect(platform).toBeDefined();
        expect(platform.android).toBeDefined();
        expect(platform.androidChrome).toBeDefined();
        expect(platform.cordova).toBeDefined();
        expect(platform.desktop).toBeDefined();
        expect(platform.edge).toBeDefined();
        expect(platform.electron).toBeDefined();
        expect(platform.firefox).toBeDefined();
        expect(platform.ie).toBeDefined();
        expect(platform.ios).toBeDefined();
        expect(platform.ipad).toBeDefined();
        expect(platform.iphone).toBeDefined();
        expect(platform.iphoneX).toBeDefined();
        expect(platform.ipod).toBeDefined();
        expect(platform.macos).toBeDefined();
        expect(platform.mobile).toBeDefined();
        expect(platform.os).toBeDefined();
        expect(platform.pixelRatio).toBeDefined();
        expect(platform.windows).toBeDefined();
    });

    it('check Android device', () => {
        ensureOrientation();

        const phone = {
            navigator: {
                userAgent: 'Mozilla/5.0 (Linux; Android 4.0.3; SC-02C Build/IML74K) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.58 Mobile Safari/537.31',
                platform: 'Linux armv8l',
            },
            screen: {
                width: 480,
                height: 960,
            },
            devicePixelRatio: 3,
        };

        let info = queryPlatform(phone);

        expect(info.ios).toBe(false);
        expect(info.android).toBe(true);
        expect(info.androidChrome).toBe(true);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(true);
        expect(info.tablet).toBe(false);
        expect(info.iphone).toBe(false);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);

        const tablet = {
            navigator: {
                userAgent: 'Mozilla/5.0 (Linux; U; Android 4.0.3; ja-jp; SC-02C Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30',
                platform: 'Linux armv8l',
            },
            screen: {
                width: 1024,
                height: 768,
            },
            devicePixelRatio: 3,
        };

        info = queryPlatform(tablet);

        expect(info.ios).toBe(false);
        expect(info.android).toBe(true);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(false);
        expect(info.tablet).toBe(true);
        expect(info.iphone).toBe(false);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);
    });

    it('check iPhone device', () => {
        ensureOrientation();
        ensureOnToucStart();

        const iPhone = {
            navigator: {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1',
                platform: 'iPhone',
            },
            screen: {
                width: 375,
                height: 667,
            },
            devicePixelRatio: 3,
        };

        let info = queryPlatform(iPhone);

        expect(info.ios).toBe(true);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(true);
        expect(info.tablet).toBe(false);
        expect(info.iphone).toBe(true);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);

        const iPhoneX = {
            navigator: {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1',
                platform: 'iPhone',
            },
            screen: {
                width: 896,
                height: 414,
            },
            devicePixelRatio: 3,
        };

        info = queryPlatform(iPhoneX);

        expect(info.ios).toBe(true);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(true);
        expect(info.tablet).toBe(false);
        expect(info.iphone).toBe(true);
        expect(info.iphoneX).toBe(true);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);

        info = queryPlatform(Object.assign({}, iPhoneX, { screen: { width: 375, height: 812 } }));
        expect(info.iphoneX).toBe(true);
        info = queryPlatform(Object.assign({}, iPhoneX, { screen: { width: 812, height: 375 } }));
        expect(info.iphoneX).toBe(true);
        info = queryPlatform(Object.assign({}, iPhoneX, { screen: { width: 414, height: 896 } }));
        expect(info.iphoneX).toBe(true);

        const iPhoneXDesktop = {
            navigator: {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15',
                platform: 'MacIntel',
                standalone: false,
            },
            screen: {
                width: 812,
                height: 375,
            },
            devicePixelRatio: 3,
        };

        info = queryPlatform(iPhoneXDesktop);

        expect(info.ios).toBe(true);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(true);
        expect(info.tablet).toBe(false);
        expect(info.iphone).toBe(true);
        expect(info.iphoneX).toBe(true);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);
    });

    it('check iPod device', () => {
        ensureOrientation();

        const iPod = {
            navigator: {
                userAgent: 'Mozilla/5.0 (iPod Touch; CPU iPod OS 13_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1',
                platform: 'iPhone',
            },
            screen: {
                width: 320,
                height: 568,
            },
            devicePixelRatio: 3,
        };

        let info = queryPlatform(iPod);

        expect(info.ios).toBe(true);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(true);  // because form factor
        expect(info.tablet).toBe(false);
        expect(info.iphone).toBe(false);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(true);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);

        info = queryPlatform(Object.assign({}, iPod, {
            navigator: {
                userAgent: 'iPod Touch user agent string Mozila/5.0 (iPod; U; CPU like Mac OS X; en) AppleWebKit/420.1 (KHTML, like Geckto) Version/3.0 Mobile/3A101a Safari/419.3',
            },
        }));
        expect(info.ipod).toBe(true);
    });

    it('check iPad device', () => {
        ensureOrientation();
        ensureOnToucStart();

        const iPad = {
            navigator: {
                userAgent: 'Mozilla/5.0 (iPad; CPU OS 13_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Mobile/15E148 Safari/604.1',
                platform: 'iPhone',
            },
            screen: {
                width: 1024,
                height: 768,
            },
            devicePixelRatio: 3,
        };

        let info = queryPlatform(iPad);

        expect(info.ios).toBe(true);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(false);
        expect(info.tablet).toBe(true);
        expect(info.iphone).toBe(false);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(true);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);

        const iPadDesktop = {
            navigator: {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Safari/605.1.15',
                platform: 'MacIntel',
                standalone: false,
            },
            screen: {
                width: 1024,
                height: 1366,
            },
            devicePixelRatio: 3,
        };

        info = queryPlatform(iPadDesktop);

        expect(info.ios).toBe(true);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(false);
        expect(info.tablet).toBe(true);
        expect(info.iphone).toBe(false);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(true);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);
    });

    it('check other device (for coverage)', () => {
        const Firefox = {
            navigator: {
                userAgent: 'Mozilla/5.0 (Windows NT x.y; Win64; x64; rv:10.0) Gecko/20100101 Firefox/10.0',
                platform: 'Win32',
            },
            screen: {
                width: 1024,
                height: 768,
            },
            devicePixelRatio: 3,
        };

        let info = queryPlatform(Firefox);

        expect(info.ios).toBe(false);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(true);
        expect(info.mobile).toBe(false);
        expect(info.phone).toBe(false);
        expect(info.tablet).toBe(false);
        expect(info.iphone).toBe(false);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(true);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(true);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);

        const Mac = {
            navigator: {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Safari/605.1.15',
                platform: 'MacIntel',
            },
            screen: {
                width: 1024,
                height: 768,
            },
            devicePixelRatio: 3,
        };

        info = queryPlatform(Mac);

        expect(info.ios).toBe(false);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(true);
        expect(info.mobile).toBe(false);
        expect(info.phone).toBe(false);
        expect(info.tablet).toBe(false);
        expect(info.iphone).toBe(false);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(false);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(true);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);

        const WindowsPhone = {
            navigator: {
                userAgent: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0; FujitsuToshibaMobileCommun; IS12T; KDDI',
                platform: 'Win32',
            },
            screen: {
                width: 320,
                height: 568,
            },
            devicePixelRatio: 3,
        };

        info = queryPlatform(WindowsPhone);

        expect(info.ios).toBe(false);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(true);
        expect(info.tablet).toBe(false);
        expect(info.iphone).toBe(false);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(true);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);

        const WindowsTablet = {
            navigator: {
                userAgent: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0; FujitsuToshibaMobileCommun; IS12T; KDDI',
                platform: 'Win32',
            },
            screen: {
                width: 1024,
                height: 768,
            },
            devicePixelRatio: 3,
        };

        info = queryPlatform(WindowsTablet);

        expect(info.ios).toBe(false);
        expect(info.android).toBe(false);
        expect(info.androidChrome).toBe(false);
        expect(info.desktop).toBe(false);
        expect(info.mobile).toBe(true);
        expect(info.phone).toBe(false);
        expect(info.tablet).toBe(true);
        expect(info.iphone).toBe(false);
        expect(info.iphoneX).toBe(false);
        expect(info.ipod).toBe(false);
        expect(info.ipad).toBe(false);
        expect(info.edge).toBe(false);
        expect(info.ie).toBe(true);
        expect(info.firefox).toBe(false);
        expect(info.macos).toBe(false);
        expect(info.windows).toBe(false);
        expect(info.cordova).toBe(false);
        expect(info.electron).toBe(false);
    });

    it('check lack devicePixelRatio case', () => {
        const info = queryPlatform({ devicePixelRatio: undefined });
        expect(info.pixelRatio).toBe(1);
    });
});
