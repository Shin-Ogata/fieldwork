/* eslint-disable
    @typescript-eslint/no-explicit-any
 */

import { safe } from '@cdp/core-utils';

describe('utils/safe spec', () => {
    it('check safe exisits', () => {
        const wnd = safe(globalThis.window);
        expect(wnd).toBeDefined();
        expect(wnd instanceof Window).toBe(true);
    });

    it('check safe not exisits', () => {
        interface Widget {
            func1(): Widget;
            prop1: number;
            prop2: {
                prop: string;
                func(): {
                    new(...args: any[]): Widget;
                };
            };
        }
        const widget = safe<Widget>((globalThis as any).widget);
        expect(widget).toBeDefined();
        expect(widget.func1).toBeDefined();
        expect(widget.prop1).toBeDefined();
        expect(widget.prop2).toBeDefined();
        expect(widget.prop2.prop).toBeDefined();
        expect(widget.prop2.func).toBeDefined();

        // extend
        (widget as any).prop3 = 'prop3';
        expect((widget as any).prop3).toBe('prop3');

        const fromFunc1 = widget.func1();
        expect(fromFunc1).toBeDefined();
        const fromPropFunc = widget.prop2.func();
        expect(fromPropFunc).toBeDefined();
        const fromNew = new fromPropFunc();
        expect(fromNew).toBeDefined();
        expect(fromNew.func1).toBeDefined();
        expect(fromNew.prop1).toBeDefined();
        expect(fromNew.prop2).toBeDefined();
        expect(fromNew.prop2.prop).toBeDefined();
        expect(fromNew.prop2.func).toBeDefined();

        // extend
        (fromNew as any).prop4 = 'prop4';
        expect((fromNew as any).prop4).toBe('prop4');
    });
});
