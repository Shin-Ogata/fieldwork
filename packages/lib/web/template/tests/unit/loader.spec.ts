import {
    getTemplate,
    clearTemplateCache,
    render,
} from '@cdp/template';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
import { prepare, cleanup } from './tools';

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
                expect('UNEXPECTED FLOW').toBeNull();
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
                expect('UNEXPECTED FLOW').toBeNull();
            } catch (e) {
                expect(e instanceof TypeError).toBe(true);
                expect(e.message).toBe('[type: typo] is unknown.');
            }
        });
    });
});
