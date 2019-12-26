import { isFunction } from '@cdp/core-utils';
import { RESULT_CODE, makeResult } from '@cdp/result';
import { AjaxOptions, ajax } from '@cdp/ajax';
import {
    IDataSync,
    SyncMethods,
    SyncContext,
    SyncResult,
} from './interfaces';

/**
 * @en Options interface for [[RestDataSync]].
 * @ja [[RestDataSync]] に指定するオプション
 */
export interface RestDataSyncOptions extends AjaxOptions<'json'> {
    url?: string;
}

const _methodMap = {
    create: 'POST',
    update: 'PUT',
    patch: 'PATCH',
    delete: 'DELETE',
    read: 'GET'
};

/** @internal resolve lack property */
function resolveURL(context: SyncContext): string {
    if (isFunction(context['url'])) {
        return context['url']() as string;
    } else {
        return context['url'];
    }
}


/**
 * @en The [[IDataSync]] implemant class which compliant RESTful.
 * @ja REST に準拠した [[IDataSync]] 実装クラス
 */
class RestDataSync implements IDataSync {

///////////////////////////////////////////////////////////////////////
// implements: IDataSync

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
    async sync<K extends SyncMethods>(method: K, context: SyncContext, options?: RestDataSyncOptions): Promise<SyncResult<K>> {
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
