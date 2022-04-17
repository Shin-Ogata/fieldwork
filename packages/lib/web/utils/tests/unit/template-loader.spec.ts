/*
 eslint-disable
    max-len,
    @typescript-eslint/no-explicit-any,
 */

import { loadTemplateSource, clearTemplateCache } from '@cdp/web-utils';

const stripWhiteSpace = (html: string): string => html.replace(/\s/g, '');

describe('template-loader spec', () => {

    afterEach(() => {
        clearTemplateCache();
    });

    it('check instance', (): void => {
        expect(loadTemplateSource).toBeDefined();
        expect(clearTemplateCache).toBeDefined();
    });

    it('check loadTemplateSource()', async () => {
        const src = await loadTemplateSource('#test-mustache', {
            url: '../../.temp/res/web-utils/test.tpl',
        });
        expect(stripWhiteSpace(src as string)).toBe('<ul>{{#families}}<li><spanclass="surname">{{surname}}</span><ul>{{#members}}<li><spanclass="given">{{given}}</span></li><li><spanclass="age">{{&age}}</span></li>{{/members}}</ul></li>{{/families}}</ul>');

        const tpl = await loadTemplateSource('#test-mustache-template', {
            url: '../../.temp/res/web-utils/test.tpl',
        });
        expect(stripWhiteSpace((tpl as HTMLTemplateElement).innerHTML)).toBe('<ul>{{#families}}<li><spanclass="surname">{{surname}}</span><ul>{{#members}}<li><spanclass="given">{{given}}</span></li><li><spanclass="age">{{&amp;age}}</span></li>{{/members}}</ul></li>{{/families}}</ul>');

        // from cache
        const tpl2 = await loadTemplateSource('#test-mustache-template', {
            url: '../../.temp/res/web-utils/test.tpl',
        });
        expect(tpl).toBe(tpl2);

        { // inner template
            const body = document.body;
            const el = document.createElement('template');
            el.innerHTML = '<div id="d1" class="test-dom"><template id="test-inner"><div class="page"></div></template></div>';
            const fragment = document.createDocumentFragment();
            for (const div of el.content.children) {
                fragment.appendChild(div);
            }
            body.appendChild(fragment);

            const inner = await loadTemplateSource('#test-inner');
            expect((inner as HTMLTemplateElement).innerHTML).toBe('<div class="page"></div>');

            const divs = body.querySelectorAll('.test-dom');
            for (const div of divs) {
                body.removeChild(div);
            }
        }

        // invalid
        const invalid = await loadTemplateSource('#test-mustache-invalid');
        expect(invalid).toBeUndefined();
    });

});
