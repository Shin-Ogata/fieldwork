import {
    i18n,
    t,
    initializeI18N,
    getLanguage,
    getLanguageList,
    changeLanguage,
} from '@cdp/i18n';
import { RESULT_CODE } from '@cdp/result';
import { ensureCleanI18N } from './tools';

describe('i18n spec', () => {
    beforeEach(() => {
        ensureCleanI18N();
    });

    it('check instance', () => {
        expect(i18n).toBeDefined();
    });

    it('check initialize error case', async () => {
        await expectAsync(initializeI18N({
            lng: 'ja',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
        })).not.toBeRejected();

        ensureCleanI18N();

        try {
            await initializeI18N({
                lng: 'ja',
                namespace: 'messages',
                resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
                noThrow: false,
            });
            fail('UNEXPECTED FLOW');
        } catch (e) {
            expect(e.code).toBe(RESULT_CODE.ERROR_I18N_CORE_LAYER);
        }
    });

    it('check getLanguage() / getLanguageList()', async () => {
        const initialLanguage = getLanguage();
        const initialLngList  = getLanguageList();
        expect(initialLanguage).toBeDefined();
        expect(initialLngList).toBeDefined();

        await initializeI18N({
            lng: 'ja-JP',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
            },
        });

        const setupLanguage = getLanguage();
        const setupLngList = getLanguageList();
        expect(setupLanguage).toBe('ja-JP');
        expect(setupLngList).toEqual(['ja-JP', 'ja', 'dev']);
        expect(setupLanguage).not.toBe(initialLanguage);
        expect(setupLngList).not.toEqual(initialLngList);
    });

    it('check change language', async () => {
        await initializeI18N({
            lng: 'ja-JP',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
        });

        expect(getLanguage()).toBe('ja-JP');

        await changeLanguage('en');

        expect(getLanguage()).toBe('en');
        expect(getLanguageList()).toEqual(['en', 'dev']);
        expect(t('app.common.transfer')).toBe('Send');
    });

    it('check change language error case', async () => {
        await expectAsync(initializeI18N({
            lng: 'ja-JP',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
        })).not.toBeRejected();

        expect(getLanguage()).toBe('ja-JP');

        await expectAsync(changeLanguage('fr')).not.toBeRejected();

        ensureCleanI18N();

        await initializeI18N({
            lng: 'ja-JP',
            namespace: 'messages',
            resourcePath: '../res/i18n/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
        });

        try {
            await changeLanguage('fr', { noThrow: false });
            fail('UNEXPECTED FLOW');
        } catch (e) {
            expect(e.code).toBe(RESULT_CODE.ERROR_I18N_CORE_LAYER);
        }
    });

    it('check other plugins', async () => {
        await initializeI18N({
            lng: 'ja-JP',
            resources: {
                ja: {
                    translation: {
                        key: 'The current date is {{date, YYYY/MM/DD}}',
                        key2: '{{text, uppercase}} just uppercased',
                    },
                },
            },
            interpolation: {
                escapeValue: false,
            },
            plugins: {
                type: 'formatter',
                format: (value: any, format?: string, lng?: string): string => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    if ('uppercase' === format) {
                        return value.toUpperCase();
                    } else if (value instanceof Date) {
                        expect(format).toBe('YYYY/MM/DD');
                        return new Intl.DateTimeFormat(lng, {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                        }).format(value);
                    } else {
                        return value;
                    }
                },
            },
        });

        expect(t('key', { date: new Date(1579754211640) })).toBe('The current date is 2020/01/23');
        expect(t('key2', { text: 'can you hear me' })).toBe('CAN YOU HEAR ME just uppercased');
    });
});
