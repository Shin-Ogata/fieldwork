/* eslint-disable @typescript-eslint/no-explicit-any */
import { Result, RESULT_CODE } from '@cdp/result';
import { request } from '@cdp/ajax';

describe('ajax/reauest spec', () => {
    it('check request#get()', async done => {
        const data = await request.get('../../.temp/res/data.json');
        expect(data).toBeDefined();
        const { propNumber, propBoolean, propString } = data.schema;
        expect(propNumber).toBe(100);
        expect(propBoolean).toBe(true);
        expect(propString).toBe('hoge');
        done();
    });

    it('check request#text()', async done => {
        const template = await request.text('../../.temp/res/test.tpl');
        expect(template).toBeDefined();
        const normlize = template.replace(/\s/gm, '');
        expect(normlize).toBe('<article><template><div></div></template></article>');
        done();
    });

    it('check request#json()', async done => {
        const data = await request.json('../../.temp/res/data.json');
        expect(data).toBeDefined();
        const { propNumber, propBoolean, propString } = data.schema;
        expect(propNumber).toBe(100);
        expect(propBoolean).toBe(true);
        expect(propString).toBe('hoge');
        done();
    });

    it('check request#blob()', async done => {
        const blob = await request.blob('../../.temp/res/image.jpg');
        expect(blob).toBeDefined();
        expect(blob.type).toBe('image/jpeg');
        done();
    });

    it('check request#post()', async done => {
        const json = await request.post('/api', {
            aaa: 'aaa',
            bbb: true,
            ccc: null,
        }, 'json');
        expect(json).toBeDefined();
        expect(json.API).toBe('JSON response');
        expect(json.data.aaa).toBe('aaa');
        expect(json.data.bbb).toBe('true');
        expect(json.data.ccc).toBe('null');
        done();
    });

    it('check request#resource() json', () => {
        const json = request.resource('../../.temp/res/data.json');
        expect(json).toBeDefined();
        const { propNumber, propBoolean, propString } = json.schema;
        expect(propNumber).toBe(100);
        expect(propBoolean).toBe(true);
        expect(propString).toBe('hoge');
    });

    it('check request#resource() text', () => {
        const template = request.resource('../../.temp/res/test.tpl', 'text', { a: 'a', b: true, c: null });
        expect(template).toBeDefined();
        const normlize = template.replace(/\s/gm, '');
        expect(normlize).toBe('<article><template><div></div></template></article>');
    });

    it('check request#resource() error', () => {
        let reason!: Result;
        try {
            request.resource('../../.temp/res/invalid.res', 'text');
        } catch (e) {
            reason = e;
        }

        expect(reason.code).toBe(RESULT_CODE.ERROR_AJAX_RESPONSE);
        expect(reason.cause.status).toBe(404);
        expect(reason.message).toBe('Not Found');
    });
});
