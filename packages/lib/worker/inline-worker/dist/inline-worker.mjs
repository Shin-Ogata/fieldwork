/*!
 * @cdp/inline-worker 0.9.14
 *   inline web worker utility module
 */

import { safe, isFunction, isString, className } from '@cdp/core-utils';
import { CancelToken } from '@cdp/promise';

/** @internal */ const URL = safe(globalThis.URL);
/** @internal */ const Worker = safe(globalThis.Worker);
/** @internal */ const Blob = safe(globalThis.Blob);
/** @internal */
function createWorkerContext(src) {
    if (!(isFunction(src) || isString(src))) {
        throw new TypeError(`${className(src)} is not a function or string.`);
    }
    return URL.createObjectURL(new Blob([isFunction(src) ? `(${src.toString()})(self);` : src], { type: 'application/javascript' }));
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
    const { token } = CancelToken.source(originalToken);
    const promise = new Promise((resolve, reject) => {
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
    return promise;
}

export { InlineWorker, thread };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lLXdvcmtlci5tanMiLCJzb3VyY2VzIjpbImluaW5lLXdvcmtlci50cyIsInRocmVhZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNTdHJpbmcsXG4gICAgY2xhc3NOYW1lLFxuICAgIHNhZmUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKlxuICogQGVuIFtbSW5saW5lV29ya2VyXV0gc291cmNlIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW0lubGluZVdvcmtlcl1dIOOBq+aMh+WumuWPr+iDveOBquOCveODvOOCueWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBJbmxpZW5Xb3JrZXJTb3VyY2UgPSAoKHNlbGY6IFdvcmtlcikgPT4gdW5rbm93bikgfCBzdHJpbmc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgVVJMICAgID0gc2FmZShnbG9iYWxUaGlzLlVSTCk7XG4vKiogQGludGVybmFsICovIGNvbnN0IFdvcmtlciA9IHNhZmUoZ2xvYmFsVGhpcy5Xb3JrZXIpO1xuLyoqIEBpbnRlcm5hbCAqLyBjb25zdCBCbG9iICAgPSBzYWZlKGdsb2JhbFRoaXMuQmxvYik7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmZ1bmN0aW9uIGNyZWF0ZVdvcmtlckNvbnRleHQoc3JjOiBJbmxpZW5Xb3JrZXJTb3VyY2UpOiBzdHJpbmcge1xuICAgIGlmICghKGlzRnVuY3Rpb24oc3JjKSB8fCBpc1N0cmluZyhzcmMpKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGAke2NsYXNzTmFtZShzcmMpfSBpcyBub3QgYSBmdW5jdGlvbiBvciBzdHJpbmcuYCk7XG4gICAgfVxuICAgIHJldHVybiBVUkwuY3JlYXRlT2JqZWN0VVJMKG5ldyBCbG9iKFtpc0Z1bmN0aW9uKHNyYykgPyBgKCR7c3JjLnRvU3RyaW5nKCl9KShzZWxmKTtgIDogc3JjXSwgeyB0eXBlOiAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcgfSkpO1xufVxuXG4vKipcbiAqIEBlbiBTcGVjaWZpZWQgYFdvcmtlcmAgY2xhc3Mgd2hpY2ggZG9lc24ndCByZXF1aXJlIGEgc2NyaXB0IGZpbGUuXG4gKiBAamEg44K544Kv44Oq44OX44OI44OV44Kh44Kk44Or44KS5b+F6KaB44Go44GX44Gq44GEIGBXb3JrZXJgIOOCr+ODqeOCuVxuICovXG5leHBvcnQgY2xhc3MgSW5saW5lV29ya2VyIGV4dGVuZHMgV29ya2VyIHtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgcHJpdmF0ZSBfY29udGV4dDogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogY29uc3RydWN0b3JcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzcmNcbiAgICAgKiAgLSBgZW5gIHNvdXJjZSBmdW5jdGlvbiBvciBzY3JpcHQgYm9keS5cbiAgICAgKiAgLSBgamFgIOWun+ihjOmWouaVsOOBvuOBn+OBr+OCueOCr+ODquODl+ODiOWun+S9k1xuICAgICAqIEBwYXJhbSBvcHRpb25zXG4gICAgICogIC0gYGVuYCB3b3JrZXIgb3B0aW9ucy5cbiAgICAgKiAgLSBgamFgIFdvcmtlciDjgqrjg5fjgrfjg6fjg7NcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzcmM6IElubGllbldvcmtlclNvdXJjZSwgb3B0aW9ucz86IFdvcmtlck9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGNyZWF0ZVdvcmtlckNvbnRleHQoc3JjKTtcbiAgICAgICAgc3VwZXIoY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIG92ZXJyaWRlOiBXb3JrZXJcblxuICAgIC8qKlxuICAgICAqIEBlbiBGb3IgQkxPQiByZWxlYXNlLiBXaGVuIGNhbGxpbmcgYGNsb3NlICgpYCBpbiB0aGUgV29ya2VyLCBjYWxsIHRoaXMgbWV0aG9kIGFzIHdlbGwuXG4gICAgICogQGphIEJMT0Ig6Kej5pS+55SoLiBXb3JrZXIg5YaF44GnIGBjbG9zZSgpYCDjgpLlkbzjgbbloLTlkIgsIOacrOODoeOCveODg+ODieOCguOCs+ODvOODq+OBmeOCi+OBk+OBqC5cbiAgICAgKi9cbiAgICB0ZXJtaW5hdGUoKTogdm9pZCB7XG4gICAgICAgIHN1cGVyLnRlcm1pbmF0ZSgpO1xuICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFVua25vd25GdW5jdGlvbiB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5pbXBvcnQgeyBDYW5jZWxhYmxlLCBDYW5jZWxUb2tlbiB9IGZyb20gJ0BjZHAvcHJvbWlzZSc7XG5pbXBvcnQgeyBJbmxpbmVXb3JrZXIgfSBmcm9tICcuL2luaW5lLXdvcmtlcic7XG5cbi8qKlxuICogQGVuIFRocmVhZCBvcHRpb25zXG4gKiBAZW4g44K544Os44OD44OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVGhyZWFkT3B0aW9uczxUIGV4dGVuZHMgVW5rbm93bkZ1bmN0aW9uPiBleHRlbmRzIENhbmNlbGFibGUsIFdvcmtlck9wdGlvbnMge1xuICAgIGFyZ3M/OiBQYXJhbWV0ZXJzPFQ+O1xufVxuXG4vKipcbiAqIEBlbiBFbnN1cmUgZXhlY3V0aW9uIGluIHdvcmtlciB0aHJlYWQuXG4gKiBAamEg44Ov44O844Kr44O844K544Os44OD44OJ5YaF44Gn5a6f6KGM44KS5L+d6Ki8XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCBleGVjID0gKGFyZzE6IG51bWJlciwgYXJnMjogc3RyaW5nKSA9PiB7XG4gKiAgICAvLyB0aGlzIHNjb3BlIGlzIHdvcmtlciBzY29wZS4geW91IGNhbm5vdCB1c2UgY2xvc3VyZSBhY2Nlc3MuXG4gKiAgICBjb25zdCBwYXJhbSA9IHsuLi59O1xuICogICAgY29uc3QgbWV0aG9kID0gKHApID0+IHsuLi59O1xuICogICAgLy8geW91IGNhbiBhY2Nlc3MgYXJndW1lbnRzIGZyb20gb3B0aW9ucy5cbiAqICAgIGNvbnNvbGUubG9nKGFyZzEpOyAvLyAnMSdcbiAqICAgIGNvbnNvbGUubG9nKGFyZzIpOyAvLyAndGVzdCdcbiAqICAgIDpcbiAqICAgIHJldHVybiBtZXRob2QocGFyYW0pO1xuICogfTtcbiAqXG4gKiBjb25zdCBhcmcxID0gMTtcbiAqIGNvbnN0IGFyZzIgPSAndGVzdCc7XG4gKiBjb25zdCByZXN1bHQgPSBhd2FpdCB0aHJlYWQoZXhlYywgeyBhcmdzOiBbYXJnMSwgYXJnMl0gfSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZXhlY3V0b3JcbiAqICAtIGBlbmAgaW1wbGVtZW50IGFzIGZ1bmN0aW9uIHNjb3BlLlxuICogIC0gYGphYCDplqLmlbDjgrnjgrPjg7zjg5fjgajjgZfjgablrp/oo4VcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIHRocmVhZCBvcHRpb25zXG4gKiAgLSBgamFgIOOCueODrOODg+ODieOCquODl+OCt+ODp+ODs1xuICovXG5leHBvcnQgZnVuY3Rpb24gdGhyZWFkPFQsIFU+KGV4ZWN1dG9yOiAoLi4uYXJnczogVVtdKSA9PiBUIHwgUHJvbWlzZTxUPiwgb3B0aW9ucz86IFRocmVhZE9wdGlvbnM8dHlwZW9mIGV4ZWN1dG9yPik6IFByb21pc2U8VD4ge1xuICAgIGNvbnN0IHsgY2FuY2VsOiBvcmlnaW5hbFRva2VuLCBhcmdzIH0gPSBPYmplY3QuYXNzaWduKHsgYXJnczogW10gfSwgb3B0aW9ucyk7XG5cbiAgICAvLyBhbHJlYWR5IGNhbmNlbFxuICAgIGlmIChvcmlnaW5hbFRva2VuPy5yZXF1ZXN0ZWQpIHtcbiAgICAgICAgdGhyb3cgb3JpZ2luYWxUb2tlbi5yZWFzb247XG4gICAgfVxuXG4gICAgY29uc3QgZXhlYyA9IGAoc2VsZiA9PiB7XG4gICAgICAgIHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGFzeW5jICh7IGRhdGEgfSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAoJHtleGVjdXRvci50b1N0cmluZygpfSkoLi4uZGF0YSk7XG4gICAgICAgICAgICAgICAgc2VsZi5wb3N0TWVzc2FnZShyZXN1bHQpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGU7IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KShzZWxmKTtgO1xuXG4gICAgY29uc3Qgd29ya2VyID0gbmV3IElubGluZVdvcmtlcihleGVjLCBvcHRpb25zKTtcblxuICAgIGNvbnN0IGFib3J0ID0gKCk6IHZvaWQgPT4gd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgIG9yaWdpbmFsVG9rZW4/LnJlZ2lzdGVyKGFib3J0KTtcbiAgICBjb25zdCB7IHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2Uob3JpZ2luYWxUb2tlbiBhcyBDYW5jZWxUb2tlbik7XG5cbiAgICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB3b3JrZXIub25lcnJvciA9IGV2ID0+IHtcbiAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZWplY3QoZXYpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgICAgICB3b3JrZXIub25tZXNzYWdlID0gZXYgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShldi5kYXRhKTtcbiAgICAgICAgICAgIHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgfTtcbiAgICB9LCB0b2tlbik7XG5cbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoYXJncyk7XG5cbiAgICByZXR1cm4gcHJvbWlzZSBhcyBQcm9taXNlPFQ+O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBYUEsaUJBQWlCLE1BQU0sR0FBRyxHQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDckQsaUJBQWlCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDeEQsaUJBQWlCLE1BQU0sSUFBSSxHQUFLLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFdEQ7QUFDQSxTQUFTLG1CQUFtQixDQUFDLEdBQXVCLEVBQUE7QUFDaEQsSUFBQSxJQUFJLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1FBQ3JDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBRyxFQUFBLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBK0IsNkJBQUEsQ0FBQSxDQUFDLENBQUM7QUFDekUsS0FBQTtBQUNELElBQUEsT0FBTyxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUksQ0FBQSxFQUFBLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQSxRQUFBLENBQVUsR0FBRyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNySSxDQUFDO0FBRUQ7OztBQUdHO0FBQ0csTUFBTyxZQUFhLFNBQVEsTUFBTSxDQUFBOztBQUU1QixJQUFBLFFBQVEsQ0FBUztBQUV6Qjs7Ozs7Ozs7O0FBU0c7SUFDSCxXQUFZLENBQUEsR0FBdUIsRUFBRSxPQUF1QixFQUFBO0FBQ3hELFFBQUEsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDekMsUUFBQSxLQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3hCLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7S0FDM0I7OztBQUtEOzs7QUFHRztJQUNILFNBQVMsR0FBQTtRQUNMLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNsQixRQUFBLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3RDO0FBQ0o7O0FDaEREOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTZCRztBQUNhLFNBQUEsTUFBTSxDQUFPLFFBQTBDLEVBQUUsT0FBd0MsRUFBQTtJQUM3RyxNQUFNLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDOztJQUc3RSxJQUFJLGFBQWEsRUFBRSxTQUFTLEVBQUU7UUFDMUIsTUFBTSxhQUFhLENBQUMsTUFBTSxDQUFDO0FBQzlCLEtBQUE7QUFFRCxJQUFBLE1BQU0sSUFBSSxHQUFHLENBQUE7Ozt3Q0FHdUIsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBOzs7Ozs7Y0FNN0MsQ0FBQztJQUVYLE1BQU0sTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUUvQyxNQUFNLEtBQUssR0FBRyxNQUFZLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUM3QyxJQUFBLGFBQWEsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0IsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsYUFBNEIsQ0FBQyxDQUFDO0lBRW5FLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sS0FBSTtBQUM1QyxRQUFBLE1BQU0sQ0FBQyxPQUFPLEdBQUcsRUFBRSxJQUFHO1lBQ2xCLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNwQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWCxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDdkIsU0FBQyxDQUFDO0FBQ0YsUUFBQSxNQUFNLENBQUMsU0FBUyxHQUFHLEVBQUUsSUFBRztBQUNwQixZQUFBLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakIsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3ZCLFNBQUMsQ0FBQztLQUNMLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFVixJQUFBLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFekIsSUFBQSxPQUFPLE9BQXFCLENBQUM7QUFDakM7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2lubGluZS13b3JrZXIvIn0=