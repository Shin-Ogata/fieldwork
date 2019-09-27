/*!
 * @cdp/ajax 0.9.0
 *   ajax utility module
 */

import { isNumber } from '@cdp/core-utils';

let _timeout;
const settings = {
    get timeout() {
        return _timeout;
    },
    set timeout(value) {
        _timeout = (isNumber(value) && 0 <= value) ? value : undefined;
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

export { ajax, settings };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWpheC5tanMiLCJzb3VyY2VzIjpbInNldHRpbmdzLnRzIiwiY29yZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpc051bWJlciB9IGZyb20gJ0BjZHAvY29yZS11dGlscyc7XG5cbmxldCBfdGltZW91dDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG5leHBvcnQgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgZ2V0IHRpbWVvdXQoKTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgcmV0dXJuIF90aW1lb3V0O1xuICAgIH0sXG4gICAgc2V0IHRpbWVvdXQodmFsdWU6IG51bWJlciB8IHVuZGVmaW5lZCkge1xuICAgICAgICBfdGltZW91dCA9IChpc051bWJlcih2YWx1ZSkgJiYgMCA8PSB2YWx1ZSkgPyB2YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICB9LFxufTtcbiIsImltcG9ydCB7IFBsYWluT2JqZWN0LCBpc0Z1bmN0aW9uIH0gZnJvbSAnQGNkcC9jb3JlLXV0aWxzJztcbmltcG9ydCB7IH0gZnJvbSAnQGNkcC9wcm9taXNlJztcbmltcG9ydCB7IEJsb2IsIEJhc2U2NCB9IGZyb20gJ0BjZHAvYmluYXJ5JztcbmltcG9ydCB7XG4gICAgQWpheERhdGFUeXBlcyxcbiAgICBBamF4T3B0aW9ucyxcbiAgICBBamF4UmVzdWx0LFxufSBmcm9tICcuL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZmV0Y2ggfSBmcm9tICcuL3Nzcic7XG5pbXBvcnQgeyBzZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG4vLyBUT0RPOiBkYXRhIOWKoOW3pVxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2ZyYW1ld29yazdpby9mcmFtZXdvcms3L2Jsb2IvbWFzdGVyL3BhY2thZ2VzL2NvcmUvdXRpbHMvcmVxdWVzdC5qcyNMMTUzXG4vLyBBY2NlcHRcbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2phL2RvY3MvV2ViL0hUVFAvSGVhZGVycy9BY2NlcHRcbi8vIFgtUmVxdWVzdGVkLVdpdGg6IFhNTEh0dHBSZXF1ZXN0XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZ2l0aHViL2ZldGNoL2lzc3Vlcy8xN1xuLy8gQ09SUyAvIEpTT05QIChzY3JpcHQg44K/44Kw44KS5L2/44GG44Gu44Gn44KE44KJ44Gq44GEKVxuLy8gaHR0cHM6Ly9xaWl0YS5jb20vYXR0NTUvaXRlbXMvMjE1NGE4YWFkOGJmMTQwOWRiMmJcbi8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQxMTQ2NjUwL2dldC1qc29uLWZyb20tanNvbnAtZmV0Y2gtcHJvbWlzZVxuLy8gQmFzaWMg6KqN6Ki8XG4vLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80Mzg0Mjc5My9iYXNpYy1hdXRoZW50aWNhdGlvbi13aXRoLWZldGNoXG5cbi8qKiBgUGxhaW5PYmplY3RgIHRvIHF1ZXJ5IHN0cmluZ3MgKi9cbmZ1bmN0aW9uIHRvUXVlcnlTdHJpbmdzKGRhdGE6IFBsYWluT2JqZWN0KTogc3RyaW5nIHtcbiAgICBjb25zdCBwYXJhbXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgcHJvcCA9IGRhdGFba2V5XTtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBpc0Z1bmN0aW9uKHByb3ApID8gcHJvcCgpIDogcHJvcDtcbiAgICAgICAgcGFyYW1zLnB1c2goYCR7ZW5jb2RlVVJJQ29tcG9uZW50KGtleSl9PSR7ZW5jb2RlVVJJQ29tcG9uZW50KG51bGwgIT0gdmFsdWUgPyB2YWx1ZSA6ICcnKX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtcy5qb2luKCcmJyk7XG59XG5cbi8qKlxuICogQGVuIFBlcmZvcm0gYW4gYXN5bmNocm9ub3VzIEhUVFAgKEFqYXgpIHJlcXVlc3QuXG4gKiBAamEgSFRUUCAoQWpheCnjg6rjgq/jgqjjgrnjg4jjga7pgIHkv6FcbiAqXG4gKiBAcGFyYW0gdXJpXG4gKiAgLSBgZW5gIEEgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBpcyBzZW50LlxuICogIC0gYGphYCBBamF444Oq44Kv44Ko44K544OI44KS6YCB5L+h44GZ44KLVVJM44KS5oyH5a6aXG4gKiBAcGFyYW0gb3B0aW9uc1xuICogIC0gYGVuYCBBamF4IHJlcXVlc3Qgc2V0dGluZ3MuXG4gKiAgLSBgamFgIEFqYXjjg6rjgq/jgqjjgrnjg4joqK3lrppcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFqYXg8VCBleHRlbmRzIEFqYXhEYXRhVHlwZXMgfCB7fSA9ICdyZXNwb25zZSc+KHVybDogc3RyaW5nLCBvcHRpb25zPzogQWpheE9wdGlvbnM8VD4pOiBQcm9taXNlPEFqYXhSZXN1bHQ8VD4+IHtcbiAgICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIGNvbnRlbnRUeXBlOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04JyxcbiAgICAgICAgZGF0YVR5cGU6ICdyZXNwb25zZScsXG4gICAgICAgIHRpbWVvdXQ6IHNldHRpbmdzLnRpbWVvdXQsXG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICAvLyBUT0RPOlxuICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIHJldHVybiBudWxsITtcbn1cblxuLypcbihhc3luYyAoKSA9PiB7XG4gICAgbGV0IGhvZ2UwID0gYXdhaXQgYWpheCgnYWFhJyk7XG4gICAgbGV0IGhvZ2UxID0gYXdhaXQgYWpheCgnYWFhJywgeyBkYXRhVHlwZTogJ3RleHQnIH0pO1xuICAgIGxldCBob2dlMiA9IGF3YWl0IGFqYXgoJ2FhYScsIHsgZGF0YVR5cGU6ICdqc29uJyB9KTtcbiAgICBsZXQgaG9nZTMgPSBhd2FpdCBhamF4PHsgcHJvcDogbnVtYmVyOyB9PignYWFhJywgeyBkYXRhVHlwZTogJ2pzb24nIH0pO1xuICAgIGxldCBob2dlNCA9IGF3YWl0IGFqYXgoJ2FhYScsIHsgZGF0YVR5cGU6ICdhcnJheUJ1ZmZlcicgfSk7XG4gICAgbGV0IGhvZ2U1ID0gYXdhaXQgYWpheCgnYWFhJywgeyBkYXRhVHlwZTogJ2Jsb2InIH0pO1xuICAgIGxldCBob2dlNiA9IGF3YWl0IGFqYXgoJ2FhYScsIHsgZGF0YVR5cGU6ICdzdHJlYW0nIH0pO1xuICAgIGxldCBob2dlNyA9IGF3YWl0IGFqYXgoJ2FhYScsIHsgZGF0YVR5cGU6ICdyZXNwb25zZScgfSk7XG4vLyAgICBsZXQgaG9nZTggPSBhd2FpdCBhamF4PHsgcHJvcDogbnVtYmVyOyB9PignYWFhJywgeyBkYXRhVHlwZTogJ3RleHQnIH0pOyAvLyBlcnJvclxuICAgIGxldCBob2dlOSA9IGF3YWl0IGFqYXg8eyBwcm9wOiBudW1iZXI7IH0+KCdhYWEnLCB7fSk7IC8vIG5vLWVycm9yIOazqOaEjy5cbn0pKCk7XG4qL1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFFQSxJQUFJLFFBQTRCLENBQUM7QUFFakMsTUFBYSxRQUFRLEdBQUc7SUFDcEIsSUFBSSxPQUFPO1FBQ1AsT0FBTyxRQUFRLENBQUM7S0FDbkI7SUFDRCxJQUFJLE9BQU8sQ0FBQyxLQUF5QjtRQUNqQyxRQUFRLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDO0tBQ2xFO0NBQ0o7O0FDdUJEOzs7Ozs7Ozs7OztBQVdBLEFBQU8sZUFBZSxJQUFJLENBQTRDLEdBQVcsRUFBRSxPQUF3QjtJQUN2RyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ3ZCLFdBQVcsRUFBRSxrREFBa0Q7UUFDL0QsUUFBUSxFQUFFLFVBQVU7UUFDcEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO0tBQzVCLEVBQUUsT0FBTyxDQUFDLENBQUM7O0lBR1osTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDeEIsT0FBTyxJQUFLLENBQUM7Q0FDaEI7Ozs7Ozs7Ozs7Ozs7O0VBZUM7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2FqYXgvIn0=
