import { result } from '@cdp/core-utils';
import { SyncContext } from './interfaces';

/** @internal resolve lack property */
export function resolveURL(context: SyncContext): string {
    return result(context, 'url');
}
