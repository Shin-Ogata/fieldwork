import {
    UI_CORE_STATUS
} from '@cdp/ui-core';

describe('ui-core spec', () => {

    it('check status', () => {
        expect(UI_CORE_STATUS).toBe('UNDER CONSTRUCTION');
    });
});
