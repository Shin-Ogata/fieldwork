/*!
 * @cdp/inline-worker 0.9.5
 *   inline web worker utility module
 */

import { safe, isFunction, isString, className } from '@cdp/core-utils';
import { CancelToken } from '@cdp/promise';

/** @internal */ const URL = safe(globalThis.URL);
/** @internal */ const Worker = safe(globalThis.Worker);
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
 * const result = await thread(() => exec(arg));
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
    const { cancel: originalToken } = options || {};
    // already cancel
    if (originalToken?.requested) {
        throw originalToken.reason;
    }
    const exec = `(async (self) => {
        try {
            const result = await (${executor.toString()})();
            self.postMessage(result);
        } catch (e) {
            setTimeout(function() { throw e; });
        }
    })(self);`;
    const worker = new InlineWorker(exec, options);
    const abort = () => worker.terminate();
    originalToken?.register(abort);
    const { token } = CancelToken.source(originalToken);
    return new Promise((resolve, reject) => {
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
}

export { InlineWorker, thread };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lLXdvcmtlci5tanMiLCJzb3VyY2VzIjpbImluaW5lLXdvcmtlci50cyIsInRocmVhZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICAgIGlzRnVuY3Rpb24sXG4gICAgaXNTdHJpbmcsXG4gICAgY2xhc3NOYW1lLFxuICAgIHNhZmUsXG59IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbi8qKlxuICogQGVuIFtbSW5saW5lV29ya2VyXV0gc291cmNlIHR5cGUgZGVmaW5pdGlvbi5cbiAqIEBqYSBbW0lubGluZVdvcmtlcl1dIOOBq+aMh+WumuWPr+iDveOBquOCveODvOOCueWei+Wumue+qVxuICovXG5leHBvcnQgdHlwZSBJbmxpZW5Xb3JrZXJTb3VyY2UgPSAoKHNlbGY6IFdvcmtlcikgPT4gdW5rbm93bikgfCBzdHJpbmc7XG5cbi8qKiBAaW50ZXJuYWwgKi8gY29uc3QgVVJMICAgID0gc2FmZShnbG9iYWxUaGlzLlVSTCk7XG4vKiogQGludGVybmFsICovIGNvbnN0IFdvcmtlciA9IHNhZmUoZ2xvYmFsVGhpcy5Xb3JrZXIpO1xuXG4vKiogQGludGVybmFsICovXG5mdW5jdGlvbiBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYzogSW5saWVuV29ya2VyU291cmNlKTogc3RyaW5nIHtcbiAgICBpZiAoIShpc0Z1bmN0aW9uKHNyYykgfHwgaXNTdHJpbmcoc3JjKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgJHtjbGFzc05hbWUoc3JjKX0gaXMgbm90IGEgZnVuY3Rpb24gb3Igc3RyaW5nLmApO1xuICAgIH1cbiAgICByZXR1cm4gVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbaXNGdW5jdGlvbihzcmMpID8gYCgke3NyYy50b1N0cmluZygpfSkoc2VsZik7YCA6IHNyY10sIHsgdHlwZTogJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnIH0pKTtcbn1cblxuLyoqXG4gKiBAZW4gU3BlY2lmaWVkIGBXb3JrZXJgIGNsYXNzIHdoaWNoIGRvZXNuJ3QgcmVxdWlyZSBhIHNjcmlwdCBmaWxlLlxuICogQGphIOOCueOCr+ODquODl+ODiOODleOCoeOCpOODq+OCkuW/heimgeOBqOOBl+OBquOBhCBgV29ya2VyYCDjgq/jg6njgrlcbiAqL1xuZXhwb3J0IGNsYXNzIElubGluZVdvcmtlciBleHRlbmRzIFdvcmtlciB7XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIHByaXZhdGUgX2NvbnRleHQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc3JjXG4gICAgICogIC0gYGVuYCBzb3VyY2UgZnVuY3Rpb24gb3Igc2NyaXB0IGJvZHkuXG4gICAgICogIC0gYGphYCDlrp/ooYzplqLmlbDjgb7jgZ/jga/jgrnjgq/jg6rjg5fjg4jlrp/kvZNcbiAgICAgKiBAcGFyYW0gb3B0aW9uc1xuICAgICAqICAtIGBlbmAgd29ya2VyIG9wdGlvbnMuXG4gICAgICogIC0gYGphYCBXb3JrZXIg44Kq44OX44K344On44OzXG4gICAgICovXG4gICAgY29uc3RydWN0b3Ioc3JjOiBJbmxpZW5Xb3JrZXJTb3VyY2UsIG9wdGlvbnM/OiBXb3JrZXJPcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBjcmVhdGVXb3JrZXJDb250ZXh0KHNyYyk7XG4gICAgICAgIHN1cGVyKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBvdmVycmlkZTogV29ya2VyXG5cbiAgICB0ZXJtaW5hdGUoKTogdm9pZCB7XG4gICAgICAgIHN1cGVyLnRlcm1pbmF0ZSgpO1xuICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IENhbmNlbGFibGUsIENhbmNlbFRva2VuIH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IElubGluZVdvcmtlciB9IGZyb20gJy4vaW5pbmUtd29ya2VyJztcblxuLyoqXG4gKiBAZW4gVGhyZWFkIG9wdGlvbnNcbiAqIEBlbiDjgrnjg6zjg4Pjg4njgqrjg5fjgrfjg6fjg7NcbiAqL1xuZXhwb3J0IHR5cGUgVGhyZWFkT3B0aW9ucyA9IENhbmNlbGFibGUgJiBXb3JrZXJPcHRpb25zO1xuXG4vKipcbiAqIEBlbiBFbnN1cmUgZXhlY3V0aW9uIGluIHdvcmtlciB0aHJlYWQuXG4gKiBAamEg44Ov44O844Kr44O844K544Os44OD44OJ5YaF44Gn5a6f6KGM44KS5L+d6Ki8XG4gKlxuICogQGV4YW1wbGUgPGJyPlxuICpcbiAqIGBgYHRzXG4gKiBjb25zdCByZXN1bHQgPSBhd2FpdCB0aHJlYWQoKCkgPT4gZXhlYyhhcmcpKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBleGVjdXRvclxuICogIC0gYGVuYCBpbXBsZW1lbnQgYXMgZnVuY3Rpb24gc2NvcGUuXG4gKiAgLSBgamFgIOmWouaVsOOCueOCs+ODvOODl+OBqOOBl+OBpuWun+ijhVxuICogQHBhcmFtIG9wdGlvbnNcbiAqICAtIGBlbmAgdGhyZWFkIG9wdGlvbnNcbiAqICAtIGBqYWAg44K544Os44OD44OJ44Kq44OX44K344On44OzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aHJlYWQ8VD4oZXhlY3V0b3I6ICgpID0+IFQgfCBQcm9taXNlPFQ+LCBvcHRpb25zPzogVGhyZWFkT3B0aW9ucyk6IFByb21pc2U8VD4ge1xuICAgIGNvbnN0IHsgY2FuY2VsOiBvcmlnaW5hbFRva2VuIH0gPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gYWxyZWFkeSBjYW5jZWxcbiAgICBpZiAob3JpZ2luYWxUb2tlbj8ucmVxdWVzdGVkKSB7XG4gICAgICAgIHRocm93IG9yaWdpbmFsVG9rZW4ucmVhc29uO1xuICAgIH1cblxuICAgIGNvbnN0IGV4ZWMgPSBgKGFzeW5jIChzZWxmKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCAoJHtleGVjdXRvci50b1N0cmluZygpfSkoKTtcbiAgICAgICAgICAgIHNlbGYucG9zdE1lc3NhZ2UocmVzdWx0KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZTsgfSk7XG4gICAgICAgIH1cbiAgICB9KShzZWxmKTtgO1xuXG4gICAgY29uc3Qgd29ya2VyID0gbmV3IElubGluZVdvcmtlcihleGVjLCBvcHRpb25zKTtcblxuICAgIGNvbnN0IGFib3J0ID0gKCk6IHZvaWQgPT4gd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgIG9yaWdpbmFsVG9rZW4/LnJlZ2lzdGVyKGFib3J0KTtcbiAgICBjb25zdCB7IHRva2VuIH0gPSBDYW5jZWxUb2tlbi5zb3VyY2Uob3JpZ2luYWxUb2tlbiBhcyBDYW5jZWxUb2tlbik7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB3b3JrZXIub25lcnJvciA9IGV2ID0+IHtcbiAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICByZWplY3QoZXYpO1xuICAgICAgICAgICAgd29ya2VyLnRlcm1pbmF0ZSgpO1xuICAgICAgICB9O1xuICAgICAgICB3b3JrZXIub25tZXNzYWdlID0gZXYgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShldi5kYXRhKTtcbiAgICAgICAgICAgIHdvcmtlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgfTtcbiAgICB9LCB0b2tlbik7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFhQSxpQkFBaUIsTUFBTSxHQUFHLEdBQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNyRCxpQkFBaUIsTUFBTSxNQUFNLEdBQUcs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
