/*!
 * @cdp/inline-worker 0.9.17
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lLXdvcmtlci5qcyIsInNvdXJjZXMiOlsiaW5pbmUtd29ya2VyLnRzIiwidGhyZWFkLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgaXNGdW5jdGlvbixcbiAgICBpc1N0cmluZyxcbiAgICBjbGFzc05hbWUsXG4gICAgc2FmZSxcbn0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxuLyoqXG4gKiBAZW4ge0BsaW5rIElubGluZVdvcmtlcn0gc291cmNlIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSB7QGxpbmsgSW5saW5lV29ya2VyfSDjgavmjIflrprlj6/og73jgarjgr3jg7zjgrnlnovlrprnvqlcbiAqL1xuZXhwb3J0IHR5cGUgSW5saWVuV29ya2VyU291cmNlID0gKChzZWxmOiBXb3JrZXIpID0+IHVua25vd24pIHwgc3RyaW5nO1xuXG4vKiogQGludGVybmFsICovIGNvbnN0IFVSTCAgICA9IHNhZmUoZ2xvYmFsVGhpcy5VUkwpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBXb3JrZXIgPSBzYWZlKGdsb2JhbFRoaXMuV29ya2VyKTtcbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgQmxvYiAgID0gc2FmZShnbG9iYWxUaGlzLkJsb2IpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYzogSW5saWVuV29ya2VyU291cmNlKTogc3RyaW5nIHtcbiAgICBpZiAoIShpc0Z1bmN0aW9uKHNyYykgfHwgaXNTdHJpbmcoc3JjKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoc3JjKX0gaXMgbm90IGEgZnVuY3Rpb24gb3Igc3RyaW5nLmApO1xuICAgIH1cbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbaXNGdW5jdGlvbihzcmMpID8gYCgke3NyYy50b1N0cmluZygpfSkoc2VsZik7YCA6IHNyY10sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnIH0pKTtcbn1cblxuLyoqXG4gKiBAZW4gU3BlY2lmaWVkIGBXb3JrZXJgIGNsYXNzIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBhIHNjcmlwdCBmaWxlLlxuICogQGphIOOCueOCr+ODquODl+ODiOODleOCoeOCpOODq+OCkuW/heimgeOBqOOBl+OBquOBhCBgV29ya2VyYCDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIElubGluZVdvcmtlciBleHRlbmRzIFdvcmtlciB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX2NvbnRleHQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjXG4gICAgICogIC0gYGVuYCBzb3VyY2UgZnVuY3Rpb24gb3Igc2NyaXB0IGJvZHkuXG4gICAgICogIC0gYGphYCDlrp/ooYzplqLmlbDjgb7jgZ/jga/jgrnjgq/jg6rjg5fjg4jlrp/kvZNcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgd29ya2VyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBXb3JrZXIg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBJbmxpZW5Xb3JrZXJTb3VyY2UsIG9wdGlvbnM/OiBXb3JrZXJPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYyk7XG4gICAgICAgIHN1cGVyKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogV29ya2VyXG5cbiAgICAvKipcbiAgICAgKiBAZW4gRm9yIEJMT0IgcmVsZWFzZS4gV2hlbiBjYWxsaW5nIGBjbG9zZSAoKWAgaW4gdGhlIFdvcmtlciwgY2FsbCB0aGlzIG1ldGhvZCBhcyB3ZWxsLlxuICAgICAqIEBqYSBCTE9CIOino+aUvueUqC4gV29ya2VyIOWGheOBpyBgY2xvc2UoKWAg44KS5ZG844G25aC05ZCILCDmnKzjg6Hjgr3jg4Pjg4njgoLjgrPjg7zjg6vjgZnjgovjgZPjgaguXG4gICAgICovXG4gICAgdGVybWluYXRlKCk6IHZvaWQge1xuICAgICAgICBzdXBlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh0aGlzLl9jb250ZXh0KTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBVbmtub3duRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgQ2FuY2VsYWJsZSwgQ2FuY2VsVG9rZW4gfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgSW5saW5lV29ya2VyIH0gZnJvbSAnLi9pbmluZS13b3JrZXInO1xuXG4vKipcbiAqIEBlbiBUaHJlYWQgb3B0aW9uc1xuICogQGVuIOOCueODrOODg+ODieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRocmVhZE9wdGlvbnM8VCBleHRlbmRzIFVua25vd25GdW5jdGlvbj4gZXh0ZW5kcyBDYW5jZWxhYmxlLCBXb3JrZXJPcHRpb25zIHtcbiAgICBhcmdzPzogUGFyYW1ldGVyczxUPjtcbn1cblxuLyoqXG4gKiBAZW4gRW5zdXJlIGV4ZWN1dGlvbiBpbiB3b3JrZXIgdGhyZWFkLlxuICogQGphIOODr+ODvOOCq+ODvOOCueODrOODg+ODieWGheOBp+Wun+ihjOOCkuS/neiovFxuICpcbiAqIEBleGFtcGxlIDxicj5cbiAqXG4gKiBgYGB0c1xuICogY29uc3QgZXhlYyA9IChhcmcxOiBudW1iZXIsIGFyZzI6IHN0cmluZykgPT4ge1xuICogICAgLy8gdGhpcyBzY29wZSBpcyB3b3JrZXIgc2NvcGUuIHlvdSBjYW5ub3QgdXNlIGNsb3N1cmUgYWNjZXNzLlxuICogICAgY29uc3QgcGFyYW0gPSB7Li4ufTtcbiAqICAgIGNvbnN0IG1ldGhvZCA9IChwKSA9PiB7Li4ufTtcbiAqICAgIC8vIHlvdSBjYW4gYWNjZXNzIGFyZ3VtZW50cyBmcm9tIG9wdGlvbnMuXG4gKiAgICBjb25zb2xlLmxvZyhhcmcxKTsgLy8gJzEnXG4gKiAgICBjb25zb2xlLmxvZyhhcmcyKTsgLy8gJ3Rlc3QnXG4gKiAgICA6XG4gKiAgICByZXR1cm4gbWV0aG9kKHBhcmFtKTtcbiAqIH07XG4gKlxuICogY29uc3QgYXJnMSA9IDE7XG4gKiBjb25zdCBhcmcyID0gJ3Rlc3QnO1xuICogY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhyZWFkKGV4ZWMsIHsgYXJnczogW2FyZzEsIGFyZzJdIH0pO1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4ZWN1dG9yXG4gKiAgLSBgZW5gIGltcGxlbWVudCBhcyBmdW5jdGlvbiBzY29wZS5cbiAqICAtIGBqYWAg6Zai5pWw44K544Kz44O844OX44Go44GX44Gm5a6f6KOFXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCB0aHJlYWQgb3B0aW9uc1xuICogIC0gYGphYCDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRocmVhZDxULCBVPihleGVjdXRvcjogKC4uLmFyZ3M6IFVbXSkgPT4gVCB8IFByb21pc2U8VD4sIG9wdGlvbnM/OiBUaHJlYWRPcHRpb25zPHR5cGVvZiBleGVjdXRvcj4pOiBQcm9taXNlPFQ+IHtcbiAgICBjb25zdCB7IGNhbmNlbDogb3JpZ2luYWxUb2tlbiwgYXJncyB9ID0gT2JqZWN0LmFzc2lnbih7IGFyZ3M6IFtdIH0sIG9wdGlvbnMpO1xuXG4gICAgLy8gYWxyZWFkeSBjYW5jZWxcbiAgICBpZiAob3JpZ2luYWxUb2tlbj8ucmVxdWVzdGVkKSB7XG4gICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgIH1cblxuICAgIGNvbnN0IGV4ZWMgPSBgKHNlbGYgPT4ge1xuICAgICAgICBzZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBhc3luYyAoeyBkYXRhIH0pID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgKCR7ZXhlY3V0b3IudG9TdHJpbmcoKX0pKC4uLmRhdGEpO1xuICAgICAgICAgICAgICAgIHNlbGYucG9zdE1lc3NhZ2UocmVzdWx0KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlOyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSkoc2VsZik7YDtcblxuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBJbmxpbmVXb3JrZXIoZXhlYywgb3B0aW9ucyk7XG5cbiAgICBjb25zdCBhYm9ydCA9ICgpOiB2b2lkID0+IHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICBvcmlnaW5hbFRva2VuPy5yZWdpc3RlcihhYm9ydCk7XG4gICAgY29uc3QgeyB0b2tlbiB9ID0gQ2FuY2VsVG9rZW4uc291cmNlKG9yaWdpbmFsVG9rZW4hKTtcblxuICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHdvcmtlci5vbmVycm9yID0gZXYgPT4ge1xuICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHJlamVjdChldik7XG4gICAgICAgICAgICB3b3JrZXIudGVybWluYXRlKCk7XG4gICAgICAgIH07XG4gICAgICAgIHdvcmtlci5vbm1lc3NhZ2UgPSBldiA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKGV2LmRhdGEpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgIH0sIHRva2VuKTtcblxuICAgIHdvcmtlci5wb3N0TWVzc2FnZShhcmdzKTtcblxuICAgIHJldHVybiBwcm9taXNlIGFzIFByb21pc2U8VD47XG59XG4iXSwibmFtZXMiOlsic2FmZSIsImlzRnVuY3Rpb24iLCJpc1N0cmluZyIsImNsYXNzTmFtZSIsIkNhbmNlbFRva2VuIiwicHJvbWlzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFhQSxpQkFBaUIsTUFBTSxHQUFHLEdBQU1BLGNBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckQsaUJBQWlCLE1BQU0sTUFBTSxHQUFHQSxjQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hELGlCQUFpQixNQUFNLElBQUksR0FBS0EsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV0RDtJQUNBLFNBQVMsbUJBQW1CLENBQUMsR0FBdUIsRUFBQTtJQUNoRCxJQUFBLElBQUksRUFBRUMsb0JBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSUMsa0JBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ3JDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBRyxFQUFBQyxtQkFBUyxDQUFDLEdBQUcsQ0FBQyxDQUErQiw2QkFBQSxDQUFBLENBQUMsQ0FBQztTQUN6RTtJQUNELElBQUEsT0FBTyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUNGLG9CQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBSSxDQUFBLEVBQUEsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFBLFFBQUEsQ0FBVSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JJLENBQUM7SUFFRDs7O0lBR0c7SUFDRyxNQUFPLFlBQWEsU0FBUSxNQUFNLENBQUE7O0lBRTVCLElBQUEsUUFBUSxDQUFTO0lBRXpCOzs7Ozs7Ozs7SUFTRztRQUNILFdBQVksQ0FBQSxHQUF1QixFQUFFLE9BQXVCLEVBQUE7SUFDeEQsUUFBQSxNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QyxRQUFBLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEIsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztTQUMzQjs7O0lBS0Q7OztJQUdHO1FBQ0gsU0FBUyxHQUFBO1lBQ0wsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2xCLFFBQUEsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDdEM7SUFDSjs7SUNoREQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBNkJHO0lBQ2EsU0FBQSxNQUFNLENBQU8sUUFBMEMsRUFBRSxPQUF3QyxFQUFBO1FBQzdHLE1BQU0sRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7O0lBRzdFLElBQUEsSUFBSSxhQUFhLEVBQUUsU0FBUyxFQUFFO1lBQzFCLE1BQU0sYUFBYSxDQUFDLE1BQU0sQ0FBQztTQUM5QjtJQUVELElBQUEsTUFBTSxJQUFJLEdBQUcsQ0FBQTs7O3dDQUd1QixRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7Ozs7OztjQU03QyxDQUFDO1FBRVgsTUFBTSxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRS9DLE1BQU0sS0FBSyxHQUFHLE1BQVksTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzdDLElBQUEsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUdHLG1CQUFXLENBQUMsTUFBTSxDQUFDLGFBQWMsQ0FBQyxDQUFDO1FBRXJELE1BQU1DLFNBQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUk7SUFDNUMsUUFBQSxNQUFNLENBQUMsT0FBTyxHQUFHLEVBQUUsSUFBRztnQkFDbEIsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ1gsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3ZCLFNBQUMsQ0FBQztJQUNGLFFBQUEsTUFBTSxDQUFDLFNBQVMsR0FBRyxFQUFFLElBQUc7SUFDcEIsWUFBQSxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNqQixNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDdkIsU0FBQyxDQUFDO1NBQ0wsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUVWLElBQUEsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUV6QixJQUFBLE9BQU9BLFNBQXFCLENBQUM7SUFDakM7Ozs7Ozs7Ozs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9pbmxpbmUtd29ya2VyLyJ9