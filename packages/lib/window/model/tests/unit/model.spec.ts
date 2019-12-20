/*
 eslint-disable
   @typescript-eslint/no-explicit-any
 , @typescript-eslint/no-empty-function
 , @typescript-eslint/no-unnecessary-type-assertion
 , @typescript-eslint/no-useless-constructor
 , @typescript-eslint/require-await
 , @typescript-eslint/await-thenable
 */

import { Writable, post } from '@cdp/core-utils';
import { EventBroker } from '@cdp/events';
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
        message: string;
    }

    const errorInvalidData = makeResult(RESULT_CODE.ERROR_MVC_INVALID_DATA, 'size is readonly.');

    const Model = ModelBase as ModelConstructor<ModelBase<ContentAttribute, CustomEvent>, ContentAttribute>;

    class Content extends Model {
        constructor(attrs?: ContentAttribute, options?: ModelConstructionOptions<ContentAttribute>) {
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

    const broker = new EventBroker<CustomEvent>();

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

    it('check "@change" notify', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('@change', stub.onCallback);
        await post(async () => {
            content.uri    = 'bbb.html';
            content.cookie = 'test';
        });
        expect(stub.onCallback).toHaveBeenCalledWith(content);
        expect(count).toBe(1);

        content.off();
        await post(async () => {
            content.uri    = 'ccc.html';
            content.cookie = 'hoge';
        });
        expect(count).toBe(1);

        content.on('@change', stub.onCallback);
        await post(async () => {
            content.uri    = 'ddd.html';
            content.cookie = 'cookie';
        });
        expect(stub.onCallback).toHaveBeenCalledWith(content);
        expect(count).toBe(2);

        done();
    });

    it('check Model#hasListener()', () => {
        const content = new Content();
        const stub = { onCallback };

        expect(content.hasListener()).toBeFalsy();

        content.on('uri', stub.onCallback);
        expect(content.hasListener()).toBeTruthy();

        content.off();
        expect(content.hasListener()).toBeFalsy();

        content.on(['uri', 'size', 'cookie'], stub.onCallback);
        expect(content.hasListener()).toBeTruthy();

        content.off();
        expect(content.hasListener()).toBeFalsy();
    });

    it('check Model#hasListener(channel)', () => {
        const content = new Content();
        const stub = { onCallback };

        expect(content.hasListener()).toBeFalsy();

        content.on('uri', stub.onCallback);
        expect(content.hasListener('size')).toBeFalsy();
        expect(content.hasListener('uri')).toBeTruthy();

        content.off();
        expect(content.hasListener()).toBeFalsy();

        content.on(['uri', 'size'], stub.onCallback);
        expect(content.hasListener('uri')).toBeTruthy();
        expect(content.hasListener('size')).toBeTruthy();
        expect(content.hasListener('cookie')).toBeFalsy();

        content.off();
        expect(content.hasListener()).toBeFalsy();
    });

    it('check Model#hasListener(channel, function)', () => {
        const content = new Content();
        const stub = { onCallback };

        expect(content.hasListener()).toBeFalsy();

        content.on('uri', stub.onCallback);
        expect(content.hasListener('uri', stub.onCallback)).toBeTruthy();
        expect(content.hasListener('uri', () => { })).toBeFalsy();

        content.off();
        expect(content.hasListener()).toBeFalsy();

        content.on(['uri', 'size'], stub.onCallback);
        expect(content.hasListener('uri', stub.onCallback)).toBeTruthy();
        expect(content.hasListener('uri', () => { })).toBeFalsy();
        expect(content.hasListener('size', stub.onCallback)).toBeTruthy();
        expect(content.hasListener('size', () => { })).toBeFalsy();
        expect(content.hasListener('cookie', stub.onCallback)).toBeFalsy();
        expect(content.hasListener('cookie', () => { })).toBeFalsy();

        content.off();
        expect(content.hasListener()).toBeFalsy();
    });

    it('check Model#channels()', () => {
        const content = new Content();
        const stub = { onCallback };

        let channels = content.channels();
        expect(channels).toBeDefined();
        expect(channels.length).toBe(0);
        content.on('uri', stub.onCallback);

        channels = content.channels();
        expect(channels.length).toBe(1);
        expect(channels[0]).toBe('uri');

        content.off();
        channels = content.channels();
        expect(channels.length).toBe(0);
    });

    it('check Model#on(single)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('message', stub.onCallback);

        await content.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await content.trigger('message', 'good morning');
        expect(stub.onCallback).toHaveBeenCalledWith('good morning');

        expect(count).toBe(2);

        done();
    });

    it('check Model#on(multi)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on(['message', 'fire'], stub.onCallback);

        await content.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await content.trigger('fire', true, 100);
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);

        expect(count).toBe(2);

        done();
    });

    it('check subscription', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = content.on(['message', 'fire'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();

        await content.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(subscription.enable).toBeTruthy();

        subscription.unsubscribe();
        expect(subscription.enable).toBeFalsy();

        await content.trigger('fire', true, 100);
        expect(stub.onCallback).not.toHaveBeenCalledWith(true, 100);

        expect(count).toBe(1);

        done();
    });

    it('check Model#off(single)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('message', stub.onCallback);
        content.on('fire', stub.onCallback);
        await content.trigger('message', 'hello');
        await content.trigger('fire', false);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(false);
        expect(count).toBe(2);

        content.off('message', stub.onCallback);
        await content.trigger('message', 'good morning');
        await content.trigger('fire', true);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(true);
        expect(count).toBe(3);

        content.off('fire');
        await content.trigger('message', 'good evening');
        await content.trigger('fire', true, 1);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good evening');
        expect(stub.onCallback).not.toHaveBeenCalledWith(true, 1);
        expect(count).toBe(3);

        done();
    });

    it('check off(multi)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on(['message', 'fire', 'uri'], stub.onCallback);
        await content.trigger('message', 'hello');
        await content.trigger('fire', true, 100);
        await content.trigger('uri', 'bbb.html');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);
        expect(stub.onCallback).toHaveBeenCalledWith('bbb.html');

        content.off(['message', 'uri'], stub.onCallback);
        await content.trigger('message', 'good morning');
        await content.trigger('fire', false, 200);
        await content.trigger('uri', 'ccc.html');
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(false, 200);
        expect(stub.onCallback).not.toHaveBeenCalledWith('ccc.html');

        content.off(['fire'], stub.onCallback);
        await content.trigger('fire', true, 300);
        expect(stub.onCallback).not.toHaveBeenCalledWith(true, 300);

        expect(count).toBe(4);

        done();
    });

    it('check Model#once(single)', async (done) => {
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

    it('check Model#once(multi)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = content.once(['message', 'fire'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await content.trigger('fire', true, 100);
        await content.trigger('message', 'hello');
        expect(stub.onCallback).not.toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);

        await content.trigger('fire', false, 200);
        expect(stub.onCallback).not.toHaveBeenCalledWith(false, 200);
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        done();
    });

    it('check Model#listenTo(single)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.listenTo(broker, 'message', stub.onCallback);

        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await broker.trigger('message', 'good morning');
        expect(stub.onCallback).toHaveBeenCalledWith('good morning');

        expect(count).toBe(2);

        content.stopListening();
        done();
    });

    it('check Model#listenTo(multi)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.listenTo(broker, ['message', 'fire'], stub.onCallback);

        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalled();
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await broker.trigger('fire', true, 100);
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);

        expect(count).toBe(2);

        content.stopListening();
        done();
    });

    it('check Model#stopListening(single)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.listenTo(broker, 'message', stub.onCallback);
        content.listenTo(broker, 'fire', stub.onCallback);
        await broker.trigger('message', 'hello');
        await broker.trigger('fire', true);
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(true);
        expect(count).toBe(2);

        content.stopListening(broker, 'message', stub.onCallback);
        await broker.trigger('message', 'good morning');
        await broker.trigger('fire', false, 100);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(false, 100);
        expect(count).toBe(3);

        content.stopListening(broker, 'fire');
        await broker.trigger('message', 'good evening');
        await broker.trigger('fire', true, 200);
        expect(stub.onCallback).not.toHaveBeenCalledWith('good evening');
        expect(stub.onCallback).not.toHaveBeenCalledWith(true, 200);
        expect(count).toBe(3);

        content.stopListening();
        done();
    });

    it('check Model#stopListening(multi)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.listenTo(broker, ['message', 'fire', 'uri'], stub.onCallback);
        await broker.trigger('message', 'hello');
        await broker.trigger('fire', true, 100);
        await broker.trigger('uri', 'bbb.html');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);
        expect(stub.onCallback).toHaveBeenCalledWith('bbb.html');

        content.stopListening(broker, ['message', 'uri'], stub.onCallback);
        await broker.trigger('message', 'good morning');
        await broker.trigger('fire', false, 200);
        await broker.trigger('uri', 'ccc.html');
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(false, 200);
        expect(stub.onCallback).not.toHaveBeenCalledWith('ccc.html');

        content.stopListening(broker, ['fire'], stub.onCallback);
        await broker.trigger('fire', true, 300);
        expect(stub.onCallback).not.toHaveBeenCalledWith(true, 300);

        expect(count).toBe(4);

        content.stopListening();
        done();
    });

    it('check Model#listenToOnce(single)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = content.listenToOnce(broker, 'message', stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await broker.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await broker.trigger('message', 'good morning');
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        content.stopListening();
        done();
    });

    it('check Model#listenToOnce(multi)', async (done) => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const subscription = content.listenToOnce(broker, ['message', 'fire'], stub.onCallback);
        expect(subscription.enable).toBeTruthy();
        await broker.trigger('fire', true, 100);
        await broker.trigger('message', 'hello');
        expect(stub.onCallback).not.toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);

        await broker.trigger('fire', false, 200);
        expect(stub.onCallback).not.toHaveBeenCalledWith(false, 200);
        expect(subscription.enable).toBeFalsy();

        expect(count).toBe(1);

        content.stopListening();
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

        content.on('@change', stub.onCallback);
        await post(async () => {
            content.setAttributes({
                uri: 'bbb.html',
                cookie: 'test',
                hoge: true,
            });
        });
        expect(stub.onCallback).toHaveBeenCalledWith(content);
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

        content.on('@change', stub.onCallback);
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

        content.on('@change', stub.onCallback);
        await post(async () => {
            content.setAttributes({
                uri: 'bbb.html',
                cookie: 'test',
                hoge: true,
            }, { extend: true });
        });
        expect(stub.onCallback).toHaveBeenCalledWith(content);
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

        content.on('@invalid', stub.onCallback);

        try {
            await post(async () => {
                content.setAttributes({
                    size: 11,
                }, { validate: true });
            });
        } catch (e) {
            expect(e).toEqual(errorInvalidData);
        }

        expect(stub.onCallback).toHaveBeenCalledWith(content, { uri: 'aaa.html', size: 11, cookie: undefined }, errorInvalidData);

        done();
    });

    it('check Model#setAttribute({ validate: true, noThrow: true, silent })', async (done) => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('@invalid', stub.onCallback);

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

        content.on('@change', stub.onCallback);
        await post(async () => {
            content.clear();
        });
        expect(stub.onCallback).toHaveBeenCalledWith(content);
        expect(count).toBe(1);
        expect(content.uri).toBeUndefined();
        expect(content.size).toBeUndefined();
        expect(content.cookie).toBeUndefined();

        done();
    });
});
