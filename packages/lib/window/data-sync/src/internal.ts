import { isFunction } from '@cdp/core-utils';
import { SyncContext } from './interfaces';

/** resolve lack property */
export function resolveURL(context: SyncContext): string {
    if (isFunction(context['url'])) {
        return context['url']() as string;
    } else {
        return context['url'];
    }
}
