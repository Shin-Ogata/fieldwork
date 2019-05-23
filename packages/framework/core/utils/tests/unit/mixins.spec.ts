import { mixins, setInstanceOf } from '@cdp/core-utils';

describe('utils/mixins spec', () => {
    beforeEach(() => {
        // noop.
    });
    afterEach(() => {
        // noop.
    });

    class ClassA {
        private _aName: string;
        private _aId: number;
        constructor(id: number, name: string) {
            this._aId = id;
            this._aName = name;
        }
        public get id(): number { return this._aId; }
        public get aName(): string { return this._aName; }
        public get aId(): number { return this._aId; }
        public sayHello(): string { return this._aName; }
        public getAID(): string { return `${this._aName}:${this.aId}`; }
    }

    class ClassB {
        private _bName: string;
        private _bId: number;
        constructor(id: number, name: string) {
            this._bId = id;
            this._bName = name;
        }
        public get id(): number { return this._bId; }
        public get bName(): string { return this._bName; }
        public get bId(): number { return this._bId; }
        public sayHello(): string { return this._bName; }
        public getBID(): string { return `${this._bName}:${this._bId}`; }
    }

    class ClassC {
        private _cName: string;
        private _cAlias: string;
        private _cId: number;
        constructor(id: number, name: string, alias: string) {
            this._cId = id;
            this._cName = name;
            this._cAlias = alias;
        }
        public get cName(): string { return this._cName; }
        public get cId(): number { return this._cId; }
        public sayHello(): string { return this._cName; }
        public getCID(): string { return `${this._cName}:${this._cId}:${this._cAlias}`; }
    }

    class ClassD extends ClassA {
        private _dAlias: string;
        constructor(id: number, name: string, alias: string) {
            super(id, name);
            this._dAlias = alias;
        }
        public get dName(): string { return this.aName; }
        public get dId(): number { return this.aId; }
        public sayHello(): string { return this.aName; }
        public getDID(): string { return `${this.aName}:${this.aId}:${this._dAlias}`; }
    }

    class ClassE extends ClassA {
        // no-extends
    }

    class MixinAB extends mixins(ClassA, ClassB) {
        constructor(aId: number, bId: number, aName: string, bName: string) {
            super(aId, aName);
            this.construct(ClassB, bId, bName);
        }
        public sum(): number {
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            return this.aId + this.bId;
        }
    }

    class MixinBA extends mixins(ClassB, ClassA) {
        constructor(aId: number, bId: number, aName: string, bName: string) {
            super(bId, bName);
            this.construct(ClassA, aId, aName);
        }
        public sum(): number {
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            return this.aId + this.bId;
        }
    }

    class MixinBD extends mixins(ClassB, ClassD) {
        constructor(bId: number, dId: number, bName: string, dName: string, dAlias: string) {
            super(bId, bName);
            this.construct(ClassD, dId, dName, dAlias);
        }
        public sum(): number {
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            return this.aId + this.bId;
        }
    }

    class MixinCAB extends mixins(ClassC, ClassB, ClassA) {
        constructor(aId: number, bId: number, cId: number, aName: string, bName: string, cName: string) {
            super(cId, cName, 'ailias:C');
            this.construct(ClassA, aId, aName);
            this.construct(ClassB, bId, bName);
        }
        public sum(): number {
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            return this.aId + this.bId + this.cId;
        }
    }

    const mixAB = new MixinAB(0xA, 0xB, 'A', 'B');
    const mixBA = new MixinBA(0xA, 0xB, 'A', 'B');
    const mixBD = new MixinBD(0xB, 0xD, 'B', 'D', 'ailias:D');
    const mixCAB = new MixinCAB(0xA, 0xB, 0xC, 'A', 'B', 'C');

    it('check basic', () => {
        expect(mixAB.aId).toBe(0xA);
        expect(mixAB.aName).toBe('A');
        expect(mixAB.bId).toBe(0xB);
        expect(mixAB.bName).toBe('B');
        expect(mixAB.sayHello()).toBe('A');
        expect(mixAB.sum()).toBe(0xA + 0xB);

        expect(mixBA.aId).toBe(0xA);
        expect(mixBA.aName).toBe('A');
        expect(mixBA.bId).toBe(0xB);
        expect(mixBA.bName).toBe('B');
        expect(mixBA.sayHello()).toBe('B');
        expect(mixBA.sum()).toBe(0xA + 0xB);

        expect(mixBD.aId).toBe(0xD);
        expect(mixBD.aName).toBe('D');
        expect(mixBD.bId).toBe(0xB);
        expect(mixBD.bName).toBe('B');
        expect(mixBD.sayHello()).toBe('B');
        expect(mixBD.sum()).toBe(0xB + 0xD);

        expect(mixCAB.aId).toBe(0xA);
        expect(mixCAB.aName).toBe('A');
        expect(mixCAB.bId).toBe(0xB);
        expect(mixCAB.bName).toBe('B');
        expect(mixCAB.cId).toBe(0xC);
        expect(mixCAB.cName).toBe('C');
        expect(mixCAB.sayHello()).toBe('C');
        expect(mixCAB.sum()).toBe(0xA + 0xB + 0xC);
    });

    it('check isMixedWith()', () => {
        expect(mixAB.isMixedWith(MixinAB)).toBeFalsy();
        expect(mixAB.isMixedWith(MixinBA)).toBeFalsy();
        expect(mixAB.isMixedWith(MixinBD)).toBeFalsy();
        expect(mixAB.isMixedWith(MixinCAB)).toBeFalsy();
        expect(mixAB.isMixedWith(ClassA)).toBeTruthy();
        expect(mixAB.isMixedWith(ClassB)).toBeTruthy();
        expect(mixAB.isMixedWith(ClassC)).toBeFalsy();
        expect(mixAB.isMixedWith(ClassD)).toBeFalsy();
        expect(mixAB.isMixedWith(ClassE)).toBeFalsy();

        expect(mixBA.isMixedWith(MixinAB)).toBeFalsy();
        expect(mixBA.isMixedWith(MixinBA)).toBeFalsy();
        expect(mixBA.isMixedWith(MixinBD)).toBeFalsy();
        expect(mixBA.isMixedWith(MixinCAB)).toBeFalsy();
        expect(mixBA.isMixedWith(ClassA)).toBeTruthy();
        expect(mixBA.isMixedWith(ClassB)).toBeTruthy();
        expect(mixBA.isMixedWith(ClassC)).toBeFalsy();
        expect(mixBA.isMixedWith(ClassD)).toBeFalsy();
        expect(mixBA.isMixedWith(ClassE)).toBeFalsy();

        expect(mixBD.isMixedWith(MixinAB)).toBeFalsy();
        expect(mixBD.isMixedWith(MixinBA)).toBeFalsy();
        expect(mixBD.isMixedWith(MixinBD)).toBeFalsy();
        expect(mixBD.isMixedWith(MixinCAB)).toBeFalsy();
        expect(mixBD.isMixedWith(ClassA)).toBeFalsy();
        expect(mixBD.isMixedWith(ClassB)).toBeTruthy();
        expect(mixBD.isMixedWith(ClassC)).toBeFalsy();
        expect(mixBD.isMixedWith(ClassD)).toBeTruthy();
        expect(mixBD.isMixedWith(ClassE)).toBeFalsy();

        expect(mixCAB.isMixedWith(MixinAB)).toBeFalsy();
        expect(mixCAB.isMixedWith(MixinBA)).toBeFalsy();
        expect(mixCAB.isMixedWith(MixinBD)).toBeFalsy();
        expect(mixCAB.isMixedWith(MixinCAB)).toBeFalsy();
        expect(mixCAB.isMixedWith(ClassA)).toBeTruthy();
        expect(mixCAB.isMixedWith(ClassB)).toBeTruthy();
        expect(mixCAB.isMixedWith(ClassC)).toBeTruthy();
        expect(mixCAB.isMixedWith(ClassD)).toBeFalsy();
        expect(mixCAB.isMixedWith(ClassE)).toBeFalsy();
    });

    it(`check 'instanceof'`, () => {
        expect(mixAB instanceof MixinAB).toBeTruthy();
        expect(mixAB instanceof MixinBA).toBeFalsy();
        expect(mixAB instanceof MixinBD).toBeFalsy();
        expect(mixAB instanceof MixinCAB).toBeFalsy();
        expect(mixAB instanceof ClassA).toBeTruthy();
        expect(mixAB instanceof ClassB).toBeTruthy();
        expect(mixAB instanceof ClassC).toBeFalsy();
        expect(mixAB instanceof ClassD).toBeFalsy();

        expect(mixBA instanceof MixinAB).toBeFalsy();
        expect(mixBA instanceof MixinBA).toBeTruthy();
        expect(mixBA instanceof MixinBD).toBeFalsy();
        expect(mixBA instanceof MixinCAB).toBeFalsy();
        expect(mixBA instanceof ClassA).toBeTruthy();
        expect(mixBA instanceof ClassB).toBeTruthy();
        expect(mixBA instanceof ClassC).toBeFalsy();
        expect(mixBA instanceof ClassD).toBeFalsy();

        expect(mixBD instanceof MixinAB).toBeFalsy();
        expect(mixBD instanceof MixinBA).toBeFalsy();
        expect(mixBD instanceof MixinBD).toBeTruthy();
        expect(mixBD instanceof MixinCAB).toBeFalsy();
        expect(mixBD instanceof ClassA).toBeTruthy();
        expect(mixBD instanceof ClassB).toBeTruthy();
        expect(mixBD instanceof ClassC).toBeFalsy();
        expect(mixBD instanceof ClassD).toBeTruthy();

        expect(mixCAB instanceof MixinAB).toBeFalsy();
        expect(mixCAB instanceof MixinBA).toBeFalsy();
        expect(mixCAB instanceof MixinBD).toBeFalsy();
        expect(mixCAB instanceof MixinCAB).toBeTruthy();
        expect(mixCAB instanceof ClassA).toBeTruthy();
        expect(mixCAB instanceof ClassB).toBeTruthy();
        expect(mixCAB instanceof ClassC).toBeTruthy();
        expect(mixCAB instanceof ClassD).toBeFalsy();
    });

    it('check setInstanceOf', () => {
        expect(ClassE[Symbol.hasInstance]).toBeDefined();   // NOTE: 制限事項 mixin により ClassA[Symbol.hasInstance] を呼び出す
        expect(mixAB instanceof ClassE).toBeTruthy();
        expect(mixBA instanceof ClassE).toBeTruthy();
        expect(mixBD instanceof ClassE).toBeTruthy();
        expect(mixCAB instanceof ClassE).toBeTruthy();

        setInstanceOf(ClassE);                              // 上書き抑止
        expect(ClassE[Symbol.hasInstance]).toBeDefined();
        expect(mixAB instanceof ClassE).toBeFalsy();
        expect(mixBA instanceof ClassE).toBeFalsy();
        expect(mixBD instanceof ClassE).toBeFalsy();
        expect(mixCAB instanceof ClassE).toBeFalsy();

        setInstanceOf(ClassE, null);                        // 削除抑止
        expect(ClassE[Symbol.hasInstance]).not.toBeDefined();
        expect(mixAB instanceof ClassE).toBeFalsy();
        expect(mixBA instanceof ClassE).toBeFalsy();
        expect(mixBD instanceof ClassE).toBeFalsy();
        expect(mixCAB instanceof ClassE).toBeFalsy();
    });

    it('check advanced', () => {
        class MixinMiss extends mixins(ClassA, ClassB) {
            constructor(aId: number, bId: number, aName: string, bName: string) {
                super(aId, aName);
                this.construct(ClassB, bId, bName);
                this.construct(ClassE, bId, bName); // 間違った呼び出し (no effect)
            }
            public sum(): number {
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                return this.aId + this.bId;
            }
        }
        expect(() => new MixinMiss(0xA, 0xB, 'A', 'B')).not.toThrow();

        class ClassNoInherit {
            public who(): string { return 'ClassNoInherit'; }
        }
        Object.defineProperty(ClassNoInherit, Symbol.hasInstance, {
            value: (inst: object) => ClassNoInherit.prototype.isPrototypeOf(inst),
            writable: false,    // 変更不可
        });

        class MixinNotworking extends mixins(ClassA, ClassNoInherit) {
            constructor() {
                super(0xA, 'A');
            }
        }
        const notWork = new MixinNotworking();
        expect(notWork.aId).toBe(0xA);
        expect(notWork.aName).toBe('A');
        expect(notWork instanceof MixinNotworking).toBeTruthy();
        expect(notWork instanceof ClassA).toBeTruthy();
        expect(notWork instanceof ClassNoInherit).toBeFalsy();  // instanceof は無効
    });

});
