/*!
 * @cdp/fs-storage 0.9.0
 *   file-system storage utility module
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const fsExtra = require('fs-extra');
const coreUtils = require('@cdp/core-utils');
const coreStorage = require('@cdp/core-storage');

/* eslint-disable @typescript-eslint/no-explicit-any */
//__________________________________________________________________________________________________//
/**
 * @en File System (node fs) storage class.
 * @ja ファイルシステムストレージクラス
 */
class FsStorage {
    /**
     * constructor
     *
     * @param location
     *  - `en` storage file path.
     *  - `ja` ストレージファイルパスを指定
     */
    constructor(location) {
        this._location = location;
        this._storage = new coreStorage.MemoryStorage();
        if (fsExtra.existsSync(this._location)) {
            const data = fsExtra.readJsonSync(this._location);
            const ref = this._storage.context;
            for (const key of Object.keys(data)) {
                ref[key] = coreUtils.dropUndefined(data[key], true);
            }
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IStorage
    /**
     * @en [[IStorage]] kind signature.
     * @ja [[IStorage]] の種別を表す識別子
     */
    get kind() {
        return 'node-fs';
    }
    getItem(key, options) {
        return this._storage.getItem(key, options);
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
        await this._storage.setItem(key, value, options);
        return this.updateJSON(options);
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
        await this._storage.removeItem(key, options);
        return this.updateJSON(options);
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
        await this._storage.clear(options);
        return this.updateJSON(options);
    }
    /**
     * @en Returns all entry keys.
     * @ja すべてのキー一覧を返却
     *
     * @param options
     *  - `en` cancel options
     *  - `ja` キャンセルオプション
     */
    keys(options) {
        return this._storage.keys(options);
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
        return this._storage.on(listener);
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
        this._storage.off(listener);
    }
    ///////////////////////////////////////////////////////////////////////
    // operations:
    /**
     * @en Remove storage file.
     * @ja 保存ファイルの完全削除
     */
    destroy() {
        fsExtra.removeSync(this._location);
        this._storage.clear();
    }
    ///////////////////////////////////////////////////////////////////////
    // internal methods:
    /** @internal */
    updateJSON(options) {
        const { jsonSpace } = options || {};
        return fsExtra.outputJson(this._location, this._storage.context, { spaces: jsonSpace });
    }
}

exports.FsStorage = FsStorage;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnMtc3RvcmFnZS5qcyIsInNvdXJjZXMiOlsiZnMtc3RvcmFnZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55ICovXG5cbmltcG9ydCB7XG4gICAgZXhpc3RzU3luYyxcbiAgICByZWFkSnNvblN5bmMsXG4gICAgb3V0cHV0SnNvbixcbiAgICByZW1vdmVTeW5jLFxufSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBLZXlzLCBkcm9wVW5kZWZpbmVkIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IENhbmNlbGFibGUgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBJU3RvcmFnZSxcbiAgICBJU3RvcmFnZU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VGb3JtYXRPcHRpb25zLFxuICAgIFN0b3JhZ2VEYXRhVHlwZUxpc3QsXG4gICAgTWVtb3J5U3RvcmFnZU9wdGlvbnMsXG4gICAgTWVtb3J5U3RvcmFnZVJlc3VsdCxcbiAgICBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzLFxuICAgIE1lbW9yeVN0b3JhZ2VSZXR1cm5UeXBlLFxuICAgIE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcyxcbiAgICBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjayxcbiAgICBNZW1vcnlTdG9yYWdlLFxufSBmcm9tICdAY2RwL2NvcmUtc3RvcmFnZSc7XG5cbi8qKiBGc1N0b3JhZ2UgSS9PIG9wdGlvbnMgKi9cbmV4cG9ydCB0eXBlIEZzU3RvcmFnZU9wdGlvbnM8SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gTWVtb3J5U3RvcmFnZU9wdGlvbnM8Sz47XG4vKiogRnNTdG9yYWdlIHJldHVybiB2YWx1ZSAqL1xuZXhwb3J0IHR5cGUgRnNTdG9yYWdlUmVzdWx0PEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IE1lbW9yeVN0b3JhZ2VSZXN1bHQ8Sz47XG4vKiogRnNTdG9yYWdlIGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgRnNTdG9yYWdlRGF0YVR5cGVzID0gTWVtb3J5U3RvcmFnZURhdGFUeXBlcztcbi8qKiBGc1N0b3JhZ2UgcmV0dXJuIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEZzU3RvcmFnZVJldHVyblR5cGU8RCBleHRlbmRzIEZzU3RvcmFnZURhdGFUeXBlcz4gPSBNZW1vcnlTdG9yYWdlUmV0dXJuVHlwZTxEPjtcbi8qKiBGc1N0b3JhZ2UgaW5wdXQgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBGc1N0b3JhZ2VJbnB1dERhdGFUeXBlcyA9IE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcztcbi8qKiBGc1N0b3JhZ2UgZXZlbnQgY2FsbGJhY2sgKi9cbmV4cG9ydCB0eXBlIEZzU3RvcmFnZUV2ZW50Q2FsbGJhY2sgPSBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjaztcblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIEZpbGUgU3lzdGVtIChub2RlIGZzKSBzdG9yYWdlIGNsYXNzLlxuICogQGphIOODleOCoeOCpOODq+OCt+OCueODhuODoOOCueODiOODrOODvOOCuOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgRnNTdG9yYWdlIGltcGxlbWVudHMgSVN0b3JhZ2Uge1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfbG9jYXRpb246IHN0cmluZztcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdG9yYWdlOiBNZW1vcnlTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsb2NhdGlvblxuICAgICAqICAtIGBlbmAgc3RvcmFnZSBmaWxlIHBhdGguXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjg5XjgqHjgqTjg6vjg5HjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihsb2NhdGlvbjogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX2xvY2F0aW9uID0gbG9jYXRpb247XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBuZXcgTWVtb3J5U3RvcmFnZSgpO1xuXG4gICAgICAgIGlmIChleGlzdHNTeW5jKHRoaXMuX2xvY2F0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlYWRKc29uU3luYyh0aGlzLl9sb2NhdGlvbik7XG4gICAgICAgICAgICBjb25zdCByZWYgPSB0aGlzLl9zdG9yYWdlLmNvbnRleHQ7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICAgICAgICAgIHJlZltrZXldID0gZHJvcFVuZGVmaW5lZChkYXRhW2tleV0sIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VcblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0lTdG9yYWdlXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSVN0b3JhZ2VdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ25vZGUtZnMnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxEIGV4dGVuZHMgRnNTdG9yYWdlRGF0YVR5cGVzID0gRnNTdG9yYWdlRGF0YVR5cGVzPihcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM/OiBGc1N0b3JhZ2VPcHRpb25zPG5ldmVyPlxuICAgICk6IFByb21pc2U8RnNTdG9yYWdlUmV0dXJuVHlwZTxEPj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGtleSwgb3IgbnVsbCBpZiB0aGUgZ2l2ZW4ga2V5IGRvZXMgbm90IGV4aXN0IGluIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LlxuICAgICAqIEBqYSDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLlj5blvpcuIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBryBudWxsIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIFJldHVybnMgdGhlIHZhbHVlIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEga2V5IHdpdGggdHlwZSBjaGFuZ2UgZGVzaWduYXRlZCBpbiBgZGF0YVR5cGVgLlxuICAgICAqICAtIGBqYWAgYGRhdGFUeXBlYCDjgafmjIflrprjgZXjgozjgZ/lnovlpInmj5vjgpLooYzjgaPjgaYsIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIGdldEl0ZW08SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IEZzU3RvcmFnZU9wdGlvbnM8Sz5cbiAgICApOiBQcm9taXNlPEZzU3RvcmFnZVJlc3VsdDxLPiB8IG51bGw+O1xuXG4gICAgZ2V0SXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IEZzU3RvcmFnZU9wdGlvbnM8YW55Pik6IFByb21pc2U8RnNTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5nZXRJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBwYWlyIGlkZW50aWZpZWQgYnkga2V5IHRvIHZhbHVlLCBjcmVhdGluZyBhIG5ldyBrZXkvdmFsdWUgcGFpciBpZiBub25lIGV4aXN0ZWQgZm9yIGtleSBwcmV2aW91c2x5LlxuICAgICAqIEBqYSDjgq3jg7zjgpLmjIflrprjgZfjgablgKTjgpLoqK3lrpouIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBr+aWsOimj+OBq+S9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc2V0SXRlbTxWIGV4dGVuZHMgRnNTdG9yYWdlSW5wdXREYXRhVHlwZXM+KGtleTogc3RyaW5nLCB2YWx1ZTogViwgb3B0aW9ucz86IEZzU3RvcmFnZU9wdGlvbnM8bmV2ZXI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShrZXksIHZhbHVlLCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlSlNPTihvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlcyB0aGUga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QsIGlmIGEga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGV4aXN0cy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kt44O844Gr5a++5b+c44GZ44KL5YCk44GM5a2Y5Zyo44GZ44KM44Gw5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyByZW1vdmVJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXksIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVKU09OKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbXB0aWVzIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0IG9mIGFsbCBrZXkvdmFsdWUgcGFpcnMsIGlmIHRoZXJlIGFyZSBhbnkuXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXIob3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLmNsZWFyKG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVKU09OKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFsbCBlbnRyeSBrZXlzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zkuIDopqfjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAga2V5cyhvcHRpb25zPzogQ2FuY2VsYWJsZSk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2Uua2V5cyhvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogRnNTdG9yYWdlRXZlbnRDYWxsYmFjayk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLm9uKGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogRnNTdG9yYWdlRXZlbnRDYWxsYmFjayk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdG9yYWdlLm9mZihsaXN0ZW5lcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3RvcmFnZSBmaWxlLlxuICAgICAqIEBqYSDkv53lrZjjg5XjgqHjgqTjg6vjga7lrozlhajliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgcmVtb3ZlU3luYyh0aGlzLl9sb2NhdGlvbik7XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UuY2xlYXIoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbCBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlSlNPTihvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsganNvblNwYWNlIH0gPSAob3B0aW9ucyBhcyBJU3RvcmFnZUZvcm1hdE9wdGlvbnMpIHx8IHt9O1xuICAgICAgICByZXR1cm4gb3V0cHV0SnNvbih0aGlzLl9sb2NhdGlvbiwgdGhpcy5fc3RvcmFnZS5jb250ZXh0LCB7IHNwYWNlczoganNvblNwYWNlIH0pO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6WyJNZW1vcnlTdG9yYWdlIiwiZXhpc3RzU3luYyIsInJlYWRKc29uU3luYyIsImRyb3BVbmRlZmluZWQiLCJyZW1vdmVTeW5jIiwib3V0cHV0SnNvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBO0FBRUEsQUFvQ0E7Ozs7O0FBTUEsTUFBYSxTQUFTOzs7Ozs7OztJQVlsQixZQUFZLFFBQWdCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSUEseUJBQWEsRUFBRSxDQUFDO1FBRXBDLElBQUlDLGtCQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzVCLE1BQU0sSUFBSSxHQUFHQyxvQkFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztZQUNsQyxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2pDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBR0MsdUJBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDN0M7U0FDSjtLQUNKOzs7Ozs7O0lBU0QsSUFBSSxJQUFJO1FBQ0osT0FBTyxTQUFTLENBQUM7S0FDcEI7SUF3Q0QsT0FBTyxDQUFDLEdBQVcsRUFBRSxPQUErQjtRQUNoRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztLQUM5Qzs7Ozs7Ozs7Ozs7O0lBYUQsTUFBTSxPQUFPLENBQW9DLEdBQVcsRUFBRSxLQUFRLEVBQUUsT0FBaUM7UUFDckcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNuQzs7Ozs7Ozs7O0lBVUQsTUFBTSxVQUFVLENBQUMsR0FBVyxFQUFFLE9BQXlCO1FBQ25ELE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNuQzs7Ozs7Ozs7O0lBVUQsTUFBTSxLQUFLLENBQUMsT0FBeUI7UUFDakMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDbkM7Ozs7Ozs7OztJQVVELElBQUksQ0FBQyxPQUFvQjtRQUNyQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3RDOzs7Ozs7Ozs7SUFVRCxFQUFFLENBQUMsUUFBZ0M7UUFDL0IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUNyQzs7Ozs7Ozs7Ozs7SUFZRCxHQUFHLENBQUMsUUFBaUM7UUFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDL0I7Ozs7Ozs7SUFTTSxPQUFPO1FBQ1ZDLGtCQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDekI7Ozs7SUFNTyxVQUFVLENBQUMsT0FBeUI7UUFDeEMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFJLE9BQWlDLElBQUksRUFBRSxDQUFDO1FBQy9ELE9BQU9DLGtCQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO0tBQ25GO0NBQ0o7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2ZzLXN0b3JhZ2UvIn0=
