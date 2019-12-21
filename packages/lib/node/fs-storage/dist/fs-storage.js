/*!
 * @cdp/fs-storage 0.9.0
 *   file-system storage utility module
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const path = require('path');
const fsExtra = require('fs-extra');

const STATUS = 'TODO';
function check(path$1) {
    return fsExtra.existsSync(path.resolve(process.cwd(), path$1));
}

const DUMMY1 = 'dummy1';

const DUMMY2 = 'dummy2';

exports.DUMMY1 = DUMMY1;
exports.DUMMY2 = DUMMY2;
exports.STATUS = STATUS;
exports.check = check;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnMtc3RvcmFnZS5qcyIsInNvdXJjZXMiOlsiZnMtc3RvcmFnZS50cyIsImR1bW15MS50cyIsImR1bW15Mi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgU1RBVFVTID0gJ1RPRE8nO1xuXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2socGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGV4aXN0c1N5bmMocmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBwYXRoKSk7XG59XG4iLCJleHBvcnQgY29uc3QgRFVNTVkxID0gJ2R1bW15MSc7XG4iLCJleHBvcnQgY29uc3QgRFVNTVkyID0gJ2R1bW15Mic7XG4iXSwibmFtZXMiOlsicGF0aCIsImV4aXN0c1N5bmMiLCJyZXNvbHZlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7TUFBYSxNQUFNLEdBQUcsTUFBTSxDQUFDO0FBRTdCLFNBR2dCLEtBQUssQ0FBQ0EsTUFBWTtJQUM5QixPQUFPQyxrQkFBVSxDQUFDQyxZQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFRixNQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ25EOztNQ1BZLE1BQU0sR0FBRyxRQUFROztNQ0FqQixNQUFNLEdBQUcsUUFBUTs7Ozs7OzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZnMtc3RvcmFnZS8ifQ==
