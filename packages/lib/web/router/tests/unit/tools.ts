/*
 eslint-disable
    @typescript-eslint/indent
 */

import { dom } from '@cdp/dom';

const body = document.body;

export function createTestElementsFromTemplate(): HTMLElement[] {
    // set same origin for controlling from parent.
    const divs = dom.utils.elementify(
`
<div id="d1" class="test-dom">
    <iframe id="test-frame" src="../res/router/index.html" style="visibility: hidden;"></iframe>
</div>
`
    );
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

export function prepareIFrameElements(): Promise<HTMLIFrameElement> {
    return new Promise((resolve) => {
        const divs = prepareTestElements();
        const iframe = divs[0].querySelector('#test-frame') as HTMLIFrameElement;
        const onFrameDOMContentLoaded = (): void => {
            resolve(iframe);
        };
        iframe.contentWindow?.addEventListener('DOMContentLoaded', onFrameDOMContentLoaded, true);
    });
}

export function cleanupTestElements(): void {
    const divs = body.querySelectorAll('.test-dom');
    for (const div of divs) {
        body.removeChild(div);
    }
}
