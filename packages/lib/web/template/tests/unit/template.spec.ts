import {
    TemplateEngine,
    TemplateBridge,
    html,
    svg,
    render,
} from '@cdp/template';

describe('template spec', () => {
    it('check main instance', () => {
        expect(TemplateEngine).toBeDefined();
        expect(TemplateBridge).toBeDefined();
        expect(html).toBeDefined();
        expect(svg).toBeDefined();
        expect(render).toBeDefined();
    });
});
