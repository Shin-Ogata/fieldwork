import type {
    IListContextHolder,
    IListScrollable,
    IListBackupRestore,
    IListStatusManager,
    IListLayoutKeyHolder,
} from './base';
import type { IListOperation } from './list-operation';

/**
 * @en Expandable list context interface definition.
 * @ja 開閉リストのコンテキストインターフェイス定義
 */
export type IExpandableListContext
    = IListContextHolder
    & IListScrollable
    & IListBackupRestore
    & IListStatusManager
    & IListLayoutKeyHolder
    & IListOperation
;
