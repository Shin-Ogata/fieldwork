import { dom } from '@cdp/dom';

const body = document.body;

export function createTestElementsFromTemplate(): HTMLElement[] {
    const divs = dom.utils.elementify(`
        <div id="d1" class="test-dom">
        </div>
    `);
    return divs;
}

export function prepareTestElements(divs?: HTMLElement[]): HTMLElement[] {
    divs = divs || createTestElementsFromTemplate();

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
