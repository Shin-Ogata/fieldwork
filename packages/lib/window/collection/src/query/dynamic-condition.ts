import { Keys } from '@cdp/core-utils';
import { convertSortKeys } from '../utils';
import {
    SortCallback,
    FilterCallback,
    SortKey,
    DynamicConditionSeed,
    DynamicOperatorContext,
    DynamicLimitCondition,
    DynamicOperator,
    DynamicCombination,
} from '../interfaces';
import {
    ValueTypeALL,
    ValueTypeComparable,
    ValueTypeString,
    equal,
    notEqual,
    greater,
    less,
    greaterEqual,
    lessEqual,
    like,
    notLike,
    dateLessEqual,
    dateLessNotEqual,
    range,
    combination,
} from './dynamic-filters';

/**
 * @en Dynamic query condition manager class.
 * @ja ダイナミッククエリ状態管理クラス
 */
export class DynamicCondition<TItem extends {}, TKey extends Keys<TItem> = Keys<TItem>> implements DynamicConditionSeed<TItem, TKey> {

    private _operators: DynamicOperatorContext<TItem>[];
    private _combination: DynamicCombination;
    private _sumKeys: Keys<TItem>[];
    private _limit?: DynamicLimitCondition<TItem>;
    private _random: boolean;
    private _sortKeys: SortKey<TKey>[];

    /**
     * constructor
     *
     * @param seeds
     *  - `en` [[DynamicConditionSeed]] instance
     *  - `ja` [[DynamicConditionSeed]] インスタンス
     */
    constructor(seeds: DynamicConditionSeed<TItem, TKey> = { operators: [] }) {
        const { operators, combination, sumKeys, limit, random, sortKeys } = seeds;
        this._operators     = operators;
        this._combination   = null != combination ? combination : DynamicCombination.AND;
        this._sumKeys       = null != sumKeys ? sumKeys : [];
        this._limit         = limit;
        this._random        = !!random;
        this._sortKeys      = sortKeys || [];
    }

///////////////////////////////////////////////////////////////////////
// implements: DynamicConditionSeed

    get operators(): DynamicOperatorContext<TItem>[] {
        return this._operators;
    }

    set operators(values: DynamicOperatorContext<TItem>[]) {
        this._operators = values;
    }

    get sumKeys(): (Keys<TItem>)[] {
        return this._sumKeys;
    }

    set sumKeys(values: (Keys<TItem>)[]) {
        this._sumKeys = values;
    }

    get combination(): DynamicCombination {
        return this._combination;
    }

    set combination(value: DynamicCombination) {
        this._combination = value;
    }

    get limit(): DynamicLimitCondition<TItem> | undefined {
        return this._limit;
    }

    set limit(value: DynamicLimitCondition<TItem> | undefined) {
        this._limit = value;
    }

    get random(): boolean {
        return this._random;
    }

    set random(value: boolean) {
        this._random = value;
    }

    get sortKeys(): SortKey<TKey>[] {
        return this._sortKeys;
    }

    set sortKeys(values: SortKey<TKey>[]) {
        this._sortKeys = values;
    }

///////////////////////////////////////////////////////////////////////
// public accessor:

    /**
     * @en Get comparator functions.
     * @ja 比較関数取得
     */
    get comparators(): SortCallback<TItem>[] {
        return convertSortKeys(this._sortKeys);
    }

    /**
     * @en Get synthesis filter function.
     * @ja 合成済みフィルタ関数取得
     */
    get filter(): FilterCallback<TItem> {
        let fltr: FilterCallback<TItem> | undefined;

        for (const cond of this._operators) {
            switch (cond.operator) {
                case DynamicOperator.EQUAL:
                    fltr = combination(
                        this._combination,
                        equal<TItem>(cond.prop, cond.value as ValueTypeALL<TItem>),
                        fltr,
                    );
                    break;
                case DynamicOperator.NOT_EQUAL:
                    fltr = combination(
                        this._combination,
                        notEqual<TItem>(cond.prop, cond.value as ValueTypeALL<TItem>),
                        fltr,
                    );
                    break;
                case DynamicOperator.GREATER:
                    fltr = combination(
                        this._combination,
                        greater<TItem>(cond.prop, cond.value as ValueTypeComparable<TItem>),
                        fltr,
                    );
                    break;
                case DynamicOperator.LESS:
                    fltr = combination(
                        this._combination,
                        less<TItem>(cond.prop, cond.value as ValueTypeComparable<TItem>),
                        fltr,
                    );
                    break;
                case DynamicOperator.GREATER_EQUAL:
                    fltr = combination(
                        this._combination,
                        greaterEqual<TItem>(cond.prop, cond.value as ValueTypeComparable<TItem>),
                        fltr,
                    );
                    break;
                case DynamicOperator.LESS_EQUAL:
                    fltr = combination(
                        this._combination,
                        lessEqual<TItem>(cond.prop, cond.value as ValueTypeComparable<TItem>),
                        fltr,
                    );
                    break;
                case DynamicOperator.LIKE:
                    fltr = combination(
                        this._combination,
                        like<TItem>(cond.prop, cond.value as ValueTypeString<TItem>),
                        fltr,
                    );
                    break;
                case DynamicOperator.NOT_LIKE:
                    fltr = combination(
                        this._combination,
                        notLike<TItem>(cond.prop, cond.value as ValueTypeString<TItem>),
                        fltr,
                    );
                    break;
                case DynamicOperator.DATE_LESS_EQUAL:
                    fltr = combination(
                        this._combination,
                        dateLessEqual<TItem>(cond.prop, cond.value as number, cond.unit),
                        fltr,
                    );
                    break;
                case DynamicOperator.DATE_LESS_NOT_EQUAL:
                    fltr = combination(
                        this._combination,
                        dateLessNotEqual<TItem>(cond.prop, cond.value as number, cond.unit),
                        fltr,
                    );
                    break;
                case DynamicOperator.RANGE:
                    fltr = combination(
                        this._combination,
                        range<TItem>(cond.prop, cond.value as ValueTypeComparable<TItem>, cond.range as ValueTypeComparable<TItem>),
                        fltr,
                    );
                    break;
                default:
                    console.warn(`unknown operator: ${cond.operator}`);
                    break;
            }
        }

        return fltr || ((/* item */) => true);
    }
}
