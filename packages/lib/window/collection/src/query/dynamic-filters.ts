/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import { Keys, computeDate } from '@cdp/core-utils';
import { FilterCallback, DynamicCombination } from '../interfaces';

/** @internal */
export type ValueTypeALL<T> = Extract<number | string | Date, T[Keys<T>]>;
/** @internal */
export type ValueTypeComparable<T> = Extract<number | Date, T[Keys<T>]>;
/** @internal */
export type ValueTypeString<T> = Extract<string, T[Keys<T>]>;
/** @internal */
export type DynamicOperatorDateUnit = 'year' | 'month' | 'day' | undefined;

/** @internal DynamicPackageOperator.EQUAL */
export function equal<T extends {}>(prop: keyof T, value: ValueTypeALL<T>): FilterCallback<T> {
    return (item: T) => item[prop] === value;
}

/** @internal DynamicPackageOperator.NOT_EQUAL */
export function notEqual<T extends {}>(prop: keyof T, value: ValueTypeALL<T>): FilterCallback<T> {
    return (item: T) => item[prop] !== value;
}

/** @internal DynamicPackageOperator.GREATER */
export function greater<T extends {}>(prop: keyof T, value: ValueTypeComparable<T>): FilterCallback<T> {
    return (item: T) => item[prop] > value;
}

/** @internal DynamicPackageOperator.LESS */
export function less<T extends {}>(prop: keyof T, value: ValueTypeComparable<T>): FilterCallback<T> {
    return (item: T) => item[prop] < value;
}

/** @internal DynamicPackageOperator.GREATER_EQUAL */
export function greaterEqual<T extends {}>(prop: keyof T, value: ValueTypeComparable<T>): FilterCallback<T> {
    return (item: T) => item[prop] >= value;
}

/** @internal DynamicPackageOperator.LESS_EQUAL */
export function lessEqual<T extends {}>(prop: keyof T, value: ValueTypeComparable<T>): FilterCallback<T> {
    return (item: T) => item[prop] <= value;
}

/** @internal DynamicPackageOperator.LIKE */
export function like<T extends {}>(prop: keyof T, value: ValueTypeString<T>): FilterCallback<T> {
    return (item: T) => -1 !== String(item[prop]).toLocaleLowerCase().indexOf(value.toLocaleLowerCase());
}

/** @internal DynamicPackageOperator.NOT_LIKE */
export function notLike<T extends {}>(prop: keyof T, value: ValueTypeString<T>): FilterCallback<T> {
    return (item: T) => -1 === String(item[prop]).toLocaleLowerCase().indexOf(value.toLocaleLowerCase());
}

/** @internal DynamicPackageOperator.DATE_LESS_EQUAL */
export function dateLessEqual<T extends {}>(prop: keyof T, value: number, unit: DynamicOperatorDateUnit): FilterCallback<T> {
    return (item: T) => {
        const date = computeDate(new Date(), -1 * value, unit);
        return date <= (item[prop] as any);
    };
}

/** @internal DynamicPackageOperator.DATE_LESS_NOT_EQUAL */
export function dateLessNotEqual<T extends {}>(prop: keyof T, value: number, unit: DynamicOperatorDateUnit): FilterCallback<T> {
    return (item: T) => {
        const date = computeDate(new Date(), -1 * value, unit);
        return !(date <= (item[prop] as any));
    };
}

/** @internal DynamicPackageOperator.RANGE */
export function range<T extends {}>(prop: keyof T, min: ValueTypeComparable<T>, max: ValueTypeComparable<T>): FilterCallback<T> {
    return combination(DynamicCombination.AND, greaterEqual(prop, min), lessEqual(prop, max));
}

/** @internal フィルタの合成 */
export function combination<T extends {}>(type: DynamicCombination, lhs: FilterCallback<T>, rhs: FilterCallback<T> | undefined): FilterCallback<T> {
    return !rhs ? lhs : (item: T) => {
        switch (type) {
            case DynamicCombination.AND:
                return lhs(item) && rhs(item);
            case DynamicCombination.OR:
                return lhs(item) || rhs(item);
            default:
                console.warn(`unknown combination: ${type}`);
                // fail safe
                return lhs(item) && rhs(item);
        }
    };
}
