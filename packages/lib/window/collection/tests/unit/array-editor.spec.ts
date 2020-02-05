import { ObservableArray } from '@cdp/observable';
import { RESULT_CODE } from '@cdp/result';
import {
    clearArray,
    appendArray,
    insertArray,
    reorderArray,
    removeArray,
} from '@cdp/collection';

describe('utils/array-editor spec', () => {
    let array: string[];
    let observable: ObservableArray<string>;

    beforeEach(() => {
        array = ['A', 'B', 'C', 'D', 'E'];
        observable = ObservableArray.from(array);
    });

    it('check clearArray()', async done => {
        let ret = await clearArray(array);

        expect(array.length).toBe(0);
        expect(ret.length).toBe(5);
        expect(ret[0].newValue).toBeFalsy();
        expect(ret[1].newValue).toBeFalsy();
//      console.log(`${JSON.stringify(ret)}`);

        ret = await clearArray(observable);

        expect(array.length).toBe(0);
        expect(ret.length).toBe(5);
        expect(ret[0].newValue).toBeFalsy();
        expect(ret[1].newValue).toBeFalsy();


        ret = await clearArray([]);

        expect(array.length).toBe(0);
        expect(ret.length).toBe(0);

        done();
    });

    it('check appendArray()', async done => {
        let ret = await appendArray(array, ['E', 'F']);

        expect(array.length).toBe(7);
        expect(ret.length).toBe(2);
        expect(ret[0].index).toBe(5);
        expect(ret[0].newValue).toBe('E');
        expect(ret[1].index).toBe(6);
        expect(ret[1].newValue).toBe('F');
        expect(array).toEqual(['A', 'B', 'C', 'D', 'E', 'E', 'F']);
//      console.log(`${JSON.stringify(ret)}`);

        ret = await appendArray(observable, ['E', 'F']);

        expect(observable.length).toBe(7);
        expect(ret.length).toBe(2);
        expect(ret[0].index).toBe(5);
        expect(ret[0].newValue).toBe('E');
        expect(ret[1].index).toBe(6);
        expect(ret[1].newValue).toBe('F');
        expect(observable).toEqual(['A', 'B', 'C', 'D', 'E', 'E', 'F']);

        ret = await appendArray(observable, []);
        expect(ret.length).toBe(0);

        done();
    });

    it('check insertArray()', async done => {
        let ret = await insertArray(array, 3, ['E', 'F']);

        expect(array.length).toBe(7);
        expect(ret.length).toBe(2);
        expect(ret[0].index).toBe(3);
        expect(ret[0].newValue).toBe('E');
        expect(ret[1].index).toBe(4);
        expect(ret[1].newValue).toBe('F');
        expect(array).toEqual(['A', 'B', 'C', 'E', 'F', 'D', 'E']);
//      console.log(`${JSON.stringify(ret)}`);

        ret = await insertArray(observable, 3, ['E', 'F']);

        expect(observable.length).toBe(7);
        expect(ret.length).toBe(2);
        expect(ret[0].index).toBe(3);
        expect(ret[0].newValue).toBe('E');
        expect(ret[1].index).toBe(4);
        expect(ret[1].newValue).toBe('F');
        expect(observable).toEqual(['A', 'B', 'C', 'E', 'F', 'D', 'E']);

        ret = await insertArray(array, 2, []);
        expect(ret.length).toBe(0);

        try {
            await insertArray(array, 2.5, []);
            expect('UNEXPECTED FLOW').toBeNull();
        } catch (e) {
            expect(e.code).toBe(RESULT_CODE.NOT_SUPPORTED);
            expect(e.message).toBe('insertArray(), index is invalid. index: 2.5');
        }

        done();
    });

    it('check reorderArray()', async done => {
        let ret = await reorderArray(array, 2, [3, 1, 4]);

        expect(array.length).toBe(5);
        expect(ret.length).toBe(4);
        expect(array).toEqual(['A', 'D', 'B', 'E', 'C']);
//      console.log(`${JSON.stringify(ret)}`);

        ret = await reorderArray(observable, 2, [3, 1, 4]);

        expect(observable.length).toBe(5);
        expect(ret.length).toBe(4);
        expect(observable).toEqual(['A', 'D', 'B', 'E', 'C']);

        ret = await reorderArray(array, 2, []);
        expect(ret.length).toBe(0);

        try {
            await reorderArray(array, 2.5, []);
            expect('UNEXPECTED FLOW').toBeNull();
        } catch (e) {
            expect(e.code).toBe(RESULT_CODE.NOT_SUPPORTED);
            expect(e.message).toBe('insertArray(), index is invalid. index: 2.5');
        }

        done();
    });

    it('check removeArray()', async done => {
        let ret = await removeArray(array, [2, 1, 3]);

        expect(array.length).toBe(2);
        expect(ret.length).toBe(3);
        expect(ret[0].newValue).toBeFalsy();
        expect(ret[1].newValue).toBeFalsy();
        expect(array).toEqual(['A', 'E']);
//      console.log(`${JSON.stringify(ret)}`);

        ret = await removeArray(observable, [2, 1, 3]);

        expect(observable.length).toBe(2);
        expect(ret.length).toBe(3);
        expect(ret[0].newValue).toBeFalsy();
        expect(ret[1].newValue).toBeFalsy();
        expect(observable).toEqual(['A', 'E']);

        ret = await removeArray(array, []);
        expect(ret.length).toBe(0);

        done();
    });

    it('check illegal input', async done => {
        try {
            await clearArray({} as any); // eslint-disable-line
            expect('UNEXPECTED FLOW').toBeNull();
        } catch (e) {
            expect(e.code).toBe(RESULT_CODE.NOT_SUPPORTED);
            expect(e.message).toBe('target is not Array or ObservableArray.');
        }
        done();
    });
});
