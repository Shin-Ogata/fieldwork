/* eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-non-null-assertion,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/no-namespace,
 */

import {
    assignValue,
    deepEqual,
    deepMerge,
    deepCopy,
} from '@cdp/core-utils';

namespace Test {
    export class ClassA {
        constructor(private _hoge?: string) { }
    }
    export class ClassB {
        constructor(private _hoge?: string) { }
    }
    export class ClassC {
        constructor(private _hoge?: string, private _fuga?: string) { }
    }
}

describe('utils/deep-circuit spec', () => {

    const number = 0.8808766710170797;
    const string = number.toString(36);
    const boolean = number < 0.5;
    const date1 = new Date();
    const date2 = new Date(date1);
    const regExp1 = /^$/;
    const regExp2 = new RegExp(regExp1);
    const symbol = Symbol();
    const array1 = [number, string, boolean, date1, regExp1, symbol];
    const array2 = [number, string, boolean, date2, regExp2, symbol];
    const array3 = [...array1.slice(0, -1), Symbol()];
    const array4 = [...array1.slice(0, -1)];
    const buf1 = new Uint16Array([...string].map(c => c.codePointAt(0)!)).buffer;
    const buf2 = new Uint16Array([...string].map(c => c.codePointAt(0)!)).buffer;
    const view1 = new DataView(buf1);
    const view2 = new DataView(buf2);
    const object1 = { number, string, boolean, date: date1, regExp: regExp1, symbol, array: array1, buf: buf1, view: view1 };
    const object2 = { array: array2, symbol, regExp: regExp2, date: date2, view: view2, boolean, string, number, buf: buf2 };
    const object3 = { number, string, boolean, date: date2, regExp: regExp2, symbol, array: array3, buf: buf1, view: view1 };

    function func(): null { return null; }

    it('check deepEqual()', () => {
        // basic
        const obj1 = { func(): null { return null; } };
        const obj2 = { func(a: string): null { return null; } };
        expect(deepEqual(object1, object2)).toBe(true);
        expect(deepEqual(object1, object3)).toBe(false);
        expect(deepEqual(func, obj1.func)).toBe(true);      // eslint-disable-line
        expect(deepEqual(func, obj2.func)).toBe(false);     // eslint-disable-line
        expect(deepEqual(array1, array4)).toBe(false);
        expect(deepEqual(new Date(0), new Date(0))).toBe(true);

        // buffer
        const buf = new Uint16Array([Number(100).toString(36)].map(c => c.codePointAt(0)!)).buffer;
        const bufBig = new Float64Array([Number(100).toString(36)].map(c => c.codePointAt(0)!)).buffer;
        const bufMid = new Uint32Array([Number(100).toString(36)].map(c => c.codePointAt(0)!)).buffer;
        const bufSmall = new Uint8Array([Number(100).toString(36)].map(c => c.codePointAt(0)!)).buffer;
        expect(deepEqual(buf, new Uint16Array([Number(1000).toString(36)].map(c => c.codePointAt(0)!)).buffer)).toBe(false);
        expect(deepEqual(buf, new Uint16Array([Number(100).toString(16)].map(c => c.codePointAt(0)!)).buffer)).toBe(false);
        expect(deepEqual(buf, bufSmall)).toBe(false);
        expect(deepEqual(bufBig, new Float64Array([Number(1000).toString(36)].map(c => c.codePointAt(0)!)).buffer)).toBe(false);
        expect(deepEqual(new Uint8Array([]).buffer, new Uint8Array([]).buffer)).toBe(true);
        expect(deepEqual(bufMid, new Uint32Array([Number(100).toString(36)].map(c => c.codePointAt(0)!)).buffer)).toBe(true);
        expect(deepEqual(bufMid, new Uint32Array([Number(1000).toString(36)].map(c => c.codePointAt(0)!)).buffer)).toBe(false);
        expect(deepEqual(bufSmall, new Uint8Array([Number(100).toString(36)].map(c => c.codePointAt(0)!)).buffer)).toBe(true);
        expect(deepEqual(bufSmall, new Uint8Array([Number(1000).toString(36)].map(c => c.codePointAt(0)!)).buffer)).toBe(false);

        // iterable
        const iterSet = new Set([1, 2, 3, 4]);
        expect(deepEqual(iterSet, new Set([1, 2, 3, 4]))).toBe(true);
        expect(deepEqual(iterSet, [1, 2, 3, 4])).toBe(false);

        // class
        class ClassA {
            constructor(public _hoge?: string) { }
        }
        class ClassB { }
        class ClassC {
            constructor(private _hoge?: string, private _baz?: string) { }
        }
        const classA = new ClassA();
        const classB = new ClassB();
        const classC = new ClassC();
        expect(deepEqual(classA, new ClassA())).toBe(true);
        expect(deepEqual(classA, new ClassA('hoge'))).toBe(false);
        expect(deepEqual(classA, new Test.ClassA())).toBe(true);
        expect(deepEqual(classB, new Test.ClassB())).toBe(false);
        expect(deepEqual(classC, new Test.ClassC())).toBe(false);
        const classAA = new ClassA();
        (classAA as any)._prop = true;
        expect(deepEqual(classA, classAA)).toBe(false);
        const classAAA = new ClassA();
        (classAAA as any)._method = null;
        expect(deepEqual(classAA, classAAA)).toBe(false);
        expect(deepEqual(new ClassA('hoge'), new Test.ClassA('fuga'))).toBe(false);
    });

    it('check deepMerge()', () => {
        // basic
        const shallow = { ...object1, ...object3 };
        const deep = deepMerge({}, object1, object3);
        expect(shallow.array).toEqual(array3);
        expect(shallow.date).toEqual(date2);
        expect(deep.array).toEqual(array3);
        expect(deep.date).toEqual(date1);
        expect(deepEqual(deep.array, array3)).toBe(true);

        // undefined ref key
        const undefRef = deepMerge({}, { ref: undefined });
        expect('ref' in undefRef).toBe(true);

        // set
        const setA = new Set([{ a: 'a1', b: 100 }, { a: 'a2', b: 200 }]);
        const setB = new Set([{ c: 'c1', d: 300 }, { c: 'c2', d: 400 }]);
        const setDeep = deepMerge(setA, setB);
        expect(setDeep.size).toBe(4);
        expect([...setDeep.values()][3] as any).toEqual({ c: 'c2', d: 400 });

        // map
        const mapA = new Map([['key', { a: 'a1', b: 100 }]]);
        const mapB = new Map([['key', { c: 'c1', d: 300 }], ['mmm', { c: 'c2', d: 400 }]]);
        const mapDeep = deepMerge<Map<string, { a: string; b: number; c: string; d: number; }>>(mapA, mapB);
        expect(mapDeep.size).toBe(2);
        expect(mapDeep.get('key')).toEqual({ a: 'a1', b: 100, c: 'c1', d: 300 });
    });

    it('check deepCopy()', () => {
        // basic
        const copiedObj = deepCopy(object1);
        expect(copiedObj === object1).toBe(false);
        expect(deepEqual(copiedObj, object1)).toBe(true);

        // set, map, typedarray
        const obj = {
            set: new Set([{ a: 'a1', b: 100 }, { a: 'a2', b: 200 }]),
            map: new Map([['key', { c: 'c1', d: 300 }], ['mmm', { c: 'c2', d: 400 }]]),
            typedArray: new Uint8Array(8),
        };
        const copied = deepCopy(obj);
        expect(copied === obj).toBe(false);
        expect(deepEqual(copied, obj)).toBe(true);
    });

    it('check without polluting the prototype', () => {
        /*
         * Prototype Pollution 攻撃
         *
         * 参考
         * - NPM lodash
         *   https://www.npmjs.com/advisories/1523
         * - i18next の対応
         *   https://github.com/i18next/i18next/pull/1482/files
         * - 日本語解説
         *   https://jovi0608.hatenablog.com/entry/2018/10/19/083725
         */
        const maliciousPayload = '{"__proto__":{"vulnerable":"Polluted"}}';
        deepMerge({}, JSON.parse(maliciousPayload));
        expect(({} as any).vulnerable).toBeUndefined();

        deepMerge(Number, JSON.parse(maliciousPayload));
        expect((Number as any).vulnerable).toBeUndefined();

        const obj = { aaa: 'aaa' };
        assignValue(obj, '__proto__', { vulnerable: 'Polluted' });
        expect(obj).toEqual({ aaa: 'aaa' });

        /*
         * - Qiita (JS)絶対にDeep Mergeを自力で実装しないでください
         *   https://qiita.com/apple502j/items/89a8c7da38932b2b3cbb
         */
        const maliciousObject = {
            '__proto__': { 'isAdmin': 1 },
            'constructor': { 'prototype': { 'isAdmin': 1 } }
        };
        deepMerge({}, maliciousObject);
        expect((Object.prototype as any).isAdmin).toBeUndefined();
    });
});
