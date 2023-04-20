import { registerPage } from '@cdp/app';
import { i18nKey } from '../../types';
import { entry } from '../signature';
import './mustache';
import './mustache-bridge';
import './stampino';
import './class-component';
import './function-component';

entry('PAGE_CONTEXT_TEMPLATE_ROOT');

registerPage({
    path: '/template',
    content: `
    <div id="page-template-root" class="router-page template-page">
        <header>
            <label>👈</label>
            <button><a href="#" data-i18n="${i18nKey.app.common.back}">🌐</a></button>
            <h1 id="page-template-root-title" data-i18n="${i18nKey.app.template.root.title}">🌐</h1>
        </header>
        <section>
            <h3 id="page-template-root-desctiption" data-i18n="${i18nKey.app.template.root.description}">🌐</h3>
            <fieldset class="control-group">
                <button><a href="/template/mustache" data-i18n="${i18nKey.app.template.root.navigateTo.mustache}">🌐</a></button>
                <button><a href="/template/mustache-bridge" data-i18n="${i18nKey.app.template.root.navigateTo['mustache-bridge']}">🌐</a></button>
            </fieldset>
        </section>
    </div>
    `,
});
