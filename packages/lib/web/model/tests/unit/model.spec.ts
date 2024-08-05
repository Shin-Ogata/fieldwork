/*
 eslint-disable
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/no-useless-constructor,
    @typescript-eslint/require-await,
    @typescript-eslint/await-thenable,
    @typescript-eslint/no-empty-function,
 */

import {
    Writable,
    post,
    $cdp,
} from '@cdp/core-utils';
import {
    EventPublisher,
    EventBroker,
    EventReceiver,
    Subscribable,
} from '@cdp/events';
import {
    RESULT_CODE,
    Result,
    makeResult,
} from '@cdp/result';
import { CancelToken } from '@cdp/promise';
import {
    defaultSync,
    dataSyncSTORAGE,
    dataSyncNULL,
} from '@cdp/data-sync';
import {
    Model,
    ModelSeed,
    ModelEvent,
    ModelConstructor,
    ModelValidateAttributeOptions,
    ModelAttributeInput,
    ModelConstructionOptions,
    ModelSetOptions,
    isModel,
    idAttribute,
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
        [$cdp]: string;
    }

    const errorInvalidData = makeResult(RESULT_CODE.ERROR_MVC_INVALID_DATA, 'size is readonly.');

    // early cast
    const ContentBase = Model as ModelConstructor<Model<ContentAttribute, CustomEvent>, ContentAttribute>;
    class Content extends ContentBase {
        static idAttribute = 'cookie';
        constructor(attrs?: Partial<ContentAttribute>, options?: ModelConstructionOptions) {
            super(Object.assign({}, Content.defaults, attrs), options);
        }

        get url(): string {
            return 'test';
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

        // example: parse()
        protected parse(response: ModelSeed, options?: ModelSetOptions): ContentAttribute {
            let resp = super.parse(response, options) as { size?: number; cookie?: string; };
            const { size, syncMethod } = Object.assign({}, options, resp);
            if (null != size) {
                resp.size = size * 2;
            }
            if ('create' === syncMethod || 'patch' === syncMethod || 'update' === syncMethod) {
                resp = { cookie: 'from:save' };
            }
            return resp as ContentAttribute;
        }

        // example: Backbone.defaults semantics.
        private static get defaults(): ContentAttribute {
            return {
                uri: 'aaa.html',
                size: 10,
                cookie: undefined,
            };
        }
    }

    // late cast
    class ContentClass extends Model<ContentAttribute, CustomEvent> {
        public getCID(): string {
            return this._cid;
        }
    }
    const ContentLate = ContentClass as ModelConstructor<ContentClass, ContentAttribute>;

    const broker = new EventBroker<CustomEvent>();

    let count: number;

    beforeEach(() => {
        count = 0;
    });

    // eslint-disable-next-line
    const onCallback = (...args: any[]): void => {
        count++;
    };

    it('check isModel', (): void => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        expect(isModel(content)).toBeTruthy();
        const content2 = { ...content };
        expect(isModel(content2)).toBeFalsy();
        expect(content instanceof Model).toBe(true);
        expect(content instanceof EventPublisher).toBe(false);
        expect(content instanceof EventBroker).toBe(false);
        expect(content instanceof EventReceiver).toBe(true);
    });

    it('check late cast', (): void => {
        const content = new ContentLate({ uri: 'aaa.html', size: 10, cookie: undefined });
        expect(content instanceof Model).toBe(true);
        expect(content instanceof EventPublisher).toBe(false);
        expect(content instanceof EventBroker).toBe(false);
        expect(content instanceof EventReceiver).toBe(true);
    });

    it('check Model#id', (): void => {
        const content = new ContentLate({ uri: 'aaa.html', size: 10, cookie: undefined });
        expect(content.id).toBeDefined();
        expect(content.id).toBe(content.getCID());
        expect(content.id.startsWith('model:')).toBe(true);

        const content2 = new Content({ cookie: undefined });
        expect(content2.id).toBeDefined();
        expect(content2.id).toBe(content2.getCID());
        expect(content2.id.startsWith('model:')).toBe(true);
    });

    it('check idAttribute', (): void => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: '{3F9989A3-41E8-4E7C-AF9C-6F68C6C84084}' });
        expect(content.id).toBe('{3F9989A3-41E8-4E7C-AF9C-6F68C6C84084}');
        expect(content.id).not.toBe(content.getCID());
        expect(idAttribute(content)).toBe('cookie');
        expect(idAttribute({ id: 100, url: 'aaa.html' }, 'object fallback')).toBe('object fallback');
        expect(idAttribute(true, 'primitive fallback')).toBe('primitive fallback');
    });

    it('check property access', () => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        expect(content.uri).toBe('aaa.html');
        expect(content.size).toBe(10);
        expect(content.cookie).toBeUndefined();
    });

    it('check change property notify', async () => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('@change:uri', stub.onCallback);
        await post(async () => content.uri = 'bbb.html');
        expect(stub.onCallback).toHaveBeenCalledWith(content, 'bbb.html', 'aaa.html', 'uri');
        expect(count).toBe(1);
    });

    it('check "@change" notify', async () => {
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
    });

    it('check "@change" notify from array', async () => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on(['@change'], stub.onCallback);
        await post(async () => {
            content.uri = 'bbb.html';
            content.cookie = 'test';
        });
        expect(stub.onCallback).toHaveBeenCalledWith(content);
        expect(count).toBe(1);
    });

    it('check Model#clone()', () => {
        const content = new Content();
        const clone = content.clone();
        expect(clone instanceof Content).toBe(true);
        expect(clone === content).toBe(false);
        expect(clone.toJSON()).toEqual(content.toJSON());
    });

    it('check Model#hasListener()', () => {
        const content = new Content();
        const stub = { onCallback };

        expect(content.hasListener()).toBeFalsy();

        content.on('@change:uri', stub.onCallback);
        expect(content.hasListener()).toBeTruthy();

        content.off();
        expect(content.hasListener()).toBeFalsy();

        content.on(['@change:uri', '@change:size', '@change:cookie'], stub.onCallback);
        expect(content.hasListener()).toBeTruthy();

        content.off();
        expect(content.hasListener()).toBeFalsy();
    });

    it('check Model#hasListener(channel)', () => {
        const content = new Content();
        const stub = { onCallback };

        expect(content.hasListener()).toBeFalsy();

        content.on('@change:uri', stub.onCallback);
        expect(content.hasListener('@change:size')).toBeFalsy();
        expect(content.hasListener('@change:uri')).toBeTruthy();

        content.off();
        expect(content.hasListener()).toBeFalsy();

        content.on(['@change:uri', '@change:size'], stub.onCallback);
        expect(content.hasListener('@change:uri')).toBeTruthy();
        expect(content.hasListener('@change:size')).toBeTruthy();
        expect(content.hasListener('@change:cookie')).toBeFalsy();

        content.off();
        expect(content.hasListener()).toBeFalsy();
    });

    it('check Model#hasListener(channel, function)', () => {
        const content = new Content();
        const stub = { onCallback };

        expect(content.hasListener()).toBeFalsy();

        content.on('@change:uri', stub.onCallback);
        expect(content.hasListener('@change:uri', stub.onCallback)).toBeTruthy();
        expect(content.hasListener('@change:uri', () => { })).toBeFalsy();

        content.off();
        expect(content.hasListener()).toBeFalsy();

        content.on(['@change:uri', '@change:size'], stub.onCallback);
        expect(content.hasListener('@change:uri', stub.onCallback)).toBeTruthy();
        expect(content.hasListener('@change:uri', () => { })).toBeFalsy();
        expect(content.hasListener('@change:size', stub.onCallback)).toBeTruthy();
        expect(content.hasListener('@change:size', () => { })).toBeFalsy();
        expect(content.hasListener('@change:cookie', stub.onCallback)).toBeFalsy();
        expect(content.hasListener('@change:cookie', () => { })).toBeFalsy();

        content.off();
        expect(content.hasListener()).toBeFalsy();
    });

    it('check Model#channels()', () => {
        const content = new Content();
        const stub = { onCallback };

        let channels = content.channels();
        expect(channels).toBeDefined();
        expect(channels.length).toBe(0);

        content.on('@change:uri', stub.onCallback);
        channels = content.channels();
        expect(channels.length).toBe(1);
        expect(channels[0]).toBe('@change:uri');

        content.on('message', stub.onCallback);
        channels = content.channels();
        expect(channels.length).toBe(2);
        expect(channels[0]).toBe('@change:uri');
        expect(channels[1]).toBe('message');

        content.on($cdp, stub.onCallback);
        channels = content.channels();
        expect(channels.length).toBe(3);
        expect(channels[0]).toBe('@change:uri');
        expect(channels[1]).toBe('message');
        expect(channels[2]).toBe($cdp);

        content.off();
        channels = content.channels();
        expect(channels.length).toBe(0);
    });

    it('check Model#on(single)', async () => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on('message', stub.onCallback);

        await content.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await content.trigger('message', 'good morning');
        expect(stub.onCallback).toHaveBeenCalledWith('good morning');

        expect(count).toBe(2);
    });

    it('check Model#on(multi)', async () => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on(['message', 'fire'], stub.onCallback);

        await content.trigger('message', 'hello');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');

        await content.trigger('fire', true, 100);
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);

        expect(count).toBe(2);
    });

    it('check subscription', async () => {
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
    });

    it('check Model#off(single)', async () => {
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
    });

    it('check off(multi)', async () => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.on(['message', 'fire', '@change:uri'], stub.onCallback);
        await content.trigger('message', 'hello');
        await content.trigger('fire', true, 100);
        await content.trigger('@change:uri', content as any, 'bbb.html');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);
        expect(stub.onCallback).toHaveBeenCalledWith(content, 'bbb.html');

        content.off(['message', '@change:uri'], stub.onCallback);
        await content.trigger('message', 'good morning');
        await content.trigger('fire', false, 200);
        await content.trigger('@change:uri', content as any, 'ccc.html');
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(false, 200);
        expect(stub.onCallback).not.toHaveBeenCalledWith(content, 'ccc.html');

        content.off(['fire'], stub.onCallback);
        await content.trigger('fire', true, 300);
        expect(stub.onCallback).not.toHaveBeenCalledWith(true, 300);

        expect(count).toBe(4);
    });

    it('check Model#once(single)', async () => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.once('@change:uri', stub.onCallback);
        await post(async () => content.uri = 'bbb.html');
        expect(stub.onCallback).toHaveBeenCalledWith(content, 'bbb.html', 'aaa.html', 'uri');
        expect(count).toBe(1);

        await post(async () => content.uri = 'ccc.html');
        expect(count).toBe(1);
    });

    it('check Model#once(multi)', async () => {
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
    });

    it('check Model#listenTo(single)', async () => {
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
    });

    it('check Model#listenTo(multi)', async () => {
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
    });

    it('check Model#stopListening(single)', async () => {
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
    });

    it('check Model#stopListening(multi)', async () => {
        const content = new Content();
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        content.listenTo(broker, ['message', 'fire', '@change:uri'], stub.onCallback);
        await broker.trigger('message', 'hello');
        await broker.trigger('fire', true, 100);
        await broker.trigger('@change:uri', content as any, 'bbb.html');
        expect(stub.onCallback).toHaveBeenCalledWith('hello');
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);
        expect(stub.onCallback).toHaveBeenCalledWith(content, 'bbb.html');

        content.stopListening(broker, ['message', '@change:uri'], stub.onCallback);
        await broker.trigger('message', 'good morning');
        await broker.trigger('fire', false, 200);
        await broker.trigger('@change:uri', content as any, 'ccc.html');
        expect(stub.onCallback).not.toHaveBeenCalledWith('good morning');
        expect(stub.onCallback).toHaveBeenCalledWith(false, 200);
        expect(stub.onCallback).not.toHaveBeenCalledWith(content, 'ccc.html');

        content.stopListening(broker, ['fire'], stub.onCallback);
        await broker.trigger('fire', true, 300);
        expect(stub.onCallback).not.toHaveBeenCalledWith(true, 300);

        expect(count).toBe(4);

        content.stopListening();
    });

    it('check Model#listenToOnce(single)', async () => {
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
    });

    it('check Model#listenToOnce(multi)', async () => {
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
    });

    it('check listenTo() client', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content();
        const checker = new EventReceiver();

        // 注: ModelConstructor によって合成された型であるため, 明示的キャストをしないと継承関係がたどれない
//      checker.listenTo(content, 'fire', stub.onCallback); // compile error
        checker.listenTo<Subscribable<CustomEvent>>(content, 'fire', stub.onCallback);   // explicit cast
        checker.listenTo(content as Subscribable<CustomEvent>, 'fire', stub.onCallback); // explicit cast
        checker.listenTo(content.$, 'fire', stub.onCallback);                            // cast helper

        await content.trigger('fire', true, 100);
        expect(stub.onCallback).toHaveBeenCalledWith(true, 100);
    });

    it('check validate', async () => {
        const content = new Content({ uri: 'aaa.html', size: 10, cookie: undefined });
        expect(content.isValid).toBe(true);
        const validResult = content.validate();
        expect(validResult.code).toBe(RESULT_CODE.SUCCESS);
    });

    it('check parse', (): void => {
        const content = new Content({ size: 20 }, { parse: true });
        expect(content.uri).toBe('aaa.html');
        expect(content.size).toBe(40);
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

    it('check Model#setAttribute()', async () => {
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
    });

    it('check Model#setAttribute({ silent: true })', async () => {
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
    });

    it('check Model#setAttribute({ extend: true })', async () => {
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
    });

    it('check Model#setAttribute({ validate: true })', async () => {
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

        expect(stub.onCallback).toHaveBeenCalledWith(content, jasmine.objectContaining({ uri: 'aaa.html', size: 11, cookie: undefined }), errorInvalidData);
    });

    it('check Model#setAttribute({ validate: true, noThrow: true, silent })', async () => {
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
        } catch {
            fail('UNEXPECTED FLOW');
        }

        expect(stub.onCallback).not.toHaveBeenCalled();
    });

    it('check Model#clear()', async () => {
        type WritableAttr = Writable<ContentAttribute>;
        class WritableContent extends ContentBase {
            constructor(attrs: WritableAttr, options?: ModelConstructionOptions) {
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
    });

    it('check Model#toJSON()', () => {
        const content = new Content();
        expect(content.toJSON()).toEqual({
            uri: 'aaa.html',
            size: 10,
            cookie: undefined,
        });
    });

    it('check Model#hasChanged()', () => {
        const content = new Content();
        expect(content.hasChanged()).toBe(false);
        content.cookie = 'test';
        expect(content.hasChanged()).toBe(true);
        expect(content.hasChanged('uri')).toBe(false);
        expect(content.hasChanged('cookie')).toBe(true);
    });

    it('check Model#changed()', () => {
        const content = new Content();
        expect(content.changed()).toBeUndefined();
        content.cookie = 'test';
        expect(content.changed()).toEqual({ cookie: 'test' });
        expect(content.changed({ uri: 'bbb.html' })).toEqual({ uri: 'bbb.html' });
        expect(content.changed({ size: 10 })).toBeUndefined();
    });

    it('check Model#previous()', () => {
        const content = new Content();
        expect(content.previous('cookie')).toBeUndefined();
        content.cookie = 'test';
        expect(content.previous('cookie')).toBeUndefined();
        content.cookie = 'test';
        expect(content.previous('cookie')).toBeUndefined();
        content.cookie = 'check';
        expect(content.previous('cookie')).toBe('test');
    });

    it('check Model#fetch()', async () => {
        localStorage.setItem('test::cookie1', JSON.stringify({
            uri: 'sss.html',
            size: 30,
            cookie: 'localStorage',
        }));
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content({ cookie: 'cookie1' });
        content.on('@sync', stub.onCallback);

        const resp = await content.fetch();
        expect(resp).toEqual({ uri: 'sss.html', size: 60, cookie: 'localStorage' });
        expect(stub.onCallback).toHaveBeenCalledWith(content, resp, jasmine.anything());
        expect(content.uri).toBe('sss.html');
        expect(content.size).toBe(60);
        expect(content.cookie).toBe('localStorage');

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#fetch({ parse: false })', async () => {
        localStorage.setItem('test::cookie1', JSON.stringify({
            uri: 'sss.html',
            size: 30,
            cookie: 'localStorage',
        }));
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content({ cookie: 'cookie1' });
        content.on('@sync', stub.onCallback);

        const resp = await content.fetch({ parse: false });
        expect(resp).toEqual({ uri: 'sss.html', size: 30, cookie: 'localStorage' });
        expect(stub.onCallback).toHaveBeenCalledWith(content, resp, jasmine.anything());
        expect(content.uri).toBe('sss.html');
        expect(content.size).toBe(30);
        expect(content.cookie).toBe('localStorage');

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#fetch() error', async () => {
        localStorage.setItem('test::cookie1', JSON.stringify({
            uri: 'sss.html',
            size: 30,
            cookie: 'localStorage',
        }));
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content({ cookie: 'cookie1' });
        content.on('@error', stub.onCallback);

        try {
            await content.fetch({ parse: false, validate: true });
        } catch (e) {
            expect(e).toEqual(errorInvalidData);
        }

        expect(stub.onCallback).toHaveBeenCalledWith(content, jasmine.anything(), { parse: false, validate: true, syncMethod: 'read' });

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#save() w/ create', async () => {
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content();
        content.on('@sync', stub.onCallback);

        const resp = await content.save();

        expect(stub.onCallback).toHaveBeenCalledWith(content, resp, jasmine.anything());

        const entries = JSON.parse(localStorage.getItem('test')!);
        const data = JSON.parse(localStorage.getItem(`test::${entries[0]}`)!);
        expect(data.uri).toBe('aaa.html');
        expect(data.size).toBe(10);
        expect(content.cookie).toBe('from:save');

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#save(undefined, { parse: false }) w/ create', async () => {
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content();
        content.on('@sync', stub.onCallback);

        const resp = await content.save(undefined, { parse: false });

        expect(stub.onCallback).toHaveBeenCalledWith(content, resp, jasmine.anything());

        const entries = JSON.parse(localStorage.getItem('test')!);
        const data = JSON.parse(localStorage.getItem(`test::${entries[0]}`)!);
        expect(data.uri).toBe('aaa.html');
        expect(data.size).toBe(10);
        expect(content.cookie?.startsWith('test:')).toBe(true);

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#save(key, value, { wait: false }) w/ create', async () => {
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content();
        content.on('@sync', stub.onCallback);

        const resp = await content.save('uri', 'bbb.html', { wait: false });

        expect(stub.onCallback).toHaveBeenCalledWith(content, resp, jasmine.anything());

        const entries = JSON.parse(localStorage.getItem('test')!);
        const data = JSON.parse(localStorage.getItem(`test::${entries[0]}`)!);
        expect(data.uri).toBe('bbb.html');
        expect(data.size).toBe(10);
        expect(content.cookie).toBe('from:save');

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#save({ uri }) w/ update', async () => {
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content({ cookie: 'from:constructor' });
        content.on('@sync', stub.onCallback);

        const resp = await content.save({ uri: 'bbb.html' });

        expect(stub.onCallback).toHaveBeenCalledWith(content, resp, jasmine.anything());

        const ids  = JSON.parse(localStorage.getItem('test')!);
        const data = JSON.parse(localStorage.getItem('test::from:constructor')!);
        expect(ids).toEqual(['from:constructor']);
        expect(data.uri).toBe('bbb.html');
        expect(data.size).toBe(10);
        expect(content.cookie).toBe('from:save'); // override

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#save(undefined, { patch, data }) w/ patch', async () => {
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content({ cookie: 'from:constructor' });
        content.on('@sync', stub.onCallback);

        const resp = await content.save(undefined, { patch: true, data: { uri: 'bbb.html' } });

        expect(stub.onCallback).toHaveBeenCalledWith(content, resp, jasmine.anything());

        const ids  = JSON.parse(localStorage.getItem('test')!);
        const data = JSON.parse(localStorage.getItem('test::from:constructor')!);
        expect(ids).toEqual(['from:constructor']);
        expect(data.uri).toBe('bbb.html');
        expect(data.size).toBe(10);
        expect(content.cookie).toBe('from:save'); // override

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#save({}, { parse: false }) w/ no server', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content({ cookie: 'from:constructor' });
        content.on('@sync', stub.onCallback);

        const resp = await content.save({}, { parse: false });

        expect(stub.onCallback).toHaveBeenCalledWith(content, resp, jasmine.anything());
    });

    it('check Model#save() error', async () => {
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content();
        content.on('@error', stub.onCallback);

        try {
            await content.save({ size: 20 });
        } catch (e) {
            expect(e).toEqual(errorInvalidData);
        }

        expect(stub.onCallback).toHaveBeenCalledWith(content, jasmine.anything(), { validate: true, parse: true, wait: true, extend: true, syncMethod: 'create' });

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#destroy()', async () => {
        localStorage.setItem('test::localStorage', JSON.stringify({
            uri: 'sss.html',
            size: 30,
            cookie: 'localStorage',
        }));
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content({ cookie: 'localStorage' });
        content.on('@sync', stub.onCallback);
        content.on('@destroy', stub.onCallback);

        await content.fetch();
        expect(content.cookie).toBe('localStorage');

        await content.destroy();
        expect(localStorage.getItem('test::localStorage')).toBeNull();

        expect(stub.onCallback).toHaveBeenCalledWith(content, { uri: 'sss.html', size: 60, cookie: 'localStorage' }, { parse: true, syncMethod: 'read' });  // @sync
        expect(stub.onCallback).toHaveBeenCalledWith(content, { uri: 'sss.html', size: 30, cookie: 'localStorage' }, { wait: true, syncMethod: 'delete' }); // @sync
        expect(stub.onCallback).toHaveBeenCalledWith(content, { wait: true, syncMethod: 'delete' });                                                        // @destroy

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#destroy({ wait: false })', async () => {
        localStorage.setItem('test::localStorage', JSON.stringify({
            uri: 'sss.html',
            size: 30,
            cookie: 'localStorage',
        }));
        defaultSync(dataSyncSTORAGE);

        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content({ cookie: 'localStorage' });
        content.on('@sync', stub.onCallback);
        content.on('@destroy', stub.onCallback);

        await content.fetch();
        expect(content.cookie).toBe('localStorage');

        await content.destroy({ wait: false });
        expect(localStorage.getItem('test::localStorage')).toBeNull();

        expect(stub.onCallback).toHaveBeenCalledWith(content, { uri: 'sss.html', size: 60, cookie: 'localStorage' }, { parse: true, syncMethod: 'read' });   // @sync
        expect(stub.onCallback).toHaveBeenCalledWith(content, { uri: 'sss.html', size: 30, cookie: 'localStorage' }, { wait: false, syncMethod: 'delete' }); // @sync
        expect(stub.onCallback).toHaveBeenCalledWith(content, { wait: false, syncMethod: 'delete' });                                                        // @destroy

        localStorage.clear();
        defaultSync(dataSyncNULL);
    });

    it('check Model#destroy() w/ no server', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content();
        content.on('@destroy', stub.onCallback);

        await content.destroy();
        expect(localStorage.getItem('test')).toBeNull();

        expect(stub.onCallback).toHaveBeenCalledWith(content, { wait: true, syncMethod: 'delete' });
    });

    it('check Model#destroy() error', async () => {
        const stub = { onCallback };
        spyOn(stub, 'onCallback').and.callThrough();

        const content = new Content();
        content.on('@error', stub.onCallback);

        const cancelSource = CancelToken.source();
        const { token } = cancelSource;
        const error = new Error('aborted');
        cancelSource.cancel(error);

        try {
            await content.destroy({ cancel: token });
        } catch (e) {
            expect(e).toEqual(error);
        }

        expect(stub.onCallback).toHaveBeenCalledWith(content, error, { wait: true, cancel: token, syncMethod: 'delete' });
    });
});
