/*!
 * @cdp/web-storage 0.9.20
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViLXN0b3JhZ2UuanMiLCJzb3VyY2VzIjpbIndlYi1zdG9yYWdlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgdHlwZSBLZXlzLFxuICAgIHR5cGUgVHlwZXMsXG4gICAgdHlwZSBLZXlUb1R5cGUsXG4gICAgdmVyaWZ5LFxuICAgIGRlZXBFcXVhbCxcbiAgICBkcm9wVW5kZWZpbmVkLFxufSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgdHlwZSBTdWJzY3JpcHRpb24sIEV2ZW50QnJva2VyIH0gZnJvbSAnQGNkcC9ldmVudHMnO1xuaW1wb3J0IHtcbiAgICB0eXBlIENhbmNlbGFibGUsXG4gICAgY2hlY2tDYW5jZWxlZCBhcyBjYyxcbn0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB0eXBlIHtcbiAgICBTdG9yYWdlRGF0YVR5cGVMaXN0LFxuICAgIFN0b3JhZ2VJbnB1dERhdGFUeXBlTGlzdCxcbiAgICBJU3RvcmFnZU9wdGlvbnMsXG4gICAgSVN0b3JhZ2VEYXRhT3B0aW9ucyxcbiAgICBJU3RvcmFnZURhdGFSZXR1cm5UeXBlLFxuICAgIElTdG9yYWdlRXZlbnRDYWxsYmFjayxcbiAgICBJU3RvcmFnZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXN0b3JhZ2UnO1xuaW1wb3J0IHtcbiAgICB0eXBlIFNlcmlhbGl6YWJsZSxcbiAgICBzZXJpYWxpemUsXG4gICAgZGVzZXJpYWxpemUsXG59IGZyb20gJ0BjZHAvYmluYXJ5JztcblxuLyoqXG4gKiBAZW4gV2ViIHN0b3JhZ2UgZGF0YSB0eXBlIHNldCBpbnRlcmZhY2UuXG4gKiBAamEgV2ViIHN0b3JhZ2Ug44Gr5qC857SN5Y+v6IO944Gq5Z6L44Gu6ZuG5ZCIXG4gKi9cbmV4cG9ydCB0eXBlIFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3QgPSBTdG9yYWdlRGF0YVR5cGVMaXN0ICYgU2VyaWFsaXphYmxlO1xuLyoqIFdlYlN0b3JhZ2UgSS9PIG9wdGlvbnMgKi9cbmV4cG9ydCB0eXBlIFdlYlN0b3JhZ2VPcHRpb25zPEsgZXh0ZW5kcyBLZXlzPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+ID0gS2V5czxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0Pj4gPSBJU3RvcmFnZURhdGFPcHRpb25zPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3QsIEs+O1xuLyoqIFdlYlN0b3JhZ2UgcmV0dXJuIHZhbHVlICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlUmVzdWx0PEsgZXh0ZW5kcyBLZXlzPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+PiA9IEtleVRvVHlwZTxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0LCBLPjtcbi8qKiBXZWJTdG9yYWdlIGRhdGEgdHlwZSAqL1xuZXhwb3J0IHR5cGUgV2ViU3RvcmFnZURhdGFUeXBlcyA9IFR5cGVzPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+O1xuLyoqIE1lbW9yeVN0b3JhZ2UgcmV0dXJuIHR5cGUgKi9cbmV4cG9ydCB0eXBlIFdlYlN0b3JhZ2VSZXR1cm5UeXBlPEQgZXh0ZW5kcyBXZWJTdG9yYWdlRGF0YVR5cGVzPiA9IElTdG9yYWdlRGF0YVJldHVyblR5cGU8U3RvcmFnZURhdGFUeXBlTGlzdCwgRD47XG4vKiogV2ViU3RvcmFnZSBpbnB1dCBkYXRhIHR5cGUgKi9cbmV4cG9ydCB0eXBlIFdlYlN0b3JhZ2VJbnB1dERhdGFUeXBlcyA9IFN0b3JhZ2VJbnB1dERhdGFUeXBlTGlzdDxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0Pjtcbi8qKiBXZWJTdG9yYWdlIGV2ZW50IGNhbGxiYWNrICovXG5leHBvcnQgdHlwZSBXZWJTdG9yYWdlRXZlbnRDYWxsYmFjayA9IElTdG9yYWdlRXZlbnRDYWxsYmFjazxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0PjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuaW50ZXJmYWNlIFdlYlN0b3JhZ2VFdmVudCB7XG4gICAgJ0AnOiBbc3RyaW5nIHwgbnVsbCwgV2ViU3RvcmFnZURhdGFUeXBlcyB8IG51bGwsIFdlYlN0b3JhZ2VEYXRhVHlwZXMgfCBudWxsXTtcbn1cblxuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXy8vXG5cbi8qKlxuICogQGVuIFdlYiBzdG9yYWdlIGNsYXNzLiBUaGlzIGNsYXNzIGltcGxlbWVudHMgYElTdG9yYWdlYCBpbnRlcmZhY2UgYnkgdXNpbmcgYHdpbmRvdy5sb2NhbFN0b3JhZ2VgLlxuICogQGphIOOCpuOCp+ODluOCueODiOODrOODvOOCuOOCr+ODqeOCuS4g5pys44Kv44Op44K544GvIGB3aW5kb3cubG9jYWxTdG9yYWdlYCDjgpLnlKjjgYTjgaYgYElTdG9yYWdlYCDjgpLlrp/oo4VcbiAqL1xuZXhwb3J0IGNsYXNzIFdlYlN0b3JhZ2UgaW1wbGVtZW50cyBJU3RvcmFnZTxXZWJTdG9yYWdlRGF0YVR5cGVMaXN0PiB7XG5cbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfYnJva2VyID0gbmV3IEV2ZW50QnJva2VyPFdlYlN0b3JhZ2VFdmVudD4oKTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSByZWFkb25seSBfc3RvcmFnZTogU3RvcmFnZTtcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3RvcmFnZVxuICAgICAqICAtIGBlbmAgV2ViIHtAbGluayBTdG9yYWdlfSBpbnN0YW5jZVxuICAgICAqICAtIGBqYWAgV2ViIHtAbGluayBTdG9yYWdlfSDjgqTjg7Pjgrnjgr/jg7PjgrlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdG9yYWdlOiBTdG9yYWdlKSB7XG4gICAgICAgIHZlcmlmeSgnaW5zdGFuY2VPZicsIFN0b3JhZ2UsIHN0b3JhZ2UpO1xuICAgICAgICB0aGlzLl9zdG9yYWdlID0gc3RvcmFnZTtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBpbXBsZW1lbnRzOiBJU3RvcmFnZVxuICAgIC8qKlxuICAgICAqIEBlbiB7QGxpbmsgSVN0b3JhZ2V9IGtpbmQgc2lnbmF0dXJlLlxuICAgICAqIEBqYSB7QGxpbmsgSVN0b3JhZ2V9IOOBrueoruWIpeOCkuihqOOBmeitmOWIpeWtkFxuICAgICAqL1xuICAgIGdldCBraW5kKCk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHNpZ25hdHVyZSA9IGxvY2FsU3RvcmFnZSA9PT0gdGhpcy5fc3RvcmFnZSA/ICdsb2NhbC1zdG9yYWdlJyA6ICdzZXNzaW9uLXN0b3JhZ2UnO1xuICAgICAgICByZXR1cm4gYHdlYjoke3NpZ25hdHVyZX1gO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ2l2ZW4ga2V5LCBvciBudWxsIGlmIHRoZSBnaXZlbiBrZXkgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QuXG4gICAgICogQGphIOOCreODvOOBq+WvvuW/nOOBmeOCi+WApOOCkuWPluW+ly4g5a2Y5Zyo44GX44Gq44GE5aC05ZCI44GvIG51bGwg44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogIC0gYGVuYCBhY2Nlc3Mga2V5XG4gICAgICogIC0gYGphYCDjgqLjgq/jgrvjgrnjgq3jg7xcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgSS9PIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIEkvTyDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKiBAcmV0dXJuc1xuICAgICAqICAtIGBlbmAgUmV0dXJucyB0aGUgdmFsdWUgd2hpY2ggY29ycmVzcG9uZHMgdG8gYSBrZXkgd2l0aCB0eXBlIGNoYW5nZSBkZXNpZ25hdGVkIGluIGBkYXRhVHlwZWAuXG4gICAgICogIC0gYGphYCBgZGF0YVR5cGVgIOOBp+aMh+WumuOBleOCjOOBn+Wei+WkieaPm+OCkuihjOOBo+OBpiwg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS6L+U5Y20XG4gICAgICovXG4gICAgZ2V0SXRlbTxEIGV4dGVuZHMgV2ViU3RvcmFnZURhdGFUeXBlcyA9IFdlYlN0b3JhZ2VEYXRhVHlwZXM+KFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgb3B0aW9ucz86IFdlYlN0b3JhZ2VPcHRpb25zPG5ldmVyPlxuICAgICk6IFByb21pc2U8V2ViU3RvcmFnZVJldHVyblR5cGU8RD4+O1xuXG4gICAgLyoqXG4gICAgICogQGVuIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBnaXZlbiBrZXksIG9yIG51bGwgaWYgdGhlIGdpdmVuIGtleSBkb2VzIG5vdCBleGlzdCBpbiB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdC5cbiAgICAgKiBAamEg44Kt44O844Gr5a++5b+c44GZ44KL5YCk44KS5Y+W5b6XLiDlrZjlnKjjgZfjgarjgYTloLTlkIjjga8gbnVsbCDjgpLov5TljbRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBrZXlcbiAgICAgKiAgLSBgZW5gIGFjY2VzcyBrZXlcbiAgICAgKiAgLSBgamFgIOOCouOCr+OCu+OCueOCreODvFxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBJL08gb3B0aW9uc1xuICAgICAqICAtIGBqYWAgSS9PIOOCquODl+OCt+ODp+ODs1xuICAgICAqIEByZXR1cm5zXG4gICAgICogIC0gYGVuYCBSZXR1cm5zIHRoZSB2YWx1ZSB3aGljaCBjb3JyZXNwb25kcyB0byBhIGtleSB3aXRoIHR5cGUgY2hhbmdlIGRlc2lnbmF0ZWQgaW4gYGRhdGFUeXBlYC5cbiAgICAgKiAgLSBgamFgIGBkYXRhVHlwZWAg44Gn5oyH5a6a44GV44KM44Gf5Z6L5aSJ5o+b44KS6KGM44Gj44GmLCDjgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLov5TljbRcbiAgICAgKi9cbiAgICBnZXRJdGVtPEsgZXh0ZW5kcyBLZXlzPFdlYlN0b3JhZ2VEYXRhVHlwZUxpc3Q+PihcbiAgICAgICAga2V5OiBzdHJpbmcsXG4gICAgICAgIG9wdGlvbnM/OiBXZWJTdG9yYWdlT3B0aW9uczxLPlxuICAgICk6IFByb21pc2U8V2ViU3RvcmFnZVJlc3VsdDxLPiB8IG51bGw+O1xuXG4gICAgYXN5bmMgZ2V0SXRlbShrZXk6IHN0cmluZywgb3B0aW9ucz86IFdlYlN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTxXZWJTdG9yYWdlRGF0YVR5cGVzIHwgbnVsbD4ge1xuICAgICAgICByZXR1cm4gZHJvcFVuZGVmaW5lZChhd2FpdCBkZXNlcmlhbGl6ZSh0aGlzLl9zdG9yYWdlW2tleV0sIG9wdGlvbnMhKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGVuIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBwYWlyIGlkZW50aWZpZWQgYnkga2V5IHRvIHZhbHVlLCBjcmVhdGluZyBhIG5ldyBrZXkvdmFsdWUgcGFpciBpZiBub25lIGV4aXN0ZWQgZm9yIGtleSBwcmV2aW91c2x5LlxuICAgICAqIEBqYSDjgq3jg7zjgpLmjIflrprjgZfjgablgKTjgpLoqK3lrpouIOWtmOWcqOOBl+OBquOBhOWgtOWQiOOBr+aWsOimj+OBq+S9nOaIkFxuICAgICAqXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqICAtIGBlbmAgYWNjZXNzIGtleVxuICAgICAqICAtIGBqYWAg44Ki44Kv44K744K544Kt44O8XG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIEkvTyBvcHRpb25zXG4gICAgICogIC0gYGphYCBJL08g44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgYXN5bmMgc2V0SXRlbTxWIGV4dGVuZHMgV2ViU3RvcmFnZUlucHV0RGF0YVR5cGVzPihrZXk6IHN0cmluZywgdmFsdWU6IFYsIG9wdGlvbnM/OiBXZWJTdG9yYWdlT3B0aW9uczxuZXZlcj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGNvbnN0IG5ld1ZhbCA9IGRyb3BVbmRlZmluZWQodmFsdWUsIHRydWUpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYG51bGxgIG9yIGB1bmRlZmluZWRgIOKGkiAnbnVsbCcgb3IgJ3VuZGVmaW5lZCdcbiAgICAgICAgY29uc3Qgb2xkVmFsID0gZHJvcFVuZGVmaW5lZChhd2FpdCBkZXNlcmlhbGl6ZSh0aGlzLl9zdG9yYWdlW2tleV0sIG9wdGlvbnMpKTsgICAvLyBgdW5kZWZpbmVkYCDihpIgYG51bGxgXG4gICAgICAgIGlmICghZGVlcEVxdWFsKG9sZFZhbCwgbmV3VmFsKSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZS5zZXRJdGVtKGtleSwgYXdhaXQgc2VyaWFsaXplKG5ld1ZhbCwgb3B0aW9ucykpO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci50cmlnZ2VyKCdAJywga2V5LCBuZXdWYWwsIG9sZFZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmVtb3ZlcyB0aGUga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIGxpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBvYmplY3QsIGlmIGEga2V5L3ZhbHVlIHBhaXIgd2l0aCB0aGUgZ2l2ZW4ga2V5IGV4aXN0cy5cbiAgICAgKiBAamEg5oyH5a6a44GV44KM44Gf44Kt44O844Gr5a++5b+c44GZ44KL5YCk44GM5a2Y5Zyo44GZ44KM44Gw5YmK6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgc3RvcmFnZSBvcHRpb25zXG4gICAgICogIC0gYGphYCDjgrnjg4jjg6zjg7zjgrjjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBhc3luYyByZW1vdmVJdGVtKGtleTogc3RyaW5nLCBvcHRpb25zPzogSVN0b3JhZ2VPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zID8/IHt9O1xuICAgICAgICBhd2FpdCBjYyhvcHRpb25zLmNhbmNlbCk7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5fc3RvcmFnZVtrZXldO1xuICAgICAgICBpZiAodW5kZWZpbmVkICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG4gICAgICAgICAgICAhb3B0aW9ucy5zaWxlbnQgJiYgdGhpcy5fYnJva2VyLnRyaWdnZXIoJ0AnLCBrZXksIG51bGwsIGF3YWl0IGRlc2VyaWFsaXplKHZhbHVlLCBvcHRpb25zKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gRW1wdGllcyB0aGUgbGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIG9iamVjdCBvZiBhbGwga2V5L3ZhbHVlIHBhaXJzLCBpZiB0aGVyZSBhcmUgYW55LlxuICAgICAqIEBqYSDjgZnjgbnjgabjga7jgq3jg7zjgavlr77lv5zjgZnjgovlgKTjgpLliYrpmaRcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCBzdG9yYWdlIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCueODiOODrOODvOOCuOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGNsZWFyKG9wdGlvbnM/OiBJU3RvcmFnZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgPz8ge307XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnMuY2FuY2VsKTtcbiAgICAgICAgaWYgKDAgPCB0aGlzLl9zdG9yYWdlLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZS5jbGVhcigpO1xuICAgICAgICAgICAgIW9wdGlvbnMuc2lsZW50ICYmIHRoaXMuX2Jyb2tlci50cmlnZ2VyKCdAJywgbnVsbCwgbnVsbCwgbnVsbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gUmV0dXJucyBhbGwgZW50cnkga2V5cy5cbiAgICAgKiBAamEg44GZ44G544Gm44Gu44Kt44O85LiA6Kan44KS6L+U5Y20XG4gICAgICpcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgY2FuY2VsIG9wdGlvbnNcbiAgICAgKiAgLSBgamFgIOOCreODo+ODs+OCu+ODq+OCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGFzeW5jIGtleXMob3B0aW9ucz86IENhbmNlbGFibGUpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgICAgIGF3YWl0IGNjKG9wdGlvbnM/LmNhbmNlbCk7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9zdG9yYWdlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3Vic2NyaXZlIGV2ZW50KHMpLlxuICAgICAqIEBqYSDjgqTjg5njg7Pjg4jos7zoqq3oqK3lrppcbiAgICAgKlxuICAgICAqIEBwYXJhbSBsaXN0ZW5lclxuICAgICAqICAtIGBlbmAgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogIC0gYGphYCDjgZ/jgrPjg7zjg6vjg5Djg4Pjgq/plqLmlbBcbiAgICAgKi9cbiAgICBvbihsaXN0ZW5lcjogV2ViU3RvcmFnZUV2ZW50Q2FsbGJhY2spOiBTdWJzY3JpcHRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnJva2VyLm9uKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBlbiBVbnN1YnNjcmliZSBldmVudChzKS5cbiAgICAgKiBAamEg44Kk44OZ44Oz44OI6LO86Kqt6Kej6ZmkXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGlzdGVuZXJcbiAgICAgKiAgLSBgZW5gIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqICAgICAgICAgV2hlbiBub3Qgc2V0IHRoaXMgcGFyYW1ldGVyLCBsaXN0ZW5lcnMgYXJlIHJlbGVhc2VkLlxuICAgICAqICAtIGBqYWAg44Kz44O844Or44OQ44OD44Kv6Zai5pWwXG4gICAgICogICAgICAgICDmjIflrprjgZfjgarjgYTloLTlkIjjga/jgZnjgbnjgabjgpLop6PpmaRcbiAgICAgKi9cbiAgICBvZmYobGlzdGVuZXI/OiBXZWJTdG9yYWdlRXZlbnRDYWxsYmFjayk6IHZvaWQge1xuICAgICAgICB0aGlzLl9icm9rZXIub2ZmKCdAJywgbGlzdGVuZXIpO1xuICAgIH1cbn1cblxuLy8gZGVmYXVsdCBzdG9yYWdlXG5leHBvcnQgY29uc3Qgd2ViU3RvcmFnZSA9IG5ldyBXZWJTdG9yYWdlKGxvY2FsU3RvcmFnZSk7XG4iXSwibmFtZXMiOlsiRXZlbnRCcm9rZXIiLCJ2ZXJpZnkiLCJkcm9wVW5kZWZpbmVkIiwiZGVzZXJpYWxpemUiLCJkZWVwRXF1YWwiLCJzZXJpYWxpemUiLCJjYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFtREE7SUFFQTs7O0lBR0c7VUFDVSxVQUFVLENBQUE7O0lBR0YsSUFBQSxPQUFPLEdBQUcsSUFBSUEsa0JBQVcsRUFBbUI7O0lBRTVDLElBQUEsUUFBUTtJQUV6Qjs7Ozs7O0lBTUc7SUFDSCxJQUFBLFdBQUEsQ0FBWSxPQUFnQixFQUFBO0lBQ3hCLFFBQUFDLGdCQUFNLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDdEMsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU87Ozs7SUFLM0I7OztJQUdHO0lBQ0gsSUFBQSxJQUFJLElBQUksR0FBQTtJQUNKLFFBQUEsTUFBTSxTQUFTLEdBQUcsWUFBWSxLQUFLLElBQUksQ0FBQyxRQUFRLEdBQUcsZUFBZSxHQUFHLGlCQUFpQjtZQUN0RixPQUFPLENBQUEsSUFBQSxFQUFPLFNBQVMsQ0FBQSxDQUFFOztJQXlDN0IsSUFBQSxNQUFNLE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FB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