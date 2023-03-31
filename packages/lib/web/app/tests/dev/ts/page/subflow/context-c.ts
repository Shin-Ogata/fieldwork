import { registerPage } from '@cdp/app';
import { entry } from '../signature';

entry('PAGE_CONTEXT_SUBFLOW_PAGE_C');

registerPage({
    path: '/subflow-c',
    content: {
        selector: '#subflow-c',
        url: '/tpl/templates.tpl',
    },
});
