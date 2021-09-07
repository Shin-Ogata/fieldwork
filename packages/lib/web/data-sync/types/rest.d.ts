import { AjaxOptions } from '@cdp/ajax';
import { IDataSync } from './interfaces';
/**
 * @en Options interface for [[RestDataSync]].
 * @ja [[RestDataSync]] に指定するオプション
 */
export interface RestDataSyncOptions extends AjaxOptions<'json'> {
    url?: string;
}
export declare const dataSyncREST: IDataSync<import("./interfaces").SyncObject>;
