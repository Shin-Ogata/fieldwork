import { i18n } from '@cdp/extension-i18n';
import { PlainObject } from '@cdp/core-utils';
import {
    dom as $,
    DOM,
} from '@cdp/dom';
import './module-extends';

/** @internal extends {@link DOM} instance method */
function extend(domOptions: Required<i18n.DomLocalizerOptions>, i18next: i18n.i18n): void {
    const {
        selectorAttr,
        targetAttr,
        optionsAttr,
        useOptionsAttr,
        parseDefaultValueFromContent,
        customTagName,
    } = domOptions;

    const extendDefault = (o: PlainObject, val: string): PlainObject => {
        if (!parseDefaultValueFromContent) {
            return o;
        }
        return { ...o, ...{ defaultValue: val } };
    };

    // [prepend]/[append] helper
    const insert = (method: 'prepend' | 'append', $el: DOM, key: string, opts: i18n.TOptions): void => {
        const translated = i18next.t(key, extendDefault(opts, $el.html()));
        if (false === customTagName) {
            $el[method](translated);
        } else {
            const translatedWithWrap = `<${customTagName}>${translated}</${customTagName}>`;
            const $target = $el.children(customTagName);
            if ($target.length) {
                $target.replaceWith(translatedWithWrap);
            } else {
                $el[method](translatedWithWrap);
            }
        }
    };

    const parse = ($el: DOM, key: string, opts: i18n.TOptions): void => {
        let attr = 'text';

        if (key.startsWith('[')) {
            const parts = key.split(']');
            key  = parts[1].trim();
            attr = parts[0].substring(1, parts[0].length).trim();
        }

        if ('html' === attr) {
            $el.html(i18next.t(key, extendDefault(opts, $el.html())));
        } else if ('text' === attr) {
            $el.text(i18next.t(key, extendDefault(opts, $el.text())));
        } else if ('prepend' === attr) {
            insert('prepend', $el, key, opts);
        } else if ('append' === attr) {
            insert('append', $el, key, opts);
        } else if (attr.startsWith('data-')) {
            const dataAttr = attr.substring(('data-').length);
            const translated = i18next.t(key, extendDefault(opts, $el.data(dataAttr) as string));
            $el.data(dataAttr, translated);
            $el.attr(attr, translated);
        } else {
            $el.attr(attr, i18next.t(key, extendDefault(opts, $el.attr(attr) as string)));
        }
    };

    const localize = ($el: DOM, opts: i18n.TOptions): void => {
        const key = $el.attr(selectorAttr);
        if (!key) {
            return;
        }

        let $target = $el;
        const targetSelector = $el.data(targetAttr) as string;

        if (targetSelector) {
            $target = $el.find(targetSelector);
        }

        if (!opts && true === useOptionsAttr) {
            opts = $el.data(optionsAttr) as i18n.TOptions;
        }

        opts = opts || {};

        for (const part of key.split(';')) {
            const k = part.trim();
            if ('' !== k) {
                parse($target, k, opts);
            }
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
            for (const root of $.utils.rootify(el)) {
                const $el = $(root);
                // localize element itself
                localize($el, opts);
                // localize children
                const $children = $el.find(`[${selectorAttr}]`);
                $children.each((index: number, el: HTMLElement) => {
                    localize($(el), opts);
                });
            }
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
