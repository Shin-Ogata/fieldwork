import { getLanguage } from '@cdp/i18n';
import { SortOrder, SortCallback } from '../interfaces';

/**
 * @en [[Intl.Collator]] factory function type definition.
 * @ja [[Intl.Collator]] を返却する関数型定義
 */
export type CollatorProvider = () => Intl.Collator;

/** @internal default Intl.Collator provider */
let _collator: CollatorProvider = (): Intl.Collator => {
    return new Intl.Collator(getLanguage(), { sensitivity: 'base', numeric: true });
};

/**
 * @ja 既定の Intl.Collator を設定
 *
 * @param newProvider
 *  - `en` new [[CollatorProvider]] object. if `undefined` passed, only returns the current object.
 *  - `ja` 新しい [[CollatorProvider]] オブジェクトを指定. `undefined` が渡される場合は現在設定されているオブジェクトの返却のみ行う
 * @returns
 *  - `en` old [[CollatorProvider]] object.
 *  - `ja` 設定されていた [[CollatorProvider]] オブジェクト
 */
export function defaultCollatorProvider(newProvider?: CollatorProvider): CollatorProvider {
    if (null == newProvider) {
        return _collator;
    } else {
        const oldProvider = _collator;
        _collator = newProvider;
        return oldProvider;
    }
}

/**
 * @en Get string comparator function.
 * @ja 文字列比較用関数を取得
 *
 * @param prop
 *  - `en` property name
 *  - `ja` プロパティ名を指定
 * @param order
 *  - `en` sort order code
 *  - `ja` ソート順を指定
 */
export function getStringComparator<T, K extends string = string>(prop: K, order: SortOrder): SortCallback<T> {
    return (lhs: T, rhs: T): number => {
        // undefined は '' と同等に扱う
        const lhsProp = (null != lhs[prop as string]) ? lhs[prop as string] : '';
        const rhsProp = (null != rhs[prop as string]) ? rhs[prop as string] : '';
        return order * _collator().compare(lhsProp, rhsProp);
    };
}

/**
 * @en Get date comparator function.
 * @ja 日時比較用関数を取得
 *
 * @param prop
 *  - `en` property name
 *  - `ja` プロパティ名を指定
 * @param order
 *  - `en` sort order code
 *  - `ja` ソート順を指定
 */
export function getDateComparator<T, K extends string = string>(prop: K, order: SortOrder): SortCallback<T> {
    return (lhs: T, rhs: T): number => {
        const lhsDate = lhs[prop as string];
        const rhsDate = rhs[prop as string];
        if (lhsDate === rhsDate) {
            // (undefined === undefined) or 自己参照
            return 0;
        } else if (null == lhsDate) {
            // undefined は最低値扱い (昇順時に先頭へ)
            return -1 * order;
        } else if (null == rhsDate) {
            // undefined は最低値扱い (昇順時に先頭へ)
            return 1 * order;
        } else {
            const lhsValue = Object(lhsDate).valueOf();
            const rhsValue = Object(rhsDate).valueOf();
            if (lhsValue === rhsValue) {
                return 0;
            } else {
                return (lhsValue < rhsValue ? -1 * order : 1 * order);
            }
        }
    };
}

/**
 * @en Get generic comparator function by comparative operator.
 * @ja 比較演算子を用いた汎用比較関数の取得
 *
 * @param prop
 *  - `en` property name
 *  - `ja` プロパティ名を指定
 * @param order
 *  - `en` sort order code
 *  - `ja` ソート順を指定
 */
export function getGenericComparator<T, K extends string = string>(prop: K, order: SortOrder): SortCallback<T> {
    return (lhs: T, rhs: T): number => {
        if (lhs[prop as string] === rhs[prop as string]) {
            return 0;
        } else if (null == lhs[prop as string]) {
            // undefined は最低値扱い (昇順時に先頭へ)
            return -1 * order;
        } else if (null == rhs[prop as string]) {
            // undefined は最低値扱い (昇順時に先頭へ)
            return 1 * order;
        } else {
            return (lhs[prop as string] < rhs[prop as string] ? -1 * order : 1 * order);
        }
    };
}

/**
 * @en Get boolean comparator function.
 * @ja 真偽値比較用関数を取得
 */
export const getBooleanComparator = getGenericComparator;

/**
 * @en Get numeric comparator function.
 * @ja 数値比較用関数を取得
 */
export const getNumberComparator = getGenericComparator;
