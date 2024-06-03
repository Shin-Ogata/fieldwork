import { RESULT_CODE } from '@cdp/runtime';
import '@cdp/ui-utils';

describe('ui-utils spec', () => {
    it('check result-code-defs', () => {
        expect(RESULT_CODE.ERROR_UI_UTILS_FATAL).toBeDefined();
    });
});
