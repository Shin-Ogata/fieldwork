import { type PlainObject } from '@cdp/core-utils';
/**
 * @en Convert `PlainObject` to query strings.
 * @ja `PlainObject` をクエリストリングに変換
 */
export declare const toQueryStrings: (data: PlainObject) => string;
/**
 * @en Convert `PlainObject` to Ajax parameters object.
 * @ja `PlainObject` を Ajax パラメータオブジェクトに変換
 */
export declare const toAjaxParams: (data: PlainObject) => Record<string, string>;
/**
 * @en Convert URL parameters to primitive type.
 * @ja URL パラメータを primitive に変換
 */
export declare const convertUrlParamType: (value: string) => string | number | boolean | null;
/**
 * @en Parse url query GET parameters.
 * @ja URLクエリのGETパラメータを解析
 *
 * @example <br>
 *
 * ```ts
 * const url = '/page/?id=5&foo=bar&bool=true';
 * const query = parseUrlQuery(url);
 * // { id: 5, foo: 'bar', bool: true }
 * ```
 *
 * @returns { key: value } object.
 */
export declare const parseUrlQuery: <T = Record<string, string | number | boolean | null>>(url: string) => T;
