/*!
 * @cdp/i18n 0.9.0
 *   internationalization module
 */

import { i18n } from '@cdp/extension-i18n';
export * from '@cdp/extension-i18n';
import { safe, isFunction } from '@cdp/core-utils';
import { toResult, RESULT_CODE } from '@cdp/result';
import { request } from '@cdp/ajax';
import { toUrl } from '@cdp/environment';

/** @internal */
const _navigator = safe(globalThis.navigator);

/* eslint-disable
   @typescript-eslint/no-non-null-assertion
 */
//__________________________________________________________________________________________________//
/**
 * @en The class a simple `i18next` backend built-in plugin. It will load resources from a backend server using the `fetch` API.
 * @ja `fetch` API を用いた `i18next` backend ビルトインプラグインクラス
 *
 * @internal
 */
class AjaxBackend {
    constructor() {
        this.type = 'backend';
        this._options = {};
        this._fallbackMap = {};
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: i18n.BackendModule<AjaxBackendOptions>
    init(services, options, initOptions) {
        this._services = services;
        this._options = Object.assign({ loadPath: "res/locales/{{ns}}.{{lng}}.json" /* LOAD_PATH */ }, this._options, options);
        this._fallbackMap = Object.assign(this._fallbackMap, initOptions.fallbackResources);
    }
    read(language, namespace, callback) {
        const lng = this._fallbackMap[language] || language;
        const loadPath = isFunction(this._options.loadPath) ? this._options.loadPath([lng], [namespace]) : this._options.loadPath;
        const url = this.resolveUrl(loadPath, { lng, ns: namespace });
        this.loadUrl(url, callback);
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    resolveUrl(loadPath, data) {
        return toUrl(this._services.interpolator.interpolate(loadPath, data, undefined, undefined));
    }
    loadUrl(url, callback) {
        (async () => {
            try {
                const json = await request.json(url, undefined, this._options);
                callback(null, json);
            }
            catch (e) {
                const result = toResult(e);
                const msg = `failed loading: ${url}, ${result.message}`;
                if (RESULT_CODE.ERROR_AJAX_RESPONSE === result.code && result.cause) {
                    const status = result.cause.status;
                    if (500 <= status && status < 600) {
                        return callback(msg, true); // retry
                    }
                    else if (400 <= status && status < 500) {
                        return callback(msg, false); // no retry
                    }
                }
                callback(msg, false);
            }
        })();
    }
}
AjaxBackend.type = 'backend';

/**
 * @en Translate funcion.
 * @ja 翻訳関数
 */
const t = i18n.t.bind(i18n);
/**
 * @en Initialize `i18next` instance.
 * @ja `i18next` インスタンスの初期化
 *
 * @param options
 *  - `en` init options
 *  - `ja` 初期化オプションを指定
 */
const initializeI18N = (options) => {
    const opts = Object.assign({}, options);
    const { namespace, resourcePath: loadPath } = opts;
    if (!opts.lng) {
        opts.lng = _navigator.language;
    }
    if (namespace) {
        !opts.ns && (opts.ns = namespace);
        !opts.defaultNS && (opts.defaultNS = namespace);
    }
    if (loadPath) {
        opts.backend = Object.assign({ loadPath }, opts.backend);
    }
    if (opts.backend) {
        i18n.use(AjaxBackend);
    }
    return i18n.init(opts);
};

export { initializeI18N, t };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5tanMiLCJzb3VyY2VzIjpbInNzci50cyIsInBsdWdpbi9hamF4LWJhY2tlbmQudHMiLCJjb3JlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNhZmUgfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuXG4vKiogQGludGVybmFsICovXG5jb25zdCBfbmF2aWdhdG9yID0gc2FmZShnbG9iYWxUaGlzLm5hdmlnYXRvcik7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCB7XG4gICAgX25hdmlnYXRvciBhcyBuYXZpZ2F0b3IsXG59O1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAqL1xuXG5pbXBvcnQgeyBpMThuIH0gZnJvbSAnQGNkcC9leHRlbnNpb24taTE4bic7XG5pbXBvcnQgeyBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFJFU1VMVF9DT0RFLCB0b1Jlc3VsdCB9IGZyb20gJ0BjZHAvcmVzdWx0JztcbmltcG9ydCB7IHJlcXVlc3QgfSBmcm9tICdAY2RwL2FqYXgnO1xuaW1wb3J0IHsgdG9VcmwgfSBmcm9tICdAY2RwL2Vudmlyb25tZW50JztcbmltcG9ydCB7IEkxOE5PcHRpb25zIH0gZnJvbSAnLi4vaW50ZXJmYWNlcyc7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmNvbnN0IGVudW0gRGVmYXVsdCB7XG4gICAgTE9BRF9QQVRIID0gJ3Jlcy9sb2NhbGVzL3t7bnN9fS57e2xuZ319Lmpzb24nLFxufVxuXG4vKiogQGludGVybmFsICovXG50eXBlIEZhbGxiYWNrUmVzb3VyY2VNYXAgPSB7IFtsbmc6IHN0cmluZ106IHN0cmluZzsgfTtcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFRoZSBjbGFzcyBhIHNpbXBsZSBgaTE4bmV4dGAgYmFja2VuZCBidWlsdC1pbiBwbHVnaW4uIEl0IHdpbGwgbG9hZCByZXNvdXJjZXMgZnJvbSBhIGJhY2tlbmQgc2VydmVyIHVzaW5nIHRoZSBgZmV0Y2hgIEFQSS5cbiAqIEBqYSBgZmV0Y2hgIEFQSSDjgpLnlKjjgYTjgZ8gYGkxOG5leHRgIGJhY2tlbmQg44OT44Or44OI44Kk44Oz44OX44Op44Kw44Kk44Oz44Kv44Op44K5XG4gKlxuICogQGludGVybmFsXG4gKi9cbmV4cG9ydCBjbGFzcyBBamF4QmFja2VuZCBpbXBsZW1lbnRzIGkxOG4uQmFja2VuZE1vZHVsZTxpMThuLkFqYXhCYWNrZW5kT3B0aW9ucz4ge1xuICAgIHJlYWRvbmx5IHR5cGUgPSAnYmFja2VuZCc7XG4gICAgc3RhdGljIHR5cGUgPSAnYmFja2VuZCc7XG4gICAgcHJpdmF0ZSBfc2VydmljZXMhOiBpMThuLlNlcnZpY2VzO1xuICAgIHByaXZhdGUgX29wdGlvbnM6IGkxOG4uQWpheEJhY2tlbmRPcHRpb25zID0ge307XG4gICAgcHJpdmF0ZSBfZmFsbGJhY2tNYXA6IEZhbGxiYWNrUmVzb3VyY2VNYXAgPSB7fTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IGkxOG4uQmFja2VuZE1vZHVsZTxBamF4QmFja2VuZE9wdGlvbnM+XG5cbiAgICBpbml0KHNlcnZpY2VzOiBpMThuLlNlcnZpY2VzLCBvcHRpb25zOiBpMThuLkFqYXhCYWNrZW5kT3B0aW9ucywgaW5pdE9wdGlvbnM6IEkxOE5PcHRpb25zKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX3NlcnZpY2VzID0gc2VydmljZXM7XG4gICAgICAgIHRoaXMuX29wdGlvbnMgPSBPYmplY3QuYXNzaWduKHsgbG9hZFBhdGg6IERlZmF1bHQuTE9BRF9QQVRIIH0sIHRoaXMuX29wdGlvbnMsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9mYWxsYmFja01hcCA9IE9iamVjdC5hc3NpZ24odGhpcy5fZmFsbGJhY2tNYXAsIGluaXRPcHRpb25zLmZhbGxiYWNrUmVzb3VyY2VzKTtcbiAgICB9XG5cbiAgICByZWFkKGxhbmd1YWdlOiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nLCBjYWxsYmFjazogaTE4bi5SZWFkQ2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbG5nID0gdGhpcy5fZmFsbGJhY2tNYXBbbGFuZ3VhZ2VdIHx8IGxhbmd1YWdlO1xuICAgICAgICBjb25zdCBsb2FkUGF0aCA9IGlzRnVuY3Rpb24odGhpcy5fb3B0aW9ucy5sb2FkUGF0aCkgPyB0aGlzLl9vcHRpb25zLmxvYWRQYXRoKFtsbmddLCBbbmFtZXNwYWNlXSkgOiB0aGlzLl9vcHRpb25zLmxvYWRQYXRoO1xuICAgICAgICBjb25zdCB1cmwgPSB0aGlzLnJlc29sdmVVcmwobG9hZFBhdGggYXMgc3RyaW5nLCB7IGxuZywgbnM6IG5hbWVzcGFjZSB9KTtcbiAgICAgICAgdGhpcy5sb2FkVXJsKHVybCwgY2FsbGJhY2spO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHByaXZhdGUgbWV0aG9kczpcblxuICAgIHByaXZhdGUgcmVzb2x2ZVVybChsb2FkUGF0aDogc3RyaW5nLCBkYXRhOiB7IGxuZzogc3RyaW5nOyBuczogc3RyaW5nOyB9KTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRvVXJsKHRoaXMuX3NlcnZpY2VzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShsb2FkUGF0aCwgZGF0YSwgdW5kZWZpbmVkISwgdW5kZWZpbmVkISkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9hZFVybCh1cmw6IHN0cmluZywgY2FsbGJhY2s6IChlcnI6IGkxOG4uQ2FsbGJhY2tFcnJvciB8IHN0cmluZywgZGF0YTogaTE4bi5SZXNvdXJjZUtleSB8IGJvb2xlYW4pID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QganNvbiA9IGF3YWl0IHJlcXVlc3QuanNvbih1cmwsIHVuZGVmaW5lZCwgdGhpcy5fb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwganNvbik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdG9SZXN1bHQoZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbXNnID0gYGZhaWxlZCBsb2FkaW5nOiAke3VybH0sICR7cmVzdWx0Lm1lc3NhZ2V9YDtcbiAgICAgICAgICAgICAgICBpZiAoUkVTVUxUX0NPREUuRVJST1JfQUpBWF9SRVNQT05TRSA9PT0gcmVzdWx0LmNvZGUgJiYgcmVzdWx0LmNhdXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1czogbnVtYmVyID0gcmVzdWx0LmNhdXNlLnN0YXR1cztcbiAgICAgICAgICAgICAgICAgICAgaWYgKDUwMCA8PSBzdGF0dXMgJiYgc3RhdHVzIDwgNjAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobXNnLCB0cnVlKTsgIC8vIHJldHJ5XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoNDAwIDw9IHN0YXR1cyAmJiBzdGF0dXMgPCA1MDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtc2csIGZhbHNlKTsgLy8gbm8gcmV0cnlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhtc2csIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkoKTtcbiAgICB9XG59XG4iLCJleHBvcnQgKiBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IGkxOG4gfSBmcm9tICdAY2RwL2V4dGVuc2lvbi1pMThuJztcbmltcG9ydCB7IEkxOE5PcHRpb25zIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IG5hdmlnYXRvciB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IEFqYXhCYWNrZW5kIH0gZnJvbSAnLi9wbHVnaW4nO1xuXG4vKipcbiAqIEBlbiBUcmFuc2xhdGUgZnVuY2lvbi5cbiAqIEBqYSDnv7voqLPplqLmlbBcbiAqL1xuZXhwb3J0IGNvbnN0IHQ6IGkxOG4uVEZ1bmN0aW9uID0gaTE4bi50LmJpbmQoaTE4bik7XG5cbi8qKlxuICogQGVuIEluaXRpYWxpemUgYGkxOG5leHRgIGluc3RhbmNlLlxuICogQGphIGBpMThuZXh0YCDjgqTjg7Pjgrnjgr/jg7Pjgrnjga7liJ3mnJ/ljJZcbiAqXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBpbml0IG9wdGlvbnNcbiAqICAtIGBqYWAg5Yid5pyf5YyW44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gKi9cbmV4cG9ydCBjb25zdCBpbml0aWFsaXplSTE4TiA9IChvcHRpb25zPzogSTE4Tk9wdGlvbnMpOiBQcm9taXNlPGkxOG4uVEZ1bmN0aW9uPiA9PiB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgeyBuYW1lc3BhY2UsIHJlc291cmNlUGF0aDogbG9hZFBhdGggfSA9IG9wdHM7XG5cbiAgICBpZiAoIW9wdHMubG5nKSB7XG4gICAgICAgIG9wdHMubG5nID0gbmF2aWdhdG9yLmxhbmd1YWdlO1xuICAgIH1cblxuICAgIGlmIChuYW1lc3BhY2UpIHtcbiAgICAgICAgIW9wdHMubnMgJiYgKG9wdHMubnMgPSBuYW1lc3BhY2UpO1xuICAgICAgICAhb3B0cy5kZWZhdWx0TlMgJiYgKG9wdHMuZGVmYXVsdE5TID0gbmFtZXNwYWNlKTtcbiAgICB9XG5cbiAgICBpZiAobG9hZFBhdGgpIHtcbiAgICAgICAgb3B0cy5iYWNrZW5kID0gT2JqZWN0LmFzc2lnbih7IGxvYWRQYXRoIH0sIG9wdHMuYmFja2VuZCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdHMuYmFja2VuZCkge1xuICAgICAgICBpMThuLnVzZShBamF4QmFja2VuZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGkxOG4uaW5pdChvcHRzKTtcbn07XG4iXSwibmFtZXMiOlsibmF2aWdhdG9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFFQTtBQUNBLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDOztBQ0g3Qzs7O0FBS0EsQUFjQTtBQUVBOzs7Ozs7QUFNQSxNQUFhLFdBQVc7SUFBeEI7UUFDYSxTQUFJLEdBQUcsU0FBUyxDQUFDO1FBR2xCLGFBQVEsR0FBNEIsRUFBRSxDQUFDO1FBQ3ZDLGlCQUFZLEdBQXdCLEVBQUUsQ0FBQztLQTZDbEQ7OztJQXhDRyxJQUFJLENBQUMsUUFBdUIsRUFBRSxPQUFnQyxFQUFFLFdBQXdCO1FBQ3BGLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEscURBQXFCLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2RixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQztLQUN2RjtJQUVELElBQUksQ0FBQyxRQUFnQixFQUFFLFNBQWlCLEVBQUUsUUFBMkI7UUFDakUsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUM7UUFDcEQsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxD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
