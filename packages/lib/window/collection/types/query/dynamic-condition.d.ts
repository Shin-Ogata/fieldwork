import { Keys } from '@cdp/core-utils';
import { SortCallback, FilterCallback, SortKey, DynamicConditionSeed, DynamicOperatorContext, DynamicLimitCondition, DynamicCombination } from '../interfaces';
/**
 * @en Dynamic query condition manager class.
 * @ja ダイナミッククエリ状態管理クラス
 */
export declare class DynamicCondition<TItem extends {}, TKey extends Keys<TItem> = Keys<TItem>> implements DynamicConditionSeed<TItem, TKey> {
    private _operators;
    private _combination;
    private _sumKeys;
    private _limit?;
    private _random;
    private _sortKeys;
    /**
     * constructor
     *
     * @param seeds
     *  - `en` [[DynamicConditionSeed]] instance
     *  - `ja` [[DynamicConditionSeed]] インスタンス
     */
    constructor(seeds?: DynamicConditionSeed<TItem, TKey>);
    get operators(): DynamicOperatorContext<TItem>[];
    set operators(values: DynamicOperatorContext<TItem>[]);
    get sumKeys(): (Keys<TItem>)[];
    set sumKeys(values: (Keys<TItem>)[]);
    get combination(): DynamicCombination;
    set combination(value: DynamicCombination);
    get limit(): DynamicLimitCondition<TItem> | undefined;
    set limit(value: DynamicLimitCondition<TItem> | undefined);
    get random(): boolean;
    set random(value: boolean);
    get sortKeys(): SortKey<TKey>[];
    set sortKeys(values: SortKey<TKey>[]);
    /**
     * @en Get comparator functions.
     * @ja 比較関数取得
     */
    get comparators(): SortCallback<TItem>[];
    /**
     * @en Get synthesis filter function.
     * @ja 合成済みフィルタ関数取得
     */
    get filter(): FilterCallback<TItem>;
}
