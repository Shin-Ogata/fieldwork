import {
    UI_UTILS_STATUS
} from '@cdp/ui-utils';

describe('ui-utils spec', () => {

    it('check status', () => {
        expect(UI_UTILS_STATUS).toBe('UNDER CONSTRUCTION');
        expect(CDP_DECLARE.RESULT_CODE.ERROR_UI_UTILS_FATAL).toBeDefined();
    });
});
