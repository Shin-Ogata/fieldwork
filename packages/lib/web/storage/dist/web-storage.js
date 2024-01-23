/*!
 * @cdp/web-storage 0.9.18
 *   web storage utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/events'), require('@cdp/promise'), require('@cdp/binary')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/events', '@cdp/promise', '@cdp/binary'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, events, promise, binary) { 'use strict';

    //__________________________________________________________________________________________________//
    /**
     * @en Web storage class. This class implements `IStorage` interface by using `window.localStorage`.
     * @ja ウェブストレージクラス. 本クラスは `window.localStorage` を用いて `IStorage` を実装
     */
    class WebStorage {
        /** @internal */
        _broker = new events.EventBroker();
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
            coreUtils.verify('instanceOf', Storage, storage);
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
            return coreUtils.dropUndefined(await binary.deserialize(this._storage[key], options));
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
            const newVal = coreUtils.dropUndefined(value, true); // `null` or `undefined` → 'null' or 'undefined'
            const oldVal = coreUtils.dropUndefined(await binary.deserialize(this._storage[key], options)); // `undefined` → `null`
            if (!coreUtils.deepEqual(oldVal, newVal)) {
                this._storage.setItem(key, await binary.serialize(newVal, options));
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
            await promise.checkCanceled(options.cancel);
            const value = this._storage[key];
            if (undefined !== value) {
                this._storage.removeItem(key);
                !options.silent && this._broker.trigger('@', key, null, await binary.deserialize(value, options));
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
            await promise.checkCanceled(options.cancel);
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
            await promise.checkCanceled(options?.cancel);
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

    exports.WebStorage = WebStorage;
    exports.default = webStorage;
    exports.webStorage = webStorage;

    Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: 'Module' } });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXN0b3JhZ2UuanMiLCJzb3VyY2VzIjpbIndlYi1zdG9yYWdlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBUeXBlcyxcbiAgICBLZXlUb1R5cGUsXG4gICAgdmVyaWZ5LFxuICAgIGRlZXBFcXVhbCxcbiAgICBkcm9wVW5kZWZpbmVkLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnRzJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBTdG9yYWdlRGF0YVR5cGVMaXN0LFxuICAgIFN0b3JhZ2VJbnB1dERhdGFUeXBlTGlzdCxcbiAgICBJU3RvcmFnZU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VEYXRhT3B0aW9ucyxcbiAgICBJU3RvcmFnZURhdGFSZXR1cm5UeXBlLFxuICAgIElTdG9yYWdlRXZlbnRDYWxsYmFjayxcbiAgICBJU3RvcmFnZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuaW1wb3J0IHtcbiAgICBTZXJpYWxpemFibGUsXG4gICAgc2VyaWFsaXplLFxuICAgIGRlc2VyaWFsaXplLFxufSBmcm9tICdAY2RwL2JpbmFyeSc7XG5cbi8qKlxuICogQGVuIFdlYiBzdG9yYWdlIGRhdGEgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIFdlYiBzdG9yYWdlIOOBq+agvOe0jeWPr+iDveOBquWei+OBrumbhuWQiFxuICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlRGF0YVR5cGVMaXN0ID0gU3RvcmFnZURhdGFUeXBlTGlzdCAmIFNlcmlhbGl6YWJsZTtcbi8qKiBXZWJTdG9yYWdlIEkvTyBvcHRpb25zICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlT3B0aW9uczxLIGV4dGVuZHMgS2V5czxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0PiA9IEtleXM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4+ID0gSVN0b3JhZ2VEYXRhT3B0aW9uczxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0LCBLPjtcbi8qKiBXZWJTdG9yYWdlIHJldHVybiB2YWx1ZSAqL1xuZXhwb3J0IHR5cGUgV2ViU3RvcmFnZVJlc3VsdDxLIGV4dGVuZHMgS2V5czxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBLZXlUb1R5cGU8V2ViU3RvcmFnZURhdGFUeXBlTGlzdCwgSz47XG4vKiogV2ViU3RvcmFnZSBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIFdlYlN0b3JhZ2VEYXRhVHlwZXMgPSBUeXBlczxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0Pjtcbi8qKiBNZW1vcnlTdG9yYWdlIHJldHVybiB0eXBlICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlUmV0dXJuVHlwZTxEIGV4dGVuZHMgV2ViU3RvcmFnZURhdGFUeXBlcz4gPSBJU3RvcmFnZURhdGFSZXR1cm5UeXBlPFN0b3JhZ2VEYXRhVHlwZUxpc3QsIEQ+O1xuLyoqIFdlYlN0b3JhZ2UgaW5wdXQgZGF0YSB0eXBlICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlSW5wdXREYXRhVHlwZXMgPSBTdG9yYWdlSW5wdXREYXRhVHlwZUxpc3Q8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD47XG4vKiogV2ViU3RvcmFnZSBldmVudCBjYWxsYmFjayAqL1xuZXhwb3J0IHR5cGUgV2ViU3RvcmFnZUV2ZW50Q2FsbGJhY2sgPSBJU3RvcmFnZUV2ZW50Q2FsbGJhY2s8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD47XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmludGVyZmFjZSBXZWJTdG9yYWdlRXZlbnQge1xuICAgICdAJzogW3N0cmluZyB8IG51bGwsIFdlYlN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsLCBXZWJTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbF07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBXZWIgc3RvcmFnZSBjbGFzcy4gVGhpcyBjbGFzcyBpbXBsZW1lbnRzIGBJU3RvcmFnZWAgaW50ZXJmYWNlIGJ5IHVzaW5nIGB3aW5kb3cubG9jYWxTdG9yYWdlYC5cbiAqIEBqYSDjgqbjgqfjg5bjgrnjg4jjg6zjg7zjgrjjgq/jg6njgrkuIOacrOOCr+ODqeOCueOBryBgd2luZG93LmxvY2FsU3RvcmFnZWAg44KS55So44GE44GmIGBJU3RvcmFnZWAg44KS5a6f6KOFXG4gKi9cbmV4cG9ydCBjbGFzcyBXZWJTdG9yYWdlIGltcGxlbWVudHMgSVN0b3JhZ2U8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4ge1xuXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX2Jyb2tlciA9IG5ldyBFdmVudEJyb2tlcjxXZWJTdG9yYWdlRXZlbnQ+KCk7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgcmVhZG9ubHkgX3N0b3JhZ2U6IFN0b3JhZ2U7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHN0b3JhZ2VcbiAgICAgKiAgLSBgZW5gIFdlYiB7QGxpbmsgU3RvcmFnZX0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIFdlYiB7QGxpbmsgU3RvcmFnZX0g44Kk44Oz44K544K/44Oz44K5XG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3RvcmFnZTogU3RvcmFnZSkge1xuICAgICAgICB2ZXJpZnkoJ2luc3RhbmNlT2YnLCBTdG9yYWdlLCBzdG9yYWdlKTtcbiAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHN0b3JhZ2U7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gaW1wbGVtZW50czogSVN0b3JhZ2VcbiAgICAvKipcbiAgICAgKiBAZW4ge0BsaW5rIElTdG9yYWdlfSBraW5kIHNpZ25hdHVyZS5cbiAgICAgKiBAamEge0BsaW5rIElTdG9yYWdlfSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSBsb2NhbFN0b3JhZ2UgPT09IHRoaXMuX3N0b3JhZ2UgPyAnbG9jYWwtc3RvcmFnZScgOiAnc2Vzc2lvbi1zdG9yYWdlJztcbiAgICAgICAgcmV0dXJuIGB3ZWI6JHtzaWduYXR1cmV9YDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGtleSwgb3IgbnVsbCBpZiB0aGUgZ2l2ZW4ga2V5IGRvZXMgbm90IGV4aXN0IGluIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LlxuICAgICAqIEBqYSDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLlj5blvpcuIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBryBudWxsIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIFJldHVybnMgdGhlIHZhbHVlIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEga2V5IHdpdGggdHlwZSBjaGFuZ2UgZGVzaWduYXRlZCBpbiBgZGF0YVR5cGVgLlxuICAgICAqICAtIGBqYWAgYGRhdGFUeXBlYCDjgafmjIflrprjgZXjgozjgZ/lnovlpInmj5vjgpLooYzjgaPjgaYsIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIGdldEl0ZW08RCBleHRlbmRzIFdlYlN0b3JhZ2VEYXRhVHlwZXMgPSBXZWJTdG9yYWdlRGF0YVR5cGVzPihcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM/OiBXZWJTdG9yYWdlT3B0aW9uczxuZXZlcj5cbiAgICApOiBQcm9taXNlPFdlYlN0b3JhZ2VSZXR1cm5UeXBlPEQ+PjtcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxLIGV4dGVuZHMgS2V5czxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0Pj4oXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBvcHRpb25zPzogV2ViU3RvcmFnZU9wdGlvbnM8Sz5cbiAgICApOiBQcm9taXNlPFdlYlN0b3JhZ2VSZXN1bHQ8Sz4gfCBudWxsPjtcblxuICAgIGFzeW5jIGdldEl0ZW0oa2V5OiBzdHJpbmcsIG9wdGlvbnM/OiBXZWJTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8V2ViU3RvcmFnZURhdGFUeXBlcyB8IG51bGw+IHtcbiAgICAgICAgcmV0dXJuIGRyb3BVbmRlZmluZWQoYXdhaXQgZGVzZXJpYWxpemUodGhpcy5fc3RvcmFnZVtrZXldLCBvcHRpb25zISkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgcGFpciBpZGVudGlmaWVkIGJ5IGtleSB0byB2YWx1ZSwgY3JlYXRpbmcgYSBuZXcga2V5L3ZhbHVlIHBhaXIgaWYgbm9uZSBleGlzdGVkIGZvciBrZXkgcHJldmlvdXNseS5cbiAgICAgKiBAamEg44Kt44O844KS5oyH5a6a44GX44Gm5YCk44KS6Kit5a6aLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga/mlrDopo/jgavkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHNldEl0ZW08ViBleHRlbmRzIFdlYlN0b3JhZ2VJbnB1dERhdGFUeXBlcz4oa2V5OiBzdHJpbmcsIHZhbHVlOiBWLCBvcHRpb25zPzogV2ViU3RvcmFnZU9wdGlvbnM8bmV2ZXI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBkcm9wVW5kZWZpbmVkKHZhbHVlLCB0cnVlKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBudWxsYCBvciBgdW5kZWZpbmVkYCDihpIgJ251bGwnIG9yICd1bmRlZmluZWQnXG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IGRyb3BVbmRlZmluZWQoYXdhaXQgZGVzZXJpYWxpemUodGhpcy5fc3RvcmFnZVtrZXldLCBvcHRpb25zKSk7ICAgLy8gYHVuZGVmaW5lZGAg4oaSIGBudWxsYFxuICAgICAgICBpZiAoIWRlZXBFcXVhbChvbGRWYWwsIG5ld1ZhbCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShrZXksIGF3YWl0IHNlcmlhbGl6ZShuZXdWYWwsIG9wdGlvbnMpKTtcbiAgICAgICAgICAgICFvcHRpb25zLnNpbGVudCAmJiB0aGlzLl9icm9rZXIudHJpZ2dlcignQCcsIGtleSwgbmV3VmFsLCBvbGRWYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZXMgdGhlIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBmcm9tIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LCBpZiBhIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBleGlzdHMuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCreODvOOBq+WvvuW/nOOBmeOCi+WApOOBjOWtmOWcqOOBmeOCjOOBsOWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgcmVtb3ZlSXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyA/PyB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuX3N0b3JhZ2Vba2V5XTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci50cmlnZ2VyKCdAJywga2V5LCBudWxsLCBhd2FpdCBkZXNlcmlhbGl6ZSh2YWx1ZSwgb3B0aW9ucykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVtcHRpZXMgdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3Qgb2YgYWxsIGtleS92YWx1ZSBwYWlycywgaWYgdGhlcmUgYXJlIGFueS5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBjbGVhcihvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGlmICgwIDwgdGhpcy5fc3RvcmFnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UuY2xlYXIoKTtcbiAgICAgICAgICAgICFvcHRpb25zLnNpbGVudCAmJiB0aGlzLl9icm9rZXIudHJpZ2dlcignQCcsIG51bGwsIG51bGwsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYWxsIGVudHJ5IGtleXMuXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCreODvOS4gOimp+OCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNhbmNlbCBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBrZXlzKG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zPy5jYW5jZWwpO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RvcmFnZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFN1YnNjcml2ZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kit5a6aXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqICAtIGBqYWAg44Gf44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICovXG4gICAgb24obGlzdGVuZXI6IFdlYlN0b3JhZ2VFdmVudENhbGxiYWNrKTogU3Vic2NyaXB0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2Jyb2tlci5vbignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gVW5zdWJzY3JpYmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreino+mZpFxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgICAgICAgIFdoZW4gbm90IHNldCB0aGlzIHBhcmFtZXRlciwgbGlzdGVuZXJzIGFyZSByZWxlYXNlZC5cbiAgICAgKiAgLSBgamFgIOOCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqICAgICAgICAg5oyH5a6a44GX44Gq44GE5aC05ZCI44Gv44GZ44G544Gm44KS6Kej6ZmkXG4gICAgICovXG4gICAgb2ZmKGxpc3RlbmVyPzogV2ViU3RvcmFnZUV2ZW50Q2FsbGJhY2spOiB2b2lkIHtcbiAgICAgICAgdGhpcy5fYnJva2VyLm9mZignQCcsIGxpc3RlbmVyKTtcbiAgICB9XG59XG5cbi8vIGRlZmF1bHQgc3RvcmFnZVxuZXhwb3J0IGNvbnN0IHdlYlN0b3JhZ2UgPSBuZXcgV2ViU3RvcmFnZShsb2NhbFN0b3JhZ2UpO1xuIl0sIm5hbWVzIjpbIkV2ZW50QnJva2VyIiwidmVyaWZ5IiwiZHJvcFVuZGVmaW5lZCIsImRlc2VyaWFsaXplIiwiZGVlcEVxdWFsIiwic2VyaWFsaXplIiwiY2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBbURBO0lBRUE7OztJQUdHO1VBQ1UsVUFBVSxDQUFBOztJQUdGLElBQUEsT0FBTyxHQUFHLElBQUlBLGtCQUFXLEVBQW1CLENBQUM7O0lBRTdDLElBQUEsUUFBUSxDQUFVO0lBRW5DOzs7Ozs7SUFNRztJQUNILElBQUEsV0FBQSxDQUFZLE9BQWdCLEVBQUE7SUFDeEIsUUFBQUMsZ0JBQU0sQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7U0FDM0I7OztJQUlEOzs7SUFHRztJQUNILElBQUEsSUFBSSxJQUFJLEdBQUE7SUFDSixRQUFBLE1BQU0sU0FBUyxHQUFHLFlBQVksS0FBSyxJQUFJLENBQUMsUUFBUSxHQUFHLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQztZQUN2RixPQUFPLENBQUEsSUFBQSxFQUFPLFNBQVMsQ0FBQSxDQUFFLENBQUM7U0FDN0I7SUF3Q0QsSUFBQSxNQUFNLE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBMkIsRUFBQTtJQUNsRCxRQUFBLE9BQU9DLHVCQUFhLENBQUMsTUFBTUMsa0JBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQVEsQ0FBQyxDQUFDLENBQUM7U0FDekU7SUFFRDs7Ozs7Ozs7OztJQVVHO0lBQ0gsSUFBQSxNQUFNLE9BQU8sQ0FBcUMsR0FBVyxFQUFFLEtBQVEsRUFBRSxPQUFrQyxFQUFBO0lBQ3ZHLFFBQUEsT0FBTyxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDeEIsTUFBTSxNQUFNLEdBQUdELHVCQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFDLFFBQUEsTUFBTSxNQUFNLEdBQUdBLHVCQUFhLENBQUMsTUFBTUMsa0JBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDN0UsSUFBSSxDQUFDQyxtQkFBUyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRTtJQUM1QixZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxNQUFNQyxnQkFBUyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzdELFlBQUEsQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ3JFO1NBQ0o7SUFFRDs7Ozs7OztJQU9HO0lBQ0gsSUFBQSxNQUFNLFVBQVUsQ0FBQyxHQUFXLEVBQUUsT0FBeUIsRUFBQTtJQUNuRCxRQUFBLE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO0lBQ3hCLFFBQUEsTUFBTUMscUJBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQyxRQUFBLElBQUksU0FBUyxLQUFLLEtBQUssRUFBRTtJQUNyQixZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM5QixDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsTUFBTUgsa0JBQVcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUM5RjtTQUNKO0lBRUQ7Ozs7Ozs7SUFPRztRQUNILE1BQU0sS0FBSyxDQUFDLE9BQXlCLEVBQUE7SUFDakMsUUFBQSxPQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztJQUN4QixRQUFBLE1BQU1HLHFCQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO0lBQzFCLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN0QixZQUFBLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNsRTtTQUNKO0lBRUQ7Ozs7Ozs7SUFPRztRQUNILE1BQU0sSUFBSSxDQUFDLE9BQW9CLEVBQUE7SUFDM0IsUUFBQSxNQUFNQSxxQkFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3JDO0lBRUQ7Ozs7Ozs7SUFPRztJQUNILElBQUEsRUFBRSxDQUFDLFFBQWlDLEVBQUE7WUFDaEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDekM7SUFFRDs7Ozs7Ozs7O0lBU0c7SUFDSCxJQUFBLEdBQUcsQ0FBQyxRQUFrQyxFQUFBO1lBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUNuQztJQUNKLENBQUE7SUFFRDtVQUNhLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxZQUFZOzs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL3dlYi1zdG9yYWdlLyJ9