import type { i18n } from '@cdp/extension-i18n';
import { isFunction } from '@cdp/core-utils';
import { RESULT_CODE, toResult } from '@cdp/result';
import { request } from '@cdp/ajax';
import { toUrl } from '@cdp/web-utils';
import type { I18NOptions } from '../interfaces';

/** @internal */
const enum Default {
    LOAD_PATH = 'res/locales/{{ns}}.{{lng}}.json',
}

/** @internal */ type FallbackResourceMap = Record<string, string>;

//__________________________________________________________________________________________________//

/**
 * @en The class a simple `i18next` backend built-in plugin. It will load resources from a backend server using the `fetch` API.
 * @ja `fetch` API を用いた `i18next` backend ビルトインプラグインクラス
 *
 * @internal
 */
export class AjaxBackend implements i18n.BackendModule<i18n.AjaxBackendOptions> {
    readonly type = 'backend';
    static type = 'backend';
    private _services!: i18n.Services;
    private _options: i18n.AjaxBackendOptions = {};
    private _fallbackMap: FallbackResourceMap = {};

///////////////////////////////////////////////////////////////////////
// implements: i18n.BackendModule<AjaxBackendOptions>

    init(services: i18n.Services, options: i18n.AjaxBackendOptions, initOptions: I18NOptions): void {
        this._services = services;
        this._options = Object.assign({ loadPath: Default.LOAD_PATH }, this._options, options);
        this._fallbackMap = Object.assign(this._fallbackMap, initOptions.fallbackResources);
    }

    read(language: string, namespace: string, callback: i18n.ReadCallback): void {
        const lng = this._fallbackMap[language] || language;
        const loadPath = isFunction(this._options.loadPath) ? this._options.loadPath([lng], [namespace]) : this._options.loadPath;
        const url = this.resolveUrl(loadPath!, { lng, ns: namespace });
        this.loadUrl(url, callback);
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    private resolveUrl(loadPath: string, data: { lng: string; ns: string; }): string {
        return toUrl(this._services.interpolator.interpolate(loadPath, data, undefined!, undefined!));
    }

    private loadUrl(url: string, callback: (err: i18n.CallbackError | string, data: i18n.ResourceKey | boolean) => void): void {
        void (async () => {
            try {
                const json = await request.json(url, this._options);
                callback(null, json);
            } catch (e) {
                const result = toResult(e);
                const msg = `failed loading: ${url}, ${result.message}`;
                if (RESULT_CODE.ERROR_AJAX_RESPONSE === result.code && result.cause) {
                    const { status } = result.cause as { status: number; };
                    if (500 <= status && status < 600) {
                        return callback(msg, true);  // retry
                    } else if (400 <= status && status < 500) {
                        return callback(msg, false); // no retry
                    }
                }
                callback(msg, false);
            }
        })();
    }
}
