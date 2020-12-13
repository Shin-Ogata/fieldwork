import {
    TemplateBridge,
    TransformConfig,
    TemplateTransformer,
    render,
    html,
    directives,
    transformer,
    createTransformFactory,
} from '@cdp/template';
import {
    DOM,
    dom as $,
} from '@cdp/dom';
import { prepare, cleanup } from './tools';

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

    describe('custom transformer', () => {
        const {
            variable,
            unsafeVariable,
            section,
            invertedSection,
            comment,
            customDelimiter,
        } = transformer;

        const customTransformer = createTransformFactory({
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
});
