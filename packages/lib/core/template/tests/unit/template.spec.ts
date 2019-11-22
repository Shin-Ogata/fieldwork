/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion */

import { escapeHTML } from '@cdp/core-utils';
import {
    Template,
    ITemplate,
    TemplateAccessor,
} from '@cdp/template';

describe('template/template spec', () => {

    const _access = Template as ITemplate as TemplateAccessor;
    const _scanner = _access.createScanner('test');
    const _context = _access.createContext({});
    const _writer  = _access.createWriter();

    it('check basic', () => {
        const jst = Template.compile('{{title}} spends {{calc}}');
        expect(jst).toBeDefined();

        const out = jst({ title: 'Joe', calc: () => 2 + 4 });
        expect(out).toBe('Joe spends 6');
    });

    it('check escape', () => {
        const jst = Template.compile(`
* {{name}}
* {{age}}
* {{company}}
* {{{company}}}
* {{&company}}
{{=<% %>=}}
* {{company}}
<%={{ }}=%>
`);
        const validater = `
* Chris
* 
* &lt;b&gt;GitHub&lt;/b&gt;
* <b>GitHub</b>
* <b>GitHub</b>
* {{company}}
`;
        const out = jst({
            name: 'Chris',
            company: '<b>GitHub</b>'
        });

        expect(out).toBe(validater);
    });

    it('check unescape', () => {
        const jst = Template.compile(`
{{#company}}
{{{name}}}
{{/company}}
`);
        const validater = `
<b>Toyota</b>
<b>Honda</b>

`;
        const out = jst({
            company: [
                { name: '<b>Toyota</b>' },
                { name: '<b>Honda</b>' },
                { name: undefined },
            ],
        });

        expect(out).toBe(validater);
    });

    it('check dot notation', () => {
        const jst = Template.compile(`
* {{name.first}} {{name.last}}
* {{age}}
`);
        const validater = `
* Michael Jackson
* RIP
`;
        const out = jst({
            name: {
                first: 'Michael',
                last: 'Jackson',
            },
            age: 'RIP',
        });

        expect(out).toBe(validater);
    });

    it('check dot notation with primitive', () => {
        const jst = Template.compile(`
* {{name.first}} {{name.last}}
* {{age}}
* {{alive}}
`);
        const validater = `
* Michael Jackson
* 50
* false
`;
        const out = jst({
            name: {
                first: 'Michael',
                last: 'Jackson',
            },
            age: 50,
            alive: false,
        });

        expect(out).toBe(validater);
    });

    it('check section', () => {
        const jst = Template.compile(`
Shown.
{{#person}}
Never shown!
{{/person}}
`);
        const validater = `
Shown.
`;
        const out = jst({
            person: false
        });

        expect(out).toBe(validater);
    });

    it('check section boolean=true', () => {
        const jst = Template.compile(`{{#bool}}Show{{/bool}}`);
        const validater = `Show`;
        const out = jst({
            bool: true
        });
        expect(out).toBe(validater);
    });

    it('check section function', () => {
        const jst = Template.compile(`{{#func}}from func{{/func}}`);
        const validater = `from func`;
        const out = jst({
            func() { return true; }
        });
        expect(out).toBe(validater);
    });

    it('check section object', () => {
        const jst = Template.compile(`{{#person}}{{name}}:{{age}}{{/person}}`);
        const validater = `Max:22`;
        const out = jst({
            person: { name: 'Max', age: 22 }
        });
        expect(out).toBe(validater);
    });

    it('check section nest', () => {
        const jst = Template.compile(`
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
        const validater = `
<ul>
    <li>Jones
        <ul>
            <li>Jim</li>
            <li>John</li>
            <li>Jill</li>
        </ul>
    </li>
    <li>Smith
        <ul>
            <li>Steve</li>
            <li>Sally</li>
        </ul>
    </li>
</ul>
`;
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
        expect(out).toBe(validater);
    });

    it('check non-empty lists', () => {
        const jst = Template.compile(`
{{#stooges}}
<b>{{name}}</b>
{{/stooges}}
`);
        const validater = `
<b>Moe</b>
<b>Larry</b>
<b>Curly</b>
`;
        const out = jst({
            stooges: [
                { name: 'Moe' },
                { name: 'Larry' },
                { name: 'Curly' },
            ],
        });

        expect(out).toBe(validater);
    });

    it('check "." for string array', () => {
        const jst = Template.compile(`
{{#musketeers}}
* {{{.}}}
{{/musketeers}}
`);
        const validater = `
* Athos
* Aramis
* Porthos
* D'Artagnan
`;
        const out = jst({
            musketeers: [
                'Athos',
                'Aramis',
                'Porthos',
                `D'Artagnan`,
            ],
        });

        expect(out).toBe(validater);
    });

    it('check function property', () => {
        const jst = Template.compile(`
{{#beatles}}
* {{name}}
{{/beatles}}
`);
        const validater = `
* John Lennon
* Paul McCartney
* George Harrison
* Ringo Starr
`;
        const out = jst({
            beatles: [
                { firstName: 'John', lastName: 'Lennon' },
                { firstName: 'Paul', lastName: 'McCartney' },
                { firstName: 'George', lastName: 'Harrison' },
                { firstName: 'Ringo', lastName: 'Starr' },
            ],
            name() {
                return `${this.firstName} ${this.lastName}`;
            },
        });

        expect(out).toBe(validater);
    });

    it('check functions', () => {
        const jst = Template.compile(`
{{#bold}}Hi {{name}}.{{/bold}}
`);
        const validater = `
<b>Hi Tater.</b>
`;
        const out = jst({
            name: 'Tater',
            bold() {
                return (text: string, render: (src: string) => string): string => {
                    return `<b>${render(text)}</b>`;
                };
            },
        });

        expect(out).toBe(validater);
    });

    it('check functions return nil (for coverage)', () => {
        const jst = Template.compile(`{{#bold}}Hi {{name}}.{{/bold}}`);
        const validater = ``;
        const out = jst({
            name: 'Tater',
            bold() {
                return (): null => {
                    return null;
                };
            },
        });

        expect(out).toBe(validater);
    });

    it('check inverted sections', () => {
        const jst = Template.compile(`
{{#repos}}<b>{{name}}</b>{{/repos}}
{{^repos}}No repos :({{/repos}}
`);
        const validater = `
<b>exists</b>

`;
        const out = jst({
            repos: [{ name: 'exists' }],
        });

        expect(out).toBe(validater);
    });


    it('check inverted sections (none)', () => {
        const jst = Template.compile(`
{{#repos}}<b>{{name}}</b>{{/repos}}
{{^repos}}No repos :({{/repos}}
`);
        const validater = `

No repos :(
`;
        const out = jst({
            repos: [],
        });

        expect(out).toBe(validater);
    });

    it('check comment', () => {
        const jst = Template.compile(`
<h1>Today{{! ignore me }}.</h1>
`);
        const validater = `
<h1>Today.</h1>
`;
        const out = jst();

        expect(out).toBe(validater);
    });

    it('check partilas', () => {
        const jst = Template.compile(`
<h2>Names</h2>
{{#names}}
  {{> user}}
{{/names}}
`);
        const validater = `
<h2>Names</h2>
  <strong>Moe</strong>
  <strong>Larry</strong>
  <strong></strong>
  <strong></strong>
`;
        const out = jst({
            names: [
                { name: 'Moe' },
                { name: 'Larry' },
                { name: undefined },
                { name() { return null; } },
            ],
        }, {
            user: '<strong>{{name}}</strong>\n'
        });

        expect(out).toBe(validater);
    });

    it('check section partilas from function', () => {
        const jst = Template.compile(`{{> user}}`);
        const validater = `Michel`;
        const out = jst({
            names: [
                { name: 'Michel' },
            ],
        }, () => { return '{{#names}}{{name}}{{/names}}'; });
        expect(out).toBe(validater);
    });

    it('check section partilas param lack case', () => {
        const jst = Template.compile(`{{> user}}`);
        const validater = ``;
        const out = jst({
            names: [
                { name: 'Michel' },
            ],
        });
        expect(out).toBe(validater);
    });

    it('check section partilas param nil', () => {
        const jst = Template.compile(`{{> user}}`);
        const validater = ``;
        const out = jst({
            names: [
                { name: 'Michel' },
            ],
        }, () => { return null; });
        expect(out).toBe(validater);
    });

    it('check custom tags', () => {
        const jst = Template.compile('<%title%> spends <%calc%>', { tags: ['<%', '%>'] });
        const out = jst({ title: 'Joe', calc: () => 2 + 4 });
        expect(out).toBe('Joe spends 6');
    });

    it('check primitive prop', () => {
        const jst = Template.compile(`string length is {{name.length}}`);
        const validater = `string length is 5`;
        const out = jst({ name: 'hello' });
        expect(out).toBe(validater);
    });

    // ++++
    it('check empty', () => {
        const jst = Template.compile(``);
        const validater = ``;
        const out = jst();
        expect(out).toBe(validater);
    });
    // ++++

    it('check tokens', () => {
        const jst = Template.compile('{{title}} spends {{calc}}');
        expect(JSON.stringify(jst.tokens)).toBe('[["name","title",0,9],["text"," spends ",9,17],["name","calc",17,25]]');
    });

    it('check clearCache', () => {
        const jst = Template.compile('{{title}} spends {{calc}}');
        Template.clearCache();
        const out = jst({ title: 'Joe', calc: () => 2 + 4 });
        expect(out).toBe('Joe spends 6');
    });

    it('check for debug instance', () => {
        expect(_scanner).toBeDefined();
        expect(_scanner.source).toBe('test');
        expect(_context).toBeDefined();
        expect(_writer).toBeDefined();
    });

    it('check change default', () => {
        const oldWriter  = Template.setDefaultWriter(_writer);
        const oldTags    = Template.setDefaultTags(['<%', '%>']);
        const oldEscaper = Template.setDefaultEscape(escapeHTML);

        const jst = Template.compile('<%title%> spends <%calc%>', { tags: ['<%', '%>'] });
        const out = jst({ title: 'Joe', calc: () => 2 + 4 });
        expect(out).toBe('Joe spends 6');

        Template.setDefaultWriter(oldWriter);
        Template.setDefaultTags(oldTags);
        Template.setDefaultEscape(oldEscaper);
    });

    it('check invalid template input', () => {
        expect(() => Template.compile('{{title}} spends {{calc}'))
            .toThrow(new Error(`Unclosed tag at 24`));

        expect(() => Template.compile('{{title}} spends {{/title}}'))
            .toThrow(new Error(`Unopened section "title" at 17`));

        expect(() => Template.compile('{{#title}} spends {{/titl}}'))
            .toThrow(new Error(`Unclosed section "title" at 18`));

        expect(() => Template.compile('{{#title}} spends {{titl}}'))
            .toThrow(new Error(`Unclosed section "title" at 26`));

        expect(() => Template.compile({ name: 'test' } as any))
            .toThrow(new TypeError(`Invalid template! the first argument should be a "string" but "object" was given for Template.compile(template, options)`));

        expect(() => Template.compile(['array check'] as any))
            .toThrow(new TypeError(`Invalid template! the first argument should be a "string" but "array" was given for Template.compile(template, options)`));

        expect(() => Template.compile('{{=<%%>=}}'))
            .toThrow(new Error(`Invalid tags: ["<%%>"]`));
    });

    it('check internal: renderTokens', () => {
        const token = JSON.parse('[["name","title",0,9],["text"," spends ",9,17],["name","calc",17,25]]');
        const context = _access.createContext({ title: 'Joe', calc: () => 2 + 4 });
        const out = _writer.renderTokens(token, context);
        expect(out).toBe('Joe spends 6');
    });

    it('check internal: renderTokens error', () => {
        const jst = Template.compile(`{{#names}}{{> user}}{{/names}}`);
        const token = jst.tokens;
        const context = _access.createContext({
            names() {
                return () => {
                    return { name: 'test' };
                };
            },
        });
        expect(() => {
            _writer.renderTokens(token, context, { user: '{{name}}' });
        }).toThrow(new Error('Cannot use higher-order sections without the original template'));
    });
});
