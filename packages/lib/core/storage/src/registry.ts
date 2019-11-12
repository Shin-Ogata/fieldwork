/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    PlainObject,
    post,
    deepEqual,
    deepCopy,
} from '@cdp/core-utils';
import { EventPublisher } from '@cdp/event-publisher';
import {
    IStorage,
    IStorageOptions,
    IStorageFormatOptions,
    RegistrySchemaBase,
    RegistryEvent,
    RegistryReadOptions,
    RegistryWriteOptions,
    RegistrySaveOptions,
} from './interfaces';
import { dropUndefined } from './utils';

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
export class Registry<T extends RegistrySchemaBase = any> extends EventPublisher<RegistryEvent<T>> {

    private readonly _storage: IStorage;
    private readonly _rootKey: string;
    private readonly _defaultOptions: IStorageFormatOptions;
    private _store: PlainObject = {};

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
    constructor(storage: IStorage<any>, rootKey: string, formatSpace?: number) {
        super();
        this._storage = storage;
        this._rootKey = rootKey;
        this._defaultOptions = { jsonSpace: formatSpace };
    }

    /**
     * @en Access to root key.
     * @ja ルートキーを取得
     */
    get rootKey(): string {
        return this._rootKey;
    }

    /**
     * @en Access to [[IStorage]] object.
     * @ja [[IStorage]] オブジェクトを取得
     */
    get storage(): IStorage<any> {
        return this._storage;
    }

///////////////////////////////////////////////////////////////////////
// public methods:

    /**
     * @en
     * @ja 永続化したデータを読み込み. すでにキャッシュされているデータは破棄される
     */
    public async load(options?: IStorageOptions): Promise<void> {
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
    public async save(options?: RegistrySaveOptions): Promise<void> {
        const opts: RegistrySaveOptions = { ...this._defaultOptions, ...options };
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
    public read<K extends keyof T>(key: K, options?: RegistryReadOptions): T[K] | null {
        const { field } = options || {};
        const structure = String(key).split('/');
        const lastKey = structure.pop() as string;

        let name: string | undefined;
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
    public write<K extends keyof T>(key: K, value: T[K] | null, options?: RegistryWriteOptions): void {
        const { field, noSave, silent } = options || {};
        const remove = (null == value);
        const structure = String(key).split('/');
        const lastKey = structure.pop() as string;

        let name: string | undefined;
        let reg = this._targetRoot(field);

        while (name = structure.shift()) { // eslint-disable-line no-cond-assign
            if (name in reg) {
                reg = reg[name];
            } else if (remove) {
                return; // すでに親キーがないため何もしない
            } else {
                reg = reg[name] = {};
            }
        }

        const newVal = remove ? null : value;
        const oldVal = dropUndefined(reg[lastKey]);
        if (deepEqual(oldVal, newVal)) {
            return; // 更新なし
        } else if (remove) {
            delete reg[lastKey];
        } else {
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
    public delete<K extends keyof T>(key: K, options?: RegistryWriteOptions): void {
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
    public clear(options?: RegistryWriteOptions): void {
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
    private _targetRoot(field?: string): PlainObject {
        if (field) {
            // ensure [field] object.
            this._store[field] = this._store[field] || {};
            return this._store[field];
        } else {
            return this._store;
        }
    }
}
