import { dom } from '@cdp/dom';

const body = document.body;

export function createTestElementsFromTemplate(): Element[] {
    const divs = dom.utils.elementify(`
<div id="d1" class="test-dom">
    <p class="test-dom-child"></p>
</div>
<div id="d2" class="test-dom">
    <span class="test-dom-child"></span>
</div>
<div id="d3" class="test-dom">
    <hr class="test-dom-child"></hr>
</div>`);
    return divs;
}

export function prepareTestElements(divs?: Element[]): Element[] {
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
