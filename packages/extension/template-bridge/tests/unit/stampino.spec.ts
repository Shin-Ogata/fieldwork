import { render } from '@cdp/extension-template';
import {
    type TemplateBridgeArg,
    type EvaluateTemplateResult,
    createStampinoTransformer,
    prepareTemplate,
    evaluateTemplate,
} from '@cdp/extension-template-bridge';
import type { DOM } from '@cdp/dom';
import {
    prepare,
    cleanup,
    innerHTML,
} from './tools';

describe('bridge-stampino spec', () => {
    let _$dom: DOM;

    let count: number;
    const onCallback = (...args: unknown[]): void => { // eslint-disable-line @typescript-eslint/no-unused-vars
        count++;
    };

    beforeEach(() => {
        count = 0;
        _$dom = prepare();
    });

    afterEach(() => {
        cleanup();
    });

    const convert = createStampinoTransformer();

    type Updater = (view?: TemplateBridgeArg) => DOM;

    class TemplateEngine {
        static compile(template: HTMLTemplateElement | string): Updater {
            const tag = convert(template);
            const refresh = (view?: TemplateBridgeArg): DOM => {
                render(tag(view), _$dom[0]);
                return _$dom;
            };
            return refresh;
        }
    }

    describe('basic', () => {
        it('No bindings', () => {
            const template = document.createElement('template');
            template.innerHTML = '<h1>Hello</h1>';
            const jst = TemplateEngine.compile(template);
            const out = jst();
            expect(innerHTML(out)).toBe('<h1>Hello</h1>');
        });

        it('Text binding', () => {
            const template = document.createElement('template');
            template.innerHTML = 'Hello {{ name }}';
            const jst = TemplateEngine.compile(template);
            const out = jst({ name: 'World' });
            expect(innerHTML(out)).toBe('Hello World');
        });

        it('Text binding in element', () => {
            const template = document.createElement('template');
            template.innerHTML = '<h1>Hello {{ name.toUpperCase() }}!</h1>';
            const jst = TemplateEngine.compile(template);
            const out = jst({ name: 'World' });
            expect(innerHTML(out)).toBe('<h1>Hello WORLD!</h1>');
        });

        it('Text binding after element', () => {
            const template = document.createElement('template');
            template.innerHTML = '<p>A</p>{{ x }}';
            const jst = TemplateEngine.compile(template);
            const out = jst({ x: 'B' });
            expect(innerHTML(out)).toBe('<p>A</p>B');
        });

        it('Text binding after element x 2', () => {
            const template = document.createElement('template');
            template.innerHTML = '<p>A</p>{{ x }}{{ y }}';
            const jst = TemplateEngine.compile(template);
            const out = jst({ x: 'B', y: 'C' });
            expect(innerHTML(out)).toBe('<p>A</p>BC');
        });

        it('Text bindings before and after element', () => {
            const template = document.createElement('template');
            template.innerHTML = '<div>{{ a }}<p>{{ b }}</p>{{ c }}</div>';
            const jst = TemplateEngine.compile(template);
            const out = jst({ a: 'A', b: 'B', c: 'C' });
            expect(innerHTML(out)).toBe('<div>A<p>B</p>C</div>');
        });

        it('Attribute binding', () => {
            const template = document.createElement('template');
            template.innerHTML = '<p class="{{ x }}"></p>';
            const jst = TemplateEngine.compile(template);
            const out = jst({ x: 'foo' });
            expect(innerHTML(out)).toBe('<p class="foo"></p>');
        });

        it('Multiple attribute bindings', () => {
            const template = document.createElement('template');
            template.innerHTML = '<p class="A {{ b }} C {{ d }}"></p>';
            const jst = TemplateEngine.compile(template);
            const out = jst({ b: 'B', d: 'D' });
            expect(innerHTML(out)).toBe('<p class="A B C D"></p>');
        });

        it('Boolean attribute binding', () => {
            const template = document.createElement('template');
            template.innerHTML = '<p ?disabled="{{ x }}"></p>';
            const jst = TemplateEngine.compile(template);
            const out = jst({ x: false });
            expect(innerHTML(out)).toBe('<p></p>');
        });

        it('Event binding', () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const template = document.createElement('template');
            template.innerHTML = '<p @click="{{ handleClick }}">';
            const jst = TemplateEngine.compile(template);
            const out = jst({ handleClick: stub.onCallback });
            out.find('p').click();
            expect(innerHTML(out)).toBe('<p></p>');
            expect(stub.onCallback).toHaveBeenCalled();
            expect(count).toBe(1);
        });

        it('Event binding w/ dashed names', () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const template = document.createElement('template');
            // ※ `foo--bar` dashed name (chain case) は `--` 続きで指定.
            template.innerHTML = '<p @foo--bar="{{ handleClick }}">';
            const jst = TemplateEngine.compile(template);
            const out = jst({ handleClick: stub.onCallback });
            const ev  = new Event('foo-bar');
            out.find('p')[0].dispatchEvent(ev);
            expect(innerHTML(out)).toBe('<p></p>');
            expect(stub.onCallback).toHaveBeenCalledWith(ev);
            expect(count).toBe(1);
        });

        it('Event binding w/ camelCase names', () => {
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const template = document.createElement('template');
            // ※ `foo-bar` `-` は camelCase に変換.
            template.innerHTML = '<p @foo-bar="{{ handleClick }}">';
            const jst = TemplateEngine.compile(template);
            const out = jst({ handleClick: stub.onCallback });
            const ev  = new Event('fooBar');
            out.find('p')[0].dispatchEvent(ev);
            expect(innerHTML(out)).toBe('<p></p>');
            expect(stub.onCallback).toHaveBeenCalledWith(ev);
            expect(count).toBe(1);
        });

        it('if template, true', () => {
            const template = document.createElement('template');
            template.innerHTML = '<template type="if" if="{{true}}">{{s}}</template>';
            const jst = TemplateEngine.compile(template);
            const out = jst({ s: 'Hello' });
            expect(innerHTML(out)).toBe('Hello');
        });

        it('if template, false', () => {
            const template = document.createElement('template');
            template.innerHTML = '<template type="if" if="{{c}}">{{s}}</template>';
            const jst = TemplateEngine.compile(template);
            const out = jst({ c: false, s: 'Hello' });
            expect(innerHTML(out)).toBe('');
        });

        it('repeat template', () => {
            const template = document.createElement('template');
            template.innerHTML = '<template type="repeat" repeat="{{ items }}"><p>{{ item }}{{ x }}</p></template>';
            const jst = TemplateEngine.compile(template);
            const out = jst({ items: [4, 5, 6], x: 'X' });
            expect(innerHTML(out)).toBe('<p>4X</p><p>5X</p><p>6X</p>');
        });

        it('nullable model access', () => {
            const template = document.createElement('template');
            template.innerHTML = `{{nullable.missing.property || 'none'}}`;
            const jst = TemplateEngine.compile(template);
            let out = jst({ nullable: null });
            expect(innerHTML(out)).toBe('none');
            out = jst({ nullable: { missing: { property: 'something' } } });
            expect(innerHTML(out)).toBe('something');
        });

        it('named blocks with fallback', () => {
            const template = document.createElement('template');
            template.innerHTML = '<p>A</p><template name="B">{{ b }}</template><template name="C">C</template>';
            const templateFn = prepareTemplate(template);
            render(templateFn({ b: 'B' }), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('<p>A</p>BC');
        });

        // not supported v0.6.2
        xit('named blocks with provided renderer', () => {
            const bTemplate = document.createElement('template');
            bTemplate.innerHTML = '<p>{{ b }}</p>';
            const bTemplateFn = prepareTemplate(bTemplate);

            const template = document.createElement('template');
            template.innerHTML = `<p>A</p><template name="B">{{ b }}</template><template name="C">C</template>`;
            const templateFn = prepareTemplate(template, undefined, {
                B: (model) => {
                    return bTemplateFn(model);
                },
            });

            render(templateFn({ b: 'B' }), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('<p>A</p><p>B</p>C');
        });

        it('implicit super template call', () => {
            const superTemplate = document.createElement('template');
            superTemplate.innerHTML = '<p>A</p><template name="B">B</template><template name="C">C</template>';

            const subTemplate = document.createElement('template');
            subTemplate.innerHTML = `<template name="C">Z</template>`;

            const subTemplateFn = prepareTemplate(
                subTemplate,
                undefined,
                undefined,
                superTemplate
            );

            render(subTemplateFn({}), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('<p>A</p>BZ');
        });

        it('explicit super template call', () => {
            const superTemplate = document.createElement('template');
            superTemplate.innerHTML = '<p>A</p><template name="B">B</template><template name="C">C</template>';

            const subTemplate = document.createElement('template');
            subTemplate.innerHTML = `1<template name="super"><template name="C">Z</template></template>2`;

            const subTemplateFn = prepareTemplate(
                subTemplate,
                undefined,
                undefined,
                superTemplate
            );

            render(subTemplateFn({}), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('1<p>A</p>BZ2');
        });

        it('block inside if', () => {
            const superTemplate = document.createElement('template');
            superTemplate.innerHTML = '<template type="if" if="{{ true }}"><template name="A"></template></template>';

            const subTemplate = document.createElement('template');
            subTemplate.innerHTML = `<template name="A">{{ a }}</template>`;

            const subTemplateFn = prepareTemplate(
                subTemplate,
                undefined,
                undefined,
                superTemplate
            );

            render(subTemplateFn({ a: 'A' }), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('A');
        });

        it('nested blocks, override inner', () => {
            const superTemplate = document.createElement('template');
            superTemplate.innerHTML = '<template name="A">A<template name="B">B</template>C</template>';

            const subTemplate = document.createElement('template');
            subTemplate.innerHTML = `<template name="B">{{ b }}</template>`;

            const subTemplateFn = prepareTemplate(
                subTemplate,
                undefined,
                undefined,
                superTemplate
            );

            render(subTemplateFn({ b: 'Z' }), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('AZC');
        });

        it('nested blocks, override outer', () => {
            const superTemplate = document.createElement('template');
            superTemplate.innerHTML = '<template name="A">A<template name="B">B</template>C</template>';

            const subTemplate = document.createElement('template');
            subTemplate.innerHTML = `<template name="A">{{ a }}</template>`;

            const subTemplateFn = prepareTemplate(
                subTemplate,
                undefined,
                undefined,
                superTemplate
            );

            render(subTemplateFn({ a: 'Z' }), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('Z');
        });
    });

    describe('advanced', () => {
        it('extensibility', () => {
            const template = document.createElement('template');
            template.innerHTML = '<h1>Do I head an echo?</h1><template type="echo"> Yes, I hear an echo! </template>';
            const templateFn = prepareTemplate(
                template,
                {
                    'echo': (template, model, handlers, renderers): EvaluateTemplateResult[] => {
                        return [
                            evaluateTemplate(template, model, handlers, renderers),
                            evaluateTemplate(template, model, handlers, renderers),
                        ];
                    },
                }
            );
            render(templateFn(), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('<h1>Do I head an echo?</h1> Yes, I hear an echo!  Yes, I hear an echo!');
        });

        it('createTemplateFunction(string)', () => {
            const templateFn = convert('<p>A</p><template name="B">{{ b }}</template><template name="C">C</template>');
            render(templateFn({ b: 'B' }), _$dom[0]);
            expect(innerHTML(_$dom)).toBe('<p>A</p>BC');
        });

        it('createTemplateFunction(invalid)', () => {
            expect(() => {
                convert(null!);
            }).toThrow(new TypeError(`Type of template is not a valid. [typeof: object]`));
        });
    });
});
