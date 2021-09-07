/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import {
    post,
    deepEqual,
    deepCopy,
    dropUndefined,
} from '@cdp/core-utils';
import { EventPublisher } from '@cdp/events';
import {
    StorageData,
    IStorage,
    IStorageOptions,
    IStorageFormatOptions,
    RegistrySchemaBase,
    RegistryEvent,
    RegistryReadOptions,
    RegistryWriteOptions,
    RegistrySaveOptions,
} from './interfaces';

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

    /** @internal */
    private readonly _storage: IStorage;
    /** @internal */
    private readonly _rootKey: string;
    /** @internal */
    private readonly _defaultOptions: IStorageFormatOptions;
    /** @internal */
    private _store: StorageData = {};

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
     * @en Read persistence data from [[IStorage]]. The data loaded already will be cleared.
     * @ja [[IStorage]] から永続化したデータを読み込み. すでにキャッシュされているデータは破棄される
     */
    public async load(options?: IStorageOptions): Promise<void> {
        options = options || {};
        this._store = (await this._storage.getItem(this._rootKey, options)) || {};
        if (!options.silent) {
            void post(() => this.publish('change', '*'));
        }
    }

    /**
     * @en Persist data to [[IStorage]].
     * @ja [[IStorage]] にデータを永続化
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
        let reg = this.targetRoot(field);

        while (name = structure.shift()) { // eslint-disable-line no-cond-assign
            if (!(name in reg)) {
                return null;
            }
            reg = reg[name] as StorageData;
        }

        // return deep copy
        return (null != reg[lastKey]) ? deepCopy(reg[lastKey]) as any : null;
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
        let reg = this.targetRoot(field);

        while (name = structure.shift()) { // eslint-disable-line no-cond-assign
            if (name in reg) {
                reg = reg[name] as StorageData;
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
            reg[lastKey] = deepCopy(newVal) as any;
        }

        if (!noSave) {
            // no fire notification
            void this._storage.setItem(this._rootKey, this._store, { ...this._defaultOptions, ...options });
        }

        if (!silent) {
            void post(() => this.publish('change', key, newVal, oldVal as any));
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
        void this._storage.removeItem(this._rootKey, options);
        if (!options.silent) {
            this.publish('change', null, null, null);
        }
    }

///////////////////////////////////////////////////////////////////////
// private methods:

    /** @internal get root object */
    private targetRoot(field?: string): StorageData {
        if (field) {
            // ensure [field] object.
            this._store[field] = this._store[field] || {};
            return this._store[field] as StorageData;
        } else {
            return this._store;
        }
    }
}
