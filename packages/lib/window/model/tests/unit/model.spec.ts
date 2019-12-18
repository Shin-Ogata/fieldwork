/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-useless-constructor, @typescript-eslint/require-await */

import { Writable, post } from '@cdp/core-utils';
import {
    RESULT_CODE,
    Result,
    makeResult,
} from '@cdp/result';
import {
    ModelBase,
    ModelEvent,
    ModelConstructor,
    ModelValidateAttributeOptions,
    ModelAttributeInput,
    ModelConstructionOptions,
} from '@cdp/model';

describe('model/model spec', () => {

    interface ContentAttribute {
        uri: string;
        readonly size: number;
        cookie?: string;
    }

    interface CustomEvent extends ModelEvent<ContentAttribute> {
        fire: [boolean, number];
    }

    const errorInvalidData = makeResult(RESULT_CODE.ERROR_MVC_INVALID_DATA, 'size is readonly.');

    const Model = ModelBase as ModelConstructor<ModelBase<ContentAttribute, CustomEvent>, ContentAttribute>;

    class Content extends Model {
        constructor(attrs: ContentAttribute, options?: ModelConstructionOptions<ContentAttribute>) {
            super(Object.assign({}, Content.defaults, attrs), options);
        }

        public getCID(): string {
            return this._cid;
        }

        protected validateAttributes<A extends ContentAttribute>(attrs: ModelAttributeInput<A>, options?: ModelValidateAttributeOptions): Result {
            if (attrs.size !== this._baseAttrs.size) {
                return errorInvalidData;
            }
            return super.validateAttributes(attrs, options);
        }

        // example for  Backbone.defaults
        private static get defaults(): ContentAttribute {
            return {
                uri: 'aaa.html',
                size: 10,
                cookie: undefined,
            };
        }
    }

    let count: number;

    beforeEach(() => {
        count = 0;
    });

    // eslint-disable-next-line
    const onCallback = (...args: any[]): void => {
        count++;
    };

    it('check Model#id', (): void => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        expect(content.id).toBeDefined();
        expect(content.id).toBe(content.getCID());
        expect(content.id.startsWith('model:')).toBe(true);

        const content2 = new Content({ uri: 'aaa.html', size: 10, cookie: '{3F9989A3-41E8-4E7C-AF9C-6F68C6C84084}' }, { idAttribute: 'cookie' });
        expect(content2.id).not.toBe(content2.getCID());
        expect(content2.id).toBe('{3F9989A3-41E8-4E7C-AF9C-6F68C6C84084}');
    });

    it('check property access', () => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        expect(content.uri).toBe('aaa.html');
        expect(content.size).toBe(10);
        expect(content.cookie).toBeUndefined();
    });

    it('check change property notify', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('uri', stub.onCallback);
        await post(async () => content.uri = 'bbb.html');
        expect(stub.onCallback).toHaveBeenCalledWith('bbb.html', 'aaa.html', 'uri');
        expect(count).toBe(1);

        done();
    });

    it('check "change" notify', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('change', stub.onCallback);
        await post(async () => {
            content.uri    = 'bbb.html';
            content.cookie = 'test';
        });
        expect(stub.onCallback).toHaveBeenCalledWith({ uri: 'bbb.html', size: 10, cookie: 'test' });
        expect(count).toBe(1);

        content.off();
        await post(async () => {
            content.uri    = 'ccc.html';
            content.cookie = 'hoge';
        });
        expect(count).toBe(1);

        content.on('change', stub.onCallback);
        await post(async () => {
            content.uri    = 'ddd.html';
            content.cookie = 'cookie';
        });
        expect(stub.onCallback).toHaveBeenCalledWith({ uri: 'ddd.html', size: 10, cookie: 'cookie' });
        expect(count).toBe(2);

        done();
    });

    it('check Model#once()', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.once('uri', stub.onCallback);
        await post(async () => content.uri = 'bbb.html');
        expect(stub.onCallback).toHaveBeenCalledWith('bbb.html', 'aaa.html', 'uri');
        expect(count).toBe(1);

        await post(async () => content.uri = 'ccc.html');
        expect(count).toBe(1);

        done();
    });

    it('check validate', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        expect(content.isValid).toBe(true);
        const validResult = content.validate();
        expect(validResult.code).toBe(RESULT_CODE.SUCCESS);
        done();
    });

    it('check Model#has()', () => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        expect(content.has('uri')).toBe(true);
        expect(content.has('size')).toBe(true);
        expect(content.has('cookie')).toBe(false);
    });

    it('check Model#has()', () => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: '<script>alert("xss")</script>' });
        expect(content.escape('cookie')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('check Model#setAttribute()', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('change', stub.onCallback);
        await post(async () => {
            content.setAttributes({
                uri: 'bbb.html',
                cookie: 'test',
                hoge: true,
            });
        });
        expect(stub.onCallback).toHaveBeenCalledWith({ uri: 'bbb.html', size: 10, cookie: 'test' });
        expect(count).toBe(1);
        expect(content.uri).toBe('bbb.html');
        expect(content.cookie).toBe('test');
        expect((content as any).hoge).toBeUndefined();

        done();
    });

    it('check Model#setAttribute({ silent: true })', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('change', stub.onCallback);
        await post(async () => {
            content.setAttributes({
                uri: 'bbb.html',
                cookie: 'test',
                hoge: true,
            }, { silent: true });
        });
        expect(stub.onCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
        expect(content.uri).toBe('bbb.html');
        expect(content.cookie).toBe('test');
        expect((content as any).hoge).toBeUndefined();

        done();
    });

    it('check Model#setAttribute({ extend: true })', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('change', stub.onCallback);
        await post(async () => {
            content.setAttributes({
                uri: 'bbb.html',
                cookie: 'test',
                hoge: true,
            }, { extend: true });
        });
        expect(stub.onCallback).toHaveBeenCalledWith({ uri: 'bbb.html', size: 10, cookie: 'test', hoge: true });
        expect(count).toBe(1);
        expect(content.uri).toBe('bbb.html');
        expect(content.cookie).toBe('test');
        expect((content as any).hoge).toBe(true);

        done();
    });

    it('check Model#setAttribute({ validate: true })', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('invalid', stub.onCallback);

        try {
            await post(async () => {
                content.setAttributes({
                    size: 11,
                }, { validate: true });
            });
        } catch (e) {
            expect(e).toEqual(errorInvalidData);
        }

        expect(stub.onCallback).toHaveBeenCalledWith({ uri: 'aaa.html', size: 11, cookie: undefined }, errorInvalidData);

        done();
    });

    it('check Model#setAttribute({ validate: true, noThrow: true, silent })', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('invalid', stub.onCallback);

        try {
            await post(async () => {
                content.setAttributes({
                    size: 11,
                }, { validate: true, noThrow: true, silent: true });
            });
        } catch (e) {
            expect('UNEXPECTED FLOW').toBe(e);
        }

        expect(stub.onCallback).not.toHaveBeenCalled();

        done();
    });

    it('check Model#clear()', async (done) => {
        type WritableAttr = Writable<ContentAttribute>;
        class WritableContent extends Model {
            constructor(attrs: WritableAttr, options?: ModelConstructionOptions<WritableAttr>) {
                super(attrs, options);
            }
        }
        const content = new WritableContent({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('change', stub.onCallback);
        await post(async () => {
            content.clear();
        });
        expect(stub.onCallback).toHaveBeenCalledWith({ uri: undefined, size: undefined, cookie: undefined });
        expect(count).toBe(1);
        expect(content.uri).toBeUndefined();
        expect(content.size).toBeUndefined();
        expect(content.cookie).toBeUndefined();

        done();
    });
});
