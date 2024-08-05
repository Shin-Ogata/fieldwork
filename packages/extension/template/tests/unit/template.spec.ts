/* eslint-disable
    @stylistic:js/block-spacing,
    @stylistic:js/indent,
    @typescript-eslint/no-explicit-any,
    @typescript-eslint/unbound-method,
    @typescript-eslint/await-thenable,
    @typescript-eslint/no-unused-vars,
    @typescript-eslint/explicit-function-return-type,
 */

import {
    post,
    noop,
    sleep,
} from '@cdp/core-utils';
import {
    TemplateResult,
    SVGTemplateResult,
    RenderOptions,
    Directive,
    AsyncDirective,
    HTMLTemplateResult,
    DirectiveParameters,
    Part,
    PartInfo,
    PartType,
    Ref,
    html,
    svg,
    render,
    directive,
    directives,
    createRef,
    _$LH,
    toTemplateStringsArray as bridge,
} from '@cdp/extension-template';
// rollup v3+:  multi import w/ default
import { dom as $, DOM } from '@cdp/dom';
// import $, { DOM } from '@cdp/dom';
import {
    TestListCustomElement,
    prepareTestElements,
    cleanupTestElements,
    innerHTML,
} from './tools';

describe('extention-template spec', () => {
    const {
        AttributePart,
        PropertyPart,
        BooleanAttributePart,
        EventPart,
        ElementPart,
    } = _$LH;

    const {
        asyncAppend,
        asyncReplace,
        cache,
        choose,
        classMap,
        guard,
        ifDefined,
        join,
        keyed,
        live,
        map,
        range,
        ref,
        repeat,
        styleMap,
        templateContent,
        unsafeHTML,
        unsafeSVG,
        until,
        when,
    } = directives;

    const evClick = (() => {
        const e = document.createEvent('Event');
        e.initEvent('click', true, true);
        return e;
    })();

    async function* countUp(): AsyncGenerator<number> {
        let i = 0;
        while (true) {
            yield i++;
            await post(noop);
            if (3 < i) {
                break;
            }
        }
    }

    let count: number;

    const onCallback = (...args: any[]): void => {
        count++;
    };

    beforeEach(() => {
        count = 0;
    });

    afterEach((): void => {
        cleanupTestElements();
    });

    describe('fundamental', () => {
        it('check instance', () => {
            expect(html).toBeDefined();
            expect(svg).toBeDefined();
            expect(render).toBeDefined();
            expect(directive).toBeDefined();
            expect(_$LH).toBeDefined();
            expect(AttributePart).toBeDefined();
            expect(PropertyPart).toBeDefined();
            expect(BooleanAttributePart).toBeDefined();
            expect(EventPart).toBeDefined();
            expect(ElementPart).toBeDefined();
            expect(asyncAppend).toBeDefined();
            expect(asyncReplace).toBeDefined();
            expect(cache).toBeDefined();
            expect(choose).toBeDefined();
            expect(classMap).toBeDefined();
            expect(guard).toBeDefined();
            expect(ifDefined).toBeDefined();
            expect(join).toBeDefined();
            expect(keyed).toBeDefined();
            expect(live).toBeDefined();
            expect(map).toBeDefined();
            expect(range).toBeDefined();
            expect(ref).toBeDefined();
            expect(repeat).toBeDefined();
            expect(styleMap).toBeDefined();
            expect(templateContent).toBeDefined();
            expect(unsafeHTML).toBeDefined();
            expect(unsafeSVG).toBeDefined();
            expect(until).toBeDefined();
            expect(when).toBeDefined();
        });

        it('check render static HTML', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = html`<p>Hello World</p>`;
            render(template, $dom[0]);
            expect($dom.find('p').text()).toBe('Hello World');
        });

        it('check render dynamic text content', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = (name: string): TemplateResult => html`<p>Hello ${name}</p>`;
            render(template('World'), $dom[0]);
            expect($dom.find('p').text()).toBe('Hello World');

            render(template('Template'), $dom[0]);
            expect($dom.find('p').text()).toBe('Hello Template');
        });
    });

    describe('binding', () => {
        it('check bind to attributes', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template1 = (cssClass: string): TemplateResult => html`<div class=${cssClass}>Stylish text.</div>`;
            render(template1('hoge'), $dom[0]);
            expect($dom.find('.hoge').text()).toBe('Stylish text.');

            const template2 = (active?: boolean): TemplateResult => html`<button class="fuga" ?disabled=${!active}>boolean test</button>`;
            render(template2(true), $dom[0]);
            expect($dom.find('.fuga').text()).toBe('boolean test');
            expect(($dom.find('.fuga')[0] as HTMLButtonElement).disabled).toBe(false);

            render(template2(false), $dom[0]);
            expect(($dom.find('.fuga')[0] as HTMLButtonElement).disabled).toBe(true);

            render(template2(), $dom[0]);
            expect(($dom.find('.fuga')[0] as HTMLButtonElement).disabled).toBe(true);
        });

        it('check bind to properties', () => {
            prepareTestElements();
            const $dom = $('#d1');

            interface TestData {
                items: string[];
            }

            const template = (data: TestData): TemplateResult => html`<test-list class="custom" .listItems=${data.items}></test-list>`;
            render(template({ items: ['item1', 'item2'] }), $dom[0]);
            expect($dom.find('.custom')).toBeDefined();
            const el = $dom.find('.custom')[0] as TestListCustomElement;
            expect(el.listItems).toEqual(['item1', 'item2']);
        });
    });

    describe('event listeners', () => {
        it('check add event listeners', async () => {
            prepareTestElements();
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const $dom = $('#d1');

            const template = (): TemplateResult => html`<button class="test" @click=${stub.onCallback}>Click Me!</button>`;
            render(template(), $dom[0]);
            const $test = $dom.find('.test');
            expect($test.text()).toBe('Click Me!');

            // [!! NOTE !!] 外側からの addEventListener は管轄外
            $dom.on('click', stub.onCallback);

            await $test[0].dispatchEvent(evClick);

            expect(stub.onCallback).toHaveBeenCalled();
            expect(count).toBe(2);
        });

        it('check add event listener once', async () => {
            prepareTestElements();
            const clickHandler = {
                handleEvent(ev: Event): void {
                    count++;
                },
                once: true,
                caputure: true,
                passive: true,
            };

            spyOn(clickHandler, 'handleEvent').and.callThrough();

            const $dom = $('#d1');

            const template = (): TemplateResult => html`<button class="test" @click=${clickHandler}>Click Me!</button>`;
            render(template(), $dom[0]);
            const $test = $dom.find('.test');
            expect($test.text()).toBe('Click Me!');

            await $test[0].dispatchEvent(evClick);
            expect(clickHandler.handleEvent).toHaveBeenCalled();

            await $test[0].dispatchEvent(evClick);
            expect(count).toBe(1);
        });

        it('check render options w/ host (eventContext)', async () => {
            prepareTestElements();
            const stub = { onCallback };
            spyOn(stub, 'onCallback').and.callThrough();

            const $dom = $('#d1');
            $dom.on('click', stub.onCallback);

            const template = (): TemplateResult => html`<button class="test">Click Me!</button>`;
            const options: Partial<RenderOptions> = {
                host: $dom[0],
            };

            render(template(), $dom[0], options);
            const $test = $dom.find('.test');

            await $test[0].dispatchEvent(evClick);
            expect(stub.onCallback).toHaveBeenCalled();
            expect(count).toBe(1);
        });
    });

    describe('nest and compose templates', () => {
        it('check nest and compose templates w/ template literal', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const header = html`<h1 class="header">Header</h1>`;
            const page = (): TemplateResult => html`
                ${header}
                <div class="page">Here's my main page.</div>
            `;

            render(page(), $dom[0]);
            expect($dom.find('.header').text()).toBe('Header');
            expect($dom.find('.page').text()).toBe(`Here's my main page.`);
        });

        it('check conditionals w/ ternary operators', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const user = {
                isloggedIn: true,
                name: 'TEST',
            };

            const template = (): TemplateResult => html`
                ${user.isloggedIn
                        ? html`Welcome ${user.name}`
                        : html`Please log in`
                    }
            `;

            render(template(), $dom[0]);
            expect($dom.text()).toBe('Welcome TEST');

            user.isloggedIn = false;
            render(template(), $dom[0]);
            expect($dom.text()).toBe('Please log in');
        });

        it('check conditionals w/ if statements', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const user = {
                isloggedIn: true,
                name: 'TEST',
            };

            const getUserMessage = (): TemplateResult => {
                if (user.isloggedIn) {
                    return html`Welcome ${user.name}`;
                } else {
                    return html`Please log in`;
                }
            };

            const template = (): TemplateResult => html`${getUserMessage()}`;

            render(template(), $dom[0]);
            expect($dom.text()).toBe('Welcome TEST');

            user.isloggedIn = false;
            render(template(), $dom[0]);
            expect($dom.text()).toBe('Please log in');
        });

        it('check repeating templates with Array.map', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const listView = (items: string[]): TemplateResult => html`
                <ul class="list">
                    ${items.map((item) => html`<li class="list-item">${item}</li>`)}
                </ul>
            `;

            const header = html`<h1 class="header">Header</h1>`;
            const page = (data: { items: string[]; }): TemplateResult => html`
                ${header}
                ${listView(data.items)}
            `;

            render(page({ items: ['item1', 'item2'] }), $dom[0]);
            expect($dom.find('.header').text()).toBe('Header');
            const $listItems = $dom.find('.list').children();
            expect($listItems.length).toBe(2);
            expect($listItems[0].textContent).toBe('item1');
            expect($listItems[1].textContent).toBe('item2');
        });

        it('check repeating templates w/ looping statements', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const itemTemplates: TemplateResult[] = [];
            const items = ['item1', 'item2'];
            for (const i of items) {
                itemTemplates.push(html`<li class="list-item">${i}</li>`);
            }

            // static template
            const template = html`
                <ul class="list">
                    ${itemTemplates}
                </ul>
            `;

            render(template, $dom[0]);
            const $listItems = $dom.find('.list').children();
            expect($listItems.length).toBe(2);
            expect($listItems[0].textContent).toBe('item1');
            expect($listItems[1].textContent).toBe('item2');
        });

        it('check rendering nothing', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = (admin?: boolean): TemplateResult => html`
                ${admin
                    ? '<button>DELETE</button>'
                    : ''
                }
            `;

            render(template(), $dom[0]);
            expect($dom.children().length).toBe(0);
        });
    });

    describe('Styling:', () => {
        it('check basic', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const prepare = (): TemplateResult => html`<test-list class="custom"></test-list>`;
            render(prepare(), $dom[0]);
            const $shadowRoot = $(($dom.find('.custom')[0] as TestListCustomElement).root);

            const template = (): TemplateResult => html`
                <style>
                    .shadow-el {
                        position: absolute;
                        width: 100px;
                        height: 100px;
                        background-color: gold;
                    }
                </style>
                <div class="shadow-el"></div>
            `;
            render(template(), $shadowRoot[0]);
            expect($shadowRoot.find('.shadow-el').width()).toBe(100);
            expect($shadowRoot.find('.shadow-el').height()).toBe(100);
            expect($shadowRoot.find('.shadow-el').css('background-color')).toBe('rgb(255, 215, 0)');
        });

        it('check inline styles w/ styleMap', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const prepare = (): TemplateResult => html`<test-list class="custom"></test-list>`;
            render(prepare(), $dom[0]);
            const $shadowRoot = $(($dom.find('.custom')[0] as TestListCustomElement).root);

            const normalStyle = {};
            const shadowStyle = {
                position: 'absolute',
                width: '100px',
                height: '100px',
                backgroundColor: 'gold',
            };

            const template = (custom?: boolean): TemplateResult => html`
                <div class="shadow-el" style=${styleMap(custom ? shadowStyle : normalStyle)}></div>
            `;

            render(template(), $shadowRoot[0]);
            expect($shadowRoot.find('.shadow-el').width()).not.toBe(100);
            expect($shadowRoot.find('.shadow-el').height()).not.toBe(100);
            expect($shadowRoot.find('.shadow-el').css('background-color')).not.toBe('rgb(255, 215, 0)');

            render(template(true), $shadowRoot[0]);
            expect($shadowRoot.find('.shadow-el').width()).toBe(100);
            expect($shadowRoot.find('.shadow-el').height()).toBe(100);
            expect($shadowRoot.find('.shadow-el').css('background-color')).toBe('rgb(255, 215, 0)');
        });

        it('check Setting classes w/ classMap', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const prepare = (): TemplateResult => html`<test-list class="custom"></test-list>`;
            render(prepare(), $dom[0]);
            const $shadowRoot = $(($dom.find('.custom')[0] as TestListCustomElement).root);

            const baseClasses = {
                'shadow-el': true,
            };

            const template = (custom?: boolean): TemplateResult => {
                const mergedClasses = Object.assign({ 'custom-style': !!custom }, baseClasses);
                return html`
                    <style>
                        .custom-style {
                            position: absolute;
                            width: 100px;
                            height: 100px;
                            background-color: gold;
                        }
                    </style>
                    <div class=${classMap(mergedClasses)}></div>
                `;
            };

            render(template(), $shadowRoot[0]);
            expect($shadowRoot.find('.shadow-el').width()).not.toBe(100);
            expect($shadowRoot.find('.shadow-el').height()).not.toBe(100);
            expect($shadowRoot.find('.shadow-el').css('background-color')).not.toBe('rgb(255, 215, 0)');

            render(template(true), $shadowRoot[0]);
            expect($shadowRoot.find('.shadow-el').width()).toBe(100);
            expect($shadowRoot.find('.shadow-el').height()).toBe(100);
            expect($shadowRoot.find('.shadow-el').css('background-color')).toBe('rgb(255, 215, 0)');
        });
    });

    describe('Rendering special values:', () => {
        it('check repeating templates w/ the repeat directive', () => {
            prepareTestElements();
            const $dom = $('#d1');

            interface Employee {
                id: number;
                familyName: string;
                givenName: string;
            }

            let seeds: Employee[] = [
                {
                    id: 0,
                    familyName: 'TEST',
                    givenName: 'Taro',
                },
                {
                    id: 1,
                    familyName: 'TEST',
                    givenName: 'Jiro',
                },
            ];

            const employeeList = (employees: Employee[]): TemplateResult => html`
                <ul class="list">
                    ${repeat(employees, (employee) => employee.id, (employee, index) => html`
                        <li class="list-item">${index}: ${employee.familyName}, ${employee.givenName}</li>
                    `)}
                </ul>
            `;

            render(employeeList(seeds), $dom[0]);
            const $listItems = $dom.find('.list').children();
            expect($listItems.length).toBe(2);
            expect($listItems[0].textContent).toBe('0: TEST, Taro');
            expect($listItems[1].textContent).toBe('1: TEST, Jiro');

            seeds = seeds.sort((l, r) => l.id > r.id ? -1 : 1);
            render(employeeList(seeds), $dom[0]);
            const $listItems2 = $dom.find('.list').children();
            expect($listItems2.length).toBe(2);
            expect($listItems2[0].textContent).toBe('0: TEST, Jiro');
            expect($listItems2[1].textContent).toBe('1: TEST, Taro');
        });

        it('check templateContent', () => {
            prepareTestElements($.utils.elementify(`
<div id="d1" class="test-dom">
    <template id="myContent">
        <h3 class="text">This is content stamped from an HTML &lt;template&gt;!</h3>
        <img src="https://picsum.photos/id/429/200">
    </template>
</div>
`));
            const $dom = $('#d1');

            const templateEl = $dom.find('#myContent')[0] as HTMLTemplateElement;
            const template = html`
Here's some content from a template element:
${templateContent(templateEl)}`;
            render(template, $dom[0]);
            expect($dom.find('.text').text()).toBe('This is content stamped from an HTML <template>!');
        });

        it('check unsafeHTML', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const markup = '<div class="raw">生のHTMLとして出力</div>';

            const template = html`
                危険な可能性があるHTMLを出力:
                ${unsafeHTML(markup)}
            `;

            render(template, $dom[0]);
            expect($dom.find('.raw').text()).toBe('生のHTMLとして出力');
        });

        it('check unsafeSVG', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const svg = '<circle class="raw" cx="50" cy="50" r="40" fill="red" />';

            const template = html`
                危険な可能性があるSVGを出力:
                ${unsafeSVG(svg)}
            `;

            render(template, $dom[0]);
            expect($dom.find('.raw').attr('cx')).toBe('50');
        });
    });

    describe('Conditional rendering:', () => {
        it('check cache directive 1', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const view = (): HTMLTemplateResult => html`View : <input value="edit me then toggle">`;
            const template = html`${cache(view())}`;

            render(template, $dom[0]);
            const $input = $dom.find('input');
            expect($input.val()).toBe('edit me then toggle');

            $input.val('cached text view 1');
            expect($input.val()).toBe('cached text view 1');

            render(template, $dom[0]);
            expect($dom.find('input').val()).toBe('cached text view 1');
        });

        it('check cache directive 2', () => {
            prepareTestElements();
            const $dom = $('#d1');

            interface Data {
                detail: string;
                summary: string;
                showDetails: boolean;
            }

            const data: Data = {
                detail: 'DETAIL',
                summary: 'SUMMARY',
                showDetails: false,
            };

            const detailView = (data: Data): TemplateResult => html`<div>${data.detail}</div>`;
            const summaryView = (data: Data): TemplateResult => html`<div>${data.summary}</div>`;
            const template = (): TemplateResult => html`${cache(data.showDetails
                ? detailView(data)
                : summaryView(data)
            )}`;

            render(template(), $dom[0]);
            expect($dom.first().text()).toBe('SUMMARY');

            data.showDetails = true;

            render(template(), $dom[0]);
            expect($dom.first().text()).toBe('DETAIL');
        });

        it('check guard', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = (immutableItems: string[]): TemplateResult => html`
                ${guard([immutableItems], () => immutableItems.map(item => html`<div>${item}</div>`))}
            `;

            let items = ['index0', 'index1'];
            render(template(items), $dom[0]);
            expect($dom.children().length).toBe(2);
            expect($dom.children()[0].textContent).toBe('index0');
            expect($dom.children()[1].textContent).toBe('index1');

            {// guarded. no change.
                items.push('index2');
                render(template(items), $dom[0]);
                expect($dom.children().length).toBe(2);
                expect($dom.children()[0].textContent).toBe('index0');
                expect($dom.children()[1].textContent).toBe('index1');
            }

            {// change by reference changed.
                items = items.slice();
                render(template(items), $dom[0]);
                expect($dom.children().length).toBe(3);
                expect($dom.children()[0].textContent).toBe('index0');
                expect($dom.children()[1].textContent).toBe('index1');
                expect($dom.children()[2].textContent).toBe('index2');
            }
        });

        it('check ifDefined', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = (image: { filename?: string; }): TemplateResult => html`
                <img src="/images/${ifDefined(image.filename)}">
            `;

            const prop1 = { filename: 'icon.jpeg' };
            render(template(prop1), $dom[0]);
            expect(($dom.find('img')[0] as HTMLImageElement).src.includes('/images/icon.jpeg')).toBe(true);

            const prop2 = {};
            render(template(prop2), $dom[0]);
            expect(($dom.find('img')[0] as HTMLImageElement).src).toBe(''); // <img>
        });

        it('check live', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const data = { value: 'test' };
            const template = (data: { value: string; }): HTMLTemplateResult => html`<input .value=${live(data.value)}>`;

            render(template(data), $dom[0]);
            expect($dom.find('input').val()).toBe('test');

            $dom.find('input').val('hogehoge');

            data.value = 'check';
            render(template(data), $dom[0]);
            expect($dom.find('input').val()).toBe('check');
        });
    });

    describe('Loops and conditionals (v2.0.0+):', () => {
        it('check when', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = (data?: { user?: { username: string; }; }): TemplateResult => html`
                ${when(data?.user, () => html`User: ${data?.user?.username}`, () => html`Sign In...`)}
            `;

            render(template({ user: { username: 'lit-html' } }), $dom[0]);
            expect($dom.text()).toBe('User: lit-html');

            render(template({}), $dom[0]);
            expect($dom.text()).toBe('Sign In...');
        });

        it('check choose', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = (data: { section: string; }): TemplateResult => html`
                ${choose(data.section, [
                    ['home', () => html`<h1>Home</h1>`],
                    ['about', () => html`<h1>About</h1>`]
                ],
                () => html`<h1>Error</h1>`)}
            `;

            render(template({ section: 'home' }), $dom[0]);
            expect($dom.find('h1').text()).toBe('Home');

            render(template({ section: 'about' }), $dom[0]);
            expect($dom.find('h1').text()).toBe('About');

            render(template({ section: 'error' }), $dom[0]);
            expect($dom.find('h1').text()).toBe('Error');
        });

        it('check map', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = (items?: string[]): TemplateResult => html`
                <ul>
                ${map(items, (i) => html`<li>${i}</li>`)}
                </ul>
            `;

            render(template(['a', 'b', 'c']), $dom[0]);
            expect($dom.find('li').length).toBe(3);
            expect($dom.find('li')[0].textContent).toBe('a');
            expect($dom.find('li')[1].textContent).toBe('b');
            expect($dom.find('li')[2].textContent).toBe('c');

            render(template(), $dom[0]);
            expect($dom.find('li').length).toBe(0);
        });

        it('check join', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = (menuItems: { href: string; label: string; }[]): TemplateResult => html`
                ${join(
                    map(menuItems, (i) => html`<a href=${i.href}>${i.label}</a>`),
                    html`<span class="separator">|</span>`
                )}
            `;

            render(template([{ href: 'aaa.html', label: 'AAA' }, { href: 'bbb.html', label: 'BBB' }]), $dom[0]);
            expect(innerHTML($dom)).toBe('<a href="aaa.html">AAA</a><span class="separator">|</span><a href="bbb.html">BBB</a>');
        });

        it('check range', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = (): TemplateResult => html`
                ${map(range(8), (i) => html`${i + 1}`)}
            `;

            render(template(), $dom[0]);
            expect($dom.text()).toBe('12345678');
        });
    });

    describe('Referencing the rendered DOM:', () => {
        it('check ref', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const inputRef: Ref<HTMLInputElement> = createRef();
            const template = html`<input ${ref(inputRef)}>`;

            render(template, $dom[0]);
            $dom.find('input').val('hogehoge');
            expect(inputRef.value?.value).toBe('hogehoge');
        });

        it('check keyed', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const go = (k: any) =>
                render(keyed(k, html`<div .foo=${k}></div>`), $dom[0]);

            const div = (dom: DOM) => dom[0].firstElementChild as { foo?: number; };

            go(1);
            const div1 = div($dom);
            expect(innerHTML($dom)).toBe('<div></div>');
            expect(div1.foo).toBe(1);

            go(1);
            const div2 = div($dom);
            expect(innerHTML($dom)).toBe('<div></div>');
            expect(div2.foo).toBe(1);
            expect(div2 === div1).toBe(true);

            go(2);
            const div3 = div($dom);
            expect(innerHTML($dom)).toBe('<div></div>');
            expect(div3.foo).toBe(2);
            expect(div1 === div3).toBe(false);
        });
    });

    describe('Asynchronous rendering:', () => {
        it('check until', async () => {
            prepareTestElements();
            const $dom = $('#d1');

            const content = post(() => html`<span>完了</span>`);
            const template = html`${until(content, html`<span>読み込み中...</span>`)}`;

            render(template, $dom[0]);
            await sleep(100);
            expect($dom.text()).toBe('完了');
        });

        it('check asyncAppend', async () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = html`Count: <span>${asyncAppend(countUp())}</span>.`;
            render(template, $dom[0]);
            await sleep(100);

            expect($dom.first().text()).toBe('Count: 0123.');
        });

        it('check asyncReplace', async () => {
            prepareTestElements();
            const $dom = $('#d1');

            const template = html`Count: <span>${asyncReplace(countUp())}</span>.`;
            render(template, $dom[0]);
            await sleep(100);

            expect($dom.first().text()).toBe('Count: 3.');
        });
    });

    describe('Custom directives', () => {
        it('check creating directives', () => {
            prepareTestElements();
            const $dom = $('#d1');

            class HelloDirective extends Directive {
                render(): string {
                    return `Hello!`;
                }
            }
            // Create the directive function
            const helloDirective = directive(HelloDirective);
              // Use directive
            const template = html`<div class="test">${helloDirective()}</div>`;

            render(template, $dom[0]);
            expect($dom.first().text()).toBe('Hello!');

/*
            // lit-html v1.x
            // https://lit.dev/docs/releases/upgrade/#example-directive-migration
            prepareTestElements();
            const $dom = $('#d1');

            const helloDirective = directive(() => (part: Part) => { part.setValue('Hello'); });
            const template = html`<div class="test">${helloDirective()}</div>`;

            render(template, $dom[0]);
            expect($dom.first().text()).toBe('Hello');
*/
        });

        it('check custom directives (sync)', () => {
            prepareTestElements();
            const $dom = $('#d1');

            // Class-based directive API
            class RenderCounter extends Directive {
                // State stored in class field
                value: number | undefined;
                constructor(partInfo: PartInfo) {
                    super(partInfo);
                    // When necessary, validate part in constructor using `part.type`
                    if (partInfo.type !== PartType.CHILD) {
                        throw new Error('renderCounter only supports child expressions');
                    }
                }
                // Optional: override update to perform any direct DOM manipulation
                update(part: Part, [initialValue]: DirectiveParameters<this>): HTMLTemplateResult {
                    /* Any imperative updates to DOM/parts would go here */
                    return this.render(initialValue);
                }
                // Do SSR-compatible rendering (arguments are passed from call site)
                render(initialValue: number): HTMLTemplateResult {
                    // Previous state available on class field
                    if (this.value === undefined) {
                        this.value = initialValue;
                    } else {
                        this.value++;
                    }
                    return html`<p>${this.value}</p>`;
                }
            }
            const renderCounter = directive(RenderCounter);

            const template = html`<div class="test">${renderCounter(10)}</div>`;

            render(template, $dom[0]);
            expect($dom.first().text()).toBe('10');

            render(template, $dom[0]);
            expect($dom.first().text()).toBe('11');
        });

        it('check custom directives (async)', async () => {
            prepareTestElements();
            const $dom = $('#d1');

            class ResolvePromise extends AsyncDirective {
                render(promise: Promise<unknown>): string {
                    void Promise.resolve(promise).then((resolvedValue) => {
                        // Rendered asynchronously:
                        this.setValue(resolvedValue);
                    });
                    // Rendered synchronously:
                    return `Waiting for promise to resolve`;
                }
            }
            const resolvePromise = directive(ResolvePromise);

            const promise = Promise.resolve('Hello AsyncDirective!');
            const template = html`<div class="test">${resolvePromise(promise)}</div>`;

            render(template, $dom[0]);

            await promise;
            expect($dom.first().text()).toBe('Hello AsyncDirective!');
        });
    });

    describe('etc', () => {
        it('check svg', () => {
            prepareTestElements();
            const $dom = $('#d1');

            const grid = (): SVGTemplateResult => svg`
                <g class="test-svg">
                    ${[0, 10, 20].map((x) => svg`<line x1=${x} y1="0" x2=${x} y2="20" stroke="#000"/>`)}
                    ${[0, 10, 20].map((y) => svg`<line x1="0" y1=${y} x2="20" y2=${y} stroke="#000"/>`)}
                </g>
            `;

            render(grid(), $dom[0]);
            expect($dom.find('.test-svg')[0] instanceof SVGElement).toBe(true);
        });

        it('check html w/ toTemplateStringsArray()', () => {
            prepareTestElements();
            const $dom = $('#d1');
            const raw = '<p>Hello Raw String</p>';
            render(html(bridge(raw)), $dom[0]);
            expect($dom.find('p').text()).toBe('Hello Raw String');

            const strings = bridge(['a', 'b', 'c']);
            expect(strings.raw.length).toBe(3);
            expect(strings.raw[0]).toBe('a');
            expect(strings.raw[1]).toBe('b');
            expect(strings.raw[2]).toBe('c');

            const tag = (strings: TemplateStringsArray, ...values: unknown[]): TemplateStringsArray => {
                return strings;
            };

            const val = '完了';
            const template = bridge(tag`<span>${val}</span>`);
            expect(template.raw.length).toBe(2);
            expect(template.raw[0]).toBe('<span>');
            expect(template.raw[1]).toBe('</span>');
        });
    });
});
