/*!
 * @cdp/inline-worker 0.9.20
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lLXdvcmtlci5qcyIsInNvdXJjZXMiOlsiaW5pbmUtd29ya2VyLnRzIiwidGhyZWFkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBjbGFzc05hbWUsXG4gICAgc2FmZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqXG4gKiBAZW4ge0BsaW5rIElubGluZVdvcmtlcn0gc291cmNlIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgSW5saW5lV29ya2VyfSDjgavmjIflrprlj6/og73jgarjgr3jg7zjgrnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgSW5saWVuV29ya2VyU291cmNlID0gKChzZWxmOiBXb3JrZXIpID0+IHVua25vd24pIHwgc3RyaW5nO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IFVSTCAgICA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBXb3JrZXIgPSBzYWZlKGdsb2JhbFRoaXMuV29ya2VyKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgQmxvYiAgID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYzogSW5saWVuV29ya2VyU291cmNlKTogc3RyaW5nIHtcbiAgICBpZiAoIShpc0Z1bmN0aW9uKHNyYykgfHwgaXNTdHJpbmcoc3JjKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoc3JjKX0gaXMgbm90IGEgZnVuY3Rpb24gb3Igc3RyaW5nLmApO1xuICAgIH1cbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbaXNGdW5jdGlvbihzcmMpID8gYCgke3NyYy50b1N0cmluZygpfSkoc2VsZik7YCA6IHNyY10sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnIH0pKTtcbn1cblxuLyoqXG4gKiBAZW4gU3BlY2lmaWVkIGBXb3JrZXJgIGNsYXNzIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBhIHNjcmlwdCBmaWxlLlxuICogQGphIOOCueOCr+ODquODl+ODiOODleOCoeOCpOODq+OCkuW/heimgeOBqOOBl+OBquOBhCBgV29ya2VyYCDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIElubGluZVdvcmtlciBleHRlbmRzIFdvcmtlciB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX2NvbnRleHQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjXG4gICAgICogIC0gYGVuYCBzb3VyY2UgZnVuY3Rpb24gb3Igc2NyaXB0IGJvZHkuXG4gICAgICogIC0gYGphYCDlrp/ooYzplqLmlbDjgb7jgZ/jga/jgrnjgq/jg6rjg5fjg4jlrp/kvZNcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgd29ya2VyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBXb3JrZXIg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBJbmxpZW5Xb3JrZXJTb3VyY2UsIG9wdGlvbnM/OiBXb3JrZXJPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYyk7XG4gICAgICAgIHN1cGVyKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogV29ya2VyXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIEJMT0IgcmVsZWFzZS4gV2hlbiBjYWxsaW5nIGBjbG9zZSAoKWAgaW4gdGhlIFdvcmtlciwgY2FsbCB0aGlzIG1ldGhvZCBhcyB3ZWxsLlxuICAgICAqIEBqYSBCTE9CIOino+aUvueUqC4gV29ya2VyIOWGheOBpyBgY2xvc2UoKWAg44KS5ZG844G25aC05ZCILCDmnKzjg6Hjgr3jg4Pjg4njgoLjgrPjg7zjg6vjgZnjgovjgZPjgaguXG4gICAgICovXG4gICAgdGVybWluYXRlKCk6IHZvaWQge1xuICAgICAgICBzdXBlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLl9jb250ZXh0KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyB0eXBlIENhbmNlbGFibGUsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IElubGluZVdvcmtlciB9IGZyb20gJy4vaW5pbmUtd29ya2VyJztcblxuLyoqXG4gKiBAZW4gVGhyZWFkIG9wdGlvbnNcbiAqIEBlbiDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUaHJlYWRPcHRpb25zPFQgZXh0ZW5kcyBVbmtub3duRnVuY3Rpb24+IGV4dGVuZHMgQ2FuY2VsYWJsZSwgV29ya2VyT3B0aW9ucyB7XG4gICAgYXJncz86IFBhcmFtZXRlcnM8VD47XG59XG5cbi8qKlxuICogQGVuIEVuc3VyZSBleGVjdXRpb24gaW4gd29ya2VyIHRocmVhZC5cbiAqIEBqYSDjg6/jg7zjgqvjg7zjgrnjg6zjg4Pjg4nlhoXjgaflrp/ooYzjgpLkv53oqLxcbiAqXG4gKiBAZXhhbXBsZSA8YnI+XG4gKlxuICogYGBgdHNcbiAqIGNvbnN0IGV4ZWMgPSAoYXJnMTogbnVtYmVyLCBhcmcyOiBzdHJpbmcpID0+IHtcbiAqICAgIC8vIHRoaXMgc2NvcGUgaXMgd29ya2VyIHNjb3BlLiB5b3UgY2Fubm90IHVzZSBjbG9zdXJlIGFjY2Vzcy5cbiAqICAgIGNvbnN0IHBhcmFtID0gey4uLn07XG4gKiAgICBjb25zdCBtZXRob2QgPSAocCkgPT4gey4uLn07XG4gKiAgICAvLyB5b3UgY2FuIGFjY2VzcyBhcmd1bWVudHMgZnJvbSBvcHRpb25zLlxuICogICAgY29uc29sZS5sb2coYXJnMSk7IC8vICcxJ1xuICogICAgY29uc29sZS5sb2coYXJnMik7IC8vICd0ZXN0J1xuICogICAgOlxuICogICAgcmV0dXJuIG1ldGhvZChwYXJhbSk7XG4gKiB9O1xuICpcbiAqIGNvbnN0IGFyZzEgPSAxO1xuICogY29uc3QgYXJnMiA9ICd0ZXN0JztcbiAqIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRocmVhZChleGVjLCB7IGFyZ3M6IFthcmcxLCBhcmcyXSB9KTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBpbXBsZW1lbnQgYXMgZnVuY3Rpb24gc2NvcGUuXG4gKiAgLSBgamFgIOmWouaVsOOCueOCs+ODvOODl+OBqOOBl+OBpuWun+ijhVxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdGhyZWFkIG9wdGlvbnNcbiAqICAtIGBqYWAg44K544Os44OD44OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aHJlYWQ8VCwgVT4oZXhlY3V0b3I6ICguLi5hcmdzOiBVW10pID0+IFQgfCBQcm9taXNlPFQ+LCBvcHRpb25zPzogVGhyZWFkT3B0aW9uczx0eXBlb2YgZXhlY3V0b3I+KTogUHJvbWlzZTxUPiB7XG4gICAgY29uc3QgeyBjYW5jZWw6IG9yaWdpbmFsVG9rZW4sIGFyZ3MgfSA9IE9iamVjdC5hc3NpZ24oeyBhcmdzOiBbXSB9LCBvcHRpb25zKTtcblxuICAgIC8vIGFscmVhZHkgY2FuY2VsXG4gICAgaWYgKG9yaWdpbmFsVG9rZW4/LnJlcXVlc3RlZCkge1xuICAgICAgICB0aHJvdyBvcmlnaW5hbFRva2VuLnJlYXNvbjtcbiAgICB9XG5cbiAgICBjb25zdCBleGVjID0gYChzZWxmID0+IHtcbiAgICAgICAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgYXN5bmMgKHsgZGF0YSB9KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0ICgke2V4ZWN1dG9yLnRvU3RyaW5nKCl9KSguLi5kYXRhKTtcbiAgICAgICAgICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKHJlc3VsdCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZTsgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pKHNlbGYpO2A7XG5cbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgSW5saW5lV29ya2VyKGV4ZWMsIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgYWJvcnQgPSAoKTogdm9pZCA9PiB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgb3JpZ2luYWxUb2tlbj8ucmVnaXN0ZXIoYWJvcnQpO1xuICAgIGNvbnN0IHsgdG9rZW4gfSA9IENhbmNlbFRva2VuLnNvdXJjZShvcmlnaW5hbFRva2VuISk7XG5cbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB3b3JrZXIub25lcnJvciA9IGV2ID0+IHtcbiAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZWplY3QoZXYpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgICAgICB3b3JrZXIub25tZXNzYWdlID0gZXYgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShldi5kYXRhKTtcbiAgICAgICAgICAgIHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgfTtcbiAgICB9LCB0b2tlbik7XG5cbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoYXJncyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZSBhcyBQcm9taXNlPFQ+O1xufVxuIl0sIm5hbWVzIjpbInNhZmUiLCJpc0Z1bmN0aW9uIiwiaXNTdHJpbmciLCJjbGFzc05hbWUiLCJDYW5jZWxUb2tlbiIsInByb21pc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBYUEsaUJBQWlCLE1BQU0sR0FBRyxHQUFNQSxjQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztJQUNwRCxpQkFBaUIsTUFBTSxNQUFNLEdBQUdBLGNBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO0lBQ3ZELGlCQUFpQixNQUFNLElBQUksR0FBS0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFFckQ7SUFDQSxTQUFTLG1CQUFtQixDQUFDLEdBQXVCLEVBQUE7SUFDaEQsSUFBQSxJQUFJLEVBQUVDLG9CQUFVLENBQUMsR0FBRyxDQUFDLElBQUlDLGtCQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtZQUNyQyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsRUFBR0MsbUJBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQSw2QkFBQSxDQUErQixDQUFDO1FBQ3pFO0lBQ0EsSUFBQSxPQUFPLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQ0Ysb0JBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFBLENBQUEsRUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUEsUUFBQSxDQUFVLEdBQUcsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO0lBQ3BJO0lBRUE7OztJQUdHO0lBQ0csTUFBTyxZQUFhLFNBQVEsTUFBTSxDQUFBOztJQUU1QixJQUFBLFFBQVE7SUFFaEI7Ozs7Ozs7OztJQVNHO1FBQ0gsV0FBQSxDQUFZLEdBQXVCLEVBQUUsT0FBdUIsRUFBQTtJQUN4RCxRQUFBLE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQztJQUN4QyxRQUFBLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO0lBQ3ZCLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPO1FBQzNCOzs7SUFLQTs7O0lBR0c7UUFDSCxTQUFTLEdBQUE7WUFDTCxLQUFLLENBQUMsU0FBUyxFQUFFO0lBQ2pCLFFBQUEsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ3RDO0lBQ0g7O0lDaEREOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQTZCRztJQUNHLFNBQVUsTUFBTSxDQUFPLFFBQTBDLEVBQUUsT0FBd0MsRUFBQTtRQUM3RyxNQUFNLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQzs7SUFHNUUsSUFBQSxJQUFJLGFBQWEsRUFBRSxTQUFTLEVBQUU7WUFDMUIsTUFBTSxhQUFhLENBQUMsTUFBTTtRQUM5QjtJQUVBLElBQUEsTUFBTSxJQUFJLEdBQUcsQ0FBQTs7O3dDQUd1QixRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7Ozs7OztjQU03QztRQUVWLE1BQU0sTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUM7UUFFOUMsTUFBTSxLQUFLLEdBQUcsTUFBWSxNQUFNLENBQUMsU0FBUyxFQUFFO0lBQzVDLElBQUEsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUM7UUFDOUIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHRyxtQkFBVyxDQUFDLE1BQU0sQ0FBQyxhQUFjLENBQUM7UUFFcEQsTUFBTUMsU0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sS0FBSTtJQUM1QyxRQUFBLE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxJQUFHO2dCQUNsQixFQUFFLENBQUMsY0FBYyxFQUFFO2dCQUNuQixNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNWLE1BQU0sQ0FBQyxTQUFTLEVBQUU7SUFDdEIsUUFBQSxDQUFDO0lBQ0QsUUFBQSxNQUFNLENBQUMsU0FBUyxHQUFHLEVBQUUsSUFBRztJQUNwQixZQUFBLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUNoQixNQUFNLENBQUMsU0FBUyxFQUFFO0lBQ3RCLFFBQUEsQ0FBQztRQUNMLENBQUMsRUFBRSxLQUFLLENBQUM7SUFFVCxJQUFBLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO0lBRXhCLElBQUEsT0FBT0EsU0FBcUI7SUFDaEM7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9pbmxpbmUtd29ya2VyLyJ9