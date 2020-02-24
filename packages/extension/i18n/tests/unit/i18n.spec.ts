/* eslint-disable
   @typescript-eslint/no-explicit-any
 , @typescript-eslint/camelcase
 */

import { post, escapeHTML } from '@cdp/core-utils';
import { i18n } from '@cdp/extension-i18n';

// check compile: `$ npm run compile:test`
//import { i18n } from '../../dist/extension-i18n';

describe('extention-i18n spec', () => {

    let i18next!: i18n.i18n;

    beforeEach(() => {
        i18next = i18n.createInstance();
    });

    describe('Essentilas / API', () => {
        it('check instance', () => {
            expect(i18n).toBeDefined();
        });

        it('check i18next.init() w/ changeLanguage()', async done => {
            const t = await i18next.init({
                lng: 'ja-JP',
                fallbackLng: 'en',
                resources: {
                    en: {
                        translation: {
                            key: 'Hello World',
                        },
                    },
                    ja: {
                        translation: {
                            key: 'こんにちは、世界',
                        },
                    },
                },
                lowerCaseLng: true,
            });
            expect(t('key')).toBe('こんにちは、世界');

            await i18next.changeLanguage('en-us');
            expect(i18next.t('key')).toBe('Hello World');

            expect(i18next.options.fallbackLng).toEqual(['en']);
            expect(i18next.options.lowerCaseLng).toBe(true);
            expect(i18next.options.resources).toEqual({
                en: {
                    translation: {
                        key: 'Hello World'
                    },
                },
                ja: {
                    translation: {
                        key: 'こんにちは、世界',
                    },
                },
            });

            done();
        });

        it('check i18next.use()', async done => {
            const checker = {
                log: '',
                warn: '',
                error: '',
            };

            class PassThrough implements i18n.Module {
                readonly type = 'logger';
                log(message: any): void {
                    checker.log = String(message);
                }
                warn(message: any): void {
                    checker.warn = String(message);
                }
                error(message: any): void {
                    checker.error = String(message);
                }
            }

            const t = await i18next
                .use(new PassThrough())
                .init({
                    debug: true,
                    lng: 'ja-JP',
                    fallbackLng: 'en',
                    defaultNS: 'message',
                    resources: {
                        ja: {
                            message: {
                                key: 'こんにちは、世界',
                            },
                        },
                    },
                    lowerCaseLng: true,
                });

            expect(t('key')).toBe('こんにちは、世界');

            expect(checker.log).toBe('i18next: initialized,[object Object]');
            expect(checker.warn).toBe('');
            expect(checker.error).toBe('');

            done();
        });

        it('check i18next.t()', async done => {
            await i18next
                .init({
                    lng: 'ja-JP',
                    fallbackLng: 'ja',
                    resources: {
                        ja: {
                            translation: {
                                my: {
                                    key: 'こんにちは、世界',
                                },
                                error: {
                                    'unspecific': 'Something went wrong.',
                                    '404': 'The page was not found.',
                                },
                            },
                        },
                    },
                });

            expect(i18next.t('my.key')).toBe('こんにちは、世界');
            expect(i18next.t('unknown.key', 'default value')).toBe('default value');
            expect(i18next.t(['unknown.key', 'my.key'])).toBe('こんにちは、世界');

            let errorCode = 404;
            expect(i18next.t([`error.${errorCode}`, 'error.unspecific'])).toBe('The page was not found.');
            errorCode = 502;
            expect(i18next.t([`error.${errorCode}`, 'error.unspecific'])).toBe('Something went wrong.');

            done();
        });

        it('check i18next.exists()', async done => {
            await i18next
                .init({
                    lng: 'ja-JP',
                    resources: {
                        ja: {
                            translation: {
                                key: 'こんにちは、世界',
                            },
                        },
                    },
                });

            expect(i18next.exists('key')).toBe(true);
            expect(i18next.exists('door')).toBe(false);

            done();
        });

        it('check i18next.getFixedT()', async done => {
            await i18next
                .init({
                    lng: 'ja-JP',
                    ns: ['translation', 'message'],
                    fallbackLng: 'ja',
                    resources: {
                        ja: {
                            translation: {
                                my: {
                                    key: 'こんにちは、世界',
                                },
                            },
                            message: {
                                my: {
                                    key: 'こんばんは、世界',
                                },
                            },
                        },
                    },
                });

            const t = i18next.getFixedT('ja', 'message');
            expect(t('my.key')).toBe('こんばんは、世界');

            done();
        });

        it('check i18next.language & i18next.languages', async done => {
            await i18next.init({
                lng: 'ja-JP',
                fallbackLng: 'en',
                resources: {
                    en: {
                        translation: {
                            key: 'Hello World',
                        },
                    },
                    ja: {
                        translation: {
                            key: 'こんにちは、世界',
                        },
                    },
                },
                lowerCaseLng: true, // languages returns "ja-jp"
            });

            expect(i18next.language).toBe('ja-JP');
            expect(i18next.languages).toEqual(['ja-jp', 'ja', 'en']);

            done();
        });

        it('check i18next/*load*/ no throw', async done => {
            await i18next.init({
                debug: true,
                lng: 'ja-JP',
                fallbackLng: 'en',
            });

            try {
                await i18next.loadNamespaces(['namespace']);
                await i18next.loadNamespaces('string');
                await i18next.loadNamespaces(['fr', 'ar']);

                await i18next.loadLanguages(['ja']);
                await i18next.loadLanguages('en');
                await i18next.loadLanguages(['fr', 'ar']);

                await i18next.reloadResources(['ja']);
                await i18next.reloadResources('en', ['ns', 'namespace']);
                await i18next.reloadResources(['fr', 'ar'], 'namespace');

                expect('COMPLETE TEST').toBeDefined();
            } catch (e) {
                console.error(e);
                expect('UNEXPECTED FLOW').toBeNull();
            }

            done();
        });

        it('check i18next.setDefaultNamespace()', async done => {
            await i18next
                .init({
                    lng: 'ja-JP',
                    ns: ['translation', 'message'],
                    fallbackLng: 'ja',
                    resources: {
                        ja: {
                            translation: {
                                my: {
                                    key: 'こんにちは、世界',
                                },
                            },
                            message: {
                                my: {
                                    key: 'こんばんは、世界',
                                },
                            },
                        },
                    },
                });

            expect(i18next.t('my.key')).toBe('こんにちは、世界');
            i18next.setDefaultNamespace('message');
            expect(i18next.t('my.key')).toBe('こんばんは、世界');
            // namespace specified
            expect(i18next.t('translation:my.key')).toBe('こんにちは、世界');

            done();
        });

        it('check i18next.dir()', async done => {
            await i18next.init({
                lng: 'ja-JP',
                fallbackLng: 'en',
            });

            expect(i18next.dir()).toBe('ltr');
            expect(i18next.dir('en')).toBe('ltr');
            expect(i18next.dir('ar')).toBe('rtl');

            done();
        });

        it('check i18next.cloneInstance()', async done => {
            await i18next.init({
                lng: 'ja-JP',
                resources: {
                    ja: {
                        translation: {
                            key: 'こんにちは、世界',
                        },
                        message: {
                            key: 'こんばんは、世界',
                        },
                    },
                },
            });

            const cloned = i18next.cloneInstance({ defaultNS: 'message' });
            expect(cloned.t('key')).toBe('こんばんは、世界');

            done();
        });

        it('check eary binding `t`', async done => {
            const t: i18n.TFunction = i18next.t.bind(i18next);

            const promise = new Promise(resolve => {
                post(() => {
                    i18next.init({
                        lng: 'ja-JP',
                        initImmediate: false,
                        resources: {
                            ja: {
                                translation: {
                                    key: 'こんにちは、世界',
                                },
                            },
                        },
                    }, (err, orgT) => {
                        expect(err).toBeFalsy();
                        expect(orgT).toBeDefined();
                        resolve();
                    });
                });
            });

            expect(t('key')).toBeUndefined();
            expect(i18next.isInitialized).toBeFalsy();
            await promise;
            expect(t('key')).toBe('こんにちは、世界');
            expect(i18next.isInitialized).toBeTruthy();

            done();
        });
    });

    describe('Interpolation', () => {
        it('check basic', async done => {
            const t = await i18next.init({
                lng: 'ja-JP',
                resources: {
                    ja: {
                        translation: {
                            key: '{{what}} is {{how}}',
                        },
                    },
                },
            });

            expect(t('key', { what: 'i18next', how: 'great' })).toBe('i18next is great');

            done();
        });

        it('check working w/ data models', async done => {
            const t = await i18next.init({
                lng: 'ja-JP',
                resources: {
                    ja: {
                        translation: {
                            key: 'I am {{author.name}}',
                        },
                    },
                },
            });

            const author = {
                name: 'Jan',
                github: 'jamuhl',
            };

            expect(t('key', { author })).toBe('I am Jan');

            done();
        });

        it('check unescape', async done => {
            const t = await i18next.init({
                lng: 'ja-JP',
                resources: {
                    ja: {
                        translation: {
                            keyEscaped: 'no danger {{myVar}}',
                            keyUnescaped: 'dangerous {{- myVar}}',
                        },
                    },
                },
            });

            expect(t('keyEscaped', { myVar: '<img />' })).toBe('no danger &lt;img &#x2F;&gt;');
            expect(t('keyUnescaped', { myVar: '<img />' })).toBe('dangerous <img />');
            expect(t('keyEscaped', { myVar: '<img />', interpolation: { escapeValue: false } })).toBe('no danger <img />');

            done();
        });

        it('check additional options', async done => {
            const t = await i18next.init({
                lng: 'ja-JP',
                resources: {
                    ja: {
                        translation: {
                            key: '{what} is {how}',
                            keyEscaped: 'no danger {myVar}',
                        },
                    },
                },
                interpolation: {
                    prefix: '{',
                    suffix: '}',
                    escape: escapeHTML,
                },
            });

            expect(t('key', { what: 'i18next', how: 'great' })).toBe('i18next is great');
            expect(t('keyEscaped', { myVar: '<img />' })).toBe('no danger &lt;img /&gt;');

            done();
        });
    });

    describe('Formatting', () => {
        it('check formatting', async done => {
            const t = await i18next.init({
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
                    format: (value: any, format?: string, lng?: string): string => {
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
                    escapeValue: false,
                },
            });

            expect(t('key', { date: new Date(1579754211640) })).toBe('The current date is 2020/01/23');
            expect(t('key2', { text: 'can you hear me' })).toBe('CAN YOU HEAR ME just uppercased');

            done();
        });

        it('check formatting late calling', async done => {
            const t = await i18next.init({
                lng: 'ja-JP',
                resources: {
                    ja: {
                        translation: {
                            key: 'The current date is {{date}}',
                            key2: '{{text}} just uppercased',
                        },
                    },
                },
                interpolation: {
                    format: (value: any, format?: string, lng?: string): string => {
                        if ('uppercase' === format) {
                            return value.toUpperCase();
                        } else if (value instanceof Date) {
                            return new Intl.DateTimeFormat(lng, {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                            }).format(value);
                        } else {
                            return value;
                        }
                    },
                    escapeValue: false,
                },
            });

            expect(t('key', { date: i18next.format(new Date(1579754211640), undefined, i18next.language) })).toBe('The current date is 2020/01/23');
            expect(t('key2', { text: i18next.format('can you hear me', 'uppercase') })).toBe('CAN YOU HEAR ME just uppercased');

            done();
        });
    });

    describe('Plurals', () => {
        it('check singular / plural', async done => {
            const t = await i18next.init({
                lng: 'en-US',
                resources: {
                    en: {
                        translation: {
                            key: 'item',
                            key_plural: 'items',
                            keyWithCount: '{{count}} item',
                            keyWithCount_plural: '{{count}} items',
                        },
                    },
                },
            });

            expect(t('key', { count: 0 })).toBe('items');
            expect(t('key', { count: 1 })).toBe('item');
            expect(t('key', { count: 5 })).toBe('items');
            expect(t('key', { count: 100 })).toBe('items');
            expect(t('keyWithCount', { count: 0 })).toBe('0 items');
            expect(t('keyWithCount', { count: 1 })).toBe('1 item');
            expect(t('keyWithCount', { count: 5 })).toBe('5 items');
            expect(t('keyWithCount', { count: 100 })).toBe('100 items');

            done();
        });

        it('check languages with multiple plurals', async done => {
            // uses `arabic` which has 5 plural forms beside the singular.
            // https://www.i18next.com/translation-function/plurals#languages-with-multiple-plurals
            const t = await i18next.init({
                lng: 'ar',
                resources: {
                    ar: {
                        translation: {
                            key_0: 'zero',
                            key_1: 'singular',
                            key_2: 'two',
                            key_3: 'few',
                            key_4: 'many',
                            key_5: 'other',
                        },
                    },
                },
            });

            expect(t('key', { count: 0 })).toBe('zero');
            expect(t('key', { count: 1 })).toBe('singular');
            expect(t('key', { count: 2 })).toBe('two');
            expect(t('key', { count: 3 })).toBe('few');
            expect(t('key', { count: 4 })).toBe('few');
            expect(t('key', { count: 5 })).toBe('few');
            expect(t('key', { count: 11 })).toBe('many');
            expect(t('key', { count: 99 })).toBe('many');
            expect(t('key', { count: 100 })).toBe('other');

            done();
        });
    });

    describe('Nesting', () => {
        it('check basic', async done => {
            const t = await i18next.init({
                lng: 'en-US',
                resources: {
                    en: {
                        translation: {
                            nesting1: '1 $t(nesting2)',
                            nesting2: '2 $t(nesting3)',
                            nesting3: '3',
                        },
                    },
                },
            });

            expect(t('nesting1')).toBe('1 2 3');

            done();
        });

        it('check passing options to nestings', async done => {
            const t = await i18next.init({
                lng: 'en-US',
                resources: {
                    en: {
                        translation: {
                            girlsAndBoys: '$t(girls, {"count": {{girls}} }) and {{count}} boy',
                            girlsAndBoys_plural: '$t(girls, {"count": {{girls}} }) and {{count}} boys',
                            girls: '{{count}} girl',
                            girls_plural: '{{count}} girls',
                        },
                    },
                },
            });

            expect(t('girlsAndBoys', { count: 2, girls: 3 })).toBe('3 girls and 2 boys');

            done();
        });

        it('check passing nesting to interpolated', async done => {
            const t = await i18next.init({
                lng: 'en-US',
                resources: {
                    en: {
                        translation: {
                            key1: 'hello world',
                            key2: 'say: {{val}}',
                        },
                    },
                },
            });

            expect(t('key2', { val: '$t(key1)' })).toBe('say: hello world');

            done();
        });
    });

    describe('Context', () => {
        it('check basic', async done => {
            const t = await i18next.init({
                lng: 'en-US',
                resources: {
                    en: {
                        translation: {
                            friend: 'A friend',
                            friend_male: 'A boyfriend',
                            friend_female: 'A girlfriend',
                        },
                    },
                },
            });

            expect(t('friend')).toBe('A friend');
            expect(t('friend', { context: 'male' })).toBe('A boyfriend');
            expect(t('friend', { context: 'female' })).toBe('A girlfriend');

            done();
        });

        it('check combining with plurals', async done => {
            const t = await i18next.init({
                lng: 'en-US',
                resources: {
                    en: {
                        translation: {
                            friend_male: 'A boyfriend',
                            friend_female: 'A girlfriend',
                            friend_male_plural: '{{count}} boyfriends',
                            friend_female_plural: '{{count}} girlfriends',
                        },
                    },
                },
            });

            expect(t('friend', { context: 'male', count: 1 })).toBe('A boyfriend');
            expect(t('friend', { context: 'female', count: 1 })).toBe('A girlfriend');
            expect(t('friend', { context: 'male', count: 100 })).toBe('100 boyfriends');
            expect(t('friend', { context: 'female', count: 100 })).toBe('100 girlfriends');

            done();
        });
    });

    describe('Objects and Arrays', () => {
        it('check objects', async done => {
            const t = await i18next.init({
                lng: 'en-US',
                resources: {
                    en: {
                        translation: {
                            tree: {
                                res: 'added {{something}}',
                            },
                            array: ['a', 'b', 'c'],
                        },
                    },
                },
            });

            expect(t('tree', { returnObjects: true, something: 'gold' })).toEqual({ res: 'added gold' });
            expect(t('array', { returnObjects: true })).toEqual(['a', 'b', 'c']);

            done();
        });

        it('check arrays', async done => {
            const t = await i18next.init({
                lng: 'en-US',
                resources: {
                    en: {
                        translation: {
                            arrayJoin: [
                                'line1',
                                'line2',
                                'line3',
                            ],
                            arrayJoinWithInterpolation: [
                                'you',
                                'can',
                                '{{myVar}}',
                            ],
                            arrayOfObjects: [
                                { name: 'tom' },
                                { name: 'steve' },
                            ],
                        },
                    },
                },
            });

            expect(t('arrayJoin', { joinArrays: '+' })).toBe('line1+line2+line3');
            expect(t('arrayJoinWithInterpolation', { myVar: 'interpolate', joinArrays: ' ' })).toBe('you can interpolate');
            expect(t('arrayOfObjects.0.name')).toBe('tom');

            done();
        });
    });
});

