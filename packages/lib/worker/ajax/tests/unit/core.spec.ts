/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { CancelToken } from '@cdp/promise';
import {
    Result,
    RESULT_CODE,
    makeCanceledResult,
} from '@cdp/result';
import {
    settings,
    ajax,
    toQueryStrings,
    toAjaxParams,
} from '@cdp/ajax';

/* compile check
(async () => {
    const hoge0 = await ajax('aaa', new Request('aaa'));
    const hoge1 = await ajax('aaa', { dataType: 'text' });
    const hoge2 = await ajax('aaa', { dataType: 'json' });
    const hoge3 = await ajax<{ prop: number; }>('aaa', { dataType: 'json' });
    const hoge4 = await ajax('aaa', { dataType: 'arrayBuffer' });
    const hoge5 = await ajax('aaa', { dataType: 'blob' });
    const hoge6 = await ajax('aaa', { dataType: 'stream' });
    const hoge7 = await ajax('aaa', { dataType: 'response' });
//  const hoge8 = await ajax<{ prop: number; }>('aaa', { dataType: 'text' }); // error
    const hoge9 = await ajax<{ prop: number; }>('aaa', {}); // no-error 注意.
})();
*/

describe('ajax/core spec', () => {
    const queryData = {
        hoge: 100,
        fuga: 'string',
        baz: true,
        func: () => { return 10; },
        nil1: undefined,
        nil2: null,
    };

    it('check settings', () => {
        expect(settings.timeout).toBe(undefined);
        settings.timeout = 100;
        expect(settings.timeout).toBe(100);
        settings.timeout = undefined;
        expect(settings.timeout).toBe(undefined);
    });

    it('check toQueryStrings()', () => {
        expect(toQueryStrings(queryData)).toBe('hoge=100&fuga=string&baz=true&func=10&nil2=null');
    });

    it('check toAjaxParams()', () => {
        const params = toAjaxParams(queryData);
        expect(params.hoge).toBe('100');
        expect(params.fuga).toBe('string');
        expect(params.baz).toBe('true');
        expect(params.func).toBe('10');
        expect(params.nil1).toBeUndefined();
        expect(params.nil2).toBe('null');
    });

    it('check ajax() get json', async done => {
        const data = await ajax('../../.temp/res/data.json', { dataType: 'json' });
        expect(data).toBeDefined();
        const { propNumber, propBoolean, propString } = data.schema;
        expect(propNumber).toBe(100);
        expect(propBoolean).toBe(true);
        expect(propString).toBe('hoge');
        done();
    });

    it('check ajax() get text', async done => {
        const template = await ajax('../../.temp/res/test.tpl', { dataType: 'text' });
        expect(template).toBeDefined();
        const normlize = template.replace(/\s/gm, '');
        expect(normlize).toBe('<article><template><div></div></template></article>');
        done();
    });

    it('check ajax() get blob', async done => {
        const blob = await ajax('../../.temp/res/image.jpg', { dataType: 'blob' });
        expect(blob).toBeDefined();
        expect(blob.type).toBe('image/jpeg');
        done();
    });

    it('check ajax() get response', async done => {
        const response = await ajax('../../.temp/res/data.json');
        expect(response).toBeDefined();
        const json = await response.json();
        const { propNumber, propBoolean, propString } = json.schema;
        expect(propNumber).toBe(100);
        expect(propBoolean).toBe(true);
        expect(propString).toBe('hoge');

        // 後から型変換は不可
        await expectAsync(response.text()).toBeRejected();
        done();
    });

    it('check ajax() head query strings', async done => {
        const response = await ajax('../../.temp/res/data.json', {
            method: 'HEAD',
            data: {
                aaa: 'aaa',
                bbb: true,
                ccc: null,
            },
        });
        expect(response).toBeDefined();
        expect(response.ok).toBe(true);
        done();
    });

    it('check ajax() invalid response', async done => {
        let reason!: Result;
        try {
            await ajax('../../.temp/res/hogehoge.json', {
                dataType: 'json',
                username: 'shin',
                mode: 'cors',
                headers: { Accept: 'application/json' },
            });
        } catch (e) {
            reason = e;
        }

        expect(reason).toBeDefined();
        expect(reason.code).toBe(RESULT_CODE.ERROR_AJAX_RESPONSE);
        const response: Response = reason.cause;
        expect(response.status).toBe(404);
        expect(response.statusText).toBe('Not Found');

        const { headers } = response;
        expect(headers.get('Content-Type'.toLowerCase())).toBe('text/html; charset=utf-8');
        done();
    });

    it('check ajax() post json', async done => {
        const data = await ajax('/api', { method: 'POST', dataType: 'json' });
        expect(data).toBeDefined();
        expect(data.API).toBe('JSON response');
        done();
    });

    it('check ajax() post with data', async done => {
        const response = await ajax('/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'audio/x-sony-oma',
            },
            data: {
                aaa: 'aaa',
                bbb: true,
                ccc: null,
            },
        });
        expect(response).toBeDefined();
        expect(response.ok).toBe(true);
        const json = await response.json();
        expect(json.API).toBe('POST');
        expect(json.data.aaa).toBe('aaa');
        expect(json.data.bbb).toBe('true');
        expect(json.data.ccc).toBe('null');
        done();
    });

    it('check ajax() post with body', async done => {
        const response = await ajax('/api', {
            method: 'POST',
            contentType: 'application/x-www-form-urlencoded;charset=UTF-8', // default
            data: {
                aaa: 'aaa',
                bbb: true,
                ccc: null,
            },
            body: new URLSearchParams(toAjaxParams({
                aaa: 'hoge',
                bbb: false,
                ccc: undefined,
            })),
        });
        expect(response).toBeDefined();
        expect(response.ok).toBe(true);
        const json = await response.json();
        expect(json.API).toBe('POST');
        expect(json.data.aaa).toBe('hoge');
        expect(json.data.bbb).toBe('false');
        expect(json.data.ccc).toBeUndefined();
        done();
    });

    it('check ajax() timeout', async done => {
        let reason!: Result;
        try {
            await ajax('/api', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'multipart/form-data; boundary=----hogehoge', // 削除される
                },
                body: new FormData(),
                timeout: 50,
            });
        } catch (e) {
            reason = e;
        }

        expect(reason).toBeDefined();
        expect(reason.code).toBe(RESULT_CODE.ERROR_AJAX_TIMEOUT);
        done();
    });

    it('check ajax() cancel', async done => {
        let reason!: Result;
        const source = CancelToken.source();

        try {
            setTimeout(() => {
                source.cancel(makeCanceledResult());
            }, 50);
            await ajax('/api', {
                method: 'PUT',
                cancel: source.token,
            });
        } catch (e) {
            reason = e;
        }

        expect(reason).toBeDefined();
        expect(reason.code).toBe(RESULT_CODE.ABORT);

        reason = null!; // eslint-disable-line

        try {
            await ajax('/api', {
                method: 'PUT',
                cancel: source.token,   // already requested
            });
        } catch (e) {
            reason = e;
        }

        expect(reason).toBeDefined();
        expect(reason.code).toBe(RESULT_CODE.ABORT);

        done();
    });
});
