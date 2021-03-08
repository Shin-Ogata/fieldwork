/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { mixins, setMixClassAttribute } from '@cdp/core-utils';
import {
    Result,
    RESULT_CODE,
    makeResult,
    makeCanceledResult,
    isResult,
    toResult,
} from '@cdp/result';

describe('result/result spec', () => {
    it('check Result#code is readonly', () => {
        const result = new Result();
        expect(() => (result as any).code = Math.random()).toThrow();
        expect(result.code).toBe(RESULT_CODE.SUCCESS);
    });

    it('check Result#cause is readonly', () => {
        const cause = new Error('cause');
        const result = new Result(undefined, undefined, cause);
        expect(() => (result as any).cause = null).toThrow();
        expect(result.cause).toBe(cause);
    });

    it('check Result#time is readonly', () => {
        const result = new Result();
        const { time } = result;
        expect(() => (result as any).time = Math.random()).toThrow();
        expect(result.time).toBe(time);
    });

    it('check Result#toString() starts with "Result"', () => {
        const result = new Result();
        expect(result.toString().startsWith('Result')).toBe(true);
        expect(result.toString()).toBe('Result: operation succeeded.');
    });

    it('check Result#isSucceeded', () => {
        const result1 = makeResult(RESULT_CODE.SUCCESS);
        const result2 = makeResult(RESULT_CODE.ABORT);
        const result3 = makeResult(RESULT_CODE.PENDING);
        const result4 = makeResult(RESULT_CODE.NOOP);
        const result5 = makeResult(RESULT_CODE.FAIL);
        const result6 = makeResult(RESULT_CODE.FATAL);
        const result7 = makeResult(RESULT_CODE.NOT_SUPPORTED);
        const result8 = makeResult(RESULT_CODE.ERROR_TEST_SUCCEEDED);
        const result9 = makeResult(RESULT_CODE.ERROR_TEST_FAILED);
        expect(result1.isSucceeded).toBe(true);
        expect(result2.isSucceeded).toBe(true);
        expect(result3.isSucceeded).toBe(true);
        expect(result4.isSucceeded).toBe(true);
        expect(result5.isSucceeded).toBe(false);
        expect(result6.isSucceeded).toBe(false);
        expect(result7.isSucceeded).toBe(false);
        expect(result8.isSucceeded).toBe(true);
        expect(result9.isSucceeded).toBe(false);
    });

    it('check Result#isFailed', () => {
        const result1 = makeResult(RESULT_CODE.SUCCESS);
        const result2 = makeResult(RESULT_CODE.ABORT);
        const result3 = makeResult(RESULT_CODE.PENDING);
        const result4 = makeResult(RESULT_CODE.NOOP);
        const result5 = makeResult(RESULT_CODE.FAIL);
        const result6 = makeResult(RESULT_CODE.FATAL);
        const result7 = makeResult(RESULT_CODE.NOT_SUPPORTED);
        const result8 = makeResult(RESULT_CODE.ERROR_TEST_SUCCEEDED);
        const result9 = makeResult(RESULT_CODE.ERROR_TEST_FAILED);
        expect(result1.isFailed).toBe(false);
        expect(result2.isFailed).toBe(false);
        expect(result3.isFailed).toBe(false);
        expect(result4.isFailed).toBe(false);
        expect(result5.isFailed).toBe(true);
        expect(result6.isFailed).toBe(true);
        expect(result7.isFailed).toBe(true);
        expect(result8.isFailed).toBe(false);
        expect(result9.isFailed).toBe(true);
    });

    it('check Result#isCanceled', () => {
        const result1 = makeCanceledResult('TEST Cancel Result');
        const result2 = makeResult(RESULT_CODE.PENDING, 'TEST Pending Result');
        expect(result1.isCanceled).toBe(true);
        expect(result2.isCanceled).toBe(false);
    });

    it('check Result#codeName', () => {
        const result1 = makeResult(RESULT_CODE.SUCCESS);
        const result2 = makeResult(RESULT_CODE.ABORT);
        const result3 = makeResult(RESULT_CODE.PENDING);
        const result4 = makeResult(RESULT_CODE.NOOP);
        const result5 = makeResult(RESULT_CODE.FAIL);
        const result6 = makeResult(RESULT_CODE.FATAL);
        const result7 = makeResult(RESULT_CODE.NOT_SUPPORTED);
        const result8 = makeResult(RESULT_CODE.ERROR_TEST_SUCCEEDED);
        const result9 = makeResult(RESULT_CODE.ERROR_TEST_FAILED);
        expect(result1.codeName).toBe('[Result][SUCCESS]');
        expect(result2.codeName).toBe('[Result][ABORT]');
        expect(result3.codeName).toBe('[Result][PENDING]');
        expect(result4.codeName).toBe('[Result][NOOP]');
        expect(result5.codeName).toBe('[Result][FAIL]');
        expect(result6.codeName).toBe('[Result][FATAL]');
        expect(result7.codeName).toBe('[Result][NOT_SUPPORTED]');
        expect(result8.codeName).toBe('[Result][ERROR_TEST_SUCCEEDED]');
        expect(result9.codeName).toBe('[Result][ERROR_TEST_FAILED]');
    });

    it('check Result#help', () => {
        const result1 = makeResult(RESULT_CODE.SUCCESS);
        const result2 = makeResult(RESULT_CODE.ABORT);
        const result3 = makeResult(RESULT_CODE.PENDING);
        const result4 = makeResult(RESULT_CODE.NOOP);
        const result5 = makeResult(RESULT_CODE.FAIL);
        const result6 = makeResult(RESULT_CODE.FATAL);
        const result7 = makeResult(RESULT_CODE.NOT_SUPPORTED);
        const result8 = makeResult(RESULT_CODE.ERROR_TEST_SUCCEEDED);
        const result9 = makeResult(RESULT_CODE.ERROR_TEST_FAILED);
        expect(result1.help).toBe('operation succeeded.');
        expect(result2.help).toBe('operation aborted.');
        expect(result3.help).toBe('operation pending.');
        expect(result4.help).toBe('no operation.');
        expect(result5.help).toBe('operation failed.');
        expect(result6.help).toBe('unexpected error occured.');
        expect(result7.help).toBe('operation not supported.');
        expect(result8.help).toBe('test succeess result.');
        expect(result9.help).toBe('test failed result.');
    });

    it('check isResult', () => {
        const error = new Error();
        const result = new Result();
        expect(isResult(error)).toBe(false);
        expect(isResult(result)).toBe(true);
    });

    it('check toResult() returns instance of Result', () => {
        const target = toResult(null);
        expect(isResult(target)).toBe(true);
    });

    it('check toResult() holds cause Error info', () => {
        const cause = new Error('cause');
        const target = toResult(cause);
        expect(target.cause).toBe(cause);
        expect(isResult(target)).toBe(true);

        const target2 = toResult('error');
        expect(target2.message).toBe('error');
        expect(target2.cause instanceof Error).toBe(true);
        expect(target2.cause.message).toBe('error');
        expect(isResult(target2)).toBe(true);

        const target3 = toResult(8888);
        expect(target3.code).toBe(8888);
        expect(target3.cause).toBe(8888);
        expect(isResult(target3)).toBe(true);

        const target4 = toResult({ ...target });
        expect(target4.cause).toBe(cause);
        expect(isResult(target4)).toBe(true);
    });

    it('check toResult() from cancel like', () => {
        const e1 = new Error('abort');
        const e2 = new Error('Abort');
        const e3 = new Error('cancel');
        const e4 = new Error('Cancel');
        const e5 = new Error('ABORT operation');
        const e6 = new Error('Cancel operation');
        const e7 = new Error('operation aborted.');

        let target = toResult(e1);
        expect(target.code).toBe(RESULT_CODE.ABORT);
        expect(target.cause).toBe(e1);
        target = toResult(e2);
        expect(target.code).toBe(RESULT_CODE.ABORT);
        expect(target.cause).toBe(e2);
        target = toResult(e3);
        expect(target.code).toBe(RESULT_CODE.ABORT);
        expect(target.cause).toBe(e3);
        target = toResult(e4);
        expect(target.code).toBe(RESULT_CODE.ABORT);
        expect(target.cause).toBe(e4);
        target = toResult(e5);
        expect(target.code).toBe(RESULT_CODE.ABORT);
        expect(target.cause).toBe(e5);
        target = toResult(e6);
        expect(target.code).toBe(RESULT_CODE.ABORT);
        expect(target.cause).toBe(e6);
        target = toResult(e7);
        expect(target.code).toBe(RESULT_CODE.ABORT);
        expect(target.cause).toBe(e7);
    });

    it('check toResult() do nothing if input Result', () => {
        const result = new Result();
        const target = toResult(result);
        expect(target).toBe(result);
    });

    it('check advanced', () => {
        class Base { }
        class EmulateFromAnotherGlobalResult extends mixins(Base, Result) { }
        class EmulateFromAnotherGlobalResult2 extends mixins(Base, Result) {
            constructor() {
                super();
                Object.defineProperty(this, 'code', { enumerable: true, value: '0' });
            }
        }
        setMixClassAttribute(Result, 'instanceOf');

        const emulate1 = new EmulateFromAnotherGlobalResult();
        expect(isResult(emulate1)).toBe(true);
        const special1 = toResult(emulate1);
        expect(special1).toBe(emulate1 as any);

        const emulate2 = new EmulateFromAnotherGlobalResult2();
        const special2 = toResult(emulate2);
        expect(special2).toBe(emulate2 as any);
    });
});
