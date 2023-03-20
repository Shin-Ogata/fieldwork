export { UnknownFunction, UnknownObject, PlainObject, isString, isArray, isFunction, has, escapeHTML, } from '@cdp/core-utils';
/**
 * More correct typeof string handling array
 * which normally returns typeof 'object'
 */
export declare function typeString(src: unknown): string;
/**
 * Escape for template's expression charactors.
 */
export declare function escapeTemplateExp(src: string): string;
/**
 * Safe way of detecting whether or not the given thing is a primitive and
 * whether it has the given property
 */
export declare function primitiveHasOwnProperty(src: unknown, propName: string): boolean;
/**
 * Check whitespace charactor exists.
 */
export declare function isWhitespace(src: string): boolean;
