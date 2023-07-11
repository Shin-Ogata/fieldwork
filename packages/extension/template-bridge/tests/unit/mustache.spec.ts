import {
    render,
    html,
    directives,
} from '@cdp/extension-template';
import {
    TemplateBridgeArg,
    TransformConfig,
    createMustacheTransformer,
    transformer,
} from '@cdp/extension-template-bridge';
import { DOM } from '@cdp/dom';
import {
    prepare,
    cleanup,
    innerHTML,
} from './tools';

describe('bridge-mustache spec', () => {

    let _$dom: DOM;

    beforeEach(() => {
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    it('check instance', () => {
        expect(createMustacheTransformer).toBeDefined();
        expect(transformer).toBeDefined();
    });

    describe('basic', () => {
        const convert = createMustacheTransformer(html, directives.unsafeHTML);

        type Updater = (view?: TemplateBridgeArg) => DOM;

        class TemplateEngine {
            static compile(template: string | HTMLTemplateElement): Updater {
                const tag = convert(template);
                const refresh = (view?: TemplateBridgeArg): DOM => {
                    render(tag(view), _$dom[0]);
                    return _$dom;
                };
                return refresh;
            }
        }

        it('check basic', () => {
            const jst = TemplateEngine.compile('{{title}} spends {{calc}}');
            expect(jst).toBeDefined();

            const out = jst({ title: 'Joe', calc: 6 });
            expect(out.text()).toBe('Joe spends 6');
        });

        it('check function (unsupported: specification)', () => {
            const jst = TemplateEngine.compile('{{title}} spends {{calc}}');
            expect(jst).toBeDefined();

            const out = jst({ title: 'Joe', calc: () => 2 + 4 });
            expect(out.text()).toBe('Joe spends () => 2 + 4');
        });

        it('check escape / unescape', () => {
            const jst = TemplateEngine.compile(`
* {{name}}
* {{age}}
* {{company}}
* {{{company}}}
* {{&company}}
{{=<% %>=}}
* {{company}}
<%={{ }}=%>
`);
            // '&' は非サポート, trim ロジックは異なる. DOM から取得する文字列と比較しているので直感と異なるが正しい.
            const validater = `* Chris
* 
* <b>GitHub</b>
* GitHub
* 

* {{company}}`;
            const out = jst({
                name: 'Chris',
                company: '<b>GitHub</b>'
            });

            expect(out.text()).toBe(validater);
        });

        it('check dot notation', () => {
            const jst = TemplateEngine.compile(`
* {{name.first}} {{name.last}}
* {{age}}
`);
            const validater = `* Michael Jackson
* RIP`;
            const out = jst({
                name: {
                    first: 'Michael',
                    last: 'Jackson',
                },
                age: 'RIP',
            });

            expect(out.text()).toBe(validater);
        });

        it('check dot notation with primitive', () => {
            const jst = TemplateEngine.compile(`
* {{name.first}} {{name.last}}
* {{age}}
* {{alive}}
`);
            const validater = `* Michael Jackson
* 50
* false`;
            const out = jst({
                name: {
                    first: 'Michael',
                    last: 'Jackson',
                },
                age: 50,
                alive: false,
            });

            expect(out.text()).toBe(validater);
        });

        it('check section', () => {
            const jst = TemplateEngine.compile(`
Shown.
{{#person}}
Never shown!
{{/person}}
`);
            const validater = `Shown.`;
            const out = jst({
                person: false
            });

            expect(out.text()).toBe(validater);
        });

        it('check section boolean=true', () => {
            const jst = TemplateEngine.compile(`{{#bool}}Show{{/bool}}`);
            const validater = `Show`;
            const out = jst({
                bool: true
            });
            expect(out.text()).toBe(validater);
        });

        it('check section function (unsupported: specification)', () => {
            const jst = TemplateEngine.compile(`{{#func}}from func{{/func}}`);
            const validater = `from func`;
            const out = jst({
                func() { return false; } // not evaluate
            });
            expect(out.text()).toBe(validater);
        });

        it('check section nest', () => {
            const jst = TemplateEngine.compile(`
<ul>
    {{#families}}
    <li>{{surname}}
        <ul>
            {{#members}}
            <li>{{given}}</li>
            {{/members}}
        </ul>
    </li>
    {{/families}}
</ul>
`);
            const out = jst({
                families: [
                    {
                        surname: 'Jones',
                        members: [
                            { given: 'Jim' },
                            { given: 'John' },
                            { given: 'Jill' }
                        ]
                    },
                    {
                        surname: 'Smith',
                        members: [
                            { given: 'Steve' },
                            { given: 'Sally' }
                        ]
                    },
                ],
            });

            const $li = out.children().children();
            expect($li.length).toBe(2);
            const $jones = $li.first();
            const $smith = $li.last();

            expect($jones.text().startsWith('Jones')).toBe(true);
            const $mem1 = $jones.find('li');
            expect($mem1.length).toBe(3);
            expect($mem1[0].textContent?.startsWith('Jim')).toBe(true);
            expect($mem1[1].textContent?.startsWith('John')).toBe(true);
            expect($mem1[2].textContent?.startsWith('Jill')).toBe(true);

            expect($smith.text().startsWith('Smith')).toBe(true);
            const $mem2 = $smith.find('li');
            expect($mem2.length).toBe(2);
            expect($mem2[0].textContent?.startsWith('Steve')).toBe(true);
            expect($mem2[1].textContent?.startsWith('Sally')).toBe(true);
        });

        it('check non-empty lists', () => {
            const jst = TemplateEngine.compile(`
{{#stooges}}
<b>{{name}}</b>
{{/stooges}}
`);
            const validater = `Moe

Larry

Curly`;
            const out = jst({
                stooges: [
                    { name: 'Moe' },
                    { name: 'Larry' },
                    { name: 'Curly' },
                ],
            });

            expect(out.text()).toBe(validater);
        });

        it('check "." for string array', () => {
            const jst = TemplateEngine.compile(`
{{#musketeers}}
* {{{.}}}
{{/musketeers}}
`);
            const validater = `* Athos

* Aramis

* Porthos

* D'Artagnan`;
            const out = jst({
                musketeers: [
                    'Athos',
                    'Aramis',
                    'Porthos',
                    `D'Artagnan`,
                ],
            });

            expect(out.text()).toBe(validater);
        });

        it('check inverted sections', () => {
            const jst = TemplateEngine.compile(`
{{#repos}}<b>{{name}}</b>{{/repos}}
{{^repos}}No repos :({{/repos}}
`);
            const validater = 'exists';
            const out = jst({
                repos: [{ name: 'exists' }],
            });

            expect(out.text()).toBe(validater);
        });

        it('check comment', () => {
            const jst = TemplateEngine.compile(`
<h1>Today{{! ignore me }}.</h1>
`);
            const validater = `Today.`;
            const out = jst();

            expect(out.text()).toBe(validater);
        });

        it('check primitive prop', () => {
            const jst = TemplateEngine.compile(`string length is {{name.length}}`);
            const validater = `string length is 5`;
            const out = jst({ name: 'hello' });
            expect(out.text()).toBe(validater);
        });

        it('check empty', () => {
            const jst = TemplateEngine.compile(``);
            const validater = ``;
            const out = jst();
            expect(out.text()).toBe(validater);
        });

        it('check from HTMLTemplateElement', () => {
            const template = document.createElement('template');
            template.innerHTML = '{{#bool}}Show{{/bool}}';
            const jst = TemplateEngine.compile(template);
            const out = jst({ bool: true });
            expect(innerHTML(out)).toBe('Show');
        });

        describe('need investigate', () => {
            it('check section object (unsupported: need investigate)', () => {
                const jst = TemplateEngine.compile(`{{#person}}{{name}}:{{age}}{{/person}}`);
                const validater = ':'; // `Max:22`;
                const out = jst({
                    person: { name: 'Max', age: 22 }
                });
                expect(out.text()).toBe(validater);
            });

            it('check inverted sections none (unsupported: need investigate)', () => {
                const jst = TemplateEngine.compile(`
{{#repos}}<b>{{name}}</b>{{/repos}}
{{^repos}}No repos :({{/repos}}
`);
                const validater = ''; // `No repos :(`;
                const out = jst({
                    repos: [],
                });

                expect(out.text()).toBe(validater);
            });
        });
    });

    describe('custom', () => {
        const {
            variable,
            unsafeVariable,
            section,
            invertedSection,
            comment,
            customDelimiter,
        } = transformer;

        const convert = createMustacheTransformer({
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
                            const i = remainingTmplStr.indexOf(config?.delimiter?.end!); // eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
                            return `${remainingTmplStr.substring(0, i)}}${remainingTmplStr.substring(i)}`;
                        }
                    },
                },
            },
        });

        type Updater = (view?: TemplateBridgeArg) => DOM;

        class TemplateEngine {
            static compile(template: string): Updater {
                const tag = convert(template);
                const refresh = (view?: TemplateBridgeArg): DOM => {
                    render(tag(view), _$dom[0]);
                    return _$dom;
                };
                return refresh;
            }
        }

        it('check escape / unescape', () => {
            const jst = TemplateEngine.compile(`
* {{name}}
* {{age}}
* {{company}}
* {{{company}}}
* {{&company}}
{{=<% %>=}}
* {{company}}
<%={{ }}=%>
`);
            // '&' をサポート
            const validater = `* Chris
* 
* <b>GitHub</b>
* GitHub
* GitHub

* {{company}}`;
            const out = jst({
                name: 'Chris',
                company: '<b>GitHub</b>'
            });

            expect(out.text()).toBe(validater);
        });
    });
});
