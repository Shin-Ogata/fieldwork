/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import { i18n } from '@cdp/i18n';

export function ensureCleanI18N(): void {
    delete i18n['options'];
}
