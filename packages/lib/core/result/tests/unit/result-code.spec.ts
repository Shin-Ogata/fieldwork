import {
    RESULT_CODE,
    RESULT_CODE_BASE,
    DECLARE_SUCCESS_CODE,
    DECLARE_ERROR_CODE,
    ASSIGN_RESULT_CODE,
    toNameString,
    toHelpString,
    SUCCEEDED,
    FAILED,
} from '@cdp/result';

enum MODULE_RESULT_CODE {
    MODULE_SUCCEEDED = DECLARE_SUCCESS_CODE(RESULT_CODE_BASE.TEST, 300, 'module succeess result.'),
    MODULE_FAILED = DECLARE_ERROR_CODE(RESULT_CODE_BASE.TEST, 300, 'module failed result.'),
}
ASSIGN_RESULT_CODE(MODULE_RESULT_CODE);

const MERGED_RESULT_CODE = { ...RESULT_CODE, ...MODULE_RESULT_CODE };

describe('result/result-code spec', () => {
    it('check default result code', () => {
        expect(RESULT_CODE.SUCCESS).toBe(0);
        expect(RESULT_CODE.FAIL).toBe(-1);
        expect(RESULT_CODE.ABORT).toBe(1);
        expect(RESULT_CODE.FATAL).toBe(-2);
        expect(RESULT_CODE.PENDING).toBe(2);
        expect(RESULT_CODE.NOOP).toBe(3);
        expect(RESULT_CODE.NOT_SUPPORTED).toBe(-3);
    });

    it('check extends result code', () => {
        expect(RESULT_CODE.ERROR_TEST_SUCCEEDED).toBe(221);
        expect(RESULT_CODE.ERROR_TEST_FAILED).toBe(-222);
    });

    it('check out of range', () => {
        expect(() => DECLARE_SUCCESS_CODE(RESULT_CODE_BASE.TEST, 0)).not.toThrow();
        expect(() => DECLARE_ERROR_CODE(RESULT_CODE_BASE.TEST, 999)).not.toThrow();
        expect(() => DECLARE_SUCCESS_CODE(RESULT_CODE_BASE.TEST, -1)).toThrow(new RangeError('declareResultCode(), invalid local-code range. [code: -1]'));
        expect(() => DECLARE_ERROR_CODE(RESULT_CODE_BASE.TEST, 1000)).toThrow(new RangeError('declareResultCode(), invalid local-code range. [code: 1000]'));
    });

    it('check extend result-code from other module', () => {
        expect(MERGED_RESULT_CODE.ERROR_TEST_SUCCEEDED).toBe(221);
        expect(MERGED_RESULT_CODE.ERROR_TEST_FAILED).toBe(-222);
        expect(MERGED_RESULT_CODE.MODULE_SUCCEEDED).toBe(500);
        expect(MERGED_RESULT_CODE.MODULE_FAILED).toBe(-500);

        expect(toNameString(MERGED_RESULT_CODE.ERROR_TEST_SUCCEEDED, 'test')).toBe('[test][ERROR_TEST_SUCCEEDED]');
        expect(toNameString(MERGED_RESULT_CODE.ERROR_TEST_FAILED)).toBe('[ERROR_TEST_FAILED]');
        expect(toNameString(MERGED_RESULT_CODE.MODULE_SUCCEEDED)).toBe('[MODULE_SUCCEEDED]');
        expect(toNameString(MERGED_RESULT_CODE.MODULE_FAILED, 'module')).toBe('[module][MODULE_FAILED]');

        expect(toHelpString(MERGED_RESULT_CODE.ERROR_TEST_SUCCEEDED)).toBe('test succeess result.');
        expect(toHelpString(MERGED_RESULT_CODE.ERROR_TEST_FAILED)).toBe('test failed result.');
        expect(toHelpString(MERGED_RESULT_CODE.MODULE_SUCCEEDED)).toBe('module succeess result.');
        expect(toHelpString(MERGED_RESULT_CODE.MODULE_FAILED)).toBe('module failed result.');
    });

    it('check success or not', () => {
        expect(SUCCEEDED(MERGED_RESULT_CODE.ERROR_TEST_SUCCEEDED)).toBe(true);
        expect(FAILED(MERGED_RESULT_CODE.ERROR_TEST_SUCCEEDED)).toBe(false);
        expect(SUCCEEDED(MERGED_RESULT_CODE.ERROR_TEST_FAILED)).toBe(false);
        expect(FAILED(MERGED_RESULT_CODE.ERROR_TEST_FAILED)).toBe(true);
        expect(SUCCEEDED(MERGED_RESULT_CODE.MODULE_SUCCEEDED)).toBe(true);
        expect(FAILED(MERGED_RESULT_CODE.MODULE_SUCCEEDED)).toBe(false);
        expect(SUCCEEDED(MERGED_RESULT_CODE.MODULE_FAILED)).toBe(false);
        expect(FAILED(MERGED_RESULT_CODE.MODULE_FAILED)).toBe(true);
    });

    it('check advanced', () => {
        expect(toNameString(9999, 'test')).toBe('[test][UNKNOWN]');
        expect(toNameString(9999)).toBe('[UNKNOWN]');
        expect(toHelpString(9999)).toBe('unregistered result code. [code: 9999]');
    });
});
