import {
    TemplateBridge,
    getTemplate,
    clearTemplateCache,
    render,
} from '@cdp/template';
import {
    type DOM,
    dom as $,
} from '@cdp/dom';
import {
    initializeI18N,
    changeLanguage,
    t,
} from '@cdp/i18n';
import {
    prepare,
    cleanup,
    ensureCleanI18N,
} from './tools';

describe('loader spec', () => {
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
        clearTemplateCache();
    });

    const params = {
        families: [
            {
                surname: 'Jones',
                members: [
                    {
                        given: 'Jim',
                        age: '<b>44</b>',
                    },
                    {
                        given: 'John',
                        age: '<b>34</b>',
                    },
                    {
                        given: 'Jill',
                        age: '<b>24</b>',
                    }
                ]
            },
            {
                surname: 'Smith',
                members: [
                    {
                        given: 'Steve',
                        age: '<b>34</b>',
                    },
                    {
                        given: 'Sally',
                        age: '<b>33</b>',
                    }
                ]
            },
        ],
    };

    it('check getTemplate() w/ engine', async () => {
        _$dom = $('#d1');
        const template = await getTemplate('#test-mustache', {
            url: '../../.temp/res/template/test.tpl',
        });
        _$dom.append(template(params));

        const $families = _$dom.children().children();
        expect($families.length).toBe(2);

        {
            const $Jones = $($families[0]);
            expect($Jones.find('.surname').text()).toBe('Jones');

            const $names = $Jones.find('.given');
            expect($names.length).toBe(3);
            expect($names[0].textContent).toBe('Jim');
            expect($names[1].textContent).toBe('John');
            expect($names[2].textContent).toBe('Jill');

            const $ages = $Jones.find('.age');
            expect($ages.length).toBe(3);
            expect($ages[0].textContent).toBe('44');
            expect($ages[1].textContent).toBe('34');
            expect($ages[2].textContent).toBe('24');
        }

        {
            const $Smith = $($families[1]);
            expect($Smith.find('.surname').text()).toBe('Smith');

            const $names = $Smith.find('.given');
            expect($names.length).toBe(2);
            expect($names[0].textContent).toBe('Steve');
            expect($names[1].textContent).toBe('Sally');

            const $ages = $Smith.find('.age');
            expect($ages.length).toBe(2);
            expect($ages[0].textContent).toBe('34');
            expect($ages[1].textContent).toBe('33');
        }
    });

    it('check getTemplate() w/ engine & template', async () => {
        _$dom = $('#d1');
        const template = await getTemplate('#test-mustache-template', {
            url: '../../.temp/res/template/test.tpl',
        });
        _$dom.append(template(params));

        const $families = _$dom.children().children();
        expect($families.length).toBe(2);

        {
            const $Jones = $($families[0]);
            expect($Jones.find('.surname').text()).toBe('Jones');

            const $names = $Jones.find('.given');
            expect($names.length).toBe(3);
            expect($names[0].textContent).toBe('Jim');
            expect($names[1].textContent).toBe('John');
            expect($names[2].textContent).toBe('Jill');

            const $ages = $Jones.find('.age');
            expect($ages.length).toBe(3);
            expect($ages[0].textContent).toBe('44');
            expect($ages[1].textContent).toBe('34');
            expect($ages[2].textContent).toBe('24');
        }

        {
            const $Smith = $($families[1]);
            expect($Smith.find('.surname').text()).toBe('Smith');

            const $names = $Smith.find('.given');
            expect($names.length).toBe(2);
            expect($names[0].textContent).toBe('Steve');
            expect($names[1].textContent).toBe('Sally');

            const $ages = $Smith.find('.age');
            expect($ages.length).toBe(2);
            expect($ages[0].textContent).toBe('34');
            expect($ages[1].textContent).toBe('33');
        }
    });

    it('check getTemplate() w/ bridge', async () => {
        const template = await getTemplate('#test-mustache', {
            type: 'bridge',
            url: '../../.temp/res/template/test.tpl',
        });
        render(template(params), _$dom[0]);

        const $families = _$dom.children().children();
        expect($families.length).toBe(2);

        {
            const $Jones = $($families[0]);
            expect($Jones.find('.surname').text()).toBe('Jones');

            const $names = $Jones.find('.given');
            expect($names.length).toBe(3);
            expect($names[0].textContent).toBe('Jim');
            expect($names[1].textContent).toBe('John');
            expect($names[2].textContent).toBe('Jill');

            const $ages = $Jones.find('.age');
            expect($ages.length).toBe(3);
            expect($ages[0].textContent).toBe('');
            expect($ages[1].textContent).toBe('');
            expect($ages[2].textContent).toBe('');
        }

        {
            const $Smith = $($families[1]);
            expect($Smith.find('.surname').text()).toBe('Smith');

            const $names = $Smith.find('.given');
            expect($names.length).toBe(2);
            expect($names[0].textContent).toBe('Steve');
            expect($names[1].textContent).toBe('Sally');

            const $ages = $Smith.find('.age');
            expect($ages.length).toBe(2);
            expect($ages[0].textContent).toBe('');
            expect($ages[1].textContent).toBe('');
        }
    });

    it('check getTemplate() w/ bridge, cache case', async () => {
        void await getTemplate('#test-mustache', {
            type: 'bridge',
            url: '../../.temp/res/template/test.tpl',
        });

        const template = await getTemplate('#test-mustache', {
            type: 'bridge',
            url: '../../.temp/res/template/test.tpl',
        });
        render(template(params), _$dom[0]);

        const $families = _$dom.children().children();
        expect($families.length).toBe(2);

        {
            const $Jones = $($families[0]);
            expect($Jones.find('.surname').text()).toBe('Jones');

            const $names = $Jones.find('.given');
            expect($names.length).toBe(3);
            expect($names[0].textContent).toBe('Jim');
            expect($names[1].textContent).toBe('John');
            expect($names[2].textContent).toBe('Jill');

            const $ages = $Jones.find('.age');
            expect($ages.length).toBe(3);
            expect($ages[0].textContent).toBe('');
            expect($ages[1].textContent).toBe('');
            expect($ages[2].textContent).toBe('');
        }

        {
            const $Smith = $($families[1]);
            expect($Smith.find('.surname').text()).toBe('Smith');

            const $names = $Smith.find('.given');
            expect($names.length).toBe(2);
            expect($names[0].textContent).toBe('Steve');
            expect($names[1].textContent).toBe('Sally');

            const $ages = $Smith.find('.age');
            expect($ages.length).toBe(2);
            expect($ages[0].textContent).toBe('');
            expect($ages[1].textContent).toBe('');
        }
    });

    it('check getTemplate() w/ bridge in current html', async () => {
        _$dom = $('#d1');
        _$dom.append(`
<script type="text/template" id="test-mustache">
    <ul>
        {{#families}}
        <li><span class="surname">{{surname}}</span>
            <ul>
                {{#members}}
                <li><span class="given">{{given}}</span></li>
                <li><span class="age">{{&age}}</span></li>
                {{/members}}
            </ul>
        </li>
        {{/families}}
    </ul>
</script>
`);

        const template = await getTemplate('#test-mustache', {
            type: 'bridge',
        });
        render(template(params), _$dom[0]);

        const $families = _$dom.children().children();
        expect($families.length).toBe(2);

        {
            const $Jones = $($families[0]);
            expect($Jones.find('.surname').text()).toBe('Jones');

            const $names = $Jones.find('.given');
            expect($names.length).toBe(3);
            expect($names[0].textContent).toBe('Jim');
            expect($names[1].textContent).toBe('John');
            expect($names[2].textContent).toBe('Jill');

            const $ages = $Jones.find('.age');
            expect($ages.length).toBe(3);
            expect($ages[0].textContent).toBe('');
            expect($ages[1].textContent).toBe('');
            expect($ages[2].textContent).toBe('');
        }

        {
            const $Smith = $($families[1]);
            expect($Smith.find('.surname').text()).toBe('Smith');

            const $names = $Smith.find('.given');
            expect($names.length).toBe(2);
            expect($names[0].textContent).toBe('Steve');
            expect($names[1].textContent).toBe('Sally');

            const $ages = $Smith.find('.age');
            expect($ages.length).toBe(2);
            expect($ages[0].textContent).toBe('');
            expect($ages[1].textContent).toBe('');
        }
    });

    describe('error case', () => {
        it('check uri error', async () => {
            try {
                void await getTemplate('#test-typo', {
                    type: 'bridge',
                    url: '../../.temp/res/template/test.tpl',
                });
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e instanceof URIError).toBe(true);
                expect(e.message).toBe('cannot specified template resource. { selector: #test-typo,  url: ../../.temp/res/template/test.tpl }');
            }
        });

        it('check type error', async () => {
            try {
                void await getTemplate('#test-mustache', {
                    type: 'typo',
                    url: '../../.temp/res/template/test.tpl',
                } as any); // eslint-disable-line
                fail('UNEXPECTED FLOW');
            } catch (e) {
                expect(e instanceof TypeError).toBe(true);
                expect(e.message).toBe('[type: typo] is unknown.');
            }
        });
    });

    describe('localize', () => {
        it('handle callback', async () => {
            ensureCleanI18N();
            await initializeI18N({
                lng: 'ja-JP',
                fallbackLng: 'en',
                resources: {
                    en: {
                        translation: {
                            test: {
                                title: 'Hello World',
                                description: 'Important Message',
                                nest: 'Nested Message',
                                messages: {
                                    msg1: 'first',
                                    msg2: 'second',
                                }
                            },
                        },
                    },
                    ja: {
                        translation: {
                            test: {
                                title: 'こんにちは、世界',
                                description: '重要なメッセージ',
                                nest: 'ネストされたメッセージ',
                                messages: {
                                    msg1: 'ひとつめ',
                                    msg2: 'ふたつめ',
                                }
                            },
                        },
                    },
                },
                lowerCaseLng: true,
            });

            _$dom = $('#d1');

            const templateJA = await getTemplate('#test-stampino-template', {
                url: '../../.temp/res/template/test.tpl',
                type: 'bridge',
                transformer: TemplateBridge.getBuitinTransformer('stampino'),
                callback: (src: HTMLTemplateElement) => {
                    $(src).localize();
                    return src;
                },
            });

            render(templateJA({ important: true, nest: true, messages: [{ text: t('test.messages.msg1') }, { text: t('test.messages.msg2') }] }), _$dom[0]);
            expect(_$dom.find('.title').text()).toBe('こんにちは、世界');
            expect(_$dom.find('.important').text()).toBe('重要なメッセージ');
            expect(_$dom.find('.message')[0].textContent).toBe('ひとつめ');
            expect(_$dom.find('.message')[1].textContent).toBe('ふたつめ');
            expect(_$dom.find('.nest').text()).toBe('ネストされたメッセージ');

            { // 一度 DOM を完全に破棄する
                cleanup();
                clearTemplateCache();
                await changeLanguage('en');
                prepare();
            }

            _$dom = $('#d1');

            const templateEN = await getTemplate('#test-stampino-template', {
                url: '../../.temp/res/template/test.tpl',
                type: 'bridge',
                transformer: TemplateBridge.getBuitinTransformer('stampino'),
                callback: (src: HTMLTemplateElement) => {
                    $(src).localize();
                    return src;
                },
            });

            render(templateEN({ important: true, nest: true, messages: [{ text: t('test.messages.msg1') }, { text: t('test.messages.msg2') }] }), _$dom[0]);
            expect(_$dom.find('.title').text()).toBe('Hello World');
            expect(_$dom.find('.important').text()).toBe('Important Message');
            expect(_$dom.find('.message')[0].textContent).toBe('first');
            expect(_$dom.find('.message')[1].textContent).toBe('second');
            expect(_$dom.find('.nest').text()).toBe('Nested Message');
        });
    });
});
