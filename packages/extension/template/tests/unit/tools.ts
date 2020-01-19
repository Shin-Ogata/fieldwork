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
            result.push(e.textContent as string);
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
    divs = divs || createTestElementsFromTemplate();

    const flag = document.createDocumentFragment();
    for (const div of divs) {
        flag.appendChild(div);
    }
    body.appendChild(flag);

    return divs;
}

export function cleanupTestElements(): void {
    const divs = body.querySelectorAll('.test-dom');
    for (const div of divs) {
        body.removeChild(div);
    }
}
