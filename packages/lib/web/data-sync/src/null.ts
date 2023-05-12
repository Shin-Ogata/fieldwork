import {
    Cancelable,
    checkCanceled as cc,
} from '@cdp/promise';
import {
    IDataSync,
    SyncMethods,
    SyncContext,
    SyncResult,
} from './interfaces';

/**
 * @en The {@link IDataSync} implemant class which has no effects.
 * @ja 何もしない {@link IDataSync} 実装クラス
 */
class NullDataSync implements IDataSync<object> {

///////////////////////////////////////////////////////////////////////
// implements: IDataSync

    /**
     * @en {@link IDataSync} kind signature.
     * @ja {@link IDataSync} の種別を表す識別子
     */
    get kind(): string {
        return 'null';
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
     *  - `en` option object
     *  - `ja` オプション
     */
    async sync<K extends SyncMethods>(method: K, context: SyncContext<object>, options?: Cancelable): Promise<SyncResult<K, object>> {
        const { cancel } = options || {};
        await cc(cancel);
        const responce = Promise.resolve('read' === method ? {} : undefined);
        context.trigger('@request', context, responce);
        return responce as Promise<SyncResult<K, object>>;
    }
}

export const dataSyncNULL = new NullDataSync() as IDataSync<object>;
