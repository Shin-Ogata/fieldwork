/* eslint-disable
    @typescript-eslint/no-explicit-any,
 */

import { escapeHTML } from '@cdp/core-utils';
import {
    TemplateEngine,
    type ITemplateEngine,
    type TemplateAccessor,
} from '@cdp/core-template';

describe('template/template spec', () => {

    const _access = TemplateEngine as ITemplateEngine as TemplateAccessor;
    const _scanner = _access.createScanner('test');
    const _context = _access.createContext({});
    const _writer  = _access.createWriter();

    it('check basic', () => {
        const jst = TemplateEngine.compile('{{title}} spends {{calc}}');
        expect(jst).toBeDefined();

        const out = jst({ title: 'Joe', calc: () => 2 + 4 });
        expect(out).toBe('Joe spends 6');
    });

    it('check escape', () => {
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`{{#bool}}Show{{/bool}}`);
        const validater = `Show`;
        const out = jst({
            bool: true
        });
        expect(out).toBe(validater);
    });

    it('check section function', () => {
        const jst = TemplateEngine.compile(`{{#func}}from func{{/func}}`);
        const validater = `from func`;
        const out = jst({
            func() { return true; }
        });
        expect(out).toBe(validater);
    });

    it('check section object', () => {
        const jst = TemplateEngine.compile(`{{#person}}{{name}}:{{age}}{{/person}}`);
        const validater = `Max:22`;
        const out = jst({
            person: { name: 'Max', age: 22 }
        });
        expect(out).toBe(validater);
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`{{#bold}}Hi {{name}}.{{/bold}}`);
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`
<h1>Today{{! ignore me }}.</h1>
`);
        const validater = `
<h1>Today.</h1>
`;
        const out = jst();

        expect(out).toBe(validater);
    });

    it('check partilas', () => {
        const jst = TemplateEngine.compile(`
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
        const jst = TemplateEngine.compile(`{{> user}}`);
        const validater = `Michel`;
        const out = jst({
            names: [
                { name: 'Michel' },
            ],
        }, () => { return '{{#names}}{{name}}{{/names}}'; });
        expect(out).toBe(validater);
    });

    it('check section partilas param lack case', () => {
        const jst = TemplateEngine.compile(`{{> user}}`);
        const validater = ``;
        const out = jst({
            names: [
                { name: 'Michel' },
            ],
        });
        expect(out).toBe(validater);
    });

    it('check section partilas param nil', () => {
        const jst = TemplateEngine.compile(`{{> user}}`);
        const validater = ``;
        const out = jst({
            names: [
                { name: 'Michel' },
            ],
        }, () => { return null; });
        expect(out).toBe(validater);
    });

    it('check custom tags', () => {
        const jst = TemplateEngine.compile('<%title%> spends <%calc%>', { tags: ['<%', '%>'] });
        const out = jst({ title: 'Joe', calc: () => 2 + 4 });
        expect(out).toBe('Joe spends 6');
    });

    it('check primitive prop', () => {
        const jst = TemplateEngine.compile(`string length is {{name.length}}`);
        const validater = `string length is 5`;
        const out = jst({ name: 'hello' });
        expect(out).toBe(validater);
    });

    // ++++
    it('check empty', () => {
        const jst = TemplateEngine.compile(``);
        const validater = ``;
        const out = jst();
        expect(out).toBe(validater);
    });
    // ++++

    it('check tokens', () => {
        const jst = TemplateEngine.compile('{{title}} spends {{calc}}');
        expect(JSON.stringify(jst.tokens)).toBe('[["name","title",0,9],["text"," spends ",9,17],["name","calc",17,25]]');
    });

    it('check clearCache', () => {
        const jst = TemplateEngine.compile('{{title}} spends {{calc}}');
        TemplateEngine.clearCache();
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
        const oldSettings = TemplateEngine.setGlobalSettings({
            writer: _writer,
            tags: ['<%', '%>'],
            escape: escapeHTML,
        });

        const jst = TemplateEngine.compile('<%title%> spends <%calc%>');
        const out = jst({ title: 'Joe', calc: () => 2 + 4 });
        expect(out).toBe('Joe spends 6');

        TemplateEngine.setGlobalSettings(oldSettings);
    });

    it('check invalid template input', () => {
        expect(() => TemplateEngine.compile('{{title}} spends {{calc}'))
            .toThrow(new Error(`Unclosed tag at 24`));

        expect(() => TemplateEngine.compile('{{title}} spends {{/title}}'))
            .toThrow(new Error(`Unopened section "title" at 17`));

        expect(() => TemplateEngine.compile('{{#title}} spends {{/titl}}'))
            .toThrow(new Error(`Unclosed section "title" at 18`));

        expect(() => TemplateEngine.compile('{{#title}} spends {{titl}}'))
            .toThrow(new Error(`Unclosed section "title" at 26`));

        expect(() => TemplateEngine.compile({ name: 'test' } as any))
            .toThrow(new TypeError(`Invalid template! the first argument should be a "string" but "object" was given for TemplateEngine.compile(template, options)`));

        expect(() => TemplateEngine.compile(['array check'] as any))
            .toThrow(new TypeError(`Invalid template! the first argument should be a "string" but "array" was given for TemplateEngine.compile(template, options)`));

        expect(() => TemplateEngine.compile('{{=<%%>=}}'))
            .toThrow(new Error(`Invalid tags: ["<%%>"]`));
    });

    it('check internal: renderTokens', () => {
        const token = JSON.parse('[["name","title",0,9],["text"," spends ",9,17],["name","calc",17,25]]');
        const context = _access.createContext({ title: 'Joe', calc: () => 2 + 4 });
        const out = _writer.renderTokens(token, context);
        expect(out).toBe('Joe spends 6');
    });

    it('check internal: renderTokens error', () => {
        const jst = TemplateEngine.compile(`{{#names}}{{> user}}{{/names}}`);
        const token = jst.tokens;
        const view = {
            names() {
                return () => {
                    return { name: 'test' };
                };
            },
        };
        expect(() => {
            _writer.renderTokens(token, view, { user: '{{name}}' });
        }).toThrow(new Error('Cannot use higher-order sections without the original template'));
    });
});
