/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

/** @internal */
function callable(): unknown {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return accessible;
}

/** @internal */
const accessible: unknown = new Proxy(callable, {
    get: (target: any, name) => {
        const prop = target[name];
        if (null != prop) {
            return prop;
        } else {
            return accessible;
        }
    },
});

/** @internal */
function create(): unknown {
    const stub = new Proxy({}, {
        get: (target: any, name) => {
            const prop = target[name];
            if (null != prop) {
                return prop;
            } else {
                return accessible;
            }
        },
    });

    Object.defineProperty(stub, 'stub', {
        value: true,
        writable: false,
    });

    return stub;
}

/**
 * @en Get safe accessible object.
 * @ja 安全にアクセス可能なオブジェクトの取得
 *
 * @example <br>
 *
 * ```ts
 * const safeWindow = safe(globalThis.window);
 * console.log(null != safeWindow.document);    // true
 * const div = safeWindow.document.createElement('div');
 * console.log(null != div);    // true
 * ```
 *
 * @param target
 *  - `en` A reference of an object with a possibility which exists.
 *  - `ja` 存在しうるオブジェクトの参照
 * @returns
 *  - `en` Reality or stub instance.
 *  - `ja` 実体またはスタブインスタンス
 */
export function safe<T>(target: T): T {
    return target || create() as T;
}
