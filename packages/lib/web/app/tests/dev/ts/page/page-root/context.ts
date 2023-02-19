import { loadTemplateSource, toTemplateElement } from '@cdp/web-utils';
import { dom as $ } from '@cdp/dom';
import type { RouteChangeInfo } from '@cdp/router';
import { registerPage } from '@cdp/app';
import { entry } from '../signature';

entry('PAGE_CONTEXT_ROOT');

registerPage({
    path: '/root',
    component: {
        name: 'I was born from an object.',
        async pageInit(info: RouteChangeInfo) {
            console.log(info.to.path);
            const template = toTemplateElement(await loadTemplateSource('#root-content', { noCache: true })) as HTMLTemplateElement;
            $(info.to.el).append(...template.content.children);
        }
    },
    content: '#page-root',
});
