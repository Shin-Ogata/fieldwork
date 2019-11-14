/*!
 * @cdp/web-storage 0.9.0
 *   web storage utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/event-publisher'), require('@cdp/promise'), require('@cdp/binary')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/event-publisher', '@cdp/promise', '@cdp/binary'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Utils, global.CDP, global.CDP, global.CDP));
}(this, (function (exports, coreUtils, eventPublisher, promise, binary) { 'use strict';

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/require-await */
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
            this._broker = new eventPublisher.EventBroker();
            coreUtils.verify('instanceOf', Storage, storage);
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
            options = options || {};
            const newVal = coreUtils.dropUndefined(value, true); // `null` or `undefined` → 'null' or 'undefined'
            const oldVal = coreUtils.dropUndefined(await binary.deserialize(this._storage[key], options)); // `undefined` → `null`
            if (!coreUtils.deepEqual(oldVal, newVal)) {
                this._storage.setItem(key, await binary.serialize(newVal, options));
                !options.silent && this._broker.publish('@', key, newVal, oldVal);
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
            const value = this._storage[key];
            if (undefined !== value) {
                this._storage.removeItem(key);
                !options.silent && this._broker.publish('@', key, null, await binary.deserialize(value, options));
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
            if (0 < this._storage.length) {
                this._storage.clear();
                !options.silent && this._broker.publish('@', null, null, null);
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

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXN0b3JhZ2UuanMiLCJzb3VyY2VzIjpbIndlYi1zdG9yYWdlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksIEB0eXBlc2NyaXB0LWVzbGludC9yZXF1aXJlLWF3YWl0ICovXG5cbmltcG9ydCB7XG4gICAgS2V5cyxcbiAgICBUeXBlcyxcbiAgICBLZXlUb1R5cGUsXG4gICAgdmVyaWZ5LFxuICAgIGRlZXBFcXVhbCxcbiAgICBkcm9wVW5kZWZpbmVkLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uLCBFdmVudEJyb2tlciB9IGZyb20gJ0BjZHAvZXZlbnQtcHVibGlzaGVyJztcbmltcG9ydCB7XG4gICAgQ2FuY2VsYWJsZSxcbiAgICBjaGVja0NhbmNlbGVkIGFzIGNjLFxufSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHtcbiAgICBTdG9yYWdlRGF0YVR5cGVMaXN0LFxuICAgIFN0b3JhZ2VJbnB1dERhdGFUeXBlTGlzdCxcbiAgICBJU3RvcmFnZU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VEYXRhT3B0aW9ucyxcbiAgICBJU3RvcmFnZURhdGFSZXR1cm5UeXBlLFxuICAgIElTdG9yYWdlRXZlbnRDYWxsYmFjayxcbiAgICBJU3RvcmFnZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuaW1wb3J0IHtcbiAgICBTZXJpYWxpemFibGUsXG4gICAgc2VyaWFsaXplLFxuICAgIGRlc2VyaWFsaXplLFxufSBmcm9tICdAY2RwL2JpbmFyeSc7XG5cbi8qKlxuICogQGVuIFdlYiBzdG9yYWdlIGRhdGEgdHlwZSBzZXQgaW50ZXJmYWNlLlxuICogQGphIFdlYiBzdG9yYWdlIOOBq+agvOe0jeWPr+iDveOBquWei+OBrumbhuWQiFxuICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlRGF0YVR5cGVMaXN0ID0gU3RvcmFnZURhdGFUeXBlTGlzdCAmIFNlcmlhbGl6YWJsZTtcbi8qKiBXZWJTdG9yYWdlIEkvTyBvcHRpb25zICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlT3B0aW9uczxLIGV4dGVuZHMgS2V5czxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBJU3RvcmFnZURhdGFPcHRpb25zPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3QsIEs+O1xuLyoqIFdlYlN0b3JhZ2UgcmV0dXJuIHZhbHVlICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlUmVzdWx0PEsgZXh0ZW5kcyBLZXlzPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IEtleVRvVHlwZTxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0LCBLPjtcbi8qKiBXZWJTdG9yYWdlIGlucHV0IGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgV2ViU3RvcmFnZUlucHV0RGF0YVR5cGVzID0gU3RvcmFnZUlucHV0RGF0YVR5cGVMaXN0PFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuLyoqIFdlYlN0b3JhZ2UgZXZlbnQgY2FsbGJhY2sgKi9cbmV4cG9ydCB0eXBlIFdlYlN0b3JhZ2VFdmVudENhbGxiYWNrID0gSVN0b3JhZ2VFdmVudENhbGxiYWNrPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuXG4vKiogQGludGVybmFsICovXG5pbnRlcmZhY2UgV2ViU3RvcmFnZUV2ZW50IHtcbiAgICAnQCc6IFtzdHJpbmcgfCBudWxsLCBUeXBlczxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0PiB8IG51bGwsIFR5cGVzPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+IHwgbnVsbF07XG59XG5cbi8vX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18vL1xuXG4vKipcbiAqIEBlbiBXZWIgc3RvcmFnZSBjbGFzcy4gVGhpcyBjbGFzcyBpbXBsZW1lbnRzIGBJU3RvcmFnZWAgaW50ZXJmYWNlIGJ5IHVzaW5nIGB3aW5kb3cubG9jYWxTdG9yYWdlYC5cbiAqIEBqYSDjgqbjgqfjg5bjgrnjg4jjg6zjg7zjgrjjgq/jg6njgrkuIOacrOOCr+ODqeOCueOBryBgd2luZG93LmxvY2FsU3RvcmFnZWAg44KS55So44GE44GmIGBJU3RvcmFnZWAg44KS5a6f6KOFXG4gKi9cbmV4cG9ydCBjbGFzcyBXZWJTdG9yYWdlIGltcGxlbWVudHMgSVN0b3JhZ2U8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4ge1xuXG4gICAgcHJpdmF0ZSByZWFkb25seSBfYnJva2VyID0gbmV3IEV2ZW50QnJva2VyPFdlYlN0b3JhZ2VFdmVudD4oKTtcbiAgICBwcml2YXRlIHJlYWRvbmx5IF9zdG9yYWdlOiBTdG9yYWdlO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzdG9yYWdlXG4gICAgICogIC0gYGVuYCBXZWIgW1tTdG9yYWdlXV0gaW5zdGFuY2VcbiAgICAgKiAgLSBgamFgIFdlYiBbW1N0b3JhZ2VdXSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdG9yYWdlOiBTdG9yYWdlKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIFN0b3JhZ2UsIHN0b3JhZ2UpO1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gc3RvcmFnZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJU3RvcmFnZVxuICAgIC8qKlxuICAgICAqIEBlbiBbW0lTdG9yYWdlXV0ga2luZCBzaWduYXR1cmUuXG4gICAgICogQGphIFtbSVN0b3JhZ2VdXSDjga7nqK7liKXjgpLooajjgZnorZjliKXlrZBcbiAgICAgKi9cbiAgICBnZXQga2luZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBzaWduYXR1cmUgPSBsb2NhbFN0b3JhZ2UgPT09IHRoaXMuX3N0b3JhZ2UgPyAnbG9jYWwtc3RvcmFnZScgOiAnc2Vzc2lvbi1zdG9yYWdlJztcbiAgICAgICAgcmV0dXJuIGB3ZWI6JHtzaWduYXR1cmV9YDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGtleSwgb3IgbnVsbCBpZiB0aGUgZ2l2ZW4ga2V5IGRvZXMgbm90IGV4aXN0IGluIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LlxuICAgICAqIEBqYSDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLlj5blvpcuIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBryBudWxsIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIFJldHVybnMgdGhlIHZhbHVlIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEga2V5IHdpdGggdHlwZSBjaGFuZ2UgZGVzaWduYXRlZCBpbiBgZGF0YVR5cGVgLlxuICAgICAqICAtIGBqYWAgYGRhdGFUeXBlYCDjgafmjIflrprjgZXjgozjgZ/lnovlpInmj5vjgpLooYzjgaPjgaYsIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIGdldEl0ZW08RCBleHRlbmRzIFR5cGVzPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+ID0gVHlwZXM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IFdlYlN0b3JhZ2VPcHRpb25zPG5ldmVyPlxuICAgICk6IFByb21pc2U8SVN0b3JhZ2VEYXRhUmV0dXJuVHlwZTxTdG9yYWdlRGF0YVR5cGVMaXN0LCBEPj47XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggdGhlIGdpdmVuIGtleSwgb3IgbnVsbCBpZiB0aGUgZ2l2ZW4ga2V5IGRvZXMgbm90IGV4aXN0IGluIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LlxuICAgICAqIEBqYSDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLlj5blvpcuIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBryBudWxsIOOCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICogQHJldHVybnNcbiAgICAgKiAgLSBgZW5gIFJldHVybnMgdGhlIHZhbHVlIHdoaWNoIGNvcnJlc3BvbmRzIHRvIGEga2V5IHdpdGggdHlwZSBjaGFuZ2UgZGVzaWduYXRlZCBpbiBgZGF0YVR5cGVgLlxuICAgICAqICAtIGBqYWAgYGRhdGFUeXBlYCDjgafmjIflrprjgZXjgozjgZ/lnovlpInmj5vjgpLooYzjgaPjgaYsIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkui/lOWNtFxuICAgICAqL1xuICAgIGdldEl0ZW08SyBleHRlbmRzIEtleXM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IFdlYlN0b3JhZ2VPcHRpb25zPEs+XG4gICAgKTogUHJvbWlzZTxXZWJTdG9yYWdlUmVzdWx0PEs+IHwgbnVsbD47XG5cbiAgICBhc3luYyBnZXRJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogV2ViU3RvcmFnZU9wdGlvbnM8YW55Pik6IFByb21pc2U8VHlwZXM8V2ViU3RvcmFnZURhdGFUeXBlTGlzdD4gfCBudWxsPiB7XG4gICAgICAgIHJldHVybiBkcm9wVW5kZWZpbmVkKGF3YWl0IGRlc2VyaWFsaXplKHRoaXMuX3N0b3JhZ2Vba2V5XSwgb3B0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgcGFpciBpZGVudGlmaWVkIGJ5IGtleSB0byB2YWx1ZSwgY3JlYXRpbmcgYSBuZXcga2V5L3ZhbHVlIHBhaXIgaWYgbm9uZSBleGlzdGVkIGZvciBrZXkgcHJldmlvdXNseS5cbiAgICAgKiBAamEg44Kt44O844KS5oyH5a6a44GX44Gm5YCk44KS6Kit5a6aLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga/mlrDopo/jgavkvZzmiJBcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIHNldEl0ZW08ViBleHRlbmRzIFdlYlN0b3JhZ2VJbnB1dERhdGFUeXBlcz4oa2V5OiBzdHJpbmcsIHZhbHVlOiBWLCBvcHRpb25zPzogV2ViU3RvcmFnZU9wdGlvbnM8bmV2ZXI+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBjb25zdCBuZXdWYWwgPSBkcm9wVW5kZWZpbmVkKHZhbHVlLCB0cnVlKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBudWxsYCBvciBgdW5kZWZpbmVkYCDihpIgJ251bGwnIG9yICd1bmRlZmluZWQnXG4gICAgICAgIGNvbnN0IG9sZFZhbCA9IGRyb3BVbmRlZmluZWQoYXdhaXQgZGVzZXJpYWxpemUodGhpcy5fc3RvcmFnZVtrZXldLCBvcHRpb25zKSk7ICAgLy8gYHVuZGVmaW5lZGAg4oaSIGBudWxsYFxuICAgICAgICBpZiAoIWRlZXBFcXVhbChvbGRWYWwsIG5ld1ZhbCkpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2Uuc2V0SXRlbShrZXksIGF3YWl0IHNlcmlhbGl6ZShuZXdWYWwsIG9wdGlvbnMpKTtcbiAgICAgICAgICAgICFvcHRpb25zLnNpbGVudCAmJiB0aGlzLl9icm9rZXIucHVibGlzaCgnQCcsIGtleSwgbmV3VmFsLCBvbGRWYWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZXMgdGhlIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBmcm9tIHRoZSBsaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgb2JqZWN0LCBpZiBhIGtleS92YWx1ZSBwYWlyIHdpdGggdGhlIGdpdmVuIGtleSBleGlzdHMuXG4gICAgICogQGphIOaMh+WumuOBleOCjOOBn+OCreODvOOBq+WvvuW/nOOBmeOCi+WApOOBjOWtmOWcqOOBmeOCjOOBsOWJiumZpFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHN0b3JhZ2Ugb3B0aW9uc1xuICAgICAqICAtIGBqYWAg44K544OI44Os44O844K444Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgcmVtb3ZlSXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IElTdG9yYWdlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgYXdhaXQgY2Mob3B0aW9ucy5jYW5jZWwpO1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuX3N0b3JhZ2Vba2V5XTtcbiAgICAgICAgaWYgKHVuZGVmaW5lZCAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci5wdWJsaXNoKCdAJywga2V5LCBudWxsLCBhd2FpdCBkZXNlcmlhbGl6ZSh2YWx1ZSwgb3B0aW9ucykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIEVtcHRpZXMgdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3Qgb2YgYWxsIGtleS92YWx1ZSBwYWlycywgaWYgdGhlcmUgYXJlIGFueS5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBjbGVhcihvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGlmICgwIDwgdGhpcy5fc3RvcmFnZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UuY2xlYXIoKTtcbiAgICAgICAgICAgICFvcHRpb25zLnNpbGVudCAmJiB0aGlzLl9icm9rZXIucHVibGlzaCgnQCcsIG51bGwsIG51bGwsIG51bGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgYWxsIGVudHJ5IGtleXMuXG4gICAgICogQGphIOOBmeOBueOBpuOBruOCreODvOS4gOimp+OCkui/lOWNtFxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIGNhbmNlbCBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgq3jg6Pjg7Pjgrvjg6vjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyBrZXlzKG9wdGlvbnM/OiBDYW5jZWxhYmxlKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zICYmIG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3N0b3JhZ2UpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdWJzY3JpdmUgZXZlbnQocykuXG4gICAgICogQGphIOOCpOODmeODs+ODiOizvOiqreioreWumlxuICAgICAqXG4gICAgICogQHBhcmFtIGxpc3RlbmVyXG4gICAgICogIC0gYGVuYCBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiAgLSBgamFgIOOBn+OCs+ODvOODq+ODkOODg+OCr+mWouaVsFxuICAgICAqL1xuICAgIG9uKGxpc3RlbmVyOiBXZWJTdG9yYWdlRXZlbnRDYWxsYmFjayk6IFN1YnNjcmlwdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLl9icm9rZXIub24oJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFVuc3Vic2NyaWJlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3op6PpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogICAgICAgICBXaGVuIG5vdCBzZXQgdGhpcyBwYXJhbWV0ZXIsIGxpc3RlbmVycyBhcmUgcmVsZWFzZWQuXG4gICAgICogIC0gYGphYCDjgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKiAgICAgICAgIOaMh+WumuOBl+OBquOBhOWgtOWQiOOBr+OBmeOBueOBpuOCkuino+mZpFxuICAgICAqL1xuICAgIG9mZihsaXN0ZW5lcj86IFdlYlN0b3JhZ2VFdmVudENhbGxiYWNrKTogdm9pZCB7XG4gICAgICAgIHRoaXMuX2Jyb2tlci5vZmYoJ0AnLCBsaXN0ZW5lcik7XG4gICAgfVxufVxuXG4vLyBkZWZhdWx0IHN0b3JhZ2VcbmV4cG9ydCBjb25zdCB3ZWJTdG9yYWdlID0gbmV3IFdlYlN0b3JhZ2UobG9jYWxTdG9yYWdlKTtcbiJdLCJuYW1lcyI6WyJFdmVudEJyb2tlciIsInZlcmlmeSIsImRyb3BVbmRlZmluZWQiLCJkZXNlcmlhbGl6ZSIsImRlZXBFcXVhbCIsInNlcmlhbGl6ZSIsImNjIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBO0FBRUEsSUErQ0E7SUFFQTs7OztBQUlBLFVBQWEsVUFBVTs7Ozs7Ozs7UUFZbkIsWUFBWSxPQUFnQjtZQVZYLFlBQU8sR0FBRyxJQUFJQSwwQkFBVyxFQUFtQixDQUFDO1lBVzFEQyxnQkFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7U0FDM0I7Ozs7Ozs7UUFRRCxJQUFJLElBQUk7WUFDSixNQUFNLFNBQVMsR0FBRyxZQUFZLEtBQUssSUFBSSxDQUFDLFFBQVEsR0FBRyxlQUFlLEdBQUcsaUJBQWlCLENBQUM7WUFDdkYsT0FBTyxPQUFPLFNBQVMsRUFBRSxDQUFDO1NBQzdCO1FBd0NELE1BQU0sT0FBTyxDQUFDLEdBQVcsRUFBRSxPQUFnQztZQUN2RCxPQUFPQyx1QkFBYSxDQUFDLE1BQU1DLGtCQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ3hFOzs7Ozs7Ozs7Ozs7UUFhRCxNQUFNLE9BQU8sQ0FBcUMsR0FBVyxFQUFFLEtBQVEsRUFBRSxPQUFrQztZQUN2RyxPQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztZQUN4QixNQUFNLE1BQU0sR0FBR0QsdUJBQWEsQ0FBQyxLQUFLLEVBQUUs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
