/*!
 * @cdp/ajax 0.9.0
 *   ajax utility module
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/core-utils')) :
    typeof define === 'function' && define.amd ? define(['exports', '@cdp/core-utils'], factory) :
    (global = global || self, factory(global.CDP = global.CDP || {}, global.CDP.Utils));
}(this, function (exports, coreUtils) { 'use strict';

    let _timeout;
    const settings = {
        get timeout() {
            return _timeout;
        },
        set timeout(value) {
            _timeout = (coreUtils.isNumber(value) && 0 <= value) ? value : undefined;
        },
    };

    /**
     * @en Perform an asynchronous HTTP (Ajax) request.
     * @ja HTTP (Ajax)リクエストの送信
     *
     * @param uri
     *  - `en` A string containing the URL to which the request is sent.
     *  - `ja` Ajaxリクエストを送信するURLを指定
     * @param options
     *  - `en` Ajax request settings.
     *  - `ja` Ajaxリクエスト設定
     */
    async function ajax(url, options) {
        const opts = Object.assign({
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            dataType: 'response',
            timeout: settings.timeout,
        }, options);
        // TODO:
        await Promise.resolve();
        return null;
    }
    /*
    (async () => {
        let hoge0 = await ajax('aaa');
        let hoge1 = await ajax('aaa', { dataType: 'text' });
        let hoge2 = await ajax('aaa', { dataType: 'json' });
        let hoge3 = await ajax<{ prop: number; }>('aaa', { dataType: 'json' });
        let hoge4 = await ajax('aaa', { dataType: 'arrayBuffer' });
        let hoge5 = await ajax('aaa', { dataType: 'blob' });
        let hoge6 = await ajax('aaa', { dataType: 'stream' });
        let hoge7 = await ajax('aaa', { dataType: 'response' });
    //    let hoge8 = await ajax<{ prop: number; }>('aaa', { dataType: 'text' }); // error
        let hoge9 = await ajax<{ prop: number; }>('aaa', {}); // no-error 注意.
    })();
    */

    exports.ajax = ajax;
    exports.settings = settings;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWpheC5qcyIsInNvdXJjZXMiOlsic2V0dGluZ3MudHMiLCJjb3JlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGlzTnVtYmVyIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcblxubGV0IF90aW1lb3V0OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbmV4cG9ydCBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICBnZXQgdGltZW91dCgpOiBudW1iZXIgfCB1bmRlZmluZWQge1xuICAgICAgICByZXR1cm4gX3RpbWVvdXQ7XG4gICAgfSxcbiAgICBzZXQgdGltZW91dCh2YWx1ZTogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gICAgICAgIF90aW1lb3V0ID0gKGlzTnVtYmVyKHZhbHVlKSAmJiAwIDw9IHZhbHVlKSA/IHZhbHVlIDogdW5kZWZpbmVkO1xuICAgIH0sXG59O1xuIiwiaW1wb3J0IHsgUGxhaW5PYmplY3QsIGlzRnVuY3Rpb24gfSBmcm9tICdAY2RwL2NvcmUtdXRpbHMnO1xuaW1wb3J0IHsgfSBmcm9tICdAY2RwL3Byb21pc2UnO1xuaW1wb3J0IHsgQmxvYiwgQmFzZTY0IH0gZnJvbSAnQGNkcC9iaW5hcnknO1xuaW1wb3J0IHtcbiAgICBBamF4RGF0YVR5cGVzLFxuICAgIEFqYXhPcHRpb25zLFxuICAgIEFqYXhSZXN1bHQsXG59IGZyb20gJy4vaW50ZXJmYWNlcyc7XG5pbXBvcnQgeyBmZXRjaCB9IGZyb20gJy4vc3NyJztcbmltcG9ydCB7IHNldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5cbi8vIFRPRE86IGRhdGEg5Yqg5belXG4vLyBodHRwczovL2dpdGh1Yi5jb20vZnJhbWV3b3JrN2lvL2ZyYW1ld29yazcvYmxvYi9tYXN0ZXIvcGFja2FnZXMvY29yZS91dGlscy9yZXF1ZXN0LmpzI0wxNTNcbi8vIEFjY2VwdFxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvamEvZG9jcy9XZWIvSFRUUC9IZWFkZXJzL0FjY2VwdFxuLy8gWC1SZXF1ZXN0ZWQtV2l0aDogWE1MSHR0cFJlcXVlc3Rcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9naXRodWIvZmV0Y2gvaXNzdWVzLzE3XG4vLyBDT1JTIC8gSlNPTlAgKHNjcmlwdCDjgr/jgrDjgpLkvb/jgYbjga7jgafjgoTjgonjgarjgYQpXG4vLyBodHRwczovL3FpaXRhLmNvbS9hdHQ1NS9pdGVtcy8yMTU0YThhYWQ4YmYxNDA5ZGIyYlxuLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNDExNDY2NTAvZ2V0LWpzb24tZnJvbS1qc29ucC1mZXRjaC1wcm9taXNlXG4vLyBCYXNpYyDoqo3oqLxcbi8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQzODQyNzkzL2Jhc2ljLWF1dGhlbnRpY2F0aW9uLXdpdGgtZmV0Y2hcblxuLyoqIGBQbGFpbk9iamVjdGAgdG8gcXVlcnkgc3RyaW5ncyAqL1xuZnVuY3Rpb24gdG9RdWVyeVN0cmluZ3MoZGF0YTogUGxhaW5PYmplY3QpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhcmFtczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhkYXRhKSkge1xuICAgICAgICBjb25zdCBwcm9wID0gZGF0YVtrZXldO1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGlzRnVuY3Rpb24ocHJvcCkgPyBwcm9wKCkgOiBwcm9wO1xuICAgICAgICBwYXJhbXMucHVzaChgJHtlbmNvZGVVUklDb21wb25lbnQoa2V5KX09JHtlbmNvZGVVUklDb21wb25lbnQobnVsbCAhPSB2YWx1ZSA/IHZhbHVlIDogJycpfWApO1xuICAgIH1cbiAgICByZXR1cm4gcGFyYW1zLmpvaW4oJyYnKTtcbn1cblxuLyoqXG4gKiBAZW4gUGVyZm9ybSBhbiBhc3luY2hyb25vdXMgSFRUUCAoQWpheCkgcmVxdWVzdC5cbiAqIEBqYSBIVFRQIChBamF4KeODquOCr+OCqOOCueODiOOBrumAgeS/oVxuICpcbiAqIEBwYXJhbSB1cmlcbiAqICAtIGBlbmAgQSBzdHJpbmcgY29udGFpbmluZyB0aGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IGlzIHNlbnQuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4jjgpLpgIHkv6HjgZnjgotVUkzjgpLmjIflrppcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiAgLSBgZW5gIEFqYXggcmVxdWVzdCBzZXR0aW5ncy5cbiAqICAtIGBqYWAgQWpheOODquOCr+OCqOOCueODiOioreWumlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWpheDxUIGV4dGVuZHMgQWpheERhdGFUeXBlcyB8IHt9ID0gJ3Jlc3BvbnNlJz4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBBamF4T3B0aW9uczxUPik6IFByb21pc2U8QWpheFJlc3VsdDxUPj4ge1xuICAgIGNvbnN0IG9wdHMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnLFxuICAgICAgICBkYXRhVHlwZTogJ3Jlc3BvbnNlJyxcbiAgICAgICAgdGltZW91dDogc2V0dGluZ3MudGltZW91dCxcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIC8vIFRPRE86XG4gICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgcmV0dXJuIG51bGwhO1xufVxuXG4vKlxuKGFzeW5jICgpID0+IHtcbiAgICBsZXQgaG9nZTAgPSBhd2FpdCBhamF4KCdhYWEnKTtcbiAgICBsZXQgaG9nZTEgPSBhd2FpdCBhamF4KCdhYWEnLCB7IGRhdGFUeXBlOiAndGV4dCcgfSk7XG4gICAgbGV0IGhvZ2UyID0gYXdhaXQgYWpheCgnYWFhJywgeyBkYXRhVHlwZTogJ2pzb24nIH0pO1xuICAgIGxldCBob2dlMyA9IGF3YWl0IGFqYXg8eyBwcm9wOiBudW1iZXI7IH0+KCdhYWEnLCB7IGRhdGFUeXBlOiAnanNvbicgfSk7XG4gICAgbGV0IGhvZ2U0ID0gYXdhaXQgYWpheCgnYWFhJywgeyBkYXRhVHlwZTogJ2FycmF5QnVmZmVyJyB9KTtcbiAgICBsZXQgaG9nZTUgPSBhd2FpdCBhamF4KCdhYWEnLCB7IGRhdGFUeXBlOiAnYmxvYicgfSk7XG4gICAgbGV0IGhvZ2U2ID0gYXdhaXQgYWpheCgnYWFhJywgeyBkYXRhVHlwZTogJ3N0cmVhbScgfSk7XG4gICAgbGV0IGhvZ2U3ID0gYXdhaXQgYWpheCgnYWFhJywgeyBkYXRhVHlwZTogJ3Jlc3BvbnNlJyB9KTtcbi8vICAgIGxldCBob2dlOCA9IGF3YWl0IGFqYXg8eyBwcm9wOiBudW1iZXI7IH0+KCdhYWEnLCB7IGRhdGFUeXBlOiAndGV4dCcgfSk7IC8vIGVycm9yXG4gICAgbGV0IGhvZ2U5ID0gYXdhaXQgYWpheDx7IHByb3A6IG51bWJlcjsgfT4oJ2FhYScsIHt9KTsgLy8gbm8tZXJyb3Ig5rOo5oSPLlxufSkoKTtcbiovXG4iXSwibmFtZXMiOlsiaXNOdW1iZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBRUEsSUFBSSxRQUE0QixDQUFDO0FBRWpDLFVBQWEsUUFBUSxHQUFHO1FBQ3BCLElBQUksT0FBTztZQUNQLE9BQU8sUUFBUSxDQUFDO1NBQ25CO1FBQ0QsSUFBSSxPQUFPLENBQUMsS0FBeUI7WUFDakMsUUFBUSxHQUFHLENBQUNBLGtCQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDO1NBQ2xFO0tBQ0o7O0lDdUJEOzs7Ozs7Ozs7OztBQVdBLElBQU8sZUFBZSxJQUFJLENBQTRDLEdBQVcsRUFBRSxPQUF3QjtRQUN2RyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ3ZCLFdBQVcsRUFBRSxrREFBa0Q7WUFDL0QsUUFBUSxFQUFFLFVBQVU7WUFDcEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO1NBQzVCLEVBQUUsT0FBTyxDQUFDLENBQUM7O1FBR1osTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEIsT0FBTyxJQUFLLENBQUM7SUFDakIsQ0FBQztJQUVEOzs7Ozs7Ozs7Ozs7O01BYUU7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2FqYXgvIn0=
