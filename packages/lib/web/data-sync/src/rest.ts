import { RESULT_CODE, makeResult } from '@cdp/result';
import { AjaxOptions, ajax } from '@cdp/ajax';
import {
    IDataSync,
    SyncMethods,
    SyncContext,
    SyncResult,
} from './interfaces';
import { resolveURL } from './internal';

/**
 * @en Options interface for {@link RestDataSync}.
 * @ja {@link RestDataSync} に指定するオプション
 */
export interface RestDataSyncOptions extends AjaxOptions<'json'> {
    url?: string;
}

/** @internal */
const _methodMap = {
    create: 'POST',
    update: 'PUT',
    patch: 'PATCH',
    delete: 'DELETE',
    read: 'GET'
};

//__________________________________________________________________________________________________//

/**
 * @en The {@link IDataSync} implemant class which compliant RESTful.
 * @ja REST に準拠した {@link IDataSync} 実装クラス
 */
class RestDataSync implements IDataSync {

///////////////////////////////////////////////////////////////////////
// implements: IDataSync

    /**
     * @en {@link IDataSync} kind signature.
     * @ja {@link IDataSync} の種別を表す識別子
     */
    get kind(): string {
        return 'rest';
    }

    /**
     * @en Do data synchronization.
     * @ja データ同期
     *
     * @param method
     *  - `en` operation string
     *  - `ja` オペレーションを指定
     * @param context
     *  - `en` synchronized context object
     *  - `ja` 同期するコンテキストオブジェクト
     * @param options
     *  - `en` rest option object
     *  - `ja` REST オプション
     */
    sync<K extends SyncMethods>(method: K, context: SyncContext, options?: RestDataSyncOptions): Promise<SyncResult<K>> {
        const params = Object.assign({ dataType: 'json' }, options);

        const url = params.url || resolveURL(context);
        if (!url) {
            throw makeResult(RESULT_CODE.ERROR_MVC_INVALID_SYNC_PARAMS, 'A "url" property or function must be specified.');
        }

        params.method = _methodMap[method];

        // Ensure request data.
        if (null == params.data && ('create' === method || 'update' === method || 'patch' === method)) {
            params.data = context.toJSON();
        }

        // Ajax request
        const responce = ajax(url, params);
        context.trigger('@request', context, responce);
        return responce as Promise<SyncResult<K>>;
    }
}

export const dataSyncREST = new RestDataSync() as IDataSync;
