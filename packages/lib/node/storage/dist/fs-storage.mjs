/*!
 * @cdp/fs-storage 0.9.5
 *   file-system storage utility module
 */

import { promisify } from 'util';
import { writeFile, existsSync, readFileSync, unlinkSync } from 'fs';
import { dropUndefined } from '@cdp/core-utils';
import { MemoryStorage } from '@cdp/core-storage';

const writeFileAsync = promisify(writeFile);
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
        this._storage = new MemoryStorage();
        if (existsSync(this._location)) {
            const data = JSON.parse(readFileSync(this._location).toString());
            const ref = this._storage.context;
            for (const key of Object.keys(data)) {
                ref[key] = dropUndefined(data[key], true);
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
        if (existsSync(this._location)) {
            unlinkSync(this._location);
        }
        void this._storage.clear();
    }
    ///////////////////////////////////////////////////////////////////////
    // internal methods:
    /** @internal */
    updateJSON(options) {
        const { jsonSpace } = options || {};
        const json = `${JSON.stringify(this._storage.context, null, jsonSpace)}\n`;
        return writeFileAsync(this._location, json);
    }
}

export { FsStorage };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnMtc3RvcmFnZS5tanMiLCJzb3VyY2VzIjpbImZzLXN0b3JhZ2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAndXRpbCc7XG5pbXBvcnQge1xuICAgIGV4aXN0c1N5bmMsXG4gICAgcmVhZEZpbGVTeW5jLFxuICAgIHdyaXRlRmlsZSxcbiAgICB1bmxpbmtTeW5jLFxufSBmcm9tICdmcyc7XG5pbXBvcnQgeyBLZXlzLCBkcm9wVW5kZWZpbmVkIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7IENhbmNlbGFibGUgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBJU3RvcmFnZSxcbiAgICBJU3RvcmFnZU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VGb3JtYXRPcHRpb25zLFxuICAgIFN0b3JhZ2VEYXRhVHlwZUxpc3QsXG4gICAgTWVtb3J5U3RvcmFnZU9wdGlvbnMsXG4gICAgTWVtb3J5U3RvcmFnZVJlc3VsdCxcbiAgICBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzLFxuICAgIE1lbW9yeVN0b3JhZ2VSZXR1cm5UeXBlLFxuICAgIE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcyxcbiAgICBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjayxcbiAgICBNZW1vcnlTdG9yYWdlLFxufSBmcm9tICdAY2RwL2NvcmUtc3RvcmFnZSc7XG5cbi8qKiBGc1N0b3JhZ2UgSS9PIG9wdGlvbnMgKi9cbmV4cG9ydCB0eXBlIEZzU3RvcmFnZU9wdGlvbnM8SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4gPSBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IE1lbW9yeVN0b3JhZ2VPcHRpb25zPEs+O1xuLyoqIEZzU3RvcmFnZSByZXR1cm4gdmFsdWUgKi9cbmV4cG9ydCB0eXBlIEZzU3RvcmFnZVJlc3VsdDxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBNZW1vcnlTdG9yYWdlUmVzdWx0PEs+O1xuLyoqIEZzU3RvcmFnZSBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEZzU3RvcmFnZURhdGFUeXBlcyA9IE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXM7XG4vKiogRnNTdG9yYWdlIHJldHVybiB0eXBlICovXG5leHBvcnQgdHlwZSBGc1N0b3JhZ2VSZXR1cm5UeXBlPEQgZXh0ZW5kcyBGc1N0b3JhZ2VEYXRhVHlwZXM+ID0gTWVtb3J5U3RvcmFnZVJldHVyblR5cGU8RD47XG4vKiogRnNTdG9yYWdlIGlucHV0IGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgRnNTdG9yYWdlSW5wdXREYXRhVHlwZXMgPSBNZW1vcnlTdG9yYWdlSW5wdXREYXRhVHlwZXM7XG4vKiogRnNTdG9yYWdlIGV2ZW50IGNhbGxiYWNrICovXG5leHBvcnQgdHlwZSBGc1N0b3JhZ2VFdmVudENhbGxiYWNrID0gTWVtb3J5U3RvcmFnZUV2ZW50Q2FsbGJhY2s7XG5cbmNvbnN0IHdyaXRlRmlsZUFzeW5jID0gcHJvbWlzaWZ5KHdyaXRlRmlsZSk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBGaWxlIFN5c3RlbSAobm9kZSBmcykgc3RvcmFnZSBjbGFzcy5cbiAqIEBqYSDjg5XjgqHjgqTjg6vjgrfjgrnjg4bjg6Djgrnjg4jjg6zjg7zjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEZzU3RvcmFnZSBpbXBsZW1lbnRzIElTdG9yYWdlIHtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2xvY2F0aW9uOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RvcmFnZTogTWVtb3J5U3RvcmFnZTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbG9jYXRpb25cbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2UgZmlsZSBwYXRoLlxuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444OV44Kh44Kk44Or44OR44K544KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IobG9jYXRpb246IHN0cmluZykge1xuICAgICAgICB0aGlzLl9sb2NhdGlvbiA9IGxvY2F0aW9uO1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gbmV3IE1lbW9yeVN0b3JhZ2UoKTtcblxuICAgICAgICBpZiAoZXhpc3RzU3luYyh0aGlzLl9sb2NhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyh0aGlzLl9sb2NhdGlvbikudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBjb25zdCByZWYgPSB0aGlzLl9zdG9yYWdlLmNvbnRleHQ7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICAgICAgICAgIHJlZltrZXldID0gZHJvcFVuZGVmaW5lZChkYXRhW2tleV0sIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VcblxuICAgIC8qKlxuICAgICAqIEBlbiBbW0lTdG9yYWdlXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSVN0b3JhZ2VdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gJ25vZGUtZnMnO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxEIGV4dGVuZHMgRnNTdG9yYWdlRGF0YVR5cGVzID0gRnNTdG9yYWdlRGF0YVR5cGVzPihcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM/OiBGc1N0b3JhZ2VPcHRpb25zPG5ldmVyPlxuICAgICk6IFByb21pc2U8RnNTdG9yYWdlUmV0dXJuVHlwZTxEPj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGtleSwgb3IgbnVsbCBpZiB0aGUgZ2l2ZW4ga2V5IGRvZXMgbm90IGV4aXN0IGluIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LlxuICAgICAqIEBqYSDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLlj5blvpcuIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBryBudWxsIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIFJldHVybnMgdGhlIHZhbHVlIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEga2V5IHdpdGggdHlwZSBjaGFuZ2UgZGVzaWduYXRlZCBpbiBgZGF0YVR5cGVgLlxuICAgICAqICAtIGBqYWAgYGRhdGFUeXBlYCDjgafmjIflrprjgZXjgozjgZ/lnovlpInmj5vjgpLooYzjgaPjgaYsIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIGdldEl0ZW08SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IEZzU3RvcmFnZU9wdGlvbnM8Sz5cbiAgICApOiBQcm9taXNlPEZzU3RvcmFnZVJlc3VsdDxLPiB8IG51bGw+O1xuXG4gICAgZ2V0SXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IEZzU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPEZzU3RvcmFnZURhdGFUeXBlcyB8IG51bGw+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2UuZ2V0SXRlbShrZXksIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgcGFpciBpZGVudGlmaWVkIGJ5IGtleSB0byB2YWx1ZSwgY3JlYXRpbmcgYSBuZXcga2V5L3ZhbHVlIHBhaXIgaWYgbm9uZSBleGlzdGVkIGZvciBrZXkgcHJldmlvdXNseS5cbiAgICAgKiBAamEg44Kt44O844KS5oyH5a6a44GX44Gm5YCk44KS6Kit5a6aLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga/mlrDopo/jgavkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHNldEl0ZW08ViBleHRlbmRzIEZzU3RvcmFnZUlucHV0RGF0YVR5cGVzPihrZXk6IHN0cmluZywgdmFsdWU6IFYsIG9wdGlvbnM/OiBGc1N0b3JhZ2VPcHRpb25zPG5ldmVyPik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLnNldEl0ZW0oa2V5LCB2YWx1ZSwgb3B0aW9ucyk7XG4gICAgICAgIHJldHVybiB0aGlzLnVwZGF0ZUpTT04ob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZXMgdGhlIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBmcm9tIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LCBpZiBhIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBleGlzdHMuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCreODvOOBq+WvvuW/nOOBmeOCi+WApOOBjOWtmOWcqOOBmeOCjOOBsOWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgcmVtb3ZlSXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLnJlbW92ZUl0ZW0oa2V5LCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlSlNPTihvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW1wdGllcyB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdCBvZiBhbGwga2V5L3ZhbHVlIHBhaXJzLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGNsZWFyKG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmFnZS5jbGVhcihvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlSlNPTihvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbGwgZW50cnkga2V5cy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O85LiA6Kan44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY2FuY2VsIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGtleXMob3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLmtleXMob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24obGlzdGVuZXI6IEZzU3RvcmFnZUV2ZW50Q2FsbGJhY2spOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5vbihsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZihsaXN0ZW5lcj86IEZzU3RvcmFnZUV2ZW50Q2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fc3RvcmFnZS5vZmYobGlzdGVuZXIpO1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG9wZXJhdGlvbnM6XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlIHN0b3JhZ2UgZmlsZS5cbiAgICAgKiBAamEg5L+d5a2Y44OV44Kh44Kk44Or44Gu5a6M5YWo5YmK6ZmkXG4gICAgICovXG4gICAgcHVibGljIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgICAgIGlmIChleGlzdHNTeW5jKHRoaXMuX2xvY2F0aW9uKSkge1xuICAgICAgICAgICAgdW5saW5rU3luYyh0aGlzLl9sb2NhdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgdm9pZCB0aGlzLl9zdG9yYWdlLmNsZWFyKCk7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW50ZXJuYWwgbWV0aG9kczpcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHVwZGF0ZUpTT04ob3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB7IGpzb25TcGFjZSB9ID0gKG9wdGlvbnMgYXMgSVN0b3JhZ2VGb3JtYXRPcHRpb25zKSB8fCB7fTtcbiAgICAgICAgY29uc3QganNvbiA9IGAke0pTT04uc3RyaW5naWZ5KHRoaXMuX3N0b3JhZ2UuY29udGV4dCwgbnVsbCwganNvblNwYWNlKX1cXG5gO1xuICAgICAgICByZXR1cm4gd3JpdGVGaWxlQXN5bmModGhpcy5fbG9jYXRpb24sIGpzb24pO1xuICAgIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBcUNBLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUU1QztBQUVBOzs7O01BSWEsU0FBUzs7Ozs7Ozs7SUFZbEIsWUFBWSxRQUFnQjtRQUN4QixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUMxQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksYUFBYSxFQUFFLENB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
