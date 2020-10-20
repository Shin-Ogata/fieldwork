/*!
 * @cdp/core-storage 0.9.0
 *   core storage utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/promise')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events', '@cdp/promise'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, coreUtils, events, promise) { 'use strict';

    /* eslint-disable
        @typescript-eslint/no-explicit-any
     */
    //__________________________________________________________________________________________________//
    /**
     * @en Memory storage class. This class doesn't support permaneciation data.
     * @ja メモリーストレージクラス. 本クラスはデータの永続化をサポートしない
     */
    class MemoryStorage {
        constructor() {
            this._broker = new events.EventBroker();
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
            await promise.checkCanceled(options.cancel);
            // `undefined` → `null`
            const value = coreUtils.dropUndefined(this._storage[key]);
            switch (options.dataType) {
                case 'string':
                    return coreUtils.fromTypedData(value);
                case 'number':
                    return Number(coreUtils.restoreNil(value));
                case 'boolean':
                    return Boolean(coreUtils.restoreNil(value));
                case 'object':
                    return Object(coreUtils.restoreNil(value));
                default:
                    return coreUtils.restoreNil(value);
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
            await promise.checkCanceled(options.cancel);
            const newVal = coreUtils.dropUndefined(value, true); // `null` or `undefined` → 'null' or 'undefined'
            const oldVal = coreUtils.dropUndefined(this._storage[key]); // `undefined` → `null`
            if (!coreUtils.deepEqual(oldVal, newVal)) {
                this._storage[key] = newVal;
                !options.silent && this._broker.trigger('@', key, newVal, oldVal);
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
            await promise.checkCanceled(options.cancel);
            const oldVal = this._storage[key];
            if (undefined !== oldVal) {
                delete this._storage[key];
                !options.silent && this._broker.trigger('@', key, null, oldVal);
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
            await promise.checkCanceled(options.cancel);
            if (!coreUtils.isEmptyObject(this._storage)) {
                this._storage = {};
                !options.silent && this._broker.trigger('@', null, null, null);
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
            await promise.checkCanceled(options && options.cancel);
            return Object.keys(this._storage);
        }
        /**
         * @en Subscrive event(s).
         * @ja イベント購読設定
         *
         * @param listener
         *  - `en` callback function.
         *  - `ja` コールバック関数
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
        ///////////////////////////////////////////////////////////////////////
        // operations:
        /**
         * @en Return a shallow copy of the storage's attributes for JSON stringification.
         * @ja JSON stringify のためにストレージプロパティのシャローコピー返却
         */
        get context() {
            return this._storage;
        }
    }
    // default storage
    const memoryStorage = new MemoryStorage();

    /* eslint-disable
        @typescript-eslint/no-explicit-any
     */
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
    class Registry extends events.EventPublisher {
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
         * @en Read persistence data from [[IStorage]]. The data loaded already will be cleared.
         * @ja [[IStorage]] から永続化したデータを読み込み. すでにキャッシュされているデータは破棄される
         */
        async load(options) {
            options = options || {};
            this._store = (await this._storage.getItem(this._rootKey, options)) || {};
            if (!options.silent) {
                void coreUtils.post(() => this.publish('change', '*'));
            }
        }
        /**
         * @en Persist data to [[IStorage]].
         * @ja [[IStorage]] にデータを永続化
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
            let reg = this.targetRoot(field);
            while (name = structure.shift()) { // eslint-disable-line no-cond-assign
                if (!(name in reg)) {
                    return null;
                }
                reg = reg[name];
            }
            // return deep copy
            return (null != reg[lastKey]) ? coreUtils.deepCopy(reg[lastKey]) : null;
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
            let reg = this.targetRoot(field);
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
            const oldVal = coreUtils.dropUndefined(reg[lastKey]);
            if (coreUtils.deepEqual(oldVal, newVal)) {
                return; // 更新なし
            }
            else if (remove) {
                delete reg[lastKey];
            }
            else {
                reg[lastKey] = coreUtils.deepCopy(newVal);
            }
            if (!noSave) {
                // no fire notification
                void this._storage.setItem(this._rootKey, this._store, { ...this._defaultOptions, ...options });
            }
            if (!silent) {
                void coreUtils.post(() => this.publish('change', key, newVal, oldVal));
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
            void this._storage.removeItem(this._rootKey, options);
            if (!options.silent) {
                this.publish('change', null, null, null);
            }
        }
        ///////////////////////////////////////////////////////////////////////
        // private methods:
        /** get root object */
        targetRoot(field) {
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

    exports.MemoryStorage = MemoryStorage;
    exports.Registry = Registry;
    exports.default = memoryStorage;
    exports.memoryStorage = memoryStorage;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS1zdG9yYWdlLmpzIiwic291cmNlcyI6WyJtZW1vcnktc3RvcmFnZS50cyIsInJlZ2lzdHJ5LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICovXG5cbmltcG9ydCB7XG4gICAgUGxhaW5PYmplY3QsXG4gICAgS2V5cyxcbiAgICBUeXBlcyxcbiAgICBLZXlUb1R5cGUsXG4gICAgZGVlcEVxdWFsLFxuICAgIGlzRW1wdHlPYmplY3QsXG4gICAgZnJvbVR5cGVkRGF0YSxcbiAgICBkcm9wVW5kZWZpbmVkLFxuICAgIHJlc3RvcmVOaWwsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQge1xuICAgIFN0b3JhZ2VEYXRhVHlwZUxpc3QsXG4gICAgU3RvcmFnZUlucHV0RGF0YVR5cGVMaXN0LFxuICAgIElTdG9yYWdlT3B0aW9ucyxcbiAgICBJU3RvcmFnZURhdGFPcHRpb25zLFxuICAgIElTdG9yYWdlRGF0YVJldHVyblR5cGUsXG4gICAgSVN0b3JhZ2VFdmVudENhbGxiYWNrLFxuICAgIElTdG9yYWdlLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKiogTWVtb3J5U3RvcmFnZSBJL08gb3B0aW9ucyAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZU9wdGlvbnM8SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gSVN0b3JhZ2VEYXRhT3B0aW9uczxTdG9yYWdlRGF0YVR5cGVMaXN0LCBLPjtcbi8qKiBNZW1vcnlTdG9yYWdlIHJldHVybiB2YWx1ZSAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZVJlc3VsdDxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBLZXlUb1R5cGU8U3RvcmFnZURhdGFUeXBlTGlzdCwgSz47XG4vKiogTWVtb3J5U3RvcmFnZSBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXMgPSBUeXBlczxTdG9yYWdlRGF0YVR5cGVMaXN0Pjtcbi8qKiBNZW1vcnlTdG9yYWdlIHJldHVybiB0eXBlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlUmV0dXJuVHlwZTxEIGV4dGVuZHMgTWVtb3J5U3RvcmFnZURhdGFUeXBlcz4gPSBJU3RvcmFnZURhdGFSZXR1cm5UeXBlPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEQ+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgaW5wdXQgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBNZW1vcnlTdG9yYWdlSW5wdXREYXRhVHlwZXMgPSBTdG9yYWdlSW5wdXREYXRhVHlwZUxpc3Q8U3RvcmFnZURhdGFUeXBlTGlzdD47XG4vKiogTWVtb3J5U3RvcmFnZSBldmVudCBjYWxsYmFjayAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZUV2ZW50Q2FsbGJhY2sgPSBJU3RvcmFnZUV2ZW50Q2FsbGJhY2s8U3RvcmFnZURhdGFUeXBlTGlzdD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBNZW1vcnlTdG9yYWdlRXZlbnQge1xuICAgICdAJzogW3N0cmluZyB8IG51bGwsIE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsLCBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbF07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBNZW1vcnkgc3RvcmFnZSBjbGFzcy4gVGhpcyBjbGFzcyBkb2Vzbid0IHN1cHBvcnQgcGVybWFuZWNpYXRpb24gZGF0YS5cbiAqIEBqYSDjg6Hjg6Ljg6rjg7zjgrnjg4jjg6zjg7zjgrjjgq/jg6njgrkuIOacrOOCr+ODqeOCueOBr+ODh+ODvOOCv+OBruawuOe2muWMluOCkuOCteODneODvOODiOOBl+OBquOBhFxuICovXG5leHBvcnQgY2xhc3MgTWVtb3J5U3RvcmFnZSBpbXBsZW1lbnRzIElTdG9yYWdlIHtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxNZW1vcnlTdG9yYWdlRXZlbnQ+KCk7XG4gICAgcHJpdmF0ZSBfc3RvcmFnZTogUGxhaW5PYmplY3QgPSB7fTtcblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIGltcGxlbWVudHM6IElTdG9yYWdlXG5cbiAgICAvKipcbiAgICAgKiBAZW4gW1tJU3RvcmFnZV1dIGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSBbW0lTdG9yYWdlXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuICdtZW1vcnknO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxEIGV4dGVuZHMgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyA9IE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXM+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPG5ldmVyPlxuICAgICk6IFByb21pc2U8TWVtb3J5U3RvcmFnZVJldHVyblR5cGU8RD4+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBrZXksIG9yIG51bGwgaWYgdGhlIGdpdmVuIGtleSBkb2VzIG5vdCBleGlzdCBpbiB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdC5cbiAgICAgKiBAamEg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5Y+W5b6XLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga8gbnVsbCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBSZXR1cm5zIHRoZSB2YWx1ZSB3aGljaCBjb3JyZXNwb25kcyB0byBhIGtleSB3aXRoIHR5cGUgY2hhbmdlIGRlc2lnbmF0ZWQgaW4gYGRhdGFUeXBlYC5cbiAgICAgKiAgLSBgamFgIGBkYXRhVHlwZWAg44Gn5oyH5a6a44GV44KM44Gf5Z6L5aSJ5o+b44KS6KGM44Gj44GmLCDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXRJdGVtPEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PihcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM/OiBNZW1vcnlTdG9yYWdlT3B0aW9uczxLPlxuICAgICk6IFByb21pc2U8TWVtb3J5U3RvcmFnZVJlc3VsdDxLPiB8IG51bGw+O1xuXG4gICAgYXN5bmMgZ2V0SXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IE1lbW9yeVN0b3JhZ2VPcHRpb25zPGFueT4pOiBQcm9taXNlPE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG5cbiAgICAgICAgLy8gYHVuZGVmaW5lZGAg4oaSIGBudWxsYFxuICAgICAgICBjb25zdCB2YWx1ZSA9IGRyb3BVbmRlZmluZWQodGhpcy5fc3RvcmFnZVtrZXldKTtcbiAgICAgICAgc3dpdGNoIChvcHRpb25zLmRhdGFUeXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBmcm9tVHlwZWREYXRhKHZhbHVlKSBhcyBzdHJpbmc7XG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIocmVzdG9yZU5pbCh2YWx1ZSkpO1xuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIEJvb2xlYW4ocmVzdG9yZU5pbCh2YWx1ZSkpO1xuICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0KHJlc3RvcmVOaWwodmFsdWUpKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3RvcmVOaWwodmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBwYWlyIGlkZW50aWZpZWQgYnkga2V5IHRvIHZhbHVlLCBjcmVhdGluZyBhIG5ldyBrZXkvdmFsdWUgcGFpciBpZiBub25lIGV4aXN0ZWQgZm9yIGtleSBwcmV2aW91c2x5LlxuICAgICAqIEBqYSDjgq3jg7zjgpLmjIflrprjgZfjgablgKTjgpLoqK3lrpouIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBr+aWsOimj+OBq+S9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc2V0SXRlbTxWIGV4dGVuZHMgTWVtb3J5U3RvcmFnZUlucHV0RGF0YVR5cGVzPihrZXk6IHN0cmluZywgdmFsdWU6IFYsIG9wdGlvbnM/OiBNZW1vcnlTdG9yYWdlT3B0aW9uczxuZXZlcj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgY29uc3QgbmV3VmFsID0gZHJvcFVuZGVmaW5lZCh2YWx1ZSwgdHJ1ZSk7ICAgICAgICAgLy8gYG51bGxgIG9yIGB1bmRlZmluZWRgIOKGkiAnbnVsbCcgb3IgJ3VuZGVmaW5lZCdcbiAgICAgICAgY29uc3Qgb2xkVmFsID0gZHJvcFVuZGVmaW5lZCh0aGlzLl9zdG9yYWdlW2tleV0pOyAgLy8gYHVuZGVmaW5lZGAg4oaSIGBudWxsYFxuICAgICAgICBpZiAoIWRlZXBFcXVhbChvbGRWYWwsIG5ld1ZhbCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2Vba2V5XSA9IG5ld1ZhbDtcbiAgICAgICAgICAgICFvcHRpb25zLnNpbGVudCAmJiB0aGlzLl9icm9rZXIudHJpZ2dlcignQCcsIGtleSwgbmV3VmFsLCBvbGRWYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZXMgdGhlIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBmcm9tIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LCBpZiBhIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBleGlzdHMuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCreODvOOBq+WvvuW/nOOBmeOCi+WApOOBjOWtmOWcqOOBmeOCjOOBsOWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgcmVtb3ZlSXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICBjb25zdCBvbGRWYWwgPSB0aGlzLl9zdG9yYWdlW2tleV07XG4gICAgICAgIGlmICh1bmRlZmluZWQgIT09IG9sZFZhbCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3N0b3JhZ2Vba2V5XTtcbiAgICAgICAgICAgICFvcHRpb25zLnNpbGVudCAmJiB0aGlzLl9icm9rZXIudHJpZ2dlcignQCcsIGtleSwgbnVsbCwgb2xkVmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbXB0aWVzIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0IG9mIGFsbCBrZXkvdmFsdWUgcGFpcnMsIGlmIHRoZXJlIGFyZSBhbnkuXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXIob3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICBpZiAoIWlzRW1wdHlPYmplY3QodGhpcy5fc3RvcmFnZSkpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UgPSB7fTtcbiAgICAgICAgICAgICFvcHRpb25zLnNpbGVudCAmJiB0aGlzLl9icm9rZXIudHJpZ2dlcignQCcsIG51bGwsIG51bGwsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYWxsIGVudHJ5IGtleXMuXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCreODvOS4gOimp+OCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNhbmNlbCBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBrZXlzKG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zICYmIG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3N0b3JhZ2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKGxpc3RlbmVyOiBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjayk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9icm9rZXIub24oJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZihsaXN0ZW5lcj86IE1lbW9yeVN0b3JhZ2VFdmVudENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Jyb2tlci5vZmYoJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm4gYSBzaGFsbG93IGNvcHkgb2YgdGhlIHN0b3JhZ2UncyBhdHRyaWJ1dGVzIGZvciBKU09OIHN0cmluZ2lmaWNhdGlvbi5cbiAgICAgKiBAamEgSlNPTiBzdHJpbmdpZnkg44Gu44Gf44KB44Gr44K544OI44Os44O844K444OX44Ot44OR44OG44Kj44Gu44K344Oj44Ot44O844Kz44OU44O86L+U5Y20XG4gICAgICovXG4gICAgZ2V0IGNvbnRleHQoKTogUGxhaW5PYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG59XG5cbi8vIGRlZmF1bHQgc3RvcmFnZVxuZXhwb3J0IGNvbnN0IG1lbW9yeVN0b3JhZ2UgPSBuZXcgTWVtb3J5U3RvcmFnZSgpO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gKi9cblxuaW1wb3J0IHtcbiAgICBQbGFpbk9iamVjdCxcbiAgICBwb3N0LFxuICAgIGRlZXBFcXVhbCxcbiAgICBkZWVwQ29weSxcbiAgICBkcm9wVW5kZWZpbmVkLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIElTdG9yYWdlLFxuICAgIElTdG9yYWdlT3B0aW9ucyxcbiAgICBJU3RvcmFnZUZvcm1hdE9wdGlvbnMsXG4gICAgUmVnaXN0cnlTY2hlbWFCYXNlLFxuICAgIFJlZ2lzdHJ5RXZlbnQsXG4gICAgUmVnaXN0cnlSZWFkT3B0aW9ucyxcbiAgICBSZWdpc3RyeVdyaXRlT3B0aW9ucyxcbiAgICBSZWdpc3RyeVNhdmVPcHRpb25zLFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuXG4vKipcbiAqIEBlbiBSZWdpc3RyeSBtYW5hZ2VtZW50IGNsYXNzIGZvciBzeW5jaHJvbm91cyBSZWFkL1dyaXRlIGFjY2Vzc2libGUgZnJvbSBhbnkgW1tJU3RvcmFnZV1dIG9iamVjdC5cbiAqIEBqYSDku7vmhI/jga4gW1tJU3RvcmFnZV1dIOOCquODluOCuOOCp+OCr+ODiOOBi+OCieWQjOacnyBSZWFkL1dyaXRlIOOCouOCr+OCu+OCueWPr+iDveOBquODrOOCuOOCueODiOODqueuoeeQhuOCr+ODqeOCuVxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogLy8gMS4gZGVmaW5lIHJlZ2lzdHJ5IHNjaGVtYVxuICogaW50ZXJmYWNlIFNjaGVtYSBleHRlbmRzIFJlZ2lzdHJ5U2NoZW1hQmFzZSB7XG4gKiAgICAnY29tbW9uL21vZGUnOiAnbm9ybWFsJyB8ICdzcGVjaWZpZWQnO1xuICogICAgJ2NvbW1vbi92YWx1ZSc6IG51bWJlcjtcbiAqICAgICd0cmFkZS9sb2NhbCc6IHsgdW5pdDogJ+WGhicgfCAnJCc7IHJhdGU6IG51bWJlcjsgfTtcbiAqICAgICd0cmFkZS9jaGVjayc6IGJvb2xlYW47XG4gKiAgICAnZXh0cmEvdXNlcic6IHN0cmluZztcbiAqIH1cbiAqXG4gKiAvLyAyLiBwcmVwYXJlIElTdG9yYWdlIGluc3RhbmNlXG4gKiAvLyBleFxuICogaW1wb3J0IHsgd2ViU3RvcmFnZSB9IGZyb20gJ0BjZHAvd2ViLXN0b3JhZ2UnO1xuICpcbiAqIC8vIDMuIGluc3RhbnRpYXRlIHRoaXMgY2xhc3NcbiAqIGNvbnN0IHJlZyA9IG5ldyBSZWdpc3RyeTxTY2hlbWE+KHdlYlN0b3JhZ2UsICdAdGVzdCcpO1xuICpcbiAqIC8vIDQuIHJlYWQgZXhhbXBsZVxuICogY29uc3QgdmFsID0gcmVnLnJlYWQoJ2NvbW1vbi9tb2RlJyk7IC8vICdub3JtYWwnIHwgJ3NwZWNpZmllZCcgfCBudWxsXG4gKlxuICogLy8gNS4gd3JpdGUgZXhhbXBsZVxuICogcmVnLndyaXRlKCdjb21tb24vbW9kZScsICdzcGVjaWZpZWQnKTtcbiAqIC8vIHJlZy53cml0ZSgnY29tbW9uL21vZGUnLCAnaG9nZScpOyAvLyBjb21waWxlIGVycm9yXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFJlZ2lzdHJ5PFQgZXh0ZW5kcyBSZWdpc3RyeVNjaGVtYUJhc2UgPSBhbnk+IGV4dGVuZHMgRXZlbnRQdWJsaXNoZXI8UmVnaXN0cnlFdmVudDxUPj4ge1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RvcmFnZTogSVN0b3JhZ2U7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfcm9vdEtleTogc3RyaW5nO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2RlZmF1bHRPcHRpb25zOiBJU3RvcmFnZUZvcm1hdE9wdGlvbnM7XG4gICAgcHJpdmF0ZSBfc3RvcmU6IFBsYWluT2JqZWN0ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0b3JhZ2VcbiAgICAgKiAgLSBgZW5gIFJvb3Qga2V5IGZvciBbW0lTdG9yYWdlXV0uXG4gICAgICogIC0gYGphYCBbW0lTdG9yYWdlXV0g44Gr5L2/55So44GZ44KL44Or44O844OI44Kt44O8XG4gICAgICogQHBhcmFtIHJvb3RLZXlcbiAgICAgKiAgLSBgZW5gIFJvb3Qga2V5IGZvciBbW0lTdG9yYWdlXV0uXG4gICAgICogIC0gYGphYCBbW0lTdG9yYWdlXV0g44Gr5L2/55So44GZ44KL44Or44O844OI44Kt44O8XG4gICAgICogQHBhcmFtIGZvcm1hdFNwYWNlXG4gICAgICogIC0gYGVuYCBmb3IgSlNPTiBmb3JtYXQgc3BhY2UuXG4gICAgICogIC0gYGphYCBKU09OIOODleOCqeODvOODnuODg+ODiOOCueODmuODvOOCueOCkuaMh+WumlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0b3JhZ2U6IElTdG9yYWdlPGFueT4sIHJvb3RLZXk6IHN0cmluZywgZm9ybWF0U3BhY2U/OiBudW1iZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHN0b3JhZ2U7XG4gICAgICAgIHRoaXMuX3Jvb3RLZXkgPSByb290S2V5O1xuICAgICAgICB0aGlzLl9kZWZhdWx0T3B0aW9ucyA9IHsganNvblNwYWNlOiBmb3JtYXRTcGFjZSB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gcm9vdCBrZXkuXG4gICAgICogQGphIOODq+ODvOODiOOCreODvOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCByb290S2V5KCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb290S2V5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBBY2Nlc3MgdG8gW1tJU3RvcmFnZV1dIG9iamVjdC5cbiAgICAgKiBAamEgW1tJU3RvcmFnZV1dIOOCquODluOCuOOCp+OCr+ODiOOCkuWPluW+l1xuICAgICAqL1xuICAgIGdldCBzdG9yYWdlKCk6IElTdG9yYWdlPGFueT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBwdWJsaWMgbWV0aG9kczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZWFkIHBlcnNpc3RlbmNlIGRhdGEgZnJvbSBbW0lTdG9yYWdlXV0uIFRoZSBkYXRhIGxvYWRlZCBhbHJlYWR5IHdpbGwgYmUgY2xlYXJlZC5cbiAgICAgKiBAamEgW1tJU3RvcmFnZV1dIOOBi+OCieawuOe2muWMluOBl+OBn+ODh+ODvOOCv+OCkuiqreOBv+i+vOOBvy4g44GZ44Gn44Gr44Kt44Oj44OD44K344Ol44GV44KM44Gm44GE44KL44OH44O844K/44Gv56C05qOE44GV44KM44KLXG4gICAgICovXG4gICAgcHVibGljIGFzeW5jIGxvYWQob3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5fc3RvcmUgPSAoYXdhaXQgdGhpcy5fc3RvcmFnZS5nZXRJdGVtKHRoaXMuX3Jvb3RLZXksIG9wdGlvbnMpKSB8fCB7fTtcbiAgICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICAgICAgdm9pZCBwb3N0KCgpID0+IHRoaXMucHVibGlzaCgnY2hhbmdlJywgJyonKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUGVyc2lzdCBkYXRhIHRvIFtbSVN0b3JhZ2VdXS5cbiAgICAgKiBAamEgW1tJU3RvcmFnZV1dIOOBq+ODh+ODvOOCv+OCkuawuOe2muWMllxuICAgICAqL1xuICAgIHB1YmxpYyBhc3luYyBzYXZlKG9wdGlvbnM/OiBSZWdpc3RyeVNhdmVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9wdHM6IFJlZ2lzdHJ5U2F2ZU9wdGlvbnMgPSB7IC4uLnRoaXMuX2RlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH07XG4gICAgICAgIGlmICghb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgIHRoaXMucHVibGlzaCgnd2lsbC1zYXZlJyk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHRoaXMuX3Jvb3RLZXksIHRoaXMuX3N0b3JlLCBvcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVhZCByZWdpc3RyeSB2YWx1ZS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq5YCk44Gu6Kqt44G/5Y+W44KKXG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOiqreOBv+WPluOCiuOCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyByZWFkPEsgZXh0ZW5kcyBrZXlvZiBUPihrZXk6IEssIG9wdGlvbnM/OiBSZWdpc3RyeVJlYWRPcHRpb25zKTogVFtLXSB8IG51bGwge1xuICAgICAgICBjb25zdCB7IGZpZWxkIH0gPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCBzdHJ1Y3R1cmUgPSBTdHJpbmcoa2V5KS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0S2V5ID0gc3RydWN0dXJlLnBvcCgpIGFzIHN0cmluZztcblxuICAgICAgICBsZXQgbmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgcmVnID0gdGhpcy50YXJnZXRSb290KGZpZWxkKTtcblxuICAgICAgICB3aGlsZSAobmFtZSA9IHN0cnVjdHVyZS5zaGlmdCgpKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tY29uZC1hc3NpZ25cbiAgICAgICAgICAgIGlmICghKG5hbWUgaW4gcmVnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVnID0gcmVnW25hbWVdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmV0dXJuIGRlZXAgY29weVxuICAgICAgICByZXR1cm4gKG51bGwgIT0gcmVnW2xhc3RLZXldKSA/IGRlZXBDb3B5KHJlZ1tsYXN0S2V5XSkgOiBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBXcml0ZSByZWdpc3RyeSB2YWx1ZS5cbiAgICAgKiBAamEg44Os44K444K544OI44Oq5YCk44Gu5pu444GN6L6844G/XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCB0YXJnZXQgcmVnaXN0cnkga2V5LlxuICAgICAqICAtIGBqYWAg5a++6LGh44Gu44Os44K444K544OI44Oq44Kt44O844KS5oyH5a6aXG4gICAgICogQHBhcmFtIHZhbHVlXG4gICAgICogIC0gYGVuYCB1cGRhdGUgdmFsdWUuIGlmIGBudWxsYCBzZXQgdG8gZGVsZXRlLlxuICAgICAqICAtIGBqYWAg5pu05paw44GZ44KL5YCkLiBgbnVsbGAg44Gv5YmK6ZmkXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHdyaXRlIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCDmm7jjgY3ovrzjgb/jgqrjg5fjgrfjg6fjg7PjgpLmjIflrppcbiAgICAgKi9cbiAgICBwdWJsaWMgd3JpdGU8SyBleHRlbmRzIGtleW9mIFQ+KGtleTogSywgdmFsdWU6IFRbS10gfCBudWxsLCBvcHRpb25zPzogUmVnaXN0cnlXcml0ZU9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgeyBmaWVsZCwgbm9TYXZlLCBzaWxlbnQgfSA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IHJlbW92ZSA9IChudWxsID09IHZhbHVlKTtcbiAgICAgICAgY29uc3Qgc3RydWN0dXJlID0gU3RyaW5nKGtleSkuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdEtleSA9IHN0cnVjdHVyZS5wb3AoKSBhcyBzdHJpbmc7XG5cbiAgICAgICAgbGV0IG5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHJlZyA9IHRoaXMudGFyZ2V0Um9vdChmaWVsZCk7XG5cbiAgICAgICAgd2hpbGUgKG5hbWUgPSBzdHJ1Y3R1cmUuc2hpZnQoKSkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWNvbmQtYXNzaWduXG4gICAgICAgICAgICBpZiAobmFtZSBpbiByZWcpIHtcbiAgICAgICAgICAgICAgICByZWcgPSByZWdbbmFtZV07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8g44GZ44Gn44Gr6Kaq44Kt44O844GM44Gq44GE44Gf44KB5L2V44KC44GX44Gq44GEXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlZyA9IHJlZ1tuYW1lXSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV3VmFsID0gcmVtb3ZlID8gbnVsbCA6IHZhbHVlO1xuICAgICAgICBjb25zdCBvbGRWYWwgPSBkcm9wVW5kZWZpbmVkKHJlZ1tsYXN0S2V5XSk7XG4gICAgICAgIGlmIChkZWVwRXF1YWwob2xkVmFsLCBuZXdWYWwpKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIOabtOaWsOOBquOBl1xuICAgICAgICB9IGVsc2UgaWYgKHJlbW92ZSkge1xuICAgICAgICAgICAgZGVsZXRlIHJlZ1tsYXN0S2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlZ1tsYXN0S2V5XSA9IGRlZXBDb3B5KG5ld1ZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW5vU2F2ZSkge1xuICAgICAgICAgICAgLy8gbm8gZmlyZSBub3RpZmljYXRpb25cbiAgICAgICAgICAgIHZvaWQgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKHRoaXMuX3Jvb3RLZXksIHRoaXMuX3N0b3JlLCB7IC4uLnRoaXMuX2RlZmF1bHRPcHRpb25zLCAuLi5vcHRpb25zIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaWxlbnQpIHtcbiAgICAgICAgICAgIHZvaWQgcG9zdCgoKSA9PiB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsIGtleSwgbmV3VmFsLCBvbGRWYWwpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBEZWxldGUgcmVnaXN0cnkga2V5LlxuICAgICAqIEBqYSDjg6zjgrjjgrnjg4jjg6rjgq3jg7zjga7liYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIHRhcmdldCByZWdpc3RyeSBrZXkuXG4gICAgICogIC0gYGphYCDlr77osaHjga7jg6zjgrjjgrnjg4jjg6rjgq3jg7zjgpLmjIflrppcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgcmVhZCBvcHRpb25zLlxuICAgICAqICAtIGBqYWAg5pu444GN6L6844G/44Kq44OX44K344On44Oz44KS5oyH5a6aXG4gICAgICovXG4gICAgcHVibGljIGRlbGV0ZTxLIGV4dGVuZHMga2V5b2YgVD4oa2V5OiBLLCBvcHRpb25zPzogUmVnaXN0cnlXcml0ZU9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgdGhpcy53cml0ZShrZXksIG51bGwsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBDbGVhciBhbGwgcmVnaXN0cnkuXG4gICAgICogQGphIOODrOOCuOOCueODiOODquOBruWFqOWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHJlYWQgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIOabuOOBjei+vOOBv+OCquODl+OCt+ODp+ODs+OCkuaMh+WumlxuICAgICAqL1xuICAgIHB1YmxpYyBjbGVhcihvcHRpb25zPzogUmVnaXN0cnlXcml0ZU9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuX3N0b3JlID0ge307XG4gICAgICAgIHZvaWQgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKHRoaXMuX3Jvb3RLZXksIG9wdGlvbnMpO1xuICAgICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICB0aGlzLnB1Ymxpc2goJ2NoYW5nZScsIG51bGwsIG51bGwsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gcHJpdmF0ZSBtZXRob2RzOlxuXG4gICAgLyoqIGdldCByb290IG9iamVjdCAqL1xuICAgIHByaXZhdGUgdGFyZ2V0Um9vdChmaWVsZD86IHN0cmluZyk6IFBsYWluT2JqZWN0IHtcbiAgICAgICAgaWYgKGZpZWxkKSB7XG4gICAgICAgICAgICAvLyBlbnN1cmUgW2ZpZWxkXSBvYmplY3QuXG4gICAgICAgICAgICB0aGlzLl9zdG9yZVtmaWVsZF0gPSB0aGlzLl9zdG9yZVtmaWVsZF0gfHwge307XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmVbZmllbGRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JlO1xuICAgICAgICB9XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbIkV2ZW50QnJva2VyIiwiY2MiLCJkcm9wVW5kZWZpbmVkIiwiZnJvbVR5cGVkRGF0YSIsInJlc3RvcmVOaWwiLCJkZWVwRXF1YWwiLCJpc0VtcHR5T2JqZWN0IiwiRXZlbnRQdWJsaXNoZXIiLCJwb3N0IiwiZGVlcENvcHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7OztJQWdEQTtJQUVBOzs7O1VBSWEsYUFBYTtRQUExQjtZQUVxQixZQUFPLEdBQUcsSUFBSUEsa0JBQVcsRUFBc0IsQ0FBQztZQUN6RCxhQUFRLEdBQWdCLEVBQUUsQ0FBQztTQWlMdEM7Ozs7Ozs7UUF4S0csSUFBSSxJQUFJO1lBQ0osT0FBTyxRQUFRLENBQUM7U0FDbkI7UUF3Q0QsTUFBTSxPQUFPLENBQUMsR0FBVyxFQUFFLE9BQW1DO1lBQzFELE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1lBQ3hCLE1BQU1DLHFCQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDOztZQUd6QixNQUFNLEtBQUssR0FBR0MsdUJBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFD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
