/*!
 * @cdp/web-storage 0.9.21
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
    /** @internal */
    _broker = new EventBroker();
    /** @internal */
    _storage;
    /**
     * constructor
     *
     * @param storage
     *  - `en` Web {@link Storage} instance
     *  - `ja` Web {@link Storage} インスタンス
     */
    constructor(storage) {
        verify('instanceOf', Storage, storage);
        this._storage = storage;
    }
    ///////////////////////////////////////////////////////////////////////
    // implements: IStorage
    /**
     * @en {@link IStorage} kind signature.
     * @ja {@link IStorage} の種別を表す識別子
     */
    get kind() {
        const signature = localStorage === this._storage ? 'local-storage' : 'session-storage';
        return `web:${signature}`;
    }
    async getItem(key, options) {
        return dropUndefined(await deserialize(this._storage[key], options));
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
        options = options ?? {};
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
        options = options ?? {};
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
        options = options ?? {};
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
        await checkCanceled(options?.cancel);
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

export { WebStorage, webStorage as default, webStorage };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXN0b3JhZ2UubWpzIiwic291cmNlcyI6WyJ3ZWItc3RvcmFnZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIHR5cGUgS2V5cyxcbiAgICB0eXBlIFR5cGVzLFxuICAgIHR5cGUgS2V5VG9UeXBlLFxuICAgIHZlcmlmeSxcbiAgICBkZWVwRXF1YWwsXG4gICAgZHJvcFVuZGVmaW5lZCxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IHR5cGUgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgdHlwZSBDYW5jZWxhYmxlLFxuICAgIGNoZWNrQ2FuY2VsZWQgYXMgY2MsXG59IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgdHlwZSB7XG4gICAgU3RvcmFnZURhdGFUeXBlTGlzdCxcbiAgICBTdG9yYWdlSW5wdXREYXRhVHlwZUxpc3QsXG4gICAgSVN0b3JhZ2VPcHRpb25zLFxuICAgIElTdG9yYWdlRGF0YU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VEYXRhUmV0dXJuVHlwZSxcbiAgICBJU3RvcmFnZUV2ZW50Q2FsbGJhY2ssXG4gICAgSVN0b3JhZ2UsXG59IGZyb20gJ0BjZHAvY29yZS1zdG9yYWdlJztcbmltcG9ydCB7XG4gICAgdHlwZSBTZXJpYWxpemFibGUsXG4gICAgc2VyaWFsaXplLFxuICAgIGRlc2VyaWFsaXplLFxufSBmcm9tICdAY2RwL2JpbmFyeSc7XG5cbi8qKlxuICogQGVuIFdlYiBzdG9yYWdlIGRhdGEgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIFdlYiBzdG9yYWdlIOOBq+agvOe0jeWPr+iDveOBquWei+OBrumbhuWQiFxuICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlRGF0YVR5cGVMaXN0ID0gU3RvcmFnZURhdGFUeXBlTGlzdCAmIFNlcmlhbGl6YWJsZTtcbi8qKiBXZWJTdG9yYWdlIEkvTyBvcHRpb25zICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlT3B0aW9uczxLIGV4dGVuZHMgS2V5czxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0PiA9IEtleXM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gSVN0b3JhZ2VEYXRhT3B0aW9uczxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0LCBLPjtcbi8qKiBXZWJTdG9yYWdlIHJldHVybiB2YWx1ZSAqL1xuZXhwb3J0IHR5cGUgV2ViU3RvcmFnZVJlc3VsdDxLIGV4dGVuZHMgS2V5czxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBLZXlUb1R5cGU8V2ViU3RvcmFnZURhdGFUeXBlTGlzdCwgSz47XG4vKiogV2ViU3RvcmFnZSBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIFdlYlN0b3JhZ2VEYXRhVHlwZXMgPSBUeXBlczxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0Pjtcbi8qKiBNZW1vcnlTdG9yYWdlIHJldHVybiB0eXBlICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlUmV0dXJuVHlwZTxEIGV4dGVuZHMgV2ViU3RvcmFnZURhdGFUeXBlcz4gPSBJU3RvcmFnZURhdGFSZXR1cm5UeXBlPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEQ+O1xuLyoqIFdlYlN0b3JhZ2UgaW5wdXQgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlSW5wdXREYXRhVHlwZXMgPSBTdG9yYWdlSW5wdXREYXRhVHlwZUxpc3Q8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD47XG4vKiogV2ViU3RvcmFnZSBldmVudCBjYWxsYmFjayAqL1xuZXhwb3J0IHR5cGUgV2ViU3RvcmFnZUV2ZW50Q2FsbGJhY2sgPSBJU3RvcmFnZUV2ZW50Q2FsbGJhY2s8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBXZWJTdG9yYWdlRXZlbnQge1xuICAgICdAJzogW3N0cmluZyB8IG51bGwsIFdlYlN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsLCBXZWJTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbF07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBXZWIgc3RvcmFnZSBjbGFzcy4gVGhpcyBjbGFzcyBpbXBsZW1lbnRzIGBJU3RvcmFnZWAgaW50ZXJmYWNlIGJ5IHVzaW5nIGB3aW5kb3cubG9jYWxTdG9yYWdlYC5cbiAqIEBqYSDjgqbjgqfjg5bjgrnjg4jjg6zjg7zjgrjjgq/jg6njgrkuIOacrOOCr+ODqeOCueOBryBgd2luZG93LmxvY2FsU3RvcmFnZWAg44KS55So44GE44GmIGBJU3RvcmFnZWAg44KS5a6f6KOFXG4gKi9cbmV4cG9ydCBjbGFzcyBXZWJTdG9yYWdlIGltcGxlbWVudHMgSVN0b3JhZ2U8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4ge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxXZWJTdG9yYWdlRXZlbnQ+KCk7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0b3JhZ2U6IFN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0b3JhZ2VcbiAgICAgKiAgLSBgZW5gIFdlYiB7QGxpbmsgU3RvcmFnZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIFdlYiB7QGxpbmsgU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RvcmFnZTogU3RvcmFnZSkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBTdG9yYWdlLCBzdG9yYWdlKTtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHN0b3JhZ2U7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VcbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIElTdG9yYWdlfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElTdG9yYWdlfSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSBsb2NhbFN0b3JhZ2UgPT09IHRoaXMuX3N0b3JhZ2UgPyAnbG9jYWwtc3RvcmFnZScgOiAnc2Vzc2lvbi1zdG9yYWdlJztcbiAgICAgICAgcmV0dXJuIGB3ZWI6JHtzaWduYXR1cmV9YDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGtleSwgb3IgbnVsbCBpZiB0aGUgZ2l2ZW4ga2V5IGRvZXMgbm90IGV4aXN0IGluIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LlxuICAgICAqIEBqYSDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLlj5blvpcuIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBryBudWxsIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIFJldHVybnMgdGhlIHZhbHVlIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEga2V5IHdpdGggdHlwZSBjaGFuZ2UgZGVzaWduYXRlZCBpbiBgZGF0YVR5cGVgLlxuICAgICAqICAtIGBqYWAgYGRhdGFUeXBlYCDjgafmjIflrprjgZXjgozjgZ/lnovlpInmj5vjgpLooYzjgaPjgaYsIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIGdldEl0ZW08RCBleHRlbmRzIFdlYlN0b3JhZ2VEYXRhVHlwZXMgPSBXZWJTdG9yYWdlRGF0YVR5cGVzPihcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM/OiBXZWJTdG9yYWdlT3B0aW9uczxuZXZlcj5cbiAgICApOiBQcm9taXNlPFdlYlN0b3JhZ2VSZXR1cm5UeXBlPEQ+PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxLIGV4dGVuZHMgS2V5czxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0Pj4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogV2ViU3RvcmFnZU9wdGlvbnM8Sz5cbiAgICApOiBQcm9taXNlPFdlYlN0b3JhZ2VSZXN1bHQ8Sz4gfCBudWxsPjtcblxuICAgIGFzeW5jIGdldEl0ZW0oa2V5OiBzdHJpbmcsIG9wdGlvbnM/OiBXZWJTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8V2ViU3RvcmFnZURhdGFUeXBlcyB8IG51bGw+IHtcbiAgICAgICAgcmV0dXJuIGRyb3BVbmRlZmluZWQoYXdhaXQgZGVzZXJpYWxpemUodGhpcy5fc3RvcmFnZVtrZXldLCBvcHRpb25zISkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgcGFpciBpZGVudGlmaWVkIGJ5IGtleSB0byB2YWx1ZSwgY3JlYXRpbmcgYSBuZXcga2V5L3ZhbHVlIHBhaXIgaWYgbm9uZSBleGlzdGVkIGZvciBrZXkgcHJldmlvdXNseS5cbiAgICAgKiBAamEg44Kt44O844KS5oyH5a6a44GX44Gm5YCk44KS6Kit5a6aLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga/mlrDopo/jgavkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHNldEl0ZW08ViBleHRlbmRzIFdlYlN0b3JhZ2VJbnB1dERhdGFUeXBlcz4oa2V5OiBzdHJpbmcsIHZhbHVlOiBWLCBvcHRpb25zPzogV2ViU3RvcmFnZU9wdGlvbnM8bmV2ZXI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBkcm9wVW5kZWZpbmVkKHZhbHVlLCB0cnVlKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBudWxsYCBvciBgdW5kZWZpbmVkYCDihpIgJ251bGwnIG9yICd1bmRlZmluZWQnXG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IGRyb3BVbmRlZmluZWQoYXdhaXQgZGVzZXJpYWxpemUodGhpcy5fc3RvcmFnZVtrZXldLCBvcHRpb25zKSk7ICAgLy8gYHVuZGVmaW5lZGAg4oaSIGBudWxsYFxuICAgICAgICBpZiAoIWRlZXBFcXVhbChvbGRWYWwsIG5ld1ZhbCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShrZXksIGF3YWl0IHNlcmlhbGl6ZShuZXdWYWwsIG9wdGlvbnMpKTtcbiAgICAgICAgICAgICFvcHRpb25zLnNpbGVudCAmJiB0aGlzLl9icm9rZXIudHJpZ2dlcignQCcsIGtleSwgbmV3VmFsLCBvbGRWYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZXMgdGhlIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBmcm9tIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LCBpZiBhIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBleGlzdHMuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCreODvOOBq+WvvuW/nOOBmeOCi+WApOOBjOWtmOWcqOOBmeOCjOOBsOWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgcmVtb3ZlSXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuX3N0b3JhZ2Vba2V5XTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci50cmlnZ2VyKCdAJywga2V5LCBudWxsLCBhd2FpdCBkZXNlcmlhbGl6ZSh2YWx1ZSwgb3B0aW9ucykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVtcHRpZXMgdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3Qgb2YgYWxsIGtleS92YWx1ZSBwYWlycywgaWYgdGhlcmUgYXJlIGFueS5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBjbGVhcihvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGlmICgwIDwgdGhpcy5fc3RvcmFnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UuY2xlYXIoKTtcbiAgICAgICAgICAgICFvcHRpb25zLnNpbGVudCAmJiB0aGlzLl9icm9rZXIudHJpZ2dlcignQCcsIG51bGwsIG51bGwsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYWxsIGVudHJ5IGtleXMuXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCreODvOS4gOimp+OCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNhbmNlbCBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBrZXlzKG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zPy5jYW5jZWwpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RvcmFnZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24obGlzdGVuZXI6IFdlYlN0b3JhZ2VFdmVudENhbGxiYWNrKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jyb2tlci5vbignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogV2ViU3RvcmFnZUV2ZW50Q2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYnJva2VyLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG59XG5cbi8vIGRlZmF1bHQgc3RvcmFnZVxuZXhwb3J0IGNvbnN0IHdlYlN0b3JhZ2UgPSBuZXcgV2ViU3RvcmFnZShsb2NhbFN0b3JhZ2UpO1xuIl0sIm5hbWVzIjpbImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBbURBO0FBRUE7OztBQUdHO01BQ1UsVUFBVSxDQUFBOztBQUdGLElBQUEsT0FBTyxHQUFHLElBQUksV0FBVyxFQUFtQjs7QUFFNUMsSUFBQSxRQUFRO0FBRXpCOzs7Ozs7QUFNRztBQUNILElBQUEsV0FBQSxDQUFZLE9BQWdCLEVBQUE7QUFDeEIsUUFBQSxNQUFNLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUM7QUFDdEMsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU87SUFDM0I7OztBQUlBOzs7QUFHRztBQUNILElBQUEsSUFBSSxJQUFJLEdBQUE7QUFDSixRQUFBLE1BQU0sU0FBUyxHQUFHLFlBQVksS0FBSyxJQUFJLENBQUMsUUFBUSxHQUFHLGVBQWUsR0FBRyxpQkFBaUI7UUFDdEYsT0FBTyxDQUFBLElBQUEsRUFBTyxTQUFTLENBQUEsQ0FBRTtJQUM3QjtBQXdDQSxJQUFBLE1BQU0sT0FBTyxDQUFDLEdBQVcsRUFBRSxPQUEyQixFQUFBO0FBQ2xELFFBQUEsT0FBTyxhQUFhLENBQUMsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFH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