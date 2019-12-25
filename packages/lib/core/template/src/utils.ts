import {
    isArray,
    isPrimitive,
} from '@cdp/core-utils';
export {
    PlainObject,
    isString,
    isArray,
    isFunction,
    has,
    escapeHTML,
} from '@cdp/core-utils';

/**
 * More correct typeof string handling array
 * which normally returns typeof 'object'
 */
export function typeString(src: unknown): string {
    return isArray(src) ? 'array' : typeof src;
}

/**
 * Escape for template's expression charactors.
 */
export function escapeTemplateExp(src: string): string {
    // eslint-disable-next-line
    return src.replace(/[-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
}

/**
 * Safe way of detecting whether or not the given thing is a primitive and
 * whether it has the given property
 */
export function primitiveHasOwnProperty(src: unknown, propName: string): boolean {
    return isPrimitive(src) && Object.prototype.hasOwnProperty.call(src, propName);
}

/**
 * Check whitespace charactor exists.
 */
export function isWhitespace(src: string): boolean {
    return !/\S/.test(src);
}
