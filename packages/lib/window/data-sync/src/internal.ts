import { result } from '@cdp/core-utils';
import { SyncContext } from './interfaces';

/** resolve lack property */
export function resolveURL(context: SyncContext): string {
    return result(context, 'url');
}
