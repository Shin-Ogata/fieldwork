/*!
 * @cdp/fs-storage 0.9.0
 *   file-system storage utility module
 */

import { resolve } from 'path';
import { existsSync } from 'fs-extra';

const STATUS = 'TODO';
function check(path) {
    return existsSync(resolve(process.cwd(), path));
}

const DUMMY1 = 'dummy1';

const DUMMY2 = 'dummy2';

export { DUMMY1, DUMMY2, STATUS, check };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnMtc3RvcmFnZS5tanMiLCJzb3VyY2VzIjpbImZzLXN0b3JhZ2UudHMiLCJkdW1teTEudHMiLCJkdW1teTIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IFNUQVRVUyA9ICdUT0RPJztcblxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBleGlzdHNTeW5jKHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgcGF0aCkpO1xufVxuIiwiZXhwb3J0IGNvbnN0IERVTU1ZMSA9ICdkdW1teTEnO1xuIiwiZXhwb3J0IGNvbnN0IERVTU1ZMiA9ICdkdW1teTInO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O01BQWEsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUU3QixTQUdnQixLQUFLLENBQUMsSUFBWTtJQUM5QixPQUFPLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDbkQ7O01DUFksTUFBTSxHQUFHLFFBQVE7O01DQWpCLE1BQU0sR0FBRyxRQUFROzs7OyIsInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9mcy1zdG9yYWdlLyJ9
