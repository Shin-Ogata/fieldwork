import { i18n } from '@cdp/extension-i18n';
import { PlainObject } from '@cdp/core-utils';
import {
    dom as $,
    DOM,
    DOMSelector,
    DOMResult,
} from '@cdp/dom';
import './module-extends';

/** @internal extends [[DOM]] instance method */
function extend(domOptions: Required<i18n.DomLocalizerOptions>, i18next: i18n.i18n): void {
    const {
        selectorAttr,
        targetAttr,
        optionsAttr,
        useOptionsAttr,
        parseDefaultValueFromContent,
        customTagName,
    } = domOptions;

    const parse = ($el: DOM, key: string, opts: i18n.TOptions): void => {
        if (0 === key.length) {
            return;
        }

        let attr = 'text';

        if (key.startsWith('[')) {
            const parts = key.split(']');
            key  = parts[1];
            attr = parts[0].substr(1, parts[0].length - 1);
        }

        if (key.indexOf(';') === key.length - 1) {
            key = key.substr(0, key.length - 2);
        }

        const extendDefault = (o: PlainObject, val: string): PlainObject => {
            if (!parseDefaultValueFromContent) {
                return o;
            }
            return { ...o, ...{ defaultValue: val } };
        };

        // [prepend]/[append] helper
        const insert = (method: 'prepend' | 'append'): void => {
            const translated = i18next.t(key, extendDefault(opts, $el.html()));
            if (false === customTagName) {
                $el[method](translated);
            } else {
                const translatedWithWrap = `<${customTagName}>${translated}</${customTagName}>`;
                const $firstChild = $($el[0].firstElementChild) as DOM;
                if ($firstChild.is(customTagName)) {
                    $firstChild.replaceWith(translatedWithWrap);
                } else {
                    $el[method](translatedWithWrap);
                }
            }
        };

        if ('html' === attr) {
            $el.html(i18next.t(key, extendDefault(opts, $el.html())));
        } else if ('text' === attr) {
            $el.text(i18next.t(key, extendDefault(opts, $el.text())) as string); // eslint-disable-line
        } else if ('prepend' === attr) {
            insert('prepend');
        } else if ('append' === attr) {
            insert('append');
        } else if (attr.startsWith('data-')) {
            const dataAttr = attr.substr(('data-').length);
            const translated = i18next.t(key, extendDefault(opts, $el.data(dataAttr) as string));
            // we change into the data cache
            $el.data(dataAttr, translated);
            // we change into the dom
            $el.attr(attr, translated);
        } else {
            $el.attr(attr, i18next.t(key, extendDefault(opts, $el.attr(attr) as string)) as string); // eslint-disable-line
        }
    };

    const localize = ($el: DOM, opts: i18n.TOptions): void => {
        let key = $el.attr(selectorAttr);
        if (!key && 'undefined' !== typeof key) {
            key = $el.text() || $el.val();
        }
        if (!key) {
            return;
        }

        let target = $el;
        const targetSelector = $el.data(targetAttr) as string;

        if (targetSelector) {
            target = $el.find(targetSelector) || $el;
        }

        if (!opts && true === useOptionsAttr) {
            opts = $el.data(optionsAttr) as object;
        }

        opts = opts || {};

        if (key.includes(';')) {
            for (const k of key.split(';')) {
                // .trim(): Trim the comma-separated parameters on the data-i18n attribute.
                if ('' !== k) {
                    parse(target, k.trim(), opts);
                }
            }
        } else {
            parse(target, key, opts);
        }

        if (true === useOptionsAttr) {
            const clone = { ...opts };
            delete clone.lng;
            $el.data(optionsAttr, clone);
        }
    };

    function handle(this: DOM, opts: i18n.TOptions): DOM {
        // eslint-disable-next-line no-invalid-this
        return this.each((index: number, el: HTMLElement) => {
            const $el = $(el);
            // localize element itself
            localize($el, opts);
            // localize children
            const $children = $el.find(`[${selectorAttr}]`);
            $children.each((index: number, el: HTMLElement) => {
                localize($(el), opts);
            });
        });
    }

    // selector function $(mySelector).localize(opts);
    $.fn['localize'] = handle;
}

/**
 * @en `i18next` DOM localizer built-in plugin factory.
 * @ja `i18next` DOM ローカライズビルトインプラグインファクトリーメソッド
 *
 * @internal
 */
export function DomLocalizer(domOptions?: i18n.DomLocalizerOptions): i18n.ThirdPartyModule {
    return {
        type: '3rdParty',
        init: extend.bind(
            null,
            Object.assign({
                selectorAttr: 'data-i18n',
                targetAttr: 'i18n-target',
                optionsAttr: 'i18n-options',
                useOptionsAttr: false,
                parseDefaultValueFromContent: true,
                customTagName: 'cdp-i18n',
            }, domOptions)
        ),
    };
}

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
export function localize<T extends string | Node>(selector: DOMSelector<T>, options?: i18n.TOptions): DOMResult<T> {
    return $(selector).localize(options) as DOMResult<T>;
}
