import { t, initializeI18N } from '@cdp/i18n';
import { CancelToken } from '@cdp/promise';
import {
    RESULT_CODE,
    makeResult,
    makeCanceledResult,
} from '@cdp/result';
import { ensureCleanI18N } from './tools';

describe('i18n/plugin/ajax-backend spec', () => {
    beforeEach(() => {
        ensureCleanI18N();
    });

    it('check `namespace` & `resourcePath`', async done => {
        await initializeI18N({
            lng: 'ja-JP',
            fallbackLng: 'en',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
        });
        expect(t('app.common.refresh')).toBe('更新');
        done();
    });

    it('check `loadPath` function', async done => {
        const loadPath = (): string => '../res/i18n/locales/{{ns}}.{{lng}}.json';

        await initializeI18N({
            lng: 'ja-JP',
            fallbackLng: 'en',
            ns: 'messages',
            defaultNS: 'messages',
            backend: {
                loadPath,
            },
        });
        expect(t('app.common.support')).toBe('サポート');
        done();
    });

    it('check `fallbackResources`', async done => {
        await initializeI18N({
            lng: 'ja',
            fallbackLng: 'en',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
        });
        expect(t('app.common.transfer')).toBe('送信');
        done();
    });

    it('check unuse backend', async done => {
        await initializeI18N({
            lng: 'ja',
            fallbackLng: 'en',
            resources: {
                en: {
                    translation: {
                        app: {
                            common: {
                                say: 'Hello World',
                            },
                        },
                    },
                },
                ja: {
                    translation: {
                        app: {
                            common: {
                                say: 'こんにちは、世界',
                            },
                        },
                    },
                },
            },
        });
        expect(t('app.common.say')).toBe('こんにちは、世界');
        expect(t('app.common.transfer')).toBe('app.common.transfer');
        done();
    });

    it('check cancel', async done => {
        const error = makeCanceledResult();

        const cancelSource = CancelToken.source();
        const { token } = cancelSource;
        cancelSource.cancel(error);

        await expectAsync(initializeI18N({
            lng: 'ja',
            backend: {
                loadPath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
                cancel: token,
            },
        })).not.toBeRejected();

        expect(t('app.common.transfer')).toBe('app.common.transfer');

        done();
    });

    it('check server errors', async done => {
        class Status {
            private _status = 500;
            get status(): number {
                const retval = this._status;
                this._status = 300;
                return retval;
            }
        }
        const error = makeResult(RESULT_CODE.ERROR_AJAX_RESPONSE, 'emulate response 500->300', new Status());

        const cancelSource = CancelToken.source();
        const { token } = cancelSource;
        cancelSource.cancel(error);

        await expectAsync(initializeI18N({
            lng: 'ja',
            backend: {
                loadPath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
                cancel: token,
            },
        })).not.toBeRejected();

        expect(t('app.common.transfer')).toBe('app.common.transfer');

        done();
    });
});
