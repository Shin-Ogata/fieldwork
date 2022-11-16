/*!
 * @cdp/inline-worker 0.9.15
 *   inline web worker utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils'), require('@cdp/promise')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils', '@cdp/promise'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CDP = global.CDP || {}, global.CDP, global.CDP));
})(this, (function (exports, coreUtils, promise) { 'use strict';

    /** @internal */ const URL = coreUtils.safe(globalThis.URL);
    /** @internal */ const Worker = coreUtils.safe(globalThis.Worker);
    /** @internal */ const Blob = coreUtils.safe(globalThis.Blob);
    /** @internal */
    function createWorkerContext(src) {
        if (!(coreUtils.isFunction(src) || coreUtils.isString(src))) {
            throw new TypeError(`${coreUtils.className(src)} is not a function or string.`);
        }
        return URL.createObjectURL(new Blob([coreUtils.isFunction(src) ? `(${src.toString()})(self);` : src], { type: 'application/javascript' }));
    }
    /**
     * @en Specified `Worker` class which doesn't require a script file.
     * @ja スクリプトファイルを必要としない `Worker` クラス
     */
    class InlineWorker extends Worker {
        /** @internal */
        _context;
        /**
         * constructor
         *
         * @param src
         *  - `en` source function or script body.
         *  - `ja` 実行関数またはスクリプト実体
         * @param options
         *  - `en` worker options.
         *  - `ja` Worker オプション
         */
        constructor(src, options) {
            const context = createWorkerContext(src);
            super(context, options);
            this._context = context;
        }
        ///////////////////////////////////////////////////////////////////////
        // override: Worker
        /**
         * @en For BLOB release. When calling `close ()` in the Worker, call this method as well.
         * @ja BLOB 解放用. Worker 内で `close()` を呼ぶ場合, 本メソッドもコールすること.
         */
        terminate() {
            super.terminate();
            URL.revokeObjectURL(this._context);
        }
    }

    /**
     * @en Ensure execution in worker thread.
     * @ja ワーカースレッド内で実行を保証
     *
     * @example <br>
     *
     * ```ts
     * const exec = (arg1: number, arg2: string) => {
     *    // this scope is worker scope. you cannot use closure access.
     *    const param = {...};
     *    const method = (p) => {...};
     *    // you can access arguments from options.
     *    console.log(arg1); // '1'
     *    console.log(arg2); // 'test'
     *    :
     *    return method(param);
     * };
     *
     * const arg1 = 1;
     * const arg2 = 'test';
     * const result = await thread(exec, { args: [arg1, arg2] });
     * ```
     *
     * @param executor
     *  - `en` implement as function scope.
     *  - `ja` 関数スコープとして実装
     * @param options
     *  - `en` thread options
     *  - `ja` スレッドオプション
     */
    function thread(executor, options) {
        const { cancel: originalToken, args } = Object.assign({ args: [] }, options);
        // already cancel
        if (originalToken?.requested) {
            throw originalToken.reason;
        }
        const exec = `(self => {
        self.addEventListener('message', async ({ data }) => {
            try {
                const result = await (${executor.toString()})(...data);
                self.postMessage(result);
            } catch (e) {
                setTimeout(function() { throw e; });
            }
        });
    })(self);`;
        const worker = new InlineWorker(exec, options);
        const abort = () => worker.terminate();
        originalToken?.register(abort);
        const { token } = promise.CancelToken.source(originalToken);
        const promise$1 = new Promise((resolve, reject) => {
            worker.onerror = ev => {
                ev.preventDefault();
                reject(ev);
                worker.terminate();
            };
            worker.onmessage = ev => {
                resolve(ev.data);
                worker.terminate();
            };
        }, token);
        worker.postMessage(args);
        return promise$1;
    }

    exports.InlineWorker = InlineWorker;
    exports.thread = thread;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lLXdvcmtlci5qcyIsInNvdXJjZXMiOlsiaW5pbmUtd29ya2VyLnRzIiwidGhyZWFkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBjbGFzc05hbWUsXG4gICAgc2FmZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqXG4gKiBAZW4gW1tJbmxpbmVXb3JrZXJdXSBzb3VyY2UgdHlwZSBkZWZpbml0aW9uLlxuICogQGphIFtbSW5saW5lV29ya2VyXV0g44Gr5oyH5a6a5Y+v6IO944Gq44K944O844K55Z6L5a6a576pXG4gKi9cbmV4cG9ydCB0eXBlIElubGllbldvcmtlclNvdXJjZSA9ICgoc2VsZjogV29ya2VyKSA9PiB1bmtub3duKSB8IHN0cmluZztcblxuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBVUkwgICAgPSBzYWZlKGdsb2JhbFRoaXMuVVJMKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgV29ya2VyID0gc2FmZShnbG9iYWxUaGlzLldvcmtlcik7XG4vKiogQGludGVybmFsICovIGNvbnN0IEJsb2IgICA9IHNhZmUoZ2xvYmFsVGhpcy5CbG9iKTtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZnVuY3Rpb24gY3JlYXRlV29ya2VyQ29udGV4dChzcmM6IElubGllbldvcmtlclNvdXJjZSk6IHN0cmluZyB7XG4gICAgaWYgKCEoaXNGdW5jdGlvbihzcmMpIHx8IGlzU3RyaW5nKHNyYykpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYCR7Y2xhc3NOYW1lKHNyYyl9IGlzIG5vdCBhIGZ1bmN0aW9uIG9yIHN0cmluZy5gKTtcbiAgICB9XG4gICAgcmV0dXJuIFVSTC5jcmVhdGVPYmplY3RVUkwobmV3IEJsb2IoW2lzRnVuY3Rpb24oc3JjKSA/IGAoJHtzcmMudG9TdHJpbmcoKX0pKHNlbGYpO2AgOiBzcmNdLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JyB9KSk7XG59XG5cbi8qKlxuICogQGVuIFNwZWNpZmllZCBgV29ya2VyYCBjbGFzcyB3aGljaCBkb2Vzbid0IHJlcXVpcmUgYSBzY3JpcHQgZmlsZS5cbiAqIEBqYSDjgrnjgq/jg6rjg5fjg4jjg5XjgqHjgqTjg6vjgpLlv4XopoHjgajjgZfjgarjgYQgYFdvcmtlcmAg44Kv44Op44K5XG4gKi9cbmV4cG9ydCBjbGFzcyBJbmxpbmVXb3JrZXIgZXh0ZW5kcyBXb3JrZXIge1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBwcml2YXRlIF9jb250ZXh0OiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBjb25zdHJ1Y3RvclxuICAgICAqXG4gICAgICogQHBhcmFtIHNyY1xuICAgICAqICAtIGBlbmAgc291cmNlIGZ1bmN0aW9uIG9yIHNjcmlwdCBib2R5LlxuICAgICAqICAtIGBqYWAg5a6f6KGM6Zai5pWw44G+44Gf44Gv44K544Kv44Oq44OX44OI5a6f5L2TXG4gICAgICogQHBhcmFtIG9wdGlvbnNcbiAgICAgKiAgLSBgZW5gIHdvcmtlciBvcHRpb25zLlxuICAgICAqICAtIGBqYWAgV29ya2VyIOOCquODl+OCt+ODp+ODs1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNyYzogSW5saWVuV29ya2VyU291cmNlLCBvcHRpb25zPzogV29ya2VyT3B0aW9ucykge1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gY3JlYXRlV29ya2VyQ29udGV4dChzcmMpO1xuICAgICAgICBzdXBlcihjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgfVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gb3ZlcnJpZGU6IFdvcmtlclxuXG4gICAgLyoqXG4gICAgICogQGVuIEZvciBCTE9CIHJlbGVhc2UuIFdoZW4gY2FsbGluZyBgY2xvc2UgKClgIGluIHRoZSBXb3JrZXIsIGNhbGwgdGhpcyBtZXRob2QgYXMgd2VsbC5cbiAgICAgKiBAamEgQkxPQiDop6PmlL7nlKguIFdvcmtlciDlhoXjgacgYGNsb3NlKClgIOOCkuWRvOOBtuWgtOWQiCwg5pys44Oh44K944OD44OJ44KC44Kz44O844Or44GZ44KL44GT44GoLlxuICAgICAqL1xuICAgIHRlcm1pbmF0ZSgpOiB2b2lkIHtcbiAgICAgICAgc3VwZXIudGVybWluYXRlKCk7XG4gICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodGhpcy5fY29udGV4dCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVW5rbm93bkZ1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IENhbmNlbGFibGUsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IElubGluZVdvcmtlciB9IGZyb20gJy4vaW5pbmUtd29ya2VyJztcblxuLyoqXG4gKiBAZW4gVGhyZWFkIG9wdGlvbnNcbiAqIEBlbiDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUaHJlYWRPcHRpb25zPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+IGV4dGVuZHMgQ2FuY2VsYWJsZSwgV29ya2VyT3B0aW9ucyB7XG4gICAgYXJncz86IFBhcmFtZXRlcnM8VD47XG59XG5cbi8qKlxuICogQGVuIEVuc3VyZSBleGVjdXRpb24gaW4gd29ya2VyIHRocmVhZC5cbiAqIEBqYSDjg6/jg7zjgqvjg7zjgrnjg6zjg4Pjg4nlhoXjgaflrp/ooYzjgpLkv53oqLxcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGV4ZWMgPSAoYXJnMTogbnVtYmVyLCBhcmcyOiBzdHJpbmcpID0+IHtcbiAqICAgIC8vIHRoaXMgc2NvcGUgaXMgd29ya2VyIHNjb3BlLiB5b3UgY2Fubm90IHVzZSBjbG9zdXJlIGFjY2Vzcy5cbiAqICAgIGNvbnN0IHBhcmFtID0gey4uLn07XG4gKiAgICBjb25zdCBtZXRob2QgPSAocCkgPT4gey4uLn07XG4gKiAgICAvLyB5b3UgY2FuIGFjY2VzcyBhcmd1bWVudHMgZnJvbSBvcHRpb25zLlxuICogICAgY29uc29sZS5sb2coYXJnMSk7IC8vICcxJ1xuICogICAgY29uc29sZS5sb2coYXJnMik7IC8vICd0ZXN0J1xuICogICAgOlxuICogICAgcmV0dXJuIG1ldGhvZChwYXJhbSk7XG4gKiB9O1xuICpcbiAqIGNvbnN0IGFyZzEgPSAxO1xuICogY29uc3QgYXJnMiA9ICd0ZXN0JztcbiAqIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRocmVhZChleGVjLCB7IGFyZ3M6IFthcmcxLCBhcmcyXSB9KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBpbXBsZW1lbnQgYXMgZnVuY3Rpb24gc2NvcGUuXG4gKiAgLSBgamFgIOmWouaVsOOCueOCs+ODvOODl+OBqOOBl+OBpuWun+ijhVxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdGhyZWFkIG9wdGlvbnNcbiAqICAtIGBqYWAg44K544Os44OD44OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aHJlYWQ8VCwgVT4oZXhlY3V0b3I6ICguLi5hcmdzOiBVW10pID0+IFQgfCBQcm9taXNlPFQ+LCBvcHRpb25zPzogVGhyZWFkT3B0aW9uczx0eXBlb2YgZXhlY3V0b3I+KTogUHJvbWlzZTxUPiB7XG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIGFyZ3MgfSA9IE9iamVjdC5hc3NpZ24oeyBhcmdzOiBbXSB9LCBvcHRpb25zKTtcblxuICAgIC8vIGFscmVhZHkgY2FuY2VsXG4gICAgaWYgKG9yaWdpbmFsVG9rZW4/LnJlcXVlc3RlZCkge1xuICAgICAgICB0aHJvdyBvcmlnaW5hbFRva2VuLnJlYXNvbjtcbiAgICB9XG5cbiAgICBjb25zdCBleGVjID0gYChzZWxmID0+IHtcbiAgICAgICAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgYXN5bmMgKHsgZGF0YSB9KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICgke2V4ZWN1dG9yLnRvU3RyaW5nKCl9KSguLi5kYXRhKTtcbiAgICAgICAgICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKHJlc3VsdCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZTsgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pKHNlbGYpO2A7XG5cbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgSW5saW5lV29ya2VyKGV4ZWMsIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgYWJvcnQgPSAoKTogdm9pZCA9PiB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgb3JpZ2luYWxUb2tlbj8ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIGNvbnN0IHsgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuIGFzIENhbmNlbFRva2VuKTtcblxuICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHdvcmtlci5vbmVycm9yID0gZXYgPT4ge1xuICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHJlamVjdChldik7XG4gICAgICAgICAgICB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgICAgIH07XG4gICAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBldiA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKGV2LmRhdGEpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgIH0sIHRva2VuKTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZShhcmdzKTtcblxuICAgIHJldHVybiBwcm9taXNlIGFzIFByb21pc2U8VD47XG59XG4iXSwibmFtZXMiOlsic2FmZSIsImlzRnVuY3Rpb24iLCJpc1N0cmluZyIsImNsYXNzTmFtZSIsIkNhbmNlbFRva2VuIiwicHJvbWlzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFhQSxpQkFBaUIsTUFBTSxHQUFHLEdBQU1BLGNBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckQsaUJBQWlCLE1BQU0sTUFBTSxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hELGlCQUFpQixNQUFNLElBQUksR0FBS0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV0RDtJQUNBLFNBQVMsbUJBQW1CLENBQUMsR0FBdUIsRUFBQTtJQUNoRCxJQUFBLElBQUksRUFBRUMsb0JBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSUMsa0JBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBRyxFQUFBQyxtQkFBUyxDQUFDLEdBQUcsQ0FBQyxDQUErQiw2QkFBQSxDQUFBLENBQUMsQ0FBQztJQUN6RSxLQUFBO0lBQ0QsSUFBQSxPQUFPLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQ0Ysb0JBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFJLENBQUEsRUFBQSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUEsUUFBQSxDQUFVLEdBQUcsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckksQ0FBQztJQUVEOzs7SUFHRztJQUNHLE1BQU8sWUFBYSxTQUFRLE1BQU0sQ0FBQTs7SUFFNUIsSUFBQSxRQUFRLENBQVM7SUFFekI7Ozs7Ozs7OztJQVNHO1FBQ0gsV0FBWSxDQUFBLEdBQXVCLEVBQUUsT0FBdUIsRUFBQTtJQUN4RCxRQUFBLE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pDLFFBQUEsS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN4QixRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1NBQzNCOzs7SUFLRDs7O0lBR0c7UUFDSCxTQUFTLEdBQUE7WUFDTCxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbEIsUUFBQSxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUN0QztJQUNKOztJQ2hERDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUE2Qkc7SUFDYSxTQUFBLE1BQU0sQ0FBTyxRQUEwQyxFQUFFLE9BQXdDLEVBQUE7UUFDN0csTUFBTSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQzs7UUFHN0UsSUFBSSxhQUFhLEVBQUUsU0FBUyxFQUFFO1lBQzFCLE1BQU0sYUFBYSxDQUFDLE1BQU0sQ0FBQztJQUM5QixLQUFBO0lBRUQsSUFBQSxNQUFNLElBQUksR0FBRyxDQUFBOzs7d0NBR3VCLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTs7Ozs7O2NBTTdDLENBQUM7UUFFWCxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFL0MsTUFBTSxLQUFLLEdBQUcsTUFBWSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDN0MsSUFBQSxhQUFhLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9CLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBR0csbUJBQVcsQ0FBQyxNQUFNLENBQUMsYUFBNEIsQ0FBQyxDQUFDO1FBRW5FLE1BQU1DLFNBQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUk7SUFDNUMsUUFBQSxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsSUFBRztnQkFDbEIsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ1gsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3ZCLFNBQUMsQ0FBQztJQUNGLFFBQUEsTUFBTSxDQUFDLFNBQVMsR0FBRyxFQUFFLElBQUc7SUFDcEIsWUFBQSxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNqQixNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDdkIsU0FBQyxDQUFDO1NBQ0wsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUVWLElBQUEsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV6QixJQUFBLE9BQU9BLFNBQXFCLENBQUM7SUFDakM7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9pbmxpbmUtd29ya2VyLyJ9