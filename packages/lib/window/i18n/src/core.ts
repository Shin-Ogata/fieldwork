export * from '@cdp/extension-i18n';
import { i18n } from '@cdp/extension-i18n';
import {
    dom as $,
    DOMSelector,
    DOMResult,
} from '@cdp/dom';
import { I18NOptions } from './interfaces';
import { navigator } from './ssr';
import { AjaxBackend, DomLocalizer } from './plugin';

/**
 * @en Translate funcion.
 * @ja 翻訳関数
 */
export const t: i18n.TFunction = i18n.t.bind(i18n);

/**
 * @en Initialize `i18next` instance.
 * @ja `i18next` インスタンスの初期化
 *
 * @param options
 *  - `en` init options
 *  - `ja` 初期化オプションを指定
 */
export const initializeI18N = (options?: I18NOptions): Promise<i18n.TFunction> => {
    const opts = Object.assign({}, options);

    const { namespace, resourcePath: loadPath, dom } = opts;

    if (!opts.lng) {
        opts.lng = navigator.language;
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

    i18n.use(DomLocalizer(dom));

    return i18n.init(opts);
};

/**
 * @en DOM localizer method.
 * @ja DOM ローカライズ
 *
 * @param selector
 *  - `en` Object(s) or the selector string which becomes origin of [[DOM]].
 *  - `ja` [[DOM]] のもとになるオブジェクト(群)またはセレクタ文字列
 * @param options
 *  - `en` translation options.
 *  - `ja` 翻訳オプション
 */
export const localize = <T extends string | Node>(selector: DOMSelector<T>, options?: i18n.TOptions): DOMResult<T> => {
    return $(selector).localize(options) as DOMResult<T>;
};
