import { TypeKeys } from './types';
/**
 * @es Type verifier interface definition. <br>
 *     If invalid value received, the method throws `TypeError`.
 * @ja 型検証のインターフェイス定義 <br>
 *     違反した場合は `TypeError` を発生
 *
 *
 */
interface Verifier {
    /**
     * @es Verification for the input value is not [[Nil]].
     * @ja [[Nil]] でないことを検証
     *
     * @param notNil.x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param notNil.message
     *  - `en` custom error message
     *  - `ja` カスタムエラーメッセージ
     */
    notNil: (x: unknown, message?: string | null) => void | never;
    /**
     * @es Verification for the input is [[TypeKeys]].
     * @ja 指定した [[TypeKeys]] であるか検証
     *
     * @param typeOf.type
     *  - `en` one of [[TypeKeys]]
     *  - `ja` [[TypeKeys]] を指定
     * @param typeOf.x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param typeOf.message
     *  - `en` custom error message
     *  - `ja` カスタムエラーメッセージ
     */
    typeOf: (type: TypeKeys, x: unknown, message?: string | null) => void | never;
    /**
     * @es Verification for the input value is `Array`.
     * @ja `Array` であるか検証
     *
     * @param array.x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param array.message
     *  - `en` custom error message
     *  - `ja` カスタムエラーメッセージ
     */
    array: (x: unknown, message?: string | null) => void | never;
    /**
     * @es Verification for the input value is `Iterable`.
     * @ja `Iterable` であるか検証
     *
     * @param iterable.x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param iterable.message
     *  - `en` custom error message
     *  - `ja` カスタムエラーメッセージ
     */
    iterable: (x: unknown, message?: string | null) => void | never;
    /**
     * @es Verification for the input instance is equal comparative target constructor.
     * @ja 指定コンストラクタのインスタンスであるか検証
     *
     * @param instanceOf.ctor
     *  - `en` comparative target constructor
     *  - `ja` 比較対象のコンストラクタ
     * @param instanceOf.x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param instanceOf.message
     *  - `en` custom error message
     *  - `ja` カスタムエラーメッセージ
     */
    instanceOf: (ctor: Function, x: unknown, message?: string | null) => void | never;
    /**
     * @es Verification for the input instance has `strictly` comparative target constructor.
     * @ja 指定コンストラクタの厳密一致したインスタンスであるか検証
     *
     * @param ownInstanceOf.ctor
     *  - `en` comparative target constructor
     *  - `ja` 比較対象のコンストラクタ
     * @param ownInstanceOf.x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param ownInstanceOf.message
     *  - `en` custom error message
     *  - `ja` カスタムエラーメッセージ
     */
    ownInstanceOf: (ctor: Function, x: unknown, message?: string | null) => void | never;
    /**
     * @es Verification for the input instance has not `strictly` equal comparative target constructor.
     * @ja 指定コンストラクタを持つインスタンスでないことを検証
     *
     * @param notOwnInstanceOf.ctor
     *  - `en` comparative target constructor
     *  - `ja` 比較対象のコンストラクタ
     * @param notOwnInstanceOf.x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param notOwnInstanceOf.message
     *  - `en` custom error message
     *  - `ja` カスタムエラーメッセージ
     */
    notOwnInstanceOf: (ctor: Function, x: unknown, message?: string | null) => void | never;
    /**
     * @es Verification for the input value has specified property.
     * @ja 指定プロパティを持っているか検証
     *
     * @param hasProperty.prop
     *  - `en` specified property
     *  - `ja` 対象のプロパティ
     * @param hasProperty.x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param hasProperty.message
     *  - `en` custom error message
     *  - `ja` カスタムエラーメッセージ
     */
    hasProperty: (x: unknown, prop: PropertyKey, message?: string | null) => void | never;
    /**
     * @es Verification for the input value has own specified property.
     * @ja 指定プロパティを入力値自身持っているか検証
     *
     * @param hasOwnProperty.prop
     *  - `en` specified property
     *  - `ja` 対象のプロパティ
     * @param hasOwnProperty.x
     *  - `en` evaluated value
     *  - `ja` 評価する値
     * @param hasOwnProperty.message
     *  - `en` custom error message
     *  - `ja` カスタムエラーメッセージ
     */
    hasOwnProperty: (x: unknown, prop: PropertyKey, message?: string | null) => void | never;
}
/**
 * @es List of method for type verify.
 * @ja 型検証が提供するメソッド一覧
 */
declare type VerifyMethod = keyof Verifier;
/**
 * @es Verify method.
 * @ja 検証メソッド
 *
 * @param method
 *  - `en` method name which using
 *  - `ja` 使用するメソッド名
 * @param args
 *  - `en` arguments which corresponds to the method name
 *  - `ja` メソッド名に対応する引数
 */
export declare function verify<TMethod extends VerifyMethod>(method: TMethod, ...args: Parameters<Verifier[TMethod]>): void | never;
export { verify as default };
