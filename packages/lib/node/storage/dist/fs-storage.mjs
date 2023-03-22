/*!
 * @cdp/fs-storage 0.9.17
 *   file-system storage utility module
 */

import { promisify } from 'node:util';
import { writeFile, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { assignValue, dropUndefined } from '@cdp/core-utils';
import { MemoryStorage } from '@cdp/core-storage';

/** @internal */ const writeFileAsync = promisify(writeFile);
//__________________________________________________________________________________________________//
/**
 * @en File System (node fs) storage class.
 * @ja ファイルシステムストレージクラス
 */
class FsStorage {
    /** @internal */
    _location;
    /** @internal */
    _storage;
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
                assignValue(ref, key, dropUndefined(data[key], true));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnMtc3RvcmFnZS5tanMiLCJzb3VyY2VzIjpbImZzLXN0b3JhZ2UudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCB7XG4gICAgZXhpc3RzU3luYyxcbiAgICByZWFkRmlsZVN5bmMsXG4gICAgd3JpdGVGaWxlLFxuICAgIHVubGlua1N5bmMsXG59IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHtcbiAgICBLZXlzLFxuICAgIGRyb3BVbmRlZmluZWQsXG4gICAgYXNzaWduVmFsdWUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgeyBDYW5jZWxhYmxlIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgSVN0b3JhZ2UsXG4gICAgSVN0b3JhZ2VPcHRpb25zLFxuICAgIElTdG9yYWdlRm9ybWF0T3B0aW9ucyxcbiAgICBTdG9yYWdlRGF0YVR5cGVMaXN0LFxuICAgIE1lbW9yeVN0b3JhZ2VPcHRpb25zLFxuICAgIE1lbW9yeVN0b3JhZ2VSZXN1bHQsXG4gICAgTWVtb3J5U3RvcmFnZURhdGFUeXBlcyxcbiAgICBNZW1vcnlTdG9yYWdlUmV0dXJuVHlwZSxcbiAgICBNZW1vcnlTdG9yYWdlSW5wdXREYXRhVHlwZXMsXG4gICAgTWVtb3J5U3RvcmFnZUV2ZW50Q2FsbGJhY2ssXG4gICAgTWVtb3J5U3RvcmFnZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuXG4vKiogRnNTdG9yYWdlIEkvTyBvcHRpb25zICovXG5leHBvcnQgdHlwZSBGc1N0b3JhZ2VPcHRpb25zPEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+ID0gS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBNZW1vcnlTdG9yYWdlT3B0aW9uczxLPjtcbi8qKiBGc1N0b3JhZ2UgcmV0dXJuIHZhbHVlICovXG5leHBvcnQgdHlwZSBGc1N0b3JhZ2VSZXN1bHQ8SyBleHRlbmRzIEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gTWVtb3J5U3RvcmFnZVJlc3VsdDxLPjtcbi8qKiBGc1N0b3JhZ2UgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBGc1N0b3JhZ2VEYXRhVHlwZXMgPSBNZW1vcnlTdG9yYWdlRGF0YVR5cGVzO1xuLyoqIEZzU3RvcmFnZSByZXR1cm4gdHlwZSAqL1xuZXhwb3J0IHR5cGUgRnNTdG9yYWdlUmV0dXJuVHlwZTxEIGV4dGVuZHMgRnNTdG9yYWdlRGF0YVR5cGVzPiA9IE1lbW9yeVN0b3JhZ2VSZXR1cm5UeXBlPEQ+O1xuLyoqIEZzU3RvcmFnZSBpbnB1dCBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEZzU3RvcmFnZUlucHV0RGF0YVR5cGVzID0gTWVtb3J5U3RvcmFnZUlucHV0RGF0YVR5cGVzO1xuLyoqIEZzU3RvcmFnZSBldmVudCBjYWxsYmFjayAqL1xuZXhwb3J0IHR5cGUgRnNTdG9yYWdlRXZlbnRDYWxsYmFjayA9IE1lbW9yeVN0b3JhZ2VFdmVudENhbGxiYWNrO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IHdyaXRlRmlsZUFzeW5jID0gcHJvbWlzaWZ5KHdyaXRlRmlsZSk7XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBGaWxlIFN5c3RlbSAobm9kZSBmcykgc3RvcmFnZSBjbGFzcy5cbiAqIEBqYSDjg5XjgqHjgqTjg6vjgrfjgrnjg4bjg6Djgrnjg4jjg6zjg7zjgrjjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIEZzU3RvcmFnZSBpbXBsZW1lbnRzIElTdG9yYWdlIHtcblxuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9sb2NhdGlvbjogc3RyaW5nO1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdG9yYWdlOiBNZW1vcnlTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsb2NhdGlvblxuICAgICAqICAtIGBlbmAgc3RvcmFnZSBmaWxlIHBhdGguXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjg5XjgqHjgqTjg6vjg5HjgrnjgpLmjIflrppcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihsb2NhdGlvbjogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuX2xvY2F0aW9uID0gbG9jYXRpb247XG4gICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBuZXcgTWVtb3J5U3RvcmFnZSgpO1xuXG4gICAgICAgIGlmIChleGlzdHNTeW5jKHRoaXMuX2xvY2F0aW9uKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHRoaXMuX2xvY2F0aW9uKS50b1N0cmluZygpKTtcbiAgICAgICAgICAgIGNvbnN0IHJlZiA9IHRoaXMuX3N0b3JhZ2UuY29udGV4dDtcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgYXNzaWduVmFsdWUocmVmLCBrZXksIGRyb3BVbmRlZmluZWQoZGF0YVtrZXldLCB0cnVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJU3RvcmFnZVxuXG4gICAgLyoqXG4gICAgICogQGVuIFtbSVN0b3JhZ2VdXSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEgW1tJU3RvcmFnZV1dIOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnbm9kZS1mcyc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBrZXksIG9yIG51bGwgaWYgdGhlIGdpdmVuIGtleSBkb2VzIG5vdCBleGlzdCBpbiB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdC5cbiAgICAgKiBAamEg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5Y+W5b6XLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga8gbnVsbCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBSZXR1cm5zIHRoZSB2YWx1ZSB3aGljaCBjb3JyZXNwb25kcyB0byBhIGtleSB3aXRoIHR5cGUgY2hhbmdlIGRlc2lnbmF0ZWQgaW4gYGRhdGFUeXBlYC5cbiAgICAgKiAgLSBgamFgIGBkYXRhVHlwZWAg44Gn5oyH5a6a44GV44KM44Gf5Z6L5aSJ5o+b44KS6KGM44Gj44GmLCDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXRJdGVtPEQgZXh0ZW5kcyBGc1N0b3JhZ2VEYXRhVHlwZXMgPSBGc1N0b3JhZ2VEYXRhVHlwZXM+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IEZzU3RvcmFnZU9wdGlvbnM8bmV2ZXI+XG4gICAgKTogUHJvbWlzZTxGc1N0b3JhZ2VSZXR1cm5UeXBlPEQ+PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogRnNTdG9yYWdlT3B0aW9uczxLPlxuICAgICk6IFByb21pc2U8RnNTdG9yYWdlUmVzdWx0PEs+IHwgbnVsbD47XG5cbiAgICBnZXRJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogRnNTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8RnNTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5nZXRJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBwYWlyIGlkZW50aWZpZWQgYnkga2V5IHRvIHZhbHVlLCBjcmVhdGluZyBhIG5ldyBrZXkvdmFsdWUgcGFpciBpZiBub25lIGV4aXN0ZWQgZm9yIGtleSBwcmV2aW91c2x5LlxuICAgICAqIEBqYSDjgq3jg7zjgpLmjIflrprjgZfjgablgKTjgpLoqK3lrpouIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBr+aWsOimj+OBq+S9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc2V0SXRlbTxWIGV4dGVuZHMgRnNTdG9yYWdlSW5wdXREYXRhVHlwZXM+KGtleTogc3RyaW5nLCB2YWx1ZTogViwgb3B0aW9ucz86IEZzU3RvcmFnZU9wdGlvbnM8bmV2ZXI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShrZXksIHZhbHVlLCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlSlNPTihvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlcyB0aGUga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QsIGlmIGEga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGV4aXN0cy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kt44O844Gr5a++5b+c44GZ44KL5YCk44GM5a2Y5Zyo44GZ44KM44Gw5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyByZW1vdmVJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXksIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVKU09OKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbXB0aWVzIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0IG9mIGFsbCBrZXkvdmFsdWUgcGFpcnMsIGlmIHRoZXJlIGFyZSBhbnkuXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXIob3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLmNsZWFyKG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVKU09OKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFsbCBlbnRyeSBrZXlzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zkuIDopqfjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAga2V5cyhvcHRpb25zPzogQ2FuY2VsYWJsZSk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2Uua2V5cyhvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogRnNTdG9yYWdlRXZlbnRDYWxsYmFjayk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLm9uKGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogRnNTdG9yYWdlRXZlbnRDYWxsYmFjayk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdG9yYWdlLm9mZihsaXN0ZW5lcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3RvcmFnZSBmaWxlLlxuICAgICAqIEBqYSDkv53lrZjjg5XjgqHjgqTjg6vjga7lrozlhajliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmModGhpcy5fbG9jYXRpb24pKSB7XG4gICAgICAgICAgICB1bmxpbmtTeW5jKHRoaXMuX2xvY2F0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICB2b2lkIHRoaXMuX3N0b3JhZ2UuY2xlYXIoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbCBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlSlNPTihvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsganNvblNwYWNlIH0gPSAob3B0aW9ucyBhcyBJU3RvcmFnZUZvcm1hdE9wdGlvbnMpIHx8IHt9O1xuICAgICAgICBjb25zdCBqc29uID0gYCR7SlNPTi5zdHJpbmdpZnkodGhpcy5fc3RvcmFnZS5jb250ZXh0LCBudWxsLCBqc29uU3BhY2UpfVxcbmA7XG4gICAgICAgIHJldHVybiB3cml0ZUZpbGVBc3luYyh0aGlzLl9sb2NhdGlvbiwganNvbik7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUF5Q0EsaUJBQWlCLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUU3RDtBQUVBOzs7QUFHRztNQUNVLFNBQVMsQ0FBQTs7QUFHRCxJQUFBLFNBQVMsQ0FBUzs7QUFFbEIsSUFBQSxRQUFRLENBQWdCO0FBRXpDOzs7Ozs7QUFNRztBQUNILElBQUEsV0FBQSxDQUFZLFFBQWdCLEVBQUE7QUFDeEIsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztBQUMxQixRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztBQUVwQyxRQUFBLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUM1QixZQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBQ2pFLFlBQUEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDbEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ2pDLGdCQUFBLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN6RCxhQUFBO0FBQ0osU0FBQTtLQUNKOzs7QUFLRDs7O0FBR0c7QUFDSCxJQUFBLElBQUksSUFBSSxHQUFBO0FBQ0osUUFBQSxPQUFPLFNBQVMsQ0FBQztLQUNwQjtJQXdDRCxPQUFPLENBQUMsR0FBVyxFQUFFLE9BQTBCLEVBQUE7UUFDM0MsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDOUM7QUFFRDs7Ozs7Ozs7OztBQVVHO0FBQ0gsSUFBQSxNQUFNLE9BQU8sQ0FBb0MsR0FBVyxFQUFFLEtBQVEsRUFBRSxPQUFpQyxFQUFBO0FBQ3JHLFFBQUEsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2pELFFBQUEsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ25DO0FBRUQ7Ozs7Ozs7QUFPRztBQUNILElBQUEsTUFBTSxVQUFVLENBQUMsR0FBVyxFQUFFLE9BQXlCLEVBQUE7UUFDbkQsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDN0MsUUFBQSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDbkM7QUFFRDs7Ozs7OztBQU9HO0lBQ0gsTUFBTSxLQUFLLENBQUMsT0FBeUIsRUFBQTtRQUNqQyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ25DLFFBQUEsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ25DO0FBRUQ7Ozs7Ozs7QUFPRztBQUNILElBQUEsSUFBSSxDQUFDLE9BQW9CLEVBQUE7UUFDckIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUN0QztBQUVEOzs7Ozs7O0FBT0c7QUFDSCxJQUFBLEVBQUUsQ0FBQyxRQUFnQyxFQUFBO1FBQy9CLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDckM7QUFFRDs7Ozs7Ozs7O0FBU0c7QUFDSCxJQUFBLEdBQUcsQ0FBQyxRQUFpQyxFQUFBO0FBQ2pDLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDL0I7OztBQUtEOzs7QUFHRztJQUNJLE9BQU8sR0FBQTtBQUNWLFFBQUEsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQzVCLFlBQUEsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM5QixTQUFBO0FBQ0QsUUFBQSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDOUI7Ozs7QUFNTyxJQUFBLFVBQVUsQ0FBQyxPQUF5QixFQUFBO0FBQ3hDLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFJLE9BQWlDLElBQUksRUFBRSxDQUFDO0FBQy9ELFFBQUEsTUFBTSxJQUFJLEdBQUcsQ0FBQSxFQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUM7UUFDM0UsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUMvQztBQUNKOzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9mcy1zdG9yYWdlLyJ9