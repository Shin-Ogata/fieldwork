import { registerPage } from '@cdp/app';
import { i18nKey } from '../../types';
import { entry } from '../signature';
import './mustache-traditional';
import './mustache-bridge';
import './stampino-bridge';
import './template-literal';
import './component-view';
import './component-class';
import './component-function';

entry('PAGE_CONTEXT_TEMPLATE_ROOT');

registerPage({
    path: '/template',
    content: /* html */`
    <div id="page-template-root" class="router-page template-page">
        <header>
            <label>👈</label>
            <button><a href="#" data-i18n="${i18nKey.app.common.back}">🌐</a></button>
            <h1 id="page-template-root-title" data-i18n="${i18nKey.app.template.root.title}">🌐</h1>
        </header>
        <section>
            <h3 id="page-template-root-desctiption" data-i18n="${i18nKey.app.template.root.description}">🌐</h3>
            <fieldset class="control-group">
                <p data-i18n="${i18nKey.app.template.root.type.single}">🌐</p>
                <button><a href="/template/mustache" data-i18n="${i18nKey.app.template.root.navigateTo.mustache}">🌐</a></button>
                <button><a href="/template/mustache-bridge" data-i18n="${i18nKey.app.template.root.navigateTo['mustache-bridge']}">🌐</a></button>
                <button><a href="/template/stampino-bridge" data-i18n="${i18nKey.app.template.root.navigateTo['stampino-bridge']}">🌐</a></button>
                <button><a href="/template/template-literal" data-i18n="${i18nKey.app.template.root.navigateTo['template-literal']}">🌐</a></button>
            </fieldset>
            <fieldset class="control-group">
                <p data-i18n="${i18nKey.app.template.root.type.composite}">🌐</p>
                <button><a href="#" data-i18n="${i18nKey.app.template.root.navigateTo['component-view']}">🌐</a></button>
                <button><a href="#" data-i18n="${i18nKey.app.template.root.navigateTo['component-class']}">🌐</a></button>
                <button><a href="#" data-i18n="${i18nKey.app.template.root.navigateTo['component-function']}">🌐</a></button>
            </fieldset>
        </section>
    </div>
    `,
});
