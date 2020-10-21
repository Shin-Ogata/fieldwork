/*!
 * @cdp/web-storage 0.9.5
 *   web storage utility module
 */

import { verify, dropUndefined, deepEqual } from '@cdp/core-utils';
import { EventBroker } from '@cdp/events';
import { checkCanceled } from '@cdp/promise';
import { deserialize, serialize } from '@cdp/binary';

//__________________________________________________________________________________________________//
/**
 * @en Web storage class. This class implements `IStorage` interface by using `window.localStorage`.
 * @ja ウェブストレージクラス. 本クラスは `window.localStorage` を用いて `IStorage` を実装
 */
class WebStorage {
    /**
     * constructor
     *
     * @param storage
     *  - `en` Web [[Storage]] instance
     *  - `ja` Web [[Storage]] インスタンス
     */
    constructor(storage) {
        this._broker = new EventBroker();
        verify('instanceOf', Storage, storage);
        this._storage = storage;
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IStorage
    /**
     * @en [[IStorage]] kind signature.
     * @ja [[IStorage]] の種別を表す識別子
     */
    get kind() {
        const signature = localStorage === this._storage ? 'local-storage' : 'session-storage';
        return `web:${signature}`;
    }
    async getItem(key, options) {
        return dropUndefined(await deserialize(this._storage[key], options)); // eslint-disable-line @typescript-eslint/no-non-null-assertion
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
        const newVal = dropUndefined(value, true); // `null` or `undefined` → 'null' or 'undefined'
        const oldVal = dropUndefined(await deserialize(this._storage[key], options)); // `undefined` → `null`
        if (!deepEqual(oldVal, newVal)) {
            this._storage.setItem(key, await serialize(newVal, options));
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
        await checkCanceled(options.cancel);
        const value = this._storage[key];
        if (undefined !== value) {
            this._storage.removeItem(key);
            !options.silent && this._broker.trigger('@', key, null, await deserialize(value, options));
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
        if (0 < this._storage.length) {
            this._storage.clear();
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
// default storage
const webStorage = new WebStorage(localStorage);

export default webStorage;
export { WebStorage, webStorage };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXN0b3JhZ2UubWpzIiwic291cmNlcyI6WyJ3ZWItc3RvcmFnZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIEtleXMsXG4gICAgVHlwZXMsXG4gICAgS2V5VG9UeXBlLFxuICAgIHZlcmlmeSxcbiAgICBkZWVwRXF1YWwsXG4gICAgZHJvcFVuZGVmaW5lZCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgRXZlbnRCcm9rZXIgfSBmcm9tICdAY2RwL2V2ZW50cyc7XG5pbXBvcnQge1xuICAgIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7XG4gICAgU3RvcmFnZURhdGFUeXBlTGlzdCxcbiAgICBTdG9yYWdlSW5wdXREYXRhVHlwZUxpc3QsXG4gICAgSVN0b3JhZ2VPcHRpb25zLFxuICAgIElTdG9yYWdlRGF0YU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VEYXRhUmV0dXJuVHlwZSxcbiAgICBJU3RvcmFnZUV2ZW50Q2FsbGJhY2ssXG4gICAgSVN0b3JhZ2UsXG59IGZyb20gJ0BjZHAvY29yZS1zdG9yYWdlJztcbmltcG9ydCB7XG4gICAgU2VyaWFsaXphYmxlLFxuICAgIHNlcmlhbGl6ZSxcbiAgICBkZXNlcmlhbGl6ZSxcbn0gZnJvbSAnQGNkcC9iaW5hcnknO1xuXG4vKipcbiAqIEBlbiBXZWIgc3RvcmFnZSBkYXRhIHR5cGUgc2V0IGludGVyZmFjZS5cbiAqIEBqYSBXZWIgc3RvcmFnZSDjgavmoLzntI3lj6/og73jgarlnovjga7pm4blkIhcbiAqL1xuZXhwb3J0IHR5cGUgV2ViU3RvcmFnZURhdGFUeXBlTGlzdCA9IFN0b3JhZ2VEYXRhVHlwZUxpc3QgJiBTZXJpYWxpemFibGU7XG4vKiogV2ViU3RvcmFnZSBJL08gb3B0aW9ucyAqL1xuZXhwb3J0IHR5cGUgV2ViU3RvcmFnZU9wdGlvbnM8SyBleHRlbmRzIEtleXM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4gPSBLZXlzPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IElTdG9yYWdlRGF0YU9wdGlvbnM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdCwgSz47XG4vKiogV2ViU3RvcmFnZSByZXR1cm4gdmFsdWUgKi9cbmV4cG9ydCB0eXBlIFdlYlN0b3JhZ2VSZXN1bHQ8SyBleHRlbmRzIEtleXM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gS2V5VG9UeXBlPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3QsIEs+O1xuLyoqIFdlYlN0b3JhZ2UgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlRGF0YVR5cGVzID0gVHlwZXM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD47XG4vKiogTWVtb3J5U3RvcmFnZSByZXR1cm4gdHlwZSAqL1xuZXhwb3J0IHR5cGUgTWVtb3J5U3RvcmFnZVJldHVyblR5cGU8RCBleHRlbmRzIFdlYlN0b3JhZ2VEYXRhVHlwZXM+ID0gSVN0b3JhZ2VEYXRhUmV0dXJuVHlwZTxTdG9yYWdlRGF0YVR5cGVMaXN0LCBEPjtcbi8qKiBXZWJTdG9yYWdlIGlucHV0IGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgV2ViU3RvcmFnZUlucHV0RGF0YVR5cGVzID0gU3RvcmFnZUlucHV0RGF0YVR5cGVMaXN0PFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuLyoqIFdlYlN0b3JhZ2UgZXZlbnQgY2FsbGJhY2sgKi9cbmV4cG9ydCB0eXBlIFdlYlN0b3JhZ2VFdmVudENhbGxiYWNrID0gSVN0b3JhZ2VFdmVudENhbGxiYWNrPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgV2ViU3RvcmFnZUV2ZW50IHtcbiAgICAnQCc6IFtzdHJpbmcgfCBudWxsLCBXZWJTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbCwgV2ViU3RvcmFnZURhdGFUeXBlcyB8IG51bGxdO1xufVxuXG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fLy9cblxuLyoqXG4gKiBAZW4gV2ViIHN0b3JhZ2UgY2xhc3MuIFRoaXMgY2xhc3MgaW1wbGVtZW50cyBgSVN0b3JhZ2VgIGludGVyZmFjZSBieSB1c2luZyBgd2luZG93LmxvY2FsU3RvcmFnZWAuXG4gKiBAamEg44Km44Kn44OW44K544OI44Os44O844K444Kv44Op44K5LiDmnKzjgq/jg6njgrnjga8gYHdpbmRvdy5sb2NhbFN0b3JhZ2VgIOOCkueUqOOBhOOBpiBgSVN0b3JhZ2VgIOOCkuWun+ijhVxuICovXG5leHBvcnQgY2xhc3MgV2ViU3RvcmFnZSBpbXBsZW1lbnRzIElTdG9yYWdlPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+IHtcblxuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxXZWJTdG9yYWdlRXZlbnQ+KCk7XG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RvcmFnZTogU3RvcmFnZTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RvcmFnZVxuICAgICAqICAtIGBlbmAgV2ViIFtbU3RvcmFnZV1dIGluc3RhbmNlXG4gICAgICogIC0gYGphYCBXZWIgW1tTdG9yYWdlXV0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RvcmFnZTogU3RvcmFnZSkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBTdG9yYWdlLCBzdG9yYWdlKTtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHN0b3JhZ2U7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VcbiAgICAvKipcbiAgICAgKiBAZW4gW1tJU3RvcmFnZV1dIGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSBbW0lTdG9yYWdlXV0g44Gu56iu5Yil44KS6KGo44GZ6K2Y5Yil5a2QXG4gICAgICovXG4gICAgZ2V0IGtpbmQoKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3Qgc2lnbmF0dXJlID0gbG9jYWxTdG9yYWdlID09PSB0aGlzLl9zdG9yYWdlID8gJ2xvY2FsLXN0b3JhZ2UnIDogJ3Nlc3Npb24tc3RvcmFnZSc7XG4gICAgICAgIHJldHVybiBgd2ViOiR7c2lnbmF0dXJlfWA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBrZXksIG9yIG51bGwgaWYgdGhlIGdpdmVuIGtleSBkb2VzIG5vdCBleGlzdCBpbiB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdC5cbiAgICAgKiBAamEg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5Y+W5b6XLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga8gbnVsbCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBSZXR1cm5zIHRoZSB2YWx1ZSB3aGljaCBjb3JyZXNwb25kcyB0byBhIGtleSB3aXRoIHR5cGUgY2hhbmdlIGRlc2lnbmF0ZWQgaW4gYGRhdGFUeXBlYC5cbiAgICAgKiAgLSBgamFgIGBkYXRhVHlwZWAg44Gn5oyH5a6a44GV44KM44Gf5Z6L5aSJ5o+b44KS6KGM44Gj44GmLCDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXRJdGVtPEQgZXh0ZW5kcyBXZWJTdG9yYWdlRGF0YVR5cGVzID0gV2ViU3RvcmFnZURhdGFUeXBlcz4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogV2ViU3RvcmFnZU9wdGlvbnM8bmV2ZXI+XG4gICAgKTogUHJvbWlzZTxNZW1vcnlTdG9yYWdlUmV0dXJuVHlwZTxEPj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGtleSwgb3IgbnVsbCBpZiB0aGUgZ2l2ZW4ga2V5IGRvZXMgbm90IGV4aXN0IGluIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LlxuICAgICAqIEBqYSDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLlj5blvpcuIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBryBudWxsIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIFJldHVybnMgdGhlIHZhbHVlIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEga2V5IHdpdGggdHlwZSBjaGFuZ2UgZGVzaWduYXRlZCBpbiBgZGF0YVR5cGVgLlxuICAgICAqICAtIGBqYWAgYGRhdGFUeXBlYCDjgafmjIflrprjgZXjgozjgZ/lnovlpInmj5vjgpLooYzjgaPjgaYsIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIGdldEl0ZW08SyBleHRlbmRzIEtleXM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IFdlYlN0b3JhZ2VPcHRpb25zPEs+XG4gICAgKTogUHJvbWlzZTxXZWJTdG9yYWdlUmVzdWx0PEs+IHwgbnVsbD47XG5cbiAgICBhc3luYyBnZXRJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogV2ViU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPFdlYlN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsPiB7XG4gICAgICAgIHJldHVybiBkcm9wVW5kZWZpbmVkKGF3YWl0IGRlc2VyaWFsaXplKHRoaXMuX3N0b3JhZ2Vba2V5XSwgb3B0aW9ucyEpKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBwYWlyIGlkZW50aWZpZWQgYnkga2V5IHRvIHZhbHVlLCBjcmVhdGluZyBhIG5ldyBrZXkvdmFsdWUgcGFpciBpZiBub25lIGV4aXN0ZWQgZm9yIGtleSBwcmV2aW91c2x5LlxuICAgICAqIEBqYSDjgq3jg7zjgpLmjIflrprjgZfjgablgKTjgpLoqK3lrpouIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBr+aWsOimj+OBq+S9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc2V0SXRlbTxWIGV4dGVuZHMgV2ViU3RvcmFnZUlucHV0RGF0YVR5cGVzPihrZXk6IHN0cmluZywgdmFsdWU6IFYsIG9wdGlvbnM/OiBXZWJTdG9yYWdlT3B0aW9uczxuZXZlcj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGNvbnN0IG5ld1ZhbCA9IGRyb3BVbmRlZmluZWQodmFsdWUsIHRydWUpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYG51bGxgIG9yIGB1bmRlZmluZWRgIOKGkiAnbnVsbCcgb3IgJ3VuZGVmaW5lZCdcbiAgICAgICAgY29uc3Qgb2xkVmFsID0gZHJvcFVuZGVmaW5lZChhd2FpdCBkZXNlcmlhbGl6ZSh0aGlzLl9zdG9yYWdlW2tleV0sIG9wdGlvbnMpKTsgICAvLyBgdW5kZWZpbmVkYCDihpIgYG51bGxgXG4gICAgICAgIGlmICghZGVlcEVxdWFsKG9sZFZhbCwgbmV3VmFsKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKGtleSwgYXdhaXQgc2VyaWFsaXplKG5ld1ZhbCwgb3B0aW9ucykpO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci50cmlnZ2VyKCdAJywga2V5LCBuZXdWYWwsIG9sZFZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlcyB0aGUga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QsIGlmIGEga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGV4aXN0cy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kt44O844Gr5a++5b+c44GZ44KL5YCk44GM5a2Y5Zyo44GZ44KM44Gw5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyByZW1vdmVJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5fc3RvcmFnZVtrZXldO1xuICAgICAgICBpZiAodW5kZWZpbmVkICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBrZXksIG51bGwsIGF3YWl0IGRlc2VyaWFsaXplKHZhbHVlLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW1wdGllcyB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdCBvZiBhbGwga2V5L3ZhbHVlIHBhaXJzLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGNsZWFyKG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9zdG9yYWdlLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZS5jbGVhcigpO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci50cmlnZ2VyKCdAJywgbnVsbCwgbnVsbCwgbnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbGwgZW50cnkga2V5cy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O85LiA6Kan44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY2FuY2VsIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGtleXMob3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMgJiYgb3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RvcmFnZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24obGlzdGVuZXI6IFdlYlN0b3JhZ2VFdmVudENhbGxiYWNrKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jyb2tlci5vbignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogV2ViU3RvcmFnZUV2ZW50Q2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYnJva2VyLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG59XG5cbi8vIGRlZmF1bHQgc3RvcmFnZVxuZXhwb3J0IGNvbnN0IHdlYlN0b3JhZ2UgPSBuZXcgV2ViU3RvcmFnZShsb2NhbFN0b3JhZ2UpO1xuIl0sIm5hbWVzIjpbImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBbURBO0FBRUE7Ozs7TUFJYSxVQUFVOzs7Ozs7OztJQVluQixZQUFZLE9BQWdCO1FBVlgsWUFBTyxHQUFHLElBQUksV0FBVyxFQUFtQixDQUFDO1FBVzFELE1BQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO0tBQzNCOzs7Ozs7O0lBUUQsSUFBSSxJQUFJO1FBQ0osTUFBTSxTQUFTLEdBQUcsWUFBWSxLQUFLLElBQUksQ0FBQyxRQUFRLEdBQUcsZUFBZSxHQUFHLGlCQUFpQixDQUFDO1FBQ3ZGLE9BQU8sT0FBTyxTQUFTLEVBQUUsQ0FBQztLQUM3QjtJQXdDRCxNQUFNLE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBMkI7UUFDbEQsT0FBTyxhQUFhLENBQUMsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFRLENBQUMsQ0FBQyxDQUFDO0tBQ3pFOzs7Ozs7Ozs7Ozs7SUFhRCxNQUFNLE9BQU8sQ0FBcUMsR0FBVyxFQUFFLEtBQVEsRUFBRSxPQUFrQztRQUN2RyxPQUFPLEdB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
