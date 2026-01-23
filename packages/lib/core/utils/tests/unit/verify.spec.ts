import { verify } from '@cdp/core-utils';

describe('utils/verify spec', () => {
    beforeEach(() => {
        // noop.
    });
    afterEach(() => {
        // noop.
    });

    class Foo {
        foo = {};
    }
    class Bar extends Foo {
        get bar(): object { return {}; }
    }
    class TypeClass extends Bar {
        public say(): string { return 'hello'; }
    }

    const _func = (): number => { return 1; };
    const _symbol = Symbol('symbol:type');
    const _classInst = new TypeClass();

    it(`check verify('notNullish')`, () => {
        expect(() => verify('notNullish', undefined)).toThrow(new TypeError('Undefined is not a valid value.'));
        expect(() => verify('notNullish', null)).toThrow(new TypeError('Null is not a valid value.'));
        expect(() => verify('notNullish', void 0)).toThrow(new TypeError('Undefined is not a valid value.'));
        expect(() => verify('notNullish', undefined, '`undefined` input')).toThrow(new TypeError('`undefined` input'));
        expect(() => verify('notNullish', null, null)).toThrow(new TypeError('Null is not a valid value.'));
        expect(() => verify('notNullish', '')).not.toThrow();
        expect(() => verify('notNullish', false)).not.toThrow();
        expect(() => verify('notNullish', 0)).not.toThrow();
        expect(() => verify('notNullish', NaN)).not.toThrow();
        expect(() => verify('notNullish', {})).not.toThrow();
        expect(() => verify('notNullish', [])).not.toThrow();
        expect(() => verify('notNullish', _func)).not.toThrow();
        expect(() => verify('notNullish', _symbol)).not.toThrow();
        expect(() => verify('notNullish', TypeClass)).not.toThrow();
        expect(() => verify('notNullish', _classInst)).not.toThrow();
    });

    it(`check verify('typeOf')`, () => {
        expect(() => verify('typeOf', 'string', undefined)).toThrow(new TypeError('Type of Undefined is not string.'));
        expect(() => verify('typeOf', 'string', void 0)).toThrow(new TypeError('Type of Undefined is not string.'));
        expect(() => verify('typeOf', 'string', null, '`null` is input')).toThrow(new TypeError('`null` is input'));
        expect(() => verify('typeOf', 'string', '', '`empty` is input')).not.toThrow();
        expect(() => verify('typeOf', 'string', false)).toThrow();
        expect(() => verify('typeOf', 'string', 0)).toThrow();
        expect(() => verify('typeOf', 'string', {})).toThrow();
        expect(() => verify('typeOf', 'string', [])).toThrow();
        expect(() => verify('typeOf', 'string', _func)).toThrow();
        expect(() => verify('typeOf', 'string', _symbol)).toThrow();
        expect(() => verify('typeOf', 'string', TypeClass)).toThrow();
        expect(() => verify('typeOf', 'string', _classInst)).toThrow();

        expect(() => verify('typeOf', 'number', undefined)).toThrow();
        expect(() => verify('typeOf', 'number', void 0)).toThrow();
        expect(() => verify('typeOf', 'number', null)).toThrow();
        expect(() => verify('typeOf', 'number', '')).toThrow();
        expect(() => verify('typeOf', 'number', false)).toThrow();
        expect(() => verify('typeOf', 'number', 0)).not.toThrow();
        expect(() => verify('typeOf', 'number', NaN)).not.toThrow();
        expect(() => verify('typeOf', 'number', {})).toThrow();
        expect(() => verify('typeOf', 'number', [])).toThrow();
        expect(() => verify('typeOf', 'number', _func)).toThrow();
        expect(() => verify('typeOf', 'number', _symbol)).toThrow();
        expect(() => verify('typeOf', 'number', TypeClass)).toThrow();
        expect(() => verify('typeOf', 'number', _classInst)).toThrow();

        expect(() => verify('typeOf', 'boolean', undefined)).toThrow();
        expect(() => verify('typeOf', 'boolean', void 0)).toThrow();
        expect(() => verify('typeOf', 'boolean', null)).toThrow();
        expect(() => verify('typeOf', 'boolean', '')).toThrow();
        expect(() => verify('typeOf', 'boolean', false)).not.toThrow();
        expect(() => verify('typeOf', 'boolean', 0)).toThrow();
        expect(() => verify('typeOf', 'boolean', NaN)).toThrow();
        expect(() => verify('typeOf', 'boolean', {})).toThrow();
        expect(() => verify('typeOf', 'boolean', [])).toThrow();
        expect(() => verify('typeOf', 'boolean', _func)).toThrow();
        expect(() => verify('typeOf', 'boolean', _symbol)).toThrow();
        expect(() => verify('typeOf', 'boolean', TypeClass)).toThrow();
        expect(() => verify('typeOf', 'boolean', _classInst)).toThrow();

        expect(() => verify('typeOf', 'symbol', undefined)).toThrow();
        expect(() => verify('typeOf', 'symbol', void 0)).toThrow();
        expect(() => verify('typeOf', 'symbol', null)).toThrow();
        expect(() => verify('typeOf', 'symbol', '')).toThrow();
        expect(() => verify('typeOf', 'symbol', false)).toThrow();
        expect(() => verify('typeOf', 'symbol', 0)).toThrow();
        expect(() => verify('typeOf', 'symbol', NaN)).toThrow();
        expect(() => verify('typeOf', 'symbol', {})).toThrow();
        expect(() => verify('typeOf', 'symbol', [])).toThrow();
        expect(() => verify('typeOf', 'symbol', _func)).toThrow();
        expect(() => verify('typeOf', 'symbol', _symbol)).not.toThrow();
        expect(() => verify('typeOf', 'symbol', TypeClass)).toThrow();
        expect(() => verify('typeOf', 'symbol', _classInst)).toThrow();

        expect(() => verify('typeOf', 'undefined', undefined)).not.toThrow();
        expect(() => verify('typeOf', 'undefined', void 0)).not.toThrow();
        expect(() => verify('typeOf', 'undefined', null)).toThrow();
        expect(() => verify('typeOf', 'undefined', '')).toThrow();
        expect(() => verify('typeOf', 'undefined', false)).toThrow();
        expect(() => verify('typeOf', 'undefined', 0)).toThrow();
        expect(() => verify('typeOf', 'undefined', NaN)).toThrow();
        expect(() => verify('typeOf', 'undefined', {})).toThrow();
        expect(() => verify('typeOf', 'undefined', [])).toThrow();
        expect(() => verify('typeOf', 'undefined', _func)).toThrow();
        expect(() => verify('typeOf', 'undefined', _symbol)).toThrow();
        expect(() => verify('typeOf', 'undefined', TypeClass)).toThrow();
        expect(() => verify('typeOf', 'undefined', _classInst)).toThrow();

        expect(() => verify('typeOf', 'object', undefined)).toThrow();
        expect(() => verify('typeOf', 'object', void 0)).toThrow();
        expect(() => verify('typeOf', 'object', null)).not.toThrow();
        expect(() => verify('typeOf', 'object', '')).toThrow();
        expect(() => verify('typeOf', 'object', false)).toThrow();
        expect(() => verify('typeOf', 'object', 0)).toThrow();
        expect(() => verify('typeOf', 'object', NaN)).toThrow();
        expect(() => verify('typeOf', 'object', {})).not.toThrow();
        expect(() => verify('typeOf', 'object', [])).not.toThrow();
        expect(() => verify('typeOf', 'object', _func)).toThrow();
        expect(() => verify('typeOf', 'object', _symbol)).toThrow();
        expect(() => verify('typeOf', 'object', TypeClass)).toThrow();
        expect(() => verify('typeOf', 'object', _classInst)).not.toThrow();

        expect(() => verify('typeOf', 'function', undefined)).toThrow();
        expect(() => verify('typeOf', 'function', void 0)).toThrow();
        expect(() => verify('typeOf', 'function', null)).toThrow();
        expect(() => verify('typeOf', 'function', '')).toThrow();
        expect(() => verify('typeOf', 'function', false)).toThrow();
        expect(() => verify('typeOf', 'function', 0)).toThrow();
        expect(() => verify('typeOf', 'function', NaN)).toThrow();
        expect(() => verify('typeOf', 'function', {})).toThrow();
        expect(() => verify('typeOf', 'function', [])).toThrow();
        expect(() => verify('typeOf', 'function', _func)).not.toThrow();
        expect(() => verify('typeOf', 'function', _symbol)).toThrow();
        expect(() => verify('typeOf', 'function', TypeClass)).not.toThrow();
        expect(() => verify('typeOf', 'function', _classInst)).toThrow();
    });

    it(`check verify('array')`, () => {
        expect(() => verify('array', undefined)).toThrow(new TypeError('Undefined is not an Array.'));
        expect(() => verify('array', null)).toThrow(new TypeError('Null is not an Array.'));
        expect(() => verify('array', void 0)).toThrow(new TypeError('Undefined is not an Array.'));
        expect(() => verify('array', undefined, '`undefined` input')).toThrow(new TypeError('`undefined` input'));
        expect(() => verify('array', null, null)).toThrow(new TypeError('Null is not an Array.'));
        expect(() => verify('array', '')).toThrow();
        expect(() => verify('array', false)).toThrow();
        expect(() => verify('array', 0)).toThrow();
        expect(() => verify('array', NaN)).toThrow();
        expect(() => verify('array', {})).toThrow();
        expect(() => verify('array', [])).not.toThrow();
        expect(() => verify('array', _func)).toThrow();
        expect(() => verify('array', _symbol)).toThrow();
        expect(() => verify('array', TypeClass)).toThrow();
        expect(() => verify('array', _classInst)).toThrow();
    });

    it(`check verify('iterable')`, () => {
        expect(() => verify('iterable', undefined)).toThrow(new TypeError('Undefined is not an iterable object.'));
        expect(() => verify('iterable', null)).toThrow(new TypeError('Null is not an iterable object.'));
        expect(() => verify('iterable', void 0)).toThrow(new TypeError('Undefined is not an iterable object.'));
        expect(() => verify('iterable', undefined, '`undefined` input')).toThrow(new TypeError('`undefined` input'));
        expect(() => verify('iterable', null, null)).toThrow(new TypeError('Null is not an iterable object.'));
        expect(() => verify('iterable', '')).not.toThrow();
        expect(() => verify('iterable', false)).toThrow();
        expect(() => verify('iterable', 0)).toThrow();
        expect(() => verify('iterable', NaN)).toThrow();
        expect(() => verify('iterable', {})).toThrow();
        expect(() => verify('iterable', [])).not.toThrow();
        expect(() => verify('iterable', _func)).toThrow();
        expect(() => verify('iterable', _symbol)).toThrow();
        expect(() => verify('iterable', TypeClass)).toThrow();
        expect(() => verify('iterable', _classInst)).toThrow();
    });

    it(`check verify('instanceOf')`, () => {
        expect(() => verify('instanceOf', Object, undefined)).toThrow(new TypeError('Undefined is not an instance of Object.'));
        expect(() => verify('instanceOf', Object, null)).toThrow(new TypeError('Null is not an instance of Object.'));
        expect(() => verify('instanceOf', Object, void 0)).toThrow(new TypeError('Undefined is not an instance of Object.'));
        expect(() => verify('instanceOf', Object, undefined, '`undefined` input')).toThrow(new TypeError('`undefined` input'));
        expect(() => verify('instanceOf', Object, null, null)).toThrow(new TypeError('Null is not an instance of Object.'));
        expect(() => verify('instanceOf', Object, '')).toThrow();
        expect(() => verify('instanceOf', Object, false)).toThrow();
        expect(() => verify('instanceOf', Object, 0)).toThrow();
        expect(() => verify('instanceOf', Object, NaN)).toThrow();
        expect(() => verify('instanceOf', Object, {})).not.toThrow();
        expect(() => verify('instanceOf', Object, [])).not.toThrow();
        expect(() => verify('instanceOf', Array, [])).not.toThrow();
        expect(() => verify('instanceOf', Object, _func)).not.toThrow();
        expect(() => verify('instanceOf', Object, _symbol)).toThrow();
        expect(() => verify('instanceOf', Object, TypeClass)).not.toThrow();
        expect(() => verify('instanceOf', Object, _classInst)).not.toThrow();
        expect(() => verify('instanceOf', TypeClass, _classInst)).not.toThrow();
    });

    it(`check verify('ownInstanceOf')`, () => {
        expect(() => verify('ownInstanceOf', Object, undefined)).toThrow(new TypeError('The object is not own instance of Object.'));
        expect(() => verify('ownInstanceOf', Object, undefined, '`undefined` input')).toThrow(new TypeError('`undefined` input'));
        expect(() => verify('ownInstanceOf', Object, null, null)).toThrow(new TypeError('The object is not own instance of Object.'));
        expect(() => verify('ownInstanceOf', Object, {})).not.toThrow();
        expect(() => verify('ownInstanceOf', Object, [])).toThrow();
        expect(() => verify('ownInstanceOf', Array, [])).not.toThrow();
        expect(() => verify('ownInstanceOf', Object, _func)).toThrow();
        expect(() => verify('ownInstanceOf', Object, TypeClass)).toThrow();
        expect(() => verify('ownInstanceOf', Object, _classInst)).toThrow();
        expect(() => verify('ownInstanceOf', TypeClass, _classInst)).not.toThrow();
    });

    it(`check verify('notOwnInstanceOf')`, () => {
        expect(() => verify('notOwnInstanceOf', Object, undefined)).not.toThrow();
        expect(() => verify('notOwnInstanceOf', Object, null)).not.toThrow();
        expect(() => verify('notOwnInstanceOf', Object, {})).toThrow();
        expect(() => verify('notOwnInstanceOf', Object, [])).not.toThrow();
        expect(() => verify('notOwnInstanceOf', Array, [], 'array is array')).toThrow(new TypeError('array is array'));
        expect(() => verify('notOwnInstanceOf', Object, _func)).not.toThrow();
        expect(() => verify('notOwnInstanceOf', Object, TypeClass)).not.toThrow();
        expect(() => verify('notOwnInstanceOf', Object, _classInst)).not.toThrow();
        expect(() => verify('notOwnInstanceOf', TypeClass, _classInst, null)).toThrow(new TypeError('The object is own instance of TypeClass.'));
    });

    it(`check verify('hasProperty')`, () => {
        expect(() => verify('hasProperty', _classInst, 'foo')).not.toThrow();
        expect(() => verify('hasProperty', _classInst, 'bar')).not.toThrow();
        expect(() => verify('hasProperty', _classInst, 'say')).not.toThrow();
        expect(() => verify('hasProperty', _classInst, 'baz')).toThrow(new TypeError('The object does not have property baz.'));
    });

    it(`check verify('hasOwnProperty')`, () => {
        expect(() => verify('hasOwnProperty', _classInst, 'foo')).not.toThrow();
        expect(() => verify('hasOwnProperty', _classInst, 'bar')).toThrow(new TypeError('The object does not have own property bar.'));
        expect(() => verify('hasOwnProperty', _classInst, 'say', null)).toThrow(new TypeError('The object does not have own property say.'));
        expect(() => verify('hasOwnProperty', _classInst, 'baz', 'hoge')).toThrow(new TypeError('hoge'));
    });
});
