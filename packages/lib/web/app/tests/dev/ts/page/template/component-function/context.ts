import {
    RootPart,
    TemplateResult,
    html,
    render,
} from '@cdp/template';
import { t } from '@cdp/i18n';
import { RouteChangeInfo } from '@cdp/router';
import { registerPage } from '@cdp/app';
import { i18nKey } from '../../../types';
import { entry } from '../../signature';
import { Props } from '../props';
import { hooks, hooksWith } from './hooks';
import { hooks as phooks } from './hooks-prototype';
import { State } from './state';
import { Effect } from './effect';
import { Interval } from './interval';
import { Input } from './input';
import { List } from './list';

entry('PAGE_CONTEXT_TEMPLATE_COMPONENT_FUNCTION');

let _el: HTMLElement;
let _props: Props;

const template = (elRoot: Node): TemplateResult => {
    return html`
        <header>
            <label>👈</label>
            <button><a href="#">${t(i18nKey.app.common.back)}</a></button>
            <h1>${t(i18nKey.app.template['component-function'].title)}</h1>
        </header>
        <section>
            <h3>${t(i18nKey.app.template['component-function'].description)}</h3>
            ${hooks(State)}
            ${hooksWith(elRoot, State, { initVal: 2 })}
            <!-- ${phooks(Effect)}
            ${phooks(Interval)}
            ${phooks(Input, _props)}
            ${phooks(List, _props)} -->
        </section>
    `;
};

const renderPage = (): RootPart => {
    return render(template(_el), _el);
};

registerPage({
    path: '/template/component-function',
    component: {
        pageInit(info: RouteChangeInfo) {
            _props = new Props();
            _props.on('@', renderPage);
            _el = info.to.el;
            renderPage();
        },
        pageRemoved() {
            _props.off();
        },
    },
    content: /*html*/`<div id="page-template-component-function" class="router-page template-page"></div>`,
});
