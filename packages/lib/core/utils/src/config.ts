import type { UnknownObject } from './types';

/**
 * @en Safe `global` accessor.
 * @ja `global` アクセッサ
 * 
 * @returns
 *  - `en` `global` object of the runtime environment
 *  - `ja` 環境に応じた `global` オブジェクト
 */
export function getGlobal(): typeof globalThis {
    // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
    return ('object' === typeof globalThis) ? globalThis : Function('return this')();
}

/**
 * @en Ensure named object as parent's property.
 * @ja 親オブジェクトを指定して, 名前に指定したオブジェクトの存在を保証
 *
 * @param parent
 *  - `en` parent object. If null given, `globalThis` is assigned.
 *  - `ja` 親オブジェクト. null の場合は `globalThis` が使用される
 * @param names
 *  - `en` object name chain for ensure instance.
 *  - `ja` 保証するオブジェクトの名前
 */
export function ensureObject<T extends object = UnknownObject>(parent: object | null, ...names: string[]): T {
    let root = (parent ?? getGlobal()) as UnknownObject;
    for (const name of names) {
        root[name] = root[name] || {};
        root = root[name] as UnknownObject;
    }
    return root as T;
}

/**
 * @en Global namespace accessor.
 * @ja グローバルネームスペースアクセッサ
 */
export function getGlobalNamespace<T extends object = UnknownObject>(namespace: string): T {
    return ensureObject<T>(null, namespace);
}

/**
 * @en Global config accessor.
 * @ja グローバルコンフィグアクセッサ
 *
 * @returns default: `CDP.Config`
 */
export function getConfig<T extends object = UnknownObject>(namespace = 'CDP', configName = 'Config'): T {
    return ensureObject<T>(getGlobalNamespace(namespace), configName);
}
