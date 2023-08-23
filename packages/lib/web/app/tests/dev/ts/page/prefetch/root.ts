import { Route } from '@cdp/router';
import { PageView, registerPage } from '@cdp/app';
import { i18nKey } from '../../types';
import { entry } from '../signature';
import routeRegister from './register';

entry('PAGE_CONTEXT_PREFETCH_ROOT');

class PrefetchRootPageView extends PageView {
    protected async onPageInit(thisPage: Route): Promise<void> {
        console.log(`${thisPage.url}: init`);
        await thisPage.router.register(routeRegister);
    }

    protected onPageMounted(thisPage: Route): void {
        console.log(`${thisPage.url}: mounted`);
    }

    protected onPageUnmounted(thisPage: Route): void {
        console.log(`${thisPage.url}: unmounted`);
    }

    protected onPageRemoved(thisPage: Route): void {
        console.log(`${thisPage.url}: removed`);
    }
}

registerPage({
    path: '/prefetch',
    component: PrefetchRootPageView,
    content: /* html */`
    <div id="page-prefetch-root" class="router-page prefetch-page">
        <header>
            <label>👈</label>
            <button><a href="#" data-i18n="${i18nKey.app.common.back}">🌐</a></button>
            <h1 id="page-prefetch-root-title" data-i18n="${i18nKey.app.prefetch.root.title}">🌐</h1>
        </header>
        <section>
            <h3 id="page-prefetch-root-desctiption" data-i18n="${i18nKey.app.prefetch.root.description}">🌐</h3>
            <ul>
                <li><a href="/class" data-i18n="[append]${i18nKey.app.navigateTo.settings}">⚙️</a></li>
            </ul>
            <fieldset class="control-group">
                <button><a href="/prefetch/anchor" data-prefetch="true" data-i18n="${i18nKey.app.prefetch.root.navigateTo.anchor}">🌐</a></button>
                <button><a href="/prefetch/register" data-i18n="${i18nKey.app.prefetch.root.navigateTo.register}">🌐</a></button>
            </fieldset>
        </section>
    </div>
    `,
});
