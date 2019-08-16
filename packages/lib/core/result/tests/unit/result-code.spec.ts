import { ResultCode } from '@cdp/result';

describe('result/result-code spec', () => {
    it('check default result code', () => {
        expect(ResultCode.SUCCEEDED).toBe(0);
        expect(ResultCode.FAILED).toBe(-1);
        expect(ResultCode.ABORTED).toBe(1);
        expect(ResultCode.FATAL).toBe(-2);
        expect(ResultCode.PENDING).toBe(2);
        expect(ResultCode.NOT_SUPPORTED).toBe(-3);
    });
});
