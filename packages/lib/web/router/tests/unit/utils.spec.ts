/*
 eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { path2regexp } from '@cdp/router';

describe('router/utils spec', () => {

    it('check path2regexp', () => {
        expect(path2regexp).toBeDefined();
        expect(path2regexp.compile).toBeDefined();
        expect(path2regexp.match).toBeDefined();
        expect(path2regexp.parse).toBeDefined();
        expect(path2regexp.pathToRegexp).toBeDefined();
        expect(path2regexp.regexpToFunction).toBeDefined();
        expect(path2regexp.tokensToFunction).toBeDefined();
        expect(path2regexp.tokensToRegexp).toBeDefined();
    });

});
