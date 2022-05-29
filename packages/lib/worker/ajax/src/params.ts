import {
    PlainObject,
    isFunction,
    isNumeric,
} from '@cdp/core-utils';
import { URLSearchParams } from './ssr';

/** @internal ensure string value */
const ensureParamValue = (prop: unknown): string => {
    const value = isFunction(prop) ? prop() : prop;
    return undefined !== value ? String(value) : '';
};

/**
 * @en Convert `PlainObject` to query strings.
 * @ja `PlainObject` をクエリストリングに変換
 */
export const toQueryStrings = (data: PlainObject): string => {
    const params: string[] = [];
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    return params.join('&');
};

/**
 * @en Convert `PlainObject` to Ajax parameters object.
 * @ja `PlainObject` を Ajax パラメータオブジェクトに変換
 */
export const toAjaxParams = (data: PlainObject): Record<string, string> => {
    const params: Record<string, string> = {};
    for (const key of Object.keys(data)) {
        const value = ensureParamValue(data[key]);
        if (value) {
            params[key] = value;
        }
    }
    return params;
};

/**
 * @en Convert URL parameters to primitive type.
 * @ja URL パラメータを primitive に変換
 */
export const convertUrlParamType = (value: string): string | number | boolean | null => {
    if (isNumeric(value)) {
        return Number(value);
    } else if ('true' === value) {
        return true;
    } else if ('false' === value) {
        return false;
    } else if ('null' === value) {
        return null;
    } else {
        return decodeURIComponent(value);
    }
};

/**
 * @en Parse url query GET parameters.
 * @ja URLクエリのGETパラメータを解析
 *
 * @example <br>
 *
 * ```ts
 * const url = '/page/?id=5&foo=bar&bool=true';
 * const query = parseUrl();
 * // { id: 5, foo: 'bar', bool: true }
 * ```
 *
 * @returns { key: value } object.
 */
export const parseUrlQuery = <T = Record<string, string | number | boolean | null>>(url: string): T => {
    const query = {};
    const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : url);
    for (const [key, value] of params) {
        query[decodeURIComponent(key)] = convertUrlParamType(value);
    }
    return query as T;
};
