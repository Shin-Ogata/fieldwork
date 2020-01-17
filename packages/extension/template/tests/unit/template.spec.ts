/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    TemplateResult,
    SVGTemplateResult,
    RenderOptions,
    html,
    svg,
    render,
    parts,
    directive,
    isDirective,
    directives,
} from '@cdp/extension-template';
import $ from '@cdp/dom';
import {
    prepareTestElements,
    cleanupTestElements,
} from './tools';

describe('extention-template spec', () => {
    const {
        asyncAppend,
        asyncReplace,
        cache,
        classMap,
        guard,
        ifDefined,
        repeat,
        styleMap,
        unsafeHTML,
    } = directives;

    afterEach((): void => {
        cleanupTestElements();
    });

    it('check instance', () => {
        expect(html).toBeDefined();
        expect(svg).toBeDefined();
        expect(render).toBeDefined();
        expect(parts).toBeDefined();
        expect(directive).toBeDefined();
        expect(isDirective).toBeDefined();
        expect(asyncAppend).toBeDefined();
        expect(asyncReplace).toBeDefined();
        expect(cache).toBeDefined();
        expect(classMap).toBeDefined();
        expect(guard).toBeDefined();
        expect(ifDefined).toBeDefined();
        expect(repeat).toBeDefined();
        expect(styleMap).toBeDefined();
        expect(unsafeHTML).toBeDefined();
    });

    it('check html standard', () => {
        prepareTestElements();
        const $dom = $('#d1');
        const template = (name: string): TemplateResult => html`<p>Hello ${name}</p>`;
        render(template('World'), $dom[0]);

        $dom.find('p');
        expect($dom.find('p').text()).toBe('Hello World');

        render(template('Template'), $dom[0]);
        expect($dom.find('p').text()).toBe('Hello Template');
    });
});
