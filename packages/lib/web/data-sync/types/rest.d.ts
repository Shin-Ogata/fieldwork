import { AjaxOptions } from '@cdp/ajax';
import type { IDataSync } from './interfaces';
/**
 * @en Options interface for {@link RestDataSync}.
 * @ja {@link RestDataSync} に指定するオプション
 */
export interface RestDataSyncOptions extends AjaxOptions<'json'> {
    url?: string;
}
export declare const dataSyncREST: IDataSync<import("@cdp/core-utils").AnyObject>;
