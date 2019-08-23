import { dom } from '@cdp/dom';
import $ from '@cdp/dom';

describe('dom/dom spec', () => {
    it('support `default` and `named` import', () => {
        expect($).toBe(dom);
    });
});
