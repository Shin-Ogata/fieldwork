/* eslint-disable
    @stylistic:js/indent
 */

import { dom } from '@cdp/dom';

const body = document.body;

export function createTestElementsFromTemplate(additionalStyle?: string): HTMLElement[] {
    const style = ` style="visibility: hidden;${additionalStyle ? ` ${additionalStyle}` : ''}"`;
//  const style = '';

    // set same origin for controlling from parent.
    const divs = dom.utils.elementify(
`
<div id="d1" class="test-dom">
    <iframe id="test-frame" src="../res/app/index.html?bust=${Date.now()}"${style}></iframe>
</div>
`
    );
    return divs;
}

function prepareTestElements(divs?: HTMLElement[], additionalStyle?: string): HTMLElement[] {
    divs = divs ?? createTestElementsFromTemplate(additionalStyle);

    const fragment = document.createDocumentFragment();
    for (const div of divs) {
        fragment.appendChild(div);
    }
    body.appendChild(fragment);

    return divs;
}

export function prepareIFrameElements(additionalStyle?: string): Promise<HTMLIFrameElement> {
    return new Promise((resolve) => {
        const divs = prepareTestElements(undefined, additionalStyle);
        const iframe = divs[0].querySelector('#test-frame') as HTMLIFrameElement; // eslint-disable-line @typescript-eslint/non-nullable-type-assertion-style
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
