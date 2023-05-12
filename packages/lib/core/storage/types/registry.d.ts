import { EventPublisher } from '@cdp/events';
import { IStorage, IStorageOptions, RegistrySchemaBase, RegistryEvent, RegistryReadOptions, RegistryWriteOptions, RegistrySaveOptions } from './interfaces';
/**
 * @en Registry management class for synchronous Read/Write accessible from any {@link IStorage} object.
 * @ja 任意の {@link IStorage} オブジェクトから同期 Read/Write アクセス可能なレジストリ管理クラス
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
 * import { webStorage } from '@cdp/runtime';
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
export declare class Registry<T extends RegistrySchemaBase = any> extends EventPublisher<RegistryEvent<T>> {
    /**
     * constructor
     *
     * @param storage
     *  - `en` Root key for {@link IStorage}.
     *  - `ja` {@link IStorage} に使用するルートキー
     * @param rootKey
     *  - `en` Root key for {@link IStorage}.
     *  - `ja` {@link IStorage} に使用するルートキー
     * @param formatSpace
     *  - `en` for JSON format space.
     *  - `ja` JSON フォーマットスペースを指定
     */
    constructor(storage: IStorage<any>, rootKey: string, formatSpace?: number);
    /**
     * @en Access to root key.
     * @ja ルートキーを取得
     */
    get rootKey(): string;
    /**
     * @en Access to {@link IStorage} object.
     * @ja {@link IStorage} オブジェクトを取得
     */
    get storage(): IStorage<any>;
    /**
     * @en Read persistence data from {@link IStorage}. The data loaded already will be cleared.
     * @ja {@link IStorage} から永続化したデータを読み込み. すでにキャッシュされているデータは破棄される
     */
    load(options?: IStorageOptions): Promise<void>;
    /**
     * @en Persist data to {@link IStorage}.
     * @ja {@link IStorage} にデータを永続化
     */
    save(options?: RegistrySaveOptions): Promise<void>;
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
    read<K extends keyof T>(key: K, options?: RegistryReadOptions): T[K] | null;
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
    write<K extends keyof T>(key: K, value: T[K] | null, options?: RegistryWriteOptions): void;
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
    delete<K extends keyof T>(key: K, options?: RegistryWriteOptions): void;
    /**
     * @en Clear all registry.
     * @ja レジストリの全削除
     *
     * @param options
     *  - `en` read options.
     *  - `ja` 書き込みオプションを指定
     */
    clear(options?: RegistryWriteOptions): void;
}
