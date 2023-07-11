import { dom, DOM } from '@cdp/dom';
export { DOM };

const body = document.body;

export function createTestElementsFromTemplate(): HTMLElement[] {
    const divs = dom.utils.elementify(`
<div id="d1" class="test-dom" tabindex="-1">
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

export function mixedCollection(): DOM {
    prepareTestElements(dom.utils.elementify(`
<div class="test-dom container"><div class="test-dom-child"></div>
  <!-- comment -->
  <br><br>
  text
  <template id="templ-1">
      <tr>
        <td class="record"></td>
        <td></td>
      </tr>
  </template>
</div>`));
    const $dom = dom('.test-dom').contents();
    return $dom;
}

export function wait(elapse: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, elapse));
}
