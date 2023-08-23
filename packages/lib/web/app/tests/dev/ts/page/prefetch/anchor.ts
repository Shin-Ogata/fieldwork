import { registerPage } from '@cdp/app';
import { i18nKey } from '../../types';
import { entry } from '../signature';
import { PrefetcheePageView } from './prefetchee-view';

entry('PAGE_CONTEXT_PREFETCH_ANCHOR');

registerPage({
    path: '/prefetch/anchor',
    component: PrefetcheePageView,
    content: /* html */`
    <div id="page-prefetch-anchor" class="router-page prefetch-page prefetchee">
        <header>
            <label>👈</label>
            <button><a href="#" data-i18n="${i18nKey.app.common.back}">🌐</a></button>
            <h1 id="page-prefetch-register-title" data-i18n="${i18nKey.app.prefetch.anchor.title}">🌐</h1>
        </header>
        <section>
            <h3 id="page-prefetch-register-desctiption" data-i18n="${i18nKey.app.prefetch.anchor.description}">🌐</h3>
            <ul>
                <li><a href="/class" data-i18n="[append]${i18nKey.app.navigateTo.settings}">⚙️</a></li>
            </ul>
        </section>
    </div>
    `,
});
