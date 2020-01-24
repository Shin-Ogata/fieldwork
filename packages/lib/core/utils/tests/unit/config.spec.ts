/* eslint-disable
   @typescript-eslint/no-explicit-any
 */

import { getGlobal, getConfig } from '@cdp/core-utils';

interface Config {
    noAutomaticNativeExtend?: boolean;
}

describe('utils/config spec', () => {
    it('check global', () => {
        const root = getGlobal();
        expect(root).toBeDefined();

        (globalThis as any) = false;

        const fromEval = getGlobal();
        expect(fromEval).toBeDefined();
        expect(root).toBe(fromEval);

        (globalThis as any) = root;
    });

    it('check config access', () => {
        const config = getConfig<Config>();
        expect(config).toBeDefined();
        expect(config.noAutomaticNativeExtend).toBeFalsy();

        const config2 = getConfig<Config>();
        expect(config2).toBeDefined();
        expect(config2).toBe(config);

        const root: any = getGlobal();
        delete root.CDP.Config;
        const config3 = getConfig<Config>();
        expect(config3).toBeDefined();
    });

    it('check config access', () => {
        const config = getConfig<Config>();
        expect(config).toBeDefined();
        expect(config.noAutomaticNativeExtend).toBeFalsy();

        const config2 = getConfig<Config>();
        expect(config2).toBeDefined();
        expect(config2).toBe(config);

        const root: any = getGlobal();
        delete root.CDP.Config;
        const config3 = getConfig<Config>();
        expect(config3).toBeDefined();
    });
});
