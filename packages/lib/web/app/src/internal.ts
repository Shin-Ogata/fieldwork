import { getGlobalNamespace, getConfig } from '@cdp/core-utils';
import { i18n } from '@cdp/i18n';

/** @internal */
export const enum CssName {
    PAGE_CURRENT  = 'page-current',
    PAGE_PREVIOUS = 'page-previous',
}

/** @internal partial match class name */
export const hasPartialClassName = <T extends Element>(el: T, className: string): boolean => {
    for (const name of el.classList) {
        if (name.includes(className)) {
            return true;
        }
    }
    return false;
};

//__________________________________________________________________________________________________//

/** @internal force clear i18n settings */
export const clearI18NSettings = (): void => {
    const context: Partial<typeof i18n> = i18n;
    delete context.options;
    delete context.language;
    delete context.languages;
    delete context.isInitialized;
};

/** @internal */
export const getAppConfig = <T extends object>(base: T): T => {
    return Object.assign(
        {},
        getConfig<T>(),                  // CDP.Config
        getGlobalNamespace<T>('Config'), // global Config
        base,
    );
};

/** @internal ensure DOMContentLoaded */
export const waitDomContentLoaded = async (context: Document): Promise<void> => {
    'loading' === context.readyState && await new Promise<unknown>(resolve => {
        context.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
};

/** @internal ensure custom document event ready */
export const waitDocumentEventReady = async (context: Document, event: string | undefined): Promise<void> => {
    null != event && await new Promise<unknown>(resolve => {
        context.addEventListener(event, resolve, { once: true });
    });
};
