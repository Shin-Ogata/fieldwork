import { IDataSync } from './interfaces';
import { dataSyncNULL } from './null';

/** @internal */
let _default: IDataSync = dataSyncNULL;

/**
 * @en Get or update default [[IDataSync]] object.
 * @ja 既定の [[IDataSync]] オブジェクトの取得 / 更新
 *
 * @param newSync
 *  - `en` new data-sync object. if `undefined` passed, only returns the current object.
 *  - `ja` 新しい data-sync オブジェクトを指定. `undefined` が渡される場合は現在設定されている data-sync の返却のみ行う
 * @returns
 *  - `en` old data-sync object.
 *  - `ja` 以前の data-sync オブジェクトを返却
 */
export function defaultSync(newSync?: IDataSync): IDataSync {
    if (null == newSync) {
        return _default;
    } else {
        const oldSync = _default;
        _default = newSync;
        return oldSync;
    }
}
