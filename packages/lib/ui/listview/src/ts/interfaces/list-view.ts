import type {
    IListContextHolder,
    IListScrollable,
    IListBackupRestore,
} from './base';
import type { IListOperation } from './list-operation';
import type { IExpandableListContext } from './expandable-context';
import type { IExpandOperation } from './expand-operation';

/**
 * @en Interface definition for list view.
 * @ja リストビューインターフェイス
 */
export type IListView = IListContextHolder & IListOperation & IListScrollable & IListBackupRestore;

/**
 * @en Interface definition for expandable list view.
 * @ja 開閉リストビューインターフェイス
 */
export type IExpandableListView = IListView & IExpandableListContext & IExpandOperation;
