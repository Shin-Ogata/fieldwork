import { TemplateEngine } from '@cdp/core-template';
import { dom, DOM } from '@cdp/dom';
export { DOM };

const body = document.body;

const jst = TemplateEngine.compile(`
    {{#items}}
    <li class="shadow-item">{{{.}}}</li>
    {{/items}}
`);

export class TestListCustomElement extends HTMLElement {
    private readonly _root: ShadowRoot;
    constructor() {
        super();
        this._root = this.attachShadow({ mode: 'open' });
        this._root.innerHTML = `<ul class="shadow-list"></ul>`;
    }

    get root(): ShadowRoot {
        return this._root;
    }

    get listItems(): string[] {
        const result: string[] = [];
        for (const e of dom(this._root).find('.shadow-list').children()) {
            result.push(e.textContent!);
        }
        return result;
    }

    set listItems(items: string[]) {
        dom(this._root).find('.shadow-list').append(dom(jst({ items })));
    }
}

customElements.define('test-list', TestListCustomElement);

export function createTestElementsFromTemplate(): HTMLElement[] {
    const divs = dom.utils.elementify(`<div id="d1" class="test-dom"></div>`);
    return divs;
}

export function prepareTestElements(divs?: HTMLElement[]): HTMLElement[] {
    divs = divs ?? createTestElementsFromTemplate();

    const fragment = document.createDocumentFragment();
    for (const div of divs) {
        fragment.appendChild(div);
    }
    body.appendChild(fragment);

    return divs;
}

export function cleanupTestElements(): void {
    const divs = body.querySelectorAll('.test-dom');
    for (const div of divs) {
        body.removeChild(div);
    }
}

const stripExpressionMarkers = (html: string): string => html.replace(/<!--\?lit\$[0-9]+\$-->|<!--\??-->|lit\$[0-9]+\$/g, '');
export const innerHTML = (dom: DOM): string => stripExpressionMarkers(dom[0].innerHTML).trim();
