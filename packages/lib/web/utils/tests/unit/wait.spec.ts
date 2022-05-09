import { waitFrame, waitIdle } from '@cdp/web-utils';

describe('wait spec', () => {

    it('check instance', async () => {
        expect(waitFrame).toBeDefined();
        expect(waitIdle).toBeDefined();
        await waitFrame();
        await waitIdle();
    });
});
