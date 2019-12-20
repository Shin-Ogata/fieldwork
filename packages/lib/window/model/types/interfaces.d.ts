import { Constructor, PlainObject } from '@cdp/core-utils';
import { Silenceable } from '@cdp/events';
import { Result } from '@cdp/result';
import { ModelBase } from './base';
/**
 * @en Validable base interface.
 * @ja 検証可否の定義
 */
export interface Validable {
    validate?: boolean;
    noThrow?: boolean;
}
/**
 * @en [[Model]] attribute change event definition.
 * @ja [[Model]] 属性変更イベント定義
 */
export declare type ModelAttributeChangeEvent<T extends {}> = {
    [K in keyof T]: [T[K], T[K], K];
};
/**
 * @en Default [[Model]] event definition.
 * @ja 既定の [[Model]] イベント定義
 */
export declare type ModelEvent<T extends {}> = ModelAttributeChangeEvent<T> & {
    /**
     * @en notified when some attribute changed.
     * @ja 属性が変更されたときに発行
     */
    '@change': ModelBase<T>;
    /**
     * @en notified when some attribute failed.
     * @ja 属性が変更に失敗したときに発行
     */
    '@invalid': [ModelBase<T>, T, Result];
};
/**
 * @en [[Model]] attributes definition.
 * @ja [[Model]] が持つ属性の定義
 */
export declare type ModelAttributes<T extends {}> = {
    [P in keyof T]: T[P];
};
/**
 * @en [[Model]] base constructor definition.
 * @ja [[Model]] の基底コンストラクタの定義
 */
export declare type ModelConstructor<C, T extends {}> = new (...args: ConstructorParameters<Constructor<C>>) => C & ModelAttributes<T>;
/**
 * @en [[Model]] validate options.
 * @ja [[Model]] 検証オプション
 */
export interface ModelValidateAttributeOptions extends Silenceable {
    extend?: boolean;
}
/**
 * @en [[Model]] attributes argument type.
 * @ja [[Model]] 属性引数の型
 */
export declare type ModelAttributeInput<T> = Partial<T> & PlainObject;
/**
 * @en [[Model]] attributes setup options.
 * @ja [[Model]] 属性設定時に指定するオプション
 */
export interface ModelSetOptions extends ModelValidateAttributeOptions {
    validate?: boolean;
    noThrow?: boolean;
}
/**
 * @en [[Model]] construction options.
 * @ja [[Model]] 構築に指定するオプション
 */
export interface ModelConstructionOptions<T extends {}> extends ModelSetOptions {
    idAttribute?: keyof T;
}
