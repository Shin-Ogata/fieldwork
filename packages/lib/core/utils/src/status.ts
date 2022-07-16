const _status: Record<string | symbol, number> = {};

/**
 * @en Increment reference count for status identifier.
 * @ja 状態変数の参照カウントのインクリメント
 *
 * @param status
 *  - `en` state identifier
 *  - `ja` 状態識別子
 * @returns
 *  - `en` reference count value
 *  - `ja` 参照カウントの値
 */
export function statusAddRef(status: string | symbol): number {
    if (!_status[status]) {
        _status[status] = 1;
    } else {
        _status[status]++;
    }
    return _status[status];
}

/**
 * @en Decrement reference count for status identifier.
 * @ja 状態変数の参照カウントのデクリメント
 *
 * @param status
 *  - `en` state identifier
 *  - `ja` 状態識別子
 * @returns
 *  - `en` reference count value
 *  - `ja` 参照カウントの値
 */
export function statusRelease(status: string | symbol): number {
    if (!_status[status]) {
        return 0;
    } else {
        const retval = --_status[status];
        if (0 === retval) {
            delete _status[status];
        }
        return retval;
    }
}

/**
 * @en State variable management scope
 * @ja 状態変数管理スコープ
 *
 * @param status
 *  - `en` state identifier
 *  - `ja` 状態識別子
 * @param executor
 *  - `en` seed function.
 *  - `ja` 対象の関数
 * @returns
 *  - `en` retval of seed function.
 *  - `ja` 対象の関数の戻り値
 */
export async function statusScope<T>(status: string | symbol, executor: () => T | Promise<T>): Promise<T> {
    try {
        statusAddRef(status);
        return await executor();
    } finally {
        statusRelease(status);
    }
}

/**
 * @en Check if it's in the specified state.
 * @ja 指定した状態中であるか確認
 *
 * @param status
 *  - `en` state identifier
 *  - `ja` 状態識別子
 * @return {Boolean} true: 状態内 / false: 状態外
 * @returns
 *  - `en` `true`: within the status / `false`: out of the status
 *  - `ja` `true`: 状態内 / `false`: 状態外
 */
export function isStatusIn(status: string | symbol): boolean {
    return !!_status[status];
}
