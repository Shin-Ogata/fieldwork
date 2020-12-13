/* eslint-disable
    block-spacing
 ,  @typescript-eslint/unbound-method
 ,  @typescript-eslint/no-explicit-any
 */

import { dom as $ } from '@cdp/dom';
import {
    createTestElementsFromTemplate as createFromTemplate,
    prepareTestElements as prepareTestDivs,
    cleanupTestElements as cleanup,
} from './tools';

describe('dom/utils spec', () => {
    const body = document.body;
    const { elementify, evaluate } = $.utils;
    const { isArray } = Array;

    afterEach((): void => {
        cleanup();
    });

    it('check accessible', () => {
        expect($.utils).toBeDefined();
        expect($.utils.elementify).toBeDefined();
        expect(typeof $.utils.elementify).toBe('function');
    });

    it('check elementify(string)', () => {
        {// empty
            const elems1 = elementify();
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(0);

            const elems2 = elementify(undefined);
            expect(elems2).toBeDefined();
            expect(isArray(elems2)).toBe(true);
            expect(elems2.length).toBe(0);

            const elems3 = elementify(null);
            expect(elems3).toBeDefined();
            expect(isArray(elems3)).toBe(true);
            expect(elems3.length).toBe(0);

            const elems4 = elementify('');
            expect(elems4).toBeDefined();
            expect(isArray(elems4)).toBe(true);
            expect(elems4.length).toBe(0);
        }

        // from template
        const divs = createFromTemplate();

        {// check instance
            expect(divs).toBeDefined();
            expect(isArray(divs)).toBe(true);
            expect(divs.length).toBe(3);

            expect(divs[0] instanceof HTMLDivElement).toBe(true);
            expect(divs[1] instanceof HTMLDivElement).toBe(true);
            expect(divs[2] instanceof HTMLDivElement).toBe(true);
        }

        prepareTestDivs(divs);

        {// pure ID selector
            const elems1 = elementify('#d1');
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(1);
            expect(elems1[0]).toEqual(divs[0]);

            const elems2 = elementify('#d2');
            expect(elems2).toBeDefined();
            expect(isArray(elems2)).toBe(true);
            expect(elems2.length).toBe(1);
            expect(elems2[0]).toEqual(divs[1]);

            const elems3 = elementify('#d3');
            expect(elems3).toBeDefined();
            expect(isArray(elems3)).toBe(true);
            expect(elems3.length).toBe(1);
            expect(elems3[0]).toEqual(divs[2]);

            const elems4 = elementify('#d99');
            expect(elems4).toBeDefined();
            expect(isArray(elems4)).toBe(true);
            expect(elems4.length).toBe(0);
        }

        {// class selector
            const elems1 = elementify('.test-dom-child');
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(3);

            expect(elems1[0] instanceof HTMLParagraphElement).toBe(true);
            expect(elems1[1] instanceof HTMLSpanElement).toBe(true);
            expect(elems1[2] instanceof HTMLHRElement).toBe(true);

            const elems2 = elementify('.test-dom-child-invalid');
            expect(elems2).toBeDefined();
            expect(isArray(elems2)).toBe(true);
            expect(elems2.length).toBe(0);
        }

        {// special case, 'body'
            const elems1 = elementify('body');
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(1);
            expect(elems1[0]).toEqual(body);
        }
    });

    it('check elementify(element)', () => {
        const divs = prepareTestDivs();

        {// HTML Element
            const elems1 = elementify(divs[0]);
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(1);
            expect(elems1[0]).toEqual(divs[0]);

            const elems2 = elementify(divs[1]);
            expect(elems2).toBeDefined();
            expect(isArray(elems2)).toBe(true);
            expect(elems2.length).toBe(1);
            expect(elems2[0]).toEqual(divs[1]);

            const elems3 = elementify(divs[2]);
            expect(elems3).toBeDefined();
            expect(isArray(elems3)).toBe(true);
            expect(elems3.length).toBe(1);
            expect(elems3[0]).toEqual(divs[2]);

            const children = elementify('.test-dom-child');
            const elems4 = elementify(children[0]);
            expect(elems4).toBeDefined();
            expect(isArray(elems4)).toBe(true);
            expect(elems4.length).toBe(1);
            expect(elems4[0]).toEqual(children[0]);

            const elems5 = elementify(children[1]);
            expect(elems5).toBeDefined();
            expect(isArray(elems5)).toBe(true);
            expect(elems5.length).toBe(1);
            expect(elems5[0]).toEqual(children[1]);

            const elems6 = elementify(children[2]);
            expect(elems6).toBeDefined();
            expect(isArray(elems6)).toBe(true);
            expect(elems6.length).toBe(1);
            expect(elems6[0]).toEqual(children[2]);
        }

        {// document / body
            const elems1 = elementify(document);
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(1);
            expect(elems1[0]).toEqual(document);

            const elems2 = elementify(body);
            expect(elems2).toBeDefined();
            expect(isArray(elems2)).toBe(true);
            expect(elems2.length).toBe(1);
            expect(elems2[0]).toEqual(body);
        }

        {// window
            const elems1 = elementify(window);
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(1);
            expect(elems1[0]).toEqual(window);
        }
    });

    it('check elementify(element collection)', () => {
        const divs = prepareTestDivs();

        {// HTMLElement Array
            const elems1 = elementify(divs);
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(3);
            expect(elems1[0]).toEqual(divs[0]);
            expect(elems1[1]).toEqual(divs[1]);
            expect(elems1[2]).toEqual(divs[2]);
        }

        {// HTMLElement Collection
            const collection = document.querySelectorAll('.test-dom-child');
            const elems1 = elementify(collection);
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(3);
            expect(elems1[0]).toEqual(collection[0]);
            expect(elems1[1]).toEqual(collection[1]);
            expect(elems1[2]).toEqual(collection[2]);
        }

        {// other Array
            const elems1 = elementify([window]);
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(1);
            expect(elems1[0]).toEqual(window);

            const elems2 = elementify([document]);
            expect(elems2).toBeDefined();
            expect(isArray(elems2)).toBe(true);
            expect(elems2.length).toBe(1);
            expect(elems2[0]).toEqual(document);

            const elems3 = elementify([body]);
            expect(elems3).toBeDefined();
            expect(isArray(elems3)).toBe(true);
            expect(elems3.length).toBe(1);
            expect(elems3[0]).toEqual(body);

            // string array will be comile error.
            const elem4 = elementify(['.test-dom', '.test-dom-child'] as any);
            expect(elem4).toBeDefined();
            expect(isArray(elem4)).toBe(true);
            expect(elem4.length).toBe(0);
        }
    });

    it('check elementify(element, context)', () => {
        const divs = createFromTemplate();

        {// standard
            const elems1 = elementify('.test-dom-child');
            expect(elems1).toBeDefined();
            expect(isArray(elems1)).toBe(true);
            expect(elems1.length).toBe(0);

            const elems2 = elementify('.test-dom-child', divs[0].parentNode as ParentNode);
            expect(elems2).toBeDefined();
            expect(isArray(elems2)).toBe(true);
            expect(elems2.length).toBe(3);
            expect(elems2[0]).toEqual(divs[0].firstElementChild as HTMLElement);
            expect(elems2[1]).toEqual(divs[1].firstElementChild as HTMLElement);
            expect(elems2[2]).toEqual(divs[2].firstElementChild as HTMLElement);
        }

        {// advance
            const invalidContext = {
                querySelectorAll: (selector: string): any => {
                    throw new Error(`I am invalid context. [${selector}]`);
                },
            };
            expect(() => elementify('.test-dom-child', invalidContext as ParentNode)).not.toThrow();
        }
    });

    it('check dom evaluate', () => {
        (window as any).TEST_EVAL = { count: 0 };
        const checker = (window as any).TEST_EVAL;
        evaluate('globalThis.TEST_EVAL.count++;');
        expect(checker.count).toBe(1);

        const func = evaluate('function () { globalThis.TEST_EVAL.count++; }');
        expect(checker.count).toBe(1);
        func();
        expect(checker.count).toBe(2);

        let count = evaluate('++globalThis.TEST_EVAL.count;', { nonce: 'c20t41c7-73c6-4bf9-fde8-24a7b35t5f71' });
        expect(count).toBe(3);

        const script = document.createElement('script');
        script.setAttribute('nonce', 'c20t41c7-73c6-4bf9-fde8-24a7b35t5f71');
        count = evaluate('++globalThis.TEST_EVAL.count;', script);
        expect(count).toBe(4);
    });
});
