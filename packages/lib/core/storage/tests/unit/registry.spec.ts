/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import { sleep } from '@cdp/core-utils';
import {
    MemoryStorage,
    Registry,
    type RegistrySchemaBase,
} from '@cdp/core-storage';

interface Schema extends RegistrySchemaBase {
    'common/mode': 'normal' | 'specified';
    'common/value': number;
    'trade/local': { unit: '円' | '$'; rate: number; };
    'trade/check': boolean;
    'extra/user': string;
}

describe('storage/registry spec', () => {

    let _reg!: Registry<Schema>;
    let _count: number;

    const onCallback = (key: string | null, newVal?: any, oldVal?: any): void => { // eslint-disable-line
        _count++;
    };

    beforeEach(async () => {
        const storage = new MemoryStorage();
        await storage.setItem('@test', {
            common: {
                mode: 'normal',
            },
            private: {
                trade: {
                    local: { unit: '円', rate: 100 },
                },
            },
        });
        _reg = new Registry(storage, '@test');
        _count = 0;
    });

    it('check Registry#rootKey & storage', () => {
        expect(_reg.rootKey).toBe('@test');
        expect(_reg.storage.kind).toBe('memory');
    });

    it('check Registry#load() w/ callback ', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _reg.on('change', stub.onCallback);

        // 読み込み前は何も返さない
        expect(_reg.read('common/mode')).toBeNull();

        // load
        await _reg.load();
        expect(stub.onCallback).toHaveBeenCalledWith('*');
        expect(_reg.read('common/mode')).toBe('normal');

        // 外側から破棄
        await _reg.storage.clear();

        // multiple call
        await _reg.load();
        expect(_count).toBe(2);
        expect(_reg.read('common/mode')).toBeNull();

        // silent call
        await _reg.load({ silent: true });
        expect(_count).toBe(2);
    });

    it('check Registry#save() w/ callback ', async () => {
        const stub = {
            onWillSave: () => {
                // final update
                _reg.write('common/mode', 'specified');
                _count++;
            },
        };
        spyOn(stub, 'onWillSave').and.callThrough();

        // on
        _reg.on('will-save', stub.onWillSave);

        // load
        await _reg.load();
        expect(_reg.read('common/mode')).toBe('normal');
        // safe
        await _reg.save();
        expect(_reg.read('common/mode')).toBe('specified');

        // silent call
        await _reg.save({ silent: true });
        expect(_count).toBe(1);
    });

    it('check Registry#read()', async () => {
        expect(_reg.read('common/mode')).toBeNull();
        expect(_reg.read('common/value')).toBeNull();
        expect(_reg.read('trade/local')).toBeNull();
        expect(_reg.read('trade/check')).toBeNull();
        expect(_reg.read('extra/user')).toBeNull();

        // load
        await _reg.load();

        expect(_reg.read('common/mode')).toBe('normal');
        expect(_reg.read('common/value')).toBeNull();
        expect(_reg.read('trade/local')).toBeNull();
        expect(_reg.read('trade/check')).toBeNull();
        expect(_reg.read('extra/user')).toBeNull();

        // w/ field
        expect(_reg.read('trade/local', { field: 'private' })).toEqual({ unit: '円', rate: 100 });
    });

    it('check Registry#write()', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _reg.on('change', stub.onCallback);

        // load
        await _reg.load();

        _reg.write('common/value', 200);

        // no change
        _reg.write('common/mode', 'normal');
        // no save
        _reg.write('trade/check', true, { noSave: true });
        // w/ field
        _reg.write('trade/local', { unit: '$', rate: 109 }, { field: 'private' });
        // w/ silent & new field
        _reg.write('extra/user', 'test-user', { silent: true, field: 'pim' });

        expect(_reg.read('common/mode')).toBe('normal');
        expect(_reg.read('common/value')).toBe(200);
        expect(_reg.read('trade/local', { field: 'private' })).toEqual({ unit: '$', rate: 109 });
        expect(_reg.read('trade/check')).toBe(true);
        expect(_reg.read('extra/user', { field: 'pim' })).toBe('test-user');

        expect((await _reg.storage.getItem('@test')).common.check).toBeUndefined();

        // delete
        _reg.write('common/mode', null);
        expect(_reg.read('common/mode')).toBeNull();

        await sleep(100);

        expect(stub.onCallback).not.toHaveBeenCalledWith('common/mode', 'normal', 'normal');
        expect(stub.onCallback).toHaveBeenCalledWith('common/value', 200, null);
        expect(stub.onCallback).toHaveBeenCalledWith('trade/local', { unit: '$', rate: 109 }, { unit: '円', rate: 100 });
        expect(stub.onCallback).toHaveBeenCalledWith('trade/check', true, null);
        expect(stub.onCallback).not.toHaveBeenCalledWith('extra/user', 'test-user', null);
        expect(stub.onCallback).toHaveBeenCalledWith('common/mode', null, 'normal');
    });

    it('check Registry#delete() ', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _reg.on('change', stub.onCallback);

        // load
        await _reg.load();

        // delete
        _reg.delete('common/mode');
        _reg.delete('trade/local', { field: 'private' });
        _reg.delete('extra/user');

        expect(_reg.read('common/mode')).toBeNull();
        expect(_reg.read('trade/local', { field: 'private' })).toBeNull();
        expect(_reg.read('extra/user')).toBeNull();

        await sleep(100);

        expect(stub.onCallback).toHaveBeenCalledWith('common/mode', null, 'normal');
        expect(stub.onCallback).toHaveBeenCalledWith('trade/local', null, { unit: '円', rate: 100 });
        expect(stub.onCallback).not.toHaveBeenCalledWith('extra/user', null, null);
    });

    it('check Registry#clear() ', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        // on
        _reg.on('change', stub.onCallback);

        // load
        await _reg.load();

        _reg.clear();

        expect(_reg.read('common/mode')).toBeNull();
        expect(_reg.read('common/value')).toBeNull();
        expect(_reg.read('trade/local')).toBeNull();
        expect(_reg.read('trade/check')).toBeNull();
        expect(_reg.read('extra/user')).toBeNull();

        _reg.clear({ silent: true });

        await sleep(100);

        expect(stub.onCallback).toHaveBeenCalledWith(null, null, null);
        expect(_count).toBe(2);
    });

});
