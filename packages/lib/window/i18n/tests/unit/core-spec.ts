/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

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

    it('check initialize error case', async done => {
        await expectAsync(initializeI18N({
            lng: 'ja',
            namespace: 'messages',
            resourcePath: '../res/locales/{{ns}}.{{lng}}.json',
        })).not.toBeRejected();

        ensureCleanI18N();

        try {
            await initializeI18N({
                lng: 'ja',
                namespace: 'messages',
                resourcePath: '../res/locales/{{ns}}.{{lng}}.json',
                noThrow: false,
            });
            expect('UNEXPECTED FLOW').toBeNull();
        } catch (e) {
            expect(e.code).toBe(RESULT_CODE.ERROR_I18N_CORE_LAYER);
        }

        done();
    });

    it('check getLanguage() / getLanguageList()', async done => {
        const initialLanguage = getLanguage();
        const initialLngList  = getLanguageList();
        expect(initialLanguage).toBeDefined();
        expect(initialLngList).toBeDefined();

        await initializeI18N({
            lng: 'ja-JP',
            namespace: 'messages',
            resourcePath: '../res/locales/{{ns}}.{{lng}}.json',
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

        done();
    });

    it('check change language', async done => {
        await initializeI18N({
            lng: 'ja-JP',
            namespace: 'messages',
            resourcePath: '../res/locales/{{ns}}.{{lng}}.json',
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

        done();
    });

    it('check change language error case', async done => {
        await expectAsync(initializeI18N({
            lng: 'ja-JP',
            namespace: 'messages',
            resourcePath: '../res/locales/{{ns}}.{{lng}}.json',
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
            resourcePath: '../res/locales/{{ns}}.{{lng}}.json',
            fallbackResources: {
                'ja': 'ja-JP',
                'en': 'en-US',
            },
        });

        try {
            await changeLanguage('fr', { noThrow: false });
            expect('UNEXPECTED FLOW').toBeNull();
        } catch (e) {
            expect(e.code).toBe(RESULT_CODE.ERROR_I18N_CORE_LAYER);
        }

        done();
    });
});
