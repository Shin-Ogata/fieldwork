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
    async sync(method: SyncMethods, context: SyncContext<object>, options?: Cancelable): Promise<SyncResult<object>> {
        const { cancel } = options ?? {};
        await cc(cancel);
        const response = Promise.resolve('read' === method ? {} : undefined);
        context.trigger('@request', context, response);
        return response;
    }
}

export const dataSyncNULL = new NullDataSync() as IDataSync<object>;
