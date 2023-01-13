import {
    TemplateBridge,
    TransformConfig,
    TemplateTransformer,
    render,
    html,
    directives,
    transformer,
    createMustacheTransformer,
} from '@cdp/template';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
import {
    prepare,
    cleanup,
    innerHTML,
} from './tools';

describe('template/bridge spec', () => {
    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    const mustache = `
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
`;

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

    it('check basic usecase', () => {
        const template = TemplateBridge.compile(mustache);
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

    it('check builtin access', () => {
        expect(TemplateBridge.builtins).toEqual(['mustache', 'stampino']);
        expect(TemplateBridge.getBuitinTransformer('mustache')).toBeDefined();
        expect(TemplateBridge.getBuitinTransformer('stampino')).toBeDefined();
        expect(TemplateBridge.getBuitinTransformer('invalid')).not.toBeDefined();
    });

    it('check from HTMLTemplateElement', () => {
        const el = document.createElement('template');
        el.innerHTML = '{{#bool}}Show{{/bool}}';
        const template = TemplateBridge.compile(el);
        render(template({ bool: true }), _$dom[0]);
        expect(_$dom.text()).toBe('Show');
    });

    describe('custom transformer', () => {
        const {
            variable,
            unsafeVariable,
            section,
            invertedSection,
            comment,
            customDelimiter,
        } = transformer;

        const customTransformer = createMustacheTransformer({
            html,
            transformVariable: variable,
            transformers: {
                unsafeVariable: unsafeVariable(directives.unsafeHTML),
                section: section(),
                invertedSection: invertedSection(),
                comment: comment(),
                customDelimiter: customDelimiter(),

                customUnescapedVariable: {
                    test: remainingTmplStr => '&' === remainingTmplStr[0],
                    transform: (remainingTmplStr: string, config: TransformConfig) => {
                        return config?.transformers?.unsafeVariable.transform(insert3rdBraceForUnsaveVariable(remainingTmplStr), config);
                        function insert3rdBraceForUnsaveVariable(remainingTmplStr: string): string {
                            const i = remainingTmplStr.indexOf(config?.delimiter?.end as string);
                            return `${remainingTmplStr.substring(0, i)}}${remainingTmplStr.substring(i)}`;
                        }
                    },
                },
            },
        });

        let oldTransformer: TemplateTransformer;

        beforeEach(() => {
            oldTransformer = TemplateBridge.setTransformer(customTransformer);
        });

        afterEach(() => {
            TemplateBridge.setTransformer(oldTransformer);
        });

        it('check custom transformer', () => {
            const template = TemplateBridge.compile(mustache);
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
    });

    describe('stampino transformer', () => {
        const stampino = TemplateBridge.getBuitinTransformer('stampino') as TemplateTransformer;
        let oldTransformer: TemplateTransformer;

        beforeEach(() => {
            oldTransformer = TemplateBridge.setTransformer(stampino);
        });

        afterEach(() => {
            TemplateBridge.setTransformer(oldTransformer);
        });

        it('repeat template', () => {
            const template = TemplateBridge.compile('<template type="repeat" repeat="{{ items }}"><p>{{ item }}{{ x }}</p></template>');
            render(template({ items: [4, 5, 6], x: 'X' }), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('<p>4X</p><p>5X</p><p>6X</p>');
        });
    });
});
