import {
    TemplateResult,
    html,
    render,
} from '@cdp/extension-template';
import { dom, DOM } from '@cdp/dom';
export { DOM };

const body = document.body;

class TestCustomElement extends HTMLElement {
    private readonly _root: ShadowRoot;
    constructor() {
        super();
        this._root = this.attachShadow({ mode: 'open' });
//      this._root.innerHTML = `<div class="shadow-div"></div>`;
    }

    get root(): ShadowRoot {
        return this._root;
    }
}

customElements.define('test-custom', TestCustomElement);

function createTestElementsFromTemplate(): HTMLElement[] {
    const divs = dom.utils.elementify(`<div id="d1" class="test-dom"></div>`);
    return divs;
}

function prepareTestElements(divs?: HTMLElement[]): HTMLElement[] {
    divs = divs || createTestElementsFromTemplate();

    const fragment = document.createDocumentFragment();
    for (const div of divs) {
        fragment.appendChild(div);
    }
    body.appendChild(fragment);

    return divs;
}

function cleanupTestElements(): void {
    const divs = body.querySelectorAll('.test-dom');
    for (const div of divs) {
        body.removeChild(div);
    }
}

export function prepare(): DOM {
    prepareTestElements();
    const $dom = dom('#d1');

    const createCustom = (): TemplateResult => html`<test-custom class="custom"></test-custom>`;
    render(createCustom(), $dom[0]);
    return dom(($dom.find('.custom')[0] as TestCustomElement).root) as unknown as DOM;
}

export function cleanup(): void {
    cleanupTestElements();
}

export const stripExpressionMarkers = (html: string): string => html.replace(/<!--\?lit\$[0-9]+\$-->|<!--\??-->|lit\$[0-9]+\$/g, '');
export const innerHTML = (dom: DOM): string => stripExpressionMarkers(dom[0].innerHTML);
