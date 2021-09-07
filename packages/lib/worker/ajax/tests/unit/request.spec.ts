/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import { Result, RESULT_CODE } from '@cdp/result';
import { request } from '@cdp/ajax';

type RespSchema = { propNumber: number; propBoolean: boolean; propString: string; };

describe('ajax/reauest spec', () => {
    it('check request#get()', async () => {
        const data = await request.get('../../.temp/res/ajax/data.json');
        expect(data).toBeDefined();
        const { propNumber, propBoolean, propString } = data.schema as RespSchema;
        expect(propNumber).toBe(100);
        expect(propBoolean).toBe(true);
        expect(propString).toBe('hoge');
    });

    it('check request#text()', async () => {
        const template = await request.text('../../.temp/res/ajax/test.tpl');
        expect(template).toBeDefined();
        const normlize = template.replace(/\s/gm, '');
        expect(normlize).toBe('<article><template><div></div></template></article>');
    });

    it('check request#json()', async () => {
        const data = await request.json('../../.temp/res/ajax/data.json');
        expect(data).toBeDefined();
        const { propNumber, propBoolean, propString } = data.schema as RespSchema;
        expect(propNumber).toBe(100);
        expect(propBoolean).toBe(true);
        expect(propString).toBe('hoge');
    });

    it('check request#blob()', async () => {
        const blob = await request.blob('../../.temp/res/ajax/image.jpg');
        expect(blob).toBeDefined();
        expect(blob.type).toBe('image/jpeg');
    });

    it('check request#post()', async () => {
        const json = await request.post('/api-ajax', {
            aaa: 'aaa',
            bbb: true,
            ccc: null,
        }, 'json') as { API: string; data: { aaa: string; bbb: string; ccc: string; }; };
        expect(json).toBeDefined();
        expect(json.API).toBe('JSON response');
        expect(json.data.aaa).toBe('aaa');
        expect(json.data.bbb).toBe('true');
        expect(json.data.ccc).toBe('null');
    });

    it('check request#resource() json', () => {
        const json = request.resource('../../.temp/res/ajax/data.json');
        expect(json).toBeDefined();
        const { propNumber, propBoolean, propString } = json.schema as RespSchema;
        expect(propNumber).toBe(100);
        expect(propBoolean).toBe(true);
        expect(propString).toBe('hoge');
    });

    it('check request#resource() text', () => {
        const template = request.resource('../../.temp/res/ajax/test.tpl', 'text', { a: 'a', b: true, c: null });
        expect(template).toBeDefined();
        const normlize = template.replace(/\s/gm, '');
        expect(normlize).toBe('<article><template><div></div></template></article>');
    });

    it('check request#resource() error', () => {
        let reason!: Result;
        try {
            request.resource('../../.temp/res/ajax/invalid.res', 'text');
        } catch (e) {
            reason = e;
        }

        expect(reason.code).toBe(RESULT_CODE.ERROR_AJAX_RESPONSE);
        expect(reason.cause.status).toBe(404);
        expect(reason.message).toBe('Not Found');
    });
});
