/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { dom } from '@cdp/dom';
import { i18n } from '@cdp/i18n';

const body = document.body;

export function ensureCleanI18N(): void {
    delete i18n['options'];
    delete i18n['language'];
    delete i18n['languages'];
    delete i18n['isInitialized'];
}

export function createTestElementsFromTemplate(): HTMLElement[] {
    const divs = dom.utils.elementify(`
        <div id="d1" class="test-dom">
        </div>
    `);
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
