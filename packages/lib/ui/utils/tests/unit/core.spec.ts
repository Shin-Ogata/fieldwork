import {
    UI_UTILS_STATUS
} from '@cdp/ui-utils';

describe('ui-utils spec', () => {

    it('check status', () => {
        expect(UI_UTILS_STATUS).toBe('UNDER CONSTRUCTION');
    });
});
