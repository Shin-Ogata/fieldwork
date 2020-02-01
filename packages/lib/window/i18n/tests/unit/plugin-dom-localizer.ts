/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import { initializeI18N, localize } from '@cdp/i18n';
import { dom as $ } from '@cdp/dom';
import { ensureCleanI18N } from './tools';

describe('i18n/plugin/dom-localizer spec', () => {
    beforeEach(() => {
        ensureCleanI18N();
    });

    it('check instance', () => {
        expect(localize).toBeDefined();
        expect($().localize).toBeDefined();
    });
});
