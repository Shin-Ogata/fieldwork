/*!
 * @cdp/fs-storage 0.9.20
 *   file-system storage utility module
 */

'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const node_util = require('node:util');
const node_fs = require('node:fs');
const coreUtils = require('@cdp/core-utils');
const coreStorage = require('@cdp/core-storage');

/** @internal */ const writeFileAsync = node_util.promisify(node_fs.writeFile);
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
        this._storage = new coreStorage.MemoryStorage();
        if (node_fs.existsSync(this._location)) {
            const data = JSON.parse(node_fs.readFileSync(this._location).toString());
            const ref = this._storage.context;
            for (const key of Object.keys(data)) {
                coreUtils.assignValue(ref, key, coreUtils.dropUndefined(data[key], true));
            }
        }
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IStorage
    /**
     * @en {@link IStorage} kind signature.
     * @ja {@link IStorage} の種別を表す識別子
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
        if (node_fs.existsSync(this._location)) {
            node_fs.unlinkSync(this._location);
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

exports.FsStorage = FsStorage;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnMtc3RvcmFnZS5qcyIsInNvdXJjZXMiOlsiZnMtc3RvcmFnZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICdub2RlOnV0aWwnO1xuaW1wb3J0IHtcbiAgICBleGlzdHNTeW5jLFxuICAgIHJlYWRGaWxlU3luYyxcbiAgICB3cml0ZUZpbGUsXG4gICAgdW5saW5rU3luYyxcbn0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQge1xuICAgIHR5cGUgS2V5cyxcbiAgICBkcm9wVW5kZWZpbmVkLFxuICAgIGFzc2lnblZhbHVlLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQgdHlwZSB7IENhbmNlbGFibGUgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICB0eXBlIElTdG9yYWdlLFxuICAgIHR5cGUgSVN0b3JhZ2VPcHRpb25zLFxuICAgIHR5cGUgSVN0b3JhZ2VGb3JtYXRPcHRpb25zLFxuICAgIHR5cGUgU3RvcmFnZURhdGFUeXBlTGlzdCxcbiAgICB0eXBlIE1lbW9yeVN0b3JhZ2VPcHRpb25zLFxuICAgIHR5cGUgTWVtb3J5U3RvcmFnZVJlc3VsdCxcbiAgICB0eXBlIE1lbW9yeVN0b3JhZ2VEYXRhVHlwZXMsXG4gICAgdHlwZSBNZW1vcnlTdG9yYWdlUmV0dXJuVHlwZSxcbiAgICB0eXBlIE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcyxcbiAgICB0eXBlIE1lbW9yeVN0b3JhZ2VFdmVudENhbGxiYWNrLFxuICAgIE1lbW9yeVN0b3JhZ2UsXG59IGZyb20gJ0BjZHAvY29yZS1zdG9yYWdlJztcblxuLyoqIEZzU3RvcmFnZSBJL08gb3B0aW9ucyAqL1xuZXhwb3J0IHR5cGUgRnNTdG9yYWdlT3B0aW9uczxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0PiA9IEtleXM8U3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gTWVtb3J5U3RvcmFnZU9wdGlvbnM8Sz47XG4vKiogRnNTdG9yYWdlIHJldHVybiB2YWx1ZSAqL1xuZXhwb3J0IHR5cGUgRnNTdG9yYWdlUmVzdWx0PEsgZXh0ZW5kcyBLZXlzPFN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IE1lbW9yeVN0b3JhZ2VSZXN1bHQ8Sz47XG4vKiogRnNTdG9yYWdlIGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgRnNTdG9yYWdlRGF0YVR5cGVzID0gTWVtb3J5U3RvcmFnZURhdGFUeXBlcztcbi8qKiBGc1N0b3JhZ2UgcmV0dXJuIHR5cGUgKi9cbmV4cG9ydCB0eXBlIEZzU3RvcmFnZVJldHVyblR5cGU8RCBleHRlbmRzIEZzU3RvcmFnZURhdGFUeXBlcz4gPSBNZW1vcnlTdG9yYWdlUmV0dXJuVHlwZTxEPjtcbi8qKiBGc1N0b3JhZ2UgaW5wdXQgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBGc1N0b3JhZ2VJbnB1dERhdGFUeXBlcyA9IE1lbW9yeVN0b3JhZ2VJbnB1dERhdGFUeXBlcztcbi8qKiBGc1N0b3JhZ2UgZXZlbnQgY2FsbGJhY2sgKi9cbmV4cG9ydCB0eXBlIEZzU3RvcmFnZUV2ZW50Q2FsbGJhY2sgPSBNZW1vcnlTdG9yYWdlRXZlbnRDYWxsYmFjaztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCB3cml0ZUZpbGVBc3luYyA9IHByb21pc2lmeSh3cml0ZUZpbGUpO1xuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gRmlsZSBTeXN0ZW0gKG5vZGUgZnMpIHN0b3JhZ2UgY2xhc3MuXG4gKiBAamEg44OV44Kh44Kk44Or44K344K544OG44Og44K544OI44Os44O844K444Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBGc1N0b3JhZ2UgaW1wbGVtZW50cyBJU3RvcmFnZSB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfbG9jYXRpb246IHN0cmluZztcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RvcmFnZTogTWVtb3J5U3RvcmFnZTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbG9jYXRpb25cbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2UgZmlsZSBwYXRoLlxuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444OV44Kh44Kk44Or44OR44K544KS5oyH5a6aXG4gICAgICovXG4gICAgY29uc3RydWN0b3IobG9jYXRpb246IHN0cmluZykge1xuICAgICAgICB0aGlzLl9sb2NhdGlvbiA9IGxvY2F0aW9uO1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gbmV3IE1lbW9yeVN0b3JhZ2UoKTtcblxuICAgICAgICBpZiAoZXhpc3RzU3luYyh0aGlzLl9sb2NhdGlvbikpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyh0aGlzLl9sb2NhdGlvbikudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBjb25zdCByZWYgPSB0aGlzLl9zdG9yYWdlLmNvbnRleHQ7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICAgICAgICAgIGFzc2lnblZhbHVlKHJlZiwga2V5LCBkcm9wVW5kZWZpbmVkKGRhdGFba2V5XSwgdHJ1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VcblxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSVN0b3JhZ2V9IGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSB7QGxpbmsgSVN0b3JhZ2V9IOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAnbm9kZS1mcyc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBrZXksIG9yIG51bGwgaWYgdGhlIGdpdmVuIGtleSBkb2VzIG5vdCBleGlzdCBpbiB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdC5cbiAgICAgKiBAamEg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5Y+W5b6XLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga8gbnVsbCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBSZXR1cm5zIHRoZSB2YWx1ZSB3aGljaCBjb3JyZXNwb25kcyB0byBhIGtleSB3aXRoIHR5cGUgY2hhbmdlIGRlc2lnbmF0ZWQgaW4gYGRhdGFUeXBlYC5cbiAgICAgKiAgLSBgamFgIGBkYXRhVHlwZWAg44Gn5oyH5a6a44GV44KM44Gf5Z6L5aSJ5o+b44KS6KGM44Gj44GmLCDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXRJdGVtPEQgZXh0ZW5kcyBGc1N0b3JhZ2VEYXRhVHlwZXMgPSBGc1N0b3JhZ2VEYXRhVHlwZXM+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IEZzU3RvcmFnZU9wdGlvbnM8bmV2ZXI+XG4gICAgKTogUHJvbWlzZTxGc1N0b3JhZ2VSZXR1cm5UeXBlPEQ+PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxLIGV4dGVuZHMgS2V5czxTdG9yYWdlRGF0YVR5cGVMaXN0Pj4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogRnNTdG9yYWdlT3B0aW9uczxLPlxuICAgICk6IFByb21pc2U8RnNTdG9yYWdlUmVzdWx0PEs+IHwgbnVsbD47XG5cbiAgICBnZXRJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogRnNTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8RnNTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbD4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RvcmFnZS5nZXRJdGVtKGtleSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBwYWlyIGlkZW50aWZpZWQgYnkga2V5IHRvIHZhbHVlLCBjcmVhdGluZyBhIG5ldyBrZXkvdmFsdWUgcGFpciBpZiBub25lIGV4aXN0ZWQgZm9yIGtleSBwcmV2aW91c2x5LlxuICAgICAqIEBqYSDjgq3jg7zjgpLmjIflrprjgZfjgablgKTjgpLoqK3lrpouIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBr+aWsOimj+OBq+S9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc2V0SXRlbTxWIGV4dGVuZHMgRnNTdG9yYWdlSW5wdXREYXRhVHlwZXM+KGtleTogc3RyaW5nLCB2YWx1ZTogViwgb3B0aW9ucz86IEZzU3RvcmFnZU9wdGlvbnM8bmV2ZXI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShrZXksIHZhbHVlLCBvcHRpb25zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlSlNPTihvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlcyB0aGUga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QsIGlmIGEga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGV4aXN0cy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kt44O844Gr5a++5b+c44GZ44KL5YCk44GM5a2Y5Zyo44GZ44KM44Gw5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyByZW1vdmVJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXksIG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVKU09OKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBFbXB0aWVzIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0IG9mIGFsbCBrZXkvdmFsdWUgcGFpcnMsIGlmIHRoZXJlIGFyZSBhbnkuXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgY2xlYXIob3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBhd2FpdCB0aGlzLl9zdG9yYWdlLmNsZWFyKG9wdGlvbnMpO1xuICAgICAgICByZXR1cm4gdGhpcy51cGRhdGVKU09OKG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIGFsbCBlbnRyeSBrZXlzLlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zkuIDopqfjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBjYW5jZWwgb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44Kt44Oj44Oz44K744Or44Kq44OX44K344On44OzXG4gICAgICovXG4gICAga2V5cyhvcHRpb25zPzogQ2FuY2VsYWJsZSk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0b3JhZ2Uua2V5cyhvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogRnNTdG9yYWdlRXZlbnRDYWxsYmFjayk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdG9yYWdlLm9uKGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogRnNTdG9yYWdlRXZlbnRDYWxsYmFjayk6IHZvaWQge1xuICAgICAgICB0aGlzLl9zdG9yYWdlLm9mZihsaXN0ZW5lcik7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3BlcmF0aW9uczpcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgc3RvcmFnZSBmaWxlLlxuICAgICAqIEBqYSDkv53lrZjjg5XjgqHjgqTjg6vjga7lrozlhajliYrpmaRcbiAgICAgKi9cbiAgICBwdWJsaWMgZGVzdHJveSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmModGhpcy5fbG9jYXRpb24pKSB7XG4gICAgICAgICAgICB1bmxpbmtTeW5jKHRoaXMuX2xvY2F0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICB2b2lkIHRoaXMuX3N0b3JhZ2UuY2xlYXIoKTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbnRlcm5hbCBtZXRob2RzOlxuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgdXBkYXRlSlNPTihvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHsganNvblNwYWNlIH0gPSAob3B0aW9ucyBhcyBJU3RvcmFnZUZvcm1hdE9wdGlvbnMpIHx8IHt9O1xuICAgICAgICBjb25zdCBqc29uID0gYCR7SlNPTi5zdHJpbmdpZnkodGhpcy5fc3RvcmFnZS5jb250ZXh0LCBudWxsLCBqc29uU3BhY2UpfVxcbmA7XG4gICAgICAgIHJldHVybiB3cml0ZUZpbGVBc3luYyh0aGlzLl9sb2NhdGlvbiwganNvbik7XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInByb21pc2lmeSIsIndyaXRlRmlsZSIsIk1lbW9yeVN0b3JhZ2UiLCJleGlzdHNTeW5jIiwicmVhZEZpbGVTeW5jIiwiYXNzaWduVmFsdWUiLCJkcm9wVW5kZWZpbmVkIiwidW5saW5rU3luYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUF5Q0EsaUJBQWlCLE1BQU0sY0FBYyxHQUFHQSxtQkFBUyxDQUFDQyxpQkFBUyxDQUFDO0FBRTVEO0FBRUE7OztBQUdHO01BQ1UsU0FBUyxDQUFBOztBQUdELElBQUEsU0FBUzs7QUFFVCxJQUFBLFFBQVE7QUFFekI7Ozs7OztBQU1HO0FBQ0gsSUFBQSxXQUFBLENBQVksUUFBZ0IsRUFBQTtBQUN4QixRQUFBLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUTtBQUN6QixRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSUMseUJBQWEsRUFBRTtBQUVuQyxRQUFBLElBQUlDLGtCQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQzVCLFlBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQ0Msb0JBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDaEUsWUFBQSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU87WUFDakMsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ2pDLGdCQUFBQyxxQkFBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUVDLHVCQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDOzs7Ozs7QUFRakU7OztBQUdHO0FBQ0gsSUFBQSxJQUFJLElBQUksR0FBQTtBQUNKLFFBQUEsT0FBTyxTQUFTOztJQXlDcEIsT0FBTyxDQUFDLEdBQVcsRUFBRSxPQUEwQixFQUFBO1FBQzNDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQzs7QUFHOUM7Ozs7Ozs7Ozs7QUFVRztBQUNILElBQUEsTUFBTSxPQUFPLENBQW9DLEdBQVcsRUFBRSxLQUFRLEVBQUUsT0FBaUMsRUFBQTtBQUNyRyxRQUFBLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUM7QUFDaEQsUUFBQSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDOztBQUduQzs7Ozs7OztBQU9HO0FBQ0gsSUFBQSxNQUFNLFVBQVUsQ0FBQyxHQUFXLEVBQUUsT0FBeUIsRUFBQTtRQUNuRCxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUM7QUFDNUMsUUFBQSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDOztBQUduQzs7Ozs7OztBQU9HO0lBQ0gsTUFBTSxLQUFLLENBQUMsT0FBeUIsRUFBQTtRQUNqQyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztBQUNsQyxRQUFBLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7O0FBR25DOzs7Ozs7O0FBT0c7QUFDSCxJQUFBLElBQUksQ0FBQyxPQUFvQixFQUFBO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDOztBQUd0Qzs7Ozs7OztBQU9HO0FBQ0gsSUFBQSxFQUFFLENBQUMsUUFBZ0MsRUFBQTtRQUMvQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQzs7QUFHckM7Ozs7Ozs7OztBQVNHO0FBQ0gsSUFBQSxHQUFHLENBQUMsUUFBaUMsRUFBQTtBQUNqQyxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQzs7OztBQU0vQjs7O0FBR0c7SUFDSSxPQUFPLEdBQUE7QUFDVixRQUFBLElBQUlILGtCQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO0FBQzVCLFlBQUFJLGtCQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQzs7QUFFOUIsUUFBQSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFOzs7OztBQU90QixJQUFBLFVBQVUsQ0FBQyxPQUF5QixFQUFBO0FBQ3hDLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFJLE9BQWlDLElBQUksRUFBRTtBQUM5RCxRQUFBLE1BQU0sSUFBSSxHQUFHLENBQUEsRUFBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsSUFBSTtRQUMxRSxPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQzs7QUFFbEQ7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2ZzLXN0b3JhZ2UvIn0=