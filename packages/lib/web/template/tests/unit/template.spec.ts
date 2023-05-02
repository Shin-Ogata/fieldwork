import {
    TemplateBridge,
    html,
    svg,
    render,
} from '@cdp/template';

describe('template spec', () => {
    it('check main instance', () => {
        expect(TemplateBridge).toBeDefined();
        expect(html).toBeDefined();
        expect(svg).toBeDefined();
        expect(render).toBeDefined();
    });
});
