import { i18nKey } from '../../types';
import { entry } from '../signature';
import { PrefetcheePageView } from './prefetchee-view';

entry('PAGE_CONTEXT_PREFETCH_REGISTER');

export default {
    path: '/prefetch/register',
    prefetch: '/prefetch/register',
    component: PrefetcheePageView,
    content: /* html */`
    <div id="page-prefetch-register" class="router-page prefetch-page prefetchee">
        <header>
            <label>👈</label>
            <button><a href="#" data-i18n="${i18nKey.app.common.back}">🌐</a></button>
            <h1 id="page-prefetch-register-title" data-i18n="${i18nKey.app.prefetch.register.title}">🌐</h1>
        </header>
        <section>
            <h3 id="page-prefetch-register-desctiption" data-i18n="${i18nKey.app.prefetch.register.description}">🌐</h3>
            <ul>
                <li><a href="/class" data-i18n="[append]${i18nKey.app.navigateTo.settings}">⚙️</a></li>
            </ul>
        </section>
    </div>
    `,
};
