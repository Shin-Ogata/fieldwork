/*!
 * @cdp/core-storage 0.9.0
 *   core storage utility module
 */

import { fromTypedData, deepEqual, isEmptyObject, post, deepCopy } from '@cdp/core-utils';
import { EventBroker, EventPublisher } from '@cdp/event-publisher';
import { checkCanceled } from '@cdp/promise';

/**
 * @en Convert to [[IStorage]] stocked type. <br>
 *     Ensure not to return `undefined` value.
 * @ja [[IStorage]] 格納形式に変換 <br>
 *     `undefined` を返却しないことを保証
 */
function dropUndefined(value, nilSerialize = false) {
    return null != value ? value : (nilSerialize ? String(value) : null);
}
/**
 * @en Deserialize from [[IStorage]] stocked type. <br>
 *     Convert from 'null' or 'undefined' string to original type.
 * @ja 'null' or 'undefined' をもとの型に戻す
 */
function restoreNil(value) {
    if ('null' === value) {
        return null;
    }
    else if ('undefined' === value) {
        return undefined;
    }
    else {
        return value;
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @en Memory storage class. This class doesn't support permaneciation data.
 * @ja メモリーストレージクラス. 本クラスはデータの永続化をサポートしない
 */
class MemoryStorage {
    constructor() {
        this._broker = new EventBroker();
        this._storage = {};
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IStorage
    /**
     * @en [[IStorage]] kind signature.
     * @ja [[IStorage]] の種別を表す識別子
     */
    get kind() {
        return 'memory';
    }
    async getItem(key, options) {
        options = options || {};
        await checkCanceled(options.cancel);
        // `undefined` → `null`
        const value = dropUndefined(this._storage[key]);
        switch (options.dataType) {
            case 'string':
                return fromTypedData(value);
            case 'number':
                return Number(restoreNil(value));
            case 'boolean':
                return Boolean(restoreNil(value));
            case 'object':
                return Object(restoreNil(value));
            default:
                return restoreNil(value);
        }
    }
    /**
     * @en Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
     * @ja キーを指定して値を設定. 存在しない場合は新規に作成
     *
     * @param key
     *  - `en` access key
     *  - `ja` アクセスキー
     * @param options
     *  - `en` I/O options
     *  - `ja` I/O オプション
     */
    async setItem(key, value, options) {
        options = options || {};
        await checkCanceled(options.cancel);
        const newVal = dropUndefined(value, true); // `null` or `undefined` → 'null' or 'undefined'
        const oldVal = dropUndefined(this._storage[key]); // `undefined` → `null`
        if (!deepEqual(oldVal, newVal)) {
            this._storage[key] = newVal;
            !options.silent && this._broker.publish('@', key, newVal, oldVal);
        }
    }
    /**
     * @en Removes the key/value pair with the given key from the list associated with the object, if a key/value pair with the given key exists.
     * @ja 指定されたキーに対応する値が存在すれば削除
     *
     * @param options
     *  - `en` storage options
     *  - `ja` ストレージオプション
     */
    async removeItem(key, options) {
        options = options || {};
        await checkCanceled(options.cancel);
        const oldVal = this._storage[key];
        if (undefined !== oldVal) {
            delete this._storage[key];
            !options.silent && this._broker.publish('@', key, null, oldVal);
        }
    }
    /**
     * @en Empties the list associated with the object of all key/value pairs, if there are any.
     * @ja すべてのキーに対応する値を削除
     *
     * @param options
     *  - `en` storage options
     *  - `ja` ストレージオプション
     */
    async clear(options) {
        options = options || {};
        await checkCanceled(options.cancel);
        if (!isEmptyObject(this._storage)) {
            this._storage = {};
            !options.silent && this._broker.publish('@', null, null, null);
        }
    }
    /**
     * @en Returns all entry keys.
     * @ja すべてのキー一覧を返却
     *
     * @param options
     *  - `en` cancel options
     *  - `ja` キャンセルオプション
     */
    async keys(options) {
        await checkCanceled(options && options.cancel);
        return Object.keys(this._storage);
    }
    /**
     * @en Subscrive event(s).
     * @ja イベント購読設定
     *
     * @param listener
     *  - `en` callback function.
     *  - `ja` たコールバック関数
     */
    on(listener) {
        return this._broker.on('@', listener);
    }
    /**
     * @en Unsubscribe event(s).
     * @ja イベント購読解除
     *
     * @param listener
     *  - `en` callback function.
     *         When not set this parameter, listeners are released.
     *  - `ja` コールバック関数
     *         指定しない場合はすべてを解除
     */
    off(listener) {
        this._broker.off('@', listener);
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @en Registry management class for synchronous Read/Write accessible from any [[IStorage]] object.
 * @ja 任意の [[IStorage]] オブジェクトから同期 Read/Write アクセス可能なレジストリ管理クラス
 *
 * @example <br>
 *
 * ```ts
 * // 1. define registry schema
 * interface Schema extends RegistrySchemaBase {
 *    'common/mode': 'normal' | 'specified';
 *    'common/value': number;
 *    'trade/local': { unit: '円' | '$'; rate: number; };
 *    'trade/check': boolean;
 *    'extra/user': string;
 * }
 *
 * // 2. prepare IStorage instance
 * // ex
 * import { webStorage } from '@cdp/web-storage';
 *
 * // 3. instantiate this class
 * const reg = new Registry<Schema>(webStorage, '@test');
 *
 * // 4. read example
 * const val = reg.read('common/mode'); // 'normal' | 'specified' | null
 *
 * // 5. write example
 * reg.write('common/mode', 'specified');
 * // reg.write('common/mode', 'hoge'); // compile error
 * ```
 */
class Registry extends EventPublisher {
    /**
     * constructor
     *
     * @param storage
     *  - `en` Root key for [[IStorage]].
     *  - `ja` [[IStorage]] に使用するルートキー
     * @param rootKey
     *  - `en` Root key for [[IStorage]].
     *  - `ja` [[IStorage]] に使用するルートキー
     * @param formatSpace
     *  - `en` for JSON format space.
     *  - `ja` JSON フォーマットスペースを指定
     */
    constructor(storage, rootKey, formatSpace) {
        super();
        this._store = {};
        this._storage = storage;
        this._rootKey = rootKey;
        this._defaultOptions = { jsonSpace: formatSpace };
    }
    /**
     * @en Access to root key.
     * @ja ルートキーを取得
     */
    get rootKey() {
        return this._rootKey;
    }
    /**
     * @en Access to [[IStorage]] object.
     * @ja [[IStorage]] オブジェクトを取得
     */
    get storage() {
        return this._storage;
    }
    ///////////////////////////////////////////////////////////////////////
    // public methods:
    /**
     * @en
     * @ja 永続化したデータを読み込み. すでにキャッシュされているデータは破棄される
     */
    async load(options) {
        options = options || {};
        this._store = (await this._storage.getItem(this._rootKey, options)) || {};
        if (!options.silent) {
            post(() => this.publish('change', '*'));
        }
    }
    /**
     * @en
     * @ja 永続化したデータを書き込み
     */
    async save(options) {
        const opts = { ...this._defaultOptions, ...options };
        if (!opts.silent) {
            this.publish('will-save');
        }
        await this._storage.setItem(this._rootKey, this._store, opts);
    }
    /**
     * @en Read registry value.
     * @ja レジストリ値の読み取り
     *
     * @param key
     *  - `en` target registry key.
     *  - `ja` 対象のレジストリキーを指定
     * @param options
     *  - `en` read options.
     *  - `ja` 読み取りオプションを指定
     */
    read(key, options) {
        const { field } = options || {};
        const structure = String(key).split('/');
        const lastKey = structure.pop();
        let name;
        let reg = this._targetRoot(field);
        while (name = structure.shift()) { // eslint-disable-line no-cond-assign
            if (!(name in reg)) {
                return null;
            }
            reg = reg[name];
        }
        // return deep copy
        return (null != reg[lastKey]) ? deepCopy(reg[lastKey]) : null;
    }
    /**
     * @en Write registry value.
     * @ja レジストリ値の書き込み
     *
     * @param key
     *  - `en` target registry key.
     *  - `ja` 対象のレジストリキーを指定
     * @param value
     *  - `en` update value. if `null` set to delete.
     *  - `ja` 更新する値. `null` は削除
     * @param options
     *  - `en` write options.
     *  - `ja` 書き込みオプションを指定
     */
    write(key, value, options) {
        const { field, noSave, silent } = options || {};
        const remove = (null == value);
        const structure = String(key).split('/');
        const lastKey = structure.pop();
        let name;
        let reg = this._targetRoot(field);
        while (name = structure.shift()) { // eslint-disable-line no-cond-assign
            if (name in reg) {
                reg = reg[name];
            }
            else if (remove) {
                return; // すでに親キーがないため何もしない
            }
            else {
                reg = reg[name] = {};
            }
        }
        const newVal = remove ? null : value;
        const oldVal = dropUndefined(reg[lastKey]);
        if (deepEqual(oldVal, newVal)) {
            return; // 更新なし
        }
        else if (remove) {
            delete reg[lastKey];
        }
        else {
            reg[lastKey] = deepCopy(newVal);
        }
        if (!noSave) {
            // no fire notification
            this._storage.setItem(this._rootKey, this._store, { ...this._defaultOptions, ...options });
        }
        if (!silent) {
            post(() => this.publish('change', key, newVal, oldVal));
        }
    }
    /**
     * @en Delete registry key.
     * @ja レジストリキーの削除
     *
     * @param key
     *  - `en` target registry key.
     *  - `ja` 対象のレジストリキーを指定
     * @param options
     *  - `en` read options.
     *  - `ja` 書き込みオプションを指定
     */
    delete(key, options) {
        this.write(key, null, options);
    }
    /**
     * @en Clear all registry.
     * @ja レジストリの全削除
     *
     * @param options
     *  - `en` read options.
     *  - `ja` 書き込みオプションを指定
     */
    clear(options) {
        options = options || {};
        this._store = {};
        this._storage.removeItem(this._rootKey, options);
        if (!options.silent) {
            this.publish('change', null, null, null);
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // private methods:
    /** get root object */
    _targetRoot(field) {
        if (field) {
            // ensure [field] object.
            this._store[field] = this._store[field] || {};
            return this._store[field];
        }
        else {
            return this._store;
        }
    }
}

export { MemoryStorage, Registry, dropUndefined, restoreNil };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS1zdG9yYWdlLm1qcyIsInNvdXJjZXMiOlsidXRpbHMudHMiLCJtZW1vcnktc3RvcmFnZS50cyIsInJlZ2lzdHJ5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGVuIENvbnZlcnQgdG8gW1tJU3RvcmFnZV1dIHN0b2NrZWQgdHlwZS4gPGJyPlxuICogICAgIEVuc3VyZSBub3QgdG8gcmV0dXJuIGB1bmRlZmluZWRgIHZhbHVlLlxuICogQGphIFtbSVN0b3JhZ2VdXSDmoLzntI3lvaLlvI/jgavlpInmj5sgPGJyPlxuICogICAgIGB1bmRlZmluZWRgIOOCkui/lOWNtOOBl+OBquOBhOOBk+OBqOOCkuS/neiovFxuICovXG5leHBvcnQgZnVuY3Rpb24gZHJvcFVuZGVmaW5lZDxUPih2YWx1ZTogVCB8IG51bGwgfCB1bmRlZmluZWQsIG5pbFNlcmlhbGl6ZSA9IGZhbHNlKTogVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbCB7XG4gICAgcmV0dXJuIG51bGwgIT0gdmFsdWUgPyB2YWx1ZSA6IChuaWxTZXJpYWxpemUgPyBTdHJpbmcodmFsdWUpIDogbnVsbCkgYXMgVCB8ICdudWxsJyB8ICd1bmRlZmluZWQnIHwgbnVsbDtcbn1cblxuLyoqXG4gKiBAZW4gRGVzZXJpYWxpemUgZnJvbSBbW0lTdG9yYWdlXV0gc3RvY2tlZCB0eXBlLiA8YnI+XG4gKiAgICAgQ29udmVydCBmcm9tICdudWxsJyBvciAndW5kZWZpbmVkJyBzdHJpbmcgdG8gb3JpZ2luYWwgdHlwZS5cbiAqIEBqYSAnbnVsbCcgb3IgJ3VuZGVmaW5lZCcg44KS44KC44Go44Gu5Z6L44Gr5oi744GZXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXN0b3JlTmlsPFQ+KHZhbHVlOiBUIHwgJ251bGwnIHwgJ3VuZGVmaW5lZCcpOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCdudWxsJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICgndW5kZWZpbmVkJyA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxufVxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSAqL1xuXG5pbXBvcnQge1xuICAgIFBsYWluT2JqZWN0LFxuICAgIEtleXMsXG4gICAgVHlwZXMsXG4gICAgS2V5VG9UeXBlLFxuICAgIGRlZXBFcXVhbCxcbiAgICBpc0VtcHR5T2JqZWN0LFxuICAgIGZyb21UeXBlZERhdGEsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudC1wdWJsaXNoZXInO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIFN0b3JhZ2VEYXRhVHlwZUxpc3QsXG4gICAgU3RvcmFnZUlucHV0RGF0YVR5cGVMaXN0LFxuICAgIElTdG9yYWdlT3B0aW9ucyxcbiAgICBJU3RvcmFnZURhdGFPcHRpb25zLFxuICAgIElTdG9yYWdlRXZlbnRDYWxsYmFjayxcbiAgICBJU3RvcmFnZSxcbn0gZnJvbSAnLi9pbnRlcmZhY2VzJztcbmltcG9ydCB7IGRyb3BVbmRlZmluZWQsIHJlc3RvcmVOaWwgfSBmcm9tICcuL3V0aWxzJztcblxuLyoqIE1lbW9yeVN0b3JhZ2UgSS9PIG9wdGlvbnMgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VPcHRpb25zPEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IElTdG9yYWdlRGF0YU9wdGlvbnM8U3RvcmFnZURhdGFUeXBlTGlzdCwgSz47XG4vKiogTWVtb3J5U3RvcmFnZSByZXR1cm4gdmFsdWUgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VSZXN1bHQ8SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gS2V5VG9UeXBlPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEs+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzID0gVHlwZXM8U3RvcmFnZURhdGFUeXBlTGlzdD47XG4vKiogTWVtb3J5U3RvcmFnZSBpbnB1dCBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcyA9IFN0b3JhZ2VJbnB1dERhdGFUeXBlTGlzdDxTdG9yYWdlRGF0YVR5cGVMaXN0Pjtcbi8qKiBNZW1vcnlTdG9yYWdlIGV2ZW50IGNhbGxiYWNrICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjayA9IElTdG9yYWdlRXZlbnRDYWxsYmFjazxTdG9yYWdlRGF0YVR5cGVMaXN0PjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIE1lbW9yeVN0b3JhZ2VFdmVudCB7XG4gICAgJ0AnOiBbc3RyaW5nIHwgbnVsbCwgVHlwZXM8U3RvcmFnZURhdGFUeXBlTGlzdD4gfCBudWxsLCBUeXBlczxTdG9yYWdlRGF0YVR5cGVMaXN0PiB8IG51bGxdO1xufVxuXG4vKipcbiAqIEBlbiBNZW1vcnkgc3RvcmFnZSBjbGFzcy4gVGhpcyBjbGFzcyBkb2Vzbid0IHN1cHBvcnQgcGVybWFuZWNpYXRpb24gZGF0YS5cbiAqIEBqYSDjg6Hjg6Ljg6rjg7zjgrnjg4jjg6zjg7zjgrjjgq/jg6njgrkuIOacrOOCr+ODqeOCueOBr+ODh+ODvOOCv+OBruawuOe2muWMluOCkuOCteODneODvOODiOOBl+OBquOBhFxuICovXG5leHBvcnQgY2xhc3MgTWVtb3J5U3RvcmFnZSBpbXBsZW1lbnRzIElTdG9yYWdlIHtcblxuICAgIHByaXZhdGUgX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxNZW1vcnlTdG9yYWdlRXZlbnQ+KCk7XG4gICAgcHJpdmF0ZSBfc3RvcmFnZTogUGxhaW5PYmplY3QgPSB7fTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElTdG9yYWdlXG4gICAgLyoqXG4gICAgICogQGVuIFtbSVN0b3JhZ2VdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJU3RvcmFnZV1dIOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnbWVtb3J5JztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGtleSwgb3IgbnVsbCBpZiB0aGUgZ2l2ZW4ga2V5IGRvZXMgbm90IGV4aXN0IGluIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LlxuICAgICAqIEBqYSDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLlj5blvpcuIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBryBudWxsIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIFJldHVybnMgdGhlIHZhbHVlIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEga2V5IHdpdGggdHlwZSBjaGFuZ2UgZGVzaWduYXRlZCBpbiBgZGF0YVR5cGVgLlxuICAgICAqICAtIGBqYWAgYGRhdGFUeXBlYCDjgafmjIflrprjgZXjgozjgZ/lnovlpInmj5vjgpLooYzjgaPjgaYsIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIGFzeW5jIGdldEl0ZW08RCBleHRlbmRzIFR5cGVzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+ID0gVHlwZXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPG5ldmVyPlxuICAgICk6IFByb21pc2U8VHlwZXM8U3RvcmFnZURhdGFUeXBlTGlzdD4gfCBudWxsPjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgYXN5bmMgZ2V0SXRlbTxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogTWVtb3J5U3RvcmFnZU9wdGlvbnM8Sz5cbiAgICApOiBQcm9taXNlPE1lbW9yeVN0b3JhZ2VSZXN1bHQ8Sz4gfCBudWxsPjtcblxuICAgIGFzeW5jIGdldEl0ZW0oa2V5OiBzdHJpbmcsIG9wdGlvbnM/OiBNZW1vcnlTdG9yYWdlT3B0aW9uczxhbnk+KTogUHJvbWlzZTxUeXBlczxTdG9yYWdlRGF0YVR5cGVMaXN0PiB8IG51bGw+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcblxuICAgICAgICAvLyBgdW5kZWZpbmVkYCDihpIgYG51bGxgXG4gICAgICAgIGNvbnN0IHZhbHVlID0gZHJvcFVuZGVmaW5lZCh0aGlzLl9zdG9yYWdlW2tleV0pO1xuICAgICAgICBzd2l0Y2ggKG9wdGlvbnMuZGF0YVR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZyb21UeXBlZERhdGEodmFsdWUpIGFzIHN0cmluZztcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlcihyZXN0b3JlTmlsKHZhbHVlKSk7XG4gICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gQm9vbGVhbihyZXN0b3JlTmlsKHZhbHVlKSk7XG4gICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBPYmplY3QocmVzdG9yZU5pbCh2YWx1ZSkpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdG9yZU5pbCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU2V0cyB0aGUgdmFsdWUgb2YgdGhlIHBhaXIgaWRlbnRpZmllZCBieSBrZXkgdG8gdmFsdWUsIGNyZWF0aW5nIGEgbmV3IGtleS92YWx1ZSBwYWlyIGlmIG5vbmUgZXhpc3RlZCBmb3Iga2V5IHByZXZpb3VzbHkuXG4gICAgICogQGphIOOCreODvOOCkuaMh+WumuOBl+OBpuWApOOCkuioreWumi4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44Gv5paw6KaP44Gr5L2c5oiQXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBzZXRJdGVtPFYgZXh0ZW5kcyBNZW1vcnlTdG9yYWdlSW5wdXREYXRhVHlwZXM+KGtleTogc3RyaW5nLCB2YWx1ZTogViwgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPG5ldmVyPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBkcm9wVW5kZWZpbmVkKHZhbHVlLCB0cnVlKTsgICAgICAgICAvLyBgbnVsbGAgb3IgYHVuZGVmaW5lZGAg4oaSICdudWxsJyBvciAndW5kZWZpbmVkJ1xuICAgICAgICBjb25zdCBvbGRWYWwgPSBkcm9wVW5kZWZpbmVkKHRoaXMuX3N0b3JhZ2Vba2V5XSk7ICAvLyBgdW5kZWZpbmVkYCDihpIgYG51bGxgXG4gICAgICAgIGlmICghZGVlcEVxdWFsKG9sZFZhbCwgbmV3VmFsKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVtrZXldID0gbmV3VmFsO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci5wdWJsaXNoKCdAJywga2V5LCBuZXdWYWwsIG9sZFZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlcyB0aGUga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QsIGlmIGEga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGV4aXN0cy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kt44O844Gr5a++5b+c44GZ44KL5YCk44GM5a2Y5Zyo44GZ44KM44Gw5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyByZW1vdmVJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IHRoaXMuX3N0b3JhZ2Vba2V5XTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gb2xkVmFsKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fc3RvcmFnZVtrZXldO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci5wdWJsaXNoKCdAJywga2V5LCBudWxsLCBvbGRWYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVtcHRpZXMgdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3Qgb2YgYWxsIGtleS92YWx1ZSBwYWlycywgaWYgdGhlcmUgYXJlIGFueS5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBjbGVhcihvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGlmICghaXNFbXB0eU9iamVjdCh0aGlzLl9zdG9yYWdlKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHt9O1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci5wdWJsaXNoKCdAJywgbnVsbCwgbnVsbCwgbnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbGwgZW50cnkga2V5cy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O85LiA6Kan44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY2FuY2VsIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGtleXMob3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMgJiYgb3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RvcmFnZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24obGlzdGVuZXI6IE1lbW9yeVN0b3JhZ2VFdmVudENhbGxiYWNrKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jyb2tlci5vbignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogTWVtb3J5U3RvcmFnZUV2ZW50Q2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYnJva2VyLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG59XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgcG9zdCxcbiAgICBkZWVwRXF1YWwsXG4gICAgZGVlcENvcHksXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBFdmVudFB1Ymxpc2hlciB9IGZyb20gJ0BjZHAvZXZlbnQtcHVibGlzaGVyJztcbmltcG9ydCB7XG4gICAgSVN0b3JhZ2UsXG4gICAgSVN0b3JhZ2VPcHRpb25zLFxuICAgIElTdG9yYWdlRm9ybWF0T3B0aW9ucyxcbiAgICBSZWdpc3RyeVNjaGVtYUJhc2UsXG4gICAgUmVnaXN0cnlFdmVudCxcbiAgICBSZWdpc3RyeVJlYWRPcHRpb25zLFxuICAgIFJlZ2lzdHJ5V3JpdGVPcHRpb25zLFxuICAgIFJlZ2lzdHJ5U2F2ZU9wdGlvbnMsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBkcm9wVW5kZWZpbmVkIH0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQGVuIFJlZ2lzdHJ5IG1hbmFnZW1lbnQgY2xhc3MgZm9yIHN5bmNocm9ub3VzIFJlYWQvV3JpdGUgYWNjZXNzaWJsZSBmcm9tIGFueSBbW0lTdG9yYWdlXV0gb2JqZWN0LlxuICogQGphIOS7u+aEj+OBriBbW0lTdG9yYWdlXV0g44Kq44OW44K444Kn44Kv44OI44GL44KJ5ZCM5pyfIFJlYWQvV3JpdGUg44Ki44Kv44K744K55Y+v6IO944Gq44Os44K444K544OI44Oq566h55CG44Kv44Op44K5XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiAvLyAxLiBkZWZpbmUgcmVnaXN0cnkgc2NoZW1hXG4gKiBpbnRlcmZhY2UgU2NoZW1hIGV4dGVuZHMgUmVnaXN0cnlTY2hlbWFCYXNlIHtcbiAqICAgICdjb21tb24vbW9kZSc6ICdub3JtYWwnIHwgJ3NwZWNpZmllZCc7XG4gKiAgICAnY29tbW9uL3ZhbHVlJzogbnVtYmVyO1xuICogICAgJ3RyYWRlL2xvY2FsJzogeyB1bml0OiAn5YaGJyB8ICckJzsgcmF0ZTogbnVtYmVyOyB9O1xuICogICAgJ3RyYWRlL2NoZWNrJzogYm9vbGVhbjtcbiAqICAgICdleHRyYS91c2VyJzogc3RyaW5nO1xuICogfVxuICpcbiAqIC8vIDIuIHByZXBhcmUgSVN0b3JhZ2UgaW5zdGFuY2VcbiAqIC8vIGV4XG4gKiBpbXBvcnQgeyB3ZWJTdG9yYWdlIH0gZnJvbSAnQGNkcC93ZWItc3RvcmFnZSc7XG4gKlxuICogLy8gMy4gaW5zdGFudGlhdGUgdGhpcyBjbGFzc1xuICogY29uc3QgcmVnID0gbmV3IFJlZ2lzdHJ5PFNjaGVtYT4od2ViU3RvcmFnZSwgJ0B0ZXN0Jyk7XG4gKlxuICogLy8gNC4gcmVhZCBleGFtcGxlXG4gKiBjb25zdCB2YWwgPSByZWcucmVhZCgnY29tbW9uL21vZGUnKTsgLy8gJ25vcm1hbCcgfCAnc3BlY2lmaWVkJyB8IG51bGxcbiAqXG4gKiAvLyA1LiB3cml0ZSBleGFtcGxlXG4gKiByZWcud3JpdGUoJ2NvbW1vbi9tb2RlJywgJ3NwZWNpZmllZCcpO1xuICogLy8gcmVnLndyaXRlKCdjb21tb24vbW9kZScsICdob2dlJyk7IC8vIGNvbXBpbGUgZXJyb3JcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgUmVnaXN0cnk8VCBleHRlbmRzIFJlZ2lzdHJ5U2NoZW1hQmFzZSA9IGFueT4gZXh0ZW5kcyBFdmVudFB1Ymxpc2hlcjxSZWdpc3RyeUV2ZW50PFQ+PiB7XG5cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdG9yYWdlOiBJU3RvcmFnZTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9yb290S2V5OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfZGVmYXVsdE9wdGlvbnM6IElTdG9yYWdlRm9ybWF0T3B0aW9ucztcbiAgICBwcml2YXRlIF9zdG9yZTogUGxhaW5PYmplY3QgPSB7fTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RvcmFnZVxuICAgICAqICAtIGBlbmAgUm9vdCBrZXkgZm9yIFtbSVN0b3JhZ2VdXS5cbiAgICAgKiAgLSBgamFgIFtbSVN0b3JhZ2VdXSDjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jjgq3jg7xcbiAgICAgKiBAcGFyYW0gcm9vdEtleVxuICAgICAqICAtIGBlbmAgUm9vdCBrZXkgZm9yIFtbSVN0b3JhZ2VdXS5cbiAgICAgKiAgLSBgamFgIFtbSVN0b3JhZ2VdXSDjgavkvb/nlKjjgZnjgovjg6vjg7zjg4jjgq3jg7xcbiAgICAgKiBAcGFyYW0gZm9ybWF0U3BhY2VcbiAgICAgKiAgLSBgZW5gIGZvciBKU09OIGZvcm1hdCBzcGFjZS5cbiAgICAgKiAgLSBgamFgIEpTT04g44OV44Kp44O844Oe44OD44OI44K544Oa44O844K544KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RvcmFnZTogSVN0b3JhZ2U8YW55Piwgcm9vdEtleTogc3RyaW5nLCBmb3JtYXRTcGFjZT86IG51bWJlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gc3RvcmFnZTtcbiAgICAgICAgdGhpcy5fcm9vdEtleSA9IHJvb3RLZXk7XG4gICAgICAgIHRoaXMuX2RlZmF1bHRPcHRpb25zID0geyBqc29uU3BhY2U6IGZvcm1hdFNwYWNlIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byByb290IGtleS5cbiAgICAgKiBAamEg44Or44O844OI44Kt44O844KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHJvb3RLZXkoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Jvb3RLZXk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEFjY2VzcyB0byBbW0lTdG9yYWdlXV0gb2JqZWN0LlxuICAgICAqIEBqYSBbW0lTdG9yYWdlXV0g44Kq44OW44K444Kn44Kv44OI44KS5Y+W5b6XXG4gICAgICovXG4gICAgZ2V0IHN0b3JhZ2UoKTogSVN0b3JhZ2U8YW55PiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIHB1YmxpYyBtZXRob2RzOlxuXG4gICAgLyoqXG4gICAgICogQGVuXG4gICAgICogQGphIOawuOe2muWMluOBl+OBn+ODh+ODvOOCv+OCkuiqreOBv+i+vOOBvy4g44GZ44Gn44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gm44GE44KL44OH44O844K/44Gv56C05qOE44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGxvYWQob3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5fc3RvcmUgPSAoYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtKHRoaXMuX3Jvb3RLZXksIG9wdGlvbnMpKSB8fCB7fTtcbiAgICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICAgICAgcG9zdCgoKSA9PiB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsICcqJykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuXG4gICAgICogQGphIOawuOe2muWMluOBl+OBn+ODh+ODvOOCv+OCkuabuOOBjei+vOOBv1xuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlKG9wdGlvbnM/OiBSZWdpc3RyeVNhdmVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHM6IFJlZ2lzdHJ5U2F2ZU9wdGlvbnMgPSB7IC4uLnRoaXMuX2RlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH07XG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1zYXZlJyk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHRoaXMuX3Jvb3RLZXksIHRoaXMuX3N0b3JlLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVhZCByZWdpc3RyeSB2YWx1ZS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq5YCk44Gu6Kqt44G/5Y+W44KKXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZWFkPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk6IEssIG9wdGlvbnM/OiBSZWdpc3RyeVJlYWRPcHRpb25zKTogVFtLXSB8IG51bGwge1xuICAgICAgICBjb25zdCB7IGZpZWxkIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCBzdHJ1Y3R1cmUgPSBTdHJpbmcoa2V5KS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0S2V5ID0gc3RydWN0dXJlLnBvcCgpIGFzIHN0cmluZztcblxuICAgICAgICBsZXQgbmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcmVnID0gdGhpcy5fdGFyZ2V0Um9vdChmaWVsZCk7XG5cbiAgICAgICAgd2hpbGUgKG5hbWUgPSBzdHJ1Y3R1cmUuc2hpZnQoKSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbmQtYXNzaWduXG4gICAgICAgICAgICBpZiAoIShuYW1lIGluIHJlZykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlZyA9IHJlZ1tuYW1lXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJldHVybiBkZWVwIGNvcHlcbiAgICAgICAgcmV0dXJuIChudWxsICE9IHJlZ1tsYXN0S2V5XSkgPyBkZWVwQ29weShyZWdbbGFzdEtleV0pIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gV3JpdGUgcmVnaXN0cnkgdmFsdWUuXG4gICAgICogQGphIOODrOOCuOOCueODiOODquWApOOBruabuOOBjei+vOOBv1xuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgdGFyZ2V0IHJlZ2lzdHJ5IGtleS5cbiAgICAgKiAgLSBgamFgIOWvvuixoeOBruODrOOCuOOCueODiOODquOCreODvOOCkuaMh+WumlxuICAgICAqIEBwYXJhbSB2YWx1ZVxuICAgICAqICAtIGBlbmAgdXBkYXRlIHZhbHVlLiBpZiBgbnVsbGAgc2V0IHRvIGRlbGV0ZS5cbiAgICAgKiAgLSBgamFgIOabtOaWsOOBmeOCi+WApC4gYG51bGxgIOOBr+WJiumZpFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB3cml0ZSBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5pu444GN6L6844G/44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIHdyaXRlPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk6IEssIHZhbHVlOiBUW0tdIHwgbnVsbCwgb3B0aW9ucz86IFJlZ2lzdHJ5V3JpdGVPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgZmllbGQsIG5vU2F2ZSwgc2lsZW50IH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCByZW1vdmUgPSAobnVsbCA9PSB2YWx1ZSk7XG4gICAgICAgIGNvbnN0IHN0cnVjdHVyZSA9IFN0cmluZyhrZXkpLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RLZXkgPSBzdHJ1Y3R1cmUucG9wKCkgYXMgc3RyaW5nO1xuXG4gICAgICAgIGxldCBuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGxldCByZWcgPSB0aGlzLl90YXJnZXRSb290KGZpZWxkKTtcblxuICAgICAgICB3aGlsZSAobmFtZSA9IHN0cnVjdHVyZS5zaGlmdCgpKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uZC1hc3NpZ25cbiAgICAgICAgICAgIGlmIChuYW1lIGluIHJlZykge1xuICAgICAgICAgICAgICAgIHJlZyA9IHJlZ1tuYW1lXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyDjgZnjgafjgavopqrjgq3jg7zjgYzjgarjgYTjgZ/jgoHkvZXjgoLjgZfjgarjgYRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVnID0gcmVnW25hbWVdID0ge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBuZXdWYWwgPSByZW1vdmUgPyBudWxsIDogdmFsdWU7XG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IGRyb3BVbmRlZmluZWQocmVnW2xhc3RLZXldKTtcbiAgICAgICAgaWYgKGRlZXBFcXVhbChvbGRWYWwsIG5ld1ZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8g5pu05paw44Gq44GXXG4gICAgICAgIH0gZWxzZSBpZiAocmVtb3ZlKSB7XG4gICAgICAgICAgICBkZWxldGUgcmVnW2xhc3RLZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVnW2xhc3RLZXldID0gZGVlcENvcHkobmV3VmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbm9TYXZlKSB7XG4gICAgICAgICAgICAvLyBubyBmaXJlIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHRoaXMuX3Jvb3RLZXksIHRoaXMuX3N0b3JlLCB7IC4uLnRoaXMuX2RlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIHBvc3QoKCkgPT4gdGhpcy5wdWJsaXNoKCdjaGFuZ2UnLCBrZXksIG5ld1ZhbCwgb2xkVmFsKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRGVsZXRlIHJlZ2lzdHJ5IGtleS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq44Kt44O844Gu5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOabuOOBjei+vOOBv+OCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBkZWxldGU8SyBleHRlbmRzIGtleW9mIFQ+KGtleTogSywgb3B0aW9ucz86IFJlZ2lzdHJ5V3JpdGVPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIHRoaXMud3JpdGUoa2V5LCBudWxsLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gQ2xlYXIgYWxsIHJlZ2lzdHJ5LlxuICAgICAqIEBqYSDjg6zjgrjjgrnjg4jjg6rjga7lhajliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCByZWFkIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmm7jjgY3ovrzjgb/jgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgY2xlYXIob3B0aW9ucz86IFJlZ2lzdHJ5V3JpdGVPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB0aGlzLl9zdG9yZSA9IHt9O1xuICAgICAgICB0aGlzLl9zdG9yYWdlLnJlbW92ZUl0ZW0odGhpcy5fcm9vdEtleSwgb3B0aW9ucyk7XG4gICAgICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnY2hhbmdlJywgbnVsbCwgbnVsbCwgbnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwcml2YXRlIG1ldGhvZHM6XG5cbiAgICAvKiogZ2V0IHJvb3Qgb2JqZWN0ICovXG4gICAgcHJpdmF0ZSBfdGFyZ2V0Um9vdChmaWVsZD86IHN0cmluZyk6IFBsYWluT2JqZWN0IHtcbiAgICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgICAgICAvLyBlbnN1cmUgW2ZpZWxkXSBvYmplY3QuXG4gICAgICAgICAgICB0aGlzLl9zdG9yZVtmaWVsZF0gPSB0aGlzLl9zdG9yZVtmaWVsZF0gfHwge307XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmVbZmllbGRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JlO1xuICAgICAgICB9XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7Ozs7O0FBTUEsU0FBZ0IsYUFBYSxDQUFJLEtBQTJCLEVBQUUsWUFBWSxHQUFHLEtBQUs7SUFDOUUsT0FBTyxJQUFJLElBQUksS0FBSyxHQUFHLEtBQUssSUFBSSxZQUFZLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBb0MsQ0FBQztDQUMzRzs7Ozs7O0FBT0QsU0FBZ0IsVUFBVSxDQUFJLEtBQStCO0lBQ3pELElBQUksTUFBTSxLQUFLLEtBQUssRUFBRTtRQUNsQixPQUFPLElBQUksQ0FBQztLQUNmO1NBQU0sSUFBSSxXQUFXLEtBQUssS0FBSyxFQUFFO1FBQzlCLE9BQU8sU0FBUyxDQUFDO0tBQ3BCO1NBQU07UUFDSCxPQUFPLEtBQUssQ0FBQztLQUNoQjtDQUNKOztBQ3ZCRDtBQUVBLEFBd0NBOzs7O0FBSUEsTUFBYSxhQUFh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LEVBQUU7WUFDM0IsT0FBTztTQUNWO2FBQU0sSUFBSSxNQUFNLEVBQUU7WUFDZixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN2QjthQUFNO1lBQ0gsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNuQztRQUVELElBQUksQ0FBQyxNQUFNLEVBQUU7O1lBRVQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsT0FBTyxFQUFFLENBQUMsQ0FBQztTQUM5RjtRQUVELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDVCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDM0Q7S0FDSjs7Ozs7Ozs7Ozs7O0lBYU0sTUFBTSxDQUFvQixHQUFNLEVBQUUsT0FBOEI7UUFDbkUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ2xDOzs7Ozs7Ozs7SUFVTSxLQUFLLENBQUMsT0FBOEI7UUFDdkMsT0FBTyxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtZQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQzVDO0tBQ0o7Ozs7SUFNTyxXQUFXLENBQUMsS0FBYztRQUM5QixJQUFJLEtBQUssRUFBRTs7WUFFUCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM3QjthQUFNO1lBQ0gsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO1NBQ3RCO0tBQ0o7Q0FDSjs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvY29yZS1zdG9yYWdlLyJ9
