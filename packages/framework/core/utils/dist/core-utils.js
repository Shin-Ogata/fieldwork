/*!
 * @cdp/core-utils 0.9.0
 *   core framework utilities
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory((global.CDP = global.CDP || {}, global.CDP.Utils = global.CDP.Utils || {})));
}(this, function (exports) { 'use strict';

    /* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */
    function is(x) {
        return x != null;
    }
    function isNil(x) {
        return x == null;
    }
    function isString(x) {
        return typeof x === 'string';
    }
    function isNumber(x) {
        return typeof x === 'number';
    }
    function isBoolean(x) {
        return typeof x === 'boolean';
    }
    function isSymbol(x) {
        return typeof x === 'symbol';
    }
    function isPrimitive(x) {
        return !x || typeof x !== 'function' && typeof x !== 'object';
    }
    function isObject(x) {
        return Boolean(x) && typeof x === 'object';
    }
    function isFunction(x) {
        return typeof x === 'function';
    }
    function typeOf(type, x) {
        return typeof x === type;
    }
    function isIterable(x) {
        return Symbol.iterator in Object(x);
    }
    function instanceOf(C, x) {
        return typeof C === 'function' && x instanceof C;
    }
    function ownInstanceOf(C, x) {
        return typeof C === 'function' && Object.getPrototypeOf(x) === Object(C.prototype);
    }
    function className(x) {
        if (x != null) {
            const toStringTagName = x[Symbol.toStringTag];
            if (isString(toStringTagName)) {
                return toStringTagName;
            }
            const C = x.constructor;
            if (isFunction(C) && C === Object(C.prototype).constructor) {
                return C.name;
            }
        }
        return Object.prototype.toString.call(x).slice(8, -1);
    }
    function sameType(a, b) {
        return typeof a === typeof b;
    }
    function sameClass(a, b) {
        return a != null && b != null && Object.getPrototypeOf(a) === Object.getPrototypeOf(b);
    }
    /** `pickupKeys` で指定されたプロパティのみを持つ `target` の Shallow Copy を返す */
    function partialize(target, ...pickupKeys) {
        if (!target || !isObject(target)) {
            throw new TypeError(`${className(target)} is not an object.`);
        }
        return pickupKeys.reduce((obj, key) => {
            key in target && (obj[key] = target[key]);
            return obj;
        }, {}); // eslint-disable-line @typescript-eslint/no-object-literal-type-assertion
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    function throwIfNil(x, message) {
        if (x == null) {
            is(message) || (message = `${className(x)} is not a valid value.`);
            throw new TypeError(message);
        }
    }
    function throwIfNotTypeOf(type, x, message) {
        if (typeof x !== type) {
            is(message) || (message = `Type of ${className(x)} is not ${type}.`);
            throw new TypeError(message);
        }
    }
    function throwIfNotArray(x, message) {
        if (!Array.isArray(x)) {
            is(message) || (message = `${className(x)} is not an Array.`);
            throw new TypeError(message);
        }
    }
    function throwIfNotIterable(x, message) {
        if (!(Symbol.iterator in Object(x))) {
            is(message) || (message = `${className(x)} is not an iterable object.`);
            throw new TypeError(message);
        }
    }
    function throwIfNotInstanceOf(C, x, message) {
        if (!(x instanceof C)) {
            is(message) || (message = `${className(x)} is not an instance of ${C.name}.`);
            throw new TypeError(message);
        }
    }
    function throwIfOwnInstanceOf(C, x, message) {
        if (Object.getPrototypeOf(x) === Object(C.prototype)) {
            is(message) || (message = `The object passed is own instance of ${C.name}.`);
            throw new TypeError(message);
        }
    }
    function throwIfNotOwnInstanceOf(C, x, message) {
        if (Object.getPrototypeOf(x) !== Object(C.prototype)) {
            is(message) || (message = `The object passed is not own instance of ${C.name}.`);
            throw new TypeError(message);
        }
    }
    function throwIfNotHasProperty(x, p, message) {
        if (!(p in x)) {
            is(message) || (message = `The object passed does not have property ${String(p)}.`);
            throw new TypeError(message);
        }
    }
    function throwIfNotHasOwnProperty(x, p, message) {
        if (!Object.prototype.hasOwnProperty.call(x, p)) {
            is(message) || (message = `The object passed does not have own property ${String(p)}.`);
            throw new TypeError(message);
        }
    }

    // for test TODO: remove
    const hoge = 'hoge';

    exports.className = className;
    exports.hoge = hoge;
    exports.instanceOf = instanceOf;
    exports.is = is;
    exports.isBoolean = isBoolean;
    exports.isFunction = isFunction;
    exports.isIterable = isIterable;
    exports.isNil = isNil;
    exports.isNumber = isNumber;
    exports.isObject = isObject;
    exports.isPrimitive = isPrimitive;
    exports.isString = isString;
    exports.isSymbol = isSymbol;
    exports.ownInstanceOf = ownInstanceOf;
    exports.partialize = partialize;
    exports.sameClass = sameClass;
    exports.sameType = sameType;
    exports.throwIfNil = throwIfNil;
    exports.throwIfNotArray = throwIfNotArray;
    exports.throwIfNotHasOwnProperty = throwIfNotHasOwnProperty;
    exports.throwIfNotHasProperty = throwIfNotHasProperty;
    exports.throwIfNotInstanceOf = throwIfNotInstanceOf;
    exports.throwIfNotIterable = throwIfNotIterable;
    exports.throwIfNotOwnInstanceOf = throwIfNotOwnInstanceOf;
    exports.throwIfNotTypeOf = throwIfNotTypeOf;
    exports.throwIfOwnInstanceOf = throwIfOwnInstanceOf;
    exports.typeOf = typeOf;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS11dGlscy5qcyIsInNvdXJjZXMiOlsidHlwZXMudHMiLCJ2ZXJpZnkudHMiLCJjaGVjay9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXR5cGVzLCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmV4cG9ydCB0eXBlIE5pbCA9IHZvaWQgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgdHlwZSBOaWxsYWJsZTxUIGV4dGVuZHMgT2JqZWN0PiA9IFQgfCBOaWw7XG5cbmV4cG9ydCB0eXBlIFByaW1pdGl2ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBzeW1ib2wgfCBudWxsIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVNYXAge1xuICAgIHN0cmluZzogc3RyaW5nO1xuICAgIG51bWJlcjogbnVtYmVyO1xuICAgIGJvb2xlYW46IGJvb2xlYW47XG4gICAgc3ltYm9sOiBzeW1ib2w7XG4gICAgdW5kZWZpbmVkOiB2b2lkIHwgdW5kZWZpbmVkO1xuICAgIG9iamVjdDogb2JqZWN0IHwgbnVsbDtcbiAgICBmdW5jdGlvbiguLi5hcmdzOiBhbnlbXSk6IGFueTtcbn1cblxuZXhwb3J0IHR5cGUgVHlwZUtleXMgPSBrZXlvZiBUeXBlTWFwO1xuXG5leHBvcnQgaW50ZXJmYWNlIFR5cGU8VCBleHRlbmRzIE9iamVjdD4gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gICAgcmVhZG9ubHkgcHJvdG90eXBlOiBUO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbnN0cnVjdG9yPFQ+IGV4dGVuZHMgVHlwZTxUPiB7XG4gICAgbmV3KC4uLmFyZ3M6IGFueVtdKTogVDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzPE8gZXh0ZW5kcyBPYmplY3Q+KHg6IE5pbGxhYmxlPE8+KTogeCBpcyBPO1xuZXhwb3J0IGZ1bmN0aW9uIGlzKHg6IGFueSk6IHggaXMgT2JqZWN0O1xuZXhwb3J0IGZ1bmN0aW9uIGlzKHg6IGFueSkge1xuICAgIHJldHVybiB4ICE9IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc05pbCh4OiBhbnkpOiB4IGlzIE5pbCB7XG4gICAgcmV0dXJuIHggPT0gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHg6IGFueSk6IHggaXMgc3RyaW5nIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdzdHJpbmcnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIoeDogYW55KTogeCBpcyBudW1iZXIge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ251bWJlcic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Jvb2xlYW4oeDogYW55KTogeCBpcyBib29sZWFuIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdib29sZWFuJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU3ltYm9sKHg6IGFueSk6IHggaXMgc3ltYm9sIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdzeW1ib2wnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQcmltaXRpdmUoeDogYW55KTogeCBpcyBQcmltaXRpdmUge1xuICAgIHJldHVybiAheCB8fCB0eXBlb2YgeCAhPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgeCAhPT0gJ29iamVjdCc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh4OiBhbnkpOiB4IGlzIG9iamVjdCB7XG4gICAgcmV0dXJuIEJvb2xlYW4oeCkgJiYgdHlwZW9mIHggPT09ICdvYmplY3QnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jdGlvbih4OiBhbnkpOiB4IGlzIFR5cGVNYXBbJ2Z1bmN0aW9uJ10ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR5cGVPZjxLIGV4dGVuZHMgVHlwZUtleXM+KHR5cGU6IEssIHg6IGFueSk6IHggaXMgVHlwZU1hcFtLXSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSB0eXBlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJdGVyYWJsZTxUPih4OiBOaWxsYWJsZTxJdGVyYWJsZTxUPj4pOiB4IGlzIEl0ZXJhYmxlPFQ+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogYW55KTogeCBpcyBJdGVyYWJsZTxhbnk+O1xuZXhwb3J0IGZ1bmN0aW9uIGlzSXRlcmFibGUoeDogYW55KSB7XG4gICAgcmV0dXJuIFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnN0YW5jZU9mPFQgZXh0ZW5kcyBPYmplY3Q+KEM6IE5pbGxhYmxlPFR5cGU8VD4+LCB4OiBhbnkpOiB4IGlzIFQge1xuICAgIHJldHVybiB0eXBlb2YgQyA9PT0gJ2Z1bmN0aW9uJyAmJiB4IGluc3RhbmNlb2YgQztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG93bkluc3RhbmNlT2Y8VCBleHRlbmRzIE9iamVjdD4oQzogTmlsbGFibGU8VHlwZTxUPj4sIHg6IGFueSk6IHggaXMgVCB7XG4gICAgcmV0dXJuIHR5cGVvZiBDID09PSAnZnVuY3Rpb24nICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSA9PT0gT2JqZWN0KEMucHJvdG90eXBlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzTmFtZSh4OiBhbnkpOiBzdHJpbmcge1xuICAgIGlmICh4ICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgdG9TdHJpbmdUYWdOYW1lID0geFtTeW1ib2wudG9TdHJpbmdUYWddO1xuICAgICAgICBpZiAoaXNTdHJpbmcodG9TdHJpbmdUYWdOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRvU3RyaW5nVGFnTmFtZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBDID0geC5jb25zdHJ1Y3RvcjtcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oQykgJiYgQyA9PT0gKE9iamVjdChDLnByb3RvdHlwZSkgYXMgT2JqZWN0KS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgcmV0dXJuIEMubmFtZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4KSBhcyBzdHJpbmcpLnNsaWNlKDgsIC0xKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhbWVUeXBlKGE6IGFueSwgYjogYW55KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHR5cGVvZiBhID09PSB0eXBlb2YgYjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhbWVDbGFzcyhhOiBhbnksIGI6IGFueSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBhICE9IG51bGwgJiYgYiAhPSBudWxsICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihhKSA9PT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGIpO1xufVxuXG4vKiogYHBpY2t1cEtleXNgIOOBp+aMh+WumuOBleOCjOOBn+ODl+ODreODkeODhuOCo+OBruOBv+OCkuaMgeOBpCBgdGFyZ2V0YCDjga4gU2hhbGxvdyBDb3B5IOOCkui/lOOBmSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnRpYWxpemU8VCBleHRlbmRzIG9iamVjdCwgSyBleHRlbmRzIGtleW9mIFQ+KHRhcmdldDogVCwgLi4ucGlja3VwS2V5czogS1tdKSB7XG4gICAgaWYgKCF0YXJnZXQgfHwgIWlzT2JqZWN0KHRhcmdldCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUodGFyZ2V0KX0gaXMgbm90IGFuIG9iamVjdC5gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBpY2t1cEtleXMucmVkdWNlKChvYmosIGtleSkgPT4ge1xuICAgICAgICBrZXkgaW4gdGFyZ2V0ICYmIChvYmpba2V5XSA9IHRhcmdldFtrZXldKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSBhcyB7IC1yZWFkb25seSBbUCBpbiBLXTogVFtQXTsgfSk7ICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW9iamVjdC1saXRlcmFsLXR5cGUtYXNzZXJ0aW9uXG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7IFR5cGVLZXlzLCBpcywgY2xhc3NOYW1lIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiB0aHJvd0lmTmlsKHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmICh4ID09IG51bGwpIHtcbiAgICAgICAgaXMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhIHZhbGlkIHZhbHVlLmApO1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRocm93SWZOb3RUeXBlT2YodHlwZTogVHlwZUtleXMsIHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmICh0eXBlb2YgeCAhPT0gdHlwZSkge1xuICAgICAgICBpcyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUeXBlIG9mICR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgJHt0eXBlfS5gKTtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0aHJvd0lmTm90QXJyYXkoeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHgpKSB7XG4gICAgICAgIGlzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gQXJyYXkuYCk7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGhyb3dJZk5vdEl0ZXJhYmxlKHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmICghKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoeCkpKSB7XG4gICAgICAgIGlzKG1lc3NhZ2UpIHx8IChtZXNzYWdlID0gYCR7Y2xhc3NOYW1lKHgpfSBpcyBub3QgYW4gaXRlcmFibGUgb2JqZWN0LmApO1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKG1lc3NhZ2UpO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRocm93SWZOb3RJbnN0YW5jZU9mKEM6IEZ1bmN0aW9uLCB4OiBhbnksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoISh4IGluc3RhbmNlb2YgQykpIHtcbiAgICAgICAgaXMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgJHtjbGFzc05hbWUoeCl9IGlzIG5vdCBhbiBpbnN0YW5jZSBvZiAke0MubmFtZX0uYCk7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGhyb3dJZk93bkluc3RhbmNlT2YoQzogRnVuY3Rpb24sIHg6IGFueSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoeCkgPT09IE9iamVjdChDLnByb3RvdHlwZSkpIHtcbiAgICAgICAgaXMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBwYXNzZWQgaXMgb3duIGluc3RhbmNlIG9mICR7Qy5uYW1lfS5gKTtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0aHJvd0lmTm90T3duSW5zdGFuY2VPZihDOiBGdW5jdGlvbiwgeDogYW55LCBtZXNzYWdlPzogc3RyaW5nIHwgbnVsbCk6IHZvaWQgfCBuZXZlciB7XG4gICAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZih4KSAhPT0gT2JqZWN0KEMucHJvdG90eXBlKSkge1xuICAgICAgICBpcyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IHBhc3NlZCBpcyBub3Qgb3duIGluc3RhbmNlIG9mICR7Qy5uYW1lfS5gKTtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtZXNzYWdlKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0aHJvd0lmTm90SGFzUHJvcGVydHkoeDogYW55LCBwOiBQcm9wZXJ0eUtleSwgbWVzc2FnZT86IHN0cmluZyB8IG51bGwpOiB2b2lkIHwgbmV2ZXIge1xuICAgIGlmICghKHAgaW4geCkpIHtcbiAgICAgICAgaXMobWVzc2FnZSkgfHwgKG1lc3NhZ2UgPSBgVGhlIG9iamVjdCBwYXNzZWQgZG9lcyBub3QgaGF2ZSBwcm9wZXJ0eSAke1N0cmluZyhwKX0uYCk7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGhyb3dJZk5vdEhhc093blByb3BlcnR5KHg6IGFueSwgcDogUHJvcGVydHlLZXksIG1lc3NhZ2U/OiBzdHJpbmcgfCBudWxsKTogdm9pZCB8IG5ldmVyIHtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh4LCBwKSkge1xuICAgICAgICBpcyhtZXNzYWdlKSB8fCAobWVzc2FnZSA9IGBUaGUgb2JqZWN0IHBhc3NlZCBkb2VzIG5vdCBoYXZlIG93biBwcm9wZXJ0eSAke1N0cmluZyhwKX0uYCk7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IobWVzc2FnZSk7XG4gICAgfVxufVxuIiwiLy8gZm9yIHRlc3QgVE9ETzogcmVtb3ZlXG5jb25zdCBob2dlID0gJ2hvZ2UnO1xuZXhwb3J0IHsgaG9nZSB9O1xuIl0s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
